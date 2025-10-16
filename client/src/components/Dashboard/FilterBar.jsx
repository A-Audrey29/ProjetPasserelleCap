import { Search, Filter } from 'lucide-react';
import { STATE_LABELS } from '@/utils/constants';
import styles from './FilterBar.module.css';

export default function FilterBar({ 
  filters, 
  onFiltersChange, 
  organizations = [],
  objectives = [],
  userRole
}) {
  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  return (
    <div className={styles.filterContainer}>
      <div className={styles.filterHeader}>
        <Filter className={styles.icon} />
        <h2 className={styles.filterTitle}>Filtres</h2>
      </div>
      
      <div className={styles.filterGrid}>
        <div className={styles.searchContainer}>
          <label className={styles.fieldLabel}>
            Recherche
          </label>
          <div className={styles.inputContainer}>
            <Search className={styles.searchIcon} />
            <input 
              type="text" 
              className={styles.searchInput} 
              placeholder="Référence ou famille..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              data-testid="input-search"
            />
          </div>
        </div>
        
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            État
          </label>
          <select 
            className={styles.selectInput}
            value={filters.state || ''}
            onChange={(e) => handleFilterChange('state', e.target.value)}
            data-testid="select-state"
          >
            <option value="">Tous les états</option>
            {Object.entries(STATE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        
        {userRole !== 'EMETTEUR' && (
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              EVS/CS
            </label>
            <select 
              className={styles.selectInput}
              value={filters.assignedOrgId || ''}
              onChange={(e) => handleFilterChange('assignedOrgId', e.target.value)}
              data-testid="select-organization"
            >
              <option value="">Toutes les organisations</option>
              {organizations.map((org) => (
                <option key={org.orgId} value={org.orgId}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
