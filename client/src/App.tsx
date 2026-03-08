
// @ts-nocheck
import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState, createContext, useCallback, useMemo } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
import VideoFAQ from "@/pages/VideoFAQ";
import { AuthProvider, useAuth } from "@/hooks/useAuth.jsx";
import { ChatSidePanel } from "@/components/Chat/ChatSidePanel";
import Layout from "@/components/Layout/Layout.jsx";
// import "stream-chat-react/dist/scss/v2/index.scss";

import { Chat } from 'stream-chat-react';
import { useCreateChatClient } from 'stream-chat-react';

// Context pour partager l'état du chat avec le Header
export const ChatContext = createContext({
  isChatOpen: false,
  unreadCount: 0,
  toggleChat: () => {},
  isStreamReady: false,
});

// Composant wrapper pour les routes avec Layout
const withLayout = (Component) => {
  return () => (
    <Layout>
      <Component />
    </Layout>
  );
};

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
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
          <Route path="/video-faq" component={withLayout(VideoFAQ)} />
        </>
      ) : null}
      <Route component={withLayout(NotFound)} />
    </Switch>
  );
}

// Contenu principal SANS le ChatSidePanel (il sera ajouté conditionnellement)
function AppContent() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, isAuthenticated } = useAuth();

  const toggleChat = useCallback(() => {
    setIsChatOpen(prev => !prev);
  }, []);

  useEffect(() => {
    window.toggleChatGlobal = toggleChat;
  }, [toggleChat]);

  // Si pas authentifié, juste le router sans chat
  if (!isAuthenticated || !user || !user.id) {
    return (
      <ChatContext.Provider value={{ isChatOpen: false, unreadCount: 0, toggleChat: () => {}, isStreamReady: false }}>
        <Router />
      </ChatContext.Provider>
    );
  }

  // Authentifié : on rend avec le wrapper Stream
  return (
    <StreamChatClient 
      user={user}
      isChatOpen={isChatOpen}
      setIsChatOpen={setIsChatOpen}
      unreadCount={unreadCount}
      setUnreadCount={setUnreadCount}
      toggleChat={toggleChat}
    />
  );
}

/**
 * Formate le nom d'utilisateur pour le Chat Stream avec fallbacks robustes
 * @param {Object|null|undefined} user - Objet utilisateur
 * @returns {string} Nom formaté ou email ou 'Utilisateur'
 */
function formatChatName(user) {
  // Cas 1: User null/undefined (loading state)
  if (!user) return 'Invité';

  // Cas 2: Construire le nom depuis firstName + lastName
  const name = `${user.firstName || ''} ${user.lastName || ''}`
    .trim()                    // Espaces au début/fin
    .replace(/\s+/g, ' ');     // Espaces multiples → espace unique

  // Cas 3: Si le nom est vide, fallback sur email
  if (name) return name;
  if (user.email) return user.email;

  // Cas 4: Dernier recours - Monitoring alert + fallback défaut
  console.warn('[Chat] User sans nom ni email:', user?.id || 'unknown');
  return 'Utilisateur';
}

// Composant qui gère Stream Chat ET le ChatSidePanel
function StreamChatClient({ user, isChatOpen, setIsChatOpen, unreadCount, setUnreadCount, toggleChat }) {
  
  // ✅ MÉMORISER la fonction tokenProvider pour éviter les re-renders infinis
  const tokenProvider = useCallback(async () => {
    try {
      const response = await fetch('/api/stream/token', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Token HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Runtime guard: vérifier que token existe et est une string non vide
      if (typeof data?.token !== 'string' || data.token.length === 0) {
        console.error('[Chat] Invalid token response:', data);
        throw new Error('Invalid token response from server');
      }

      return data.token;

    } catch (error) {
      // Log pour monitoring + re-throw pour que Stream Chat gère l'erreur
      console.error('[Chat] Token fetch failed:', error);
      throw error;  // Stream Chat va utiliser son mécanisme de retry
    }
  }, []); // Pas de dépendances = créé une seule fois

  // ✅ MÉMORISER userData pour éviter les re-renders infinis
  const userData = useMemo(() => ({
    id: user.id,
    name: formatChatName(user),
    email: user.email,
    image: user.avatar || undefined,
  }), [user.id, user.firstName, user.lastName, user.email, user.avatar]);

  const client = useCreateChatClient({
    apiKey: import.meta.env.VITE_STREAM_API_KEY,
    tokenOrProvider: tokenProvider,
    userData: userData,
  });

  // Client pas encore prêt
  if (!client) {
    return (
      <ChatContext.Provider value={{ isChatOpen, unreadCount, toggleChat, isStreamReady: false }}>
        <Router />
      </ChatContext.Provider>
    );
  }

  // Client prêt : ChatSidePanel DANS le provider <Chat> pour avoir accès au client
  return (
    <ChatContext.Provider value={{ isChatOpen, unreadCount, toggleChat, isStreamReady: true }}>
      <Chat client={client}>
        <Router />
        <ChatSidePanel isOpen={isChatOpen} setUnreadCount={setUnreadCount} />
      </Chat>
    </ChatContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
