import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Wine, Moon, Utensils, Wallet, Dumbbell, BarChart3, Smartphone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const LandingPage = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
        if (response.data?.user) {
          // User is authenticated, redirect to dashboard
          if (response.data.setup_completed) {
            navigate("/dashboard", { state: { user: response.data.user }, replace: true });
          } else {
            navigate("/setup", { state: { user: response.data.user }, replace: true });
          }
        }
      } catch (error) {
        // Not authenticated, show landing page
      } finally {
        setChecking(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const features = [
    {
      icon: Wine,
      title: "Alcohol Tracker",
      description: "Track your intake with a database of 100+ drinks. Know your standard drinks instantly.",
      color: "text-burgundy-600",
      bgColor: "bg-burgundy-50",
    },
    {
      icon: Moon,
      title: "Sleep Schedule",
      description: "Monitor your sleep patterns, consistency, and calculate your sleep debt.",
      color: "text-violet-600",
      bgColor: "bg-violet-50",
    },
    {
      icon: Utensils,
      title: "Nutrition Tracker",
      description: "AI-powered meal analysis for calories, protein, and healthiness ratings.",
      color: "text-burgundy-500",
      bgColor: "bg-burgundy-50",
    },
    {
      icon: Wallet,
      title: "Spending Habits",
      description: "Track daily expenses, categorize spending, and export to spreadsheet.",
      color: "text-violet-500",
      bgColor: "bg-violet-50",
    },
    {
      icon: Dumbbell,
      title: "Exercise Logger",
      description: "Log your workouts, track duration, and monitor weekly activity.",
      color: "text-burgundy-600",
      bgColor: "bg-burgundy-50",
    },
    {
      icon: Smartphone,
      title: "Cross-Platform",
      description: "Works on mobile & desktop with offline support and bi-directional sync.",
      color: "text-violet-600",
      bgColor: "bg-violet-50",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-burgundy-50 via-background to-violet-50 opacity-60"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <h1 
              data-testid="hero-title"
              className="font-heading text-5xl md:text-6xl font-bold tracking-tight text-primary mb-6"
            >
              MyWellness App
            </h1>
            <p className="font-body text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed">
              Your personal wellness dashboard. Track alcohol, sleep, nutrition, spending, and exercise—works on any device with offline sync.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                data-testid="login-button"
                <GoogleLoginButton 
                  onSuccess={(data) => {
                    const { user, setup_completed } = data;
                    if (setup_completed) {
                      navigate("/dashboard", { state: { user }, replace: true });
                    } else {
                      navigate("/setup", { state: { user }, replace: true });
                    }
                  }}
                onError={(error) => {
                  toast.error("Authentication failed");
                }}
                />

                className="bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-10 rounded-full font-medium text-lg transition-transform active:scale-95 shadow-lg shadow-primary/20"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="w-4 h-4" />
              <span className="font-body text-sm">Works offline • Syncs across devices</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight text-primary/90 text-center mb-16">
          Track What Matters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              data-testid={`feature-card-${index}`}
              className="bg-card text-card-foreground rounded-2xl border border-border/50 p-8 shadow-card hover:shadow-card-hover transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`${feature.bgColor} w-14 h-14 rounded-xl flex items-center justify-center mb-6`}>
                <feature.icon className={`w-7 h-7 ${feature.color}`} />
              </div>
              <h3 className="font-heading text-xl font-medium text-primary/80 mb-3">
                {feature.title}
              </h3>
              <p className="font-body text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-burgundy-800 to-violet-800 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-semibold text-white mb-6">
            Start Your Wellness Journey
          </h2>
          <p className="font-body text-lg text-white/80 mb-10">
            Track your habits anywhere—mobile, tablet, or desktop. Your data syncs seamlessly.
          </p>
          <Button
            data-testid="cta-login-button"
            <GoogleLoginButton 
              onSuccess={(data) => {
                const { user, setup_completed } = data;
                if (setup_completed) {
                  navigate("/dashboard", { state: { user }, replace: true });
                } else {
                  navigate("/setup", { state: { user }, replace: true });
                }
              }}
              onError={(error) => {
                toast.error("Authentication failed");
              }}
            />

            className="bg-white text-primary hover:bg-white/90 h-14 px-10 rounded-full font-medium text-lg transition-transform active:scale-95"
          >
            Get Started Free
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="font-body text-muted-foreground">
            © 2025 MyWellness App. Built with care for your wellbeing.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
