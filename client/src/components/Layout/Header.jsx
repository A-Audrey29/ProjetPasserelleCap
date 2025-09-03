import { Link, useLocation } from 'wouter';
import { Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import styles from './Header.module.css';

export default function Header() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({});
  const [profileErrors, setProfileErrors] = useState({});
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const authenticatedNavItems = [
    {
      href: '/dashboard',
      label: 'Tableau de bord',
      roles: ['ADMIN', 'SUIVI_PROJETS', 'EMETTEUR', 'RELATIONS_EVS', 'EVS_CS', 'CD']
    },
    {
      href: '/fiches',
      label: 'Consulter les fiches navettes',
      roles: ['ADMIN', 'SUIVI_PROJETS', 'EMETTEUR', 'RELATIONS_EVS', 'EVS_CS']
    },
    {
      href: '/fiches?state=SUBMITTED_TO_CD',
      label: 'Fiches en attente de validations',
      roles: ['CD']
    },
    {
      href: '/fiches',
      label: 'Consulter les Fiches',
      roles: ['CD']
    },
    {
      href: '/administration',
      label: 'Administration',
      roles: ['ADMIN']
    },
    {
      href: '/contact',
      label: 'Nous contacter',
      roles: ['ADMIN', 'SUIVI_PROJETS', 'EMETTEUR', 'EVS_CS', 'CD']
    }
  ];

  const visibleItems = authenticatedNavItems.filter(item => 
    item.roles.includes(user?.user?.role)
  );

  const isActive = (href) => {
    if (href === '/dashboard') return location === '/dashboard';
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = async () => {
    await logout();
    setIsMobileMenuOpen(false);
  };

  // Initialize profile form when modal opens
  const openProfileModal = () => {
    const currentUser = user?.user || user;
    setProfileData({
      structure: currentUser?.structure || '',
      phone: currentUser?.phone || '',
      role: currentUser?.role || '',
      password: '',
      confirmPassword: ''
    });
    setProfileErrors({});
    setShowProfileModal(true);
  };

  const validateProfile = () => {
    const newErrors = {};

    if (!profileData.structure?.trim()) {
      newErrors.structure = 'La structure d\'appartenance est requise';
    }

    if (!profileData.phone?.trim()) {
      newErrors.phone = 'Le numéro de téléphone est requis';
    }

    if (profileData.password && profileData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    if (profileData.password !== profileData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setProfileErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      return apiRequest('PUT', '/api/auth/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/auth/me']);
      setShowProfileModal(false);
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été mises à jour avec succès",
        variant: "default"
      });
    },
    onError: (error) => {
      setProfileErrors({ submit: error.message || 'Erreur lors de la mise à jour' });
    }
  });

  const handleProfileSubmit = () => {
    if (!validateProfile()) return;

    const updateData = {
      structure: profileData.structure,
      phone: profileData.phone
    };

    if (profileData.password) {
      updateData.password = profileData.password;
    }

    updateProfileMutation.mutate(updateData);
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          <div className={styles.headerContent}>
            {/* Logo/Title */}
            <div className={styles.logoSection}>
              <Link href="/" className={styles.logo}>
                Passerelle CAP
              </Link>
            </div>

            {/* Desktop Navigation */}
            {isAuthenticated ? (
              <nav className={styles.desktopNav}>
                <div className={styles.navItems}>
                  {visibleItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`${styles.navLink} ${
                        isActive(item.href) 
                          ? styles.navLinkActive
                          : styles.navLinkInactive
                      }`}
                      data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
                
                {/* User Actions */}
                <div className={styles.userActions}>
                  <button 
                    className={styles.profileButton}
                    onClick={openProfileModal}
                    data-testid="button-profile"
                  >
                    <User className={styles.iconSmall} />
                    Mon compte
                  </button>
                  <button 
                    className={styles.logoutButton}
                    onClick={handleLogout}
                    data-testid="button-logout"
                  >
                    Déconnexion
                  </button>
                </div>
              </nav>
            ) : (
              <div className={styles.desktopNav}>
                <Link 
                  href="/login" 
                  className={styles.loginButton}
                  data-testid="link-connexion"
                >
                  Connexion
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className={styles.mobileMenuButton}
              onClick={toggleMobileMenu}
              data-testid="button-mobile-menu"
            >
              {isMobileMenuOpen ? <X className={styles.icon} /> : <Menu className={styles.icon} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className={styles.mobileNav}>
            <div className={styles.mobileNavContent}>
              {isAuthenticated ? (
                <>
                  {visibleItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`${styles.mobileNavLink} ${
                        isActive(item.href)
                          ? styles.mobileNavLinkActive
                          : styles.mobileNavLinkInactive
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      data-testid={`mobile-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div className={styles.mobileUserSection}>
                    <button 
                      className={styles.mobileProfileButton}
                      onClick={() => {
                        openProfileModal();
                        setIsMobileMenuOpen(false);
                      }}
                      data-testid="mobile-button-profile"
                    >
                      <User className={styles.iconSmall} />
                      Mon compte
                    </button>
                    <button
                      className={styles.mobileLogoutButton}
                      onClick={handleLogout}
                      data-testid="mobile-button-logout"
                    >
                      Déconnexion
                    </button>
                  </div>
                </>
              ) : (
                <Link
                  href="/login"
                  className={`${styles.mobileNavLink} ${styles.mobileNavLinkActive}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-testid="mobile-link-connexion"
                >
                  Connexion
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className={styles.mobileOverlay}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                Mon compte
              </h2>
              <button 
                className={styles.modalClose}
                onClick={() => setShowProfileModal(false)}
                data-testid="button-close-profile-modal"
              >
                ✕
              </button>
            </div>

            <div className={styles.profileForm}>
              {/* Read-only info */}
              <div className={styles.readOnlySection}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Prénom</label>
                  <input 
                    type="text" 
                    className={`${styles.input} ${styles.readOnly}`}
                    value={user?.user?.firstName || user?.firstName || ''}
                    disabled
                    data-testid="input-readonly-firstname"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nom</label>
                  <input 
                    type="text" 
                    className={`${styles.input} ${styles.readOnly}`}
                    value={user?.user?.lastName || user?.lastName || ''}
                    disabled
                    data-testid="input-readonly-lastname"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email</label>
                  <input 
                    type="email" 
                    className={`${styles.input} ${styles.readOnly}`}
                    value={user?.user?.email || user?.email || ''}
                    disabled
                    data-testid="input-readonly-email"
                  />
                </div>
              </div>

              {/* Editable fields */}
              <div className={styles.editableSection}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Structure d'appartenance *</label>
                  <input 
                    type="text" 
                    className={`${styles.input} ${profileErrors.structure ? styles.inputError : ''}`}
                    value={profileData.structure || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, structure: e.target.value }))}
                    placeholder="Structure d'appartenance"
                    data-testid="input-profile-structure"
                  />
                  {profileErrors.structure && <span className={styles.error}>{profileErrors.structure}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Numéro de téléphone *</label>
                  <input 
                    type="tel" 
                    className={`${styles.input} ${profileErrors.phone ? styles.inputError : ''}`}
                    value={profileData.phone || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="0123456789"
                    data-testid="input-profile-phone"
                  />
                  {profileErrors.phone && <span className={styles.error}>{profileErrors.phone}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Nouveau mot de passe</label>
                  <input 
                    type="password" 
                    className={`${styles.input} ${profileErrors.password ? styles.inputError : ''}`}
                    value={profileData.password || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Laisser vide pour ne pas modifier"
                    data-testid="input-profile-password"
                  />
                  {profileErrors.password && <span className={styles.error}>{profileErrors.password}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Confirmer le mot de passe</label>
                  <input 
                    type="password" 
                    className={`${styles.input} ${profileErrors.confirmPassword ? styles.inputError : ''}`}
                    value={profileData.confirmPassword || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirmer le nouveau mot de passe"
                    data-testid="input-profile-confirm-password"
                  />
                  {profileErrors.confirmPassword && <span className={styles.error}>{profileErrors.confirmPassword}</span>}
                </div>
              </div>

              {/* Submit error */}
              {profileErrors.submit && (
                <div className={styles.submitError}>
                  {profileErrors.submit}
                </div>
              )}

              {/* Actions */}
              <div className={styles.modalActions}>
                <button 
                  className={styles.cancelButton}
                  onClick={() => setShowProfileModal(false)}
                  data-testid="button-cancel-profile"
                >
                  Annuler
                </button>
                <button 
                  className={styles.saveButton}
                  onClick={handleProfileSubmit}
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}