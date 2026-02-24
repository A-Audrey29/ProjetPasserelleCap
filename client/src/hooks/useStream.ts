import { useEffect, useState } from 'react';
import { StreamChat } from 'stream-chat';
import { useAuth } from './useAuth';

const streamClient = StreamChat.getInstance(import.meta.env.VITE_STREAM_API_KEY);

export function useStream() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      streamClient.disconnectUser().catch(console.error);
      setIsConnected(false);
      return;
    }

    // Protection Hot Reload (Empêche les crashes Vite)
    if (streamClient.userID === user.id) {
      setIsConnected(true);
      return;
    }

    const connect = async () => {
      try {
        const response = await fetch('/api/stream/token', {
          method: 'POST',
          credentials: 'include'
        });

        if (!response.ok) throw new Error("Erreur récupération token");

        const { token } = await response.json();

        await streamClient.connectUser(
          {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            image: user.avatar || undefined,
          },
          token
        );

        setIsConnected(true);
      } catch (e) {
        console.error("Erreur connexion Stream:", e);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      streamClient.disconnectUser().catch(console.error);
      setIsConnected(false);
    };
  }, [user?.id]);

  return {
    client: streamClient,
    isConnected
  };
}
