import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import styles from './AdminAuditTab.module.css';
import { Search, History, Calendar, User, FileText, Activity, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '@/utils/formatters';

/**
 * Traductions des actions d'audit pour affichage utilisateur
 * Mappage action technique -> libellé français
 * Inclut toutes les actions présentes dans la base de données (anciennes et nouvelles)
 */
const ACTION_LABELS = {
  // Actions actuelles (minuscules)
  'create': 'Création',
  'update': 'Modification',
  'delete': 'Suppression',
  'state_transition': 'Changement d\'état',
  'transition': 'Transition',
  'assign': 'Assignation',
  'comment': 'Commentaire',
  'reset_password': 'Réinitialisation mot de passe',
  'activate': 'Activation/Désactivation',
  'email_notification': 'Notification email',
  'close_all_workshops': 'Clôture ateliers',
  'mark_viewed': 'Marquer vu',
  'delete_all': 'Suppression totale',
  // Actions historiques (majuscules - septembre 2025)
  'CREATE': 'Création',
  'UPDATE': 'Modification',
  'STATE_CHANGE': 'Changement d\'état'
};

/**
 * Types d'entités avec leurs libellés
 * Contient uniquement les entités réellement présentes dans les logs d'audit
 */
const ENTITY_LABELS = {
  'FicheNavette': 'Fiche navette',
  'User': 'Utilisateur',
  'UserProfile': 'Profil utilisateur',
  'EmailLog': 'Log email'
};

/**
 * Couleurs associées aux types d'actions pour la visualisation
 * Utilise les styles CSS de la charte graphique
 */
const ACTION_COLORS = {
  'create': 'success',
  'update': 'info',
  'delete': 'danger',
  'state_transition': 'primary',
  'transition': 'primary',
  'assign': 'warning',
  'comment': 'secondary',
  'reset_password': 'warning',
  'activate': 'info',
  'email_notification': 'info',
  'close_all_workshops': 'warning',
  'mark_viewed': 'secondary',
  'delete_all': 'danger',
  // Actions historiques (majuscules)
  'CREATE': 'success',
  'UPDATE': 'info',
  'STATE_CHANGE': 'primary'
};

/**
 * Composant AdminAuditTab
 * Interface d'administration pour consulter le journal d'audit global du système
 * Fonctionnalités :
 * - Pagination des résultats (20 événements par page)
 * - Recherche textuelle dans les références de fiches et IDs d'entité
 * - Filtrage par action, type d'entité et utilisateur
 * - Affichage intelligent : référence formatée (FN-ANNEE-MOIS-CHIFFRE) pour les fiches, ID technique pour les autres entités
 * - Affichage des métadonnées détaillées de chaque événement avec acteur et horodatage
 */
export default function AdminAuditTab() {
  // États pour les filtres et la pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);

  const itemsPerPage = 20;

  /**
   * Récupération des utilisateurs pour le filtre acteur
   * Utilisé pour permettre le filtrage par utilisateur ayant effectué une action
   */
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const { apiFetch } = await import('@/lib/apiFetch');
      const response = await apiFetch('/api/users');
      if (!response.ok) throw new Error('Erreur lors du chargement des utilisateurs');
      return response.json();
    }
  });

  /**
   * Récupération des logs d'audit avec pagination et filtres
   * Query key inclut tous les paramètres pour une mise en cache optimale
   */
  const { data: auditData, isLoading, error: auditError } = useQuery({
    queryKey: ['/api/admin/audit-logs', currentPage, actionFilter, entityFilter, actorFilter, searchTerm],
    queryFn: async () => {
      const { apiFetch } = await import('@/lib/apiFetch');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(actionFilter !== 'all' && { action: actionFilter }),
        ...(entityFilter !== 'all' && { entity: entityFilter }),
        ...(actorFilter !== 'all' && { actorId: actorFilter }),
        ...(searchTerm && { search: searchTerm })
      });
      
      const response = await apiFetch(`/api/admin/audit-logs?${params}`);
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    retry: false
  });

  const logs = auditData?.logs || [];
  const totalLogs = auditData?.total || 0;
  const totalPages = Math.ceil(totalLogs / itemsPerPage);
  
  // Gestion explicite du 401 : banner visible avec bouton (pas de redirection auto)
  const isAuthError = auditError?.message?.includes('401') || auditError?.message?.includes('Session expirée');

  /**
   * Gestion de la recherche avec réinitialisation de la page
   */
  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  /**
   * Gestion des changements de filtres avec réinitialisation de la page
   */
  const handleFilterChange = (filterType, value) => {
    if (filterType === 'action') setActionFilter(value);
    if (filterType === 'entity') setEntityFilter(value);
    if (filterType === 'actor') setActorFilter(value);
    setCurrentPage(1);
  };

  /**
   * Liste complète des actions possibles (toutes les actions du système)
   * Définie statiquement pour permettre le filtrage même si l'action n'est pas présente dans la page courante
   */
  const allActions = Object.keys(ACTION_LABELS).sort();

  /**
   * Liste complète des entités possibles (tous les types d'entités du système)
   * Définie statiquement pour permettre le filtrage même si l'entité n'est pas présente dans la page courante
   */
  const allEntities = Object.keys(ENTITY_LABELS).sort();

  /**
   * Rendu du détail d'un log sélectionné
   * Affiche toutes les informations disponibles incluant les métadonnées
   */
  const renderLogDetails = () => {
    if (!selectedLog) return null;

    return (
      <div className={styles.logDetails}>
        <div className={styles.detailsHeader}>
          <button 
            onClick={() => setSelectedLog(null)}
            className={styles.backButton}
            data-testid="button-back-to-list"
          >
            ← Retour à la liste
          </button>
          <h3 className={styles.detailsTitle}>Détails de l'événement</h3>
        </div>
        
        <div className={styles.detailsContent}>
          {/* Informations principales */}
          <div className={styles.detailSection}>
            <h4 className={styles.sectionTitle}>Informations principales</h4>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Action :</span>
                <span className={`${styles.detailValue} ${styles['badge-' + (ACTION_COLORS[selectedLog.action] || 'default')]}`}>
                  {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Type d'entité :</span>
                <span className={styles.detailValue}>
                  {ENTITY_LABELS[selectedLog.entity] || selectedLog.entity}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>
                  {selectedLog.ficheReference ? 'Référence :' : 'ID de l\'entité :'}
                </span>
                <span className={styles.detailValue}>
                  {selectedLog.ficheReference || selectedLog.entityId}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Date :</span>
                <span className={styles.detailValue}>{formatDate(selectedLog.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Informations sur l'acteur */}
          <div className={styles.detailSection}>
            <h4 className={styles.sectionTitle}>Acteur</h4>
            <div className={styles.detailGrid}>
              {selectedLog.actor ? (
                <>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Nom :</span>
                    <span className={styles.detailValue}>
                      {selectedLog.actor.firstName} {selectedLog.actor.lastName}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Email :</span>
                    <span className={styles.detailValue}>{selectedLog.actor.email}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Rôle :</span>
                    <span className={styles.detailValue}>{selectedLog.actor.role}</span>
                  </div>
                </>
              ) : (
                <div className={styles.detailItem}>
                  <span className={styles.detailValue}>Système (action automatique)</span>
                </div>
              )}
            </div>
          </div>

          {/* Métadonnées additionnelles */}
          {selectedLog.meta && Object.keys(selectedLog.meta).length > 0 && (
            <div className={styles.detailSection}>
              <h4 className={styles.sectionTitle}>Métadonnées</h4>
              <div className={styles.metadataContainer}>
                <pre className={styles.metadataJson}>
                  {JSON.stringify(selectedLog.meta, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Si un log est sélectionné, afficher uniquement ses détails
  if (selectedLog) {
    return renderLogDetails();
  }

  return (
    <div className={styles.auditTab}>
      {/* Banner d'erreur explicite (pas de liste vide silencieuse) */}
      {auditError && (
        <div className={styles.errorBanner}>
          <AlertCircle size={20} className={styles.errorIcon} />
          <div className={styles.errorContent}>
            <span className={styles.errorMessage}>
              {isAuthError 
                ? 'Session expirée'
                : auditError.message || 'Erreur lors du chargement des logs'}
            </span>
            {isAuthError && (
              <button 
                onClick={() => window.location.href = '/login'}
                className={styles.loginButton}
              >
                Se reconnecter
              </button>
            )}
          </div>
        </div>
      )}

      {/* En-tête avec titre et statistiques */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <History className={styles.headerIcon} size={24} />
          <div>
            <h2 className={styles.title}>Journal d'audit</h2>
            <p className={styles.subtitle}>
              Consultation de l'historique complet des événements système
            </p>
          </div>
        </div>
        <div className={styles.statsCard}>
          <Activity size={20} className={styles.statsIcon} />
          <div className={styles.statsContent}>
            <span className={styles.statsValue}>{totalLogs}</span>
            <span className={styles.statsLabel}>événements enregistrés</span>
          </div>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className={styles.filtersContainer}>
        {/* Recherche textuelle */}
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Rechercher par référence ou ID..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className={styles.searchInput}
            data-testid="input-search-audit"
          />
        </div>

        {/* Filtre par action */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Action :</label>
          <select
            value={actionFilter}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            className={styles.filterSelect}
            data-testid="select-action-filter"
          >
            <option value="all">Toutes les actions</option>
            {allActions.map(action => (
              <option key={action} value={action}>
                {ACTION_LABELS[action] || action}
              </option>
            ))}
          </select>
        </div>

        {/* Filtre par type d'entité */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Entité :</label>
          <select
            value={entityFilter}
            onChange={(e) => handleFilterChange('entity', e.target.value)}
            className={styles.filterSelect}
            data-testid="select-entity-filter"
          >
            <option value="all">Toutes les entités</option>
            {allEntities.map(entity => (
              <option key={entity} value={entity}>
                {ENTITY_LABELS[entity] || entity}
              </option>
            ))}
          </select>
        </div>

        {/* Filtre par utilisateur/acteur */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Utilisateur :</label>
          <select
            value={actorFilter}
            onChange={(e) => handleFilterChange('actor', e.target.value)}
            className={styles.filterSelect}
            data-testid="select-actor-filter"
          >
            <option value="all">Tous les utilisateurs</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des logs d'audit */}
      <div className={styles.logsContainer}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <Activity className={styles.loadingIcon} size={32} />
            <p>Chargement des événements d'audit...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className={styles.emptyState}>
            <AlertCircle size={48} className={styles.emptyIcon} />
            <p className={styles.emptyText}>Aucun événement d'audit trouvé</p>
            <p className={styles.emptySubtext}>
              Essayez de modifier vos critères de recherche ou vos filtres
            </p>
          </div>
        ) : (
          <div className={styles.logsList}>
            <div className={styles.logsTable}>
              {/* En-tête du tableau */}
              <div className={styles.tableHeader}>
                <div className={styles.columnDate}>Date</div>
                <div className={styles.columnAction}>Action</div>
                <div className={styles.columnEntity}>Entité</div>
                <div className={styles.columnEntityId}>Référence</div>
                <div className={styles.columnActor}>Acteur</div>
                <div className={styles.columnDetails}>Détails</div>
              </div>

              {/* Corps du tableau */}
              <div className={styles.tableBody}>
                {logs.map((log) => (
                  <div 
                    key={log.id} 
                    className={styles.tableRow}
                    data-testid={`audit-log-${log.id}`}
                  >
                    <div className={styles.columnDate}>
                      <Calendar size={14} className={styles.columnIcon} />
                      <span>{formatDate(log.createdAt)}</span>
                    </div>
                    
                    <div className={styles.columnAction}>
                      <span className={`${styles.actionBadge} ${styles['badge-' + (ACTION_COLORS[log.action] || 'default')]}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </div>
                    
                    <div className={styles.columnEntity}>
                      <FileText size={14} className={styles.columnIcon} />
                      <span>{ENTITY_LABELS[log.entity] || log.entity}</span>
                    </div>
                    
                    <div className={styles.columnEntityId}>
                      <code className={styles.entityIdCode}>
                        {log.ficheReference || log.entityId}
                      </code>
                    </div>
                    
                    <div className={styles.columnActor}>
                      <User size={14} className={styles.columnIcon} />
                      {log.actor ? (
                        <span>{log.actor.firstName} {log.actor.lastName}</span>
                      ) : (
                        <span className={styles.systemActor}>Système</span>
                      )}
                    </div>
                    
                    <div className={styles.columnDetails}>
                      <button
                        onClick={() => setSelectedLog(log)}
                        className={styles.detailsButton}
                        data-testid={`button-view-details-${log.id}`}
                      >
                        Voir détails
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={styles.paginationButton}
            data-testid="button-prev-page"
          >
            <ChevronLeft size={18} />
            Précédent
          </button>
          
          <div className={styles.paginationInfo}>
            <span className={styles.pageIndicator}>
              Page {currentPage} sur {totalPages}
            </span>
            <span className={styles.itemsIndicator}>
              ({((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalLogs)} sur {totalLogs})
            </span>
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className={styles.paginationButton}
            data-testid="button-next-page"
          >
            Suivant
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
