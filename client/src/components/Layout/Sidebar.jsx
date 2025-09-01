import { Link, useLocation } from 'wouter';
import { 
  Home, 
  FileText, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth.jsx';

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
      href: '/reports',
      icon: BarChart3,
      label: 'Rapports',
      roles: ['ADMIN', 'SUIVI_PROJETS', 'RELATIONS_EVS']
    },
    {
      href: '/admin',
      icon: Settings,
      label: 'Administration',
      roles: ['ADMIN']
    }
  ];

  const visibleItems = navigationItems.filter(item => 
    item.roles.includes(user?.role)
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
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-secondary text-secondary-foreground rounded-md"
        onClick={toggleMobileMenu}
        data-testid="button-mobile-menu"
      >
        {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Sidebar */}
      <nav className={`fixed left-0 top-0 h-full w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out z-40 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground" data-testid="text-app-title">
            Passerelle CAP
          </h2>
          <p className="text-sm text-muted-foreground" data-testid="text-user-role">
            {user?.role}
          </p>
        </div>
        
        <div className="p-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(item.href) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                onClick={() => setIsMobileMenuOpen(false)}
                data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
        
        <div className="absolute bottom-4 left-4 right-4">
          <button 
            className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors" 
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
