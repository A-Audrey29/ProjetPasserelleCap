// @ts-nocheck
import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState, createContext } from "react";
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
import Ateliers from "@/pages/Ateliers.jsx";
import MentionsLegales from "@/pages/MentionsLegales";
import PolitiqueConfidentialite from "@/pages/PolitiqueConfidentialite";
import { AuthProvider, useAuth } from "@/hooks/useAuth.jsx";
import { ChatSidePanel } from "@/components/Chat/ChatSidePanel";
import Layout from "@/components/Layout/Layout.jsx";
import "stream-chat-react/dist/scss/v2/index.scss"

// Composants wrapper pour les routes avec Layout
const withLayout = (Component) => {
  return () => (
    <Layout>
      <Component />
    </Layout>
  );
};

// Context pour partager l'état du chat avec le Header
export const ChatContext = createContext<{
  isChatOpen: boolean;
  unreadCount: number;
  toggleChat: () => void;
}>({
  isChatOpen: false,
  unreadCount: 0,
  toggleChat: () => {},
});

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Handle authentication redirection for login page only
  useEffect(() => {
    if (!isLoading) {
      // Allow public access to legal pages
      const publicPaths = ['/login', '/', '/mentions-legales', '/politique-confidentialite'];
      const isPublicPath = publicPaths.includes(location);

      if (!isAuthenticated && !isPublicPath) {
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
      <Route path="/login" component={withLayout(Login)} />
      <Route path="/" component={withLayout(Home)} />
      <Route path="/mentions-legales" component={withLayout(MentionsLegales)} />
      <Route path="/politique-confidentialite" component={withLayout(PolitiqueConfidentialite)} />
      {isAuthenticated ? (
        <>
          <Route path="/dashboard" component={withLayout(Dashboard)} />
          <Route path="/fiches/new" component={withLayout(FicheCreation)} />
          <Route path="/fiches/:id/edit" component={withLayout(FicheCreation)} />
          <Route path="/fiches/:id" component={withLayout(FicheDetail)} />
          <Route path="/admin" component={withLayout(Admin)} />
          <Route path="/administration" component={withLayout(Administration)} />
          <Route path="/reports" component={withLayout(Reports)} />
          <Route path="/contact" component={withLayout(Contact)} />
          <Route path="/fiches" component={withLayout(Fiches)} />
          <Route path="/ateliers" component={withLayout(Ateliers)} />
        </>
      ) : null}
      <Route component={withLayout(NotFound)} />
    </Switch>
  );
}

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const toggleChat = () => {
    setIsChatOpen(prev => !prev);
  };

  // Attacher la fonction globale au chargement
  useEffect(() => {
    window.toggleChatGlobal = toggleChat;
  }, [toggleChat]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ChatContext.Provider value={{ isChatOpen, unreadCount, toggleChat }}>
          <Router />
          <ChatSidePanel isOpen={isChatOpen} setUnreadCount={setUnreadCount} />
        </ChatContext.Provider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
