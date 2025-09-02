import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { X, Save, User, Mail, Shield, Key } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Badge } from '@/components/common/Badge';
import styles from './UserForm.module.css';

const ROLES = {
  ADMIN: 'Administrateur',
  SUIVI_PROJETS: 'Suivi de projets',
  EMETTEUR: 'Émetteur',
  RELATIONS_EVS: 'Relations EVS',
  EVS_CS: 'EVS/CS',
  CD: 'Conseil Départemental'
};

export default function UserForm({ user, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const isEditing = !!user;

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'EMETTEUR',
    password: '',
    confirmPassword: '',
    isActive: true
  });

  const [errors, setErrors] = useState({});

  

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role || 'EMETTEUR',
        password: '',
        confirmPassword: '',
        isActive: user.isActive !== undefined ? user.isActive : true
      });
    }
  }, [user]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Le prénom est requis';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Le nom est requis';
    }

    if (!formData.role) {
      newErrors.role = 'Le rôle est requis';
    }

    if (!isEditing) {
      if (!formData.password) {
        newErrors.password = 'Le mot de passe est requis';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      }
    } else if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createUserMutation = useMutation({
    mutationFn: async (userData) => {
      return apiRequest('POST', '/api/admin/users', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/admin/users']);
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      setErrors({ submit: error.message || 'Erreur lors de la création' });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async (userData) => {
      return apiRequest('PUT', `/api/admin/users/${user.id}`, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/admin/users']);
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      setErrors({ submit: error.message || 'Erreur lors de la mise à jour' });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      email: formData.email.trim(),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      role: formData.role,
      isActive: formData.isActive
    };

    if (!isEditing || formData.password) {
      submitData.password = formData.password;
    }

    if (isEditing) {
      updateUserMutation.mutate(submitData);
    } else {
      createUserMutation.mutate(submitData);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const isPending = createUserMutation.isPending || updateUserMutation.isPending;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <User className={styles.titleIcon} />
            {isEditing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
          </h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            data-testid="button-close-user-form"
          >
            <X className={styles.closeIcon} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            {/* Email */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <Mail className={styles.labelIcon} />
                Email *
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={errors.email ? styles.inputError : ''}
                placeholder="email@exemple.com"
                data-testid="input-user-email"
              />
              {errors.email && <span className={styles.error}>{errors.email}</span>}
            </div>

            {/* First Name */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Prénom *
              </label>
              <Input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={errors.firstName ? styles.inputError : ''}
                placeholder="Prénom"
                data-testid="input-user-firstname"
              />
              {errors.firstName && <span className={styles.error}>{errors.firstName}</span>}
            </div>

            {/* Last Name */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Nom *
              </label>
              <Input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={errors.lastName ? styles.inputError : ''}
                placeholder="Nom"
                data-testid="input-user-lastname"
              />
              {errors.lastName && <span className={styles.error}>{errors.lastName}</span>}
            </div>

            {/* Role */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <Shield className={styles.labelIcon} />
                Rôle *
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className={`${styles.select} ${errors.role ? styles.inputError : ''}`}
                data-testid="select-user-role"
              >
                {Object.entries(ROLES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              {errors.role && <span className={styles.error}>{errors.role}</span>}
            </div>

            

            

            {/* Password */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <Key className={styles.labelIcon} />
                {isEditing ? 'Nouveau mot de passe' : 'Mot de passe *'}
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={errors.password ? styles.inputError : ''}
                placeholder={isEditing ? 'Laisser vide pour ne pas changer' : 'Mot de passe'}
                data-testid="input-user-password"
              />
              {errors.password && <span className={styles.error}>{errors.password}</span>}
            </div>

            {/* Confirm Password */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Confirmer le mot de passe {!isEditing && '*'}
              </label>
              <Input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={errors.confirmPassword ? styles.inputError : ''}
                placeholder="Confirmer le mot de passe"
                data-testid="input-user-confirm-password"
              />
              {errors.confirmPassword && <span className={styles.error}>{errors.confirmPassword}</span>}
            </div>

            {/* Active Status */}
            {isEditing && (
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className={styles.checkbox}
                    data-testid="checkbox-user-active"
                  />
                  Utilisateur actif
                </label>
              </div>
            )}
          </div>

          {errors.submit && (
            <div className={styles.submitError}>
              {errors.submit}
            </div>
          )}

          <div className={styles.actions}>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              data-testid="button-cancel-user-form"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              data-testid="button-save-user"
              className="text-[#3b4b61]"
            >
              <Save className={styles.saveIcon} />
              {isPending ? 'Sauvegarde...' : isEditing ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}