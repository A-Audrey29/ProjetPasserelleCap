import { Link } from 'wouter';
import { FileText, Users, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Layout/Header';
import styles from './Home.module.css';

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className={styles.homeContainer}>
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Bienvenue sur Passerelle CAP
            </h1>
            <p className={styles.heroSubtitle}>
              La plateforme numérique dédiée à l'accompagnement personnalisé des familles. 
              Simplifiez la gestion de vos fiches navettes CAP et optimisez vos parcours d'accompagnement.
            </p>
            {!isAuthenticated && (
              <Link href="/login" className={styles.ctaButton}>
                Accéder à la plateforme
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </section>

        {/* What is CAP */}
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.capGrid}>
              <div className={styles.capContent}>
                <h2 className={styles.sectionTitle}>
                  Qu'est-ce que le CAP ?
                </h2>
                <div className={styles.textContent}>
                  <p>
                    Le <strong>Contrat d'Accompagnement Personnalisé</strong> (CAP) est un dispositif d'aide aux familles 
                    qui facilite l'accès aux services et prestations nécessaires à l'épanouissement familial.
                  </p>
                  <p>
                    Ce contrat personnalisé permet un accompagnement sur mesure, adapté aux besoins spécifiques 
                    de chaque famille, en mobilisant les ressources locales et en coordonnant les interventions 
                    des différents acteurs sociaux.
                  </p>
                  <p>
                    Il s'inscrit dans une démarche de <strong>prévention</strong> et de 
                    <strong> soutien à la parentalité</strong>, visant à renforcer 
                    les compétences parentales et le bien-être familial.
                  </p>
                </div>
              </div>
              <div className={styles.capCard}>
                <div className={styles.capCardHeader}>
                  <div className={styles.iconContainer}>
                    <Users className={`w-6 h-6 ${styles.iconPrimary}`} />
                  </div>
                  <h3 className={styles.cardTitle}>Accompagnement personnalisé</h3>
                </div>
                <p className={styles.cardText}>
                  Chaque famille bénéficie d'un accompagnement adapté à ses besoins, 
                  avec un suivi régulier et des objectifs personnalisés.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Fiches Navettes */}
        <section className={styles.sectionCard}>
          <div className={styles.container}>
            <div className={styles.fichesHeader}>
              <h2 className={styles.sectionTitle}>
                Pourquoi les fiches navettes ?
              </h2>
              <p className={styles.fichesSubtitle}>
                Les fiches navettes sont au cœur du processus CAP. Elles garantissent une coordination 
                efficace entre tous les acteurs de l'accompagnement familial.
              </p>
            </div>
            
            <div className={styles.featuresGrid}>
              <div className={styles.featureCard}>
                <div className={`${styles.featureIcon} ${styles.iconSuccess}`}>
                  <FileText className={`w-8 h-8 ${styles.iconSuccessColor}`} />
                </div>
                <h3 className={styles.featureTitle}>Traçabilité</h3>
                <p className={styles.featureDescription}>
                  Chaque étape de l'accompagnement est documentée, permettant un suivi précis 
                  et une continuité des interventions.
                </p>
              </div>
              
              <div className={styles.featureCard}>
                <div className={`${styles.featureIcon} ${styles.iconWarning}`}>
                  <Users className={`w-8 h-8 ${styles.iconWarningColor}`} />
                </div>
                <h3 className={styles.featureTitle}>Coordination</h3>
                <p className={styles.featureDescription}>
                  Facilite la communication entre EPSI, EVS, CS et autres partenaires 
                  pour un accompagnement cohérent.
                </p>
              </div>
              
              <div className={styles.featureCard}>
                <div className={`${styles.featureIcon} ${styles.iconContainer}`}>
                  <CheckCircle className={`w-8 h-8 ${styles.iconPrimary}`} />
                </div>
                <h3 className={styles.featureTitle}>Efficacité</h3>
                <p className={styles.featureDescription}>
                  Optimise les délais de traitement et améliore la qualité 
                  de l'accompagnement grâce à une gestion structurée.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Purpose of the Platform */}
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.missionCard}>
              <div className={styles.missionContent}>
                <h2 className={styles.missionTitle}>
                  Notre mission
                </h2>
                <p className={styles.missionDescription}>
                  Passerelle CAP digitalise et simplifie la gestion des contrats d'accompagnement personnalisé. 
                  Notre plateforme permet aux professionnels de l'action sociale de se concentrer sur l'essentiel : 
                  <strong> l'accompagnement humain des familles</strong>.
                </p>
                <div className={styles.benefitsGrid}>
                  <div className={styles.benefitSection}>
                    <h3 className={styles.benefitSectionTitle}>Pour les professionnels</h3>
                    <div className={styles.benefitList}>
                      <div>• Gestion simplifiée des fiches navettes</div>
                      <div>• Suivi en temps réel des dossiers</div>
                      <div>• Coordination facilitée entre services</div>
                      <div>• Reporting et analyses automatisés</div>
                    </div>
                  </div>
                  <div className={styles.benefitSection}>
                    <h3 className={styles.benefitSectionTitle}>Pour les familles</h3>
                    <div className={styles.benefitList}>
                      <div>• Accompagnement plus réactif</div>
                      <div>• Continuité des interventions</div>
                      <div>• Transparence sur le suivi</div>
                      <div>• Qualité d'accompagnement renforcée</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {isAuthenticated && (
          <section className={styles.userWelcomeSection}>
            <div className={styles.userWelcomeContent}>
              <h2 className={styles.userWelcomeTitle}>
                Bienvenue, {user?.role === 'ADMIN' ? 'Administrateur' : 
                           user?.role === 'EMETTEUR' ? 'Émetteur' :
                           user?.role === 'SUIVI_PROJETS' ? 'Responsable Suivi' :
                           user?.role === 'RELATIONS_EVS' ? 'Relations EVS' : 'Utilisateur'}
              </h2>
              <p className={styles.userWelcomeText}>
                Accédez à vos outils de travail et gérez vos fiches navettes
              </p>
              <div className={styles.actionButtons}>
                <Link href="/dashboard" className={styles.primaryButton}>
                  Tableau de bord
                </Link>
                <Link href="/fiches" className={styles.secondaryButton}>
                  Fiches Actives
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}