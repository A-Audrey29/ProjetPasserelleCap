import type { VideoFAQ } from '../data/videoFaqs';
import type { UserRole } from '../../shared/schema';

/**
 * Utilitaires pour la FAQ
 * Gestion des liens Guidde et helpers de filtrage
 */

/**
 * Filtre les vidéos par rôle utilisateur
 * @param videos - Tableau de vidéos
 * @param userRole - Rôle de l'utilisateur
 * @returns Vidéos filtrées
 */
export function filterVideosByRole(
  videos: VideoFAQ[],
  userRole: UserRole | undefined
): VideoFAQ[] {
  if (!userRole) return [];

  // ADMIN et EVS_CS voient TOUTES les vidéos actives
  if (userRole === 'ADMIN' || userRole === 'EVS_CS') {
    return videos.filter(video => video.isActive);
  }

  // Les autres rôles voient seulement leurs vidéos autorisées
  return videos.filter(video =>
    video.isActive &&
    video.roles.includes(userRole)
  );
}

/**
 * Regroupe les vidéos par catégorie
 * @param videos - Tableau de vidéos
 * @returns Objet avec catégories comme clés
 */
export function groupVideosByCategory(
  videos: VideoFAQ[]
): Record<string, VideoFAQ[]> {
  const grouped: Record<string, VideoFAQ[]> = {};

  videos.forEach(video => {
    const category = video.category || 'Sans catégorie';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(video);
  });

  return grouped;
}

/**
 * Recherche dans les vidéos (titre + description)
 * @param videos - Tableau de vidéos
 * @param query - Terme de recherche
 * @returns Vidéos filtrées
 */
export function searchInVideos(
  videos: VideoFAQ[],
  query: string
): VideoFAQ[] {
  if (!query.trim()) return videos;

  const searchTerm = query.toLowerCase();

  return videos.filter(video =>
    video.title.toLowerCase().includes(searchTerm) ||
    video.description.toLowerCase().includes(searchTerm) ||
    video.category?.toLowerCase().includes(searchTerm)
  );
}
