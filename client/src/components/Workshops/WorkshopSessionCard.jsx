import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import styles from './WorkshopSessionCard.module.css';

export default function WorkshopSessionCard({ session }) {
  const { toast } = useToast();
  const [contractEvs, setContractEvs] = useState(session?.contractSignedByEVS || false);
  const [contractCommune, setContractCommune] = useState(session?.contractSignedByCommune || false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [communePdfUrl, setCommunePdfUrl] = useState(session?.contractCommunePdfUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Calculate session state
  const getSessionState = () => {
    if (contractEvs && contractCommune) return 'EN COURS';
    if (session?.participantCount >= session?.workshop?.minCapacity) return 'PRÊTE';
    return 'EN ATTENTE';
  };

  const sessionState = getSessionState();
  const isReady = sessionState === 'PRÊTE';
  const isInProgress = sessionState === 'EN COURS';

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
    setIsSaving(true);
    try {
      await apiRequest('PATCH', `/api/workshop-sessions/${session.id}/contracts`, {
        contractSignedByEVS: contractEvs,
        contractSignedByCommune: contractCommune,
        contractCommunePdfUrl: communePdfUrl
      });

      // Invalidate cache to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/workshop-sessions'] });
      
      toast({
        title: "Succès",
        description: "Contrats mis à jour avec succès"
      });
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
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
                <span className={styles.ficheFamily}>({fiche.familyName})</span>
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

      {/* Disabled state for EN COURS */}
      {isInProgress && (
        <div className={styles.inProgressNote}>
          <p>✓ Session en cours - Contrats signés</p>
        </div>
      )}
    </div>
  );
}