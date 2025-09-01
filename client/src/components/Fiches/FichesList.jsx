import { useState } from 'react';
import { Link } from 'wouter';
import { Eye, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import StatusBadge from '@/components/Common/StatusBadge';
import { formatDate, formatCurrency } from '@/utils/formatters';

export default function FichesList({ 
  fiches = [], 
  isLoading = false, 
  onRefresh,
  pagination = { page: 1, totalPages: 1, totalItems: 0 }
}) {
  const [currentPage, setCurrentPage] = useState(pagination.page);
  const itemsPerPage = 20;

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    // This would typically trigger a new query with pagination
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Chargement des fiches...</p>
          </div>
        </div>
      </div>
    );
  }

  if (fiches.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-foreground font-medium mb-2">Aucune fiche trouvée</p>
            <p className="text-muted-foreground">
              Essayez de modifier vos critères de recherche
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground" data-testid="text-fiches-title">
          Fiches navettes
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground" data-testid="text-fiches-count">
            {pagination.totalItems} fiche{pagination.totalItems > 1 ? 's' : ''}
          </span>
          <button 
            className="btn btn-secondary" 
            onClick={handleRefresh}
            disabled={isLoading}
            data-testid="button-refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 font-medium text-foreground">Référence</th>
              <th className="text-left p-3 font-medium text-foreground">Famille</th>
              <th className="text-left p-3 font-medium text-foreground">État</th>
              <th className="text-left p-3 font-medium text-foreground">EVS/CS</th>
              <th className="text-left p-3 font-medium text-foreground">EPSI</th>
              <th className="text-left p-3 font-medium text-foreground">Montant</th>
              <th className="text-left p-3 font-medium text-foreground">Créé le</th>
              <th className="text-left p-3 font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fiches.map((fiche) => (
              <tr 
                key={fiche.id} 
                className="border-b border-border hover:bg-muted/50 transition-colors"
                data-testid={`row-fiche-${fiche.id}`}
              >
                <td className="p-3">
                  <span className="font-mono text-sm" data-testid={`text-ref-${fiche.id}`}>
                    {fiche.ref}
                  </span>
                </td>
                <td className="p-3">
                  <span data-testid={`text-family-${fiche.id}`}>
                    {fiche.family?.code || 'N/A'}
                  </span>
                </td>
                <td className="p-3">
                  <StatusBadge 
                    state={fiche.state} 
                    data-testid={`badge-state-${fiche.id}`}
                  />
                </td>
                <td className="p-3">
                  <span 
                    className={fiche.assignedOrg ? 'text-foreground' : 'text-muted-foreground'}
                    data-testid={`text-org-${fiche.id}`}
                  >
                    {fiche.assignedOrg?.name || 'Non affecté'}
                  </span>
                </td>
                <td className="p-3">
                  <span data-testid={`text-epsi-${fiche.id}`}>
                    {fiche.epsi?.name || 'N/A'}
                  </span>
                </td>
                <td className="p-3">
                  <span data-testid={`text-amount-${fiche.id}`}>
                    {formatCurrency(fiche.totalAmount || 0)}
                  </span>
                </td>
                <td className="p-3">
                  <span className="text-muted-foreground" data-testid={`text-date-${fiche.id}`}>
                    {formatDate(fiche.createdAt)}
                  </span>
                </td>
                <td className="p-3">
                  <Link href={`/fiches/${fiche.id}`}>
                    <button 
                      className="btn btn-secondary"
                      data-testid={`button-view-${fiche.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <span className="text-sm text-muted-foreground">
            Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, pagination.totalItems)} sur {pagination.totalItems} fiches
          </span>
          <div className="flex gap-2">
            <button 
              className="btn btn-secondary"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              data-testid="button-previous-page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-sm text-foreground">
              {currentPage} / {pagination.totalPages}
            </span>
            <button 
              className="btn btn-secondary"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= pagination.totalPages}
              data-testid="button-next-page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
