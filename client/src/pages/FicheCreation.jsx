import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFiches } from '@/hooks/useFiches';
import Header from '@/components/Layout/Header';
import FicheForm from '@/components/Fiches/FicheForm';
import { useToast } from '@/hooks/use-toast';
import styles from './FicheCreation.module.css';

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
      return fiche; // Return the created fiche
    } catch (error) {
      toast({
        title: "Erreur lors de la création",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      });
      throw error; // Re-throw the error so it can be caught by the caller
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
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Chargement...</p>
        </div>
      </div>
    );
  }

  const userRole = user?.user?.role || user?.role;
  if (!isAuthenticated || !['ADMIN', 'EMETTEUR', 'RELATIONS_EVS'].includes(userRole)) {
    return null; // Will redirect
  }

  return (
    <div className={styles.ficheCreationContainer}>
      <Header />
      <main className={styles.mainContent}>
        <div className={styles.headerSection}>
          <div className={styles.breadcrumb}>
            <span 
              onClick={() => setLocation('/')}
              className={styles.breadcrumbLink}
              data-testid="link-dashboard"
            >
              Tableau de bord
            </span>
            <ChevronRight className={styles.icon} />
            <span className={styles.breadcrumbCurrent}>Nouvelle fiche navette</span>
          </div>
          <h1 className={styles.pageTitle} data-testid="text-page-title">
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
