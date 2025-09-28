import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

/**
 * Hook pour la gestion des structures (Organizations dans la DB)
 * Interface "Structures" pour l'utilisateur mais utilise l'API organizations
 */
export function useStructures() {
  const queryClient = useQueryClient();

  // Query pour récupérer toutes les structures
  const query = useQuery({
    queryKey: ['/api/organizations']
  });

  // Mutation pour créer une structure
  const createMutation = useMutation({
    mutationFn: async (structureData) => {
      const response = await apiRequest('POST', '/api/organizations', structureData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
    }
  });

  // Mutation pour mettre à jour une structure
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await apiRequest('PUT', `/api/organizations/${id}`, data);
      return response.json();
    },
    onSuccess: (updatedStructure) => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      // Mise à jour optimiste du cache
      queryClient.setQueryData(['/api/organizations', updatedStructure.orgId], updatedStructure);
    }
  });

  // Mutation pour supprimer une structure
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await apiRequest('DELETE', `/api/organizations/${id}`);
      // DELETE peut retourner une réponse vide, pas besoin de parser JSON
      return response.ok ? { success: true } : { success: false };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
    }
  });

  return {
    // Data
    structures: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    
    // Actions
    createStructure: createMutation.mutateAsync,
    updateStructure: updateMutation.mutateAsync,
    deleteStructure: deleteMutation.mutateAsync,
    
    // States
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}

/**
 * Hook pour récupérer les EPCIs (utilisé dans les formulaires)
 */
export function useEPCIs() {
  return useQuery({
    queryKey: ['/api/epcis']
  });
}

/**
 * Hook pour récupérer une structure spécifique
 */
export function useStructure(structureId) {
  return useQuery({
    queryKey: ['/api/organizations', structureId],
    enabled: !!structureId
  });
}