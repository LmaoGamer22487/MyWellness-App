import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Wallet, X, Trash2, TrendingUp } from "lucide-react";
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

const SpendingTracker = ({ date, onClose, onSave }) => {
  const [logs, setLogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
    fetchCategories();
    fetchSummary();
  }, [date]);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API}/spending`, { params: { date } });
      setLogs(response.data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/spending/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API}/spending/summary`);
      setSummary(response.data);
    } catch (error) {
      console.error("Failed to fetch summary:", error);
    }
  };

  const handleLog = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/spending`, {
        amount: parseFloat(amount),
        category: category,
        notes: notes,
        date: date,
      });
      toast.success("Spending logged");
      setAmount("");
      setNotes("");
      fetchLogs();
      fetchSummary();
      onSave();
    } catch (error) {
      console.error("Failed to log:", error);
      toast.error("Failed to log spending");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (logId) => {
    try {
      await axios.delete(`${API}/spending/${logId}`);
      toast.success("Deleted");
      fetchLogs();
      fetchSummary();
      onSave();
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete");
    }
  };

  const totalToday = logs.reduce((sum, log) => sum + (log.amount || 0), 0);

  const categoryColors = {
    Food: "bg-burgundy-100 text-burgundy-700",
    Transport: "bg-violet-100 text-violet-700",
    Entertainment: "bg-pink-100 text-pink-700",
    Shopping: "bg-amber-100 text-amber-700",
    Bills: "bg-blue-100 text-blue-700",
    Health: "bg-green-100 text-green-700",
    Other: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      {/* Header */}
      <div className="p-6 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-primary">Spending Tracker</h2>
            <p className="font-body text-sm text-muted-foreground">{date}</p>
          </div>
        </div>
        <Button
          data-testid="close-spending-tracker"
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
            <span className="font-body text-xs text-violet-700">Today</span>
            <p className="font-heading text-2xl font-bold text-violet-800 mt-1">
              ${totalToday.toFixed(2)}
            </p>
          </div>
          <div className="p-4 bg-burgundy-50 rounded-xl">
            <span className="font-body text-xs text-burgundy-700">This Month</span>
            <p className="font-heading text-2xl font-bold text-burgundy-800 mt-1">
              ${summary?.total?.toFixed(2) || "0.00"}
            </p>
          </div>
        </div>

        {/* Category Breakdown */}
        {summary?.by_category && Object.keys(summary.by_category).length > 0 && (
          <div className="p-4 bg-muted rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <p className="font-body text-sm font-medium">Monthly by Category</p>
            </div>
            <div className="space-y-2">
              {Object.entries(summary.by_category)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amt]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className={`font-body text-xs px-2 py-1 rounded-full ${categoryColors[cat] || categoryColors.Other}`}>
                      {cat}
                    </span>
                    <span className="font-body text-sm font-medium">${amt.toFixed(2)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Logged Spending */}
        {logs.length > 0 && (
          <div>
            <Label className="font-body text-sm font-medium mb-2 block">Today's Spending</Label>
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-body text-xs px-2 py-0.5 rounded-full ${categoryColors[log.category] || categoryColors.Other}`}>
                        {log.category}
                      </span>
                      <span className="font-heading text-sm font-bold">${log.amount.toFixed(2)}</span>
                    </div>
                    {log.notes && (
                      <p className="font-body text-xs text-muted-foreground mt-1">{log.notes}</p>
                    )}
                  </div>
                  <Button
                    data-testid={`delete-spending-${log.id}`}
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

        {/* Log New Spending */}
        <div className="space-y-4">
          <Label className="font-body text-sm font-medium">Add Expense</Label>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="amount" className="font-body text-xs text-muted-foreground">
                Amount
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  data-testid="spending-amount-input"
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7 bg-input/50 border-transparent focus:border-primary/30 rounded-lg h-12"
                />
              </div>
            </div>
            <div>
              <Label className="font-body text-xs text-muted-foreground">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="spending-category-select" className="mt-1 bg-input/50 border-transparent rounded-lg h-12">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes" className="font-body text-xs text-muted-foreground">
              Notes (optional)
            </Label>
            <Textarea
              data-testid="spending-notes-input"
              id="notes"
              placeholder="What did you spend on?"
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
          data-testid="log-spending-button"
          onClick={handleLog}
          disabled={loading || !amount}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-full font-medium"
        >
          {loading ? "Logging..." : "Log Expense"}
        </Button>
      </div>
    </div>
  );
};

export default SpendingTracker;
