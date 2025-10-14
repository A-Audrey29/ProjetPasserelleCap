import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Phone, Mail, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Layout/Header';
import styles from './Contact.module.css';

export default function Contact() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, authLoading, setLocation]);

  if (authLoading) {
    return (
      <div className={styles.contactContainer}>
        <Header />
        <main className={styles.mainContent}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingContent}>
              <div className={styles.spinner}></div>
              <p className={styles.loadingText}>Chargement...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className={styles.contactContainer}>
      <Header />
      
      <main className={styles.mainContent}>
        <div className={styles.headerSection}>
          <h1 className={styles.pageTitle}>
            Nous contacter
          </h1>
          <p className={styles.pageSubtitle}>
            Pour toute question concernant la plateforme Passerelle CAP
          </p>
        </div>

        <div className={styles.contentGrid}>
          {/* Contact Information */}
          <div className={styles.contactInfoSection}>
            <div className={styles.contactCard}>
              <h2 className={styles.cardTitle}>
                Informations de contact
              </h2>
              
              <div className={styles.contactDetails}>
                {/* MASQUÉ TEMPORAIREMENT - Section Téléphone
                <div className={styles.contactItem}>
                  <Phone className={`w-5 h-5 ${styles.contactIcon}`} />
                  <div className={styles.contactItemContent}>
                    <p>Téléphone</p>
                    <p>+590 690 37 05 73</p>
                  </div>
                </div>
                */}
                
                <div className={styles.contactItem}>
                  <Mail className={`w-5 h-5 ${styles.contactIcon}`} />
                  <div className={styles.contactItemContent}>
                    <p>Email</p>
                    <p> cap-cd@fevesguadeloupeetsaintmartin.org</p>
                  </div>
                </div>
                
                {/* MASQUÉ TEMPORAIREMENT - Section Adresse postale
                <div className={styles.contactItem}>
                  <MapPin className={`w-5 h-5 ${styles.contactIcon}`} />
                  <div className={styles.contactItemContent}>
                    <p>Adresse</p>
                    <p>
                      28 rue Léon Blum<br />
                      97111 Morne-à-l'eau
                    </p>
                  </div>
                </div>
                */}
              </div>
            </div>

            {/* MASQUÉ TEMPORAIREMENT - Section Horaires d'ouverture
            <div className={styles.contactCard}>
              <h2 className={styles.cardTitle}>
                Horaires d'ouverture
              </h2>
              
              <div className={styles.hoursDetails}>
                <div className={styles.hourItem}>
                  <span>Lundi - Vendredi</span>
                  <span className={styles.hourTime}>9h00 - 18h00</span>
                </div>
                <div className={styles.hourItem}>
                  <span>Samedi</span>
                  <span className={styles.hourTime}>9h00 - 12h00</span>
                </div>
                <div className={styles.hourItem}>
                  <span>Dimanche</span>
                  <span className={styles.hourTime}>Fermé</span>
                </div>
              </div>
            </div>
            */}
          </div>

          {/* MASQUÉ TEMPORAIREMENT - Formulaire de contact
          <div className={styles.contactCard}>
            <h2 className={styles.cardTitle}>
              Envoyer un message
            </h2>
            
            <form className={styles.contactForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Sujet
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Sujet de votre message"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Message
                </label>
                <textarea
                  rows="6"
                  className={styles.formTextarea}
                  placeholder="Décrivez votre demande..."
                />
              </div>
              
              <button
                type="submit"
                className={styles.submitButton}
                data-testid="button-send-message"
              >
                Envoyer le message
              </button>
            </form>
          </div>
          */}
        </div>
      </main>
    </div>
  );
}
