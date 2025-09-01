import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Plus, Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFiches, useDashboardStats } from '@/hooks/useFiches';
import Sidebar from '@/components/Layout/Sidebar';
import KPICards from '@/components/Dashboard/KPICards';
import FilterBar from '@/components/Dashboard/FilterBar';
import FichesList from '@/components/Fiches/FichesList';

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [filters, setFilters] = useState({
    search: '',
    state: '',
    epsiId: '',
    assignedOrgId: ''
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, authLoading, setLocation]);

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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <main className="main-content">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-dashboard-title">
              Tableau de bord
            </h1>
            <p className="text-muted-foreground">
              Vue d'ensemble des fiches navettes
            </p>
          </div>
          <div className="flex gap-2">
            {user?.role === 'EMETTEUR' && (
              <button 
                className="btn btn-primary"
                onClick={handleCreateFiche}
                data-testid="button-create-fiche"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle fiche navette
              </button>
            )}
            <button 
              className="btn btn-secondary"
              onClick={handleExport}
              data-testid="button-export"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </button>
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
