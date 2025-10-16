/**
 * Standardized error codes for the application
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'ERR_001',
  AUTHENTICATION_ERROR: 'ERR_002',
  AUTHORIZATION_ERROR: 'ERR_003',
  NOT_FOUND: 'ERR_004',
  BUSINESS_LOGIC_ERROR: 'ERR_005',
  INTERNAL_SERVER_ERROR: 'ERR_500',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Get a user-friendly error message based on status code
 */
export function getErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Requête invalide';
    case 401:
      return 'Non authentifié';
    case 403:
      return 'Accès refusé';
    case 404:
      return 'Ressource non trouvée';
    case 409:
      return 'Conflit avec l\'état actuel';
    case 422:
      return 'Données invalides';
    case 429:
      return 'Trop de requêtes';
    case 500:
    default:
      return 'Erreur serveur interne';
  }
}

/**
 * Get error code based on status code
 * Note: For business logic errors (ERR_005), set err.code = ErrorCodes.BUSINESS_LOGIC_ERROR manually
 */
export function getErrorCode(statusCode: number): ErrorCode {
  switch (statusCode) {
    case 400:
    case 422:
      return ErrorCodes.VALIDATION_ERROR;
    case 401:
      return ErrorCodes.AUTHENTICATION_ERROR;
    case 403:
      return ErrorCodes.AUTHORIZATION_ERROR;
    case 404:
      return ErrorCodes.NOT_FOUND;
    case 409:
      // Conflict - typically a business logic error
      return ErrorCodes.BUSINESS_LOGIC_ERROR;
    case 429:
      // Rate limit - treat as validation error (too many requests)
      return ErrorCodes.VALIDATION_ERROR;
    case 500:
    default:
      return ErrorCodes.INTERNAL_SERVER_ERROR;
  }
}
