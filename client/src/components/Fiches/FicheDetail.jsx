import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  UserPlus, 
  MessageCircle, 
  History, 
  Download, 
  Eye, 
  Send,
  FileText,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Edit,
  RotateCcw,
  Archive,
  Trash2
} from 'lucide-react';
import StatusBadge from '@/components/Common/StatusBadge';
import StateTimeline from './StateTimeline';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'wouter';
import styles from './FicheDetail.module.css';

export default function FicheDetail({ ficheId }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Query for fiche details
  const { data: fiche, isLoading, error } = useQuery({
    queryKey: ['/api/fiches', ficheId],
    enabled: !!ficheId
  });

  // Query for organizations (for assignment)
  const { data: organizations = [] } = useQuery({
    queryKey: ['/api/organizations'],
    enabled: showAssignModal
  });

  // Query for audit logs
  const { data: auditLogs = [], isLoading: auditLoading } = useQuery({
    queryKey: ['/api/audit', { entityId: ficheId, entity: 'FicheNavette' }],
    enabled: showAuditModal,
    retry: false
  });

  // Comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content) => {
      return await apiRequest('POST', `/api/fiches/${ficheId}/comments`, { content });
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries(['/api/fiches', ficheId]);
    },
  });

  // Transition mutation
  const transitionMutation = useMutation({
    mutationFn: async ({ newState, metadata = {} }) => {
      return await apiRequest('POST', `/api/fiches/${ficheId}/transition`, { newState, metadata });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/fiches', ficheId]);
      queryClient.invalidateQueries(['/api/fiches']);
    }
  });

  // Assignment mutation
  const assignMutation = useMutation({
    mutationFn: async (assignedOrgId) => {
      return await apiRequest('POST', `/api/fiches/${ficheId}/assign`, { assignedOrgId });
    },
    onSuccess: () => {
      setShowAssignModal(false);
      setSelectedOrgId('');
      queryClient.invalidateQueries(['/api/fiches', ficheId]);
      queryClient.invalidateQueries(['/api/fiches']);
    }
  });

  // Handlers
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      await addCommentMutation.mutateAsync(newComment);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le commentaire",
        variant: "destructive"
      });
    }
  };

  const handleAssignToOrg = async () => {
    if (!selectedOrgId) return;
    
    try {
      await assignMutation.mutateAsync(selectedOrgId);
    } catch (error) {
      toast({
        title: "Erreur d'affectation",
        description: "Impossible d'affecter la fiche à cette organisation",
        variant: "destructive"
      });
    }
  };

  const handleCDValidation = async (action) => {
    try {
      if (action === 'validate') {
        await transitionMutation.mutateAsync({ newState: 'SUBMITTED_TO_FEVES' });
        toast({
          title: "Fiche validée",
          description: "La fiche a été validée et transmise à FEVES",
          variant: "default"
        });
      } else if (action === 'reject') {
        await transitionMutation.mutateAsync({ newState: 'ARCHIVED' });
        toast({
          title: "Fiche refusée",
          description: "La fiche a été refusée et archivée",
          variant: "default"
        });
      } else if (action === 'return') {
        await transitionMutation.mutateAsync({ newState: 'DRAFT' });
        toast({
          title: "Fiche renvoyée",
          description: "La fiche a été renvoyée à l'émetteur pour modification",
          variant: "default"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur de validation",
        description: error.message || "Impossible de traiter la validation",
        variant: "destructive"
      });
    }
  };

  // Admin-only actions
  const handleArchive = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir archiver cette fiche ? Cette action ne peut pas être annulée.')) {
      return;
    }

    try {
      await transitionMutation.mutateAsync({ 
        newState: 'ARCHIVED',
        metadata: {
          archivedBy: user?.user?.id || user?.id,
          archiveDate: new Date().toISOString(),
          reason: 'Admin archive action'
        }
      });

      toast({
        title: "Fiche archivée",
        description: "La fiche a été archivée avec succès.",
        variant: "default"
      });

      // Redirect to fiches list
      setTimeout(() => {
        window.location.href = '/fiches';
      }, 1000);

    } catch (error) {
      toast({
        title: "Erreur d'archivage",
        description: error.message || "Une erreur est survenue lors de l'archivage.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer définitivement cette fiche ? Cette action ne peut pas être annulée.')) {
      return;
    }

    try {
      await apiRequest('DELETE', `/api/fiches/${ficheId}`);
      
      queryClient.invalidateQueries(['/api/fiches']);
      
      toast({
        title: "Fiche supprimée",
        description: "La fiche a été supprimée définitivement.",
        variant: "default"
      });

      // Redirect to fiches list
      setTimeout(() => {
        window.location.href = '/fiches';
      }, 1000);

    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Erreur de suppression",
        description: error.message || "Une erreur est survenue lors de la suppression.",
        variant: "destructive"
      });
    }
  };

  const canPerformAction = (action) => {
    if (!fiche || !user) return false;
    
    switch (action) {
      case 'assign':
        return user.role === 'RELATIONS_EVS' && fiche.state === 'SUBMITTED_TO_FEVES';
      case 'accept':
      case 'reject':
        return user.role === 'EVS_CS' && fiche.state === 'ASSIGNED_TO_EVS' && fiche.assignedOrgId === user.orgId;
      case 'sign_contract':
        return user.role === 'EVS_CS' && fiche.state === 'CONTRACT_SENT' && fiche.assignedOrgId === user.orgId;
      case 'cd_validate':
        const userRoleForCD = user.user?.role || user.role;
        return userRoleForCD === 'CD' && fiche.state === 'SUBMITTED_TO_CD';
      case 'cd_reject':
        const userRoleForCDReject = user.user?.role || user.role;
        return userRoleForCDReject === 'CD' && fiche.state === 'SUBMITTED_TO_CD';
      case 'cd_return':
        const userRoleForCDReturn = user.user?.role || user.role;
        return userRoleForCDReturn === 'CD' && fiche.state === 'SUBMITTED_TO_CD';
      case 'edit':
        const userRole = user.user?.role || user.role;
        const userId = user.user?.id || user.id;
        return userRole === 'ADMIN' || (fiche.state === 'DRAFT' && fiche.emitterId === userId);
      default:
        return false;
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.main}>
          <div className={styles.card}>
            <p>Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !fiche) {
    return (
      <div className={styles.container}>
        <div className={styles.main}>
          <div className={styles.card}>
            <p>Erreur lors du chargement de la fiche</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        {/* Header Section */}
        <div className={styles.headerSection}>
          {/* Title Row */}
          <div className={styles.titleColumn}>
            <h1 className={styles.pageTitle}>
              Fiche Navette CAP
            </h1>
            <p className={styles.ficheRef} data-testid="text-fiche-id">
              #{fiche.id}
            </p>
          </div>
          
          {/* Action Buttons Row */}
          <div className={styles.actionButtons}>
            <Link href="/fiches" className={styles.backButton}>
              <ArrowLeft className={styles.buttonIcon} />
              Retour
            </Link>
            
            {canPerformAction('cd_validate') && (
              <>
                <button 
                  onClick={() => handleCDValidation('validate')}
                  disabled={transitionMutation.isPending}
                  className={styles.validateButton}
                  data-testid="button-cd-validate"
                >
                  <CheckCircle className={styles.buttonIcon} />
                  Valider
                </button>
                <button 
                  onClick={() => handleCDValidation('return')}
                  disabled={transitionMutation.isPending}
                  className={styles.returnButton}
                  data-testid="button-cd-return"
                >
                  <RotateCcw className={styles.buttonIcon} />
                  Renvoyer
                </button>
                <button 
                  onClick={() => handleCDValidation('reject')}
                  disabled={transitionMutation.isPending}
                  className={styles.rejectButton}
                  data-testid="button-cd-reject"
                >
                  <XCircle className={styles.buttonIcon} />
                  Refuser
                </button>
              </>
            )}
            
            {canPerformAction('assign') && (
              <button 
                onClick={() => setShowAssignModal(true)}
                className={styles.assignButton}
                data-testid="button-assign"
              >
                <UserPlus className={styles.buttonIcon} />
                Affecter
              </button>
            )}
            
            {canPerformAction('edit') && (
              <Link 
                href={`/fiches/${ficheId}/edit`}
                className={styles.editButton}
                data-testid="button-edit-fiche"
              >
                <Edit className={styles.buttonIcon} />
                Modifier la fiche
              </Link>
            )}
            
            {/* Admin-only actions */}
            {user?.user?.role === 'ADMIN' && (
              <>
                <button 
                  onClick={handleArchive}
                  disabled={transitionMutation.isPending}
                  className={styles.archiveButton}
                  data-testid="button-archive-fiche"
                >
                  <Archive className={styles.buttonIcon} />
                  Archiver
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={transitionMutation.isPending}
                  className={styles.deleteButton}
                  data-testid="button-delete-fiche"
                >
                  <Trash2 className={styles.buttonIcon} />
                  Supprimer
                </button>
              </>
            )}
            
            <button 
              className={styles.auditButton}
              onClick={() => setShowAuditModal(true)}
              data-testid="button-audit-log"
            >
              <History className={styles.buttonIcon} />
              Journal d'audit
            </button>
          </div>

          {/* Status Info */}
          <div className={styles.statusInfo}>
            <div className={styles.statusBadge} data-testid="badge-status">
              <StatusBadge state={fiche.state} />
            </div>
            <span className={styles.statusText}>
              Dernière mise à jour le {formatDate(fiche.updatedAt)}
            </span>
          </div>
        </div>

        {/* Timeline */}
        <StateTimeline 
          currentState={fiche.state}
          stateHistory={fiche.stateHistory || []}
        />

        {/* Content */}
        <div className={styles.content}>
          {/* Informations générales */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              Informations générales
            </h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Référent</label>
                <p className={styles.infoValue} data-testid="text-emitter">
                  {fiche.emitter?.firstName} {fiche.emitter?.lastName}
                </p>
              </div>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Créé le</label>
                <p className={styles.infoValue} data-testid="text-created-date">
                  {formatDate(fiche.createdAt)}
                </p>
              </div>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Dernière modification</label>
                <p className={styles.infoValue} data-testid="text-updated-date">
                  {formatDate(fiche.updatedAt)}
                </p>
              </div>
            </div>
            {fiche.description && (
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Description</label>
                <p className={styles.infoValue} data-testid="text-description">
                  {fiche.description}
                </p>
              </div>
            )}
          </div>

          {/* Family Information */}
          {fiche.family && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                Informations Famille
              </h2>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label className={styles.infoLabel}>Nom</label>
                  <p className={styles.infoValue} data-testid="text-family-name">
                    {fiche.family.lastName}
                  </p>
                </div>
                <div className={styles.infoItem}>
                  <label className={styles.infoLabel}>Prénom</label>
                  <p className={styles.infoValue} data-testid="text-family-firstname">
                    {fiche.family.firstName}
                  </p>
                </div>
                <div className={styles.infoItem}>
                  <label className={styles.infoLabel}>Téléphone</label>
                  <p className={styles.infoValue} data-testid="text-family-phone">
                    {fiche.family.phone || 'N/A'}
                  </p>
                </div>
                <div className={styles.infoItem}>
                  <label className={styles.infoLabel}>Email</label>
                  <p className={styles.infoValue} data-testid="text-family-email">
                    {fiche.family.email || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ateliers sélectionnés */}
          {fiche.selections?.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                Ateliers sélectionnés
              </h2>
              <div className={styles.content}>
                {fiche.selections.map((selection) => (
                  <div key={selection.id} className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>{selection.workshop?.name}</label>
                      <p className={styles.infoValue}>
                        {selection.workshop?.objective?.code} - {selection.qty} participant(s)
                      </p>
                    </div>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Prix</label>
                      <p className={styles.infoValue}>
                        {formatCurrency((selection.workshop?.priceCents || 0) * selection.qty)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label className={styles.infoLabel}>Total</label>
                  <p className={styles.infoValue} data-testid="text-total-amount">
                    {formatCurrency(
                      fiche.selections?.reduce((sum, s) => 
                        sum + (s.workshop?.priceCents || 0) * s.qty, 0
                      ) || 0
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pièces jointes */}
          {fiche.attachments?.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                Pièces jointes
              </h2>
              <div className={styles.content}>
                {fiche.attachments.map((attachment) => (
                  <div key={attachment.id} className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <FileText className={styles.actionIcon} />
                      <p className={styles.infoValue}>{attachment.filename}</p>
                    </div>
                    <div className={styles.infoItem}>
                      <button className={styles.commentButton} data-testid={`button-download-${attachment.id}`}>
                        <Download className={styles.actionIcon} />
                        Télécharger
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Commentaires */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              Commentaires internes
            </h2>
            
            {fiche.comments?.length > 0 && (
              <div className={styles.commentsList}>
                {fiche.comments.map((comment) => (
                  <div key={comment.id} className={styles.commentItem}>
                    <div className={styles.commentHeader}>
                      <span className={styles.commentAuthor}>
                        {comment.author?.firstName} {comment.author?.lastName}
                      </span>
                      <span className={styles.commentDate}>
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className={styles.commentContent}>{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
            
            {/* Only show comment form if not CD user */}
            {user?.role !== 'CD' && (
              <div className={styles.commentForm}>
                <textarea 
                  className={styles.commentTextarea}
                  placeholder="Ajouter un commentaire interne..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  data-testid="textarea-new-comment"
                />
                <button 
                  className={styles.commentButton}
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  data-testid="button-add-comment"
                >
                  <Send className={styles.actionIcon} />
                  Commenter
                </button>
              </div>
            )}
            
            {/* Show read-only message for CD users */}
            {user?.role === 'CD' && (
              <div className={styles.readOnlyMessage}>
                <p className={styles.readOnlyText}>
                  Mode consultation - Vous pouvez voir les commentaires mais ne pouvez pas en ajouter
                </p>
              </div>
            )}
          </div>

          {/* Validation messages for SUBMITTED_TO_CD status */}
          {fiche.state === 'SUBMITTED_TO_CD' && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                Validations
              </h2>
              <div className={styles.validationMessages}>
                <p className={styles.validationMessage} data-testid="text-family-acknowledgment">
                  La famille a connaissance du contenu de cette fiche et adhère à cet accompagnement
                </p>
                <p className={styles.validationMessage} data-testid="text-referent-validation">
                  {fiche.emitter?.firstName} {fiche.emitter?.lastName} a validé et transmis cette fiche
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                Affecter à un EVS/CS
              </h2>
              <button 
                className={styles.modalClose}
                onClick={() => setShowAssignModal(false)}
                data-testid="button-close-modal"
              >
                ✕
              </button>
            </div>

            <div className={styles.organizationsList}>
              <h3 className={styles.cardTitle}>Organisations disponibles</h3>
              {organizations
                .map((org) => (
                  <div 
                    key={org.id}
                    className={`${styles.organizationItem} ${selectedOrgId === org.id ? styles.selected : ''}`}
                    onClick={() => setSelectedOrgId(org.id)}
                    data-testid={`org-option-${org.id}`}
                  >
                    <h4 className={styles.orgName}>{org.name}</h4>
                    <p className={styles.orgType}>{org.type}</p>
                  </div>
                ))}
            </div>

            <button 
              className={styles.assignButton}
              onClick={handleAssignToOrg}
              disabled={!selectedOrgId || assignMutation.isPending}
              data-testid="button-confirm-assignment"
            >
              <UserPlus className={styles.buttonIcon} />
              Affecter
            </button>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {showAuditModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                Journal d'audit
              </h2>
              <button 
                className={styles.modalClose}
                onClick={() => setShowAuditModal(false)}
                data-testid="button-close-audit-modal"
              >
                ✕
              </button>
            </div>

            <div className={styles.auditLogsList}>
              {auditLoading ? (
                <div className={styles.loadingMessage}>
                  <p>Chargement des logs d'audit...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className={styles.emptyMessage}>
                  <p>Aucun événement d'audit disponible pour cette fiche.</p>
                </div>
              ) : (
                <div className={styles.auditEntries}>
                  {auditLogs.map((log) => (
                    <div key={log.id} className={styles.auditEntry} data-testid={`audit-entry-${log.id}`}>
                      <div className={styles.auditHeader}>
                        <div className={styles.auditAction}>
                          <span className={styles.actionBadge}>{log.action}</span>
                          <span className={styles.entityBadge}>{log.entity}</span>
                        </div>
                        <span className={styles.auditDate}>
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                      <div className={styles.auditDetails}>
                        <p className={styles.auditActor}>
                          {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'Utilisateur inconnu'}
                          {log.actor?.role && ` (${log.actor.role})`}
                        </p>
                        {log.meta && (
                          <div className={styles.auditMeta}>
                            {log.meta.oldState && log.meta.newState && (
                              <p className={styles.stateTransition}>
                                État: {log.meta.oldState} → {log.meta.newState}
                              </p>
                            )}
                            {log.meta.method && log.meta.path && (
                              <p className={styles.requestInfo}>
                                {log.meta.method} {log.meta.path}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}