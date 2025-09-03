// Fiche states and their labels
export const STATE_LABELS = {
  DRAFT: 'Brouillon',
  SUBMITTED_TO_CD: 'Soumis au CD',
  SUBMITTED_TO_FEVES: 'Envoyé FEVES',
  ASSIGNED_EVS: 'Affecté EVS',
  EVS_ACCEPTED: 'Accepté EVS',
  EVS_REJECTED: 'Refusé EVS',
  NEEDS_INFO: 'Infos demandées',
  CONTRACT_SENT: 'Contrat envoyé',
  CONTRACT_SIGNED: 'Contrat signé',
  ADVANCE_70_PAID: 'Avance 70% payée',
  ACTIVITY_DONE: 'Activité réalisée',
  FIELD_CHECK_SCHEDULED: 'Vérification programmée',
  FIELD_CHECK_DONE: 'Vérification effectuée',
  FINAL_REPORT_RECEIVED: 'Rapport final reçu',
  REMAINING_30_PAID: 'Solde 30% payé',
  CLOSED: 'Clôturé',
  ARCHIVED: 'Archivé'
};

// User roles and their labels
export const ROLE_LABELS = {
  ADMIN: 'Administrateur',
  SUIVI_PROJETS: 'Suivi Projets',
  EMETTEUR: 'Émetteur (TAS/FEVES)',
  RELATIONS_EVS: 'Relations EVS (FEVES)',
  EVS_CS: 'EVS/CS'
};

// Organization types
export const ORG_TYPE_LABELS = {
  EVS: 'Espace de Vie Sociale',
  CS: 'Centre Social'
};

// Payment kinds
export const PAYMENT_KIND_LABELS = {
  ADVANCE_70: 'Avance 70%',
  REMAINING_30: 'Solde 30%'
};

// Workshop objectives
export const OBJECTIVE_LABELS = {
  OBJ1: 'Compétences parentales',
  OBJ2: 'Communication intergénérationnelle',
  OBJ3: 'Dynamiques par le sport'
};

// File upload constraints
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  ALLOWED_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png']
};

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me'
  },
  FICHES: {
    LIST: '/api/fiches',
    CREATE: '/api/fiches',
    DETAIL: (id) => `/api/fiches/${id}`,
    UPDATE: (id) => `/api/fiches/${id}`,
    TRANSITION: (id) => `/api/fiches/${id}/transition`,
    ASSIGN: (id) => `/api/fiches/${id}/assign`,
    COMMENTS: (id) => `/api/fiches/${id}/comments`,
    ATTACHMENTS: (id) => `/api/fiches/${id}/attachments`
  },
  REFERENCE: {
    EPSI: '/api/epsi',
    ORGANIZATIONS: '/api/organizations',
    WORKSHOPS: '/api/workshops',
    OBJECTIVES: '/api/objectives',
    FAMILIES: '/api/families'
  },
  ADMIN: {
    USERS: '/api/admin/users',
    STATS: '/api/admin/stats'
  },
  UPLOADS: '/api/uploads',
  DASHBOARD: {
    STATS: '/api/dashboard/stats'
  },
  AUDIT: '/api/audit'
};

// Colors for charts and visualizations
export const CHART_COLORS = {
  primary: '#3B4B61',
  success: '#6A8B74',
  warning: '#D9A066',
  destructive: '#8C4A4A',
  muted: '#64748B'
};

// Date formats
export const DATE_FORMATS = {
  SHORT: 'dd/MM/yyyy',
  LONG: 'dd MMMM yyyy',
  DATETIME: 'dd/MM/yyyy HH:mm'
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
};

// Form validation messages
export const VALIDATION_MESSAGES = {
  REQUIRED: 'Ce champ est requis',
  EMAIL: 'Email invalide',
  MIN_LENGTH: (min) => `Minimum ${min} caractères`,
  MAX_LENGTH: (max) => `Maximum ${max} caractères`,
  PHONE: 'Numéro de téléphone invalide',
  DATE: 'Date invalide'
};

// Success/Error messages
export const MESSAGES = {
  SUCCESS: {
    LOGIN: 'Connexion réussie',
    LOGOUT: 'Déconnexion réussie',
    FICHE_CREATED: 'Fiche créée avec succès',
    FICHE_UPDATED: 'Fiche mise à jour',
    COMMENT_ADDED: 'Commentaire ajouté',
    ASSIGNMENT_SUCCESS: 'Affectation réussie',
    STATE_UPDATED: 'État mis à jour'
  },
  ERROR: {
    LOGIN_FAILED: 'Email ou mot de passe incorrect',
    NETWORK_ERROR: 'Erreur de connexion',
    UNAUTHORIZED: 'Accès non autorisé',
    NOT_FOUND: 'Ressource non trouvée',
    VALIDATION_ERROR: 'Données invalides',
    UPLOAD_ERROR: 'Erreur lors du téléchargement'
  }
};
