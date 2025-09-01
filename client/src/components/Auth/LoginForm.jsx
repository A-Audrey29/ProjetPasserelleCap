import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginForm() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const demoAccounts = [
    { role: 'ADMIN', email: 'admin@passerelle.cap', password: 'Admin!234' },
    { role: 'EMETTEUR', email: 'emetteur@tas.cap', password: 'Demo!123' },
    { role: 'RELATIONS_EVS', email: 'relations@feves.cap', password: 'Demo!123' },
    { role: 'EVS_CS', email: 'evs@association.cap', password: 'Demo!123' },
    { role: 'SUIVI_PROJETS', email: 'suivi@feves.cap', password: 'Demo!123' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      setLocation('/');
    } catch (err) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAccount = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-app-title">
            Passerelle CAP
          </h1>
          <p className="text-muted-foreground" data-testid="text-app-subtitle">
            Plateforme de gestion des fiches navettes
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm" data-testid="text-error">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                Email
              </label>
              <input 
                type="email" 
                id="email"
                className="input-field" 
                placeholder="votre.email@exemple.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="input-field pr-10" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="input-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>
          </div>
        </form>
        
        <div className="demo-accounts">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Comptes de démonstration :
          </p>
          <div className="space-y-1">
            {demoAccounts.map((account, index) => (
              <div 
                key={account.role}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-muted-foreground">
                  {account.role}: {account.email}
                </span>
                <button
                  type="button"
                  className="text-primary hover:text-primary/80 font-medium"
                  onClick={() => fillDemoAccount(account)}
                  data-testid={`button-demo-${account.role.toLowerCase()}`}
                >
                  Utiliser
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
