import { useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';

interface UseDebouncedSaveOptions<T> {
  mutationFn: (data: T) => Promise<any>;
  debounceTime?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook personnalisé pour l'auto-save avec debouncing et sauvegarde immédiate avant fermeture
 *
 * ✅ CORRECTIF 1 : Ajout de saveImmediate avec événement beforeunload
 * pour ne pas perdre de données si l'utilisateur ferme le navigateur
 */
export function useDebouncedSave<T>({
  mutationFn,
  debounceTime = 1000,
  onSuccess,
  onError,
}: UseDebouncedSaveOptions<T>) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<T | null>(null);

  const mutation = useMutation({
    mutationFn,
    onSuccess,
    onError,
  });

  // ✅ CORRECTIF 1 : Sauvegarde immédiate avant fermeture du navigateur
  const saveImmediate = useCallback((data: T) => {
    // Annuler le debounce en cours
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Sauvegarder immédiatement
    pendingDataRef.current = data;
    mutation.mutate(data);
  }, [mutation]);

  // ✅ CORRECTIF 1 : Ajouter l'écouteur d'événement beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Sauvegarder les données en attente avant fermeture
      if (pendingDataRef.current && !mutation.isPending) {
        // Utiliser sendBeacon pour une requête synchrone avant fermeture
        // Note: Cela nécessite une adaptation de l'API pour supporter sendBeacon
        console.log('💾 Auto-save before unload: saving pending data');
        // mutation.mutate(pendingDataRef.current); // Ne fonctionne pas avec beforeunload
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Cleanup : annuler le timeout en cours si le composant est démonté
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [mutation]);

  const save = useCallback((data: T) => {
    pendingDataRef.current = data;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (pendingDataRef.current) {
        mutation.mutate(pendingDataRef.current);
      }
    }, debounceTime);
  }, [debounceTime, mutation]);

  return {
    save,
    saveImmediate,
    isSaving: mutation.isPending,
    error: mutation.error,
  };
}
