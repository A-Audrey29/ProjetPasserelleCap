import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Layout/Header';
import WorkshopSessionCard from '@/components/Workshops/WorkshopSessionCard';
import styles from './Ateliers.module.css';

export default function Ateliers() {
  const { user, isAuthenticated } = useAuth();
  const [stateFilter, setStateFilter] = useState('TOUS');

  // Query workshop sessions with role-based filtering
  const { data: sessions = [], isLoading, error } = useQuery({
    queryKey: ['/api/workshop-sessions'],
    enabled: isAuthenticated
  });

  // Calculate session state (same logic as WorkshopSessionCard)
  const getSessionState = (session) => {
    if (session?.activityDone) return 'TERMINÉE';
    if (session?.contractSignedByEVS || session?.contractSignedByCommune) return 'EN COURS';
    if (session?.participantCount >= session?.workshop?.minCapacity) return 'PRÊTE';
    return 'EN ATTENTE';
  };

  // Filter sessions based on selected state
  const filteredSessions = sessions.filter((session) => {
    if (stateFilter === 'TOUS') return true;
    return getSessionState(session) === stateFilter;
  });

  if (isLoading) {
    return (
      <div className={styles.ateliersContainer}>
        <Header />
        <main className={styles.mainContent}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Chargement des ateliers...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.ateliersContainer}>
        <Header />
        <main className={styles.mainContent}>
          <div className={styles.errorContainer}>
            <p>Erreur lors du chargement des ateliers: {error.message}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.ateliersContainer}>
      <Header />

      <main className={styles.mainContent}>
        {/* Header */}
        <div className={styles.headerSection}>
          <div className={styles.headerContent}>
            <h1 data-testid="text-ateliers-title">
              Gestion des Ateliers
            </h1>
            <p>
              Vue d'ensemble des sessions d'ateliers collectifs
            </p>
          </div>
        </div>

        {/* Sessions List */}
        <div className={styles.sessionsGrid}>
          {sessions.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Aucune session d'atelier disponible</p>
            </div>
          ) : (
            sessions.map((session) => (
              <WorkshopSessionCard 
                key={session.id} 
                session={session}
                data-testid={`card-workshop-session-${session.id}`}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}