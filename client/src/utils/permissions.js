// Role-based permissions system based on authorization matrix
export const ROLES = {
  ADMIN: 'ADMIN',
  SUIVI_PROJETS: 'SUIVI_PROJETS', 
  EMETTEUR: 'EMETTEUR',
  RELATIONS_EVS: 'RELATIONS_EVS',
  EVS_CS: 'EVS_CS',
  CD: 'CD'
};

export const ACTIONS = {
  // Consultation
  VIEW_ALL_FICHES: 'view_all_fiches',
  VIEW_OWN_FICHES: 'view_own_fiches',
  VIEW_FILTERED_FICHES: 'view_filtered_fiches',
  VIEW_ASSIGNED_FICHES: 'view_assigned_fiches',
  VIEW_HISTORY_COMPLETE: 'view_history_complete',
  VIEW_HISTORY_LIMITED: 'view_history_limited',
  SEARCH_ADVANCED: 'search_advanced',
  SEARCH_BASIC: 'search_basic',
  
  // Creation & Edition
  CREATE_FICHE: 'create_fiche',
  CREATE_FICHE_AUTO_SAISINE: 'create_fiche_auto_saisine',
  MODIFY_FICHE: 'modify_fiche',
  MODIFY_FICHE_BEFORE_VALIDATION: 'modify_fiche_before_validation',
  MODIFY_FICHE_BEFORE_TRANSMISSION: 'modify_fiche_before_transmission',
  COMPLETE_FICHE_PARTIAL: 'complete_fiche_partial',
  COMPLETE_FICHE_MAIN: 'complete_fiche_main',
  
  // Validation & Workflow
  VALIDATE_OFFICIAL: 'validate_official',
  VALIDATE_PRE: 'validate_pre',
  VALIDATE_LOCAL_CLOSURE: 'validate_local_closure',
  REFUSE_REQUEST_CORRECTIONS: 'refuse_request_corrections',
  CLOSE_FICHE: 'close_fiche',
  CLOSE_FICHE_PARTIAL: 'close_fiche_partial',
  
  // Documents & Resources
  UPLOAD_DOCUMENTS: 'upload_documents',
  UPLOAD_OWN_DOCUMENTS: 'upload_own_documents',
  DOWNLOAD_ALL_DOCUMENTS: 'download_all_documents',
  DOWNLOAD_OWN_DOCUMENTS: 'download_own_documents',
  ARCHIVE_FICHE: 'archive_fiche',
  ARCHIVE_LOCAL: 'archive_local',
  
  // Communication
  ADD_COMMENTS: 'add_comments',
  ADD_COMMENTS_OWN_FICHES: 'add_comments_own_fiches',
  MESSAGING: 'messaging',
  NOTIFICATIONS: 'notifications',
  
  // Monitoring & Statistics
  VIEW_PROGRESS_GLOBAL: 'view_progress_global',
  VIEW_PROGRESS_OWN: 'view_progress_own',
  VIEW_PROGRESS_TERRITORY: 'view_progress_territory',
  VIEW_DASHBOARD_GLOBAL: 'view_dashboard_global',
  VIEW_DASHBOARD_TERRITORY: 'view_dashboard_territory',
  EXPORT_DATA: 'export_data',
  EXPORT_DATA_LIMITED: 'export_data_limited',
  
  // Management
  MANAGE_PROFILE: 'manage_profile',
  MANAGE_USERS_ROLES: 'manage_users_roles'
};

