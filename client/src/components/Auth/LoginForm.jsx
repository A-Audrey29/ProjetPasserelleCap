import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff } from 'lucide-react';
import styles from './LoginForm.module.css';

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
    { role: 'SUIVI_PROJETS', email: 'suivi@feves.cap', password: 'Demo!123' },
    { role: 'CD', email: 'cd@conseil.dep', password: 'password123' }
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
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <h1 className={styles.appTitle} data-testid="text-app-title">
            Passerelle CAP
          </h1>
          <p className={styles.appSubtitle} data-testid="text-app-subtitle">
            Plateforme de gestion des fiches navettes
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          {error && (
            <div className={styles.errorMessage} data-testid="text-error">
              {error}
            </div>
          )}
          
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>
              Email
            </label>
            <input 
              type="email" 
              id="email"
              className={styles.formInput} 
              placeholder="votre.email@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="input-email"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              Mot de passe
            </label>
            <div className={styles.passwordContainer}>
              <input 
                type={showPassword ? "text" : "password"}
                id="password"
                className={styles.formInput}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                data-testid="button-toggle-password"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading}
            data-testid="button-login"
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        
        <div className={styles.demoSection}>
          <h3 className={styles.demoTitle}>Comptes de démonstration</h3>
          <div className={styles.demoAccounts}>
            {demoAccounts.map((account, index) => (
              <div key={index} className={styles.demoAccount}>
                <div className={styles.demoInfo}>
                  <span className={styles.demoRole}>{account.role}</span>
                  <span className={styles.demoEmail}>{account.email}</span>
                </div>
                <button
                  type="button"
                  className={styles.demoButton}
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