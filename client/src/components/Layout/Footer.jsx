import { Link } from 'wouter';
import styles from './Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer} data-testid="footer">
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.section}>
            <h3 className={styles.title}>Passerelle CAP</h3>
            <p className={styles.description}>
              Plateforme de gestion des Contrats d'Accompagnement Personnalisé
            </p>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>FEVES</h4>
            <p className={styles.text}>
              Fédération des Espaces de Vie et des centres Sociaux de Guadeloupe et Saint-Martin
            </p>
            <p className={styles.text}>28 rue Léon Blum</p>
            <p className={styles.text}>97111 Morne-à-l'eau</p>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Contact</h4>
            <p className={styles.text}>
              <a 
                href="mailto:contacts@fevesguadeloupeetsaintmartin.org" 
                className={styles.link}
                data-testid="link-contact-email"
              >
                contacts@fevesguadeloupeetsaintmartin.org
              </a>
            </p>
            <p className={styles.text}>
              <a 
                href="tel:+590690370573" 
                className={styles.link}
                data-testid="link-contact-phone"
              >
                +590 690 37 05 73
              </a>
            </p>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Informations légales</h4>
            <nav className={styles.legalNav}>
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
            </nav>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright} data-testid="text-copyright">
            © {currentYear} FEVES - Tous droits réservés
          </p>
        </div>
      </div>
    </footer>
  );
}
