import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Eye, FileText, Plus, Search, Filter, Calendar, User, Building } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission, ROLES, ACTIONS } from '@/utils/permissions';
import Header from '@/components/Layout/Header';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Badge } from '@/components/common/Badge';
import { Card, CardContent } from '@/components/common/Card';
import styles from './Fiches.module.css';

// Import state labels from constants
import { STATE_LABELS } from '../utils/constants';

const STATE_COLORS = {
  'DRAFT': 'secondary',
  'SUBMITTED_TO_CD': 'default',
  'SUBMITTED_TO_FEVES': 'default',
  'ASSIGNED_EVS': 'outline',
  'IN_PROGRESS': 'default',
  'COMPLETED': 'success',
  'CLOSED': 'success',
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

  // Build query parameters for API call
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (stateFilter && stateFilter !== 'all') params.append('state', stateFilter);
    
    // For CD role filtering - check URL to determine which CD action
    if (userRole === ROLES.CD) {
      const urlParams = new URLSearchParams(window.location.search);
      const isValidationPage = urlParams.get('state') === 'SUBMITTED_TO_CD';
      
      if (isValidationPage) {
        // This is the "Fiches en attente de validations" action
        params.set('state', 'SUBMITTED_TO_CD'); // Use set() to avoid duplicates
      }
      // If not validation page, show all fiches ("Consulter les Fiches" action)
    }
    
    return params.toString();
  };

  // Fetch fiches using TanStack Query for proper cache management
  const queryParams = buildQueryParams();
  const { data: fiches = [], isLoading: loading } = useQuery({
    queryKey: ['/api/fiches', queryParams],
    queryFn: async () => {
      const response = await fetch(`/api/fiches?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch fiches');
      return response.json();
    },
    enabled: !!userRole
  });

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

  const formatAmount = (amountCents) => {
    if (!amountCents) return '0 €';
    return `${(amountCents / 100).toFixed(2)} €`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getGuardianName = (fiche) => {
    const family = fiche.family;
    const familyData = fiche.familyDetailedData;

    if (!family && !familyData) return 'Nom non disponible';

    if (familyData?.autoriteParentale) {
      const authority = familyData.autoriteParentale
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

    if (family?.mother) return family.mother;
    if (family?.father) return family.father;
    if (family?.guardian) return family.guardian;

    return 'Nom non disponible';
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
                {Object.entries(STATE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Fiches list */}
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Chargement des fiches...</p>
          </div>
        ) : (
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

                        {/* Only show amount for ADMIN and RELATIONS_EVS */}
                        {(user?.user?.role === 'ADMIN' || user?.role === 'ADMIN' || user?.user?.role === 'RELATIONS_EVS' || user?.role === 'RELATIONS_EVS') && (
                          <div className={styles.detailItem}>
                            <span className={styles.amount}>
                              Montant: {formatAmount(fiche.totalAmount)}
                            </span>
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
    </div>
  );
}