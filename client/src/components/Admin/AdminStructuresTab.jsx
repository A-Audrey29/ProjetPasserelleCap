import { useState } from 'react';
import { Plus, Search, Building2, Mail, Phone, MapPin, Edit2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { useStructures, useEPCIs } from '@/hooks/useStructures';
import styles from './AdminStructuresTab.module.css';

export default function AdminStructuresTab() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [epciFilter, setEpciFilter] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  const { 
    structures, 
    isLoading, 
    createStructure, 
    updateStructure,
    deleteStructure,
    isCreating,
    isUpdating,
    isDeleting 
  } = useStructures();

  const { data: epcis = [] } = useEPCIs();

  // Filtrer les structures
  const filteredStructures = structures.filter(structure => {
    const matchesSearch = !searchTerm || 
      structure.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      structure.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      structure.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      structure.epci?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEpci = !epciFilter || structure.epci === epciFilter;

    return matchesSearch && matchesEpci;
  });

  const handleCreateStructure = async (data) => {
    try {
      await createStructure(data);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    }
  };

  const handleUpdateStructure = async (data) => {
    try {
      await updateStructure({ id: editingStructure.orgId, data });
      setEditingStructure(null);
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
    }
  };

  const handleDeleteStructure = async (structureId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette structure ?')) {
      try {
        await deleteStructure(structureId);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Chargement des structures...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* En-tête avec filtres et actions */}
      <div className={styles.header}>
        <div className={styles.filtersRow}>
          <div className={styles.searchBox}>
            <Search size={18} className={styles.searchIcon} />
            <Input
              type="text"
              placeholder="Rechercher une structure..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
              data-testid="structures-search"
            />
          </div>
          
          <select
            value={epciFilter}
            onChange={(e) => setEpciFilter(e.target.value)}
            className={styles.filterSelect}
            data-testid="structures-epci-filter"
          >
            <option value="">Tous les EPCI</option>
            {epcis.map(epci => (
              <option key={epci.id} value={epci.name}>{epci.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.headerActions}>
          <Button 
            variant="outline"
            onClick={() => setShowImportModal(true)}
            data-testid="button-import-csv"
          >
            <Upload size={18} />
            Importer CSV
          </Button>
          <Button 
            onClick={() => setShowCreateForm(true)}
            data-testid="button-create-structure"
          >
            <Plus size={18} />
            Nouvelle structure
          </Button>
        </div>
      </div>

      {/* Formulaire de création/édition */}
      {(showCreateForm || editingStructure) && (
        <Card className={styles.formCard}>
          <StructureForm
            structure={editingStructure}
            epcis={epcis}
            onSubmit={editingStructure ? handleUpdateStructure : handleCreateStructure}
            onCancel={() => {
              setShowCreateForm(false);
              setEditingStructure(null);
            }}
            isSubmitting={isCreating || isUpdating}
          />
        </Card>
      )}

      {/* Statistiques */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{structures.length}</span>
          <span className={styles.statLabel}>Total structures</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>
            {new Set(structures.map(s => s.epci)).size}
          </span>
          <span className={styles.statLabel}>EPCIs</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>
            {structures.filter(s => s.contactEmail).length}
          </span>
          <span className={styles.statLabel}>Avec contact</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{filteredStructures.length}</span>
          <span className={styles.statLabel}>Affichées</span>
        </div>
      </div>

      {/* Grille des structures */}
      {filteredStructures.length === 0 ? (
        <div className={styles.emptyState}>
          <Building2 size={48} className={styles.emptyIcon} />
          <p>Aucune structure trouvée avec ces critères</p>
        </div>
      ) : (
        <div className={styles.structuresGrid}>
          {filteredStructures.map(structure => (
            <Card key={structure.orgId} className={styles.structureCard}>
              <div className={styles.structureHeader}>
                <Building2 size={20} className={styles.structureIcon} />
                <h3 className={styles.structureName}>{structure.name}</h3>
              </div>
              
              <div className={styles.structureInfo}>
                {structure.contactName && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Contact :</span>
                    <span>{structure.contactName}</span>
                  </div>
                )}
                {structure.contactEmail && (
                  <div className={styles.infoRow}>
                    <Mail size={16} className={styles.infoIcon} />
                    <span>{structure.contactEmail}</span>
                  </div>
                )}
                {structure.contactPhone && (
                  <div className={styles.infoRow}>
                    <Phone size={16} className={styles.infoIcon} />
                    <span>{structure.contactPhone}</span>
                  </div>
                )}
                {structure.epci && (
                  <div className={styles.infoRow}>
                    <MapPin size={16} className={styles.infoIcon} />
                    <span>{structure.epci}</span>
                  </div>
                )}
                {structure.contact && (
                  <div className={styles.infoRow}>
                    <span className={styles.address}>{structure.contact}</span>
                  </div>
                )}
              </div>

              <div className={styles.structureActions}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingStructure(structure)}
                  data-testid={`edit-structure-${structure.orgId}`}
                >
                  <Edit2 size={16} />
                  Modifier
                </Button>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDeleteStructure(structure.orgId)}
                  disabled={isDeleting}
                  title="Supprimer"
                  data-testid={`delete-structure-${structure.orgId}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Composant formulaire de structure
function StructureForm({ structure, epcis, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({
    name: structure?.name || '',
    contactName: structure?.contactName || '',
    contactEmail: structure?.contactEmail || '',
    contactPhone: structure?.contactPhone || '',
    contact: structure?.contact || '',
    epci: structure?.epci || '',
    epciId: structure?.epciId || ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }

    // Auto-set epciId when epci changes
    if (field === 'epci') {
      const selectedEpci = epcis.find(e => e.name === value);
      setFormData(prev => ({ ...prev, epciId: selectedEpci?.id || '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }
    if (!formData.epci) {
      newErrors.epci = 'L\'EPCI est requis';
    }
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Format email invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.formHeader}>
        <h3>{structure ? 'Modifier' : 'Créer'} une structure</h3>
      </div>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label className={styles.label}>Nom de la structure *</label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={errors.name ? styles.inputError : ''}
              data-testid="structure-name-input"
            />
            {errors.name && <span className={styles.error}>{errors.name}</span>}
          </div>
          
          <div className={styles.formField}>
            <label className={styles.label}>EPCI *</label>
            <select
              value={formData.epci}
              onChange={(e) => handleChange('epci', e.target.value)}
              className={`${styles.select} ${errors.epci ? styles.inputError : ''}`}
              data-testid="structure-epci-select"
            >
              <option value="">Sélectionner un EPCI</option>
              {epcis.map(epci => (
                <option key={epci.id} value={epci.name}>{epci.name}</option>
              ))}
            </select>
            {errors.epci && <span className={styles.error}>{errors.epci}</span>}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label className={styles.label}>Nom du contact</label>
            <Input
              value={formData.contactName}
              onChange={(e) => handleChange('contactName', e.target.value)}
              data-testid="structure-contact-name-input"
            />
          </div>
          
          <div className={styles.formField}>
            <label className={styles.label}>Email du contact</label>
            <Input
              type="email"
              value={formData.contactEmail}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
              className={errors.contactEmail ? styles.inputError : ''}
              data-testid="structure-contact-email-input"
            />
            {errors.contactEmail && <span className={styles.error}>{errors.contactEmail}</span>}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label className={styles.label}>Téléphone du contact</label>
            <Input
              value={formData.contactPhone}
              onChange={(e) => handleChange('contactPhone', e.target.value)}
              data-testid="structure-contact-phone-input"
            />
          </div>
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Adresse</label>
          <textarea
            value={formData.contact}
            onChange={(e) => handleChange('contact', e.target.value)}
            className={styles.textarea}
            rows={3}
            data-testid="structure-address-input"
          />
        </div>

        <div className={styles.formActions}>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            data-testid="structure-form-submit"
          >
            {isSubmitting ? 'Enregistrement...' : (structure ? 'Modifier' : 'Créer')}
          </Button>
        </div>
      </form>
    </div>
  );
}