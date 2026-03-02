import { Chat, ChannelList, Channel, Window, ChannelHeader, MessageList, MessageInput, useChatContext } from 'stream-chat-react';
import { X } from 'lucide-react';
import { useState, useEffect, useContext } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ChatContext } from '@/App';

interface ChatSidePanelProps {
  isOpen: boolean;
  setUnreadCount: (count: number) => void;
  onClose?: () => void;
}

export function ChatSidePanel({ isOpen, setUnreadCount }: ChatSidePanelProps) {
  const { client } = useChatContext();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showChannels, setShowChannels] = useState(false);
  type ChatViewState = 'menu' | 'chat';
  const [chatViewState, setChatViewState] = useState<ChatViewState>('menu');
  const { toast } = useToast();
  const { toggleChat } = useContext(ChatContext);

  // ✅ Écouter les nouveaux messages
  useEffect(() => {
    if (!client) return;

    const handleNewMessage = (event: any) => {
      if (event.message?.user?.id === client.userID) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 4000);
      }
    };

    client.on('message.new', handleNewMessage);
    return () => client.off('message.new', handleNewMessage);
  }, [client]);

  // ✅ Gérer les non-lus
  useEffect(() => {
    if (!client) return;

    const updateUnreadCount = () => {
      const unread = client.user?.unread_count || 0;
      setUnreadCount(unread);
    };

    updateUnreadCount();

    const handleNotification = (event: any) => {
      setUnreadCount(prev => prev + 1);
    };

    client.on('notification.message_new', handleNotification);
    return () => client.off('notification.message_new', handleNotification);
  }, [client, setUnreadCount]);

  // ✅ Réinitialiser les non-lus à l'ouverture
  useEffect(() => {
    if (isOpen && client) {
      setUnreadCount(0);
      setChatViewState('menu');
    }
  }, [isOpen, client, setUnreadCount]);

  // Configuration des messages de succès pour chaque type de support
  const supportConfig = {
    fiche: {
      toastDescription: "Votre demande a été créée. Un membre de l'équipe vous répondra sous 24h (jours ouvrés).",
      buttonText: "💬 J'ai besoin d'aide pour une fiche navette",
      buttonColor: "#2563eb", // Blue 600
      buttonHoverColor: "#1d4ed8", // Blue 700
      requiresFicheId: false
    },
    atelier: {
      toastDescription: "Votre demande a été créée. Un membre de l'équipe vous répondra sous 24h (jours ouvrés).",
      buttonText: "🛠️ J'ai besoin d'aide pour un atelier",
      buttonColor: "#3b82f6", // Blue 500
      buttonHoverColor: "#2563eb", // Blue 600
      requiresFicheId: false
    },
    tech: {
      toastDescription: "Votre demande a été créée. Un membre de l'équipe vous répondra sous 24h (jours ouvrés).",
      buttonText: "🔧 J'ai un problème technique",
      buttonColor: "#1e3a8a", // Blue 900
      buttonHoverColor: "#172554", // Blue 950
      requiresFicheId: false
    },
    autre: {
      toastDescription: "Votre demande a été créée. Un membre de l'équipe vous répondra sous 24h (jours ouvrés).",
      buttonText: "❓ J'ai une autre demande",
      buttonColor: "#1d4ed8", // Blue 700
      buttonHoverColor: "#1e40af", // Blue 800
      requiresFicheId: false
    }
  };

  type SupportType = keyof typeof supportConfig;

  const handleCreateSupport = async (type: SupportType) => {
    if (!client?.userID) {
      toast({
        title: "Erreur",
        description: "Chat non connecté",
        variant: "destructive"
      });
      return;
    }

    const config = supportConfig[type];

    try {
      // Appeler l'endpoint générique (sans vérification de contexte)
      const response = await fetch('/api/stream/channels/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }

      const data = await response.json();

      // Attendre que le channel soit initialisé
      const channel = client.channel('messaging', data.channelId);
      await channel.watch();

      toast({
        title: "Discussion créée",
        description: config.toastDescription,
      });

      setChatViewState('chat');
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer la discussion.",
        variant: "destructive"
      });
    }
  };

  const handleCreateFicheSupport = () => handleCreateSupport('fiche');
  const handleCreateAtelierSupport = () => handleCreateSupport('atelier');
  const handleCreateTechSupport = () => handleCreateSupport('tech');
  const handleCreateAutreSupport = () => handleCreateSupport('autre');

  const handleShowMyRequests = () => {
    if (!client?.userID) {
      toast({
        title: "Erreur",
        description: "Chat non connecté",
        variant: "destructive"
      });
      return;
    }

    setChatViewState('chat');
  };

  const panelClass = `chat-side-panel ${isOpen ? 'open' : ''}`;

  return (
    <div className={panelClass}>
      {client ? (
        <>
          {/* ✅ Header visible dans tous les cas */}
          <div className="chat-header-section">
            <button
              className="chat-channels-toggle-button"
              onClick={() => {
                setChatViewState('chat');
                setShowChannels(true);
              }}
              style={{
                padding: '6px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                border: 'none',
                background: showChannels ? '#3b82f6' : 'transparent',
                color: showChannels ? '#ffffff' : '#4b5563',
                fontSize: '13px',
                fontWeight: '500'
              }}
              title="Mes demandes"
            >
              Mes demandes
            </button>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginLeft: 'auto' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: 0 }}>Messagerie</h2>
              <button
                onClick={() => window.toggleChatGlobal?.()}
                style={{ padding: '4px', borderRadius: '4px', cursor: 'pointer', transition: 'background-color 0.2s', border: 'none', background: 'transparent' }}
                title="Fermer"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={18} style={{ color: '#4b5563' }} />
              </button>
            </div>
          </div>

          {/* ✅ Colonne GAUCHE : Boutons (largeur fixe 300px) */}
          <div className={`chat-left-column ${chatViewState === 'chat' ? 'chat-left-column-hidden' : ''}`}>
            {/* Boutons d'action */}
            <div className="chat-buttons-section">
              <h3 className="chat-support-title">
                Comment pouvons nous vous aider ?
              </h3>

              {/* Bouton Fiche navette - bg-blue-600 */}
              <button
                onClick={handleCreateFicheSupport}
                className="chat-support-button"
                style={{ backgroundColor: supportConfig.fiche.buttonColor }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = supportConfig.fiche.buttonHoverColor}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = supportConfig.fiche.buttonColor}
              >
                💬 J'ai besoin d'aide pour une fiche navette
              </button>

              {/* Bouton Atelier - bg-blue-500 */}
              <button
                onClick={handleCreateAtelierSupport}
                className="chat-support-button"
                style={{ backgroundColor: supportConfig.atelier.buttonColor }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = supportConfig.atelier.buttonHoverColor}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = supportConfig.atelier.buttonColor}
              >
                🛠️ J'ai besoin d'aide pour un atelier
              </button>

              {/* Bouton Support technique - bg-blue-900 */}
              <button
                onClick={handleCreateTechSupport}
                className="chat-support-button"
                style={{ backgroundColor: supportConfig.tech.buttonColor }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = supportConfig.tech.buttonHoverColor}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = supportConfig.tech.buttonColor}
              >
                🔧 J'ai un problème technique
              </button>

              {/* Bouton Autre - bg-blue-700 */}
              <button
                onClick={handleCreateAutreSupport}
                className="chat-support-button"
                style={{ backgroundColor: supportConfig.autre.buttonColor }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = supportConfig.autre.buttonHoverColor}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = supportConfig.autre.buttonColor}
              >
                ❓ J'ai une autre demande
              </button>
            </div>
          </div>

          {/* ✅ Colonne DROITE : Zone Stream Chat */}
          <Chat client={client}>
            <div className={`chat-right-column ${chatViewState === 'menu' ? 'chat-right-column-hidden' : ''} ${showChannels ? 'show-channels-overlay' : ''}`}>
              {/* ChannelList */}
              <div className={`chat-channel-list ${showChannels ? 'chat-channel-list-open' : ''}`}>
                <div className="chat-channels-overlay-header" style={{ display: 'none' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', margin: 0, flex: 1 }}>Conversations</h3>
                  <button
                    onClick={() => setShowChannels(false)}
                    style={{
                      padding: '4px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      border: 'none',
                      background: 'transparent'
                    }}
                    title="Fermer"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <X size={16} style={{ color: '#4b5563' }} />
                  </button>
                </div>
                <ChannelList
                  filters={{
                    type: 'messaging',
                    members: { $in: [client.userID!] }
                  }}
                  sort={{ last_message_at: -1 }}
                  options={{ presence: true, state: true }}
                  showChannelSearch
                  EmptyStateIndicator={() => (
                    <div className="chat-empty-state">
                      <div className="chat-empty-state-emoji">💬</div>
                      <h3 className="chat-empty-state-title">Aucune demande en cours</h3>
                      <p className="chat-empty-state-text">Vous n'avez pas encore de conversation avec le support.</p>

                      <div className="chat-empty-state-instructions">
                        <div className="chat-empty-state-instructions-title">
                          <span>💡</span>
                          Pour créer une demande :
                        </div>
                        <ol className="chat-empty-state-instructions-list">
                          <li className="chat-empty-state-list-item">
                            <strong>Fermez cette fenêtre</strong> en cliquant sur
                            <span className="chat-empty-state-close-icon">✕</span>
                            en haut à droite
                          </li>
                          <li className="chat-empty-state-list-item">
                            Cliquez sur <strong>💬 Messagerie</strong> dans le header
                          </li>
                          <li className="chat-empty-state-list-item">
                            Choisissez le type d'aide dont vous avez besoin
                          </li>
                        </ol>
                      </div>

                      <p className="chat-empty-state-note">ℹ️ Un membre de l'équipe CAP vous répondra sous 24h (jours ouvrés)</p>
                    </div>
                  )}
                />
              </div>

              {/* Channel + Messages */}
              <div className="chat-messages-area">
                <Channel>
                  <Window>
                    <ChannelHeader />
                    <MessageList />
                    <div style={{ position: 'relative' }}>
                      <MessageInput />
                      {showSuccess && (
                        <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, padding: '8px 12px', backgroundColor: '#dcfce7', color: '#166534', fontSize: '12px', textAlign: 'center', borderTop: '1px solid #86efac', animation: 'fadeIn 0.3s ease', zIndex: 10 }}>
                          ✓ Demande enregistrée. Réponse sous 24h (jours ouvrés).
                        </div>
                      )}
                    </div>
                  </Window>
                </Channel>
              </div>
            </div>
          </Chat>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
          <div style={{ animation: 'spin 1s linear infinite', borderRadius: '50%', height: '32px', width: '32px', borderBottom: '2px solid #111827' }}></div>
        </div>
      )}

      {/* ✅ ANCIEN CODE (commenté pour rollback facile)
      {client ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div id="chat-quick-actions" className="p-3 border-b border-gray-200 flex flex-col gap-2 flex-shrink-0" style={{ width: '100%' }}>
            <button onClick={handleCreateFicheSupport} className="px-4 py-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium" style={{ width: '100%' }}>
              💬 Besoin pour cette fiche navette
            </button>
            <button onClick={handleCreateTechSupport} className="px-4 py-2.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm font-medium" style={{ width: '100%' }}>
              🔧 Support technique
            </button>
          </div>
          <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>
            <div className="border-r border-gray-200 overflow-y-auto" style={{ width: '200px', minWidth: '200px' }}>
              <ChannelList filters={{ type: 'messaging', members: { $in: [client.userID!] } }} sort={{ last_message_at: -1 }} options={{ presence: true, state: true }} showChannelSearch />
            </div>
            <div className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
              <Channel><Window><ChannelHeader /><MessageList /><div className="relative"><MessageInput />{showSuccess && (<div className="absolute bottom-full left-0 right-0 px-3 py-2 bg-green-100 text-green-800 text-xs text-center border-t border-green-200 animate-fade-in z-10">✓ Demande enregistrée. Réponse sous 24h (jours ouvrés).</div>)}</div></Window></Channel>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>
      )}
      */}
    </div>
  );
}




