import { Link, useLocation } from 'wouter';
import { 
  Home, 
  FileText, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  CheckCircle,
  BookOpen
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth.jsx';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const navigationItems = [
    {
      href: '/',
      icon: Home,
      label: 'Tableau de bord',
      roles: ['ADMIN', 'SUIVI_PROJETS', 'EMETTEUR', 'RELATIONS_EVS', 'EVS_CS']
    },
    {
      href: '/fiches',
      icon: FileText,
      label: 'Fiches navettes',
      roles: ['ADMIN', 'SUIVI_PROJETS', 'EMETTEUR', 'RELATIONS_EVS', 'EVS_CS']
    },
    {
      href: '/fiches?state=SUBMITTED_TO_FEVES',
      icon: CheckCircle,
      label: 'Valider et transmettre',
      roles: ['ADMIN', 'RELATIONS_EVS']
    },
    {
      href: '/ateliers',
      icon: BookOpen,
      label: 'Gestion Ateliers',
      roles: ['ADMIN', 'RELATIONS_EVS', 'EVS_CS', 'CD']
    },
    {
      href: '/reports',
      icon: BarChart3,
      label: 'Rapports',
      roles: ['ADMIN', 'SUIVI_PROJETS']
    },
    {
      href: '/admin',
      icon: Settings,
      label: 'Administration',
      roles: ['ADMIN']
    }
  ];

  const visibleItems = navigationItems.filter(item => 
    item.roles.includes(user?.user?.role || user?.role)
  );

  const isActive = (href) => {
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
      {/* Mobile menu button */}
      <button 
        className={styles.mobileMenuButton}
        onClick={toggleMobileMenu}
        data-testid="button-mobile-menu"
      >
        {isMobileMenuOpen ? <X className={styles.icon} /> : <Menu className={styles.icon} />}
      </button>

      {/* Sidebar */}
      <nav className={`${styles.sidebar} ${isMobileMenuOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.appTitle} data-testid="text-app-title">
            Passerelle CAP
          </h1>
          <p className={styles.userRole} data-testid="text-user-role">
            {user?.role}
          </p>
        </div>
        
        <div className={styles.navigation}>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
                data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className={styles.icon} />
                {item.label}
              </Link>
            );
          })}
        </div>
        
        <div className={styles.sidebarFooter}>
          <button 
            className={styles.logoutButton} 
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className={styles.iconSmall} />
            Déconnexion
          </button>
        </div>
      </nav>

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
