import { Search, Filter } from 'lucide-react';

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
    <div className="card mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Filtres</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-1">
            Recherche
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              className="input-field pl-10" 
              placeholder="Référence ou famille..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              data-testid="input-search"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            État
          </label>
          <select 
            className="input-field"
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
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            EPSI
          </label>
          <select 
            className="input-field"
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
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            EVS/CS
          </label>
          <select 
            className="input-field"
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
