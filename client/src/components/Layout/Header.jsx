import { Link, useLocation } from 'wouter';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth.jsx';
import styles from './Header.module.css';

export default function Header() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  const authenticatedNavItems = [
    {
      href: '/dashboard',
      label: 'Tableau de bord',
      roles: ['ADMIN', 'SUIVI_PROJETS', 'EMETTEUR', 'RELATIONS_EVS', 'EVS_CS']
    },
    {
      href: '/fiches',
      label: 'Fiches Actives',
      roles: ['ADMIN', 'SUIVI_PROJETS', 'EMETTEUR', 'RELATIONS_EVS', 'EVS_CS']
    },
    {
      href: '/contact',
      label: 'Nous contacter',
      roles: ['ADMIN', 'SUIVI_PROJETS', 'EMETTEUR', 'RELATIONS_EVS', 'EVS_CS']
    }
  ];

  const visibleItems = authenticatedNavItems.filter(item => 
    item.roles.includes(user?.role)
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
                  <span className={styles.userRole}>
                    {user?.role}
                  </span>
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
                    <div className={styles.mobileUserRole}>
                      {user?.role}
                    </div>
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
    </>
  );
}