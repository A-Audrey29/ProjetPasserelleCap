import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

/**
 * Hook pour la gestion des utilisateurs en admin
 * Suit le pattern des hooks existants (useFiches, useAuth)
 */
export function useAdminUsers() {
  const queryClient = useQueryClient();

  // Query pour récupérer tous les utilisateurs (admin only)
  const query = useQuery({
    queryKey: ['/api/admin/users']
  });

  // Mutation pour créer un utilisateur
  const createMutation = useMutation({
    mutationFn: async (userData) => {
      const response = await apiRequest('POST', '/api/admin/users', userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    }
  });

  // Mutation pour mettre à jour un utilisateur
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await apiRequest('PUT', `/api/admin/users/${id}`, data);
      return response.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      // Mise à jour optimiste du cache
      queryClient.setQueryData(['/api/admin/users', updatedUser.id], updatedUser);
    }
  });

  // Mutation pour activer/désactiver un utilisateur
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      const response = await apiRequest('PATCH', `/api/admin/users/${id}/activate`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    }
  });

  // Mutation pour réinitialiser le mot de passe
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }) => {
      const response = await apiRequest('POST', `/api/admin/users/${id}/reset-password`, { newPassword });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    }
  });

  return {
    // Data
    users: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    
    // Actions
    createUser: createMutation.mutateAsync,
    updateUser: updateMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutateAsync,
    resetPassword: resetPasswordMutation.mutateAsync,
    
    // States
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isTogglingActive: toggleActiveMutation.isPending,
    isResettingPassword: resetPasswordMutation.isPending
  };
}

/**
 * Hook pour récupérer un utilisateur spécifique
 */
export function useAdminUser(userId) {
  return useQuery({
    queryKey: ['/api/admin/users', userId],
    enabled: !!userId
  });
}