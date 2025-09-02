import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
// Removed Toaster and TooltipProvider - no longer needed without Tailwind UI
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import FicheCreation from "@/pages/FicheCreation";
import FicheDetail from "@/pages/FicheDetail";
import Admin from "@/pages/Admin";
import Administration from "@/pages/Administration";
import Reports from "@/pages/Reports";
import Contact from "@/pages/Contact";
import Home from "@/pages/Home";
import Fiches from "@/pages/Fiches";
import { AuthProvider, useAuth } from "@/hooks/useAuth.jsx";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Handle authentication redirection for login page only
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && location !== '/login' && location !== '/') {
        setLocation('/login');
      } else if (isAuthenticated && location === '/login') {
        setLocation('/');
      }
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F6F7'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '2rem',
            height: '2rem',
            border: '2px solid #3B4B61',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#6B7280' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Home} />
      {isAuthenticated ? (
        <>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/fiches/new" component={FicheCreation} />
          <Route path="/fiches/:id/edit" component={FicheCreation} />
          <Route path="/fiches/:id" component={FicheDetail} />
          <Route path="/admin" component={Admin} />
          <Route path="/administration" component={Administration} />
          <Route path="/reports" component={Reports} />
          <Route path="/contact" component={Contact} />
          <Route path="/fiches" component={Fiches} />
        </>
      ) : null}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