// import { Chat, ChannelList, Channel, Window, ChannelHeader, MessageList, MessageInput } from 'stream-chat-react';
// import { X } from 'lucide-react';
// import { useStream } from '@/hooks/useStream';
// import { useState, useEffect, useContext } from 'react';
// import { useToast } from '@/hooks/use-toast';
// import { ChatContext } from '@/App';


// interface ChatSidePanelProps {
//   isOpen: boolean;
//   setUnreadCount: (count: number) => void;
//   onClose?: () => void;
// }

// export function ChatSidePanel({ isOpen, setUnreadCount }: ChatSidePanelProps) {
//   const { client, isConnected } = useStream();
//   const [showSuccess, setShowSuccess] = useState(false);
//   const { toast } = useToast();
//   const { toggleChat } = useContext(ChatContext);

//   useEffect(() => {
//     if (!isConnected || !client) return;

//     const handleSendMessage = (event) => {
//       if (event.message?.user?.id === client.userID) {
//         setShowSuccess(true);
//         setTimeout(() => setShowSuccess(false), 4000);
//       }
//     };

//     client.on('message.new', handleSendMessage);

//     return () => {
//       client.off('message.new', handleSendMessage);
//     };
//   }, [client, isConnected]);

//   // Gérer le compteur de messages non lus
//   useEffect(() => {
//     if (!isConnected || !client) return;

