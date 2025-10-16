import { FileText, Clock, Users } from 'lucide-react';
import styles from './KPICards.module.css';

export default function KPICards({ stats = {} }) {
  const kpis = [
    {
      title: 'Fiches actives',
      value: stats.activeFiches || 0,
      icon: FileText,
      color: 'primary',
      testId: 'kpi-active-fiches'
    },
    {
      title: 'En attente d\'affectation',
      value: stats.pendingAssignment || 0,
      icon: Clock,
      color: 'warning',
      testId: 'kpi-pending-assignment'
    },
    {
      title: 'Familles aidées',
      value: stats.familiesHelped || 0,
      icon: Users,
      color: 'success',
      testId: 'kpi-families-helped'
    }
  ];

  return (
    <div className={styles.kpiGrid}>
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        
        return (
          <div key={kpi.title} className={styles.kpiCard}>
            <div className={styles.kpiContent}>
              <div className={styles.kpiData}>
                <p className={styles.kpiTitle}>{kpi.title}</p>
                <p 
                  className={`${styles.kpiValue} ${styles[kpi.color]}`}
                  data-testid={kpi.testId}
                >
                  {kpi.value}
                </p>
              </div>
              <div className={`${styles.kpiIconContainer} ${styles[kpi.color]}`}>
                <Icon className={`${styles.kpiIcon} ${styles[kpi.color]}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
