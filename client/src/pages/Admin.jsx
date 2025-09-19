import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Layout/Header';
import AdminDashboard from '@/components/Admin/AdminDashboard';
import styles from './Admin.module.css';

export default function Admin() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.user?.role !== 'ADMIN')) {
      setLocation('/');
    }
  }, [isAuthenticated, authLoading, user, setLocation]);

  if (authLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.user?.role !== 'ADMIN') {
    return null; // Will redirect
  }

  return (
    <div className={styles.adminContainer}>
      <Header />
      
      <main className={styles.mainContent}>
        <AdminDashboard />
      </main>
    </div>
  );
}
