import { Link } from 'wouter';
import { 
  Users, 
  Building, 
  Building2, 
  Target, 
  Cog, 
  ShieldCheck,
  Plus
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
  // Query for admin stats
  const { data: stats = {} } = useQuery({
    queryKey: ['/api/admin/stats'],
    enabled: true
  });

  const adminModules = [
    {
      title: 'Utilisateurs',
      description: 'Gestion des comptes utilisateurs et attribution des rôles',
      icon: Users,
      href: '/admin/users',
      stat: `${stats.totalUsers || 0} utilisateurs actifs`,
      color: 'primary',
      testId: 'card-users'
    },
    {
      title: 'EPSI',
      description: 'Configuration des Espaces Partenariaux de Sécurité et d\'Insertion',
      icon: Building,
      href: '/admin/epsi',
      stat: `${stats.totalEPSI || 0} EPSI configurées`,
      color: 'success',
      testId: 'card-epsi'
    },
    {
      title: 'EVS/CS',
      description: 'Gestion des Espaces de Vie Sociale et Centres Sociaux',
      icon: Building2,
      href: '/admin/organizations',
      stat: `${stats.totalOrganizations || 0} organisations`,
      color: 'warning',
      testId: 'card-organizations'
    },
    {
      title: 'Ateliers',
      description: 'Configuration des ateliers et objectifs pédagogiques',
      icon: Target,
      href: '/admin/workshops',
      stat: `${stats.totalWorkshops || 0} ateliers disponibles`,
      color: 'accent',
      testId: 'card-workshops'
    },
    {
      title: 'Paramètres',
      description: 'Configuration générale et modèles de documents',
      icon: Cog,
      href: '/admin/settings',
      stat: 'Configuration système',
      color: 'muted',
      testId: 'card-settings'
    },
    {
      title: 'Audit',
      description: 'Consultation des logs d\'audit et traçabilité',
      icon: ShieldCheck,
      href: '/admin/audit',
      stat: `${stats.auditEntries || 0} entrées`,
      color: 'destructive',
      testId: 'card-audit'
    }
  ];

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <h1 className={styles.dashboardTitle}>Administration</h1>
        <p className={styles.dashboardDescription}>
          Gestion des utilisateurs, organisations et paramètres
        </p>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <Link href="/admin/users/new">
          <button className={styles.actionButton} data-testid="button-new-user">
            <Plus className={styles.icon} />
            Nouvel utilisateur
          </button>
        </Link>
        <Link href="/admin/organizations/new">
          <button className={`${styles.actionButton} ${styles.actionButtonSecondary}`} data-testid="button-new-organization">
            <Plus className={styles.icon} />
            Nouvelle organisation
          </button>
        </Link>
        <Link href="/admin/workshops/new">
          <button className={`${styles.actionButton} ${styles.actionButtonSecondary}`} data-testid="button-new-workshop">
            <Plus className={styles.icon} />
            Nouvel atelier
          </button>
        </Link>
      </div>

      {/* Admin Modules Grid */}
      <div className={styles.modulesGrid}>
        {adminModules.map((module) => {
          const Icon = module.icon;
          
          return (
            <Link key={module.href} href={module.href}>
              <div 
                className={styles.moduleCard}
                data-testid={module.testId}
              >
                <div className={styles.moduleHeader}>
                  <div className={`${styles.moduleIcon} ${styles[module.color]}`}>
                    <Icon className={styles.iconLarge} />
                  </div>
                  <h3 className={styles.moduleTitle}>{module.title}</h3>
                </div>
                <p className={styles.moduleDescription}>
                  {module.description}
                </p>
                <div className={`${styles.moduleStat} ${styles[module.color]}`}>
                  {module.stat}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className={styles.recentActivity}>
        <div className={styles.activityCard}>
          <h2 className={styles.activityTitle}>
            Activité récente
          </h2>
          <div className={styles.activityList}>
            {/* This would be populated with recent admin activities */}
            <div className={styles.activityItem}>
              <div className={styles.activityContent}>
                <p className={styles.activityAction}>Nouvel utilisateur créé</p>
                <p className={styles.activityDetails}>Marie Dubois (EMETTEUR)</p>
              </div>
              <span className={styles.activityTime}>Il y a 2h</span>
            </div>
            <div className={styles.activityItem}>
              <div className={styles.activityContent}>
                <p className={styles.activityAction}>Organisation modifiée</p>
                <p className={styles.activityDetails}>Association Entraide - Coordonnées mises à jour</p>
              </div>
              <span className={styles.activityTime}>Il y a 4h</span>
            </div>
            <div className={styles.activityItem}>
              <div className={styles.activityContent}>
                <p className={styles.activityAction}>Nouvel atelier ajouté</p>
                <p className={styles.activityDetails}>Communication parent-enfant (OBJ1)</p>
              </div>
              <span className={styles.activityTime}>Hier</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
