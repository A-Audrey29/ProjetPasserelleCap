import { Search, Filter } from 'lucide-react';
import styles from './FilterBar.module.css';

export default function FilterBar({ 
  filters, 
  onFiltersChange, 
  epsiList = [], 
  organizations = [],
  objectives = []
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
            <option value="DRAFT">Brouillon</option>
            <option value="SUBMITTED_TO_FEVES">Envoyé FEVES</option>
            <option value="ASSIGNED_TO_EVS">Affecté EVS</option>
            <option value="EVS_ACCEPTED">Accepté EVS</option>
            <option value="CONTRACT_SIGNED">Contrat signé</option>
            <option value="CLOSED">Clôturé</option>
          </select>
        </div>
        
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            EPSI
          </label>
          <select 
            className={styles.selectInput}
            value={filters.epsiId || ''}
            onChange={(e) => handleFilterChange('epsiId', e.target.value)}
            data-testid="select-epsi"
          >
            <option value="">Toutes les EPSI</option>
            {epsiList.map((epsi) => (
              <option key={epsi.id} value={epsi.id}>
                {epsi.name}
              </option>
            ))}
          </select>
        </div>
        
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
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
