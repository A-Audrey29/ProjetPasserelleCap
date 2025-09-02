import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFiches } from '@/hooks/useFiches';
import Header from '@/components/Layout/Header';
import FicheForm from '@/components/Fiches/FicheForm';
import { useToast } from '@/hooks/use-toast';

export default function FicheCreation() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { createFiche } = useFiches();
  const { toast } = useToast();

  // Redirect if not authenticated or not authorized
  useEffect(() => {
    const userRole = user?.user?.role || user?.role;
    if (!authLoading && (!isAuthenticated || !['ADMIN', 'EMETTEUR', 'RELATIONS_EVS'].includes(userRole))) {
      setLocation('/');
    }
  }, [isAuthenticated, authLoading, user, setLocation]);

  const handleSubmit = async (formData) => {
    try {
      const fiche = await createFiche(formData);
      
      toast({
        title: "Fiche créée avec succès",
        description: `La fiche ${fiche.ref} a été envoyée à FEVES`,
        variant: "default"
      });

      setLocation(`/fiches/${fiche.id}`);
    } catch (error) {
      toast({
        title: "Erreur lors de la création",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      });
    }
  };

  const handleSaveDraft = async (formData) => {
    try {
      // Save as draft by setting state to DRAFT
      const ficheData = { ...formData, state: 'DRAFT' };
      const fiche = await createFiche(ficheData);
      
      toast({
        title: "Brouillon sauvegardé",
        description: `La fiche ${fiche.ref} a été sauvegardée en brouillon`,
        variant: "default"
      });

      setLocation(`/fiches/${fiche.id}`);
    } catch (error) {
      toast({
        title: "Erreur lors de la sauvegarde",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      });
    }
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

  const userRole = user?.user?.role || user?.role;
  if (!isAuthenticated || !['ADMIN', 'EMETTEUR', 'RELATIONS_EVS'].includes(userRole)) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span 
              onClick={() => setLocation('/')}
              className="hover:text-foreground transition-colors text-[#404040] cursor-pointer"
              data-testid="link-dashboard"
            >
              Tableau de bord
            </span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#404040]">Nouvelle fiche navette</span>
          </div>
          <h1 className="text-2xl font-bold text-[#404040]" data-testid="text-page-title">
            Créer une fiche navette
          </h1>
        </div>

        <FicheForm
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
        />
      </main>
    </div>
  );
}
