import { useState } from 'react';
import { Plus, Search, Edit2, Key, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useStructures } from '@/hooks/useStructures';
import UserForm from './UserForm';
import styles from './AdminUsersTab.module.css';

const ROLES = {
  ADMIN: 'Administrateur',
  SUIVI_PROJETS: 'Suivi de projets',
  EMETTEUR: 'Émetteur',
  RELATIONS_EVS: 'Relations EVS',
  EVS_CS: 'EVS/CS',
  CD: 'Conseil Départemental'
};

const ROLE_COLORS = {
  ADMIN: styles.roleAdmin,
  SUIVI_PROJETS: styles.roleSuivi,
  EMETTEUR: styles.roleEmetteur,
  RELATIONS_EVS: styles.roleRelations,
  EVS_CS: styles.roleEvs,
  CD: styles.roleCd
};

export default function AdminUsersTab() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { 
    users, 
    isLoading, 
    toggleActive, 
    isTogglingActive 
  } = useAdminUsers();

  const { structures } = useStructures();

  // Filtrer les utilisateurs
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.structure?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus = !statusFilter || 
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleToggleActivation = async (userId, isActive) => {
    try {
      await toggleActive({ id: userId, isActive: !isActive });
    } catch (error) {
      console.error('Erreur lors de la modification du statut:', error);
    }
  };

  const handleFormSuccess = () => {
    setShowCreateForm(false);
    setEditingUser(null);
  };

  const handleFormClose = () => {
    setShowCreateForm(false);
    setEditingUser(null);
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Chargement des utilisateurs...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* En-tête avec filtres et actions */}
      <div className={styles.header}>
        <div className={styles.filtersRow}>
          <div className={styles.searchBox}>
            <Search size={18} className={styles.searchIcon} />
            <Input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
              data-testid="users-search"
            />
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={styles.filterSelect}
            data-testid="users-role-filter"
          >
            <option value="">Tous les rôles</option>
            {Object.entries(ROLES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
            data-testid="users-status-filter"
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>

        <Button 
          onClick={() => setShowCreateForm(true)}
          className={styles.createButton}
          data-testid="button-create-user"
        >
          <Plus size={18} />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Formulaire de création/édition */}
      {(showCreateForm || editingUser) && (
        <Card className={styles.formCard}>
          <UserForm
            user={editingUser}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
          />
        </Card>
      )}

      {/* Statistiques */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{users.length}</span>
          <span className={styles.statLabel}>Total utilisateurs</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>
            {users.filter(u => u.isActive).length}
          </span>
          <span className={styles.statLabel}>Actifs</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>
            {users.filter(u => !u.isActive).length}
          </span>
          <span className={styles.statLabel}>Inactifs</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{filteredUsers.length}</span>
          <span className={styles.statLabel}>Affichés</span>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      {filteredUsers.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Aucun utilisateur trouvé avec ces critères</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Structure</th>
                <th>Organisation</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => {
                const userStructure = structures.find(s => s.orgId === user.orgId);
                
                return (
                  <tr key={user.id} data-testid={`user-row-${user.id}`}>
                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.userName}>
                          {user.firstName} {user.lastName}
                        </div>
                        {user.phone && (
                          <div className={styles.userPhone}>{user.phone}</div>
                        )}
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`${styles.roleBadge} ${ROLE_COLORS[user.role] || ''}`}>
                        {ROLES[user.role] || user.role}
                      </span>
                    </td>
                    <td>{user.structure || '-'}</td>
                    <td>{userStructure?.name || '-'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${
                        user.isActive ? styles.statusActive : styles.statusInactive
                      }`}>
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.actionButton}
                          onClick={() => setEditingUser(user)}
                          title="Modifier"
                          data-testid={`edit-user-${user.id}`}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className={`${styles.actionButton} ${
                            user.isActive ? styles.actionDeactivate : styles.actionActivate
                          }`}
                          onClick={() => handleToggleActivation(user.id, user.isActive)}
                          disabled={isTogglingActive}
                          title={user.isActive ? 'Désactiver' : 'Activer'}
                          data-testid={`toggle-user-${user.id}`}
                        >
                          {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button
                          className={styles.actionButton}
                          title="Réinitialiser mot de passe"
                          data-testid={`reset-password-${user.id}`}
                        >
                          <Key size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}