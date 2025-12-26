import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Dumbbell, X, Trash2, Timer, Flame } from "lucide-react";
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

const ExerciseTracker = ({ date, onClose, onSave }) => {
  const [logs, setLogs] = useState([]);
  const [exerciseTypes, setExerciseTypes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [exerciseType, setExerciseType] = useState("Running");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
    fetchExerciseTypes();
    fetchSummary();
  }, [date]);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API}/exercise`, { params: { date } });
      setLogs(response.data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  };

  const fetchExerciseTypes = async () => {
    try {
      const response = await axios.get(`${API}/exercise/types`);
      setExerciseTypes(response.data);
    } catch (error) {
      console.error("Failed to fetch exercise types:", error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API}/exercise/summary`);
      setSummary(response.data);
    } catch (error) {
      console.error("Failed to fetch summary:", error);
    }
  };

  const handleLog = async () => {
    if (!duration || parseInt(duration) <= 0) {
      toast.error("Please enter a valid duration");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/exercise`, {
        exercise_type: exerciseType,
        duration_minutes: parseInt(duration),
        notes: notes || null,
        date: date,
      });
      toast.success("Exercise logged");
      setDuration("");
      setNotes("");
      fetchLogs();
      fetchSummary();
      onSave();
    } catch (error) {
      console.error("Failed to log:", error);
      toast.error("Failed to log exercise");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (logId) => {
    try {
      await axios.delete(`${API}/exercise/${logId}`);
      toast.success("Deleted");
      fetchLogs();
      fetchSummary();
      onSave();
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete");
    }
  };

  const totalMinutesToday = logs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);

  const exerciseIcons = {
    Running: "🏃",
    Walking: "🚶",
    Cycling: "🚴",
    Swimming: "🏊",
    "Gym/Weights": "🏋️",
    Yoga: "🧘",
    HIIT: "💪",
    Sports: "⚽",
    Dancing: "💃",
    Other: "🎯",
  };

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      {/* Header */}
      <div className="p-6 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-burgundy-50 flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-burgundy-600" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-primary">Exercise Tracker</h2>
            <p className="font-body text-sm text-muted-foreground">{date}</p>
          </div>
        </div>
        <Button
          data-testid="close-exercise-tracker"
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
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-burgundy-600" />
              <span className="font-body text-xs text-burgundy-700">Today</span>
            </div>
            <p className="font-heading text-2xl font-bold text-burgundy-800 mt-1">
              {totalMinutesToday} min
            </p>
          </div>
          <div className="p-4 bg-violet-50 rounded-xl">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-violet-600" />
              <span className="font-body text-xs text-violet-700">This Week</span>
            </div>
            <p className="font-heading text-2xl font-bold text-violet-800 mt-1">
              {summary?.total_minutes || 0} min
            </p>
            <p className="font-body text-xs text-violet-600">
              {summary?.days_exercised || 0} days active
            </p>
          </div>
        </div>

        {/* Weekly Activity by Type */}
        {summary?.by_type && Object.keys(summary.by_type).length > 0 && (
          <div className="p-4 bg-muted rounded-xl">
            <p className="font-body text-sm font-medium mb-3">This Week by Activity</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.by_type).map(([type, minutes]) => (
                <div
                  key={type}
                  className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg"
                >
                  <span>{exerciseIcons[type] || "🎯"}</span>
                  <div>
                    <p className="font-body text-xs font-medium">{type}</p>
                    <p className="font-body text-xs text-muted-foreground">{minutes} min</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logged Exercises */}
        {logs.length > 0 && (
          <div>
            <Label className="font-body text-sm font-medium mb-2 block">Today's Workouts</Label>
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{exerciseIcons[log.exercise_type] || "🎯"}</span>
                    <div>
                      <p className="font-body text-sm font-medium">{log.exercise_type}</p>
                      <p className="font-body text-xs text-muted-foreground">
                        {log.duration_minutes} minutes
                        {log.notes && ` • ${log.notes}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    data-testid={`delete-exercise-${log.id}`}
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(log.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Log New Exercise */}
        <div className="space-y-4">
          <Label className="font-body text-sm font-medium">Log Workout</Label>
          
          <div>
            <Label className="font-body text-xs text-muted-foreground">Activity Type</Label>
            <Select value={exerciseType} onValueChange={setExerciseType}>
              <SelectTrigger data-testid="exercise-type-select" className="mt-1 bg-input/50 border-transparent rounded-lg h-12">
                <SelectValue placeholder="Select activity" />
              </SelectTrigger>
              <SelectContent>
                {exerciseTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    <span className="flex items-center gap-2">
                      <span>{exerciseIcons[type] || "🎯"}</span>
                      {type}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="duration" className="font-body text-xs text-muted-foreground">
              Duration (minutes)
            </Label>
            <Input
              data-testid="exercise-duration-input"
              id="duration"
              type="number"
              min="1"
              placeholder="30"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="mt-1 bg-input/50 border-transparent focus:border-primary/30 rounded-lg h-12"
            />
          </div>

          <div>
            <Label htmlFor="exerciseNotes" className="font-body text-xs text-muted-foreground">
              Notes (optional)
            </Label>
            <Textarea
              data-testid="exercise-notes-input"
              id="exerciseNotes"
              placeholder="Any details about your workout..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 bg-input/50 border-transparent focus:border-primary/30 rounded-lg min-h-[80px] resize-none"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/30">
        <Button
          data-testid="log-exercise-button"
          onClick={handleLog}
          disabled={loading || !duration}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-full font-medium"
        >
          {loading ? "Logging..." : "Log Workout"}
        </Button>
      </div>
    </div>
  );
};

export default ExerciseTracker;
