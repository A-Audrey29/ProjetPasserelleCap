import { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import styles from './VideoModal.module.css';

/**
 * VideoModal Component
 * Modal qui ouvre le lien Guidde dans un nouvel onglet
 * Gère le focus trap et la fermeture via ESC
 */
export function VideoModal({ video, onClose }) {
  // Ouvrir le lien Guidde automatiquement dans un nouvel onglet
  useEffect(() => {
    if (video?.guidUrl) {
      window.open(video.guidUrl, '_blank', 'noopener,noreferrer');
    }
  }, [video]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleOpenLink = () => {
    if (video?.guidUrl) {
      window.open(video.guidUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`video-modal-title-${video.id}`}
      >
        {/* Close button */}
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Fermer"
        >
          <X />
        </button>

        {/* Info container */}
        <div className={styles.infoContainer}>
          <div className={styles.iconWrapper}>
            <ExternalLink className={styles.icon} />
          </div>

          <div className={styles.info}>
            <h2
              id={`video-modal-title-${video.id}`}
              className={styles.title}
            >
              {video.title}
            </h2>
            {video.category && (
              <span className={styles.category}>{video.category}</span>
            )}
            <p className={styles.description}>{video.description}</p>

            {/* Bouton pour rouvrir le lien */}
            <button
              onClick={handleOpenLink}
              className={styles.openLinkButton}
            >
              <ExternalLink className={styles.buttonIcon} />
              Ouvrir le guide
            </button>

            <p className={styles.note}>
              Le guide s'est ouvert dans un nouvel onglet. Si ce n'est pas le cas,
              vérifiez que votre navigateur n'a pas bloqué la popup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
