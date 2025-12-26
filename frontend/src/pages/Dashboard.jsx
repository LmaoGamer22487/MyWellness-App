import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { format, startOfWeek, addDays } from "date-fns";
import {
  Wine,
  Moon,
  Utensils,
  Wallet,
  Dumbbell,
  LogOut,
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

import AlcoholTracker from "@/components/trackers/AlcoholTracker";
import SleepTracker from "@/components/trackers/SleepTracker";
import NutritionTracker from "@/components/trackers/NutritionTracker";
import SpendingTracker from "@/components/trackers/SpendingTracker";
import ExerciseTracker from "@/components/trackers/ExerciseTracker";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTracker, setActiveTracker] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [weeklyCompletion, setWeeklyCompletion] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const modalRef = useRef(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && activeTracker) {
        setActiveTracker(null);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [activeTracker]);

  const fetchCompletion = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/dashboard/completion`, {
        params: { date: dateStr },
      });
      setCompletion(response.data);
    } catch (error) {
      console.error("Failed to fetch completion:", error);
    }
  }, [dateStr]);

  const fetchWeeklyCompletion = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/dashboard/weekly`);
      setWeeklyCompletion(response.data);
    } catch (error) {
      console.error("Failed to fetch weekly completion:", error);
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/preferences`);
      setPreferences(response.data);
    } catch (error) {
      console.error("Failed to fetch preferences:", error);
    }
  }, []);

  useEffect(() => {
    fetchCompletion();
    fetchWeeklyCompletion();
    fetchPreferences();
  }, [fetchCompletion, fetchWeeklyCompletion, fetchPreferences]);

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/");
    }
  };

  const refreshData = () => {
    fetchCompletion();
    fetchWeeklyCompletion();
  };

  const trackers = [
    {
      id: "alcohol",
      name: "Alcohol",
      icon: Wine,
      color: "text-burgundy-600",
      bgColor: "bg-burgundy-50",
      borderColor: "border-burgundy-200",
      component: AlcoholTracker,
    },
    {
      id: "sleep",
      name: "Sleep",
      icon: Moon,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
      borderColor: "border-violet-200",
      component: SleepTracker,
    },
    {
      id: "nutrition",
      name: "Nutrition",
      icon: Utensils,
      color: "text-burgundy-500",
      bgColor: "bg-burgundy-50",
      borderColor: "border-burgundy-200",
      component: NutritionTracker,
    },
    {
      id: "spending",
      name: "Spending",
      icon: Wallet,
      color: "text-violet-500",
      bgColor: "bg-violet-50",
      borderColor: "border-violet-200",
      component: SpendingTracker,
    },
    {
      id: "exercise",
      name: "Exercise",
      icon: Dumbbell,
      color: "text-burgundy-600",
      bgColor: "bg-burgundy-50",
      borderColor: "border-burgundy-200",
      component: ExerciseTracker,
    },
  ];

  // Prepare chart data
  const chartData = weeklyCompletion.map((day) => ({
    date: format(new Date(day.date), "EEE"),
    exercise: day.exercise?.percentage || 0,
    sleep: day.sleep?.percentage || 0,
    alcohol: day.alcohol?.percentage || 0,
    nutrition: day.nutrition?.percentage || 0,
    total: day.total_percentage || 0,
  }));

  const getCompletionColor = (percentage) => {
    if (percentage >= 75) return "#722f37"; // burgundy
    if (percentage >= 50) return "#5d3a9b"; // violet
    if (percentage >= 25) return "#d8a7b1"; // accent pink
    return "#e6dcdd"; // border color
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <h1 className="font-heading text-xl md:text-2xl font-bold text-primary">
            LifeTiles Sync
          </h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                data-testid="user-menu-button"
                variant="ghost"
                className="flex items-center gap-3 hover:bg-muted rounded-full px-3"
              >
                <Avatar className="w-9 h-9">
                  <AvatarImage src={user?.picture} alt={user?.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="font-body text-sm hidden md:block">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                data-testid="logout-button"
                onClick={handleLogout}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          {/* Calendar Section */}
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="bg-card rounded-2xl border border-border/50 shadow-card p-4 md:p-6">
              <div className="flex items-center gap-3 mb-4">
                <CalendarIcon className="w-5 h-5 text-primary" />
                <h2 className="font-heading text-lg font-semibold text-primary">Calendar</h2>
              </div>
              <Calendar
                data-testid="dashboard-calendar"
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-xl"
              />
              <div className="mt-4 pt-4 border-t border-border/30">
                <p className="font-body text-sm text-muted-foreground">
                  Selected: <span className="text-foreground font-medium">{format(selectedDate, "MMMM d, yyyy")}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            {/* Daily Completion Ring */}
            <div className="bg-card rounded-2xl border border-border/50 shadow-card p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Completion Ring */}
                <div className="relative w-32 h-32 flex-shrink-0">
                  <svg className="w-32 h-32 progress-ring" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="hsl(var(--muted))"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(completion?.total_percentage || 0) * 2.83} 283`}
                      className="progress-ring-circle"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-heading text-2xl font-bold text-primary">
                      {completion?.total_percentage || 0}%
                    </span>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-xl ${completion?.exercise?.done ? "bg-burgundy-50" : "bg-muted"}`}>
                    <div className="flex items-center gap-2">
                      <Dumbbell className={`w-4 h-4 ${completion?.exercise?.done ? "text-burgundy-600" : "text-muted-foreground"}`} />
                      <span className="font-body text-sm font-medium">Exercise</span>
                    </div>
                    <p className={`font-heading text-lg font-bold mt-1 ${completion?.exercise?.done ? "text-burgundy-600" : "text-muted-foreground"}`}>
                      {completion?.exercise?.percentage || 0}%
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${completion?.sleep?.consistent ? "bg-violet-50" : "bg-muted"}`}>
                    <div className="flex items-center gap-2">
                      <Moon className={`w-4 h-4 ${completion?.sleep?.consistent ? "text-violet-600" : "text-muted-foreground"}`} />
                      <span className="font-body text-sm font-medium">Sleep</span>
                    </div>
                    <p className={`font-heading text-lg font-bold mt-1 ${completion?.sleep?.consistent ? "text-violet-600" : "text-muted-foreground"}`}>
                      {completion?.sleep?.percentage || 0}%
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${completion?.alcohol?.healthy ? "bg-burgundy-50" : "bg-muted"}`}>
                    <div className="flex items-center gap-2">
                      <Wine className={`w-4 h-4 ${completion?.alcohol?.healthy ? "text-burgundy-600" : "text-muted-foreground"}`} />
                      <span className="font-body text-sm font-medium">Alcohol</span>
                    </div>
                    <p className={`font-heading text-lg font-bold mt-1 ${completion?.alcohol?.healthy ? "text-burgundy-600" : "text-muted-foreground"}`}>
                      {completion?.alcohol?.percentage || 0}%
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${completion?.nutrition?.hit_goals ? "bg-violet-50" : "bg-muted"}`}>
                    <div className="flex items-center gap-2">
                      <Utensils className={`w-4 h-4 ${completion?.nutrition?.hit_goals ? "text-violet-600" : "text-muted-foreground"}`} />
                      <span className="font-body text-sm font-medium">Nutrition</span>
                    </div>
                    <p className={`font-heading text-lg font-bold mt-1 ${completion?.nutrition?.hit_goals ? "text-violet-600" : "text-muted-foreground"}`}>
                      {completion?.nutrition?.percentage || 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Chart */}
            <div className="bg-card rounded-2xl border border-border/50 shadow-card p-6">
              <h3 className="font-heading text-lg font-semibold text-primary mb-4">
                Weekly Progress
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      domain={[0, 100]}
                    />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getCompletionColor(entry.total)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tracker Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              {trackers.map((tracker) => (
                <button
                  key={tracker.id}
                  data-testid={`tracker-${tracker.id}`}
                  onClick={() => setActiveTracker(tracker.id)}
                  className={`bg-card rounded-xl border ${tracker.borderColor} p-4 shadow-card hover:shadow-card-hover transition-all duration-300 text-left group`}
                >
                  <div className={`${tracker.bgColor} w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <tracker.icon className={`w-5 h-5 ${tracker.color}`} />
                  </div>
                  <p className="font-body text-sm font-medium text-foreground">{tracker.name}</p>
                  <Plus className="w-4 h-4 text-muted-foreground mt-2 group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Tracker Modals */}
      {activeTracker && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop - clicking closes modal */}
          <div 
            data-testid="modal-backdrop"
            className="absolute inset-0 bg-black/50"
            onClick={() => setActiveTracker(null)}
          />
          {/* Modal Content Container */}
          <div className="absolute inset-0 flex items-end md:items-center justify-center p-0 md:p-4">
            <div 
              className="relative bg-card w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden animate-slide-up shadow-xl"
            >
              {trackers.map((tracker) => {
                if (tracker.id === activeTracker) {
                  const TrackerComponent = tracker.component;
                  return (
                    <TrackerComponent
                      key={tracker.id}
                      date={dateStr}
                      preferences={preferences}
                      onClose={() => setActiveTracker(null)}
                      onSave={refreshData}
                    />
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
