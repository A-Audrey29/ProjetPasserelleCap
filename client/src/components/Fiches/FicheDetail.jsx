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
  
  // EPCI selection states for RELATIONS_EVS
  const [selectedEpciId, setSelectedEpciId] = useState('');
  const [selectedEvscsId, setSelectedEvscsId] = useState('');

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

  // Query for EPCIs (for RELATIONS_EVS selection)
  const { data: epcis = [] } = useQuery({
    queryKey: ['/api/epcis'],
    enabled: user?.role === 'RELATIONS_EVS' && fiche?.state === 'SUBMITTED_TO_FEVES'
  });

  // Query for organizations by selected EPCI
  const { data: epciOrganizations = [] } = useQuery({
    queryKey: ['/api/epcis', selectedEpciId, 'organizations'],
    enabled: !!selectedEpciId && user?.role === 'RELATIONS_EVS' && fiche?.state === 'SUBMITTED_TO_FEVES'
  });

  // Query for audit logs
  const { data: auditLogs = [], isLoading: auditLoading } = useQuery({
    queryKey: ['/api/audit', ficheId, 'FicheNavette'],
    queryFn: async () => {
      const response = await fetch(`/api/audit?entityId=${ficheId}&entity=FicheNavette`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    },
    enabled: !!ficheId, // Always fetch audit logs for validation display
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

  // RELATIONS_EVS actions with EPCI selection
  const handleRelationsEvsAction = async (action) => {
    if (!selectedEvscsId) {
      toast({
        title: "Sélection requise",
        description: "Veuillez sélectionner une structure EVS/CS",
        variant: "destructive"
      });
      return;
    }

    try {
      const selectedOrg = epciOrganizations.find(org => org.id === selectedEvscsId);
      
      if (action === 'validate') {
        // Advance to next state and send notification to EVS/CS
        await transitionMutation.mutateAsync({ 
          newState: 'ASSIGNED_TO_EVS',
          metadata: {
            assignedOrgId: selectedEvscsId,
            assignedOrgName: selectedOrg?.name,
            assignedBy: user?.id,
            assignedAt: new Date().toISOString()
          }
        });
        
        // Send notification email to EVS/CS
        await apiRequest('POST', '/api/notifications/evs-assignment', {
          ficheId: ficheId,
          orgId: selectedEvscsId,
          orgName: selectedOrg?.name,
          contactEmail: selectedOrg?.contactEmail,
          contactName: selectedOrg?.contactPersonName
        });
        
        toast({
          title: "Fiche transmise",
          description: `La fiche a été transmise à ${selectedOrg?.name}. Un email de notification a été envoyé.`,
          variant: "default"
        });
        
      } else if (action === 'return') {
        // Return to draft and notify EMETTEUR
        await transitionMutation.mutateAsync({ 
          newState: 'DRAFT',
          metadata: {
            returnedBy: user?.id,
            returnedAt: new Date().toISOString(),
            reason: 'Renvoyée par RELATIONS_EVS'
          }
        });
        
        // Send notification email to EMETTEUR
        await apiRequest('POST', '/api/notifications/emitter-return', {
          ficheId: ficheId,
          emitterEmail: fiche.emitter?.email,
          emitterName: `${fiche.emitter?.firstName} ${fiche.emitter?.lastName}`
        });
        
        toast({
          title: "Fiche renvoyée",
          description: "La fiche a été renvoyée à l'émetteur. Un email de notification a été envoyé.",
          variant: "default"
        });
        
      } else if (action === 'archive') {
        // Archive the fiche
        await transitionMutation.mutateAsync({ 
          newState: 'ARCHIVED',
          metadata: {
            archivedBy: user?.id,
            archivedAt: new Date().toISOString(),
            reason: 'Archivée par RELATIONS_EVS'
          }
        });
        
        toast({
          title: "Fiche archivée",
          description: "La fiche a été archivée avec succès.",
          variant: "default"
        });
      }
      
      // Reset selections
      setSelectedEpciId('');
      setSelectedEvscsId('');
      
    } catch (error) {
      toast({
        title: "Erreur de traitement",
        description: error.message || "Impossible de traiter l'action",
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

        {/* EPCI Selection for RELATIONS_EVS with SUBMITTED_TO_FEVES status */}
        {user?.role === 'RELATIONS_EVS' && fiche.state === 'SUBMITTED_TO_FEVES' && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              Transmission vers EVS/CS
            </h2>
            
            <div className={styles.epciSelection}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label className={styles.infoLabel} htmlFor="epci-select">
                    Sélectionnez un EPCI
                  </label>
                  <select
                    id="epci-select"
                    className={styles.selectField}
                    value={selectedEpciId}
                    onChange={(e) => {
                      setSelectedEpciId(e.target.value);
                      setSelectedEvscsId(''); // Reset EVS/CS selection when EPCI changes
                    }}
                    data-testid="select-epci"
                  >
                    <option value="">-- Choisir un EPCI --</option>
                    {epcis.map((epci) => (
                      <option key={epci.id} value={epci.id}>
                        {epci.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedEpciId && (
                  <div className={styles.infoItem}>
                    <label className={styles.infoLabel} htmlFor="evs-select">
                      Sélectionnez une structure EVS/CS
                    </label>
                    <select
                      id="evs-select"
                      className={styles.selectField}
                      value={selectedEvscsId}
                      onChange={(e) => setSelectedEvscsId(e.target.value)}
                      data-testid="select-evs-cs"
                    >
                      <option value="">-- Choisir une structure --</option>
                      {epciOrganizations
                        .filter(org => org.type === 'EVS' || org.type === 'CS')
                        .map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name} ({org.type})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {selectedEvscsId && (
                <>
                  {/* Confirmation text */}
                  <div className={styles.confirmationText}>
                    <p className={styles.confirmationMessage} data-testid="text-transmission-confirmation">
                      Transmettre cette fiche à la structure : <strong>
                        {epciOrganizations.find(org => org.id === selectedEvscsId)?.name}
                      </strong>
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className={styles.transmissionActions}>
                    <button
                      className={styles.validateButton}
                      onClick={() => handleRelationsEvsAction('validate')}
                      disabled={transitionMutation.isPending}
                      data-testid="button-relations-validate"
                    >
                      <CheckCircle className={styles.buttonIcon} />
                      Valider
                    </button>
                    <button
                      className={styles.returnButton}
                      onClick={() => handleRelationsEvsAction('return')}
                      disabled={transitionMutation.isPending}
                      data-testid="button-relations-return"
                    >
                      <RotateCcw className={styles.buttonIcon} />
                      Renvoyer à la structure émettrice
                    </button>
                    <button
                      className={styles.archiveButton}
                      onClick={() => handleRelationsEvsAction('archive')}
                      disabled={transitionMutation.isPending}
                      data-testid="button-relations-archive"
                    >
                      <Archive className={styles.buttonIcon} />
                      Archiver
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className={styles.content}>
          {/* Informations du référent */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              Informations du référent
            </h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Nom</label>
                <p className={styles.infoValue} data-testid="text-referent-lastname">
                  {fiche.referentData?.lastName || fiche.emitter?.lastName || 'N/A'}
                </p>
              </div>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Prénom</label>
                <p className={styles.infoValue} data-testid="text-referent-firstname">
                  {fiche.referentData?.firstName || fiche.emitter?.firstName || 'N/A'}
                </p>
              </div>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Structure</label>
                <p className={styles.infoValue} data-testid="text-referent-structure">
                  {fiche.referentData?.structure || fiche.emitter?.structure || 'N/A'}
                </p>
              </div>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Téléphone</label>
                <p className={styles.infoValue} data-testid="text-referent-phone">
                  {fiche.referentData?.phone || fiche.emitter?.phone || 'N/A'}
                </p>
              </div>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Email</label>
                <p className={styles.infoValue} data-testid="text-referent-email">
                  {fiche.referentData?.email || fiche.emitter?.email || 'N/A'}
                </p>
              </div>
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Date de demande</label>
                <p className={styles.infoValue} data-testid="text-request-date">
                  {fiche.referentData?.requestDate ? formatDate(fiche.referentData.requestDate) : formatDate(fiche.createdAt)}
                </p>
              </div>
            </div>
            {fiche.description && (
              <div className={styles.descriptionSection}>
                <label className={styles.infoLabel}>Description de la demande</label>
                <p className={styles.descriptionValue} data-testid="text-description">
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
              <div className={styles.familyDetailsGrid}>
                <div className={styles.familySection}>
                  <h3 className={styles.sectionSubtitle}>Informations de base</h3>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Code famille</label>
                      <p className={styles.infoValue} data-testid="text-family-code">
                        {fiche.familyDetailedData?.code || fiche.family.code || 'N/A'}
                      </p>
                    </div>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Adresse</label>
                      <p className={styles.infoValue} data-testid="text-family-address">
                        {fiche.familyDetailedData?.adresse || fiche.family.address || 'N/A'}
                      </p>
                    </div>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Téléphone portable</label>
                      <p className={styles.infoValue} data-testid="text-family-mobile">
                        {fiche.familyDetailedData?.telephonePortable || fiche.family.phone || 'N/A'}
                      </p>
                    </div>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Téléphone fixe</label>
                      <p className={styles.infoValue} data-testid="text-family-phone">
                        {fiche.familyDetailedData?.telephoneFixe || 'N/A'}
                      </p>
                    </div>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Email</label>
                      <p className={styles.infoValue} data-testid="text-family-email">
                        {fiche.familyDetailedData?.email || fiche.family.email || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={styles.familySection}>
                  <h3 className={styles.sectionSubtitle}>Composition familiale</h3>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Mère</label>
                      <p className={styles.infoValue} data-testid="text-family-mother">
                        {fiche.familyDetailedData?.mother || fiche.family.mother || 'N/A'}
                      </p>
                    </div>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Père</label>
                      <p className={styles.infoValue} data-testid="text-family-father">
                        {fiche.familyDetailedData?.father || fiche.family.father || 'N/A'}
                      </p>
                    </div>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Tiers</label>
                      <p className={styles.infoValue} data-testid="text-family-tiers">
                        {fiche.familyDetailedData?.tiers || fiche.family.tiers || 'N/A'}
                      </p>
                    </div>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Lien avec les enfants</label>
                      <p className={styles.infoValue} data-testid="text-family-link">
                        {fiche.familyDetailedData?.lienAvecEnfants || fiche.family.lienAvecEnfants || 'N/A'}
                      </p>
                    </div>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Autorité parentale</label>
                      <p className={styles.infoValue} data-testid="text-family-authority">
                        {fiche.familyDetailedData?.autoriteParentale || fiche.family.autoriteParentale || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={styles.familySection}>
                  <h3 className={styles.sectionSubtitle}>Situation</h3>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Situation familiale</label>
                      <p className={styles.infoValue} data-testid="text-family-situation">
                        {fiche.familyDetailedData?.situationFamiliale || fiche.family.situationFamiliale || 'N/A'}
                      </p>
                    </div>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Situation socio-professionnelle</label>
                      <p className={styles.infoValue} data-testid="text-family-sociopro">
                        {fiche.familyDetailedData?.situationSocioProfessionnelle || fiche.family.situationSocioProfessionnelle || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Children Information */}
          {((fiche.children && fiche.children.length > 0) || (fiche.childrenData && fiche.childrenData.length > 0)) && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                Enfants
              </h2>
              <div className={styles.childrenList}>
                {/* Display children from database or form data */}
                {(fiche.children?.length > 0 ? fiche.children : fiche.childrenData || []).map((child, index) => (
                  <div key={child.id || index} className={styles.childCard} data-testid={`child-${child.id || index}`}>
                    <div className={styles.childInfo}>
                      <h3 className={styles.childName} data-testid={`text-child-name-${child.id || index}`}>
                        {child.firstName || child.name || 'N/A'}
                      </h3>
                      <div className={styles.childDetails}>
                        {(child.birthDate || child.dateNaissance) && (
                          <span className={styles.childAge} data-testid={`text-child-age-${child.id || index}`}>
                            Né(e) le {formatDate(child.birthDate || child.dateNaissance)}
                          </span>
                        )}
                        {(child.level || child.niveauScolaire) && (
                          <span className={styles.childLevel} data-testid={`text-child-level-${child.id || index}`}>
                            Niveau: {child.level || child.niveauScolaire}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ateliers sélectionnés */}
          {fiche.selections?.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                Ateliers sélectionnés
              </h2>
              <div className={styles.workshopSelections}>
                {fiche.selections.map((selection) => (
                  <div key={selection.id} className={styles.workshopItem} data-testid={`workshop-${selection.id}`}>
                    <div className={styles.workshopHierarchy}>
                      <div className={styles.objectiveLevel}>
                        <span className={styles.objectiveCode} data-testid={`text-objective-code-${selection.id}`}>
                          {selection.workshop?.objective?.code}
                        </span>
                        <span className={styles.objectiveName} data-testid={`text-objective-name-${selection.id}`}>
                          {selection.workshop?.objective?.name}
                        </span>
                      </div>
                      <div className={styles.workshopLevel}>
                        <h3 className={styles.workshopName} data-testid={`text-workshop-name-${selection.id}`}>
                          {selection.workshop?.name}
                        </h3>
                      </div>
                      <div className={styles.propositionLevel}>
                        <div className={styles.propositionContent}>
                          <span className={styles.propositionLabel}>Proposition du référent</span>
                          {(() => {
                            // Reverse mapping to find technical ID from database ID
                            const workshopIdReverseMapping = {
                              '0ae9279f-9d7a-4778-875a-3ed84ee9d1b1': 'workshop_1_1', // Atelier communication parent-enfant
                              'bca25252-1dcf-4e35-b426-7374b79bafe1': 'workshop_1_2', // Gestion des émotions
                              '102d9611-e264-42a9-aca8-0da0a73956ba': 'workshop_1_3', // Techniques éducatives positives
                              '0c28af6d-e911-4c98-b5b2-10d9c585d3bb': 'workshop_2_1', // Ateliers famille
                              '3f48eed0-f7a0-4cc5-85d4-f2feb39371e7': 'workshop_2_2', // Dialogue intergénérationnel
                              '69ab54c3-a222-4fce-b6d4-1fe56fbf046f': 'workshop_2_3', // Médiation familiale
                              '475e5207-044a-4ef0-a285-a1350f049ef7': 'workshop_3_1', // Jeux coopératifs
                              'c09e5c74-a78b-4da8-9e48-1a4e7e28b58a': 'workshop_3_2', // Randonnée familiale
                              '0b7fbcb2-6d56-48fe-ad97-07a5f9fb5293': 'workshop_3_3'  // Sport collectif famille
                            };
                            
                            const technicalId = workshopIdReverseMapping[selection.workshopId];
                            const propositionText = fiche.workshopPropositions && technicalId ? 
                              fiche.workshopPropositions[technicalId] : null;
                              
                            return propositionText ? (
                              <p className={styles.propositionText} data-testid={`text-proposition-${selection.id}`}>
                                {propositionText}
                              </p>
                            ) : null;
                          })()}
                        </div>
                        <div className={styles.propositionPrice} data-testid={`text-workshop-price-${selection.id}`}>
                          {formatCurrency((selection.workshop?.priceCents || 0) * selection.qty)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className={styles.totalSection}>
                <div className={styles.totalItem}>
                  <label className={styles.totalLabel}>Total</label>
                  <p className={styles.totalValue} data-testid="text-total-amount">
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

          {/* Validation tracking for all fiches */}
          {(fiche.state === 'SUBMITTED_TO_CD' || fiche.state === 'SUBMITTED_TO_FEVES' || fiche.state === 'VALIDATED' || fiche.state === 'ARCHIVED') && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                Historique des validations
              </h2>
              <div className={styles.validationMessages}>
                {/* Family consent */}
                {fiche.familyConsent && (
                  <div className={styles.validationItem} data-testid="validation-family">
                    <span className={styles.validationCheck}>✓</span>
                    <span>La famille a donné son accord pour cet accompagnement</span>
                  </div>
                )}
                
                {/* Emitter validation */}
                <div className={styles.validationItem} data-testid="validation-emitter">
                  <span className={styles.validationCheck}>✓</span>
                  <span>
                    {fiche.emitter?.firstName} {fiche.emitter?.lastName} 
                    {fiche.emitter?.structure && ` (${fiche.emitter.structure})`} a validé et transmis cette fiche
                  </span>
                </div>
                
                {/* CD validation - only show if fiche has been validated by CD */}
                {(fiche.state === 'SUBMITTED_TO_FEVES' || fiche.state === 'VALIDATED' || fiche.state === 'ARCHIVED') && auditLogs && (
                  (() => {
                    const cdValidation = auditLogs.find(log => 
                      log.action === 'state_transition' && 
                      log.meta?.oldState === 'SUBMITTED_TO_CD' &&
                      log.meta?.newState === 'SUBMITTED_TO_FEVES'
                    );
                    
                    if (cdValidation && cdValidation.actor) {
                      return (
                        <div className={styles.validationItem} data-testid="validation-cd">
                          <span className={styles.validationCheck}>✓</span>
                          <span>
                            {cdValidation.actor.firstName} {cdValidation.actor.lastName}
                            {cdValidation.actor.structure && ` (${cdValidation.actor.structure})`} 
                            {' '}a validé cette fiche
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()
                )}
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