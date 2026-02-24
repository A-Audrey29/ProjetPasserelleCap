import { StreamChat } from 'stream-chat';
import { db } from '../db';
import { ficheNavettes, users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { storage } from '../storage';

// Type pour le client Stream (correct pour stream-chat v9+)
type StreamClient = ReturnType<typeof StreamChat.prototype.getOrCreateInstance>;

// Lazy initialization du client Stream (version stream-chat v9+)
let _streamClient: StreamClient | null = null;

function getStreamClient(): StreamClient {
  if (!_streamClient) {
    if (!process.env.STREAM_API_KEY || !process.env.STREAM_API_SECRET || !process.env.STREAM_APP_ID) {
      throw new Error('Stream.io environment variables (STREAM_API_KEY, STREAM_API_SECRET, STREAM_APP_ID) are not set');
    }

    // Initialisation correcte pour stream-chat v9+
    const client = new StreamChat(process.env.STREAM_API_KEY, process.env.STREAM_API_SECRET, {
      timeout: 6000,
    });

    _streamClient = client as any;
  }
  return _streamClient;
}

export async function syncUserToStream(user: any) {
  try {
    const client = getStreamClient();

    // upsertUser avec la nouvelle API stream-chat v9+
    await client.upsertUser({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      image: user.avatar || undefined,
    });
  } catch (e) {
    console.error("Erreur sync user Stream:", e);
  }
}

export async function createFicheSupportChannel(ficheId: string, requesterId: string) {
  try {
    const client = getStreamClient();

    const ficheResults = await db
      .select({ ref: ficheNavettes.ref })
      .from(ficheNavettes)
      .where(eq(ficheNavettes.id, ficheId))
      .limit(1);

    if (!ficheResults.length) throw new Error("Fiche non trouvée");
    const ficheRef = ficheResults[0].ref;

    // Récupérer le demandeur
    const requester = await storage.getUser(requesterId);
    if (!requester) throw new Error("Utilisateur demandeur non trouvé");

    // Récupérer les admins
    const admins = await storage.getUsersByRoles(['ADMIN', 'RELATIONS_EVS']);

    // Liste complète des participants à synchroniser
    const allUsers = [requester, ...admins];

    // ⚠️ CRUCIAL : Synchroniser tous les utilisateurs dans Stream AVANT de créer le canal
    await Promise.all(allUsers.map(user => syncUserToStream(user)));

    // Création du canal avec stream-chat v9+
    const channel = client.channel('messaging', `fiche-${ficheId}`, {
      name: `Support ${ficheRef}`,
      created_by_id: 'system',
      members: [requesterId, ...admins.map(u => u.id)],
    });

    await channel.create();
    await channel.sendMessage({
      text: "Votre demande a bien été enregistrée. Le support vous répondra sous 24h (jours ouvrés).",
      user_id: 'system'
    });

    return channel;
  } catch (e) {
    console.error("Erreur création canal:", e);
    throw e;
  }
}

export async function createTechSupportChannel(requesterId: string) {
  try {
    const client = getStreamClient();

    // Récupérer le demandeur
    const requester = await storage.getUser(requesterId);
    if (!requester) throw new Error("Utilisateur demandeur non trouvé");

    // Récupérer les admins
    const admins = await storage.getUsersByRoles(['ADMIN', 'RELATIONS_EVS']);

    // Liste complète des participants à synchroniser
    const allUsers = [requester, ...admins];

    // ⚠️ CRUCIAL : Synchroniser tous les utilisateurs dans Stream AVANT de créer le canal
    await Promise.all(allUsers.map(user => syncUserToStream(user)));

    // Création du canal avec stream-chat v9+
    const channel = client.channel('messaging', `tech-${Date.now()}`, {
      name: `Support Technique #${new Date().toLocaleDateString()}`,
      created_by_id: 'system',
      members: [requesterId, ...admins.map(u => u.id)],
    });

    await channel.create();
    return channel;
  } catch (e) {
    console.error("Erreur création canal tech:", e);
    throw e;
  }
}

export async function generateStreamToken(userId: string) {
  const client = getStreamClient();
  const expiration = Math.floor(Date.now() / 1000) + 3600;
  return client.createToken(userId, expiration);
}
