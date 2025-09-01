import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import FicheCreation from "@/pages/FicheCreation";
import FicheDetail from "@/pages/FicheDetail";
import Admin from "@/pages/Admin";
import Reports from "@/pages/Reports";
import { AuthProvider, useAuth } from "@/hooks/useAuth.jsx";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Handle authentication redirection
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && location !== '/login') {
        setLocation('/login');
      } else if (isAuthenticated && location === '/login') {
        setLocation('/');
      }
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      {isAuthenticated && (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/fiches/new" component={FicheCreation} />
          <Route path="/fiches/:id" component={FicheDetail} />
          <Route path="/admin" component={Admin} />
          <Route path="/reports" component={Reports} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
