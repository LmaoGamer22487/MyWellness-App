import requests
import sys
import json
from datetime import datetime, timezone, timedelta

class MyWellnessAPITester:
    def __init__(self, base_url="https://lifetiles-sync.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.session_token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.session_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_basic_endpoints(self):
        """Test basic public endpoints"""
        print("\n" + "="*50)
        print("TESTING BASIC ENDPOINTS")
        print("="*50)
        
        # Test root API endpoint
        success, response = self.run_test("Root API", "GET", "", 200)
        if success and isinstance(response, dict):
            message = response.get('message', '')
            if 'MyWellness' in message:
                print("✅ API correctly identifies as MyWellness App")
            else:
                print(f"⚠️  API message: {message} (expected MyWellness reference)")
        
        
        # Test drinks database
        success, drinks = self.run_test("Drinks Database", "GET", "drinks", 200)
        if success and isinstance(drinks, list):
            print(f"   Found {len(drinks)} drinks in database")
            if len(drinks) >= 100:
                print("✅ Alcohol database has 100+ drinks as required")
            else:
                print(f"⚠️  Only {len(drinks)} drinks found, expected 100+")
        
        # Test drink categories
        success, categories = self.run_test("Drink Categories", "GET", "drinks/categories", 200)
        if success and isinstance(categories, list):
            print(f"   Categories: {categories}")
        
        # Test spending categories
        success, spending_cats = self.run_test("Spending Categories", "GET", "spending/categories", 200)
        if success and isinstance(spending_cats, list):
            print(f"   Spending Categories: {spending_cats}")
        
        # Test exercise types
        success, exercise_types = self.run_test("Exercise Types", "GET", "exercise/types", 200)
        if success and isinstance(exercise_types, list):
            print(f"   Exercise Types: {exercise_types}")

    def create_test_user_session(self):
        """Create test user and session using MongoDB directly"""
        print("\n" + "="*50)
        print("CREATING TEST USER & SESSION")
        print("="*50)
        
        import subprocess
        import uuid
        
        # Generate unique identifiers
        timestamp = int(datetime.now().timestamp())
        user_id = f"test-user-{timestamp}"
        session_token = f"test_session_{timestamp}"
        email = f"test.user.{timestamp}@example.com"
        
        # MongoDB commands to create test user and session
        mongo_commands = f"""
        use('test_database');
        db.users.insertOne({{
          user_id: '{user_id}',
          email: '{email}',
          name: 'Test User',
          picture: 'https://via.placeholder.com/150',
          created_at: new Date()
        }});
        db.user_sessions.insertOne({{
          user_id: '{user_id}',
          session_token: '{session_token}',
          expires_at: new Date(Date.now() + 7*24*60*60*1000),
          created_at: new Date()
        }});
        db.user_preferences.insertOne({{
          user_id: '{user_id}',
          target_sleep_hours: 7.5,
          usual_sleep_time: '23:00',
          usual_wake_time: '06:30',
          late_night_days: [],
          daily_calorie_goal: 2000,
          daily_protein_goal: 100,
          setup_completed: true
        }});
        print('Created user: {user_id}');
        print('Session token: {session_token}');
        """
        
        try:
            result = subprocess.run(
                ['mongosh', '--eval', mongo_commands],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                print("✅ Test user and session created successfully")
                self.user_id = user_id
                self.session_token = session_token
                print(f"   User ID: {user_id}")
                print(f"   Session Token: {session_token}")
                return True
            else:
                print(f"❌ Failed to create test user: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Error creating test user: {str(e)}")
            return False

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n" + "="*50)
        print("TESTING AUTH ENDPOINTS")
        print("="*50)
        
        if not self.session_token:
            print("❌ No session token available, skipping auth tests")
            return False
        
        # Test /auth/me endpoint
        success, user_data = self.run_test("Get Current User", "GET", "auth/me", 200)
        if success:
            print(f"   User: {user_data.get('user', {}).get('name', 'Unknown')}")
            print(f"   Setup Completed: {user_data.get('setup_completed', False)}")
        
        # Test preferences
        self.run_test("Get Preferences", "GET", "preferences", 200)
        
        return success

    def test_tracker_endpoints(self):
        """Test all tracker endpoints with sample data"""
        print("\n" + "="*50)
        print("TESTING TRACKER ENDPOINTS")
        print("="*50)
        
        if not self.session_token:
            print("❌ No session token available, skipping tracker tests")
            return False
        
        today = datetime.now().date().isoformat()
        
        # Test alcohol logging
        alcohol_data = {
            "drink_id": "budweiser",
            "drink_name": "Budweiser",
            "servings": 1.0,
            "standard_drinks": 1.0,
            "date": today
        }
        success, alcohol_log = self.run_test("Log Alcohol", "POST", "alcohol", 200, alcohol_data)
        
        # Get alcohol logs
        self.run_test("Get Alcohol Logs", "GET", f"alcohol?date={today}", 200)
        
        # Test sleep logging
        sleep_data = {
            "sleep_time": f"{today}T23:00:00Z",
            "wake_time": f"{today}T07:00:00Z",
            "date": today
        }
        success, sleep_log = self.run_test("Log Sleep", "POST", "sleep", 200, sleep_data)
        
        # Get sleep logs and debt
        self.run_test("Get Sleep Logs", "GET", f"sleep?date={today}", 200)
        self.run_test("Get Sleep Debt", "GET", "sleep/debt", 200)
        
        # Test nutrition logging (AI-powered)
        nutrition_data = {
            "meal_description": "Grilled chicken breast with quinoa and vegetables",
            "meal_type": "dinner",
            "date": today
        }
        print("   Note: This test uses AI (Gemini 3 Flash) and may take a few seconds...")
        success, nutrition_log = self.run_test("Log Nutrition (AI)", "POST", "nutrition", 200, nutrition_data)
        
        # Get nutrition logs and summary
        self.run_test("Get Nutrition Logs", "GET", f"nutrition?date={today}", 200)
        self.run_test("Get Nutrition Summary", "GET", "nutrition/summary", 200)
        
        # Test spending logging
        spending_data = {
            "amount": 25.50,
            "category": "Food",
            "notes": "Lunch at restaurant",
            "date": today
        }
        success, spending_log = self.run_test("Log Spending", "POST", "spending", 200, spending_data)
        
        # Get spending logs and summary
        self.run_test("Get Spending Logs", "GET", f"spending?date={today}", 200)
        self.run_test("Get Spending Summary", "GET", "spending/summary", 200)
        
        # Test exercise logging
        exercise_data = {
            "exercise_type": "Running",
            "duration_minutes": 30,
            "notes": "Morning jog in the park",
            "date": today
        }
        success, exercise_log = self.run_test("Log Exercise", "POST", "exercise", 200, exercise_data)
        
        # Get exercise logs and summary
        self.run_test("Get Exercise Logs", "GET", f"exercise?date={today}", 200)
        self.run_test("Get Exercise Summary", "GET", "exercise/summary", 200)

    def test_dashboard_endpoints(self):
        """Test dashboard completion endpoints"""
        print("\n" + "="*50)
        print("TESTING DASHBOARD ENDPOINTS")
        print("="*50)
        
        if not self.session_token:
            print("❌ No session token available, skipping dashboard tests")
            return False
        
        today = datetime.now().date().isoformat()
        
        # Test daily completion
        success, completion = self.run_test("Get Daily Completion", "GET", f"dashboard/completion?date={today}", 200)
        if success:
            total_percentage = completion.get('total_percentage', 0)
            print(f"   Daily Completion: {total_percentage}%")
            
            # Check individual components
            exercise = completion.get('exercise', {})
            sleep = completion.get('sleep', {})
            alcohol = completion.get('alcohol', {})
            nutrition = completion.get('nutrition', {})
            
            print(f"   Exercise: {exercise.get('percentage', 0)}% ({'✅' if exercise.get('done') else '❌'})")
            print(f"   Sleep: {sleep.get('percentage', 0)}% ({'✅' if sleep.get('consistent') else '❌'})")
            print(f"   Alcohol: {alcohol.get('percentage', 0)}% ({'✅' if alcohol.get('healthy') else '❌'})")
            print(f"   Nutrition: {nutrition.get('percentage', 0)}% ({'✅' if nutrition.get('hit_goals') else '❌'})")
        
        # Test weekly completion
        self.run_test("Get Weekly Completion", "GET", "dashboard/weekly", 200)

    def cleanup_test_data(self):
        """Clean up test data from MongoDB"""
        print("\n" + "="*50)
        print("CLEANING UP TEST DATA")
        print("="*50)
        
        if not self.user_id:
            print("No test user to clean up")
            return
        
        import subprocess
        
        mongo_commands = f"""
        use('test_database');
        db.users.deleteMany({{user_id: '{self.user_id}'}});
        db.user_sessions.deleteMany({{user_id: '{self.user_id}'}});
        db.user_preferences.deleteMany({{user_id: '{self.user_id}'}});
        db.alcohol_logs.deleteMany({{user_id: '{self.user_id}'}});
        db.sleep_logs.deleteMany({{user_id: '{self.user_id}'}});
        db.nutrition_logs.deleteMany({{user_id: '{self.user_id}'}});
        db.spending_logs.deleteMany({{user_id: '{self.user_id}'}});
        db.exercise_logs.deleteMany({{user_id: '{self.user_id}'}});
        print('Cleaned up test data for user: {self.user_id}');
        """
        
        try:
            result = subprocess.run(
                ['mongosh', '--eval', mongo_commands],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                print("✅ Test data cleaned up successfully")
            else:
                print(f"⚠️  Cleanup warning: {result.stderr}")
                
        except Exception as e:
            print(f"⚠️  Cleanup error: {str(e)}")

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test['test']}")
                if 'error' in test:
                    print(f"   Error: {test['error']}")
                else:
                    print(f"   Expected: {test['expected']}, Got: {test['actual']}")
                    print(f"   Response: {test['response']}")
        
        return len(self.failed_tests) == 0

def main():
    print("🚀 Starting LifeTiles Sync API Testing...")
    
    tester = LifeTilesSyncAPITester()
    
    try:
        # Test basic endpoints first
        tester.test_basic_endpoints()
        
        # Create test user and session
        if tester.create_test_user_session():
            # Test auth endpoints
            tester.test_auth_endpoints()
            
            # Test tracker endpoints
            tester.test_tracker_endpoints()
            
            # Test dashboard endpoints
            tester.test_dashboard_endpoints()
        
        # Print summary
        success = tester.print_summary()
        
        return 0 if success else 1
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Testing interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {str(e)}")
        return 1
    finally:
        # Always try to clean up
        tester.cleanup_test_data()

if __name__ == "__main__":
    sys.exit(main())