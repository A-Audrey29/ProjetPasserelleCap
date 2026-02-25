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
    }
  }, [isOpen, client, setUnreadCount]);

  // Configuration des messages de succès pour chaque type de support
  const supportConfig = {
    fiche: {
      toastDescription: "Votre demande concernant la fiche navette a été créée avec succès.",
      buttonText: "💬 Besoin pour cette fiche navette",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
      requiresFicheId: true
    },
    atelier: {
      toastDescription: "Votre demande concernant les ateliers a été créée avec succès.",
      buttonText: "🛠️ Besoin concernant un atelier",
      buttonColor: "bg-blue-500 hover:bg-blue-600",
      requiresFicheId: false
    },
    tech: {
      toastDescription: "Votre demande de support technique a été créée avec succès.",
      buttonText: "🔧 Support technique",
      buttonColor: "bg-blue-900 hover:bg-blue-950",
      requiresFicheId: false
    },
    autre: {
      toastDescription: "Votre demande a été créée avec succès.",
      buttonText: "❓ Autre demande",
      buttonColor: "bg-blue-700 hover:bg-blue-800",
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
      let ficheId: string | undefined;

      // Pour le type 'fiche', vérifier qu'on est sur une page de fiche navette
      if (config.requiresFicheId) {
        const pathname = window.location.pathname;
        const ficheIdMatch = pathname.match(/^\/fiches\/([a-f0-9-]+)$/);

        if (!ficheIdMatch) {
          toast({
            title: "Action impossible",
            description: "Veuillez aller sur une page de fiche navette.",
            variant: "destructive"
          });
          return;
        }

        ficheId = ficheIdMatch[1];
      }

      // Appeler l'endpoint générique
      const response = await fetch('/api/stream/channels/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type, ficheId })
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

  const panelClass = `chat-side-panel ${isOpen ? 'open' : ''} bg-gray-50 shadow-2xl border-l border-gray-200 flex flex-col`;

  return (
    <div className={panelClass}>
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 flex-shrink-0" style={{ padding: '8px 12px', height: '44px', minHeight: '44px' }}>
        <h2 className="text-base font-semibold text-gray-800 m-0">Messagerie</h2>
        <button
          onClick={() => window.toggleChatGlobal?.()}
          className="p-1 rounded hover:bg-gray-200 transition-colors"
          title="Fermer"
        >
          <X size={18} className="text-gray-600" />
        </button>
      </div>

      {client ? (
        <div className="flex flex-col flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {/* ✅ Boutons d'action - HORS du provider Stream Chat - 100% notre CSS */}
          <div id="chat-quick-actions" className="p-3 border-b border-gray-200 flex flex-col gap-2 flex-shrink-0">
            {/* Titre de la section */}
            <h3 className="text-sm font-medium text-gray-700 mb-1 text-center">
              Comment pouvons nous vous aider ?
            </h3>

            {/* Bouton Fiche navette - bg-blue-600 */}
            <button
              onClick={handleCreateFicheSupport}
              className={`w-full px-4 py-2.5 text-white rounded-md transition-colors text-sm font-medium ${supportConfig.fiche.buttonColor}`}
            >
              💬 Besoin pour cette fiche navette
            </button>

            {/* Bouton Atelier - bg-blue-500 */}
            <button
              onClick={handleCreateAtelierSupport}
              className={`w-full px-4 py-2.5 text-white rounded-md transition-colors text-sm font-medium ${supportConfig.atelier.buttonColor}`}
            >
              🛠️ Besoin concernant un atelier
            </button>

            {/* Bouton Support technique - bg-blue-900 */}
            <button
              onClick={handleCreateTechSupport}
              className={`w-full px-4 py-2.5 text-white rounded-md transition-colors text-sm font-medium ${supportConfig.tech.buttonColor}`}
            >
              🔧 Support technique
            </button>

            {/* Bouton Autre - bg-blue-700 */}
            <button
              onClick={handleCreateAutreSupport}
              className={`w-full px-4 py-2.5 text-white rounded-md transition-colors text-sm font-medium ${supportConfig.autre.buttonColor}`}
            >
              ❓ Autre demande
            </button>
          </div>

          {/* ✅ Zone Stream Chat - AVEC provider <Chat> uniquement autour de la zone de chat */}
          <Chat client={client}>
            <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0, flexDirection: 'row' }}>
            {/* ChannelList */}
            <div className="border-r border-gray-200 overflow-y-auto" style={{ width: '280px', minWidth: '280px' }}>
              <ChannelList
                filters={{
                  type: 'messaging',
                  members: { $in: [client.userID!] }
                }}
                sort={{ last_message_at: -1 }}
                options={{ presence: true, state: true }}
                showChannelSearch
              />
            </div>

            {/* Channel + Messages */}
            <div className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
              <Channel>
                <Window>
                  <ChannelHeader />
                  <MessageList />
                  <div className="relative">
                    <MessageInput />
                    {showSuccess && (
                      <div className="absolute bottom-full left-0 right-0 px-3 py-2 bg-green-100 text-green-800 text-xs text-center border-t border-green-200 animate-fade-in z-10">
                        ✓ Demande enregistrée. Réponse sous 24h (jours ouvrés).
                      </div>
                    )}
                  </div>
                </Window>
              </Channel>
            </div>
          </div>
          </Chat>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
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
