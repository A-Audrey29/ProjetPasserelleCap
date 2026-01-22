import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  UserPlus,
  MessageCircle,
  History,
  Eye,
  Send,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Edit,
  RotateCcw,
  Archive,
  Trash2,
  Target
} from 'lucide-react';
import StatusBadge from '@/components/Common/StatusBadge';
import StateTimeline from './StateTimeline';
import DocumentsDisplay from '@/components/Documents/DocumentsDisplay';
import { formatDate } from '@/utils/formatters';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'wouter';
import styles from './FicheDetail.module.css';

// Normalize family data coming from different API shapes
const mapFamilyFromApi = (src = {}) => ({
  email: src.email ?? '',
  mother: src.mother ?? '',
  father: src.father ?? '',
  tiers: src.tiers ?? '',
  lienAvecEnfants: src.lienAvecEnfants ?? '',
  autoriteParentale: Array.isArray(src.autoriteParentale) ? src.autoriteParentale : (src.autoriteParentale ? [src.autoriteParentale] : []),
  situationFamiliale: src.situationFamiliale ?? '',
  situationSocioProfessionnelle: src.situationSocioProfessionnelle ?? '',
  adresse: src.adresse ?? src.address ?? '',
  telephonePortable: src.telephonePortable ?? src.phone ?? '',
  telephoneFixe: src.telephoneFixe ?? src.landline ?? src.phone2 ?? ''
});

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
  
  // Contract verification states - initialize from fiche data
  const [contractSigned, setContractSigned] = useState(false);
  const [advancePaymentSent, setAdvancePaymentSent] = useState(false);
  const [activityCompleted, setActivityCompleted] = useState(false);
  const [fieldCheckCompleted, setFieldCheckCompleted] = useState(false);
  const [finalReportSent, setFinalReportSent] = useState(false);
  const [remainingPaymentSent, setRemainingPaymentSent] = useState(false);
  
  // Workshop report upload state
  const [uploadingReportFor, setUploadingReportFor] = useState(null);

  // Close all workshops states
  const [allWorkshopsCompleted, setAllWorkshopsCompleted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // FEVES rejection modal states
  const [showFevesReturnModal, setShowFevesReturnModal] = useState(false);
  const [fevesReturnComment, setFevesReturnComment] = useState('');

  // Final report upload states
  const [uploadingFinalReport, setUploadingFinalReport] = useState(false);
  const [finalReportPdfUrl, setFinalReportPdfUrl] = useState(null);

  // Query for fiche details
  const { data: fiche, isLoading, error } = useQuery({
    queryKey: ['/api/fiches', ficheId],
    enabled: !!ficheId
  });

  // Compute derived values after fiche is loaded
  const userRole = user?.role ?? user?.user?.role;
  const canCloseWorkshops = (userRole === 'EVS_CS' || userRole === 'ADMIN') && fiche?.state !== 'CLOSED';

  // Update states when fiche data loads
  useEffect(() => {
    if (fiche) {
      setContractSigned(fiche.contractSigned || false);
      setAdvancePaymentSent(fiche.advancePaymentSent || false);
      setActivityCompleted(fiche.activityCompleted || false);
      setFieldCheckCompleted(fiche.fieldCheckCompleted || false);
      setFinalReportSent(fiche.finalReportSent || false);
      setRemainingPaymentSent(fiche.remainingPaymentSent || false);
      
      // Check if final report PDF exists
      const reportPath = `/uploads/final-report-${fiche.id}.pdf`;
      setFinalReportPdfUrl(reportPath);
    }
  }, [fiche]);

  // Query for organizations (for assignment)
  const { data: organizations = [] } = useQuery({
    queryKey: ['/api/organizations'],
    enabled: showAssignModal
  });

  // Query for EPCIs (for RELATIONS_EVS and ADMIN selection)
  const canTransmitToEvs = ['ADMIN', 'RELATIONS_EVS'].includes(userRole);
  const { data: epcis = [] } = useQuery({
    queryKey: ['/api/epcis'],
    enabled: canTransmitToEvs && fiche?.state === 'SUBMITTED_TO_FEVES'
  });

  // Query for organizations by selected EPCI
  const { data: epciOrganizations = [] } = useQuery({
    queryKey: ['/api/epcis', selectedEpciId, 'organizations'],
    queryFn: async ({ queryKey }) => {
      const { apiFetch } = await import('@/lib/apiFetch');
      const [, epciId] = queryKey;
      const response = await apiFetch(`/api/epcis/${epciId}/organizations`);
      if (!response.ok) throw new Error('Failed to fetch organizations by EPCI');
      return response.json();
    },
    enabled: !!selectedEpciId && canTransmitToEvs && fiche?.state === 'SUBMITTED_TO_FEVES'
  });

  // Query for audit logs - using apiFetch for credentials
  const { data: auditLogs = [], isLoading: auditLoading } = useQuery({
    queryKey: ['/api/audit', ficheId, 'FicheNavette'],
    queryFn: async () => {
      const { apiFetch } = await import('@/lib/apiFetch');
      const response = await apiFetch(`/api/audit?entityId=${ficheId}&entity=FicheNavette`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    },
    enabled: !!ficheId, // Always fetch audit logs for validation display
    retry: false
  });

  // Query for workshops to display selections
  const { data: workshopsList = [] } = useQuery({
    queryKey: ['/api/workshops'],
    enabled: !!fiche
  });

  // Query for workshop enrollments (for report upload/download)
  const { data: workshopEnrollments = [] } = useQuery({
    queryKey: ['/api/enrollments/fiche', ficheId],
    enabled: !!ficheId
  });

  // Check if all workshop reports are uploaded (required for closure)
  const allReportsUploaded = workshopEnrollments.length > 0 && workshopEnrollments.every(e => e.reportUrl);

  // Workshop selection logic - SAME AS FORM (selectedWorkshops priority)
  const getCombinedWorkshopSelection = () => {
    if (!fiche) return { workshopIds: [], isLegacyMode: false };
    
    // Get selected workshops (checkboxes are priority) - SAME LOGIC AS FORM
    const selectedWorkshopIds = Object.keys(fiche.selectedWorkshops || {}).filter(
      id => fiche.selectedWorkshops[id]
    );
    
    // Fallback for existing fiches: if no checkboxes but propositions exist
    const propositionWorkshopIds = Object.keys(fiche.workshopPropositions || {}).filter(
      id => fiche.workshopPropositions[id]?.trim()
    );
    
    // Priority: selected workshops, fallback to propositions for backward compatibility
    const finalWorkshopIds = selectedWorkshopIds.length > 0 
      ? selectedWorkshopIds 
      : propositionWorkshopIds;
    
    return {
      workshopIds: finalWorkshopIds.map(String), // Normalize to strings for consistency
      isLegacyMode: selectedWorkshopIds.length === 0 && propositionWorkshopIds.length > 0
    };
  };

  const { workshopIds, isLegacyMode } = getCombinedWorkshopSelection();

  // Normalize family information for display
  const family = fiche
    ? mapFamilyFromApi(fiche.familyDetailedData || fiche.family || {})
    : null;

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

  // FEVES return to draft (rejection)
  const handleFevesReturn = async () => {
    if (!fevesReturnComment.trim()) {
      toast({
        title: "Commentaire requis",
        description: "Veuillez ajouter un commentaire pour expliquer les corrections attendues",
        variant: "destructive"
      });
      return;
    }

    try {
      // Add comment first
      await addCommentMutation.mutateAsync(fevesReturnComment);
      
      // Then transition to DRAFT
      await transitionMutation.mutateAsync({ 
        newState: 'DRAFT',
        metadata: {
          reason: fevesReturnComment,
          rejectedBy: user?.id || user?.user?.id,
          rejectedAt: new Date().toISOString()
        }
      });
      
      setShowFevesReturnModal(false);
      setFevesReturnComment('');
      
      toast({
        title: "Fiche renvoyée",
        description: "La fiche a été renvoyée à l'émetteur pour corrections. Un email de notification a été envoyé.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de renvoyer la fiche",
        variant: "destructive"
      });
    }
  };

  // EVS accept/refuse actions
  const handleEvsAction = async (action) => {
    try {
      if (action === 'accept') {
        await transitionMutation.mutateAsync({ 
          newState: 'ACCEPTED_EVS',
          metadata: {
            acceptedBy: user?.id,
            acceptedAt: new Date().toISOString()
          }
        });
        toast({
          title: "Fiche acceptée",
          description: "Vous avez accepté cette fiche CAP. Elle sera traitée dans le cadre du contrat d'accompagnement.",
          variant: "default"
        });
      } else if (action === 'refuse') {
        await transitionMutation.mutateAsync({ 
          newState: 'SUBMITTED_TO_FEVES',
          metadata: {
            refusedBy: user?.id,
            refusedAt: new Date().toISOString()
          }
        });
        toast({
          title: "Fiche refusée",
          description: "Vous avez refusé cette fiche. Elle a été renvoyée à FEVES pour réaffectation.",
          variant: "default"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de traiter l'action",
        variant: "destructive"
      });
    }
  };

  // Contract verification actions for RELATIONS_EVS
  const handleContractVerification = async (action) => {
    try {
      if (action === 'validate') {
        await transitionMutation.mutateAsync({ 
          newState: 'CONTRACT_SIGNED',
          metadata: {
            contractSigned: true,
            advancePaymentSent: true,
            verifiedBy: user?.id,
            verifiedAt: new Date().toISOString()
          }
        });
        toast({
          title: "Contrat validé",
          description: "Le contrat a été validé et signé. La fiche passe au statut 'Ateliers en cours'.",
          variant: "default"
        });
      } else if (action === 'archive') {
        await transitionMutation.mutateAsync({ 
          newState: 'ARCHIVED',
          metadata: {
            archivedBy: user?.id,
            archivedAt: new Date().toISOString(),
            reason: 'Contract verification failed or cancelled'
          }
        });
        toast({
          title: "Fiche archivée",
          description: "La fiche a été annulée et archivée.",
          variant: "default"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de traiter l'action",
        variant: "destructive"
      });
    }
  };

  // Activity completion for EVS_CS
  const handleActivityCompletion = async () => {
    try {
      await transitionMutation.mutateAsync({ 
        newState: 'FIELD_CHECK_SCHEDULED',
        metadata: {
          activityCompleted: true,
          completedBy: user?.id,
          completedAt: new Date().toISOString()
        }
      });
      toast({
        title: "Activité validée",
        description: "L'activité a été confirmée comme effectuée. La fiche passe au statut 'Vérification programmée'.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de valider l'activité",
        variant: "destructive"
      });
    }
  };

  // Field check completion for RELATIONS_EVS
  const handleFieldCheckCompletion = async () => {
    try {
      await transitionMutation.mutateAsync({ 
        newState: 'FIELD_CHECK_DONE',
        metadata: {
          fieldCheckCompleted: true,
          checkedBy: user?.id,
          checkedAt: new Date().toISOString()
        }
      });
      toast({
        title: "Vérification terrain validée",
        description: "La vérification terrain a été confirmée. La fiche passe au statut 'Vérification effectuée'.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de valider la vérification terrain",
        variant: "destructive"
      });
    }
  };

  // Final verification completion for RELATIONS_EVS
  const handleFinalVerificationCompletion = async () => {
    try {
      await transitionMutation.mutateAsync({ 
        newState: 'CLOSED',
        metadata: {
          finalReportSent: true,
          remainingPaymentSent: true,
          completedBy: user?.id,
          completedAt: new Date().toISOString()
        }
      });
      toast({
        title: "Fiche clôturée",
        description: "La vérification finale a été confirmée. La fiche est maintenant clôturée.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de clôturer la fiche",
        variant: "destructive"
      });
    }
  };

  // Workshop report upload handler
  const handleReportUpload = async (enrollmentId, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Prevent concurrent uploads
    if (uploadingReportFor) return;

    // Validate PDF by extension and common MIME types
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || 
                  file.type === 'application/pdf' || 
                  file.type === 'application/x-pdf';
    
    if (!isPdf) {
      toast({
        title: "Format invalide",
        description: "Seuls les fichiers PDF sont acceptés",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 5 MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingReportFor(enrollmentId);
    try {
      const { apiFetch } = await import('@/lib/apiFetch');
      const formData = new FormData();
      formData.append('reportFile', file);

      const response = await apiFetch(`/api/enrollments/${enrollmentId}/upload-report`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de l\'upload');
      }

      // Refetch enrollments to show updated report
      await queryClient.refetchQueries({ queryKey: ['/api/enrollments/fiche', ficheId] });

      toast({
        title: "Succès",
        description: "Bilan d'activité uploadé avec succès"
      });
    } catch (error) {
      console.error('Error uploading report:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'upload du bilan",
        variant: "destructive"
      });
    } finally {
      setUploadingReportFor(null);
      // Reset file input
      event.target.value = '';
    }
  };

  // Final report upload handler
  const handleFinalReportUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Prevent concurrent uploads
    if (uploadingFinalReport) return;

    // Validate PDF
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || 
                  file.type === 'application/pdf' || 
                  file.type === 'application/x-pdf';
    
    if (!isPdf) {
      toast({
        title: "Format invalide",
        description: "Seuls les fichiers PDF sont acceptés",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 10 MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingFinalReport(true);
    try {
      const { apiFetch } = await import('@/lib/apiFetch');
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiFetch(`/api/fiches/${ficheId}/upload-final-report`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de l\'upload');
      }

      const result = await response.json();
      setFinalReportPdfUrl(result.url);

      // Refetch fiche to show updated state (now FINAL_REPORT_RECEIVED)
      await queryClient.invalidateQueries({ queryKey: ['/api/fiches', ficheId] });
      await queryClient.invalidateQueries({ queryKey: ['/api/fiches'] });

      toast({
        title: "Succès",
        description: "Rapport final uploadé avec succès. La fiche est maintenant en attente de validation finale."
      });
    } catch (error) {
      console.error('Error uploading final report:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'upload du rapport final",
        variant: "destructive"
      });
    } finally {
      setUploadingFinalReport(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Close all workshops handler
  const handleCloseAllWorkshops = async () => {
    if (!canCloseWorkshops) {
      toast({
        title: "Action non autorisée",
        description: "Seuls les EVS/CS et ADMIN peuvent clôturer la fiche",
        variant: "destructive"
      });
      return;
    }

    setIsClosing(true);
    try {
      await apiRequest('POST', `/api/fiches/${ficheId}/close-all-workshops`, {});

      // Refetch fiche to update state
      await queryClient.invalidateQueries({ queryKey: ['/api/fiches', ficheId] });
      await queryClient.invalidateQueries({ queryKey: ['/api/fiches'] });

      toast({
        title: "Fiche clôturée",
        description: "La fiche a été clôturée avec succès. Notifications envoyées à FEVES et CD."
      });

      // Reset checkbox
      setAllWorkshopsCompleted(false);
    } catch (error) {
      console.error('Error closing all workshops:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la clôture de la fiche",
        variant: "destructive"
      });
    } finally {
      setIsClosing(false);
    }
  };

  // RELATIONS_EVS actions with EPCI selection
  const handleRelationsEvsAction = async (action) => {
    // Only check for selectedEvscsId if action requires it (not for archive)
    if ((action === 'validate' || action === 'return') && !selectedEvscsId) {
      toast({
        title: "Sélection requise",
        description: "Veuillez sélectionner une structure EVS/CS",
        variant: "destructive"
      });
      return;
    }

    try {
      const selectedOrg = epciOrganizations.find(org => org.orgId === selectedEvscsId);
      
      if (action === 'validate') {
        // Advance to next state and send notification to EVS/CS
        await transitionMutation.mutateAsync({ 
          newState: 'ASSIGNED_EVS',
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
          contactName: selectedOrg?.contactName
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
        // Bouton Affecter désactivé pour tous les rôles
        return false;
      case 'accept':
      case 'reject':
        const userRoleEvs = user.user?.role || user.role;
        const userOrgIdEvs = user.user?.orgId || user.orgId;
        return userRoleEvs === 'EVS_CS' && fiche.state === 'ASSIGNED_EVS' && fiche.assignedOrgId === userOrgIdEvs;
      case 'sign_contract':
        const userRoleContract = user.user?.role || user.role;
        const userOrgIdContract = user.user?.orgId || user.orgId;
        return userRoleContract === 'EVS_CS' && fiche.state === 'CONTRACT_SENT' && fiche.assignedOrgId === userOrgIdContract;
      case 'cd_validate':
        const userRoleForCD = user.user?.role || user.role;
        return userRoleForCD === 'CD' && fiche.state === 'SUBMITTED_TO_CD';
      case 'cd_reject':
        const userRoleForCDReject = user.user?.role || user.role;
        return userRoleForCDReject === 'CD' && fiche.state === 'SUBMITTED_TO_CD';
      case 'cd_return':
        const userRoleForCDReturn = user.user?.role || user.role;
        return userRoleForCDReturn === 'CD' && fiche.state === 'SUBMITTED_TO_CD';
      case 'feves_return':
        const userRoleForFeves = user.user?.role || user.role;
        return userRoleForFeves === 'RELATIONS_EVS' && fiche.state === 'SUBMITTED_TO_FEVES';
      case 'edit':
        // ADMIN can edit any fiche
        if (userRole === 'ADMIN') return true;
        // RELATIONS_EVS can edit fiches in SUBMITTED_TO_FEVES state
        if (userRole === 'RELATIONS_EVS' && fiche.state === 'SUBMITTED_TO_FEVES') return true;
        // EMETTEUR can edit their own DRAFT fiches
        const currentUserId = user?.id ?? user?.user?.id;
        return fiche.state === 'DRAFT' && fiche.emitterId === currentUserId;
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
            <p className={styles.ficheRef} data-testid="text-fiche-ref">
              #{fiche.ref}
            </p>
            {fiche.lastModifiedBy && fiche.lastModifiedAt && (
              <p className={styles.modificationBanner} data-testid="modification-banner">
                Modifié par {fiche.lastModifiedBy} le{' '}
                {new Date(fiche.lastModifiedAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })} à{' '}
                {new Date(fiche.lastModifiedAt).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
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

            {canPerformAction('feves_return') && (
              <button 
                onClick={() => setShowFevesReturnModal(true)}
                className={styles.returnButton}
                data-testid="button-feves-return"
              >
                <RotateCcw className={styles.buttonIcon} />
                Refuser et renvoyer à l'émetteur
              </button>
            )}
            
            {/* EVS accept/refuse buttons */}
            {canPerformAction('accept') && (
              <>
                <button 
                  onClick={() => handleEvsAction('accept')}
                  disabled={transitionMutation.isPending}
                  className={styles.acceptButton}
                  data-testid="button-evs-accept"
                >
                  <CheckCircle className={styles.buttonIcon} />
                  Accepter
                </button>
                <button 
                  onClick={() => handleEvsAction('refuse')}
                  disabled={transitionMutation.isPending}
                  className={styles.refuseButton}
                  data-testid="button-evs-refuse"
                >
                  <XCircle className={styles.buttonIcon} />
                  Refuser
                </button>
              </>
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
            {userRole === 'ADMIN' && (
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
          stateHistory={auditLogs.filter(log => log.action === 'state_transition').map(log => ({
            state: log.meta?.newState || log.meta?.oldState,
            timestamp: log.createdAt,
            actor: log.actor,
            metadata: log.meta
          }))}
        />


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
          {(fiche?.familyDetailedData || fiche?.family) && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                Informations Famille
              </h2>
              <div className={styles.familyDetailsGrid}>
                <div className={styles.familySection}>
                  <h3 className={styles.sectionSubtitle}>Informations de base</h3>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Adresse</label>
                      <p className={styles.infoValue} data-testid="text-family-address">
                        {family?.adresse || 'N/A'}
                      </p>
                    </div>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Téléphone portable</label>
                      <p className={styles.infoValue} data-testid="text-family-mobile">
                        {family?.telephonePortable || 'N/A'}
                      </p>
                    </div>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Téléphone fixe</label>
                      <p className={styles.infoValue} data-testid="text-family-phone">
                        {family?.telephoneFixe || 'N/A'}
                      </p>
                    </div>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Email</label>
                      <p className={styles.infoValue} data-testid="text-family-email">
                        {family?.email || 'N/A'}
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
                        {family?.mother || 'N/A'}
                      </p>
                    </div>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Père</label>
                      <p className={styles.infoValue} data-testid="text-family-father">
                        {family?.father || 'N/A'}
                      </p>
                    </div>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Tiers</label>
                      <p className={styles.infoValue} data-testid="text-family-tiers">
                        {family?.tiers || 'N/A'}
                      </p>
                    </div>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Lien avec les enfants</label>
                      <p className={styles.infoValue} data-testid="text-family-link">
                        {family?.lienAvecEnfants || 'N/A'}
                      </p>
                    </div>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Autorité parentale</label>
                      <p className={styles.infoValue} data-testid="text-family-authority">
                        {family?.autoriteParentale && family.autoriteParentale.length > 0
                          ? (Array.isArray(family.autoriteParentale) 
                              ? family.autoriteParentale 
                              : [family.autoriteParentale]
                            ).map(v => ({ mere: "Mère", pere: "Père", tiers: "Tiers" }[v] || v)).join(", ")
                          : 'N/A'}
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
                        {family?.situationFamiliale || 'N/A'}
                      </p>
                    </div>
                    <div className={styles.infoItem}>
                      <label className={styles.infoLabel}>Situation socio-professionnelle</label>
                      <p className={styles.infoValue} data-testid="text-family-sociopro">
                        {family?.situationSocioProfessionnelle || 'N/A'}
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
                        {(child.birthYear || child.birthDate || child.dateNaissance) && (
                          <span className={styles.childAge} data-testid={`text-child-age-${child.id || index}`}>
                            Né(e) en {child.birthYear || (child.birthDate ? new Date(child.birthDate).getFullYear() : null) || (child.dateNaissance ? child.dateNaissance.substring(0, 4) : 'N/A')}
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

          {/* Selected Workshops - EXACT COPY from FicheForm.jsx lines 1818-1876 */}
          <div className={styles.reviewSection}>
            <h3 className={styles.reviewSectionTitle}>
              <Target className={styles.reviewSectionIcon} />
              Ateliers sélectionnés
            </h3>
            <div className={styles.reviewContent}>
              {(() => {
                // Utility function to get combined workshop selection
                const getCombinedWorkshopSelection = () => {
                  // Get selected workshops (checkboxes are priority)
                  const selectedWorkshopIds = Object.keys(fiche.selectedWorkshops || {}).filter(
                    id => fiche.selectedWorkshops[id]
                  );
                  
                  // Fallback for existing fiches: if no checkboxes but propositions exist
                  const propositionWorkshopIds = Object.keys(fiche.workshopPropositions || {}).filter(
                    id => fiche.workshopPropositions[id]?.trim()
                  );
                  
                  // Priority: selected workshops, fallback to propositions for backward compatibility
                  const finalWorkshopIds = selectedWorkshopIds.length > 0 
                    ? selectedWorkshopIds 
                    : propositionWorkshopIds;
                  
                  return {
                    workshopIds: finalWorkshopIds,
                    isLegacyMode: selectedWorkshopIds.length === 0 && propositionWorkshopIds.length > 0
                  };
                };
                
                const { workshopIds, isLegacyMode } = getCombinedWorkshopSelection();
                
                if (workshopIds.length === 0) {
                  return <p>Aucun atelier sélectionné</p>;
                }
                
                return workshopIds.map(workshopId => {
                  const workshop = workshopsList?.find(w => w.id === workshopId);
                  const workshopName = workshop?.name || `Atelier ${workshopId}`;
                  const proposition = fiche.workshopPropositions?.[workshopId]?.trim();
                  
                  return (
                    <div key={workshopId} className={styles.propositionReview}>
                      <h4>✅ {workshopName}</h4>
                      {isLegacyMode ? (
                        <p><strong>Atelier avec proposition :</strong> {proposition}</p>
                      ) : (
                        proposition ? (
                          <p><strong>Atelier sélectionné avec proposition :</strong> {proposition}</p>
                        ) : (
                          <p><strong>Atelier sélectionné</strong></p>
                        )
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Workshop Reports Section - Only show if there are enrollments */}
          {workshopEnrollments.length > 0 && (
            <>
              <div className={styles.reviewSection}>
                <h3 className={styles.reviewSectionTitle}>
                  <Target className={styles.reviewSectionIcon} />
                  Bilans d'ateliers
                </h3>
                <div className={styles.reviewContent}>
                  {workshopEnrollments.map((enrollment) => {
                    const workshop = workshopsList?.find(w => String(w.id) === String(enrollment.workshopId));
                    const workshopName = workshop?.name || `Atelier ${enrollment.workshopId}`;
                    const userRole = user?.role ?? user?.user?.role;
                    const canUpload = userRole === 'EVS_CS' && enrollment.activityDone;
                    const isUploading = uploadingReportFor === enrollment.id;

                    return (
                      <div key={enrollment.id} className={styles.workshopReportCard}>
                        <div className={styles.workshopReportHeader}>
                          <h4 className={styles.workshopReportTitle}>
                            {workshopName} - Session {enrollment.sessionNumber}
                          </h4>
                          {!enrollment.activityDone && (
                            <span className={styles.workshopPendingBadge}>En cours</span>
                          )}
                          {enrollment.activityDone && !enrollment.reportUrl && (
                            <span className={styles.workshopReadyBadge}>Prêt pour bilan</span>
                          )}
                          {enrollment.reportUrl && (
                            <span className={styles.workshopCompleteBadge}>Bilan disponible</span>
                          )}
                        </div>

                        <div className={styles.workshopReportActions}>
                          {/* Download button - visible if report exists */}
                          {enrollment.reportUrl && (
                            <a
                              href={enrollment.reportUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.downloadReportButton}
                              data-testid={`button-download-report-${enrollment.id}`}
                            >
                              Télécharger le bilan
                            </a>
                          )}

                          {/* Upload button - only for EVS_CS after activity is done */}
                          {canUpload && (
                            <label 
                              className={`${styles.uploadReportButton} ${isUploading ? styles.uploadDisabled : ''}`}
                              aria-disabled={isUploading}
                            >
                              <input
                                type="file"
                                accept="application/pdf,.pdf"
                                onChange={(e) => handleReportUpload(enrollment.id, e)}
                                disabled={isUploading}
                                className={styles.fileInput}
                                data-testid={`input-upload-report-${enrollment.id}`}
                              />
                              {isUploading ? 'Upload en cours...' : enrollment.reportUrl ? 'Remplacer le bilan' : 'Uploader le bilan'}
                            </label>
                          )}

                          {!canUpload && !enrollment.reportUrl && (
                            <p className={styles.uploadHint}>
                              Le bilan sera disponible après que l'activité soit marquée comme terminée
                            </p>
                          )}
                        </div>

                        {enrollment.reportUploadedAt && (
                          <p className={styles.uploadInfo}>
                            Uploadé le {formatDate(enrollment.reportUploadedAt)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Close All Workshops Section - Only show if not already CLOSED */}
              {fiche.state !== 'CLOSED' && (
                <div className={styles.closeWorkshopsSection}>
                  <h3 className={styles.closeWorkshopsTitle}>Clôture de la fiche</h3>
                  <div className={styles.closeWorkshopsContent}>
                    <label className={styles.closeWorkshopsLabel}>
                      <input
                        type="checkbox"
                        checked={allWorkshopsCompleted}
                        onChange={(e) => setAllWorkshopsCompleted(e.target.checked)}
                        disabled={!canCloseWorkshops}
                        data-testid="checkbox-all-workshops-completed"
                      />
                      <span>Tous les ateliers de cette fiche sont réalisés</span>
                    </label>
                    <button
                      onClick={handleCloseAllWorkshops}
                      disabled={isClosing || !allWorkshopsCompleted || !canCloseWorkshops || !allReportsUploaded}
                      className={styles.closeWorkshopsButton}
                      data-testid="button-close-all-workshops"
                    >
                      {isClosing ? 'Validation en cours...' : 'Valider'}
                    </button>
                  </div>
                  {!canCloseWorkshops && (
                    <p className={styles.closeWorkshopsHint}>
                      Seuls les EVS/CS et ADMIN peuvent clôturer la fiche
                    </p>
                  )}
                  {canCloseWorkshops && !allReportsUploaded && (
                    <p className={styles.closeWorkshopsHint}>
                      Tous les bilans doivent être uploadés
                    </p>
                  )}
                </div>
              )}

              {/* Show closed badge if fiche is CLOSED */}
              {fiche.state === 'CLOSED' && (
                <div className={styles.closedBadgeSection}>
                  <div className={styles.closedBadge}>
                    ✓ Fiche clôturée - Tous les ateliers sont réalisés
                  </div>
                </div>
              )}
            </>
          )}

          {/* Nombre de participants - adapted from FicheForm review section */}
          {fiche.participantsCount && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                Nombre de participants
              </h2>
              <div className={styles.cardContent}>
                <p data-testid="text-participants-count">
                  <strong>Nombre de participants :</strong> {fiche.participantsCount} personne{fiche.participantsCount > 1 ? 's' : ''}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                  Nombre de personnes de la fiche navette qui participeront aux ateliers sélectionnés
                </p>
              </div>
            </div>
          )}

          {/* CAP Documents Section */}
          {fiche.capDocuments && fiche.capDocuments.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                Documents CAP
              </h2>
              <div className={styles.cardContent}>
                <DocumentsDisplay 
                  documents={fiche.capDocuments}
                  showTitle={false}
                  showDownloadAll={true}
                />
              </div>
            </div>
          )}

          {/* Validation tracking for all fiches */}
          {(fiche.state === 'SUBMITTED_TO_CD' || fiche.state === 'SUBMITTED_TO_FEVES' || fiche.state === 'ASSIGNED_EVS' || fiche.state === 'ACCEPTED_EVS' || fiche.state === 'VALIDATED' || fiche.state === 'ARCHIVED') && (
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
                
                {/* RELATIONS_EVS validation - only show if fiche has been transmitted to EVS/CS */}
                {(fiche.state === 'ASSIGNED_EVS' || fiche.state === 'ACCEPTED_EVS' || fiche.state === 'VALIDATED' || fiche.state === 'ARCHIVED') && auditLogs && (
                  (() => {
                    const relationsEvsValidation = auditLogs.find(log => 
                      log.action === 'state_transition' && 
                      log.meta?.oldState === 'SUBMITTED_TO_FEVES' &&
                      log.meta?.newState === 'ASSIGNED_EVS'
                    );
                    
                    if (relationsEvsValidation && relationsEvsValidation.actor) {
                      return (
                        <div className={styles.validationItem} data-testid="validation-relations-evs">
                          <span className={styles.validationCheck}>✓</span>
                          <span>
                            {relationsEvsValidation.actor.firstName} {relationsEvsValidation.actor.lastName}
                            {relationsEvsValidation.actor.structure && ` de ${relationsEvsValidation.actor.structure}`}
                            {' '}a validé la fiche et l'a transmise à{' '}
                            {relationsEvsValidation.meta?.assignedOrgName || 'l\'organisation EVS/CS sélectionnée'}
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

          {/* Contract Verification for RELATIONS_EVS with ACCEPTED_EVS status */}
          {userRole === 'RELATIONS_EVS' && fiche.state === 'ACCEPTED_EVS' && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                Vérification du contrat
              </h2>
              
              <div className={styles.contractVerification}>
                <p className={styles.verificationIntro}>
                  Avant de valider le contrat, veuillez vérifier les points suivants :
                </p>
                
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={contractSigned}
                      onChange={(e) => setContractSigned(e.target.checked)}
                      data-testid="checkbox-contract-signed"
                    />
                    <span className={styles.checkboxLabel}>
                      Est-ce que le contrat a été signé par l'organisme assigné (EVS/CS) ?
                    </span>
                  </label>
                  
                  <label className={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={advancePaymentSent}
                      onChange={(e) => setAdvancePaymentSent(e.target.checked)}
                      data-testid="checkbox-funds-transferred"
                    />
                    <span className={styles.checkboxLabel}>
                      Est-ce que 70% des fonds ont été transférés à l'organisme assigné ?
                    </span>
                  </label>
                </div>

                {/* Action buttons */}
                <div className={styles.contractActions}>
                  <button
                    className={styles.validateContractButton}
                    onClick={() => handleContractVerification('validate')}
                    disabled={!contractSigned || !advancePaymentSent || transitionMutation.isPending}
                    data-testid="button-validate-contract"
                  >
                    <CheckCircle className={styles.buttonIcon} />
                    Valider
                  </button>
                  
                  <button
                    className={styles.archiveContractButton}
                    onClick={() => handleContractVerification('archive')}
                    disabled={transitionMutation.isPending}
                    data-testid="button-archive-contract"
                  >
                    <Archive className={styles.buttonIcon} />
                    Annuler et archiver la fiche
                  </button>
                </div>

                {(!contractSigned || !advancePaymentSent) && (
                  <div className={styles.validationNote}>
                    <p className={styles.noteText}>
                      Les deux vérifications doivent être cochées pour pouvoir valider le contrat.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity Completion Verification for EVS_CS with CONTRACT_SIGNED status */}
          {userRole === 'EVS_CS' && fiche.state === 'CONTRACT_SIGNED' && 
           (user?.orgId ?? user?.user?.orgId) === fiche.assignedOrgId && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                Validation de l'activité
              </h2>
              
              <div className={styles.activityVerification}>
                <div className={styles.verificationChecks}>
                  <div className={styles.checkItem}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={activityCompleted}
                        onChange={(e) => setActivityCompleted(e.target.checked)}
                        data-testid="checkbox-activity-completed"
                      />
                      <span className={styles.checkboxText}>
                        L'activité a été effectuée
                      </span>
                    </label>
                  </div>
                </div>

                {/* Action button */}
                <div className={styles.activityActions}>
                  <button
                    className={styles.validateActivityButton}
                    onClick={() => handleActivityCompletion()}
                    disabled={!activityCompleted || transitionMutation.isPending}
                    data-testid="button-validate-activity"
                  >
                    <CheckCircle className={styles.buttonIcon} />
                    Valider
                  </button>
                </div>

                {!activityCompleted && (
                  <div className={styles.validationNote}>
                    <p className={styles.noteText}>
                      Vous devez confirmer que l'activité a été effectuée pour pouvoir valider.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Field Check Verification for RELATIONS_EVS with FIELD_CHECK_SCHEDULED status */}
          {userRole === 'RELATIONS_EVS' && fiche.state === 'FIELD_CHECK_SCHEDULED' && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                Vérification terrain
              </h2>
              
              <div className={styles.fieldCheckVerification}>
                <div className={styles.verificationChecks}>
                  <div className={styles.checkItem}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={fieldCheckCompleted}
                        onChange={(e) => setFieldCheckCompleted(e.target.checked)}
                        data-testid="checkbox-field-check-completed"
                      />
                      <span className={styles.checkboxText}>
                        L'agent de terrain atteste que l'activité a été tenue par l'organisme désigné.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Action button */}
                <div className={styles.fieldCheckActions}>
                  <button
                    className={styles.validateFieldCheckButton}
                    onClick={() => handleFieldCheckCompletion()}
                    disabled={!fieldCheckCompleted || transitionMutation.isPending}
                    data-testid="button-validate-field-check"
                  >
                    <CheckCircle className={styles.buttonIcon} />
                    Valider
                  </button>
                </div>

                {!fieldCheckCompleted && (
                  <div className={styles.validationNote}>
                    <p className={styles.noteText}>
                      Vous devez attester que l'activité a été tenue par l'organisme pour pouvoir valider.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Final Verification for RELATIONS_EVS with FIELD_CHECK_DONE or FINAL_REPORT_RECEIVED status */}
          {userRole === 'RELATIONS_EVS' && (fiche.state === 'FIELD_CHECK_DONE' || fiche.state === 'FINAL_REPORT_RECEIVED') && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                Vérification finale
              </h2>
              
              <div className={styles.finalVerification}>
                {/* Upload PDF section - only shown at FIELD_CHECK_DONE */}
                {fiche.state === 'FIELD_CHECK_DONE' && (
                  <div className={styles.uploadSection}>
                    <p className={styles.instructionText}>
                      Les ateliers de la fiche ont été réalisés, veuillez télécharger le bilan final.
                    </p>
                    <label 
                      className={`${styles.uploadFinalReportButton} ${uploadingFinalReport ? styles.uploadDisabled : ''}`}
                      aria-disabled={uploadingFinalReport}
                    >
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={handleFinalReportUpload}
                        disabled={uploadingFinalReport}
                        className={styles.fileInput}
                        data-testid="input-upload-final-report"
                      />
                      {uploadingFinalReport ? 'Upload en cours...' : 'Uploader le bilan final (PDF)'}
                    </label>
                  </div>
                )}

                {/* PDF display and validation - only shown at FINAL_REPORT_RECEIVED */}
                {fiche.state === 'FINAL_REPORT_RECEIVED' && (
                  <>
                    <div className={styles.reportSection}>
                      <p className={styles.confirmationText}>
                        ✓ Les ateliers de la fiche ont été réalisés, le bilan final est téléchargé
                      </p>
                      {finalReportPdfUrl && (
                        <a
                          href={finalReportPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.downloadReportLink}
                          data-testid="link-download-final-report"
                        >
                          📄 Télécharger le rapport final
                        </a>
                      )}
                    </div>

                    {/* Validation button */}
                    <div className={styles.finalVerificationActions}>
                      <button
                        className={styles.validateFinalButton}
                        onClick={() => handleFinalVerificationCompletion()}
                        disabled={transitionMutation.isPending}
                        data-testid="button-validate-and-close-fiche"
                      >
                        <CheckCircle className={styles.buttonIcon} />
                        Valider et clôturer la fiche
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Archive option for RELATIONS_EVS and ADMIN with CLOSED status */}
          {canTransmitToEvs && fiche.state === 'CLOSED' && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                Gestion de la fiche
              </h2>
              
              <div className={styles.cardContent}>
                <p className={styles.statusText}>
                  Cette fiche est maintenant fermée et peut être archivée si nécessaire.
                </p>
                
                <div className={styles.actionButtonsGroup}>
                  <button
                    className={styles.archiveButton}
                    onClick={() => handleRelationsEvsAction('archive')}
                    disabled={transitionMutation.isPending}
                    data-testid="button-relations-archive-closed"
                  >
                    <Archive className={styles.buttonIcon} />
                    Archiver la fiche
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EPCI Selection for RELATIONS_EVS and ADMIN with SUBMITTED_TO_FEVES status */}
          {canTransmitToEvs && fiche.state === 'SUBMITTED_TO_FEVES' && (
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
                          .map((org) => (
                            <option key={org.orgId} value={org.orgId}>
                              {org.name}
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
                          {epciOrganizations.find(org => org.orgId === selectedEvscsId)?.name}
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
                    key={org.orgId}
                    className={`${styles.organizationItem} ${selectedOrgId === org.orgId ? styles.selected : ''}`}
                    onClick={() => setSelectedOrgId(org.orgId)}
                    data-testid={`org-option-${org.orgId}`}
                  >
                    <h4 className={styles.orgName}>{org.name}</h4>
                    <p className={styles.orgInfo}>{org.contact || 'Organisation'}</p>
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

      {/* FEVES Return Modal */}
      {showFevesReturnModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                Refuser et renvoyer à l'émetteur
              </h2>
              <button 
                className={styles.modalClose}
                onClick={() => {
                  setShowFevesReturnModal(false);
                  setFevesReturnComment('');
                }}
                data-testid="button-close-feves-return-modal"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.confirmationMessage}>
                Cette fiche sera renvoyée en brouillon. L'émetteur sera notifié par email.
              </p>
              <p className={styles.confirmationMessage}>
                <strong>Ajoutez un commentaire pour expliquer les corrections attendues :</strong>
              </p>
              
              <textarea
                className={styles.commentTextarea}
                placeholder="Décrivez les corrections à apporter..."
                value={fevesReturnComment}
                onChange={(e) => setFevesReturnComment(e.target.value)}
                rows={5}
                data-testid="textarea-feves-comment"
              />
            </div>

            <div className={styles.modalActions}>
              <button 
                className={styles.cancelButton}
                onClick={() => {
                  setShowFevesReturnModal(false);
                  setFevesReturnComment('');
                }}
                data-testid="button-cancel-feves-return"
              >
                Annuler
              </button>
              <button 
                className={styles.returnButton}
                onClick={handleFevesReturn}
                disabled={!fevesReturnComment.trim() || transitionMutation.isPending}
                data-testid="button-confirm-feves-return"
              >
                <RotateCcw className={styles.buttonIcon} />
                Renvoyer à l'émetteur
              </button>
            </div>
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