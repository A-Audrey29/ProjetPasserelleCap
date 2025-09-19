import { useState } from 'react';
import { 
  Users, 
  Building2, 
  Plus,
  LayoutGrid
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import AdminUsersTab from './AdminUsersTab';
import AdminStructuresTab from './AdminStructuresTab';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
  // État pour gérer l'onglet actif
  const [activeTab, setActiveTab] = useState('overview');

  // Query for admin stats
  const { data: stats = {} } = useQuery({
    queryKey: ['/api/admin/stats'],
    enabled: true
  });

  // Configuration des onglets
  const tabs = [
    { 
      id: 'overview', 
      label: 'Tableau de bord', 
      icon: LayoutGrid,
      testId: 'tab-overview'
    },
    { 
      id: 'users', 
      label: 'Utilisateurs', 
      icon: Users,
      testId: 'tab-users'
    },
    { 
      id: 'structures', 
      label: 'Structures', 
      icon: Building2,
      testId: 'tab-structures'
    }
  ];

  const adminModules = [
    {
      id: 'users',
      title: 'Utilisateurs',
      description: 'Gestion des comptes utilisateurs et attribution des rôles',
      icon: Users,
      action: () => setActiveTab('users'),
      stat: `${stats.totalUsers || 0} utilisateurs actifs`,
      color: 'primary',
      testId: 'card-users'
    },
    {
      id: 'structures',
      title: 'EVS/CS',
      description: 'Gestion des Espaces de Vie Sociale et Centres Sociaux',
      icon: Building2,
      action: () => setActiveTab('structures'),
      stat: `${stats.totalOrganizations || 0} organisations`,
      color: 'warning',
      testId: 'card-organizations'
    }
  ];

  return (
    <div className={styles.dashboardContainer}>
      {/* Navigation par onglets */}
      <div className={styles.tabsNavigation}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`${styles.tabButton} ${
                activeTab === tab.id ? styles.tabActive : ''
              }`}
              onClick={() => setActiveTab(tab.id)}
              data-testid={tab.testId}
            >
              <Icon size={18} className={styles.tabIcon} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenu conditionnel selon l'onglet */}
      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <>
            <div className={styles.dashboardHeader}>
              <h1 className={styles.dashboardTitle}>Administration</h1>
              <p className={styles.dashboardDescription}>
                Gestion des utilisateurs, organisations et paramètres
              </p>
            </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <button className={styles.actionButton} onClick={() => setActiveTab('users')} data-testid="button-new-user">
          <Plus className={styles.icon} />
          Nouvel utilisateur
        </button>
        <button className={`${styles.actionButton} ${styles.actionButtonSecondary}`} onClick={() => setActiveTab('structures')} data-testid="button-new-organization">
          <Plus className={styles.icon} />
          Nouvelle organisation
        </button>
      </div>

      {/* Admin Modules Grid */}
      <div className={styles.modulesGrid}>
        {adminModules.filter(module => module.action !== 'disabled').map((module) => {
          const Icon = module.icon;
          
          return (
            <div
              key={module.id}
              className={styles.moduleCard}
              onClick={() => module.action && module.action()}
              data-testid={module.testId}
              style={{ cursor: module.action ? 'pointer' : 'default' }}
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
          </>
        )}

        {/* Onglet Utilisateurs */}
        {activeTab === 'users' && <AdminUsersTab />}

        {/* Onglet Structures */}
        {activeTab === 'structures' && <AdminStructuresTab />}
      </div>
    </div>
  );
}
