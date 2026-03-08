import type { UserRole } from '../../../shared/schema';

/**
 * FAQ - Guides Guidde filtrés par rôle utilisateur
 *
 * 🎯 OBJECTIF : Fournir des tutoriels vidéo organisés par rôle pour la plateforme Passerelle CAP
 *
 * 📋 PROCÉDURE D'AJOUT D'UN GUIDE :
 * 1. Ajouter un objet dans le tableau `videoFAQs`
 * 2. Spécifier les rôles autorisés dans `roles`
 * 3. Incrémenter `order` pour le tri
 * 4. Optionnel : définir une `category` pour le regroupement
 *
 * 🔒 SÉCURITÉ :
 * - Filtrage par rôle côté FRONTEND uniquement
 * - Les URLs Guidde sont visibles dans le bundle compilé
 *
 * ⚠️ MIGRATION VERS BASE DE DONNÉES :
 * Si vous atteignez un de ces triggers, envisagez une migration DB :
 * - Plus de 20 guides
 * - Modifications quotidiennes
 * - Besoin d'interface d'administration
 */

export interface VideoFAQ {
  id: string;                    // Identifiant unique (ex: 'vf-001')
  title: string;                 // Titre du guide
  description: string;           // Description courte
  guidUrl: string;               // URL Guidde du playbook
  category?: string;             // Catégorie pour regroupement
  roles: UserRole[];             // Rôles autorisés à voir ce guide
  order: number;                 // Ordre d'affichage
  isActive: boolean;             // Actif/inactif (permet désactivation temporaire)
}

/**
 * Données des guides FAQ (Guidde)
 */
export const videoFAQs: VideoFAQ[] = [
  {
    id: 'vf-001',
    title: 'Guide Passerelle CAP',
    description: 'Comment entrer dans la plateforme et modifier son mot de passe ?',
    guidUrl: 'https://app.guidde.com/share/playbooks/hiBV7k74gasmUEhHggyK6e?origin=aq0jEcoR98Qd6ct4wzN06GLMk6X2',
    category: 'Prise en main',
    roles: ['ADMIN', 'SUIVI_PROJETS', 'EMETTEUR', 'RELATIONS_EVS', 'EVS_CS', 'CD'],
    order: 1,
    isActive: true
  },
  {
    id: 'vf-002',
    title: 'Comment accepter une nouvelle fiche navette',
    description: 'Découvrez comment accepter une nouvelle fiche navette dans Passerelle CAP.',
    guidUrl: 'https://app.guidde.com/share/playbooks/fuN3SrLgy1WsjX5SAxkeXX?origin=aq0jEcoR98Qd6ct4wzN06GLMk6X2',
    category: 'Prise en main',
    roles: ['ADMIN', 'SUIVI_PROJETS', 'RELATIONS_EVS', 'EVS_CS', 'CD'],
    order: 2,
    isActive: true
  }
];

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Récupère les vidéos autorisées pour un rôle donné
 * @param role - Le rôle de l'utilisateur
 * @returns Tableau des vidéos filtrées et triées
 */
export function getVideosForRole(role: UserRole | undefined): VideoFAQ[] {
  if (!role) return [];

  return videoFAQs
    .filter(video => video.isActive && video.roles.includes(role))
    .sort((a, b) => a.order - b.order);
}

/**
 * Récupère les catégories uniques pour un rôle donné
 * @param role - Le rôle de l'utilisateur
 * @returns Tableau des catégories uniques
 */
export function getVideoCategories(role: UserRole | undefined): string[] {
  const videos = getVideosForRole(role);
  const categories = videos
    .map(video => video.category)
    .filter((cat): cat is string => Boolean(cat));

  return Array.from(new Set(categories)).sort();
}

/**
 * Récupère une vidéo par son ID
 * @param id - L'identifiant de la vidéo
 * @returns La vidéo ou undefined
 */
export function getVideoById(id: string): VideoFAQ | undefined {
  return videoFAQs.find(video => video.id === id);
}

/**
 * Recherche de vidéos par terme
 * @param query - Terme de recherche
 * @param role - Rôle de l'utilisateur
 * @returns Vidéos correspondantes
 */
export function searchVideos(query: string, role: UserRole | undefined): VideoFAQ[] {
  if (!role || !query.trim()) return getVideosForRole(role);

  const searchTerm = query.toLowerCase();
  const videos = getVideosForRole(role);

  return videos.filter(video =>
    video.title.toLowerCase().includes(searchTerm) ||
    video.description.toLowerCase().includes(searchTerm) ||
    video.category?.toLowerCase().includes(searchTerm)
  );
}
