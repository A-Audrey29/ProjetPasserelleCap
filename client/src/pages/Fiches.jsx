import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Eye, FileText, Plus, Search, Filter, Calendar, User, Building, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFiches } from '@/hooks/useFiches';
import { hasPermission, ROLES, ACTIONS } from '@/utils/permissions';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Badge } from '@/components/common/Badge';
import { Card, CardContent } from '@/components/common/Card';
import styles from './Fiches.module.css';

// Import state labels from constants
import { STATE_LABELS, FILTERABLE_STATES } from '../utils/constants';

const STATE_COLORS = {
  'DRAFT': 'secondary',
  'SUBMITTED_TO_FEVES': 'default',
  'ASSIGNED_EVS': 'outline',
  'ACCEPTED_EVS': 'default',
  'EVS_REJECTED': 'destructive',
  'CONTRACT_SIGNED': 'default',
  'ACTIVITY_DONE': 'default',
  'FIELD_CHECK_SCHEDULED': 'default',
  'FIELD_CHECK_DONE': 'default',
  'FINAL_REPORT_RECEIVED': 'default',
  'IN_PROGRESS': 'default',
  'COMPLETED': 'success',
  'CLOSED': 'success',
  'ARCHIVED': 'secondary',
  'REJECTED': 'destructive',
  'CANCELLED': 'destructive'
};

