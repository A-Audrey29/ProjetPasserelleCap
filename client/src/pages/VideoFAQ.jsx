import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Search, Filter, Video, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { videoFAQs } from '@/data/videoFaqs';
import { filterVideosByRole, groupVideosByCategory } from '@/utils/videoHelpers';
import { VideoModal } from '@/components/VideoFAQ/VideoModal';
import { VideoCard } from '@/components/VideoFAQ/VideoCard';
import styles from './VideoFAQ.module.css';

/**
 * Page FAQ Vidéo
 * Affiche les tutoriels vidéo filtrés par rôle utilisateur
 * Features : recherche, filtrage par catégorie, modal de lecture
 *
 * CATÉGORIES DYNAMIQUES : Calculées automatiquement depuis les données
 * - Utilisation de Set pour extraire les catégories uniques
 * - Aucun hardcoded de catégories dans le JSX
 */
export default function VideoFAQ() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isInitialized, setIsInitialized] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/login');
    } else if (!authLoading && isAuthenticated) {
      setIsInitialized(true);
    }
  }, [isAuthenticated, authLoading, setLocation]);

  // Get user role
  const userRole = user?.role ?? user?.user?.role;

  // Filter videos by role
  const accessibleVideos = filterVideosByRole(videoFAQs, userRole);

  // ========================================
  // CATÉGORIES DYNAMIQUES - POINT CRITIQUE
  // ========================================
  // Les catégories sont calculées AUTOMATIQUEMENT depuis les données
  // Utilisation de Set pour dédupliquer et filter(Boolean) pour exclure les undefined
  // AUCUN hardcoded de catégories dans le JSX
  const categories = ['all', ...Array.from(new Set(
    accessibleVideos
      .map(v => v.category)
      .filter(Boolean)
  ))];
  // ========================================

  // Apply search and category filters
  const filteredVideos = accessibleVideos.filter(video => {
    const matchesSearch = !searchQuery.trim() ||
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' ||
      video.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Group videos by category for display
  const groupedVideos = groupVideosByCategory(filteredVideos);

  // Loading state
  if (authLoading || !isInitialized) {
    return (
      <div className={styles.container}>
        <main className={styles.mainContent}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingContent}>
              <div className={styles.spinner}></div>
              <p className={styles.loadingText}>Chargement...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.container}>
      <main className={styles.mainContent}>
        {/* Header Section */}
        <div className={styles.headerSection}>
          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <Video className={styles.headerIcon} />
              <div>
                <h1 className={styles.pageTitle}>FAQ</h1>
                <p className={styles.pageSubtitle}>
                  Tutoriels et guides pour utiliser la plateforme Passerelle CAP
                </p>
              </div>
            </div>
            <div className={styles.videoCount}>
              {accessibleVideos.length} vidéo{accessibleVideos.length > 1 ? 's' : ''} disponible{accessibleVideos.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Search and Filter Controls - MASQUÉ */}
        {/*
        <div className={styles.controlsSection}>
          <div className={styles.searchBar}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Rechercher une vidéo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label="Rechercher des vidéos"
            />
            {searchQuery && (
              <button
                className={styles.clearButton}
                onClick={() => setSearchQuery('')}
                aria-label="Effacer la recherche"
              >
                ✕
              </button>
            )}
          </div>

          <div className={styles.categoryFilter}>
            <Filter className={styles.filterIcon} />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={styles.categorySelect}
              aria-label="Filtrer par catégorie"
            >
              <option value="all">Toutes les catégories</option>
              {categories.filter(cat => cat !== 'all').map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
        */}

        {/* Video Grid by Category */}
        {Object.keys(groupedVideos).length > 0 ? (
          <div className={styles.videosSection}>
            {Object.entries(groupedVideos).map(([category, videos]) => (
              <div key={category} className={styles.categorySection}>
                <h2 className={styles.categoryTitle}>
                  {category}
                  <span className={styles.categoryCount}>({videos.length})</span>
                </h2>
                <div className={styles.videoGrid}>
                  {videos.map(video => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      onClick={setSelectedVideo}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <AlertCircle className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Aucune vidéo trouvée</h3>
            <p className={styles.emptyMessage}>
              {searchQuery || selectedCategory !== 'all'
                ? 'Aucune vidéo ne correspond à vos critères de recherche.'
                : 'Aucune vidéo n\'est disponible pour votre rôle.'}
            </p>
            {(searchQuery || selectedCategory !== 'all') && (
              <button
                className={styles.resetButton}
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}

        {/* Video Modal */}
        {selectedVideo && (
          <VideoModal
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
          />
        )}
      </main>
    </div>
  );
}
