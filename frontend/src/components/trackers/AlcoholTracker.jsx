import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Wine, X, Search, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AlcoholTracker = ({ date, onClose, onSave }) => {
  const [drinks, setDrinks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [servings, setServings] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDrinks();
    fetchCategories();
    fetchLogs();
  }, [date]);

  const fetchDrinks = async () => {
    try {
      const response = await axios.get(`${API}/drinks`);
      setDrinks(response.data);
    } catch (error) {
      console.error("Failed to fetch drinks:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/drinks/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API}/alcohol`, { params: { date } });
      setLogs(response.data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  };

  const filteredDrinks = drinks.filter((drink) => {
    const matchesSearch = drink.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "all" || drink.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectDrink = (drink) => {
    setSelectedDrink(drink);
    setServings(1);
  };

  const handleLog = async () => {
    if (!selectedDrink) return;

    setLoading(true);
    try {
      const standardDrinks = selectedDrink.standard_drinks_per_serving * servings;
      await axios.post(`${API}/alcohol`, {
        drink_id: selectedDrink.id,
        drink_name: selectedDrink.name,
        servings: servings,
        standard_drinks: standardDrinks,
        date: date,
      });
      toast.success(`Logged ${servings} ${selectedDrink.name}`);
      setSelectedDrink(null);
      setServings(1);
      fetchLogs();
      onSave();
    } catch (error) {
      console.error("Failed to log:", error);
      toast.error("Failed to log drink");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (logId) => {
    try {
      await axios.delete(`${API}/alcohol/${logId}`);
      toast.success("Deleted");
      fetchLogs();
      onSave();
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete");
    }
  };

  const totalStandardDrinks = logs.reduce((sum, log) => sum + (log.standard_drinks || 0), 0);

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      {/* Header */}
      <div className="p-6 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-burgundy-50 flex items-center justify-center">
            <Wine className="w-5 h-5 text-burgundy-600" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-primary">Alcohol Tracker</h2>
            <p className="font-body text-sm text-muted-foreground">{date}</p>
          </div>
        </div>
        <Button
          data-testid="close-alcohol-tracker"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-full"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Summary */}
        <div className="p-4 bg-burgundy-50 mx-4 mt-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-burgundy-700">Today's Standard Drinks</span>
            <span className="font-heading text-2xl font-bold text-burgundy-800">
              {totalStandardDrinks.toFixed(1)}
            </span>
          </div>
          <p className="font-body text-xs text-burgundy-600 mt-1">
            {totalStandardDrinks <= 2 ? "Within healthy limits ✓" : "Above recommended limit"}
          </p>
        </div>

        {/* Logged Drinks */}
        {logs.length > 0 && (
          <div className="px-4 pt-4">
            <Label className="font-body text-sm font-medium mb-2 block">Today's Drinks</Label>
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="font-body text-sm font-medium">{log.drink_name}</p>
                    <p className="font-body text-xs text-muted-foreground">
                      {log.servings} serving(s) • {log.standard_drinks.toFixed(1)} std drinks
                    </p>
                  </div>
                  <Button
                    data-testid={`delete-alcohol-${log.id}`}
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

        {/* Search & Filter */}
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-testid="alcohol-search"
              placeholder="Search drinks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-input/50 border-transparent focus:border-primary/30 rounded-lg h-11"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger data-testid="alcohol-category-select" className="bg-input/50 border-transparent rounded-lg h-11">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Drink List */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 pb-4">
            {filteredDrinks.slice(0, 20).map((drink) => (
              <button
                key={drink.id}
                data-testid={`drink-${drink.id}`}
                onClick={() => handleSelectDrink(drink)}
                className={`w-full p-3 rounded-lg text-left transition-all ${
                  selectedDrink?.id === drink.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-body text-sm font-medium">{drink.name}</p>
                    <p className={`font-body text-xs ${selectedDrink?.id === drink.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {drink.category} • {drink.alcohol_percentage}% ABV
                    </p>
                  </div>
                  <span className={`font-body text-xs ${selectedDrink?.id === drink.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {drink.standard_drinks_per_serving} std/serving
                  </span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Selected Drink */}
        {selectedDrink && (
          <div className="p-4 border-t border-border/30 bg-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-body text-sm font-medium">{selectedDrink.name}</p>
                <p className="font-body text-xs text-muted-foreground">
                  {(selectedDrink.standard_drinks_per_serving * servings).toFixed(1)} standard drinks
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  data-testid="decrease-servings"
                  variant="outline"
                  size="icon"
                  onClick={() => setServings(Math.max(0.5, servings - 0.5))}
                  className="w-9 h-9 rounded-full"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="font-heading text-lg font-bold w-8 text-center">{servings}</span>
                <Button
                  data-testid="increase-servings"
                  variant="outline"
                  size="icon"
                  onClick={() => setServings(servings + 0.5)}
                  className="w-9 h-9 rounded-full"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button
              data-testid="log-alcohol-button"
              onClick={handleLog}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-full font-medium"
            >
              {loading ? "Logging..." : "Log Drink"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlcoholTracker;
