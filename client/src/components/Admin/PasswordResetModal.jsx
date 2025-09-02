import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { X, Key, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import styles from './PasswordResetModal.module.css';

export default function PasswordResetModal({ user, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});

  const resetPasswordMutation = useMutation({
    mutationFn: async (password) => {
      return apiRequest(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password })
      });
    },
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      setErrors({ submit: error.message || 'Erreur lors de la réinitialisation' });
    }
  });

  const validateForm = () => {
    const newErrors = {};

    if (!newPassword) {
      newErrors.password = 'Le nouveau mot de passe est requis';
    } else if (newPassword.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    resetPasswordMutation.mutate(newPassword);
  };

  const handleInputChange = (field, value) => {
    if (field === 'password') {
      setNewPassword(value);
    } else {
      setConfirmPassword(value);
    }
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <Key className={styles.titleIcon} />
            Réinitialiser le mot de passe
          </h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            data-testid="button-close-password-reset"
          >
            <X className={styles.closeIcon} />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.warning}>
            <AlertTriangle className={styles.warningIcon} />
            <div>
              <p className={styles.warningText}>
                Vous êtes sur le point de réinitialiser le mot de passe de :
              </p>
              <p className={styles.userInfo}>
                <strong>{user.firstName} {user.lastName}</strong> ({user.email})
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Nouveau mot de passe *
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={errors.password ? styles.inputError : ''}
                placeholder="Nouveau mot de passe"
                data-testid="input-new-password"
              />
              {errors.password && <span className={styles.error}>{errors.password}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Confirmer le mot de passe *
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={errors.confirmPassword ? styles.inputError : ''}
                placeholder="Confirmer le mot de passe"
                data-testid="input-confirm-password"
              />
              {errors.confirmPassword && <span className={styles.error}>{errors.confirmPassword}</span>}
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
                disabled={resetPasswordMutation.isPending}
                data-testid="button-cancel-password-reset"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={resetPasswordMutation.isPending}
                data-testid="button-confirm-password-reset"
              >
                {resetPasswordMutation.isPending ? 'Réinitialisation...' : 'Réinitialiser'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}