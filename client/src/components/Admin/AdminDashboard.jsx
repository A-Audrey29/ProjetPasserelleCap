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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Administration</h1>
        <p className="text-muted-foreground">
          Gestion des utilisateurs, organisations et paramètres
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Link href="/admin/users/new">
          <button className="btn btn-primary" data-testid="button-new-user">
            <Plus className="w-4 h-4 mr-2" />
            Nouvel utilisateur
          </button>
        </Link>
        <Link href="/admin/organizations/new">
          <button className="btn btn-secondary" data-testid="button-new-organization">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle organisation
          </button>
        </Link>
        <Link href="/admin/workshops/new">
          <button className="btn btn-secondary" data-testid="button-new-workshop">
            <Plus className="w-4 h-4 mr-2" />
            Nouvel atelier
          </button>
        </Link>
      </div>

      {/* Admin Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminModules.map((module) => {
          const Icon = module.icon;
          const colorClasses = {
            primary: 'bg-primary/10 text-primary',
            success: 'bg-success/10 text-success',
            warning: 'bg-warning/10 text-warning',
            accent: 'bg-accent text-accent-foreground',
            muted: 'bg-muted text-muted-foreground',
            destructive: 'bg-destructive/10 text-destructive'
          };
          
          return (
            <Link key={module.href} href={module.href}>
              <div 
                className="card hover:shadow-md transition-shadow cursor-pointer h-full"
                data-testid={module.testId}
              >
                <div className="flex items-center mb-3">
                  <div className={`p-2 rounded-md mr-3 ${colorClasses[module.color]}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-foreground">{module.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3 flex-1">
                  {module.description}
                </p>
                <div className={`text-sm font-medium ${colorClasses[module.color].split(' ')[1]}`}>
                  {module.stat}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <div className="card">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Activité récente
          </h2>
          <div className="space-y-3">
            {/* This would be populated with recent admin activities */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <div>
                <p className="font-medium text-foreground">Nouvel utilisateur créé</p>
                <p className="text-sm text-muted-foreground">Marie Dubois (EMETTEUR)</p>
              </div>
              <span className="text-xs text-muted-foreground">Il y a 2h</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <div>
                <p className="font-medium text-foreground">Organisation modifiée</p>
                <p className="text-sm text-muted-foreground">Association Entraide - Coordonnées mises à jour</p>
              </div>
              <span className="text-xs text-muted-foreground">Il y a 4h</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <div>
                <p className="font-medium text-foreground">Nouvel atelier ajouté</p>
                <p className="text-sm text-muted-foreground">Communication parent-enfant (OBJ1)</p>
              </div>
              <span className="text-xs text-muted-foreground">Hier</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
