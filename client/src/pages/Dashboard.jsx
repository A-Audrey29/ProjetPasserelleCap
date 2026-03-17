import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Plus, Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFiches, useDashboardStats } from '@/hooks/useFiches';
import KPICards from '@/components/Dashboard/KPICards';
import FilterBar from '@/components/Dashboard/FilterBar';
import FichesList from '@/components/Fiches/FichesList';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [filters, setFilters] = useState({
    search: '',
    state: '',
    epsiId: '',
    assignedOrgId: ''
  });

  // Queries for dashboard data
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { fiches, isLoading: fichesLoading, refetch } = useFiches(filters);

  // Reference data queries
  const { data: epsiList = [] } = useQuery({
    queryKey: ['/api/epsi'],
    enabled: isAuthenticated
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['/api/organizations'],
    enabled: isAuthenticated
  });

  const { data: objectives = [] } = useQuery({
    queryKey: ['/api/objectives'],
    enabled: isAuthenticated
  });

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleExport = async () => {
    try {
      // Construire les query params avec les filtres actifs
      const params = new URLSearchParams();
      if (filters.state) params.append('state', filters.state);
      if (filters.assignedOrgId) params.append('assignedOrgId', filters.assignedOrgId);
      if (filters.search) params.append('search', filters.search);

      // Appeler l'endpoint d'export avec auth par cookie
      const response = await fetch(`/api/export/fiches?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      // Télécharger le fichier
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cap-fiches-navettes-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[Export] Erreur:', error);
    }
  };

  const handleCreateFiche = () => {
    setLocation('/fiches/new');
  };

  return (
    <div className={styles.dashboardContainer}>
      <main className={styles.mainContent}>
        {/* Header */}
        <div className={styles.headerSection}>
          <div className={styles.headerContent}>
            <h1 data-testid="text-dashboard-title">
              Tableau de bord
            </h1>
            <p>
              Vue d'ensemble des fiches navettes
            </p>
          </div>
          <div className={styles.actionButtons}>
            {(user?.role === 'EMETTEUR' || user?.role === 'RELATIONS_EVS') && (
              <button 
                className={styles.createButton}
                onClick={handleCreateFiche}
                data-testid="button-create-fiche"
              >
                <Plus className="w-4 h-4" />
                Nouvelle fiche navette
              </button>
            )}
            {user?.role !== 'RELATIONS_EVS' && (
              <button 
                className={styles.exportButton}
                onClick={handleExport}
                data-testid="button-export"
              >
                <Download className="w-4 h-4" />
                Exporter
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <KPICards stats={stats} />

        {/* Filters */}
        <FilterBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          epsiList={epsiList}
          organizations={organizations}
          objectives={objectives}
          userRole={user?.role}
        />

        {/* Fiches List */}
        <FichesList
          fiches={fiches}
          isLoading={fichesLoading}
          onRefresh={refetch}
          pagination={{
            page: 1,
            totalPages: 1,
            totalItems: fiches.length
          }}
        />
      </main>
    </div>
  );
}