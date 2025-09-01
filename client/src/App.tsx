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
  function AuthenticatedRoute({ component: Component, ...props }) {
    const { isAuthenticated, isLoading } = useAuth();
    const [, setLocation] = useLocation();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        setLocation('/login');
      }
    }, [isAuthenticated, isLoading, setLocation]);

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

    if (!isAuthenticated) {
      return null;
    }

    return <Component {...props} />;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={(props) => <AuthenticatedRoute component={Dashboard} {...props} />} />
      <Route path="/fiches/new" component={(props) => <AuthenticatedRoute component={FicheCreation} {...props} />} />
      <Route path="/fiches/:id" component={(props) => <AuthenticatedRoute component={FicheDetail} {...props} />} />
      <Route path="/admin" component={(props) => <AuthenticatedRoute component={Admin} {...props} />} />
      <Route path="/reports" component={(props) => <AuthenticatedRoute component={Reports} {...props} />} />
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
