import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Eye, FileText, Plus, Search, Filter, Calendar, User, Building } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission, ROLES, ACTIONS } from '@/utils/permissions';
import Header from '@/components/Layout/Header';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/common/Select';
import { Badge } from '@/components/common/Badge';
import { Card, CardContent } from '@/components/common/Card';
import styles from './Fiches.module.css';

// State mapping for display
const STATE_LABELS = {
  'DRAFT': 'Brouillon',
  'SUBMITTED_TO_CD': 'Soumise au Conseil Départemental',
  'SUBMITTED_TO_FEVES': 'Soumise à FEVES',
  'ASSIGNED_TO_EVS': 'Assignée à EVS',
  'IN_PROGRESS': 'En cours',
  'COMPLETED': 'Terminée',
  'CLOSED': 'Fermée',
  'REJECTED': 'Rejetée',
  'CANCELLED': 'Annulée'
};

const STATE_COLORS = {
  'DRAFT': 'secondary',
  'SUBMITTED_TO_CD': 'default',
  'SUBMITTED_TO_FEVES': 'default',
  'ASSIGNED_TO_EVS': 'outline',
  'IN_PROGRESS': 'default',
  'COMPLETED': 'success',
  'CLOSED': 'success',
  'REJECTED': 'destructive',
  'CANCELLED': 'destructive'
};

export default function Fiches() {
  const { user } = useAuth();
  const [fiches, setFiches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  
  const userRole = user?.user?.role || user?.role;

  // Fetch fiches from API with role-based filtering
  useEffect(() => {
    const fetchFiches = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (stateFilter && stateFilter !== 'all') params.append('state', stateFilter);

        const response = await fetch(`/api/fiches?${params}`);
        if (response.ok) {
          const data = await response.json();
          setFiches(data);
        } else {
          console.error('Failed to fetch fiches:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching fiches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFiches();
  }, [searchTerm, stateFilter]);

  // Get appropriate page title based on user role
  const getPageTitle = () => {
    if (userRole === ROLES.ADMIN || userRole === ROLES.SUIVI_PROJETS) {
      return 'Toutes les fiches navettes';
    } else if (userRole === ROLES.CD) {
      return 'Fiches à valider - Conseil Départemental';
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

          <div className={styles.filterSection}>
            <Filter className={styles.filterIcon} />
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className={styles.stateFilter} data-testid="select-state-filter">
                <SelectValue placeholder="Filtrer par état" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les états</SelectItem>
                {Object.entries(STATE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                        <span className={styles.ficheRef}>#{fiche.id.slice(0, 8)}</span>
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
                      <h3 className={styles.familyName}>
                        {fiche.family?.lastName || 'Nom non disponible'}
                      </h3>
                      
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

                        <div className={styles.detailItem}>
                          <span className={styles.amount}>
                            Montant: {formatAmount(fiche.totalAmount)}
                          </span>
                        </div>
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