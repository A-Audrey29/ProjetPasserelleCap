import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import styles from './WorkshopSessionCard.module.css';

export default function WorkshopSessionCard({ session }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [contractEvs, setContractEvs] = useState(session?.contractSignedByEVS || false);
  const [contractCommune, setContractCommune] = useState(session?.contractSignedByCommune || false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [communePdfUrl, setCommunePdfUrl] = useState(session?.contractCommunePdfUrl || null);
  const [activityDone, setActivityDone] = useState(session?.activityDone || false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isMarkingDone, setIsMarkingDone] = useState(false);

  // Sync local state with server data when it changes
  useEffect(() => {
    setContractEvs(session?.contractSignedByEVS || false);
    setContractCommune(session?.contractSignedByCommune || false);
    setCommunePdfUrl(session?.contractCommunePdfUrl || null);
    setActivityDone(session?.activityDone || false);
  }, [session?.contractSignedByEVS, session?.contractSignedByCommune, session?.contractCommunePdfUrl, session?.activityDone]);

  // Calculate session state based on SERVER data, not local state
  const getSessionState = () => {
    // TERMINÉE if activity is done
    if (session?.activityDone) return 'TERMINÉE';
    // EN COURS if EITHER contract is signed (EVS/CS OR Commune, not both)
    if (session?.contractSignedByEVS || session?.contractSignedByCommune) return 'EN COURS';
    // PRÊTE if minimum capacity reached
    if (session?.participantCount >= session?.workshop?.minCapacity) return 'PRÊTE';
    return 'EN ATTENTE';
  };

  const sessionState = getSessionState();
  const isReady = sessionState === 'PRÊTE';
  const isInProgress = sessionState === 'EN COURS';
  const isDone = sessionState === 'TERMINÉE';

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Erreur",
        description: "Seuls les fichiers PDF sont acceptés",
        variant: "destructive"
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: "Erreur", 
        description: "Le fichier ne doit pas dépasser 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('contractFile', file);

      const response = await fetch(`/api/workshop-sessions/${session.id}/upload-contract`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setCommunePdfUrl(result.url);
      setUploadedFile(file);
      
      toast({
        title: "Succès",
        description: "Fichier uploadé avec succès"
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'upload du fichier",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    console.log('=== DÉBUT SAUVEGARDE ===');
    console.log('État AVANT sauvegarde:', {
      sessionId: session.id,
      contractEvs,
      contractCommune,
      communePdfUrl,
      sessionStateAvant: sessionState,
      isReadyAvant: isReady,
      isInProgressAvant: isInProgress
    });
    
    setIsSaving(true);
    try {
      const payload = {
        contractSignedByEVS: contractEvs,
        contractSignedByCommune: contractCommune,
        contractCommunePdfUrl: communePdfUrl
      };
      console.log('Payload envoyé:', payload);
      
      const response = await apiRequest('PATCH', `/api/workshop-sessions/${session.id}/contracts`, payload);
      console.log('Réponse reçue:', response.status, response.statusText);

      // Force refetch to get updated data immediately
      console.log('Refetch des données...');
      await queryClient.refetchQueries({ queryKey: ['/api/workshop-sessions'] });
      console.log('Données rafraîchies');
      
      console.log('État APRÈS sauvegarde:', {
        contractSignedByEVS: session?.contractSignedByEVS,
        contractSignedByCommune: session?.contractSignedByCommune,
        sessionStateApres: getSessionState()
      });

      toast({
        title: "Succès",
        description: "Contrats mis à jour avec succès"
      });
      console.log('=== FIN SAUVEGARDE (succès) ===');
    } catch (error) {
      console.error('=== ERREUR SAUVEGARDE ===', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la sauvegarde",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkActivityDone = async () => {
    setIsMarkingDone(true);
    try {
      const response = await apiRequest('POST', `/api/workshop-sessions/${session.id}/mark-activity-done`, {});
      
      // Force refetch to get updated data immediately
      await queryClient.refetchQueries({ queryKey: ['/api/workshop-sessions'] });
      
      toast({
        title: "Succès",
        description: "Activité marquée comme terminée. Notification envoyée à FEVES."
      });
    } catch (error) {
      console.error('Error marking activity done:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour de l'activité",
        variant: "destructive"
      });
    } finally {
      setIsMarkingDone(false);
    }
  };

  return (
    <div className={styles.card} data-testid={`card-workshop-session-${session?.id}`}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>{session?.workshop?.name}</h3>
        <div className={styles.sessionInfo}>
          <span className={styles.sessionNumber}>Session {session?.sessionNumber}</span>
          <span className={styles.evsName}>{session?.evs?.name}</span>
        </div>
      </div>

      {/* Participants & State */}
      <div className={styles.statsRow}>
        <div className={styles.participants}>
          <span className={styles.count}>
            {session?.participantCount}/{session?.workshop?.maxCapacity} participants
          </span>
        </div>
        <div className={styles.state}>
          <span className={`${styles.stateText} ${styles[sessionState?.toLowerCase()?.replace(' ', '')]}`}>
            {sessionState}
          </span>
        </div>
      </div>

      {/* Fiches List */}
      <div className={styles.fichesSection}>
        <h4 className={styles.fichesTitle}>Fiches :</h4>
        <div className={styles.fichesList}>
          {session?.fiches?.length > 0 ? (
            session.fiches.map((fiche) => (
              <div key={fiche.id} className={styles.ficheItem}>
                <span className={styles.ficheRef}>#{fiche.ref}</span>
                <span className={styles.ficheParticipants}>- {fiche.participantsCount} pers.</span>
                <Link 
                  href={`/fiches/${fiche.id}`} 
                  target="_blank"
                  className={styles.ficheLink}
                  data-testid={`link-fiche-${fiche.id}`}
                >
                  <ExternalLink size={14} />
                </Link>
              </div>
            ))
          ) : (
            <p className={styles.noFiches}>Aucune fiche associée</p>
          )}
        </div>
      </div>

      {/* Historique Section - Show key events with dates */}
      {(session?.contractSignedAt || session?.activityCompletedAt) && (
        <div className={styles.historySection}>
          <h4 className={styles.historyTitle}>Historique :</h4>
          <div className={styles.historyContent}>
            {session.contractSignedAt && (
              <div className={styles.historyItem} data-testid={`history-contract-${session.id}`}>
                📋 Contrat signé {
                  session.contractSignedByEVS && session.contractSignedByCommune 
                    ? '(EVS/Commune)' 
                    : session.contractSignedByEVS 
                      ? 'EVS' 
                      : 'Commune'
                } le {new Date(session.contractSignedAt).toLocaleDateString('fr-FR')}
              </div>
            )}
            {session.contractSignedAt && session.activityCompletedAt && (
              <div className={styles.historySeparator}>─────────────────────────</div>
            )}
            {session.activityCompletedAt && (
              <div className={styles.historyItem} data-testid={`history-activity-${session.id}`}>
                ✓ Atelier terminé le {new Date(session.activityCompletedAt).toLocaleDateString('fr-FR')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contracts Section - Only visible if PRÊTE */}
      {isReady && (
        <div className={styles.contractsSection}>
          <h4 className={styles.contractsTitle}>Contrats :</h4>
          
          {/* EVS Contract */}
          <div className={styles.contractItem}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={contractEvs}
                onChange={(e) => setContractEvs(e.target.checked)}
                disabled={isInProgress}
                data-testid={`checkbox-contract-evs-${session?.id}`}
              />
              <span>Contrat signé EVS</span>
            </label>
          </div>

          {/* Commune Contract */}
          <div className={styles.contractItem}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={contractCommune}
                onChange={(e) => setContractCommune(e.target.checked)}
                disabled={isInProgress}
                data-testid={`checkbox-contract-commune-${session?.id}`}
              />
              <span>Contrat signé Commune</span>
            </label>
            
            {/* File upload for Commune */}
            <div className={styles.fileUpload}>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={isInProgress || isUploading}
                className={styles.fileInput}
                data-testid={`input-file-commune-${session?.id}`}
              />
              {isUploading && (
                <span className={styles.uploadingText}>Upload en cours...</span>
              )}
              {uploadedFile && (
                <span className={styles.fileName}>{uploadedFile.name}</span>
              )}
              {!uploadedFile && communePdfUrl && (
                <a 
                  href={communePdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.pdfLink}
                  data-testid={`link-commune-pdf-${session?.id}`}
                >
                  📄 Contrat commune (PDF)
                </a>
              )}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving || isInProgress || isUploading}
            className={styles.saveButton}
            data-testid={`button-save-${session?.id}`}
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      )}

      {/* Activity Section - Only visible if EN COURS (contracts signed) */}
      {isInProgress && !isDone && (
        <div className={styles.activitySection}>
          <h4 className={styles.activityTitle}>Activité :</h4>
          
          <div className={styles.activityItem}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={activityDone}
                onChange={(e) => setActivityDone(e.target.checked)}
                disabled={session?.activityDone}
                data-testid={`checkbox-activity-done-${session?.id}`}
              />
              <span>Activité réalisée</span>
            </label>
          </div>

          {/* Mark as Done Button */}
          <button
            onClick={handleMarkActivityDone}
            disabled={isMarkingDone || !activityDone}
            className={styles.markDoneButton}
            data-testid={`button-mark-done-${session?.id}`}
          >
            {isMarkingDone ? 'En cours...' : 'Valider'}
          </button>
        </div>
      )}

      {/* Completed state for TERMINÉE */}
      {isDone && (
        <div className={styles.completedNote}>
          <p>✓ Activité terminée - Bilans à uploader dans les fiches</p>
        </div>
      )}
    </div>
  );
}