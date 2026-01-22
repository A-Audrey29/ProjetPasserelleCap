import { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();

  // Query to check if user is authenticated
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        if (response.status === 401) {
          return null; // User not authenticated
        }
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        return data.user; // Extract user object for consistent structure
      } catch (error) {
        return null; // Return null on any error
      }
    },
    onSettled: () => {
      setIsInitialized(true);
    }
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const response = await apiRequest('POST', '/api/auth/login', {
        email,
        password
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/me'], data.user);
      queryClient.invalidateQueries();
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/auth/logout');
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.clear();
    }
  });

  const login = async (email, password) => {
    try {
      await loginMutation.mutateAsync({ email, password });
    } catch (error) {
      throw new Error(error.message || 'Erreur de connexion');
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      // Even if logout fails on server, clear local state
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.clear();
    }
  };

  const isAuthenticated = !isLoading && !!user;

  const hasRole = (role) => {
    return user?.role === role;
  };

  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  const value = {
    user: user,
    isAuthenticated,
    isLoading: isLoading,
    login,
    logout,
    hasRole,
    hasAnyRole,
    isLoginPending: loginMutation.isPending,
    isLogoutPending: logoutMutation.isPending
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
