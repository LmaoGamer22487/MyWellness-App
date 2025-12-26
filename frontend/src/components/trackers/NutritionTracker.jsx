import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Utensils, X, Trash2, Sparkles, Check, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NutritionTracker = ({ date, preferences, onClose, onSave }) => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [mealDescription, setMealDescription] = useState("");
  const [mealType, setMealType] = useState("lunch");
  const [loading, setLoading] = useState(false);

  const mealTypes = [
    { value: "breakfast", label: "Breakfast" },
    { value: "lunch", label: "Lunch" },
    { value: "dinner", label: "Dinner" },
    { value: "snack", label: "Snack" },
  ];

  useEffect(() => {
    fetchLogs();
    fetchSummary();
  }, [date]);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API}/nutrition`, { params: { date } });
      setLogs(response.data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API}/nutrition/summary`);
      setSummary(response.data);
    } catch (error) {
      console.error("Failed to fetch summary:", error);
    }
  };

  const handleLog = async () => {
    if (!mealDescription.trim()) {
      toast.error("Please describe your meal");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/nutrition`, {
        meal_description: mealDescription,
        meal_type: mealType,
        date: date,
      });
      toast.success("Meal logged and analyzed by AI");
      setMealDescription("");
      fetchLogs();
      fetchSummary();
      onSave();
    } catch (error) {
      console.error("Failed to log:", error);
      toast.error("Failed to log meal");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (logId) => {
    try {
      await axios.delete(`${API}/nutrition/${logId}`);
      toast.success("Deleted");
      fetchLogs();
      fetchSummary();
      onSave();
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete");
    }
  };

  const totalCalories = logs.reduce((sum, log) => sum + (log.calories || 0), 0);
  const totalProtein = logs.reduce((sum, log) => sum + (log.protein || 0), 0);
  const calorieGoal = preferences?.daily_calorie_goal || 2000;
  const proteinGoal = preferences?.daily_protein_goal || 100;

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      {/* Header */}
      <div className="p-6 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-burgundy-50 flex items-center justify-center">
            <Utensils className="w-5 h-5 text-burgundy-600" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-primary">Nutrition Tracker</h2>
            <p className="font-body text-sm text-muted-foreground">{date}</p>
          </div>
        </div>
        <Button
          data-testid="close-nutrition-tracker"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-full"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-burgundy-50 rounded-xl">
            <span className="font-body text-xs text-burgundy-700">Calories</span>
            <p className="font-heading text-2xl font-bold text-burgundy-800 mt-1">
              {totalCalories}
            </p>
            <div className="mt-2 h-1.5 bg-burgundy-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-burgundy-600 rounded-full transition-all"
                style={{ width: `${Math.min(100, (totalCalories / calorieGoal) * 100)}%` }}
              />
            </div>
            <p className="font-body text-xs text-burgundy-600 mt-1">
              Goal: {calorieGoal} kcal
            </p>
          </div>
          <div className="p-4 bg-violet-50 rounded-xl">
            <span className="font-body text-xs text-violet-700">Protein</span>
            <p className="font-heading text-2xl font-bold text-violet-800 mt-1">
              {totalProtein.toFixed(0)}g
            </p>
            <div className="mt-2 h-1.5 bg-violet-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-600 rounded-full transition-all"
                style={{ width: `${Math.min(100, (totalProtein / proteinGoal) * 100)}%` }}
              />
            </div>
            <p className="font-body text-xs text-violet-600 mt-1">
              Goal: {proteinGoal}g
            </p>
          </div>
        </div>

        {/* Weekly Stats */}
        {summary && (
          <div className="p-4 bg-muted rounded-xl">
            <p className="font-body text-sm font-medium mb-2">This Week's Consistency</p>
            <div className="flex gap-4">
              <div>
                <p className="font-heading text-lg font-bold text-foreground">
                  {summary.days_hit_calories}/{summary.days_logged}
                </p>
                <p className="font-body text-xs text-muted-foreground">Days hit calorie goal</p>
              </div>
              <div>
                <p className="font-heading text-lg font-bold text-foreground">
                  {summary.days_hit_protein}/{summary.days_logged}
                </p>
                <p className="font-body text-xs text-muted-foreground">Days hit protein goal</p>
              </div>
            </div>
          </div>
        )}

        {/* Logged Meals */}
        {logs.length > 0 && (
          <div>
            <Label className="font-body text-sm font-medium mb-2 block">Today's Meals</Label>
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-xs font-medium uppercase text-muted-foreground">
                          {log.meal_type}
                        </span>
                        {log.is_healthy ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" />
                            Healthy
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                            <XIcon className="w-3 h-3" />
                            Indulgent
                          </span>
                        )}
                      </div>
                      <p className="font-body text-sm font-medium mt-1">{log.meal_description}</p>
                      <p className="font-body text-xs text-muted-foreground mt-1">
                        {log.calories} kcal • {log.protein}g protein
                      </p>
                    </div>
                    <Button
                      data-testid={`delete-nutrition-${log.id}`}
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(log.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Log New Meal */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600" />
            <Label className="font-body text-sm font-medium">Log Meal (AI-Analyzed)</Label>
          </div>
          
          <Select value={mealType} onValueChange={setMealType}>
            <SelectTrigger data-testid="meal-type-select" className="bg-input/50 border-transparent rounded-lg h-11">
              <SelectValue placeholder="Select meal type" />
            </SelectTrigger>
            <SelectContent>
              {mealTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            data-testid="meal-description-input"
            placeholder="Describe your meal... e.g., 'Grilled chicken salad with avocado and olive oil dressing'"
            value={mealDescription}
            onChange={(e) => setMealDescription(e.target.value)}
            className="bg-input/50 border-transparent focus:border-primary/30 rounded-lg min-h-[100px] resize-none"
          />

          <p className="font-body text-xs text-muted-foreground">
            AI will analyze your meal and estimate calories, protein, and healthiness.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/30">
        <Button
          data-testid="log-nutrition-button"
          onClick={handleLog}
          disabled={loading || !mealDescription.trim()}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-full font-medium"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></span>
              Analyzing...
            </span>
          ) : (
            "Log & Analyze Meal"
          )}
        </Button>
      </div>
    </div>
  );
};

export default NutritionTracker;