// Permission matrix based on the authorization table
export const PERMISSIONS = {
  [ROLES.ADMIN]: [
    // Consultation - Full access
    ACTIONS.VIEW_ALL_FICHES,
    ACTIONS.VIEW_HISTORY_COMPLETE,
    ACTIONS.SEARCH_ADVANCED,
    
    // Creation & Edition - Full access
    ACTIONS.CREATE_FICHE,
    ACTIONS.MODIFY_FICHE,
    ACTIONS.COMPLETE_FICHE_PARTIAL,
    ACTIONS.COMPLETE_FICHE_MAIN,
    
    // Validation & Workflow - Full access
    ACTIONS.VALIDATE_OFFICIAL,
    ACTIONS.REFUSE_REQUEST_CORRECTIONS,
    ACTIONS.CLOSE_FICHE,
    
    // Documents - Full access
    ACTIONS.UPLOAD_DOCUMENTS,
    ACTIONS.DOWNLOAD_ALL_DOCUMENTS,
    ACTIONS.ARCHIVE_FICHE,
    
    // Communication - Full access
    ACTIONS.ADD_COMMENTS,
    ACTIONS.MESSAGING,
    ACTIONS.NOTIFICATIONS,
    
    // Monitoring - Global access
    ACTIONS.VIEW_PROGRESS_GLOBAL,
    ACTIONS.VIEW_DASHBOARD_GLOBAL,
    ACTIONS.EXPORT_DATA,
    
    // Management - Full admin
    ACTIONS.MANAGE_PROFILE,
    ACTIONS.MANAGE_USERS_ROLES
  ],
  
  [ROLES.SUIVI_PROJETS]: [
    // Consultation - Full access
    ACTIONS.VIEW_ALL_FICHES,
    ACTIONS.VIEW_HISTORY_COMPLETE,
    ACTIONS.SEARCH_ADVANCED,
    
    // Creation & Edition - No creation, but full modification
    ACTIONS.MODIFY_FICHE,
    ACTIONS.COMPLETE_FICHE_PARTIAL,
    ACTIONS.COMPLETE_FICHE_MAIN,
    
    // Validation & Workflow - Official validation
    ACTIONS.VALIDATE_OFFICIAL,
    ACTIONS.REFUSE_REQUEST_CORRECTIONS,
    ACTIONS.CLOSE_FICHE,
    
    // Documents - Full access
    ACTIONS.UPLOAD_DOCUMENTS,
    ACTIONS.DOWNLOAD_ALL_DOCUMENTS,
    ACTIONS.ARCHIVE_FICHE,
    
    // Communication - Full access
    ACTIONS.ADD_COMMENTS,
    ACTIONS.MESSAGING,
    ACTIONS.NOTIFICATIONS,
    
    // Monitoring - Global access
    ACTIONS.VIEW_PROGRESS_GLOBAL,
    ACTIONS.VIEW_DASHBOARD_GLOBAL,
    ACTIONS.EXPORT_DATA,
    
    // Management - Profile only
    ACTIONS.MANAGE_PROFILE
  ],
  
  [ROLES.EMETTEUR]: [
    // Consultation - Limited to own fiches
    ACTIONS.VIEW_OWN_FICHES,
    ACTIONS.VIEW_HISTORY_LIMITED,
    ACTIONS.SEARCH_BASIC,
    
    // Creation & Edition - Can create and modify before validation
    ACTIONS.CREATE_FICHE,
    ACTIONS.MODIFY_FICHE_BEFORE_VALIDATION,
    
    // Validation & Workflow - No validation rights
    
    // Documents - Own documents only
    ACTIONS.UPLOAD_OWN_DOCUMENTS,
    ACTIONS.DOWNLOAD_OWN_DOCUMENTS,
    
    // Communication - Own fiches only
    ACTIONS.ADD_COMMENTS_OWN_FICHES,
    ACTIONS.MESSAGING,
    ACTIONS.NOTIFICATIONS,
    
    // Monitoring - Own fiches only
    ACTIONS.VIEW_PROGRESS_OWN,
    
    // Management - Profile only
    ACTIONS.MANAGE_PROFILE
  ],
  
  [ROLES.RELATIONS_EVS]: [
    // Consultation - Basic fiche viewing only
    ACTIONS.VIEW_FILTERED_FICHES,
    
    // Creation & Edition - Can create new fiches only
    ACTIONS.CREATE_FICHE,
    
    // Management - Profile only
    ACTIONS.MANAGE_PROFILE
  ],
  
  [ROLES.EVS_CS]: [
    // Consultation - Assigned fiches only
    ACTIONS.VIEW_ASSIGNED_FICHES,
    ACTIONS.VIEW_HISTORY_LIMITED,
    ACTIONS.SEARCH_BASIC,
    
    // Creation & Edition - Auto-saisine if authorized, main completion role
    ACTIONS.CREATE_FICHE_AUTO_SAISINE,
    ACTIONS.MODIFY_FICHE,
    ACTIONS.COMPLETE_FICHE_MAIN,
    
    // Validation & Workflow - Local closure only
    ACTIONS.VALIDATE_LOCAL_CLOSURE,
    ACTIONS.CLOSE_FICHE_PARTIAL,
    
    // Documents - Full access
    ACTIONS.UPLOAD_DOCUMENTS,
    ACTIONS.DOWNLOAD_ALL_DOCUMENTS,
    ACTIONS.ARCHIVE_LOCAL,
    
    // Communication - Full access
    ACTIONS.ADD_COMMENTS,
    ACTIONS.MESSAGING,
    ACTIONS.NOTIFICATIONS,
    
    // Monitoring - Own fiches only
    ACTIONS.VIEW_PROGRESS_OWN,
    
    // Management - Profile only
    ACTIONS.MANAGE_PROFILE
  ],
  
  [ROLES.CD]: [
    // Consultation - Full read access to all fiches
    ACTIONS.VIEW_ALL_FICHES,
    ACTIONS.VIEW_HISTORY_COMPLETE,
    ACTIONS.SEARCH_ADVANCED,
    
    // Creation & Edition - Read-only (no creation or modification)
    
    // Validation & Workflow - CD validation powers (Valider/Refuser)
    ACTIONS.VALIDATE_OFFICIAL,
    ACTIONS.REFUSE_REQUEST_CORRECTIONS,
    
    // Documents - Read access only
    ACTIONS.DOWNLOAD_ALL_DOCUMENTS,
    
    // Communication - View comments only
    ACTIONS.MESSAGING,
    ACTIONS.NOTIFICATIONS,
    
    // Monitoring - Global view
    ACTIONS.VIEW_PROGRESS_GLOBAL,
    ACTIONS.VIEW_DASHBOARD_GLOBAL,
    ACTIONS.EXPORT_DATA,
    
    // Management - Profile only
    ACTIONS.MANAGE_PROFILE
  ]
};

