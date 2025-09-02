import { useAuth } from './useAuth';
import { hasPermission, hasAnyPermission, hasAllPermissions, getRolePermissions } from '@/utils/permissions';

/**
 * Custom hook for checking user permissions
 * Provides easy access to permission checking functions with current user context
 */
export function usePermissions() {
  const { user } = useAuth();
  const userRole = user?.role;

  return {
    // Check single permission
    hasPermission: (action) => hasPermission(userRole, action),
    
    // Check if user has any of the provided permissions
    hasAnyPermission: (actions) => hasAnyPermission(userRole, actions),
    
    // Check if user has all provided permissions
    hasAllPermissions: (actions) => hasAllPermissions(userRole, actions),
    
    // Get all permissions for current user role
    getUserPermissions: () => getRolePermissions(userRole),
    
    // Current user role
    userRole,
    
    // Utility functions for common permission checks
    canViewAllFiches: () => hasPermission(userRole, 'view_all_fiches'),
    canCreateFiche: () => hasPermission(userRole, 'create_fiche'),
    canValidateOfficial: () => hasPermission(userRole, 'validate_official'),
    canManageUsers: () => hasPermission(userRole, 'manage_users_roles'),
    canExportData: () => hasPermission(userRole, 'export_data'),
    canViewDashboardGlobal: () => hasPermission(userRole, 'view_dashboard_global')
  };
}