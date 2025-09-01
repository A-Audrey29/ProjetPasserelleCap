import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Download, Calendar, Filter, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/Layout/Sidebar';
import { formatDate, formatCurrency } from '@/utils/formatters';

export default function Reports() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    to: new Date().toISOString().split('T')[0] // Today
  });
  const [selectedReport, setSelectedReport] = useState('summary');

  // Redirect if not authenticated or not authorized
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !['ADMIN', 'SUIVI_PROJETS', 'RELATIONS_EVS'].includes(user?.role))) {
      setLocation('/');
    }
  }, [isAuthenticated, authLoading, user, setLocation]);

  // Query for report data
  const { data: reportData, isLoading: reportsLoading } = useQuery({
    queryKey: ['/api/reports', selectedReport, dateRange],
    queryFn: async () => {
      // This would be implemented on the backend
      return {
        summary: {
          totalFiches: 127,
          familiesHelped: 89,
          totalBudget: 45670,
          averageProcessingTime: 15,
          completionRate: 78
        },
        byObjective: {
          OBJ1: { count: 45, budget: 18500 },
          OBJ2: { count: 52, budget: 20100 },
          OBJ3: { count: 30, budget: 7070 }
        },
        byOrganization: [
          { name: 'Association Entraide', count: 25, budget: 12000 },
          { name: 'Centre Social Horizon', count: 18, budget: 8500 },
          { name: 'EVS Solidarité', count: 22, budget: 11200 }
        ],
        monthlyTrends: [
          { month: 'Jan', fiches: 8, budget: 3200 },
          { month: 'Fév', fiches: 12, budget: 4800 },
          { month: 'Mar', fiches: 15, budget: 6100 },
          { month: 'Avr', fiches: 18, budget: 7200 },
          { month: 'Mai', fiches: 22, budget: 8900 }
        ]
      };
    },
    enabled: isAuthenticated && ['ADMIN', 'SUIVI_PROJETS', 'RELATIONS_EVS'].includes(user?.role)
  });

  const reportTypes = [
    { id: 'summary', name: 'Synthèse générale', icon: BarChart3 },
    { id: 'families', name: 'Familles aidées', icon: BarChart3 },
    { id: 'organizations', name: 'Performance EVS/CS', icon: BarChart3 },
    { id: 'budget', name: 'Analyse budgétaire', icon: BarChart3 },
    { id: 'timeline', name: 'Temps de traitement', icon: BarChart3 }
  ];

  const handleExport = (format) => {
    // TODO: Implement export functionality
    console.log(`Export ${selectedReport} as ${format}`);
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

  if (!isAuthenticated || !['ADMIN', 'SUIVI_PROJETS', 'RELATIONS_EVS'].includes(user?.role)) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <main className="main-content">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-reports-title">
            Rapports et analyses
          </h1>
          <p className="text-muted-foreground">
            Consultation et export des données de la plateforme
          </p>
        </div>

        {/* Controls */}
        <div className="card mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Type de rapport
              </label>
              <select 
                className="input-field"
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                data-testid="select-report-type"
              >
                {reportTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Du
              </label>
              <input 
                type="date"
                className="input-field"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                data-testid="input-date-from"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Au
              </label>
              <input 
                type="date"
                className="input-field"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                data-testid="input-date-to"
              />
            </div>

            <div className="flex gap-2 mt-6">
              <button 
                className="btn btn-primary"
                onClick={() => handleExport('pdf')}
                data-testid="button-export-pdf"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => handleExport('csv')}
                data-testid="button-export-csv"
              >
                <Download className="w-4 h-4 mr-2" />
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {reportsLoading ? (
          <div className="card">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Génération du rapport...</p>
              </div>
            </div>
          </div>
        ) : selectedReport === 'summary' && reportData ? (
          <div className="space-y-6">
            {/* Summary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="card text-center">
                <div className="text-2xl font-bold text-primary">{reportData.summary.totalFiches}</div>
                <div className="text-sm text-muted-foreground">Fiches traitées</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold text-success">{reportData.summary.familiesHelped}</div>
                <div className="text-sm text-muted-foreground">Familles aidées</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold text-primary">{formatCurrency(reportData.summary.totalBudget * 100)}</div>
                <div className="text-sm text-muted-foreground">Budget total</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold text-warning">{reportData.summary.averageProcessingTime}j</div>
                <div className="text-sm text-muted-foreground">Délai moyen</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold text-success">{reportData.summary.completionRate}%</div>
                <div className="text-sm text-muted-foreground">Taux de réussite</div>
              </div>
            </div>

            {/* By Objective */}
            <div className="card">
              <h3 className="text-lg font-semibold text-foreground mb-4">Répartition par objectif</h3>
              <div className="space-y-3">
                {Object.entries(reportData.byObjective).map(([obj, data]) => (
                  <div key={obj} className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <div>
                      <span className="font-medium text-foreground">{obj}</span>
                      <span className="text-sm text-muted-foreground ml-2">({data.count} fiches)</span>
                    </div>
                    <span className="font-medium text-primary">{formatCurrency(data.budget * 100)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Organization */}
            <div className="card">
              <h3 className="text-lg font-semibold text-foreground mb-4">Performance par organisation</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-medium text-foreground">Organisation</th>
                      <th className="text-left p-3 font-medium text-foreground">Fiches traitées</th>
                      <th className="text-left p-3 font-medium text-foreground">Budget géré</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.byOrganization.map((org, index) => (
                      <tr key={index} className="border-b border-border">
                        <td className="p-3 text-foreground">{org.name}</td>
                        <td className="p-3 text-foreground">{org.count}</td>
                        <td className="p-3 text-foreground">{formatCurrency(org.budget * 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Monthly Trends */}
            <div className="card">
              <h3 className="text-lg font-semibold text-foreground mb-4">Évolution mensuelle</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {reportData.monthlyTrends.map((month) => (
                  <div key={month.month} className="text-center p-3 bg-muted rounded-md">
                    <div className="font-medium text-foreground">{month.month}</div>
                    <div className="text-sm text-muted-foreground">{month.fiches} fiches</div>
                    <div className="text-sm text-primary">{formatCurrency(month.budget * 100)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">Rapport en cours de développement</p>
              <p className="text-muted-foreground">Ce type de rapport sera disponible prochainement</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
