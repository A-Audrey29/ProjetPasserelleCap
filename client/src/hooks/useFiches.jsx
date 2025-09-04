import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function useFiches(filters = {}) {
  const queryClient = useQueryClient();

  // Build query string from filters
  const queryString = new URLSearchParams(
    Object.entries(filters).filter(([_, value]) => value !== null && value !== undefined && value !== '')
  ).toString();

  const queryKey = ['/api/fiches', queryString];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const url = queryString ? `/api/fiches?${queryString}` : '/api/fiches';
      const response = await apiRequest('GET', url);
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  const createFicheMutation = useMutation({
    mutationFn: async (ficheData) => {
      // Prepare detailed form data
      const requestData = {
        description: ficheData.description,
        workshops: ficheData.workshops,
        referentData: ficheData.referentData,
        familyDetailedData: ficheData.familyDetailedData,
        childrenData: ficheData.childrenData,
        workshopPropositions: ficheData.workshopPropositions,
        familyConsent: ficheData.familyConsent
      };
      
      
      // Create the fiche with all detailed form data
      const response = await apiRequest('POST', '/api/fiches', requestData);

      const fiche = await response.json();

      return fiche;
    },
    onSuccess: () => {
      // Invalidate all fiches queries (including parameterized ones)
      queryClient.invalidateQueries({ queryKey: ['/api/fiches'] });
    }
  });

  const updateFicheMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await apiRequest('PATCH', `/api/fiches/${id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate all fiches queries (including parameterized ones)
      queryClient.invalidateQueries({ queryKey: ['/api/fiches'] });
      queryClient.setQueryData(['/api/fiches', data.id], data);
    }
  });

  const transitionFicheMutation = useMutation({
    mutationFn: async ({ id, newState, metadata = {} }) => {
      const response = await apiRequest('POST', `/api/fiches/${id}/transition`, {
        newState,
        metadata
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate all fiches queries (including parameterized ones)
      queryClient.invalidateQueries({ queryKey: ['/api/fiches'] });
      queryClient.setQueryData(['/api/fiches', data.id], data);
    }
  });

  const assignFicheMutation = useMutation({
    mutationFn: async ({ id, assignedOrgId }) => {
      const response = await apiRequest('POST', `/api/fiches/${id}/assign`, {
        assignedOrgId
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate all fiches queries (including parameterized ones)
      queryClient.invalidateQueries({ queryKey: ['/api/fiches'] });
      queryClient.setQueryData(['/api/fiches', data.id], data);
    }
  });

  return {
    // Query results
    fiches: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    
    // Mutations
    createFiche: createFicheMutation.mutateAsync,
    updateFiche: updateFicheMutation.mutateAsync,
    transitionFiche: transitionFicheMutation.mutateAsync,
    assignFiche: assignFicheMutation.mutateAsync,
    
    // Mutation states
    isCreating: createFicheMutation.isPending,
    isUpdating: updateFicheMutation.isPending,
    isTransitioning: transitionFicheMutation.isPending,
    isAssigning: assignFicheMutation.isPending
  };
}

export function useFiche(id) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['/api/fiches', id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/fiches/${id}`);
      return response.json();
    },
    enabled: !!id,
    staleTime: 30 * 1000
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content) => {
      const response = await apiRequest('POST', `/api/fiches/${id}/comments`, {
        content
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/fiches', id]);
    }
  });

  return {
    fiche: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    addComment: addCommentMutation.mutateAsync,
    isAddingComment: addCommentMutation.isPending
  };
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/dashboard/stats');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
