import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import styles from './AdminEmailsTab.module.css';
import { Search, Eye, EyeOff, Trash2, Mail, Calendar, User, AlertCircle } from 'lucide-react';
import DOMPurify from 'dompurify';

// Statuts d'email avec traductions
const EMAIL_STATUS = {
  intercepted: { label: 'Intercepté', color: 'orange' },
  sent: { label: 'Envoyé', color: 'green' },
  error: { label: 'Erreur', color: 'red' }
};

export default function AdminEmailsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(null);
  const queryClient = useQueryClient();

  const itemsPerPage = 10;

  // Récupération des emails avec pagination et filtres
  const { data: emailsData, isLoading } = useQuery({
    queryKey: ['/api/admin/email-logs', currentPage, statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      });
      
      const response = await fetch(`/api/admin/email-logs?${params}`);
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }
  });

  // Mutation pour marquer un email comme lu
  const markAsViewed = useMutation({
    mutationFn: (emailId) => apiRequest(`/api/admin/email-logs/${emailId}`, {
      method: 'PATCH',
      body: JSON.stringify({ viewedAt: new Date().toISOString() })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-logs'] });
    }
  });

  // Mutation pour supprimer un email
  const deleteEmail = useMutation({
    mutationFn: (emailId) => apiRequest(`/api/admin/email-logs/${emailId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-logs'] });
      setSelectedEmail(null);
      setIsDeleting(null);
    }
  });


  const emails = emailsData?.logs || [];
  const totalEmails = emailsData?.total || 0;
  const totalPages = Math.ceil(totalEmails / itemsPerPage);

  // Fonction de recherche avec debounce
  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Fonction de changement de filtre
  const handleFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // Affichage de l'email sélectionné avec HTML sécurisé
  const renderEmailDetails = () => {
    if (!selectedEmail) return null;

    // Sanitisation du HTML pour éviter les XSS
    const sanitizedHtml = DOMPurify.sanitize(selectedEmail.html, {
      ALLOWED_TAGS: ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'hr'],
      ALLOWED_ATTR: ['href', 'class'],
      ADD_ATTR: ['target', 'rel'],
      ALLOWED_URI_REGEXP: /^https?:\/\//,
    });
    
    // Post-traitement pour sécuriser les liens
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sanitizedHtml;
    const links = tempDiv.querySelectorAll('a');
    links.forEach(link => {
      link.setAttribute('rel', 'noopener noreferrer');
      link.setAttribute('target', '_blank');
    });
    const finalHtml = tempDiv.innerHTML;

    return (
      <div className={styles.emailDetails}>
        <div className={styles.emailHeader}>
          <button 
            onClick={() => setSelectedEmail(null)}
            className={styles.backButton}
            data-testid="button-back-to-list"
          >
            ← Retour à la liste
          </button>
          
          <div className={styles.emailActions}>
            {!selectedEmail.viewedAt && (
              <button
                onClick={() => markAsViewed.mutate(selectedEmail.id)}
                className={styles.actionButton}
                disabled={markAsViewed.isPending}
                data-testid="button-mark-viewed"
              >
                <Eye size={16} />
                Marquer comme lu
              </button>
            )}
            
            <button
              onClick={() => setIsDeleting(selectedEmail.id)}
              className={styles.deleteButton}
              data-testid="button-delete-email"
            >
              <Trash2 size={16} />
              Supprimer
            </button>
          </div>
        </div>

        <div className={styles.emailMeta}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>À :</span>
            <span data-testid="text-recipient">{Array.isArray(selectedEmail.to) ? selectedEmail.to.join(', ') : selectedEmail.to}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Sujet :</span>
            <span data-testid="text-subject">{selectedEmail.subject}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Date :</span>
            <span data-testid="text-date">
              {new Date(selectedEmail.createdAt).toLocaleString('fr-FR')}
            </span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Statut :</span>
            <span 
              className={`${styles.statusBadge} ${styles[EMAIL_STATUS[selectedEmail.status]?.color || 'gray']}`}
              data-testid="text-status"
            >
              {EMAIL_STATUS[selectedEmail.status]?.label || selectedEmail.status}
            </span>
          </div>
          {selectedEmail.meta && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Événement :</span>
              <span data-testid="text-event">{selectedEmail.meta.event}</span>
            </div>
          )}
        </div>

        <div className={styles.emailContent}>
          <h3>Contenu de l'email :</h3>
          <div 
            className={styles.htmlPreview}
            dangerouslySetInnerHTML={{ __html: finalHtml }}
            data-testid="content-email-html"
          />
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading} data-testid="loading-emails">
          Chargement des emails...
        </div>
      </div>
    );
  }

  if (selectedEmail) {
    return (
      <div className={styles.container}>
        {renderEmailDetails()}
        
        {/* Modal de confirmation de suppression */}
        {isDeleting === selectedEmail.id && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h3>Confirmer la suppression</h3>
              <p>Êtes-vous sûr de vouloir supprimer cet email ?</p>
              <div className={styles.modalActions}>
                <button 
                  onClick={() => setIsDeleting(null)}
                  className={styles.cancelButton}
                  data-testid="button-cancel-delete"
                >
                  Annuler
                </button>
                <button
                  onClick={() => deleteEmail.mutate(selectedEmail.id)}
                  className={styles.confirmDeleteButton}
                  disabled={deleteEmail.isPending}
                  data-testid="button-confirm-delete"
                >
                  {deleteEmail.isPending ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <Mail size={24} />
          Emails Interceptés
        </h2>
        <p className={styles.description}>
          Consultation des emails interceptés en mode développement
        </p>
      </div>

      {/* Filtres et recherche */}
      <div className={styles.filters}>
        <div className={styles.searchContainer}>
          <Search size={20} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Rechercher par sujet ou destinataire..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className={styles.searchInput}
            data-testid="input-search-emails"
          />
        </div>

        <div className={styles.statusFilters}>
          <button
            onClick={() => handleFilterChange('all')}
            className={`${styles.filterButton} ${statusFilter === 'all' ? styles.active : ''}`}
            data-testid="filter-all"
          >
            Tous ({totalEmails})
          </button>
          <button
            onClick={() => handleFilterChange('intercepted')}
            className={`${styles.filterButton} ${statusFilter === 'intercepted' ? styles.active : ''}`}
            data-testid="filter-intercepted"
          >
            Interceptés
          </button>
          <button
            onClick={() => handleFilterChange('sent')}
            className={`${styles.filterButton} ${statusFilter === 'sent' ? styles.active : ''}`}
            data-testid="filter-sent"
          >
            Envoyés
          </button>
          <button
            onClick={() => handleFilterChange('error')}
            className={`${styles.filterButton} ${statusFilter === 'error' ? styles.active : ''}`}
            data-testid="filter-error"
          >
            Erreurs
          </button>
        </div>
      </div>

      {/* Liste des emails */}
      {emails.length === 0 ? (
        <div className={styles.emptyState} data-testid="text-no-emails">
          <Mail size={48} />
          <h3>Aucun email trouvé</h3>
          <p>
            {searchTerm || statusFilter !== 'all' 
              ? 'Aucun email ne correspond à vos critères de recherche.'
              : 'Aucun email intercepté pour le moment.'}
          </p>
        </div>
      ) : (
        <>
          <div className={styles.emailList}>
            {emails.map((email) => (
              <div 
                key={email.id} 
                className={`${styles.emailCard} ${!email.viewedAt ? styles.unread : ''}`}
                onClick={() => setSelectedEmail(email)}
                data-testid={`card-email-${email.id}`}
              >
                <div className={styles.emailCardHeader}>
                  <div className={styles.emailSubject} data-testid={`text-subject-${email.id}`}>
                    {email.subject}
                  </div>
                  <div className={styles.emailMeta}>
                    <span 
                      className={`${styles.statusBadge} ${styles.small} ${styles[EMAIL_STATUS[email.status]?.color || 'gray']}`}
                      data-testid={`status-${email.id}`}
                    >
                      {EMAIL_STATUS[email.status]?.label || email.status}
                    </span>
                    {!email.viewedAt && <div className={styles.unreadDot} />}
                  </div>
                </div>
                
                <div className={styles.emailInfo}>
                  <div className={styles.emailRecipient} data-testid={`text-recipient-${email.id}`}>
                    <User size={14} />
                    {Array.isArray(email.to) ? email.to.join(', ') : email.to}
                  </div>
                  <div className={styles.emailDate} data-testid={`text-date-${email.id}`}>
                    <Calendar size={14} />
                    {new Date(email.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                  {email.error && (
                    <div className={styles.emailError} data-testid={`text-error-${email.id}`}>
                      <AlertCircle size={14} />
                      {email.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={styles.pageButton}
                data-testid="button-prev-page"
              >
                Précédent
              </button>
              
              <div className={styles.pageInfo} data-testid="text-page-info">
                Page {currentPage} sur {totalPages}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={styles.pageButton}
                data-testid="button-next-page"
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}