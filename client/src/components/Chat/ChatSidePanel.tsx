import { Chat, ChannelList, Channel, Window, ChannelHeader, MessageList, MessageInput } from 'stream-chat-react';
import { X } from 'lucide-react';
import { useStream } from '@/hooks/useStream';
import { useState, useEffect, useContext } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ChatContext } from '@/App';

interface ChatSidePanelProps {
  isOpen: boolean;
  setUnreadCount: (count: number) => void;
  onClose?: () => void;
}

export function ChatSidePanel({ isOpen, setUnreadCount }: ChatSidePanelProps) {
  const { client, isConnected } = useStream();
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();
  const { toggleChat } = useContext(ChatContext);

  useEffect(() => {
    if (!isConnected || !client) return;

    const handleSendMessage = (event) => {
      if (event.message?.user?.id === client.userID) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 4000);
      }
    };

    client.on('message.new', handleSendMessage);

    return () => {
      client.off('message.new', handleSendMessage);
    };
  }, [client, isConnected]);

  // Gérer le compteur de messages non lus
  useEffect(() => {
    if (!isConnected || !client) return;

    // Initialiser le compteur avec les non lus actuels
    const initializeUnreadCount = () => {
      const unread = client.user?.unread_count || 0;
      setUnreadCount(unread);
    };

    initializeUnreadCount();

    const handleNewMessage = (event) => {
      setUnreadCount(prev => prev + 1);
    };

    // S'abonner aux événements de notification
    client.on('notification.message_new', handleNewMessage);

    // Cleanup
    return () => {
      client.off('notification.message_new', handleNewMessage);
    };
  }, [isConnected, client, setUnreadCount]);

  // Réinitialiser le compteur quand l'utilisateur ouvre le chat
  useEffect(() => {
    if (isOpen && client?.user?.unread_count !== undefined) {
      setUnreadCount(0);
    }
  }, [isOpen, client, setUnreadCount]);

  const handleCreateFicheSupport = async () => {
    if (!client) {
      toast({
        title: "Erreur",
        description: "Chat non connecté",
        variant: "destructive"
      });
      return;
    }

    try {
      const pathname = window.location.pathname;
      const ficheIdMatch = pathname.match(/^\/fiches\/([a-f0-9-]+)$/);

      if (!ficheIdMatch) {
        toast({
          title: "Action impossible",
          description: "Veuillez aller sur une page de fiche navette pour créer une discussion.",
          variant: "destructive"
        });
        return;
      }

      const ficheId = ficheIdMatch[1];

      const response = await fetch('/api/stream/channels/fiche', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ficheId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const ficheRef = data.channelName ? data.channelName.replace('Support ', '') : '';

      const channel = client.channel('messaging', data.channelId);
      await channel.watch();

      if (ficheRef) {
        await channel.sendMessage({
          text: `Bonjour, j'ai besoin d'aide pour la fiche ${ficheRef}.`,
          user_id: client.userID
        });
      }

      toast({
        title: "Discussion créée",
        description: "Votre discussion a été créée avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la discussion.",
        variant: "destructive"
      });
    }
  };

  const handleCreateTechSupport = async () => {
    if (!client) {
      toast({
        title: "Erreur",
        description: "Chat non connecté",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/stream/channels/tech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const channel = client.channel('messaging', data.channelId);
      await channel.watch();

      await channel.sendMessage({
        text: `Bonjour, j'ai un problème technique.`,
        user_id: client.userID
      });

      toast({
        title: "Discussion créée",
        description: "Votre demande de support technique a été envoyée.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la discussion.",
        variant: "destructive"
      });
    }
  };

  const panelClass = `chat-side-panel ${isOpen ? 'open' : ''} fixed top-0 bottom-0 right-0 z-[99999] bg-gray-50 shadow-2xl border-l border-gray-200 flex flex-col transition-transform duration-300 ease-in-out w-full max-w-[800px]`;

  return (
    <div className={panelClass}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-800 m-0">Messagerie</h2>
        <button
          onClick={() => window.toggleChatGlobal()}
          className="p-1 rounded hover:bg-gray-200 transition-colors"
          title="Fermer"
        >
          <X size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Stream Chat Content */}
      {isConnected ? (
        <Chat client={client}>
          {(() => {
            const filters = { type: 'messaging', members: { $in: [client.userID!].filter(Boolean) } };
            return (
              <div className="flex flex-col flex-1 overflow-hidden" style={{ height: 'calc(100vh - 60px)' }}>
                {/* Quick Action Buttons */}
                <div className="p-3 border-b border-gray-200 flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={handleCreateFicheSupport}
                    className="px-4 py-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    💬 Besoin pour cette fiche navette
                  </button>
                  <button
                    onClick={handleCreateTechSupport}
                    className="px-4 py-2.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    🔧 Support technique
                  </button>
                </div>

                {/* Main Content: Channels + Chat */}
                <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>
                  {/* Channel List */}
                  <div className="w-[300px] min-w-[300px] border-r border-gray-200 overflow-y-auto">
                    <ChannelList filters={filters} showChannelSearch />
                  </div>

                  {/* Chat Area */}
                  <div className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
                    <Channel>
                      <Window>
                        <ChannelHeader />
                        <MessageList />
                        <div className="relative">
                          <MessageInput />
                          {showSuccess && (
                            <div className="absolute bottom-full left-0 right-0 px-3 py-2 bg-green-100 text-green-800 text-xs text-center border-t border-green-200 animate-fade-in z-10">
                              ✓ Votre demande a bien été enregistrée. Le support vous répondra sous 24h (jours ouvrés).
                            </div>
                          )}
                        </div>
                      </Window>
                    </Channel>
                  </div>
                </div>
              </div>
            );
          })()}
        </Chat>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
    </div>
  );
}
