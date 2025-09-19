import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import styles from './StructureForm.module.css';

export default function StructureForm({ 
  structure, 
  epcis = [], 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}) {
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
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          {structure ? 'Modifier' : 'Créer'} une structure
        </h3>
      </div>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>
              Nom de la structure *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={errors.name ? styles.inputError : ''}
              data-testid="structure-name-input"
            />
            {errors.name && (
              <span className={styles.error}>{errors.name}</span>
            )}
          </div>
          
          <div className={styles.field}>
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
            {errors.epci && (
              <span className={styles.error}>{errors.epci}</span>
            )}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Nom du contact</label>
            <Input
              value={formData.contactName}
              onChange={(e) => handleChange('contactName', e.target.value)}
              data-testid="structure-contact-name-input"
            />
          </div>
          
          <div className={styles.field}>
            <label className={styles.label}>Email du contact</label>
            <Input
              type="email"
              value={formData.contactEmail}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
              className={errors.contactEmail ? styles.inputError : ''}
              data-testid="structure-contact-email-input"
            />
            {errors.contactEmail && (
              <span className={styles.error}>{errors.contactEmail}</span>
            )}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Téléphone du contact</label>
            <Input
              value={formData.contactPhone}
              onChange={(e) => handleChange('contactPhone', e.target.value)}
              data-testid="structure-contact-phone-input"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Adresse</label>
          <textarea
            value={formData.contact}
            onChange={(e) => handleChange('contact', e.target.value)}
            className={styles.textarea}
            rows={3}
            data-testid="structure-address-input"
          />
        </div>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            data-testid="structure-form-cancel"
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