import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Target, 
  AlertTriangle, 
  TrendingUp, 
  Building2,
  Users,
  BarChart3
} from 'lucide-react';
import { calculateWorkshopStats, checkQuotaAlerts, generateDashboardSummary } from '../../utils/workshopStats';
import styles from './AdminWorkshopsTab.module.css';

export default function AdminWorkshopsTab() {
  const [selectedView, setSelectedView] = useState('overview');

  // Fetch required data
  const { data: fiches = [] } = useQuery({
    queryKey: ['/api/fiches']
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ['/api/workshops']
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['/api/organizations']
  });

  // Calculate workshop statistics based on selectedWorkshops (checkboxes)
  const stats = calculateWorkshopStats(fiches, workshops, organizations);
  const quotaAlerts = checkQuotaAlerts(stats);
  const summary = generateDashboardSummary({ ...stats, quotaAlerts });

  const viewTabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'workshops', label: 'Par Atelier', icon: Target },
    { id: 'organizations', label: 'Par Structure', icon: Building2 },
    { id: 'alerts', label: 'Alertes Quotas', icon: AlertTriangle }
  ];

  const renderOverview = () => (
    <div className={styles.overviewGrid}>
      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <Target />
        </div>
        <div className={styles.statContent}>
          <h3>Ateliers Sélectionnés</h3>
          <p className={styles.statNumber}>{summary.totalSelectedWorkshops}</p>
          <span className={styles.statLabel}>Total basé sur les coches</span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <Building2 />
        </div>
        <div className={styles.statContent}>
          <h3>Structures Actives</h3>
          <p className={styles.statNumber}>{summary.totalActiveOrganizations}</p>
          <span className={styles.statLabel}>Avec ateliers attribués</span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <AlertTriangle />
        </div>
        <div className={styles.statContent}>
          <h3>Alertes Quotas</h3>
          <p className={styles.statNumber}>
            {summary.criticalAlerts + summary.warningAlerts}
          </p>
          <span className={styles.statLabel}>
            {summary.criticalAlerts} critiques, {summary.warningAlerts} préventives
          </span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <TrendingUp />
        </div>
        <div className={styles.statContent}>
          <h3>Atelier Populaire</h3>
          <p className={styles.statNumber}>
            {summary.topWorkshops[0]?.totalSelections || 0}
          </p>
          <span className={styles.statLabel}>
            {summary.topWorkshops[0]?.name || 'Aucun'}
          </span>
        </div>
      </div>
    </div>
  );

  const renderWorkshopsView = () => (
    <div className={styles.workshopsTable}>
      <h3>Statistiques par Atelier (basées sur les coches)</h3>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Atelier</th>
              <th>Objectif</th>
              <th>Sélections</th>
              <th>Structures Assignées</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(stats.byWorkshop)
              .sort((a, b) => b.totalSelections - a.totalSelections)
              .map(workshop => (
                <tr key={workshop.workshopId} data-testid={`row-workshop-${workshop.workshopId}`}>
                  <td>{workshop.name}</td>
                  <td>{workshop.objectiveId}</td>
                  <td className={styles.numberCell}>{workshop.totalSelections}</td>
                  <td className={styles.numberCell}>
                    {Object.keys(workshop.byOrganization).length}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                      Actif
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderOrganizationsView = () => (
    <div className={styles.organizationsTable}>
      <h3>Statistiques par Structure EVS/CS</h3>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Structure</th>
              <th>Total Sélections</th>
              <th>Ateliers Différents</th>
              <th>Objectifs Couverts</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(stats.byOrganization)
              .filter(org => org.totalSelections > 0)
              .sort((a, b) => b.totalSelections - a.totalSelections)
              .map(org => (
                <tr key={org.orgId} data-testid={`row-organization-${org.orgId}`}>
                  <td>{org.name}</td>
                  <td className={styles.numberCell}>{org.totalSelections}</td>
                  <td className={styles.numberCell}>
                    {Object.keys(org.workshopCounts).length}
                  </td>
                  <td className={styles.numberCell}>
                    {Object.keys(org.objectiveCounts).length}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                      Actif
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAlertsView = () => (
    <div className={styles.alertsSection}>
      <h3>Alertes de Quotas</h3>
      {quotaAlerts.length > 0 ? (
        <div className={styles.alertsList}>
          {quotaAlerts.map((alert, index) => (
            <div 
              key={index} 
              className={`${styles.alert} ${styles[`alert${alert.level === 'critical' ? 'Critical' : 'Warning'}`]}`}
              data-testid={`alert-${alert.type}-${index}`}
            >
              <div className={styles.alertIcon}>
                <AlertTriangle />
              </div>
              <div className={styles.alertContent}>
                <h4>{alert.level === 'critical' ? 'Critique' : 'Attention'}</h4>
                <p>{alert.message}</p>
                <span className={styles.alertDetails}>
                  {alert.current}/{alert.limit} utilisations
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.noAlerts}>
          <p>Aucune alerte de quota actuellement</p>
          <span>Tous les ateliers sont dans les limites normales</span>
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.workshopsTab}>
      <div className={styles.header}>
        <h2>Suivi des Ateliers</h2>
        <p>Gestion des quotas et statistiques basées sur les sélections (coches)</p>
      </div>

      <div className={styles.tabsNavigation}>
        {viewTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedView(tab.id)}
            className={`${styles.tabButton} ${selectedView === tab.id ? styles.active : ''}`}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className={styles.tabIcon} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {selectedView === 'overview' && renderOverview()}
        {selectedView === 'workshops' && renderWorkshopsView()}
        {selectedView === 'organizations' && renderOrganizationsView()}
        {selectedView === 'alerts' && renderAlertsView()}
      </div>

      <div className={styles.footer}>
        <p className={styles.footerNote}>
          <strong>Note importante :</strong> Les statistiques sont basées sur les ateliers cochés 
          (selectedWorkshops) uniquement. Les propositions sans coches ne sont pas comptabilisées 
          dans les quotas.
        </p>
      </div>
    </div>
  );
}