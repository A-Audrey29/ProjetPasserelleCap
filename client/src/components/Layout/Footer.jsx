import { Link } from 'wouter';
import styles from './Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer} data-testid="footer">
      <div className={styles.container}>
        <div className={styles.legalLinks}>
          <Link 
            href="/mentions-legales" 
            className={styles.legalLink}
            data-testid="link-mentions-legales"
          >
            Mentions légales
          </Link>
          <Link 
            href="/politique-confidentialite" 
            className={styles.legalLink}
            data-testid="link-politique-confidentialite"
          >
            Politique de confidentialité
          </Link>
        </div>

        {/* <div className={styles.bottom}>
          <p className={styles.copyright}>
            © {currentYear} SELFIE ME - Tous droits réservés
          </p>
        </div> */}
      </div>
    </footer>
  );
}
