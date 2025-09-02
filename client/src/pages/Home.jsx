import { Link } from 'wouter';
import { FileText, Users, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Layout/Header';

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="bg-white border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
            <div className="text-center">
              <h1 className="h1 text-foreground mb-6">
                Bienvenue sur Passerelle CAP
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
                La plateforme numérique dédiée à l'accompagnement personnalisé des familles. 
                Simplifiez la gestion de vos fiches navettes CAP et optimisez vos parcours d'accompagnement.
              </p>
              {!isAuthenticated && (
                <Link href="/login" className="btn btn-primary inline-flex items-center gap-2">
                  Accéder à la plateforme
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* What is CAP */}
        <section className="py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <h2 className="h2 text-foreground mb-6">
                  Qu'est-ce que le CAP ?
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Le <strong className="text-foreground">Contrat d'Accompagnement Personnalisé</strong> (CAP) est un dispositif d'aide aux familles 
                    qui facilite l'accès aux services et prestations nécessaires à l'épanouissement familial.
                  </p>
                  <p>
                    Ce contrat personnalisé permet un accompagnement sur mesure, adapté aux besoins spécifiques 
                    de chaque famille, en mobilisant les ressources locales et en coordonnant les interventions 
                    des différents acteurs sociaux.
                  </p>
                  <p>
                    Il s'inscrit dans une démarche de <strong className="text-foreground">prévention</strong> et de 
                    <strong className="text-foreground"> soutien à la parentalité</strong>, visant à renforcer 
                    les compétences parentales et le bien-être familial.
                  </p>
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="h3 text-foreground">Accompagnement personnalisé</h3>
                </div>
                <p className="text-muted-foreground">
                  Chaque famille bénéficie d'un accompagnement adapté à ses besoins, 
                  avec un suivi régulier et des objectifs personnalisés.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Fiches Navettes */}
        <section className="bg-card py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="h2 text-foreground mb-4">
                Pourquoi les fiches navettes ?
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Les fiches navettes sont au cœur du processus CAP. Elles garantissent une coordination 
                efficace entre tous les acteurs de l'accompagnement familial.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-success/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-success" />
                </div>
                <h3 className="h3 text-foreground mb-3">Traçabilité</h3>
                <p className="text-muted-foreground">
                  Chaque étape de l'accompagnement est documentée, permettant un suivi précis 
                  et une continuité des interventions.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-warning/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-warning" />
                </div>
                <h3 className="h3 text-foreground mb-3">Coordination</h3>
                <p className="text-muted-foreground">
                  Facilite la communication entre EPSI, EVS, CS et autres partenaires 
                  pour un accompagnement cohérent.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <h3 className="h3 text-foreground mb-3">Efficacité</h3>
                <p className="text-muted-foreground">
                  Optimise les délais de traitement et améliore la qualité 
                  de l'accompagnement grâce à une gestion structurée.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Purpose of the Platform */}
        <section className="py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-primary text-primary-foreground rounded-xl p-8 lg:p-12">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="h2 mb-6">
                  Notre mission
                </h2>
                <p className="text-xl leading-relaxed mb-8 opacity-95">
                  Passerelle CAP digitalise et simplifie la gestion des contrats d'accompagnement personnalisé. 
                  Notre plateforme permet aux professionnels de l'action sociale de se concentrer sur l'essentiel : 
                  <strong className="font-semibold"> l'accompagnement humain des familles</strong>.
                </p>
                <div className="grid md:grid-cols-2 gap-8 text-left">
                  <div>
                    <h3 className="font-semibold mb-3">Pour les professionnels</h3>
                    <ul className="space-y-2 opacity-95">
                      <li>• Gestion simplifiée des fiches navettes</li>
                      <li>• Suivi en temps réel des dossiers</li>
                      <li>• Coordination facilitée entre services</li>
                      <li>• Reporting et analyses automatisés</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Pour les familles</h3>
                    <ul className="space-y-2 opacity-95">
                      <li>• Accompagnement plus réactif</li>
                      <li>• Continuité des interventions</li>
                      <li>• Transparence sur le suivi</li>
                      <li>• Qualité d'accompagnement renforcée</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {isAuthenticated && (
          <section className="bg-card py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="h2 text-foreground mb-4">
                Bienvenue, {user?.role === 'ADMIN' ? 'Administrateur' : 
                           user?.role === 'EMETTEUR' ? 'Émetteur' :
                           user?.role === 'SUIVI_PROJETS' ? 'Responsable Suivi' :
                           user?.role === 'RELATIONS_EVS' ? 'Relations EVS' : 'Utilisateur'}
              </h2>
              <p className="text-muted-foreground mb-8">
                Accédez à vos outils de travail et gérez vos fiches navettes
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/dashboard" className="btn btn-primary">
                  Tableau de bord
                </Link>
                <Link href="/fiches" className="btn btn-secondary">
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