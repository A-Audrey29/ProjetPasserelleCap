import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import styles from './WorkshopSessionCard.module.css';

export default function WorkshopSessionCard({ session }) {
  const [contractEvs, setContractEvs] = useState(session?.contractSignedByEvs || false);
  const [contractCommune, setContractCommune] = useState(session?.contractSignedByCommune || false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate session state
  const getSessionState = () => {
    if (contractEvs && contractCommune) return 'EN COURS';
    if (session?.participantCount >= session?.workshop?.minCapacity) return 'PRÊTE';
    return 'EN ATTENTE';
  };

  const sessionState = getSessionState();
  const isReady = sessionState === 'PRÊTE';
  const isInProgress = sessionState === 'EN COURS';

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Seuls les fichiers PDF sont acceptés');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        alert('Le fichier ne doit pas dépasser 5MB');
        return;
      }
      setUploadedFile(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement save logic in next phase
      console.log('Saving contract states:', { contractEvs, contractCommune, uploadedFile });
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error saving:', error);
      alert('Erreur lors de la sauvegarde');
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
                disabled={isInProgress}
                className={styles.fileInput}
                data-testid={`input-file-commune-${session?.id}`}
              />
              {uploadedFile && (
                <span className={styles.fileName}>{uploadedFile.name}</span>
              )}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving || isInProgress}
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