
import { useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFiche } from '@/hooks/useFiches';
import Header from '@/components/Layout/Header';
import FicheDetail from '@/components/Fiches/FicheDetail';
import StatusBadge from '@/components/Common/StatusBadge';
import styles from './FicheDetail.module.css';

export default function FicheDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { fiche, isLoading, error } = useFiche(id);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, authLoading, setLocation]);

  if (authLoading || isLoading) {
    return (
      <div className={styles.container}>
        <Header />
        <main className={styles.main}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingContent}>
              <div className={styles.spinner}></div>
              <p className={styles.loadingText}>Chargement de la fiche...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  if (error || !fiche) {
    return (
      <div className={styles.container}>
        <Header />
        <main className={styles.main}>
          <div className={styles.errorContainer}>
            <div className={styles.errorContent}>
              <p className={styles.errorTitle}>
                Erreur lors du chargement
              </p>
              <p className={styles.errorMessage}>
                {error?.message || 'Fiche non trouvée'}
              </p>
              <button 
                className={styles.backButton}
                onClick={() => setLocation('/')}
                data-testid="button-back-dashboard"
              >
                Retour au tableau de bord
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header />
      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div className={styles.breadcrumb}>
            <button 
              onClick={() => setLocation('/')}
              className={styles.breadcrumbLink}
              data-testid="link-dashboard"
            >
              Tableau de bord
            </button>
            <ChevronRight className={styles.breadcrumbIcon} />
            <span className={styles.breadcrumbCurrent}>Fiche {fiche.ref}</span>
          </div>
          <div className={styles.titleSection}>
            <div className={styles.titleInfo}>
              <h1 className={styles.pageTitle} data-testid="text-fiche-title">
                Fiche navette {fiche.ref}
              </h1>
              <p className={styles.familyInfo} data-testid="text-family-info">
                Famille {fiche.family?.code}
              </p>
            </div>
            <div className={styles.statusSection}>
              <StatusBadge state={fiche.state} />
            </div>
          </div>
        </div>

        <FicheDetail ficheId={id} />
      </main>
    </div>
  );
}