// Utility function to check if a user has a specific permission
export const hasPermission = (userRole, action) => {
  if (!userRole || !action) return false;
  return PERMISSIONS[userRole]?.includes(action) || false;
};

// Utility function to get all permissions for a role
export const getRolePermissions = (role) => {
  return PERMISSIONS[role] || [];
};

// Utility function to check multiple permissions
export const hasAnyPermission = (userRole, actions) => {
  if (!userRole || !actions || !Array.isArray(actions)) return false;
  return actions.some(action => hasPermission(userRole, action));
};

// Utility function to check all permissions
export const hasAllPermissions = (userRole, actions) => {
  if (!userRole || !actions || !Array.isArray(actions)) return false;
  return actions.every(action => hasPermission(userRole, action));
};

// Get role-specific action suggestions for the home page
export const getRoleActionSuggestions = (role) => {
  const actionSuggestions = [];
  
  
  // Simplified approach: provide actions based on role regardless of specific permissions
  // This ensures all roles get basic actions displayed
  
  // All roles get a view fiches action with appropriate scope
  if (role === ROLES.ADMIN || role === ROLES.SUIVI_PROJETS) {
    actionSuggestions.push({
      icon: 'Eye',
      title: 'Consulter toutes les fiches navettes',
      description: 'Visualiser et suivre l\'état de toutes les fiches',
      href: '/fiches',
      color: 'primary'
    });
  } else if (role === ROLES.CD) {
    // CD actions are handled separately below - no default action here
  } else if (role === ROLES.RELATIONS_EVS) {
    actionSuggestions.push({
      icon: 'Eye', 
      title: 'Consulter les fiches de votre territoire',
      description: 'Visualiser les fiches de votre périmètre géographique',
      href: '/fiches',
      color: 'primary'
    });
  } else if (role === ROLES.EVS_CS) {
    actionSuggestions.push({
      icon: 'Eye',
      title: 'Consulter vos fiches attribuées',
      description: 'Visualiser les fiches qui vous sont assignées',
      href: '/fiches',
      color: 'primary'
    });
  } else if (role === ROLES.EMETTEUR) {
    actionSuggestions.push({
      icon: 'Eye',
      title: 'Consulter vos fiches navettes', 
      description: 'Visualiser et suivre vos fiches créées',
      href: '/fiches',
      color: 'primary'
    });
  }

  // Creation actions - ADMIN, EMETTEUR, and RELATIONS_EVS can create fiches
  if (role === ROLES.ADMIN || role === ROLES.EMETTEUR || role === ROLES.RELATIONS_EVS) {
    actionSuggestions.push({
      icon: 'Plus',
      title: 'Émettre une nouvelle fiche navette',
      description: 'Créer une nouvelle demande d\'accompagnement CAP',
      href: '/fiches/new',
      color: 'success'
    });
  }

  // Role-specific actions
  if (role === ROLES.ADMIN) {
    actionSuggestions.push({
      icon: 'Settings',
      title: 'Administration système',
      description: 'Gérer les utilisateurs et paramètres de la plateforme',
      href: '/administration',
      color: 'warning'
    });
    actionSuggestions.push({
      icon: 'BarChart3',
      title: 'Rapports et statistiques globales',
      description: 'Analyser les données de toute la plateforme',
      href: '/reports',
      color: 'success'
    });
  }
  
  if (role === ROLES.SUIVI_PROJETS) {
    actionSuggestions.push({
      icon: 'CheckCircle',
      title: 'Validation officielle des fiches',
      description: 'Valider officiellement les étapes du parcours',
      href: '/validation',
      color: 'success'
    });
    actionSuggestions.push({
      icon: 'BarChart3',
      title: 'Tableau de bord global',
      description: 'Suivre l\'avancement de tous les projets',
      href: '/reports',
      color: 'primary'
    });
  }
  
  if (role === ROLES.EMETTEUR) {
    actionSuggestions.push({
      icon: 'Edit',
      title: 'Modifier vos fiches en cours',
      description: 'Compléter vos fiches avant validation',
      href: '/fiches?status=draft',
      color: 'warning'
    });
  }
  
  if (role === ROLES.RELATIONS_EVS) {
    actionSuggestions.push({
      icon: 'CheckCircle',
      title: 'Valider et transmettre les fiches',
      description: 'Traiter les fiches prêtes à être affectées aux EVS',
      href: '/fiches?state=SUBMITTED_TO_FEVES',
      color: 'warning'
    });
  }
  
  // EVS/CS - Système d'ateliers collectifs
  // Les EVS/CS gèrent maintenant des sessions d'ateliers collectifs automatisées
  // au lieu de compléter individuellement chaque fiche navette
  if (role === ROLES.EVS_CS) {
    actionSuggestions.push({
      icon: 'Users',
      title: 'Gestion des Ateliers',
      description: 'Gérer vos sessions d\'ateliers et inscriptions',
      href: '/ateliers',
      color: 'primary'
    });
  }
  
  if (role === ROLES.CD) {
    actionSuggestions.push({
      icon: 'CheckCircle',
      title: 'Fiches en attente de validations',
      description: 'Valider les fiches soumises pour transmission à FEVES',
      href: '/fiches?state=SUBMITTED_TO_CD',
      color: 'success'
    });
    actionSuggestions.push({
      icon: 'FileText',
      title: 'Consulter les Fiches',
      description: 'Consulter toutes les fiches du système',
      href: '/fiches',
      color: 'primary'
    });
  }

  return actionSuggestions;
};