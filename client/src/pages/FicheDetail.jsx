import { useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFiche } from '@/hooks/useFiches';
import Sidebar from '@/components/Layout/Sidebar';
import FicheDetail from '@/components/Fiches/FicheDetail';
import StatusBadge from '@/components/Common/StatusBadge';

export default function FicheDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { fiche, isLoading, error } = useFiche(id);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, authLoading, setLocation]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Chargement de la fiche...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  if (error || !fiche) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-destructive font-medium mb-2">
                Erreur lors du chargement
              </p>
              <p className="text-muted-foreground">
                {error?.message || 'Fiche non trouvée'}
              </p>
              <button 
                className="btn btn-secondary mt-4"
                onClick={() => setLocation('/')}
                data-testid="button-back-dashboard"
              >
                Retour au tableau de bord
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <main className="main-content">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <button 
              onClick={() => setLocation('/')}
              className="hover:text-foreground transition-colors"
              data-testid="link-dashboard"
            >
              Tableau de bord
            </button>
            <ChevronRight className="w-4 h-4" />
            <span>Fiche {fiche.ref}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-fiche-title">
                Fiche navette {fiche.ref}
              </h1>
              <p className="text-muted-foreground" data-testid="text-family-info">
                Famille {fiche.family?.code}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge state={fiche.state} />
            </div>
          </div>
        </div>

        <FicheDetail ficheId={id} />
      </main>
    </div>
  );
}
