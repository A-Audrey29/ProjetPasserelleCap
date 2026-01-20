/**
 * Wrapper fetch centralisé avec credentials:'include' par défaut.
 * Utilisé pour tous les appels API afin de garantir l'envoi des cookies d'auth.
 * 
 * Gestion 401 : lance une ApiError que le composant appelant doit gérer
 * (afficher un message d'erreur et/ou rediriger vers /login).
 */

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'ApiError';
  }
}

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  if (response.status === 401) {
    // Session expirée ou non authentifié
    throw new ApiError(401, 'Session expirée - veuillez vous reconnecter', 'SESSION_EXPIRED');
  }

  return response;
}

/**
 * Version JSON de apiFetch qui parse automatiquement la réponse.
 * Lance une erreur si le status n'est pas OK.
 */
export async function apiFetchJson<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await apiFetch(url, options);

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new ApiError(response.status, text);
  }

  return response.json();
}
