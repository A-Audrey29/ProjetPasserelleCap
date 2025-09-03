import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Plus, Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFiches, useDashboardStats } from '@/hooks/useFiches';
import Header from '@/components/Layout/Header';
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

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export data');
  };

  const handleCreateFiche = () => {
    setLocation('/fiches/new');
  };

  return (
    <div className={styles.dashboardContainer}>
      <Header />

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