import { Link, useLocation } from 'wouter';
import { Menu, X, Home, FileText, BarChart3, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth.jsx';

export default function Header() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  const authenticatedNavItems = [
    {
      href: '/',
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
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Title */}
            <div className="flex items-center">
              <Link href="/" className="text-xl font-semibold text-primary">
                Passerelle CAP
              </Link>
            </div>

            {/* Desktop Navigation */}
            {isAuthenticated ? (
              <nav className="hidden md:flex items-center space-x-8">
                <div className="flex items-center space-x-6">
                  {visibleItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`text-sm font-medium transition-colors ${
                        isActive(item.href) 
                          ? 'text-primary' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
                
                {/* User Actions */}
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-muted-foreground">
                    {user?.role}
                  </span>
                  <button 
                    className="btn btn-secondary text-sm"
                    onClick={handleLogout}
                    data-testid="button-logout"
                  >
                    Déconnexion
                  </button>
                </div>
              </nav>
            ) : (
              <div className="hidden md:flex">
                <Link 
                  href="/login" 
                  className="btn btn-primary"
                  data-testid="link-connexion"
                >
                  Connexion
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden btn btn-secondary p-2"
              onClick={toggleMobileMenu}
              data-testid="button-mobile-menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {isAuthenticated ? (
                <>
                  {visibleItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      data-testid={`mobile-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      {user?.role}
                    </div>
                    <button
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
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
                  className="block px-3 py-2 rounded-md text-base font-medium bg-primary text-primary-foreground"
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
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}