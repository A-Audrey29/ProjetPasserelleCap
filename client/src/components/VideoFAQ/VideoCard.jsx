import { Play } from 'lucide-react';
import styles from './VideoCard.module.css';

/**
 * Composant VideoCard
 * Affiche une carte guide avec icône, titre et description
 * Accessible : keyboard navigation, ARIA labels, focus states
 */
export function VideoCard({ video, onClick }) {
  const handleClick = () => {
    if (onClick) {
      onClick(video);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={styles.card}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Voir le guide : ${video.title}`}
    >
      {/* Icône placeholder avec overlay play */}
      <div className={styles.iconContainer}>
        <div className={styles.playOverlay}>
          <div className={styles.playButton}>
            <Play className={styles.playIcon} fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Contenu de la carte */}
      <div className={styles.content}>
        {video.category && (
          <span className={styles.category}>{video.category}</span>
        )}
        <h3 className={styles.title}>{video.title}</h3>
        <p className={styles.description}>{video.description}</p>
      </div>
    </div>
  );
}
