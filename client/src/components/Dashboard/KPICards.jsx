import { FileText, Clock, Users, Euro } from 'lucide-react';

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
    },
    {
      title: 'Budget engagé',
      value: `€${(stats.totalBudget || 0).toLocaleString()}`,
      icon: Euro,
      color: 'primary',
      testId: 'kpi-total-budget'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const colorClass = `text-${kpi.color}`;
        const bgColorClass = `bg-${kpi.color}/10`;
        
        return (
          <div key={kpi.title} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{kpi.title}</p>
                <p 
                  className={`text-2xl font-bold ${colorClass}`}
                  data-testid={kpi.testId}
                >
                  {kpi.value}
                </p>
              </div>
              <div className={`kpi-icon ${bgColorClass} rounded`}>
                <Icon className={`w-6 h-6 ${colorClass}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
