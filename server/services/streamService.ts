
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
 * Types de support disponibles
 */
export type SupportType = 'fiche' | 'atelier' | 'tech' | 'autre';

/**
 * Messages système initiaux pour chaque type de support
 */
const initialMessages: Record<SupportType, string> = {
  fiche: '👋 Bonjour ! Votre demande concernant la fiche navette a été créée. Merci de compléter votre demande ci-dessous :',
  atelier: '👋 Bonjour ! Votre demande concernant les ateliers a été créée. Merci de compléter votre demande ci-dessous :',
  tech: '👋 Bonjour ! Votre demande de support technique a été créée. Merci de compléter votre demande ci-dessous :',
  autre: '👋 Bonjour ! Votre demande a été créée. Merci de compléter votre demande ci-dessous :'
};

/**
 * Créer un canal de support générique
 * @param type - Type de support ('fiche', 'atelier', 'tech', 'autre')
 * @param requesterId - ID de l'utilisateur qui demande le support
 * @param ficheId - ID de la fiche navette (requis uniquement pour type='fiche')
 */
export async function createSupportChannel(
  type: SupportType,
  requesterId: string,
  ficheId?: string
) {
  try {
    const client = getStreamClient();

    // Validation : ficheId est requis pour type='fiche'
    if (type === 'fiche' && !ficheId) {
      throw new Error('ficheId is required for type="fiche"');
    }

    let channelName: string;
    let channelId: string;

    // Générer le nom et l'ID du canal selon le type
    switch (type) {
      case 'fiche': {
        // Récupérer les infos de la fiche
        const ficheResults = await db
          .select({ ref: ficheNavettes.ref })
          .from(ficheNavettes)
          .where(eq(ficheNavettes.id, ficheId!))
          .limit(1);

        if (!ficheResults.length) {
          throw new Error(`Fiche not found: ${ficheId}`);
        }

        const ficheRef = ficheResults[0].ref;
        channelName = `Support ${ficheRef}`;
        channelId = `fiche-${ficheId}`;
        break;
      }
      case 'atelier':
        channelName = `Support Atelier - ${new Date().toLocaleDateString('fr-FR')}`;
        channelId = `atelier-${Date.now()}`;
        break;
      case 'tech':
        channelName = `Support Technique - ${new Date().toLocaleDateString('fr-FR')}`;
        channelId = `tech-${Date.now()}`;
        break;
      case 'autre':
        channelName = `Support Autre - ${new Date().toLocaleDateString('fr-FR')}`;
        channelId = `autre-${Date.now()}`;
        break;
      default:
        throw new Error(`Invalid support type: ${type}`);
    }

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
    const channel = client.channel('messaging', channelId, {
      name: channelName,
      created_by_id: 'system',
      members: memberIds,
    });

    await channel.create();

    // Message initial du système (contextuel selon le type)
    await channel.sendMessage({
      text: initialMessages[type],
      user_id: 'system',
    });

    console.log(`[Stream] ${type} support channel created: ${channel.id}`);

    return channel;
  } catch (error) {
    console.error(`[Stream] Error creating ${type} support channel:`, error);
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



