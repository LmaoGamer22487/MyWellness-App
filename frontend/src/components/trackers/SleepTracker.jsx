import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Moon, X, Trash2, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SleepTracker = ({ date, preferences, onClose, onSave }) => {
  const [logs, setLogs] = useState([]);
  const [sleepDebt, setSleepDebt] = useState(null);
  const [sleepTime, setSleepTime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
    fetchSleepDebt();
    // Set default times from preferences
    if (preferences) {
      setSleepTime(preferences.usual_sleep_time || "23:00");
      setWakeTime(preferences.usual_wake_time || "06:30");
    }
  }, [date, preferences]);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API}/sleep`, { params: { date } });
      setLogs(response.data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  };

  const fetchSleepDebt = async () => {
    try {
      const response = await axios.get(`${API}/sleep/debt`);
      setSleepDebt(response.data);
    } catch (error) {
      console.error("Failed to fetch sleep debt:", error);
    }
  };

  const handleLog = async () => {
    if (!sleepTime || !wakeTime) {
      toast.error("Please set both sleep and wake times");
      return;
    }

    setLoading(true);
    try {
      // Create datetime strings
      const sleepDateTime = new Date(`${date}T${sleepTime}:00`);
      let wakeDateTime = new Date(`${date}T${wakeTime}:00`);
      
      // If wake time is earlier than sleep time, assume next day
      if (wakeDateTime <= sleepDateTime) {
        wakeDateTime.setDate(wakeDateTime.getDate() + 1);
      }

      await axios.post(`${API}/sleep`, {
        sleep_time: sleepDateTime.toISOString(),
        wake_time: wakeDateTime.toISOString(),
        date: date,
      });
      toast.success("Sleep logged successfully");
      fetchLogs();
      fetchSleepDebt();
      onSave();
    } catch (error) {
      console.error("Failed to log:", error);
      toast.error("Failed to log sleep");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (logId) => {
    try {
      await axios.delete(`${API}/sleep/${logId}`);
      toast.success("Deleted");
      fetchLogs();
      fetchSleepDebt();
      onSave();
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete");
    }
  };

  const calculateHours = () => {
    if (!sleepTime || !wakeTime) return 0;
    const sleep = new Date(`2000-01-01T${sleepTime}:00`);
    let wake = new Date(`2000-01-01T${wakeTime}:00`);
    if (wake <= sleep) {
      wake.setDate(wake.getDate() + 1);
    }
    return ((wake - sleep) / (1000 * 60 * 60)).toFixed(1);
  };

  const totalHoursToday = logs.reduce((sum, log) => sum + (log.hours_slept || 0), 0);
  const targetHours = preferences?.target_sleep_hours || 7.5;

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      {/* Header */}
      <div className="p-6 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <Moon className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-primary">Sleep Tracker</h2>
            <p className="font-body text-sm text-muted-foreground">{date}</p>
          </div>
        </div>
        <Button
          data-testid="close-sleep-tracker"
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
          <div className="p-4 bg-violet-50 rounded-xl">
            <span className="font-body text-xs text-violet-700">Today's Sleep</span>
            <p className="font-heading text-2xl font-bold text-violet-800 mt-1">
              {totalHoursToday.toFixed(1)}h
            </p>
            <p className="font-body text-xs text-violet-600">
              Target: {targetHours}h
            </p>
          </div>
          <div className={`p-4 rounded-xl ${sleepDebt?.debt > 0 ? "bg-destructive/10" : "bg-muted"}`}>
            <span className={`font-body text-xs ${sleepDebt?.debt > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              Weekly Sleep Debt
            </span>
            <p className={`font-heading text-2xl font-bold mt-1 ${sleepDebt?.debt > 0 ? "text-destructive" : "text-foreground"}`}>
              {sleepDebt?.debt?.toFixed(1) || 0}h
            </p>
            <p className="font-body text-xs text-muted-foreground">
              This week: {sleepDebt?.total_slept?.toFixed(1) || 0}h
            </p>
          </div>
        </div>

        {/* Sleep Debt Warning */}
        {sleepDebt?.debt > 3 && (
          <div className="p-4 bg-destructive/10 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-body text-sm font-medium text-destructive">High Sleep Debt</p>
              <p className="font-body text-xs text-destructive/80">
                You're behind by {sleepDebt.debt.toFixed(1)} hours this week. Try to catch up on rest!
              </p>
            </div>
          </div>
        )}

        {/* Logged Sleep */}
        {logs.length > 0 && (
          <div>
            <Label className="font-body text-sm font-medium mb-2 block">Today's Sleep Log</Label>
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-body text-sm font-medium">
                        {log.hours_slept?.toFixed(1)} hours
                      </p>
                      <p className="font-body text-xs text-muted-foreground">
                        {new Date(log.sleep_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(log.wake_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <Button
                    data-testid={`delete-sleep-${log.id}`}
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

        {/* Log New Sleep */}
        <div className="space-y-4">
          <Label className="font-body text-sm font-medium">Log Sleep</Label>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sleepTime" className="font-body text-xs text-muted-foreground">
                Bedtime
              </Label>
              <Input
                data-testid="sleep-time-input"
                id="sleepTime"
                type="time"
                value={sleepTime}
                onChange={(e) => setSleepTime(e.target.value)}
                className="mt-1 bg-input/50 border-transparent focus:border-primary/30 rounded-lg h-12"
              />
            </div>
            <div>
              <Label htmlFor="wakeTime" className="font-body text-xs text-muted-foreground">
                Wake time
              </Label>
              <Input
                data-testid="wake-time-input"
                id="wakeTime"
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="mt-1 bg-input/50 border-transparent focus:border-primary/30 rounded-lg h-12"
              />
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg text-center">
            <span className="font-body text-sm text-muted-foreground">Duration: </span>
            <span className="font-heading text-lg font-bold text-foreground">
              {calculateHours()} hours
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/30">
        <Button
          data-testid="log-sleep-button"
          onClick={handleLog}
          disabled={loading || !sleepTime || !wakeTime}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-full font-medium"
        >
          {loading ? "Logging..." : "Log Sleep"}
        </Button>
      </div>
    </div>
  );
};

export default SleepTracker;
