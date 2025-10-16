import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFiches } from '@/hooks/useFiches';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';
import FicheForm from '@/components/Fiches/FicheForm';
import { useToast } from '@/hooks/use-toast';
import styles from './FicheCreation.module.css';

export default function FicheCreation() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const ficheId = params.id; // Will be undefined for new fiches
  const isEditMode = !!ficheId;
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { createFiche, updateFiche } = useFiches();
  const { toast } = useToast();
  
  // Query for existing fiche data if in edit mode
  const { data: existingFiche, isLoading: ficheLoading } = useQuery({
    queryKey: ['/api/fiches', ficheId],
    enabled: isEditMode,
  });

  // Redirect if not authenticated or not authorized
  useEffect(() => {
    const userRole = user?.user?.role || user?.role;
    if (!authLoading && (!isAuthenticated || !['ADMIN', 'EMETTEUR', 'RELATIONS_EVS'].includes(userRole))) {
      setLocation('/');
    }
  }, [isAuthenticated, authLoading, user, setLocation]);

  const handleSubmit = async (formData) => {
    try {
      let fiche;
      if (isEditMode) {
        fiche = await updateFiche({ id: ficheId, data: formData });
        toast({
          title: "Fiche modifiée avec succès",
          description: `La fiche ${fiche.ref} a été mise à jour et envoyée`,
          variant: "default"
        });
      } else {
        fiche = await createFiche(formData);
        toast({
          title: "Fiche créée avec succès",
          description: `La fiche ${fiche.ref} a été envoyée à FEVES`,
          variant: "default"
        });
      }

      setLocation(`/fiches/${fiche.id}`);
      return fiche;
    } catch (error) {
      toast({
        title: isEditMode ? "Erreur lors de la modification" : "Erreur lors de la création",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleSaveDraft = async (formData) => {
    try {
      let fiche;
      if (isEditMode) {
        // Update existing fiche as draft
        const ficheData = { ...formData, state: 'DRAFT' };
        fiche = await updateFiche({ id: ficheId, data: ficheData });
      } else {
        // Save as draft by setting state to DRAFT
        const ficheData = { ...formData, state: 'DRAFT' };
        fiche = await createFiche(ficheData);
      }
      
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

  if (authLoading || (isEditMode && ficheLoading)) {
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
            <span className={styles.breadcrumbCurrent}>{isEditMode ? 'Modifier fiche navette' : 'Nouvelle fiche navette'}</span>
          </div>
          <h1 className={styles.pageTitle} data-testid="text-page-title">
            {isEditMode ? 'Modifier la fiche navette' : 'Créer une fiche navette'}
          </h1>
        </div>

        <FicheForm
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          initialData={isEditMode ? existingFiche : null}
          isEditing={isEditMode}
        />
      </main>
      <Footer />
    </div>
  );
}
