import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Users, 
  UserPlus, 
  Edit3, 
  Search, 
  Filter, 
  Shield, 
  ToggleLeft, 
  ToggleRight, 
  Key,
  Calendar,
  Mail,
  Building,
  Phone
} from 'lucide-react';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Badge } from '@/components/common/Badge';
import { Card, CardContent } from '@/components/common/Card';
import { hasPermission, ACTIONS } from '@/utils/permissions';
import { formatDate } from '@/utils/formatters';
import UserForm from '@/components/Admin/UserForm';
import PasswordResetModal from '@/components/Admin/PasswordResetModal';
import styles from './Administration.module.css';

const ROLES = {
  ADMIN: 'Administrateur',
  SUIVI_PROJETS: 'Suivi de projets',
  EMETTEUR: 'Émetteur',
  RELATIONS_EVS: 'Relations EVS',
  EVS_CS: 'EVS/CS',
  CD: 'Conseil Départemental'
};

const ROLE_COLORS = {
  ADMIN: 'destructive',
  SUIVI_PROJETS: 'default',
  EMETTEUR: 'secondary',
  RELATIONS_EVS: 'outline',
  EVS_CS: 'success',
  CD: 'default'
};

export default function Administration() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);

  const userRole = user?.user?.role;

  // Check admin permission
  const canManageUsers = hasPermission(userRole, ACTIONS.MANAGE_USERS_ROLES);

  // Fetch all users
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: isAuthenticated && canManageUsers
  });

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus = !statusFilter || 
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Toggle user activation mutation
  const toggleActivationMutation = useMutation({
    mutationFn: async ({ userId, isActive }) => {
      return apiRequest(`/api/admin/users/${userId}/activate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/admin/users']);
    }
  });

  const handleToggleActivation = (userId, isActive) => {
    toggleActivationMutation.mutate({ userId, isActive: !isActive });
  };

  if (!isAuthenticated || !canManageUsers) {
    return (
      <div className={styles.unauthorizedContainer}>
        <div className={styles.unauthorizedContent}>
          <Shield className={styles.unauthorizedIcon} />
          <h2>Accès non autorisé</h2>
          <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.administrationContainer}>
        <Header />
        <main className={styles.mainContent}>
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Chargement des utilisateurs...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.administrationContainer}>
      <Header />
      <main className={styles.mainContent}>
        <div className={styles.headerSection}>
          <div className={styles.headerContent}>
            <h1 className={styles.pageTitle} data-testid="text-administration-title">
              <Users className={styles.titleIcon} />
              Administration Système
            </h1>
            <p className={styles.pageDescription}>
              Gestion des utilisateurs et contrôle des droits d'accès
            </p>
          </div>
          
          <div className={styles.headerActions}>
            <Button 
              className="_button_1c1gx_3 _buttonPrimary_1c1gx_24 _buttonDefault_1c1gx_44 _createButton_riwoj_82 text-[#3b4b61]"
              onClick={() => setShowCreateForm(true)}
              data-testid="button-create-user"
            >
              <UserPlus className={styles.buttonIcon} />
              Nouvel utilisateur
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filtersContainer}>
          <div className={styles.filtersGrid}>
            <div className={styles.searchSection}>
              <Search className={styles.searchIcon} />
              <Input
                placeholder="Rechercher par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
                data-testid="input-search-users"
              />
            </div>
            
            <div className={styles.filterSection}>
              <Filter className={styles.filterIcon} />
              <select 
                className={styles.filterSelect}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                data-testid="select-role-filter"
              >
                <option value="">Tous les rôles</option>
                {Object.entries(ROLES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            
            <div className={styles.filterSection}>
              <select 
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                data-testid="select-status-filter"
              >
                <option value="">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Grid */}
        <div className={styles.usersGrid}>
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <Card key={user.id} className={styles.userCard}>
                <CardContent className={styles.cardContent}>
                  <div className={styles.cardHeader}>
                    <div className={styles.userInfo}>
                      <h3 className={styles.userName}>
                        {user.firstName} {user.lastName}
                      </h3>
                      <div className={styles.userEmail}>
                        <Mail className={styles.emailIcon} />
                        {user.email}
                      </div>
                    </div>
                    
                    <div className={styles.userBadges}>
                      <Badge 
                        variant={ROLE_COLORS[user.role] || 'default'}
                        className={styles.roleBadge}
                      >
                        {ROLES[user.role] || user.role}
                      </Badge>
                      <div className={styles.statusBadge}>
                        {user.isActive ? (
                          <Badge variant="success" className={styles.activeBadge}>
                            Actif
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className={styles.inactiveBadge}>
                            Inactif
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.userDetails}>
                    {user.structure && (
                      <div className={styles.detailItem}>
                        <Building className={styles.detailIcon} />
                        <span>{user.structure}</span>
                      </div>
                    )}
                    
                    {user.phone && (
                      <div className={styles.detailItem}>
                        <Phone className={styles.detailIcon} />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    
                    {user.organization && (
                      <div className={styles.detailItem}>
                        <Building className={styles.detailIcon} />
                        <span>{user.organization.name}</span>
                      </div>
                    )}
                    
                    <div className={styles.detailItem}>
                      <Calendar className={styles.detailIcon} />
                      <span>Créé le {formatDate(user.createdAt)}</span>
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditingUser(user)}
                      data-testid={`button-edit-user-${user.id}`}
                    >
                      <Edit3 className={styles.actionIcon} />
                      Modifier
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleToggleActivation(user.id, user.isActive)}
                      data-testid={`button-toggle-user-${user.id}`}
                    >
                      {user.isActive ? (
                        <>
                          <ToggleLeft className={styles.actionIcon} />
                          Désactiver
                        </>
                      ) : (
                        <>
                          <ToggleRight className={styles.actionIcon} />
                          Activer
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setResetPasswordUser(user)}
                      data-testid={`button-reset-password-${user.id}`}
                    >
                      <Key className={styles.actionIcon} />
                      Reset MDP
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className={styles.emptyState}>
              <Users className={styles.emptyIcon} />
              <h3>Aucun utilisateur trouvé</h3>
              <p>
                {searchTerm || roleFilter || statusFilter 
                  ? 'Aucun utilisateur ne correspond aux critères de recherche.'
                  : 'Aucun utilisateur n\'est disponible pour le moment.'
                }
              </p>
            </div>
          )}
        </div>

        {/* User Form Modal */}
        {(showCreateForm || editingUser) && (
          <UserForm
            user={editingUser}
            onClose={() => {
              setShowCreateForm(false);
              setEditingUser(null);
            }}
            onSuccess={() => {
              // Refresh users list is handled by the mutation
            }}
          />
        )}

        {/* Password Reset Modal */}
        {resetPasswordUser && (
          <PasswordResetModal
            user={resetPasswordUser}
            onClose={() => setResetPasswordUser(null)}
            onSuccess={() => {
              // Password reset successful
            }}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}