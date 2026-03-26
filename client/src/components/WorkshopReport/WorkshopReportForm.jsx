import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { X, Download, Edit, Eye, Loader2 } from 'lucide-react';
import styles from './WorkshopReportForm.module.css';

export default function WorkshopReportForm({ enrollmentId, workshopId, onClose }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('edit'); // 'edit' | 'view'
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving' | 'saved' | 'error'

  // État local du formulaire (Bilan Global)
  const [globalData, setGlobalData] = useState({
    intervenantsText: '',
    effectiveStartDate: '',
    sessionsRealized: '',
    modalitesDeploiement: '',
    modalitesFonctionnement: '',
    syntheseObjectifs: '',
    leviersFreins: '',
    perspectives: '',
    transmissionSavoirs: '',
  });

  // État local du formulaire (Bilan Famille)
  const [familyData, setFamilyData] = useState({
    reportParticipantsPresences: '',
    reportImplication: '',
    reportObjectifs: '',
    reportSatisfaction: '',
    reportCommentaireLibre: '',
  });

  // Récupérer le bilan global
  const { data: globalReport, isLoading: loadingGlobal } = useQuery({
    queryKey: ['/api/workshops', workshopId, 'global-report'],
    queryFn: async () => {
      const res = await fetch(`/api/workshops/${workshopId}/global-report`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch global report');
      return res.json();
    },
    enabled: !!workshopId,
  });

  // Récupérer le bilan famille
  const { data: familyReport, isLoading: loadingFamily } = useQuery({
    queryKey: ['/api/enrollments', enrollmentId, 'family-report'],
    queryFn: async () => {
      const res = await fetch(`/api/enrollments/${enrollmentId}/family-report`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch family report');
      return res.json();
    },
    enabled: !!enrollmentId,
  });

  // Initialiser les données avec les valeurs de la BDD
  useEffect(() => {
    if (globalReport) {
      setGlobalData({
        intervenantsText: globalReport.intervenantsText || '',
        effectiveStartDate: globalReport.effectiveStartDate || '',
        sessionsRealized: globalReport.sessionsRealized || '',
        modalitesDeploiement: globalReport.modalitesDeploiement || '',
        modalitesFonctionnement: globalReport.modalitesFonctionnement || '',
        syntheseObjectifs: globalReport.syntheseObjectifs || '',
        leviersFreins: globalReport.leviersFreins || '',
        perspectives: globalReport.perspectives || '',
        transmissionSavoirs: globalReport.transmissionSavoirs || '',
      });
    }
  }, [globalReport]);

  useEffect(() => {
    if (familyReport) {
      setFamilyData({
        reportParticipantsPresences: familyReport.reportParticipantsPresences || '',
        reportImplication: familyReport.reportImplication || '',
        reportObjectifs: familyReport.reportObjectifs || '',
        reportSatisfaction: familyReport.reportSatisfaction || '',
        reportCommentaireLibre: familyReport.reportCommentaireLibre || '',
      });
    }
  }, [familyReport]);

  // Auto-save pour le bilan global
  const { save: saveGlobal, isSaving: savingGlobal } = useDebouncedSave({
    mutationFn: async (data) => {
      setSaveStatus('saving');
      await apiRequest('PATCH', `/api/workshops/${workshopId}/global-report`, data);
      setSaveStatus('saved');
      // Invalider le cache pour rafraîchir les autres vues
      queryClient.invalidateQueries({
        queryKey: ['/api/workshops', workshopId, 'global-report'],
      });
    },
    onError: () => {
      setSaveStatus('error');
    },
  });

  // Auto-save pour le bilan famille
  const { save: saveFamily, saveImmediate: saveFamilyImmediate, isSaving: savingFamily } = useDebouncedSave({
    mutationFn: async (data) => {
      setSaveStatus('saving');
      await apiRequest('PATCH', `/api/enrollments/${enrollmentId}/family-report`, data);
      setSaveStatus('saved');
      queryClient.invalidateQueries({
        queryKey: ['/api/enrollments', enrollmentId, 'family-report'],
      });
    },
    onError: () => {
      setSaveStatus('error');
    },
  });

  // Handlers pour les changements
  const handleGlobalChange = (field, value) => {
    const newData = { ...globalData, [field]: value };
    setGlobalData(newData);
    if (mode === 'edit') {
      saveGlobal(newData);
    }
  };

  const handleFamilyChange = (field, value) => {
    const newData = { ...familyData, [field]: value };
    setFamilyData(newData);
    if (mode === 'edit') {
      saveFamily(newData);
    }
  };

  // ✅ CORRECTIF 1 : Sauvegarde immédiate avant fermeture
  const handleClose = () => {
    if (mode === 'edit' && (saveStatus === 'saving' || saveStatus === 'error')) {
      // Sauvegarder immédiatement avant de fermer
      saveFamilyImmediate(familyData);
    }
    onClose();
  };

  // Export PDF
  const handleExportPDF = async () => {
    try {
      const res = await fetch(`/api/workshops/${workshopId}/export-report-pdf`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to export PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bilan-atelier-${workshopId}-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export PDF error:', error);
    }
  };

  if (loadingGlobal || loadingFamily) {
    return (
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.loadingContainer}>
            <Loader2 className={styles.spinner} size={32} />
            <p>Chargement du bilan...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2>Bilan d'Atelier</h2>
            <p className={styles.subtitle}>Formulaire hybride : Global + Famille</p>
          </div>
          <div className={styles.headerActions}>
            {mode === 'view' ? (
              <button
                onClick={() => setMode('edit')}
                className={styles.editButton}
              >
                <Edit size={16} />
                Modifier
              </button>
            ) : (
              <button
                onClick={() => setMode('view')}
                className={styles.viewButton}
              >
                <Eye size={16} />
                Voir
              </button>
            )}
            <button
              onClick={handleExportPDF}
              className={styles.exportButton}
              title="Exporter en PDF"
            >
              <Download size={16} />
              PDF
            </button>
            <button
              onClick={handleClose}
              className={styles.closeButton}
              title="Fermer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Save Status */}
        {(saveStatus === 'saving' || saveStatus === 'error') && (
          <div className={`${styles.saveStatus} ${styles[saveStatus]}`}>
            {saveStatus === 'saving' && (
              <>
                <Loader2 size={14} className={styles.spinning} />
                Sauvegarde en cours...
              </>
            )}
            {saveStatus === 'saved' && '✓ Sauvegardé'}
            {saveStatus === 'error' && '⚠️ Erreur de sauvegarde'}
          </div>
        )}

        {/* Formulaire */}
        <div className={styles.form}>
          {/* SECTION GLOBALE (commune à toutes les familles) */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              📋 Bilan Global Atelier
              <span className={styles.sharedIndicator}>Partagé entre toutes les familles</span>
            </h3>

            <div className={styles.fieldGroup}>
              <label>1. Intervenants</label>
              <textarea
                value={globalData.intervenantsText}
                onChange={(e) => handleGlobalChange('intervenantsText', e.target.value)}
                disabled={mode === 'view'}
                placeholder="Liste des intervenants..."
                rows={3}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>2. Date effective de début</label>
              <input
                type="date"
                value={globalData.effectiveStartDate}
                onChange={(e) => handleGlobalChange('effectiveStartDate', e.target.value)}
                disabled={mode === 'view'}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Nombre de séances réalisées</label>
              <input
                type="number"
                value={globalData.sessionsRealized}
                onChange={(e) => handleGlobalChange('sessionsRealized', parseInt(e.target.value) || '')}
                disabled={mode === 'view'}
                min={0}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>3. Modalités de déploiement</label>
              <textarea
                value={globalData.modalitesDeploiement}
                onChange={(e) => handleGlobalChange('modalitesDeploiement', e.target.value)}
                disabled={mode === 'view'}
                rows={3}
                placeholder="Conditions de mise en place..."
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>4. Modalités de fonctionnement</label>
              <textarea
                value={globalData.modalitesFonctionnement}
                onChange={(e) => handleGlobalChange('modalitesFonctionnement', e.target.value)}
                disabled={mode === 'view'}
                rows={3}
                placeholder="Organisation et déroulement..."
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>5. Synthèse au regard des objectifs</label>
              <textarea
                value={globalData.syntheseObjectifs}
                onChange={(e) => handleGlobalChange('syntheseObjectifs', e.target.value)}
                disabled={mode === 'view'}
                rows={4}
                placeholder="Analyse des résultats..."
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>6. Leviers et freins</label>
              <textarea
                value={globalData.leviersFreins}
                onChange={(e) => handleGlobalChange('leviersFreins', e.target.value)}
                disabled={mode === 'view'}
                rows={4}
                placeholder="Facteurs de succès et obstacles..."
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>7. Perspectives</label>
              <textarea
                value={globalData.perspectives}
                onChange={(e) => handleGlobalChange('perspectives', e.target.value)}
                disabled={mode === 'view'}
                rows={3}
                placeholder="Pistes d'amélioration..."
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>8. Transmission des savoirs</label>
              <textarea
                value={globalData.transmissionSavoirs}
                onChange={(e) => handleGlobalChange('transmissionSavoirs', e.target.value)}
                disabled={mode === 'view'}
                rows={3}
                placeholder="Partage des bonnes pratiques..."
              />
            </div>
          </section>

          {/* SECTION FAMILLE (spécifique à cette inscription) */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              👨‍👩‍👧‍👦 Bilan Famille
              <span className={styles.specificIndicator}>Spécifique à cette famille</span>
            </h3>

            <div className={styles.fieldGroup}>
              <label>Présences effectives</label>
              <input
                type="number"
                value={familyData.reportParticipantsPresences}
                onChange={(e) => handleFamilyChange('reportParticipantsPresences', parseInt(e.target.value) || '')}
                disabled={mode === 'view'}
                min={0}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Niveau d'implication</label>
              <textarea
                value={familyData.reportImplication}
                onChange={(e) => handleFamilyChange('reportImplication', e.target.value)}
                disabled={mode === 'view'}
                rows={3}
                placeholder="Participation et engagement..."
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Objectifs atteints</label>
              <select
                value={familyData.reportObjectifs}
                onChange={(e) => handleFamilyChange('reportObjectifs', e.target.value)}
                disabled={mode === 'view'}
              >
                <option value="">-- Sélectionner --</option>
                <option value="REACHED">Atteints</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="NOT_REACHED">Non atteints</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label>Satisfaction (1-5)</label>
              <div className={styles.satisfactionScale}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <label key={value} className={styles.satisfactionOption}>
                    <input
                      type="radio"
                      name="satisfaction"
                      value={value}
                      checked={familyData.reportSatisfaction === value}
                      onChange={(e) => handleFamilyChange('reportSatisfaction', parseInt(e.target.value))}
                      disabled={mode === 'view'}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label>Commentaire libre</label>
              <textarea
                value={familyData.reportCommentaireLibre}
                onChange={(e) => handleFamilyChange('reportCommentaireLibre', e.target.value)}
                disabled={mode === 'view'}
                rows={4}
                placeholder="Observations particulières..."
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.footerNote}>
            💡 Sauvegarde automatique à chaque modification. Les données globales sont partagées entre toutes les familles inscrites à cet atelier.
          </p>
        </div>
      </div>
    </div>
  );
}