//     // Initialiser le compteur avec les non lus actuels
//     const initializeUnreadCount = () => {
//       const unread = client.user?.unread_count || 0;
//       setUnreadCount(unread);
//     };

//     initializeUnreadCount();

//     const handleNewMessage = (event) => {
//       setUnreadCount(prev => prev + 1);
//     };

//     // S'abonner aux événements de notification
//     client.on('notification.message_new', handleNewMessage);

//     // Cleanup
//     return () => {
//       client.off('notification.message_new', handleNewMessage);
//     };
//   }, [isConnected, client, setUnreadCount]);

//   // Réinitialiser le compteur quand l'utilisateur ouvre le chat
//   useEffect(() => {
//     if (isOpen && client?.user?.unread_count !== undefined) {
//       setUnreadCount(0);
//     }
//   }, [isOpen, client, setUnreadCount]);

//   const handleCreateFicheSupport = async () => {
//     if (!client) {
//       toast({
//         title: "Erreur",
//         description: "Chat non connecté",
//         variant: "destructive"
//       });
//       return;
//     }

//     try {
//       const pathname = window.location.pathname;
//       const ficheIdMatch = pathname.match(/^\/fiches\/([a-f0-9-]+)$/);

//       if (!ficheIdMatch) {
//         toast({
//           title: "Action impossible",
//           description: "Veuillez aller sur une page de fiche navette pour créer une discussion.",
//           variant: "destructive"
//         });
//         return;
//       }

