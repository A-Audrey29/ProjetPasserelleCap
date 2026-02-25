
import { StreamChat } from 'stream-chat';
import { db } from '../db';
import { ficheNavettes, users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { storage } from '../storage';

/**
 * Singleton client Stream (backend)
 * Utilisé pour les opérations serveur (création de canaux, tokens, etc.)
 */
let _streamClient: StreamChat | null = null;

function getStreamClient(): StreamChat {
  if (!_streamClient) {
    const apiKey = process.env.STREAM_API_KEY;
    const apiSecret = process.env.STREAM_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error(
        'Stream.io environment variables (STREAM_API_KEY, STREAM_API_SECRET) are not set'
      );
    }

    // Initialiser le client serveur Stream Chat v9+
    _streamClient = new StreamChat(apiKey, apiSecret, {
      timeout: 6000,
    });
  }

  return _streamClient;
}

/**
 * Synchroniser un utilisateur avec Stream.io
 * Doit être appelé AVANT de créer des canaux pour l'utilisateur
 */
export async function syncUserToStream(user: any) {
  try {
    const client = getStreamClient();

    await client.upsertUser({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      image: user.avatar || undefined,
    });

    console.log(`[Stream] User synced: ${user.id}`);
  } catch (error) {
    console.error('[Stream] Error syncing user:', error);
    throw error;
  }
}

/**
 * Créer un canal de support pour une fiche navette
 * @param ficheId - ID de la fiche navette
 * @param requesterId - ID de l'utilisateur qui demande le support
 */
export async function createFicheSupportChannel(
  ficheId: string,
  requesterId: string
) {
  try {
    const client = getStreamClient();

    // Récupérer les infos de la fiche
    const ficheResults = await db
      .select({ ref: ficheNavettes.ref })
      .from(ficheNavettes)
      .where(eq(ficheNavettes.id, ficheId))
      .limit(1);

    if (!ficheResults.length) {
      throw new Error(`Fiche not found: ${ficheId}`);
    }

    const ficheRef = ficheResults[0].ref;

    // Récupérer le demandeur et les admins
    const requester = await storage.getUser(requesterId);
    if (!requester) {
      throw new Error(`Requester not found: ${requesterId}`);
    }

    const admins = await storage.getUsersByRoles(['ADMIN', 'RELATIONS_EVS']);

    const allUsers = [requester, ...admins];
    const memberIds = [requesterId, ...admins.map((u) => u.id)];

    // ✅ CRUCIAL : Synchroniser tous les utilisateurs AVANT créer le canal
    await Promise.all(allUsers.map((user) => syncUserToStream(user)));

    // Créer le canal
    const channel = client.channel('messaging', `fiche-${ficheId}`, {
      name: `Support ${ficheRef}`,
      created_by_id: 'system',
      members: memberIds,
    });

    await channel.create();

    // Message initial du système
    await channel.sendMessage({
      text: 'Votre demande a bien été enregistrée. Le support vous répondra sous 24h (jours ouvrés).',
      user_id: 'system',
    });

    console.log(`[Stream] Fiche support channel created: ${channel.id}`);

    return channel;
  } catch (error) {
    console.error('[Stream] Error creating fiche support channel:', error);
    throw error;
  }
}

/**
 * Créer un canal de support technique
 * @param requesterId - ID de l'utilisateur qui demande le support
 */
export async function createTechSupportChannel(requesterId: string) {
  try {
    const client = getStreamClient();

    // Récupérer le demandeur et les admins
    const requester = await storage.getUser(requesterId);
    if (!requester) {
      throw new Error(`Requester not found: ${requesterId}`);
    }

    const admins = await storage.getUsersByRoles(['ADMIN', 'RELATIONS_EVS']);

    const allUsers = [requester, ...admins];
    const memberIds = [requesterId, ...admins.map((u) => u.id)];

    // ✅ CRUCIAL : Synchroniser tous les utilisateurs AVANT créer le canal
    await Promise.all(allUsers.map((user) => syncUserToStream(user)));

    // Créer le canal avec un ID unique basé sur le timestamp
    const channelId = `tech-${Date.now()}`;
    const channel = client.channel('messaging', channelId, {
      name: `Support Technique - ${new Date().toLocaleDateString('fr-FR')}`,
      created_by_id: 'system',
      members: memberIds,
    });

    await channel.create();

    console.log(`[Stream] Tech support channel created: ${channel.id}`);

    return channel;
  } catch (error) {
    console.error('[Stream] Error creating tech support channel:', error);
    throw error;
  }
}

/**
 * Générer un token JWT pour l'authentification client
 * @param userId - ID de l'utilisateur
 * @returns Token JWT signé
 */
