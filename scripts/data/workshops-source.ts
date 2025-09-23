/**
 * Données sources pures pour les ateliers et objectifs
 * Utilisé par les scripts de migration et d'initialisation
 */

export const objectives = [
  {
    id: "obj1",
    code: "OBJ1",
    name: "Développement des compétences parentales pour favoriser la réussite scolaire des enfants.",
    description: null,
    order: 1,
  },
  {
    id: "obj2",
    code: "OBJ2",
    name: "Renforcement des liens familiaux par la communication intergénérationnelle pour favoriser la réussite scolaire des enfants.",
    description: null,
    order: 2,
  },
  {
    id: "obj3",
    code: "OBJ3",
    name: "Renforcement des dynamiques familiales positives par le sport",
    description: null,
    order: 3,
  },
];

export const workshopData = [
  // Objective 1 workshops
  {
    id: "obj1-001",
    objectiveId: "obj1",
    name: "Gestion du temps et de l'organisation familiale",
    description: "Aider les familles à organiser le temps entre les activités scolaires, les loisirs et la vie familiale.",
  },
  {
    id: "obj1-002",
    objectiveId: "obj1",
    name: "Communication entre parents et enfants",
    description: "Renforcer la communication au sein de la famille pour créer un environnement propice à l'apprentissage.",
  },
  {
    id: "obj1-003",
    objectiveId: "obj1",
    name: "Atelier sur les méthodes d'apprentissage à la maison",
    description: "Fournir aux parents des outils pratiques pour soutenir l'apprentissage des enfants à la maison.",
  },
  {
    id: "obj1-004",
    objectiveId: "obj1",
    name: "Soutien émotionnel et la motivation scolaire",
    description: "Apprendre aux parents à soutenir la motivation de leurs enfants et à gérer les émotions liées à l'école (stress, anxiété, etc.).",
  },

  // Objective 2 workshops
  {
    id: "obj2-001",
    objectiveId: "obj2",
    name: "La parole des aînés : une richesse pour l'éducation",
    description: "Aider les parents à mieux accompagner leurs enfants dans leur parcours scolaire.",
  },
  {
    id: "obj2-002",
    objectiveId: "obj2",
    name: "Mieux se comprendre pour mieux s'entraider",
    description: "Gérer les émotions liées à l'école.",
  },
  {
    id: "obj2-003",
    objectiveId: "obj2",
    name: "Soutien scolaire et méthodes familiales d'apprentissage",
    description: "Soutenir les enfants dans leur parcours.",
  },
  {
    id: "obj2-004",
    objectiveId: "obj2",
    name: "Renforcer la motivation scolaire par le dialogue",
    description: "Encourager la projection positive.",
  },

  // Objective 3 workshops
  {
    id: "obj3-001",
    objectiveId: "obj3",
    name: "Pratique d'activité physique",
    description: "Renforcer les liens familiaux par le bien-être physique et mental.",
  },
  {
    id: "obj3-002",
    objectiveId: "obj3",
    name: "Atelier découverte Sport/Étude",
    description: "Comprendre l'impact du sport sur la motivation scolaire.",
  },
  {
    id: "obj3-003",
    objectiveId: "obj3",
    name: "Atelier challenge famille",
    description: "Créer un événement sportif ludique inter-familles.",
  },
];