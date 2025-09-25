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
        referentData: ficheData.referentData,
        familyDetailedData: ficheData.familyDetailedData,
        childrenData: ficheData.childrenData,
        workshopPropositions: ficheData.workshopPropositions,
        selectedWorkshops: ficheData.selectedWorkshops,
        participantsCount: ficheData.participantsCount,
        familyConsent: ficheData.familyConsent,
        capDocuments: ficheData.capDocuments
      };
      
      
      // Create the fiche with all detailed form data
      const response = await apiRequest('POST', '/api/fiches', requestData);

      const fiche = await response.json();

      return fiche;
    },
    onSuccess: (newFiche) => {
      // Set individual fiche data for immediate access
      queryClient.setQueryData(['/api/fiches', newFiche.id], newFiche);
      
      // Invalidate only fiche lists, not individual fiche detail queries
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === '/api/fiches' && 
          query.queryKey.length >= 2 && 
          (query.queryKey[1] === '' || String(query.queryKey[1]).includes('='))
      });
      
      // Invalidate dashboard stats as they might have changed
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    }
  });

  const updateFicheMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await apiRequest('PATCH', `/api/fiches/${id}`, data);
      return response.json();
    },
    onSuccess: (updatedFiche) => {
      // Update individual fiche data for immediate access
      queryClient.setQueryData(['/api/fiches', updatedFiche.id], updatedFiche);
      
      // Invalidate only fiche lists, not individual fiche detail queries
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === '/api/fiches' && 
          query.queryKey.length >= 2 && 
          (query.queryKey[1] === '' || String(query.queryKey[1]).includes('='))
      });
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
    onSuccess: (updatedFiche) => {
      // Update individual fiche data for immediate access
      queryClient.setQueryData(['/api/fiches', updatedFiche.id], updatedFiche);
      
      // Invalidate only fiche lists, not individual fiche detail queries
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === '/api/fiches' && 
          query.queryKey.length >= 2 && 
          (query.queryKey[1] === '' || String(query.queryKey[1]).includes('='))
      });
      
      // Invalidate dashboard stats as state changes affect counts
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    }
  });

  const assignFicheMutation = useMutation({
    mutationFn: async ({ id, assignedOrgId }) => {
      const response = await apiRequest('POST', `/api/fiches/${id}/assign`, {
        assignedOrgId
      });
      return response.json();
    },
    onSuccess: (updatedFiche) => {
      // Update individual fiche data for immediate access
      queryClient.setQueryData(['/api/fiches', updatedFiche.id], updatedFiche);
      
      // Invalidate only fiche lists, not individual fiche detail queries
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === '/api/fiches' && 
          query.queryKey.length >= 2 && 
          (query.queryKey[1] === '' || String(query.queryKey[1]).includes('='))
      });
      
      // Invalidate dashboard stats as assignments affect counts
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/fiches', id] });
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
