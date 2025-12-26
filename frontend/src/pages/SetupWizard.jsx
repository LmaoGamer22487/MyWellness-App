import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Moon, Utensils, ArrowRight, ArrowLeft, Check } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SetupWizard = ({ user }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [sleepPrefs, setSleepPrefs] = useState({
    target_sleep_hours: 7.5,
    usual_sleep_time: "23:00",
    usual_wake_time: "06:30",
    late_night_days: [],
  });

  const [nutritionPrefs, setNutritionPrefs] = useState({
    daily_calorie_goal: 2000,
    daily_protein_goal: 100,
  });

  const daysOfWeek = [
    { value: "friday", label: "Fri" },
    { value: "saturday", label: "Sat" },
    { value: "sunday", label: "Sun" },
  ];

  const handleLateNightDayToggle = (day) => {
    setSleepPrefs((prev) => ({
      ...prev,
      late_night_days: prev.late_night_days.includes(day)
        ? prev.late_night_days.filter((d) => d !== day)
        : [...prev.late_night_days, day],
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await axios.put(`${API}/preferences`, {
        ...sleepPrefs,
        ...nutritionPrefs,
        setup_completed: true,
      });
      toast.success("Setup complete! Welcome to LifeTiles Sync.");
      navigate("/dashboard", { state: { user } });
    } catch (error) {
      console.error("Setup error:", error);
      toast.error("Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold text-primary">LifeTiles Sync</h1>
          <span className="font-body text-sm text-muted-foreground">
            Step {step} of 2
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-3xl mx-auto px-6 py-4">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 rounded-full"
            style={{ width: `${step * 50}%` }}
          ></div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-xl bg-violet-100 flex items-center justify-center">
                <Moon className="w-7 h-7 text-violet-600" />
              </div>
              <div>
                <h2 className="font-heading text-2xl font-semibold text-primary">
                  Sleep Preferences
                </h2>
                <p className="font-body text-muted-foreground">
                  Tell us about your sleep habits
                </p>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 p-8 shadow-card space-y-6">
              <div>
                <Label htmlFor="target_sleep" className="font-body text-sm font-medium">
                  Target sleep hours per day
                </Label>
                <div className="flex items-center gap-4 mt-2">
                  <Input
                    data-testid="target-sleep-input"
                    id="target_sleep"
                    type="number"
                    step="0.5"
                    min="4"
                    max="12"
                    value={sleepPrefs.target_sleep_hours}
                    onChange={(e) =>
                      setSleepPrefs((prev) => ({
                        ...prev,
                        target_sleep_hours: parseFloat(e.target.value) || 7.5,
                      }))
                    }
                    className="w-24 bg-input/50 border-transparent focus:border-primary/30 rounded-lg h-12"
                  />
                  <span className="text-muted-foreground font-body">hours</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Recommended: 7-8 hours for adults
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="sleep_time" className="font-body text-sm font-medium">
                    Usual bedtime
                  </Label>
                  <Input
                    data-testid="sleep-time-input"
                    id="sleep_time"
                    type="time"
                    value={sleepPrefs.usual_sleep_time}
                    onChange={(e) =>
                      setSleepPrefs((prev) => ({
                        ...prev,
                        usual_sleep_time: e.target.value,
                      }))
                    }
                    className="mt-2 bg-input/50 border-transparent focus:border-primary/30 rounded-lg h-12"
                  />
                </div>
                <div>
                  <Label htmlFor="wake_time" className="font-body text-sm font-medium">
                    Usual wake time
                  </Label>
                  <Input
                    data-testid="wake-time-input"
                    id="wake_time"
                    type="time"
                    value={sleepPrefs.usual_wake_time}
                    onChange={(e) =>
                      setSleepPrefs((prev) => ({
                        ...prev,
                        usual_wake_time: e.target.value,
                      }))
                    }
                    className="mt-2 bg-input/50 border-transparent focus:border-primary/30 rounded-lg h-12"
                  />
                </div>
              </div>

              <div>
                <Label className="font-body text-sm font-medium mb-3 block">
                  Days you prefer to stay up late
                </Label>
                <div className="flex gap-3">
                  {daysOfWeek.map((day) => (
                    <label
                      key={day.value}
                      className={`flex items-center justify-center w-14 h-14 rounded-xl border-2 cursor-pointer transition-all ${
                        sleepPrefs.late_night_days.includes(day.value)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted hover:border-primary/50"
                      }`}
                    >
                      <Checkbox
                        data-testid={`late-night-${day.value}`}
                        checked={sleepPrefs.late_night_days.includes(day.value)}
                        onCheckedChange={() => handleLateNightDayToggle(day.value)}
                        className="sr-only"
                      />
                      <span className="font-body text-sm font-medium">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <Button
                data-testid="next-step-button"
                onClick={() => setStep(2)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 rounded-full font-medium"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-xl bg-burgundy-100 flex items-center justify-center">
                <Utensils className="w-7 h-7 text-burgundy-600" />
              </div>
              <div>
                <h2 className="font-heading text-2xl font-semibold text-primary">
                  Nutrition Goals
                </h2>
                <p className="font-body text-muted-foreground">
                  Set your daily calorie and protein targets
                </p>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 p-8 shadow-card space-y-6">
              <div>
                <Label htmlFor="calorie_goal" className="font-body text-sm font-medium">
                  Daily calorie goal
                </Label>
                <div className="flex items-center gap-4 mt-2">
                  <Input
                    data-testid="calorie-goal-input"
                    id="calorie_goal"
                    type="number"
                    step="100"
                    min="1000"
                    max="5000"
                    value={nutritionPrefs.daily_calorie_goal}
                    onChange={(e) =>
                      setNutritionPrefs((prev) => ({
                        ...prev,
                        daily_calorie_goal: parseInt(e.target.value) || 2000,
                      }))
                    }
                    className="w-32 bg-input/50 border-transparent focus:border-primary/30 rounded-lg h-12"
                  />
                  <span className="text-muted-foreground font-body">kcal</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Average adult: 1800-2500 kcal depending on activity level
                </p>
              </div>

              <div>
                <Label htmlFor="protein_goal" className="font-body text-sm font-medium">
                  Daily protein goal
                </Label>
                <div className="flex items-center gap-4 mt-2">
                  <Input
                    data-testid="protein-goal-input"
                    id="protein_goal"
                    type="number"
                    step="10"
                    min="30"
                    max="300"
                    value={nutritionPrefs.daily_protein_goal}
                    onChange={(e) =>
                      setNutritionPrefs((prev) => ({
                        ...prev,
                        daily_protein_goal: parseInt(e.target.value) || 100,
                      }))
                    }
                    className="w-32 bg-input/50 border-transparent focus:border-primary/30 rounded-lg h-12"
                  />
                  <span className="text-muted-foreground font-body">grams</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Recommended: 0.8-1g per kg of body weight
                </p>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <Button
                data-testid="back-step-button"
                onClick={() => setStep(1)}
                variant="outline"
                className="border-2 border-primary/20 text-primary hover:bg-primary/5 h-12 px-8 rounded-full font-medium"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                data-testid="complete-setup-button"
                onClick={handleSubmit}
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 rounded-full font-medium"
              >
                {loading ? (
                  <span className="flex items-center">
                    <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                    Saving...
                  </span>
                ) : (
                  <>
                    Complete Setup
                    <Check className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupWizard;
