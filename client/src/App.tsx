
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
import { AuthProvider, useAuth } from "@/hooks/useAuth.jsx";
import { ChatSidePanel } from "@/components/Chat/ChatSidePanel";
import Layout from "@/components/Layout/Layout.jsx";
import "stream-chat-react/dist/scss/v2/index.scss";

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

// Composant qui gère Stream Chat ET le ChatSidePanel
function StreamChatClient({ user, isChatOpen, setIsChatOpen, unreadCount, setUnreadCount, toggleChat }) {
  
  // ✅ MÉMORISER la fonction tokenProvider pour éviter les re-renders infinis
  const tokenProvider = useCallback(async () => {
    const response = await fetch('/api/stream/token', {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Token error');
    const { token } = await response.json();
    return token;
  }, []); // Pas de dépendances = créé une seule fois

  // ✅ MÉMORISER userData pour éviter les re-renders infinis
  const userData = useMemo(() => ({
    id: user.id,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
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


// // @ts-nocheck
// import { Switch, Route, useLocation } from "wouter";
// import { useEffect, useState, createContext } from "react";
// import { queryClient } from "./lib/queryClient";
// import { QueryClientProvider } from "@tanstack/react-query";
// // Removed Toaster and TooltipProvider - no longer needed without Tailwind UI
// import NotFound from "@/pages/not-found";
// import Login from "@/pages/Login";
// import Dashboard from "@/pages/Dashboard";
// import FicheCreation from "@/pages/FicheCreation";
// import FicheDetail from "@/pages/FicheDetail";
// import Admin from "@/pages/Admin";
// import Administration from "@/pages/Administration";
// import Reports from "@/pages/Reports";
// import Contact from "@/pages/Contact";
// import Home from "@/pages/Home";
// import Fiches from "@/pages/Fiches";
// import Ateliers from "@/pages/Ateliers.jsx";
// import MentionsLegales from "@/pages/MentionsLegales";
// import PolitiqueConfidentialite from "@/pages/PolitiqueConfidentialite";
// import { AuthProvider, useAuth } from "@/hooks/useAuth.jsx";
// import { ChatSidePanel } from "@/components/Chat/ChatSidePanel";
// import Layout from "@/components/Layout/Layout.jsx";
// import "stream-chat-react/dist/scss/v2/index.scss"

// import { Chat } from 'stream-chat-react';
// import { useCreateChatClient } from 'stream-chat-react';
// import { useAuth } from './hooks/useAuth';
// import { ChatSidePanel } from './components/ChatSidePanel';
// import { createContext, useState, useEffect } from 'react';

// export const ChatContext = createContext<{
//   isChatOpen: boolean;
//   unreadCount: number;
//   toggleChat: () => void;
// }>({
//   isChatOpen: false,
//   unreadCount: 0,
//   toggleChat: () => {},
// });

// // Composants wrapper pour les routes avec Layout
// const withLayout = (Component) => {
//   return () => (
//     <Layout>
//       <Component />
//     </Layout>
//   );
// };

// // Context pour partager l'état du chat avec le Header
// export const ChatContext = createContext<{
//   isChatOpen: boolean;
//   unreadCount: number;
//   toggleChat: () => void;
// }>({
//   isChatOpen: false,
//   unreadCount: 0,
//   toggleChat: () => {},
// });

// function Router() {
//   const { isAuthenticated, isLoading } = useAuth();
//   const [location, setLocation] = useLocation();

//   // Handle authentication redirection for login page only
//   useEffect(() => {
//     if (!isLoading) {
//       // Allow public access to legal pages
//       const publicPaths = ['/login', '/', '/mentions-legales', '/politique-confidentialite'];
//       const isPublicPath = publicPaths.includes(location);

//       if (!isAuthenticated && !isPublicPath) {
//         setLocation('/login');
//       } else if (isAuthenticated && location === '/login') {
//         setLocation('/');
//       }
//     }
//   }, [isAuthenticated, isLoading, location, setLocation]);

//   if (isLoading) {
//     return (
//       <div style={{
//         minHeight: '100vh',
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'center',
//         backgroundColor: '#F5F6F7'
//       }}>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{
//             width: '2rem',
//             height: '2rem',
//             border: '2px solid #3B4B61',
//             borderTop: '2px solid transparent',
//             borderRadius: '50%',
//             animation: 'spin 1s linear infinite',
//             margin: '0 auto 1rem'
//           }}></div>
//           <p style={{ color: '#6B7280' }}>Chargement...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <Switch>
//       <Route path="/login" component={withLayout(Login)} />
//       <Route path="/" component={withLayout(Home)} />
//       <Route path="/mentions-legales" component={withLayout(MentionsLegales)} />
//       <Route path="/politique-confidentialite" component={withLayout(PolitiqueConfidentialite)} />
//       {isAuthenticated ? (
//         <>
//           <Route path="/dashboard" component={withLayout(Dashboard)} />
//           <Route path="/fiches/new" component={withLayout(FicheCreation)} />
//           <Route path="/fiches/:id/edit" component={withLayout(FicheCreation)} />
//           <Route path="/fiches/:id" component={withLayout(FicheDetail)} />
//           <Route path="/admin" component={withLayout(Admin)} />
//           <Route path="/administration" component={withLayout(Administration)} />
//           <Route path="/reports" component={withLayout(Reports)} />
//           <Route path="/contact" component={withLayout(Contact)} />
//           <Route path="/fiches" component={withLayout(Fiches)} />
//           <Route path="/ateliers" component={withLayout(Ateliers)} />
//         </>
//       ) : null}
//       <Route component={withLayout(NotFound)} />
//     </Switch>
//   );
// }

// // function App() {
// //   const [isChatOpen, setIsChatOpen] = useState(false);
// //   const [unreadCount, setUnreadCount] = useState(0);

// //   const toggleChat = () => {
// //     setIsChatOpen(prev => !prev);
// //   };

// //   // Attacher la fonction globale au chargement
// //   useEffect(() => {
// //     window.toggleChatGlobal = toggleChat;
// //   }, [toggleChat]);

// //   return (
// //     <QueryClientProvider client={queryClient}>
// //       <AuthProvider>
// //         <ChatContext.Provider value={{ isChatOpen, unreadCount, toggleChat }}>
// //           <Router />
// //           <ChatSidePanel isOpen={isChatOpen} setUnreadCount={setUnreadCount} />
// //         </ChatContext.Provider>
// //       </AuthProvider>
// //     </QueryClientProvider>
// //   );
// // }

// // export default App;




// function AppContent() {
//   const [isChatOpen, setIsChatOpen] = useState(false);
//   const [unreadCount, setUnreadCount] = useState(0);

//   const toggleChat = () => setIsChatOpen(prev => !prev);

//   useEffect(() => {
//     window.toggleChatGlobal = toggleChat;
//   }, [toggleChat]);

//   return (
//     <ChatContext.Provider value={{ isChatOpen, unreadCount, toggleChat }}>
//       <Router />
//       <ChatSidePanel isOpen={isChatOpen} setUnreadCount={setUnreadCount} />
//     </ChatContext.Provider>
//   );
// }

// function App() {
//   const { user } = useAuth();

//   // ✅ SEUL ENDROIT où useCreateChatClient est appelé
//   const client = useCreateChatClient({
//     apiKey: import.meta.env.VITE_STREAM_API_KEY,
//     tokenOrProvider: async () => {
//       if (!user) throw new Error('User not authenticated');
      
//       const response = await fetch('/api/stream/token', {
//         method: 'POST',
//         credentials: 'include'
//       });

//       if (!response.ok) throw new Error("Token error");
//       const { token } = await response.json();
//       return token;
//     },
//     userData: user ? {
//       id: user.id,
//       name: `${user.firstName} ${user.lastName}`,
//       email: user.email,
//       image: user.avatar || undefined,
//     } : undefined,
//   });

//   if (!client) return <div>Loading...</div>;

//   return (
//     <Chat client={client}>
//       <QueryClientProvider client={queryClient}>
//         <AuthProvider>
//           <AppContent />
//         </AuthProvider>
//       </QueryClientProvider>
//     </Chat>
//   );
// }

// export default App;