export async function generateStreamToken(userId: string): Promise<string> {
  try {
    const client = getStreamClient();

    // ✅ Token valide 24h (au lieu de 1h)
    const expiresAt = Math.floor(Date.now() / 1000) + 24 * 3600;

    const token = client.createToken(userId, expiresAt);

    return token;
  } catch (error) {
    console.error('[Stream] Error generating token:', error);
    throw error;
  }
}



// import { StreamChat } from 'stream-chat';
// import { db } from '../db';
// import { ficheNavettes, users } from '../../shared/schema';
// import { eq } from 'drizzle-orm';
// import { storage } from '../storage';

// // Type pour le client Stream (correct pour stream-chat v9+)
// type StreamClient = ReturnType<typeof StreamChat.prototype.getOrCreateInstance>;

// // Lazy initialization du client Stream (version stream-chat v9+)
// let _streamClient: StreamClient | null = null;

// function getStreamClient(): StreamClient {
//   if (!_streamClient) {
//     if (!process.env.STREAM_API_KEY || !process.env.STREAM_API_SECRET || !process.env.STREAM_APP_ID) {
//       throw new Error('Stream.io environment variables (STREAM_API_KEY, STREAM_API_SECRET, STREAM_APP_ID) are not set');
//     }

//     // Initialisation correcte pour stream-chat v9+
//     const client = new StreamChat(process.env.STREAM_API_KEY, process.env.STREAM_API_SECRET, {
//       timeout: 6000,
//     });

//     _streamClient = client as any;
//   }
//   return _streamClient;
// }

// export async function syncUserToStream(user: any) {
//   try {
//     const client = getStreamClient();

//     // upsertUser avec la nouvelle API stream-chat v9+
//     await client.upsertUser({
//       id: user.id,
//       name: `${user.firstName} ${user.lastName}`,
//       email: user.email,
//       image: user.avatar || undefined,
//     });
//   } catch (e) {
//     console.error("Erreur sync user Stream:", e);
//   }
// }

// export async function createFicheSupportChannel(ficheId: string, requesterId: string) {
//   try {
//     const client = getStreamClient();

//     const ficheResults = await db
//       .select({ ref: ficheNavettes.ref })
//       .from(ficheNavettes)
//       .where(eq(ficheNavettes.id, ficheId))
//       .limit(1);

//     if (!ficheResults.length) throw new Error("Fiche non trouvée");
//     const ficheRef = ficheResults[0].ref;

//     // Récupérer le demandeur
//     const requester = await storage.getUser(requesterId);
//     if (!requester) throw new Error("Utilisateur demandeur non trouvé");

//     // Récupérer les admins
//     const admins = await storage.getUsersByRoles(['ADMIN', 'RELATIONS_EVS']);

//     // Liste complète des participants à synchroniser
//     const allUsers = [requester, ...admins];

//     // ⚠️ CRUCIAL : Synchroniser tous les utilisateurs dans Stream AVANT de créer le canal
//     await Promise.all(allUsers.map(user => syncUserToStream(user)));

//     // Création du canal avec stream-chat v9+
//     const channel = client.channel('messaging', `fiche-${ficheId}`, {
//       name: `Support ${ficheRef}`,
//       created_by_id: 'system',
//       members: [requesterId, ...admins.map(u => u.id)],
//     });

//     await channel.create();
//     await channel.sendMessage({
//       text: "Votre demande a bien été enregistrée. Le support vous répondra sous 24h (jours ouvrés).",
//       user_id: 'system'
//     });

//     return channel;
//   } catch (e) {
//     console.error("Erreur création canal:", e);
//     throw e;
//   }
// }

// export async function createTechSupportChannel(requesterId: string) {
//   try {
//     const client = getStreamClient();

//     // Récupérer le demandeur
//     const requester = await storage.getUser(requesterId);
//     if (!requester) throw new Error("Utilisateur demandeur non trouvé");

//     // Récupérer les admins
//     const admins = await storage.getUsersByRoles(['ADMIN', 'RELATIONS_EVS']);

//     // Liste complète des participants à synchroniser
//     const allUsers = [requester, ...admins];

//     // ⚠️ CRUCIAL : Synchroniser tous les utilisateurs dans Stream AVANT de créer le canal
//     await Promise.all(allUsers.map(user => syncUserToStream(user)));

//     // Création du canal avec stream-chat v9+
//     const channel = client.channel('messaging', `tech-${Date.now()}`, {
//       name: `Support Technique #${new Date().toLocaleDateString()}`,
//       created_by_id: 'system',
//       members: [requesterId, ...admins.map(u => u.id)],
//     });

//     await channel.create();
//     return channel;
//   } catch (e) {
//     console.error("Erreur création canal tech:", e);
//     throw e;
//   }
// }

// export async function generateStreamToken(userId: string) {
//   const client = getStreamClient();
//   const expiration = Math.floor(Date.now() / 1000) + 3600;
//   return client.createToken(userId, expiration);
// }
