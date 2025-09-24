import { useState } from 'react';
import { Link } from 'wouter';
import { Eye, RefreshCw, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import StatusBadge from '@/components/Common/StatusBadge';
import { formatDate, formatCurrency } from '@/utils/formatters';
import styles from './FichesList.module.css';

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
      <div className={styles.listContainer}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingContent}>
            <RefreshCw className={styles.loadingSpinner} />
            <p className={styles.loadingText}>Chargement des fiches...</p>
          </div>
        </div>
      </div>
    );
  }

  if (fiches.length === 0) {
    return (
      <div className={styles.listContainer}>
        <div className={styles.emptyContainer}>
          <div className={styles.emptyContent}>
            <p className={styles.emptyTitle}>Aucune fiche trouvée</p>
            <p className={styles.emptyDescription}>
              Essayez de modifier vos critères de recherche
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.listContainer}>
      <div className={styles.listHeader}>
        <h2 className={styles.listTitle} data-testid="text-fiches-title">
          Fiches navettes
        </h2>
        <div className={styles.headerActions}>
          <span className={styles.itemCount} data-testid="text-fiches-count">
            {pagination.totalItems} fiche{pagination.totalItems > 1 ? 's' : ''}
          </span>
          <button 
            className={styles.refreshButton} 
            onClick={handleRefresh}
            disabled={isLoading}
            data-testid="button-refresh"
          >
            <RefreshCw className={`${styles.icon} ${isLoading ? styles.loadingSpinner : ''}`} />
          </button>
        </div>
      </div>
      
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr>
              <th className={styles.tableHeaderCell}>Référence</th>
              <th className={styles.tableHeaderCell}>Famille</th>
              <th className={styles.tableHeaderCell}>État</th>
              <th className={styles.tableHeaderCell}>EVS/CS</th>
              <th className={styles.tableHeaderCell}>EPSI</th>
              <th className={styles.tableHeaderCell}>Montant</th>
              <th className={styles.tableHeaderCell}>Créé le</th>
              <th className={styles.tableHeaderCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fiches.map((fiche) => (
              <tr 
                key={fiche.id} 
                className={styles.tableRow}
                data-testid={`row-fiche-${fiche.id}`}
              >
                <td className={styles.tableCell}>
                  <div className={styles.refContainer}>
                    <span className={styles.refCode} data-testid={`text-ref-${fiche.id}`}>
                      {fiche.ref}
                    </span>
                    {fiche.capDocuments && fiche.capDocuments.length > 0 && (
                      <FileText 
                        className={styles.documentIcon} 
                        size={14}
                        title={`${fiche.capDocuments.length} document${fiche.capDocuments.length > 1 ? 's' : ''} CAP`}
                        data-testid={`icon-documents-${fiche.id}`}
                      />
                    )}
                  </div>
                </td>
                <td className={styles.tableCell}>
                  <span data-testid={`text-family-${fiche.id}`}>
                    {fiche.family?.code || 'N/A'}
                  </span>
                </td>
                <td className={styles.tableCell}>
                  <StatusBadge 
                    state={fiche.state} 
                    data-testid={`badge-state-${fiche.id}`}
                  />
                </td>
                <td className={styles.tableCell}>
                  <span 
                    className={fiche.assignedOrg ? styles.orgName : styles.orgNameUnassigned}
                    data-testid={`text-org-${fiche.id}`}
                  >
                    {fiche.assignedOrg?.name || 'Non affecté'}
                  </span>
                </td>
                <td className={styles.tableCell}>
                  <span data-testid={`text-epsi-${fiche.id}`}>
                    {fiche.epsi?.name || 'N/A'}
                  </span>
                </td>
                <td className={styles.tableCell}>
                  <span data-testid={`text-amount-${fiche.id}`}>
                    {formatCurrency(fiche.totalAmount || 0)}
                  </span>
                </td>
                <td className={styles.tableCell}>
                  <span className={styles.dateText} data-testid={`text-date-${fiche.id}`}>
                    {formatDate(fiche.createdAt)}
                  </span>
                </td>
                <td className={styles.tableCell}>
                  <Link href={`/fiches/${fiche.id}`}>
                    <button 
                      className={styles.actionButton}
                      data-testid={`button-view-${fiche.id}`}
                    >
                      <Eye className={styles.icon} />
                    </button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, pagination.totalItems)} sur {pagination.totalItems} fiches
          </span>
          <div className={styles.paginationControls}>
            <button 
              className={styles.paginationButton}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              data-testid="button-previous-page"
            >
              <ChevronLeft className={styles.icon} />
            </button>
            <span className={styles.paginationText}>
              {currentPage} / {pagination.totalPages}
            </span>
            <button 
              className={styles.paginationButton}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= pagination.totalPages}
              data-testid="button-next-page"
            >
              <ChevronRight className={styles.icon} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
