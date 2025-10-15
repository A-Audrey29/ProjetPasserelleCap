import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Layout/Header';
import WorkshopSessionCard from '@/components/Workshops/WorkshopSessionCard';
import styles from './Ateliers.module.css';

export default function Ateliers() {
  const { user, isAuthenticated } = useAuth();
  const [stateFilter, setStateFilter] = useState('TOUS');
  const [organizationFilter, setOrganizationFilter] = useState('');

  // Query workshop sessions with role-based filtering
  const { data: sessions = [], isLoading, error } = useQuery({
    queryKey: ['/api/workshop-sessions'],
    enabled: isAuthenticated
  });

  // Query organizations for filter
  const { data: organizations = [] } = useQuery({
    queryKey: ['/api/organizations'],
    enabled: isAuthenticated
  });

  // Calculate session state (same logic as WorkshopSessionCard)
  const getSessionState = (session) => {
    if (session?.activityDone) return 'TERMINÉE';
    if (session?.contractSignedByEVS || session?.contractSignedByCommune) return 'EN COURS';
    if (session?.participantCount >= session?.workshop?.minCapacity) return 'PRÊTE';
    return 'EN ATTENTE';
  };

  // Filter sessions based on selected state and organization
  const filteredSessions = sessions.filter((session) => {
    const stateMatch = stateFilter === 'TOUS' || getSessionState(session) === stateFilter;
    const orgMatch = !organizationFilter || session.evsId === organizationFilter;
    return stateMatch && orgMatch;
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
          
          {/* Filters */}
          <div className={styles.filterSection}>
            <div className={styles.filterGroup}>
              <label htmlFor="state-filter" className={styles.filterLabel}>
                Filtrer par état :
              </label>
              <select
                id="state-filter"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className={styles.filterSelect}
                data-testid="select-state-filter"
              >
                <option value="TOUS">Tous</option>
                <option value="EN ATTENTE">En attente</option>
                <option value="PRÊTE">Prête</option>
                <option value="EN COURS">En cours</option>
                <option value="TERMINÉE">Terminée</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="organization-filter" className={styles.filterLabel}>
                Filtrer par structure :
              </label>
              <select
                id="organization-filter"
                value={organizationFilter}
                onChange={(e) => setOrganizationFilter(e.target.value)}
                className={styles.filterSelect}
                data-testid="select-organization-filter"
              >
                <option value="">Toutes les structures</option>
                {organizations.map((org) => (
                  <option key={org.orgId} value={org.orgId}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className={styles.sessionsGrid}>
          {filteredSessions.length === 0 ? (
            <div className={styles.emptyState}>
              <p>
                {sessions.length === 0 
                  ? 'Aucune session d\'atelier disponible' 
                  : `Aucune session dans l'état "${stateFilter === 'TOUS' ? 'Tous' : stateFilter}"`
                }
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => (
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