//       const ficheId = ficheIdMatch[1];

//       const response = await fetch('/api/stream/channels/fiche', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         credentials: 'include',
//         body: JSON.stringify({ ficheId })
//       });

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
//         throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
//       }

//       const data = await response.json();
//       const ficheRef = data.channelName ? data.channelName.replace('Support ', '') : '';

//       const channel = client.channel('messaging', data.channelId);
//       await channel.watch();

//       if (ficheRef) {
//         await channel.sendMessage({
//           text: `Bonjour, j'ai besoin d'aide pour la fiche ${ficheRef}.`,
//           user_id: client.userID
//         });
//       }

//       toast({
//         title: "Discussion créée",
//         description: "Votre discussion a été créée avec succès.",
//       });
//     } catch (error) {
//       toast({
//         title: "Erreur",
//         description: error.message || "Impossible de créer la discussion.",
//         variant: "destructive"
//       });
//     }
//   };

//   const handleCreateTechSupport = async () => {
//     if (!client) {
//       toast({
//         title: "Erreur",
//         description: "Chat non connecté",
//         variant: "destructive"
//       });
//       return;
//     }

//     try {
//       const response = await fetch('/api/stream/channels/tech', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         credentials: 'include'
//       });

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
//         throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
//       }

//       const data = await response.json();