export default function Fiches() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  
  const userRole = user?.user?.role || user?.role;

  // Read URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stateParam = urlParams.get('state');
    const searchParam = urlParams.get('search');
    
    if (stateParam) {
      setStateFilter(stateParam);
    }
    if (searchParam) {
      setSearchTerm(searchParam);
    }
  }, []);

  const [, setLocation] = useLocation();

  // Build filters object for useFiches hook
  const buildFilters = () => {
    const filters = {};
    if (searchTerm) filters.search = searchTerm;
    if (stateFilter && stateFilter !== 'all') filters.state = stateFilter;
    
    // For CD role filtering - check URL to determine which CD action
    if (userRole === ROLES.CD) {
      const urlParams = new URLSearchParams(window.location.search);
      const isValidationPage = urlParams.get('state') === 'SUBMITTED_TO_CD';
      
      if (isValidationPage) {
        filters.state = 'SUBMITTED_TO_CD';
      }
    }
    
    return filters;
  };

  // Use centralized useFiches hook (uses apiRequest with credentials:'include')
  const { fiches, isLoading: loading, error } = useFiches(buildFilters());

  // Gestion explicite du 401 : banner visible avec bouton (pas de redirection auto)
  const isAuthError = error?.message?.includes('401') || error?.message?.includes('Session expirée');

  // Get appropriate page title based on user role
  const getPageTitle = () => {
    if (userRole === ROLES.ADMIN || userRole === ROLES.SUIVI_PROJETS) {
      return 'Toutes les fiches navettes';
    } else if (userRole === ROLES.CD) {
      const urlParams = new URLSearchParams(window.location.search);
      const isValidationPage = urlParams.get('state') === 'SUBMITTED_TO_CD';
      return isValidationPage ? 'Fiches à valider - Conseil Départemental' : 'Consulter les fiches - Conseil Départemental';
    } else if (userRole === ROLES.RELATIONS_EVS) {
      return 'Fiches de votre territoire';
    } else if (userRole === ROLES.EVS_CS) {
      return 'Vos fiches attribuées';
    } else if (userRole === ROLES.EMETTEUR) {
      return 'Vos fiches navettes';
    }
    return 'Fiches navettes';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getGuardianName = (fiche) => {
    try {
      const family = fiche.family;
      const familyData = fiche.familyDetailedData;

      if (!family && !familyData) return 'Nom non disponible';

      if (familyData?.autoriteParentale) {
        // Handle both array (new schema) and string (legacy) formats
        let authorityRaw;
        if (Array.isArray(familyData.autoriteParentale)) {
          authorityRaw = familyData.autoriteParentale[0]; // Take first authority
        } else if (typeof familyData.autoriteParentale === 'string') {
          authorityRaw = familyData.autoriteParentale;
        }

        if (authorityRaw) {
          const authority = authorityRaw
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

          switch (authority) {
            case 'mere':
              return familyData.mother || family?.mother || 'Nom non disponible';
            case 'pere':
              return familyData.father || family?.father || 'Nom non disponible';
            case 'tiers':
              return (
                familyData.tiers ||
                family?.guardian ||
                family?.tiers ||
                'Nom non disponible'
              );
            default:
              break;
          }
        }
      }

      if (family?.mother) return family.mother;
      if (family?.father) return family.father;
      if (family?.guardian) return family.guardian;

      return 'Nom non disponible';
    } catch (err) {
      console.error('getGuardianName error:', err, fiche);
      return 'Nom non disponible';
    }
  };

  return (
    <div className={styles.fichesContainer}>
      <Header />
      
      <main className={styles.mainContent}>
        <div className={styles.headerSection}>
          <div className={styles.titleSection}>
            <h1 className={styles.pageTitle}>
              <FileText className={styles.titleIcon} />
              {getPageTitle()}
            </h1>
            <p className={styles.pageSubtitle}>
              {userRole === ROLES.ADMIN || userRole === ROLES.SUIVI_PROJETS 
                ? 'Consultez et gérez toutes les fiches de la plateforme'
                : userRole === ROLES.CD
                ? 'Validez ou refusez les fiches soumises par les émetteurs'
                : userRole === ROLES.RELATIONS_EVS
                ? 'Consultez les fiches de votre périmètre territorial'
                : userRole === ROLES.EVS_CS
                ? 'Consultez les fiches qui vous sont attribuées'
                : 'Consultez et gérez vos fiches navettes'
              }
            </p>
          </div>

          <div className={styles.actionsSection}>
            {hasPermission(userRole, ACTIONS.CREATE_FICHE) && (
              <Link href="/fiches/new">
                <Button className={styles.createButton}>
                  <Plus className={styles.buttonIcon} />
                  Nouvelle fiche
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filtersSection}>
          <div className={styles.searchSection}>
            <Search className={styles.searchIcon} />
            <Input
              placeholder="Rechercher par nom de famille, référence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
              data-testid="input-search-fiches"
            />
          </div>

          {/* Only show status filter for non-CD users or CD users in "Consulter les Fiches" mode */}
          {(userRole !== ROLES.CD || (userRole === ROLES.CD && new URLSearchParams(window.location.search).get('state') !== 'SUBMITTED_TO_CD')) && (
            <div className={styles.filterSection}>
              <Filter className={styles.filterIcon} />
              <select 
                className={styles.stateFilter}
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                data-testid="select-state-filter"
              >
                <option value="">Filtrer par état</option>
                <option value="all">Tous les états</option>
                {Object.entries(FILTERABLE_STATES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Error banner with explicit 401 handling */}
        {error && (
          <div className={styles.errorBanner}>
            <AlertTriangle className={styles.errorIcon} />
            <div className={styles.errorContent}>
              <p className={styles.errorMessage}>
                {isAuthError 
                  ? 'Session expirée'
                  : error.message || 'Erreur lors du chargement des fiches'}
              </p>
              {isAuthError && (
                <Button 
                  onClick={() => window.location.href = '/login'}
                  className={styles.loginButton}
                >
                  Se reconnecter
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Fiches list */}
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Chargement des fiches...</p>
          </div>
        ) : !error && (
          <div className={styles.fichesGrid}>
            {fiches.length > 0 ? (
              fiches.map((fiche) => (
                <Card key={fiche.id} className={styles.ficheCard}>
                  <CardContent className={styles.cardContent}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardTitle}>
                        <span className={styles.ficheRef}>#{fiche.ref}</span>
                        <Badge 
                          variant={STATE_COLORS[fiche.state] || 'default'}
                          className={styles.stateBadge}
                        >
                          {STATE_LABELS[fiche.state] || fiche.state}
                        </Badge>
                      </div>
                      <span className={styles.createDate}>
                        <Calendar className={styles.dateIcon} />
                        {formatDate(fiche.createdAt)}
                      </span>
                    </div>

                    <div className={styles.ficheInfo}>
                      <h3 className={styles.familyName}>{getGuardianName(fiche)}</h3>
                      
                      <div className={styles.ficheDetails}>
                        <div className={styles.detailItem}>
                          <User className={styles.detailIcon} />
                          <span>Émetteur: {fiche.emitter?.firstName} {fiche.emitter?.lastName}</span>
                        </div>
                        
                        {fiche.assignedOrg && (
                          <div className={styles.detailItem}>
                            <Building className={styles.detailIcon} />
                            <span>Assignée à: {fiche.assignedOrg.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.cardActions}>
                      <Link href={`/fiches/${fiche.id}`}>
                        <Button variant="outline" size="sm" data-testid={`button-view-fiche-${fiche.id}`}>
                          <Eye className={styles.actionIcon} />
                          Consulter
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className={styles.emptyState}>
                <FileText className={styles.emptyIcon} />
                <h3>Aucune fiche trouvée</h3>
                <p>
                  {searchTerm || (stateFilter && stateFilter !== 'all') 
                    ? 'Aucune fiche ne correspond aux critères de recherche.'
                    : 'Aucune fiche navette n\'est disponible pour le moment.'
                  }
                </p>
                {hasPermission(userRole, ACTIONS.CREATE_FICHE) && !searchTerm && (!stateFilter || stateFilter === 'all') && (
                  <Link href="/fiches/new">
                    <Button className={styles.createFirstButton}>
                      <Plus className={styles.buttonIcon} />
                      Créer votre première fiche
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}