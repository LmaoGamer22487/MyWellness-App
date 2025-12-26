from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Depends
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import csv
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserPreferences(BaseModel):
    user_id: str
    target_sleep_hours: float = 7.5
    usual_sleep_time: str = "23:00"
    usual_wake_time: str = "06:30"
    late_night_days: List[str] = []
    daily_calorie_goal: int = 2000
    daily_protein_goal: int = 100
    setup_completed: bool = False

class AlcoholDrink(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    alcohol_percentage: float
    standard_serving_ml: int
    standard_drinks_per_serving: float

class AlcoholLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    drink_id: str
    drink_name: str
    servings: float
    standard_drinks: float
    logged_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    date: str

class SleepLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    sleep_time: datetime
    wake_time: datetime
    hours_slept: float
    date: str

class NutritionLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    meal_description: str
    calories: int
    protein: float
    is_healthy: bool
    meal_type: str
    logged_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    date: str

class SpendingLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    amount: float
    category: str
    notes: str
    logged_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    date: str

class ExerciseLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    exercise_type: str
    duration_minutes: int
    notes: Optional[str] = None
    logged_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    date: str

# ==================== INPUT MODELS ====================

class SessionRequest(BaseModel):
    session_id: str

class PreferencesUpdate(BaseModel):
    target_sleep_hours: Optional[float] = None
    usual_sleep_time: Optional[str] = None
    usual_wake_time: Optional[str] = None
    late_night_days: Optional[List[str]] = None
    daily_calorie_goal: Optional[int] = None
    daily_protein_goal: Optional[int] = None
    setup_completed: Optional[bool] = None

class AlcoholLogCreate(BaseModel):
    drink_id: str
    drink_name: str
    servings: float
    standard_drinks: float
    date: str

class SleepLogCreate(BaseModel):
    sleep_time: str
    wake_time: str
    date: str

class NutritionLogCreate(BaseModel):
    meal_description: str
    meal_type: str
    date: str

class SpendingLogCreate(BaseModel):
    amount: float
    category: str
    notes: str
    date: str

class ExerciseLogCreate(BaseModel):
    exercise_type: str
    duration_minutes: int
    notes: Optional[str] = None
    date: str

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> User:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user)

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/session")
async def create_session(req: SessionRequest, response: Response):
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": req.session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        data = resp.json()
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    existing_user = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
    else:
        await db.users.insert_one({
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.user_preferences.insert_one({
            "user_id": user_id,
            "target_sleep_hours": 7.5,
            "usual_sleep_time": "23:00",
            "usual_wake_time": "06:30",
            "late_night_days": [],
            "daily_calorie_goal": 2000,
            "daily_protein_goal": 100,
            "setup_completed": False
        })
    
    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    prefs = await db.user_preferences.find_one({"user_id": user_id}, {"_id": 0})
    
    return {"user": user, "setup_completed": prefs.get("setup_completed", False) if prefs else False}

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    prefs = await db.user_preferences.find_one({"user_id": user.user_id}, {"_id": 0})
    return {"user": user.model_dump(), "setup_completed": prefs.get("setup_completed", False) if prefs else False}

@api_router.post("/auth/logout")
async def logout(response: Response, user: User = Depends(get_current_user)):
    await db.user_sessions.delete_many({"user_id": user.user_id})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ==================== USER PREFERENCES ====================

@api_router.get("/preferences")
async def get_preferences(user: User = Depends(get_current_user)):
    prefs = await db.user_preferences.find_one({"user_id": user.user_id}, {"_id": 0})
    if not prefs:
        return {"user_id": user.user_id, "setup_completed": False}
    return prefs

@api_router.put("/preferences")
async def update_preferences(update: PreferencesUpdate, user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    await db.user_preferences.update_one(
        {"user_id": user.user_id},
        {"$set": update_data},
        upsert=True
    )
    prefs = await db.user_preferences.find_one({"user_id": user.user_id}, {"_id": 0})
    return prefs

# ==================== ALCOHOL DATABASE ====================

ALCOHOL_DATABASE = [
    # BEER (12oz serving = 355ml, ~5% ABV = 1 standard drink)
    {"name": "Budweiser", "category": "Beer", "alcohol_percentage": 5.0, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.0},
    {"name": "Heineken", "category": "Beer", "alcohol_percentage": 5.0, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.0},
    {"name": "Corona Extra", "category": "Beer", "alcohol_percentage": 4.6, "standard_serving_ml": 355, "standard_drinks_per_serving": 0.9},
    {"name": "Guinness", "category": "Beer", "alcohol_percentage": 4.2, "standard_serving_ml": 355, "standard_drinks_per_serving": 0.8},
    {"name": "Stella Artois", "category": "Beer", "alcohol_percentage": 5.2, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.0},
    {"name": "Sam Adams", "category": "Beer", "alcohol_percentage": 4.9, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.0},
    {"name": "Blue Moon", "category": "Beer", "alcohol_percentage": 5.4, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.1},
    {"name": "IPA (Craft)", "category": "Beer", "alcohol_percentage": 6.5, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.3},
    {"name": "Pilsner", "category": "Beer", "alcohol_percentage": 4.5, "standard_serving_ml": 355, "standard_drinks_per_serving": 0.9},
    {"name": "Lager", "category": "Beer", "alcohol_percentage": 5.0, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.0},
    {"name": "Pale Ale", "category": "Beer", "alcohol_percentage": 5.5, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.1},
    {"name": "Stout", "category": "Beer", "alcohol_percentage": 5.0, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.0},
    {"name": "Porter", "category": "Beer", "alcohol_percentage": 5.5, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.1},
    {"name": "Wheat Beer", "category": "Beer", "alcohol_percentage": 5.0, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.0},
    {"name": "Amber Ale", "category": "Beer", "alcohol_percentage": 5.5, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.1},
    {"name": "Belgian Ale", "category": "Beer", "alcohol_percentage": 7.0, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.4},
    {"name": "Sapporo", "category": "Beer", "alcohol_percentage": 4.9, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.0},
    {"name": "Asahi", "category": "Beer", "alcohol_percentage": 5.0, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.0},
    {"name": "Tiger Beer", "category": "Beer", "alcohol_percentage": 5.0, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.0},
    {"name": "Carlsberg", "category": "Beer", "alcohol_percentage": 5.0, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.0},
    
    # WINE (5oz serving = 150ml, ~12% ABV = 1 standard drink)
    {"name": "Cabernet Sauvignon", "category": "Wine", "alcohol_percentage": 13.5, "standard_serving_ml": 150, "standard_drinks_per_serving": 1.1},
    {"name": "Merlot", "category": "Wine", "alcohol_percentage": 13.0, "standard_serving_ml": 150, "standard_drinks_per_serving": 1.1},
    {"name": "Pinot Noir", "category": "Wine", "alcohol_percentage": 12.5, "standard_serving_ml": 150, "standard_drinks_per_serving": 1.0},
    {"name": "Chardonnay", "category": "Wine", "alcohol_percentage": 13.0, "standard_serving_ml": 150, "standard_drinks_per_serving": 1.1},
    {"name": "Sauvignon Blanc", "category": "Wine", "alcohol_percentage": 12.5, "standard_serving_ml": 150, "standard_drinks_per_serving": 1.0},
    {"name": "Pinot Grigio", "category": "Wine", "alcohol_percentage": 12.0, "standard_serving_ml": 150, "standard_drinks_per_serving": 1.0},
    {"name": "Riesling", "category": "Wine", "alcohol_percentage": 11.0, "standard_serving_ml": 150, "standard_drinks_per_serving": 0.9},
    {"name": "Moscato", "category": "Wine", "alcohol_percentage": 5.5, "standard_serving_ml": 150, "standard_drinks_per_serving": 0.5},
    {"name": "Prosecco", "category": "Wine", "alcohol_percentage": 11.0, "standard_serving_ml": 150, "standard_drinks_per_serving": 0.9},
    {"name": "Champagne", "category": "Wine", "alcohol_percentage": 12.0, "standard_serving_ml": 150, "standard_drinks_per_serving": 1.0},
    {"name": "Rosé", "category": "Wine", "alcohol_percentage": 12.0, "standard_serving_ml": 150, "standard_drinks_per_serving": 1.0},
    {"name": "Syrah/Shiraz", "category": "Wine", "alcohol_percentage": 14.0, "standard_serving_ml": 150, "standard_drinks_per_serving": 1.2},
    {"name": "Zinfandel", "category": "Wine", "alcohol_percentage": 14.5, "standard_serving_ml": 150, "standard_drinks_per_serving": 1.2},
    {"name": "Malbec", "category": "Wine", "alcohol_percentage": 13.5, "standard_serving_ml": 150, "standard_drinks_per_serving": 1.1},
    {"name": "Sangiovese", "category": "Wine", "alcohol_percentage": 13.0, "standard_serving_ml": 150, "standard_drinks_per_serving": 1.1},
    {"name": "Port Wine", "category": "Wine", "alcohol_percentage": 20.0, "standard_serving_ml": 75, "standard_drinks_per_serving": 0.8},
    {"name": "Sherry", "category": "Wine", "alcohol_percentage": 17.0, "standard_serving_ml": 75, "standard_drinks_per_serving": 0.7},
    {"name": "Vermouth", "category": "Wine", "alcohol_percentage": 16.0, "standard_serving_ml": 75, "standard_drinks_per_serving": 0.6},
    {"name": "Gewürztraminer", "category": "Wine", "alcohol_percentage": 13.0, "standard_serving_ml": 150, "standard_drinks_per_serving": 1.1},
    {"name": "Cava", "category": "Wine", "alcohol_percentage": 11.5, "standard_serving_ml": 150, "standard_drinks_per_serving": 0.9},
    
    # SPIRITS (1.5oz shot = 44ml, 40% ABV = 1 standard drink)
    {"name": "Vodka", "category": "Spirit", "alcohol_percentage": 40.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 1.0},
    {"name": "Gin", "category": "Spirit", "alcohol_percentage": 40.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 1.0},
    {"name": "Rum (White)", "category": "Spirit", "alcohol_percentage": 40.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 1.0},
    {"name": "Rum (Dark)", "category": "Spirit", "alcohol_percentage": 40.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 1.0},
    {"name": "Tequila (Blanco)", "category": "Spirit", "alcohol_percentage": 40.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 1.0},
    {"name": "Tequila (Reposado)", "category": "Spirit", "alcohol_percentage": 40.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 1.0},
    {"name": "Whiskey (Bourbon)", "category": "Spirit", "alcohol_percentage": 40.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 1.0},
    {"name": "Whiskey (Scotch)", "category": "Spirit", "alcohol_percentage": 40.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 1.0},
    {"name": "Whiskey (Irish)", "category": "Spirit", "alcohol_percentage": 40.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 1.0},
    {"name": "Whiskey (Rye)", "category": "Spirit", "alcohol_percentage": 40.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 1.0},
    {"name": "Cognac", "category": "Spirit", "alcohol_percentage": 40.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 1.0},
    {"name": "Brandy", "category": "Spirit", "alcohol_percentage": 40.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 1.0},
    {"name": "Mezcal", "category": "Spirit", "alcohol_percentage": 42.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 1.1},
    {"name": "Absinthe", "category": "Spirit", "alcohol_percentage": 55.0, "standard_serving_ml": 30, "standard_drinks_per_serving": 0.9},
    {"name": "Jagermeister", "category": "Spirit", "alcohol_percentage": 35.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 0.9},
    {"name": "Fireball", "category": "Spirit", "alcohol_percentage": 33.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 0.8},
    {"name": "Soju", "category": "Spirit", "alcohol_percentage": 17.0, "standard_serving_ml": 60, "standard_drinks_per_serving": 0.6},
    {"name": "Sake", "category": "Spirit", "alcohol_percentage": 15.0, "standard_serving_ml": 60, "standard_drinks_per_serving": 0.5},
    {"name": "Baijiu", "category": "Spirit", "alcohol_percentage": 52.0, "standard_serving_ml": 30, "standard_drinks_per_serving": 0.9},
    {"name": "Grappa", "category": "Spirit", "alcohol_percentage": 40.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 1.0},
    
    # LIQUEURS
    {"name": "Kahlua", "category": "Liqueur", "alcohol_percentage": 20.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 0.5},
    {"name": "Bailey's", "category": "Liqueur", "alcohol_percentage": 17.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 0.4},
    {"name": "Amaretto", "category": "Liqueur", "alcohol_percentage": 24.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 0.6},
    {"name": "Triple Sec", "category": "Liqueur", "alcohol_percentage": 30.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 0.7},
    {"name": "Cointreau", "category": "Liqueur", "alcohol_percentage": 40.0, "standard_serving_ml": 30, "standard_drinks_per_serving": 0.7},
    {"name": "Grand Marnier", "category": "Liqueur", "alcohol_percentage": 40.0, "standard_serving_ml": 30, "standard_drinks_per_serving": 0.7},
    {"name": "Chambord", "category": "Liqueur", "alcohol_percentage": 16.5, "standard_serving_ml": 44, "standard_drinks_per_serving": 0.4},
    {"name": "Frangelico", "category": "Liqueur", "alcohol_percentage": 20.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 0.5},
    {"name": "Midori", "category": "Liqueur", "alcohol_percentage": 20.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 0.5},
    {"name": "Blue Curacao", "category": "Liqueur", "alcohol_percentage": 25.0, "standard_serving_ml": 44, "standard_drinks_per_serving": 0.6},
    
    # COCKTAILS (estimated standard drinks)
    {"name": "Margarita", "category": "Cocktail", "alcohol_percentage": 13.0, "standard_serving_ml": 240, "standard_drinks_per_serving": 1.7},
    {"name": "Martini (Classic)", "category": "Cocktail", "alcohol_percentage": 30.0, "standard_serving_ml": 90, "standard_drinks_per_serving": 1.5},
    {"name": "Cosmopolitan", "category": "Cocktail", "alcohol_percentage": 18.0, "standard_serving_ml": 120, "standard_drinks_per_serving": 1.2},
    {"name": "Mojito", "category": "Cocktail", "alcohol_percentage": 10.0, "standard_serving_ml": 240, "standard_drinks_per_serving": 1.3},
    {"name": "Old Fashioned", "category": "Cocktail", "alcohol_percentage": 32.0, "standard_serving_ml": 90, "standard_drinks_per_serving": 1.6},
    {"name": "Manhattan", "category": "Cocktail", "alcohol_percentage": 28.0, "standard_serving_ml": 90, "standard_drinks_per_serving": 1.4},
    {"name": "Negroni", "category": "Cocktail", "alcohol_percentage": 24.0, "standard_serving_ml": 90, "standard_drinks_per_serving": 1.2},
    {"name": "Whiskey Sour", "category": "Cocktail", "alcohol_percentage": 15.0, "standard_serving_ml": 120, "standard_drinks_per_serving": 1.0},
    {"name": "Daiquiri", "category": "Cocktail", "alcohol_percentage": 15.0, "standard_serving_ml": 120, "standard_drinks_per_serving": 1.0},
    {"name": "Piña Colada", "category": "Cocktail", "alcohol_percentage": 12.0, "standard_serving_ml": 240, "standard_drinks_per_serving": 1.6},
    {"name": "Long Island Iced Tea", "category": "Cocktail", "alcohol_percentage": 22.0, "standard_serving_ml": 350, "standard_drinks_per_serving": 4.0},
    {"name": "Bloody Mary", "category": "Cocktail", "alcohol_percentage": 12.0, "standard_serving_ml": 240, "standard_drinks_per_serving": 1.6},
    {"name": "Mimosa", "category": "Cocktail", "alcohol_percentage": 8.0, "standard_serving_ml": 180, "standard_drinks_per_serving": 0.8},
    {"name": "Bellini", "category": "Cocktail", "alcohol_percentage": 7.0, "standard_serving_ml": 180, "standard_drinks_per_serving": 0.7},
    {"name": "Aperol Spritz", "category": "Cocktail", "alcohol_percentage": 8.0, "standard_serving_ml": 200, "standard_drinks_per_serving": 0.9},
    {"name": "Moscow Mule", "category": "Cocktail", "alcohol_percentage": 11.0, "standard_serving_ml": 200, "standard_drinks_per_serving": 1.2},
    {"name": "Mai Tai", "category": "Cocktail", "alcohol_percentage": 14.0, "standard_serving_ml": 200, "standard_drinks_per_serving": 1.5},
    {"name": "Caipirinha", "category": "Cocktail", "alcohol_percentage": 18.0, "standard_serving_ml": 150, "standard_drinks_per_serving": 1.5},
    {"name": "Sex on the Beach", "category": "Cocktail", "alcohol_percentage": 10.0, "standard_serving_ml": 200, "standard_drinks_per_serving": 1.1},
    {"name": "Tequila Sunrise", "category": "Cocktail", "alcohol_percentage": 10.0, "standard_serving_ml": 200, "standard_drinks_per_serving": 1.1},
    {"name": "Gin & Tonic", "category": "Cocktail", "alcohol_percentage": 13.0, "standard_serving_ml": 200, "standard_drinks_per_serving": 1.4},
    {"name": "Rum & Coke", "category": "Cocktail", "alcohol_percentage": 11.0, "standard_serving_ml": 240, "standard_drinks_per_serving": 1.4},
    {"name": "Vodka Soda", "category": "Cocktail", "alcohol_percentage": 12.0, "standard_serving_ml": 200, "standard_drinks_per_serving": 1.3},
    {"name": "Screwdriver", "category": "Cocktail", "alcohol_percentage": 10.0, "standard_serving_ml": 200, "standard_drinks_per_serving": 1.1},
    {"name": "White Russian", "category": "Cocktail", "alcohol_percentage": 20.0, "standard_serving_ml": 150, "standard_drinks_per_serving": 1.7},
    {"name": "Black Russian", "category": "Cocktail", "alcohol_percentage": 25.0, "standard_serving_ml": 120, "standard_drinks_per_serving": 1.7},
    {"name": "Espresso Martini", "category": "Cocktail", "alcohol_percentage": 15.0, "standard_serving_ml": 120, "standard_drinks_per_serving": 1.0},
    {"name": "Singapore Sling", "category": "Cocktail", "alcohol_percentage": 12.0, "standard_serving_ml": 240, "standard_drinks_per_serving": 1.6},
    {"name": "Hurricane", "category": "Cocktail", "alcohol_percentage": 14.0, "standard_serving_ml": 300, "standard_drinks_per_serving": 2.3},
    {"name": "Zombie", "category": "Cocktail", "alcohol_percentage": 20.0, "standard_serving_ml": 300, "standard_drinks_per_serving": 3.4},
    
    # CIDERS & SELTZERS
    {"name": "Apple Cider", "category": "Cider", "alcohol_percentage": 5.0, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.0},
    {"name": "Pear Cider", "category": "Cider", "alcohol_percentage": 4.5, "standard_serving_ml": 355, "standard_drinks_per_serving": 0.9},
    {"name": "Hard Seltzer", "category": "Seltzer", "alcohol_percentage": 5.0, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.0},
    {"name": "White Claw", "category": "Seltzer", "alcohol_percentage": 5.0, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.0},
    {"name": "Truly", "category": "Seltzer", "alcohol_percentage": 5.0, "standard_serving_ml": 355, "standard_drinks_per_serving": 1.0},
]

@api_router.get("/drinks")
async def get_drinks(search: Optional[str] = None, category: Optional[str] = None):
    drinks = ALCOHOL_DATABASE
    if search:
        search_lower = search.lower()
        drinks = [d for d in drinks if search_lower in d["name"].lower()]
    if category:
        drinks = [d for d in drinks if d["category"].lower() == category.lower()]
    
    result = []
    for d in drinks:
        result.append({
            "id": d["name"].lower().replace(" ", "_").replace("(", "").replace(")", ""),
            **d
        })
    return result

@api_router.get("/drinks/categories")
async def get_drink_categories():
    categories = list(set(d["category"] for d in ALCOHOL_DATABASE))
    return sorted(categories)

# ==================== ALCOHOL LOGS ====================

@api_router.post("/alcohol")
async def log_alcohol(log: AlcoholLogCreate, user: User = Depends(get_current_user)):
    alcohol_log = AlcoholLog(
        user_id=user.user_id,
        drink_id=log.drink_id,
        drink_name=log.drink_name,
        servings=log.servings,
        standard_drinks=log.standard_drinks,
        date=log.date
    )
    doc = alcohol_log.model_dump()
    doc["logged_at"] = doc["logged_at"].isoformat()
    await db.alcohol_logs.insert_one(doc)
    return alcohol_log.model_dump()

@api_router.get("/alcohol")
async def get_alcohol_logs(date: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None, user: User = Depends(get_current_user)):
    query = {"user_id": user.user_id}
    if date:
        query["date"] = date
    elif start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    logs = await db.alcohol_logs.find(query, {"_id": 0}).sort("logged_at", -1).to_list(1000)
    return logs

@api_router.delete("/alcohol/{log_id}")
async def delete_alcohol_log(log_id: str, user: User = Depends(get_current_user)):
    result = await db.alcohol_logs.delete_one({"id": log_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"message": "Deleted"}

# ==================== SLEEP LOGS ====================

@api_router.post("/sleep")
async def log_sleep(log: SleepLogCreate, user: User = Depends(get_current_user)):
    sleep_time = datetime.fromisoformat(log.sleep_time.replace("Z", "+00:00"))
    wake_time = datetime.fromisoformat(log.wake_time.replace("Z", "+00:00"))
    
    # Handle cross-midnight sleep: if wake_time is before sleep_time, add a day
    if wake_time <= sleep_time:
        wake_time = wake_time + timedelta(days=1)
    
    hours_slept = (wake_time - sleep_time).total_seconds() / 3600
    
    sleep_log = SleepLog(
        user_id=user.user_id,
        sleep_time=sleep_time,
        wake_time=wake_time,
        hours_slept=round(hours_slept, 2),
        date=log.date
    )
    doc = sleep_log.model_dump()
    doc["sleep_time"] = doc["sleep_time"].isoformat()
    doc["wake_time"] = doc["wake_time"].isoformat()
    await db.sleep_logs.insert_one(doc)
    return sleep_log.model_dump()

@api_router.get("/sleep")
async def get_sleep_logs(date: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None, user: User = Depends(get_current_user)):
    query = {"user_id": user.user_id}
    if date:
        query["date"] = date
    elif start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    logs = await db.sleep_logs.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return logs

@api_router.get("/sleep/debt")
async def get_sleep_debt(user: User = Depends(get_current_user)):
    prefs = await db.user_preferences.find_one({"user_id": user.user_id}, {"_id": 0})
    target = prefs.get("target_sleep_hours", 7.5) if prefs else 7.5
    
    today = datetime.now(timezone.utc).date()
    week_start = today - timedelta(days=today.weekday())
    
    logs = await db.sleep_logs.find({
        "user_id": user.user_id,
        "date": {"$gte": week_start.isoformat(), "$lte": today.isoformat()}
    }, {"_id": 0}).to_list(100)
    
    days_logged = len(logs)
    total_slept = sum(log.get("hours_slept", 0) for log in logs)
    target_total = days_logged * target
    debt = target_total - total_slept
    
    return {
        "target_per_day": target,
        "days_logged": days_logged,
        "total_slept": round(total_slept, 2),
        "target_total": round(target_total, 2),
        "debt": round(max(0, debt), 2),
        "surplus": round(max(0, -debt), 2)
    }

@api_router.delete("/sleep/{log_id}")
async def delete_sleep_log(log_id: str, user: User = Depends(get_current_user)):
    result = await db.sleep_logs.delete_one({"id": log_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"message": "Deleted"}

# ==================== NUTRITION LOGS ====================

@api_router.post("/nutrition")
async def log_nutrition(log: NutritionLogCreate, user: User = Depends(get_current_user)):
    # Use Gemini AI to analyze nutrition
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    try:
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            session_id=f"nutrition_{user.user_id}_{datetime.now().timestamp()}",
            system_message="You are a nutrition expert. Analyze the meal and provide: calories (number), protein in grams (number), and whether it's a healthy choice (true/false). Respond ONLY in JSON format: {\"calories\": number, \"protein\": number, \"is_healthy\": boolean}"
        ).with_model("gemini", "gemini-3-flash-preview")
        
        response = await chat.send_message(UserMessage(text=f"Analyze this meal: {log.meal_description}"))
        
        import json
        import re
        json_match = re.search(r'\{[^}]+\}', response)
        if json_match:
            nutrition_data = json.loads(json_match.group())
            calories = nutrition_data.get("calories", 0)
            protein = nutrition_data.get("protein", 0)
            is_healthy = nutrition_data.get("is_healthy", False)
        else:
            calories = 0
            protein = 0
            is_healthy = False
    except Exception as e:
        logging.error(f"AI nutrition analysis failed: {e}")
        calories = 0
        protein = 0
        is_healthy = False
    
    nutrition_log = NutritionLog(
        user_id=user.user_id,
        meal_description=log.meal_description,
        calories=calories,
        protein=protein,
        is_healthy=is_healthy,
        meal_type=log.meal_type,
        date=log.date
    )
    doc = nutrition_log.model_dump()
    doc["logged_at"] = doc["logged_at"].isoformat()
    await db.nutrition_logs.insert_one(doc)
    return nutrition_log.model_dump()

@api_router.get("/nutrition")
async def get_nutrition_logs(date: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None, user: User = Depends(get_current_user)):
    query = {"user_id": user.user_id}
    if date:
        query["date"] = date
    elif start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    logs = await db.nutrition_logs.find(query, {"_id": 0}).sort("logged_at", -1).to_list(1000)
    return logs

@api_router.get("/nutrition/summary")
async def get_nutrition_summary(user: User = Depends(get_current_user)):
    prefs = await db.user_preferences.find_one({"user_id": user.user_id}, {"_id": 0})
    calorie_goal = prefs.get("daily_calorie_goal", 2000) if prefs else 2000
    protein_goal = prefs.get("daily_protein_goal", 100) if prefs else 100
    
    today = datetime.now(timezone.utc).date()
    week_start = today - timedelta(days=today.weekday())
    
    logs = await db.nutrition_logs.find({
        "user_id": user.user_id,
        "date": {"$gte": week_start.isoformat(), "$lte": today.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    daily_totals = {}
    for log in logs:
        d = log["date"]
        if d not in daily_totals:
            daily_totals[d] = {"calories": 0, "protein": 0}
        daily_totals[d]["calories"] += log.get("calories", 0)
        daily_totals[d]["protein"] += log.get("protein", 0)
    
    days_hit_calories = sum(1 for t in daily_totals.values() if t["calories"] >= calorie_goal * 0.9 and t["calories"] <= calorie_goal * 1.1)
    days_hit_protein = sum(1 for t in daily_totals.values() if t["protein"] >= protein_goal * 0.9)
    
    return {
        "calorie_goal": calorie_goal,
        "protein_goal": protein_goal,
        "days_logged": len(daily_totals),
        "days_hit_calories": days_hit_calories,
        "days_hit_protein": days_hit_protein,
        "daily_totals": daily_totals
    }

@api_router.delete("/nutrition/{log_id}")
async def delete_nutrition_log(log_id: str, user: User = Depends(get_current_user)):
    result = await db.nutrition_logs.delete_one({"id": log_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"message": "Deleted"}

# ==================== SPENDING LOGS ====================

SPENDING_CATEGORIES = ["Food", "Transport", "Entertainment", "Shopping", "Bills", "Health", "Other"]

@api_router.get("/spending/categories")
async def get_spending_categories():
    return SPENDING_CATEGORIES

@api_router.post("/spending")
async def log_spending(log: SpendingLogCreate, user: User = Depends(get_current_user)):
    spending_log = SpendingLog(
        user_id=user.user_id,
        amount=log.amount,
        category=log.category,
        notes=log.notes,
        date=log.date
    )
    doc = spending_log.model_dump()
    doc["logged_at"] = doc["logged_at"].isoformat()
    await db.spending_logs.insert_one(doc)
    return spending_log.model_dump()

@api_router.get("/spending")
async def get_spending_logs(date: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None, user: User = Depends(get_current_user)):
    query = {"user_id": user.user_id}
    if date:
        query["date"] = date
    elif start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    logs = await db.spending_logs.find(query, {"_id": 0}).sort("logged_at", -1).to_list(1000)
    return logs

@api_router.get("/spending/summary")
async def get_spending_summary(month: Optional[str] = None, user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    if month:
        year, m = month.split("-")
        start_date = f"{year}-{m}-01"
        if int(m) == 12:
            end_date = f"{int(year)+1}-01-01"
        else:
            end_date = f"{year}-{int(m)+1:02d}-01"
    else:
        start_date = today.replace(day=1).isoformat()
        end_date = today.isoformat()
    
    logs = await db.spending_logs.find({
        "user_id": user.user_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(1000)
    
    total = sum(log.get("amount", 0) for log in logs)
    by_category = {}
    for log in logs:
        cat = log.get("category", "Other")
        by_category[cat] = by_category.get(cat, 0) + log.get("amount", 0)
    
    daily_totals = {}
    for log in logs:
        d = log["date"]
        daily_totals[d] = daily_totals.get(d, 0) + log.get("amount", 0)
    
    return {
        "total": round(total, 2),
        "by_category": by_category,
        "daily_totals": daily_totals
    }

@api_router.delete("/spending/{log_id}")
async def delete_spending_log(log_id: str, user: User = Depends(get_current_user)):
    result = await db.spending_logs.delete_one({"id": log_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"message": "Deleted"}

# ==================== EXERCISE LOGS ====================

EXERCISE_TYPES = ["Running", "Walking", "Cycling", "Swimming", "Gym/Weights", "Yoga", "HIIT", "Sports", "Dancing", "Other"]

@api_router.get("/exercise/types")
async def get_exercise_types():
    return EXERCISE_TYPES

@api_router.post("/exercise")
async def log_exercise(log: ExerciseLogCreate, user: User = Depends(get_current_user)):
    exercise_log = ExerciseLog(
        user_id=user.user_id,
        exercise_type=log.exercise_type,
        duration_minutes=log.duration_minutes,
        notes=log.notes,
        date=log.date
    )
    doc = exercise_log.model_dump()
    doc["logged_at"] = doc["logged_at"].isoformat()
    await db.exercise_logs.insert_one(doc)
    return exercise_log.model_dump()

@api_router.get("/exercise")
async def get_exercise_logs(date: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None, user: User = Depends(get_current_user)):
    query = {"user_id": user.user_id}
    if date:
        query["date"] = date
    elif start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    logs = await db.exercise_logs.find(query, {"_id": 0}).sort("logged_at", -1).to_list(1000)
    return logs

@api_router.get("/exercise/summary")
async def get_exercise_summary(user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    week_start = today - timedelta(days=today.weekday())
    
    logs = await db.exercise_logs.find({
        "user_id": user.user_id,
        "date": {"$gte": week_start.isoformat(), "$lte": today.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    days_exercised = len(set(log["date"] for log in logs))
    total_minutes = sum(log.get("duration_minutes", 0) for log in logs)
    
    by_type = {}
    for log in logs:
        t = log.get("exercise_type", "Other")
        by_type[t] = by_type.get(t, 0) + log.get("duration_minutes", 0)
    
    return {
        "days_exercised": days_exercised,
        "total_minutes": total_minutes,
        "by_type": by_type
    }

@api_router.delete("/exercise/{log_id}")
async def delete_exercise_log(log_id: str, user: User = Depends(get_current_user)):
    result = await db.exercise_logs.delete_one({"id": log_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"message": "Deleted"}

# ==================== DASHBOARD COMPLETION ====================

@api_router.get("/dashboard/completion")
async def get_completion(date: Optional[str] = None, user: User = Depends(get_current_user)):
    if not date:
        date = datetime.now(timezone.utc).date().isoformat()
    
    prefs = await db.user_preferences.find_one({"user_id": user.user_id}, {"_id": 0})
    target_sleep = prefs.get("target_sleep_hours", 7.5) if prefs else 7.5
    calorie_goal = prefs.get("daily_calorie_goal", 2000) if prefs else 2000
    protein_goal = prefs.get("daily_protein_goal", 100) if prefs else 100
    
    # Exercise: 25% if exercised that day
    exercise_logs = await db.exercise_logs.find({"user_id": user.user_id, "date": date}, {"_id": 0}).to_list(100)
    exercise_done = len(exercise_logs) > 0
    
    # Sleep: 25% if slept within 1 hour of target
    sleep_logs = await db.sleep_logs.find({"user_id": user.user_id, "date": date}, {"_id": 0}).to_list(100)
    sleep_consistent = False
    if sleep_logs:
        total_sleep = sum(log.get("hours_slept", 0) for log in sleep_logs)
        sleep_consistent = abs(total_sleep - target_sleep) <= 1.5
    
    # Alcohol: 25% if <=2 standard drinks (healthy level)
    alcohol_logs = await db.alcohol_logs.find({"user_id": user.user_id, "date": date}, {"_id": 0}).to_list(100)
    total_drinks = sum(log.get("standard_drinks", 0) for log in alcohol_logs)
    alcohol_healthy = total_drinks <= 2
    
    # Nutrition: 25% if hit calorie/protein goals (within 10%)
    nutrition_logs = await db.nutrition_logs.find({"user_id": user.user_id, "date": date}, {"_id": 0}).to_list(100)
    total_calories = sum(log.get("calories", 0) for log in nutrition_logs)
    total_protein = sum(log.get("protein", 0) for log in nutrition_logs)
    nutrition_hit = (calorie_goal * 0.9 <= total_calories <= calorie_goal * 1.1) and (total_protein >= protein_goal * 0.9)
    
    completion = {
        "date": date,
        "exercise": {"done": exercise_done, "percentage": 25 if exercise_done else 0},
        "sleep": {"consistent": sleep_consistent, "percentage": 25 if sleep_consistent else 0, "hours": sum(log.get("hours_slept", 0) for log in sleep_logs) if sleep_logs else 0},
        "alcohol": {"healthy": alcohol_healthy, "percentage": 25 if alcohol_healthy else 0, "standard_drinks": total_drinks},
        "nutrition": {"hit_goals": nutrition_hit, "percentage": 25 if nutrition_hit else 0, "calories": total_calories, "protein": total_protein},
        "total_percentage": (25 if exercise_done else 0) + (25 if sleep_consistent else 0) + (25 if alcohol_healthy else 0) + (25 if nutrition_hit else 0)
    }
    
    return completion

@api_router.get("/dashboard/weekly")
async def get_weekly_completion(user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    week_start = today - timedelta(days=6)
    
    completions = []
    for i in range(7):
        date = (week_start + timedelta(days=i)).isoformat()
        completion = await get_completion(date=date, user=user)
        completions.append(completion)
    
    return completions

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "LifeTiles Sync API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
