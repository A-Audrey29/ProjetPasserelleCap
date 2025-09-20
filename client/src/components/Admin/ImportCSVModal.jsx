import { useState } from 'react';
import { X, Upload, CheckCircle, AlertCircle, FileText, Download } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { apiRequest, queryClient } from '@/lib/queryClient';
import styles from './ImportCSVModal.module.css';

export default function ImportCSVModal({ isOpen, onClose }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (selectedFile) => {
    if (selectedFile && selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setResults(null);
    } else {
      alert('Veuillez sélectionner un fichier CSV valide.');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('csvFile', file);

    try {
      const result = await apiRequest('/api/organizations/import', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary for FormData
        headers: {}
      });

      setResults(result);

      // Refresh organizations list if import was successful
      if (result.success && result.imported > 0) {
        queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
        queryClient.invalidateQueries({ queryKey: ['/api/epcis'] });
      }
    } catch (error) {
      console.error('Import error:', error);
      setResults({
        success: false,
        message: 'Erreur lors de l\'importation : ' + error.message,
        errors: [error.message]
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResults(null);
    setDragActive(false);
    onClose();
  };

  const downloadTemplate = () => {
    const csvContent = `Nom,EPCI,Nom prénom de la Directrice,Contacts,Téléphone,Adresse,Ville
"Exemple Structure","CA Basse-Terre","Jean Dupont","contact@exemple.fr","0590123456","123 rue Example","Basse-Terre"
"Autre Structure","CA Pointe-à-Pitre","Marie Martin","marie@autre.fr","0590654321","456 avenue Test","Pointe-à-Pitre"`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modele_structures.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <Upload size={20} />
            Import de structures CSV
          </h2>
          <button 
            className={styles.closeButton}
            onClick={handleClose}
            data-testid="close-import-modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {!results ? (
            <>
              {/* Template download */}
              <div className={styles.templateSection}>
                <p>Format attendu : fichier CSV avec les colonnes suivantes :</p>
                <div className={styles.columnsList}>
                  <span className={styles.requiredColumn}>Nom*</span>
                  <span className={styles.requiredColumn}>EPCI*</span>
                  <span className={styles.optionalColumn}>Nom prénom de la Directrice</span>
                  <span className={styles.optionalColumn}>Contacts</span>
                  <span className={styles.optionalColumn}>Téléphone</span>
                  <span className={styles.optionalColumn}>Adresse</span>
                  <span className={styles.optionalColumn}>Ville</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={downloadTemplate}
                  data-testid="download-template"
                >
                  <Download size={16} />
                  Télécharger le modèle
                </Button>
              </div>

              {/* File upload */}
              <div 
                className={`${styles.uploadZone} ${dragActive ? styles.dragActive : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                data-testid="csv-upload-zone"
              >
                {file ? (
                  <div className={styles.fileSelected}>
                    <FileText size={32} className={styles.fileIcon} />
                    <p className={styles.fileName}>{file.name}</p>
                    <p className={styles.fileSize}>
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setFile(null)}
                      data-testid="change-file-button"
                    >
                      Changer de fichier
                    </Button>
                  </div>
                ) : (
                  <div className={styles.uploadPrompt}>
                    <Upload size={48} className={styles.uploadIcon} />
                    <p>Glissez-déposez votre fichier CSV ici</p>
                    <p>ou</p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileSelect(e.target.files[0])}
                      className={styles.fileInput}
                      data-testid="csv-file-input"
                    />
                    <Button 
                      variant="outline"
                      data-testid="choose-file-button"
                    >
                      Choisir un fichier
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Results display */
            <div className={styles.results}>
              <div className={styles.resultHeader}>
                {results.success ? (
                  <CheckCircle size={24} className={styles.successIcon} />
                ) : (
                  <AlertCircle size={24} className={styles.errorIcon} />
                )}
                <h3 data-testid="import-result-message">{results.message}</h3>
              </div>

              {results.success && (
                <div className={styles.stats}>
                  <div className={styles.statItem}>
                    <span className={styles.statNumber}>{results.processed || 0}</span>
                    <span className={styles.statLabel}>Lignes traitées</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statNumber}>{results.imported || 0}</span>
                    <span className={styles.statLabel}>Nouvelles structures</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statNumber}>{results.updated || 0}</span>
                    <span className={styles.statLabel}>Mises à jour</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statNumber}>{results.skipped || 0}</span>
                    <span className={styles.statLabel}>Ignorées</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statNumber}>{results.errors?.length || 0}</span>
                    <span className={styles.statLabel}>Erreurs</span>
                  </div>
                </div>
              )}

              {results.errors && results.errors.length > 0 && (
                <div className={styles.errorsSection}>
                  <h4>Erreurs détectées :</h4>
                  <div className={styles.errorsList}>
                    {results.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className={styles.errorItem}>
                        {error}
                      </div>
                    ))}
                    {results.errors.length > 10 && (
                      <div className={styles.moreErrors}>
                        ... et {results.errors.length - 10} autres erreurs
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          {!results ? (
            <>
              <Button 
                variant="outline" 
                onClick={handleClose}
                data-testid="cancel-import"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleImport}
                disabled={!file || isUploading}
                data-testid="button-import-csv-confirm"
              >
                {isUploading ? 'Importation...' : 'Importer'}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline"
                onClick={() => {
                  setResults(null);
                  setFile(null);
                }}
                data-testid="import-another"
              >
                Importer un autre fichier
              </Button>
              <Button 
                onClick={handleClose}
                data-testid="close-results"
              >
                Fermer
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}