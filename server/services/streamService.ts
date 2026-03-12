
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
      structure: user.structure || 'Non renseigné',
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
  fiche: `👋 Bonjour ! Pour quelle fiche navette avez-vous besoin d'aide ?

Merci d'indiquer :
• Le numéro de la fiche
• Le nom de la famille

ℹ️ Un membre de l'équipe CAP vous répondra sous 24h (jours ouvrés).`,
  atelier: `👋 Bonjour ! Pour quel atelier avez-vous besoin d'aide ?

Merci de décrire votre demande.

ℹ️ Un membre de l'équipe CAP vous répondra sous 24h (jours ouvrés).`,
  tech: `👋 Bonjour ! Quel problème technique rencontrez-vous ?

Merci de décrire :
• Ce que vous essayiez de faire
• Le message d'erreur (s'il y en a un)

ℹ️ Un membre de l'équipe CAP vous répondra sous 24h (jours ouvrés).`,
  autre: `👋 Bonjour ! Comment pouvons-nous vous aider ?

N'hésitez pas à décrire votre demande.

ℹ️ Un membre de l'équipe CAP vous répondra sous 24h (jours ouvrés).`
};

/**
 * Créer un canal de support générique
 * @param type - Type de support ('fiche', 'atelier', 'tech', 'autre')
 * @param requesterId - ID de l'utilisateur qui demande le support
 * @param ficheId - ID de la fiche navette (optionnel, pour context futur)
 */
export async function createSupportChannel(
  type: SupportType,
  requesterId: string,
  ficheId?: string
) {
  try {
    const client = getStreamClient();

    let channelName: string;
    let channelId: string;

    // Générer le nom et l'ID du canal selon le type
    switch (type) {
      case 'fiche': {
        // Si ficheId fourni, récupérer les infos de la fiche pour nommer le canal
        if (ficheId) {
          const ficheResults = await db
            .select({ ref: ficheNavettes.ref })
            .from(ficheNavettes)
            .where(eq(ficheNavettes.id, ficheId))
            .limit(1);

          if (!ficheResults.length) {
            throw new Error(`Fiche not found: ${ficheId}`);
          }

          const ficheRef = ficheResults[0].ref;
          channelName = `Support ${ficheRef}`;
          channelId = `fiche-${ficheId}`;
        } else {
          // Sans ficheId, créer un canal générique avec timestamp
          channelName = `Support Fiche Navette - ${new Date().toLocaleDateString('fr-FR')}`;
          channelId = `fiche-${Date.now()}`;
        }
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

    // Créer le canal avec métadonnées créateur
    const channel = client.channel('messaging', channelId, {
      name: channelName,
      created_by_id: 'system',
      members: memberIds,
      // Métadonnées pour identifier le créateur réel du ticket
      channel_details: {
        requester_id: requester.id,
        requester_name: `${requester.firstName} ${requester.lastName}`,
        requester_structure: requester.structure || 'Non renseigné',
        requester_email: requester.email,
        requester_role: requester.role,
      },
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