//       const channel = client.channel('messaging', data.channelId);
//       await channel.watch();

//       await channel.sendMessage({
//         text: `Bonjour, j'ai un problème technique.`,
//         user_id: client.userID
//       });

//       toast({
//         title: "Discussion créée",
//         description: "Votre demande de support technique a été envoyée.",
//       });
//     } catch (error) {
//       toast({
//         title: "Erreur",
//         description: error.message || "Impossible de créer la discussion.",
//         variant: "destructive"
//       });
//     }
//   };

//   const panelClass = `chat-side-panel ${isOpen ? 'open' : ''} fixed top-0 bottom-0 right-0 z-[99999] bg-gray-50 shadow-2xl border-l border-gray-200 flex flex-col transition-transform duration-300 ease-in-out w-full max-w-[800px]`;

//   return (
//     <div className={panelClass}>
//       {/* Header */}
//       <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
//         <h2 className="text-lg font-semibold text-gray-800 m-0">Messagerie</h2>
//         <button
//           onClick={() => window.toggleChatGlobal()}
//           className="p-1 rounded hover:bg-gray-200 transition-colors"
//           title="Fermer"
//         >
//           <X size={20} className="text-gray-600" />
//         </button>
//       </div>

//       {/* Stream Chat Content */}
//       {isConnected ? (
//         <Chat client={client}>
//           {(() => {
//             const filters = { type: 'messaging', members: { $in: [client.userID!].filter(Boolean) } };
//             return (
//               <div className="flex flex-col flex-1 overflow-hidden" style={{ height: 'calc(100vh - 60px)' }}>
//                 {/* Quick Action Buttons */}
//                 <div className="p-3 border-b border-gray-200 flex flex-col gap-2 flex-shrink-0">
//                   <button
//                     onClick={handleCreateFicheSupport}
//                     className="px-4 py-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-2"
//                   >
//                     💬 Besoin pour cette fiche navette
//                   </button>
//                   <button
//                     onClick={handleCreateTechSupport}
//                     className="px-4 py-2.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-2"
//                   >
//                     🔧 Support technique
//                   </button>
//                 </div>

//                 {/* Main Content: Channels + Chat */}
//                 <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>
//                   {/* Channel List */}
//                   <div className="w-[300px] min-w-[300px] border-r border-gray-200 overflow-y-auto">
//                     <ChannelList filters={filters} showChannelSearch />
//                   </div>

//                   {/* Chat Area */}
//                   <div className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
//                     <Channel>
//                       <Window>
//                         <ChannelHeader />
//                         <MessageList />
//                         <div className="relative">
//                           <MessageInput />
//                           {showSuccess && (
//                             <div className="absolute bottom-full left-0 right-0 px-3 py-2 bg-green-100 text-green-800 text-xs text-center border-t border-green-200 animate-fade-in z-10">
//                               ✓ Votre demande a bien été enregistrée. Le support vous répondra sous 24h (jours ouvrés).
//                             </div>
//                           )}
//                         </div>
//                       </Window>
//                     </Channel>
//                   </div>
//                 </div>
//               </div>
//             );
//           })()}
//         </Chat>
//       ) : (
//         <div className="flex-1 flex items-center justify-center bg-gray-50">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
//         </div>
//       )}
//     </div>
//   );
// }
