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
  FileText
} from 'lucide-react';
import StatusBadge from '@/components/Common/StatusBadge';
import StateTimeline from './StateTimeline';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function FicheDetail({ ficheId }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);

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

  // Comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content) => {
      const response = await apiRequest('POST', `/api/fiches/${ficheId}/comments`, {
        content
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/fiches', ficheId]);
      setNewComment('');
      toast({
        title: "Commentaire ajouté",
        description: "Votre commentaire a été ajouté avec succès"
      });
    }
  });

  // Assignment mutation
  const assignMutation = useMutation({
    mutationFn: async (assignedOrgId) => {
      const response = await apiRequest('POST', `/api/fiches/${ficheId}/assign`, {
        assignedOrgId
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/fiches', ficheId]);
      setShowAssignModal(false);
      toast({
        title: "Affectation réussie",
        description: "La fiche a été affectée avec succès"
      });
    }
  });

  // State transition mutation
  const transitionMutation = useMutation({
    mutationFn: async ({ newState, metadata = {} }) => {
      const response = await apiRequest('POST', `/api/fiches/${ficheId}/transition`, {
        newState,
        metadata
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/fiches', ficheId]);
      toast({
        title: "État mis à jour",
        description: "L'état de la fiche a été mis à jour"
      });
    }
  });

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      await addCommentMutation.mutateAsync(newComment);
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le commentaire",
        variant: "destructive"
      });
    }
  };

  const handleAssign = async (orgId) => {
    try {
      await assignMutation.mutateAsync(orgId);
    } catch (error) {
      toast({
        title: "Erreur d'affectation",
        description: error.message || "Impossible d'affecter la fiche",
        variant: "destructive"
      });
    }
  };

  const handleStateTransition = async (newState) => {
    try {
      await transitionMutation.mutateAsync({ newState });
    } catch (error) {
      toast({
        title: "Erreur de transition",
        description: error.message || "Impossible de changer l'état",
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
      default:
        return false;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (error || !fiche) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Erreur lors du chargement de la fiche</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Informations générales */}
        <div className="card">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Informations générales
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Référent</label>
              <p className="text-foreground" data-testid="text-emitter">
                {fiche.emitter?.firstName} {fiche.emitter?.lastName}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">EPSI</label>
              <p className="text-foreground" data-testid="text-epsi">
                {fiche.epsi?.name || 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Créé le</label>
              <p className="text-foreground" data-testid="text-created-date">
                {formatDate(fiche.createdAt)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Dernière modification</label>
              <p className="text-foreground" data-testid="text-updated-date">
                {formatDate(fiche.updatedAt)}
              </p>
            </div>
          </div>
          {fiche.description && (
            <div className="mt-4">
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="text-foreground mt-1" data-testid="text-description">
                {fiche.description}
              </p>
            </div>
          )}
        </div>

        {/* Ateliers sélectionnés */}
        <div className="card">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Ateliers sélectionnés
          </h2>
          <div className="space-y-3">
            {fiche.selections?.map((selection) => (
              <div 
                key={selection.id} 
                className="flex items-center justify-between p-3 bg-muted rounded-md"
              >
                <div>
                  <div className="font-medium text-foreground">
                    {selection.workshop?.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selection.workshop?.objective?.code} - {selection.qty} participant(s)
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-foreground">
                    {formatCurrency((selection.workshop?.priceCents || 0) * selection.qty)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
            <span className="font-medium text-foreground">Total</span>
            <span className="text-lg font-bold text-primary" data-testid="text-total-amount">
              {formatCurrency(
                fiche.selections?.reduce((sum, s) => 
                  sum + (s.workshop?.priceCents || 0) * s.qty, 0
                ) || 0
              )}
            </span>
          </div>
        </div>

        {/* Pièces jointes */}
        {fiche.attachments?.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Pièces jointes
            </h2>
            <div className="space-y-2">
              {fiche.attachments.map((attachment) => (
                <div 
                  key={attachment.id} 
                  className="flex items-center justify-between p-3 border border-border rounded-md"
                >
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-3 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">
                        {attachment.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Ajouté le {formatDate(attachment.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a 
                      href={attachment.url}
                      download
                      className="btn btn-secondary"
                      data-testid={`button-download-${attachment.id}`}
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <a 
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      data-testid={`button-view-${attachment.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timeline & Actions */}
      <div className="space-y-6">
        {/* Actions rapides */}
        <div className="card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Actions</h2>
          <div className="space-y-2">
            {canPerformAction('assign') && (
              <button 
                className="btn btn-primary w-full"
                onClick={() => setShowAssignModal(true)}
                data-testid="button-assign"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Affecter EVS/CS
              </button>
            )}
            
            {canPerformAction('accept') && (
              <button 
                className="btn btn-success w-full"
                onClick={() => handleStateTransition('EVS_ACCEPTED')}
                data-testid="button-accept"
              >
                Accepter la fiche
              </button>
            )}
            
            {canPerformAction('reject') && (
              <button 
                className="btn btn-destructive w-full"
                onClick={() => handleStateTransition('EVS_REJECTED')}
                data-testid="button-reject"
              >
                Refuser la fiche
              </button>
            )}
            
            {canPerformAction('sign_contract') && (
              <button 
                className="btn btn-primary w-full"
                onClick={() => handleStateTransition('CONTRACT_SIGNED')}
                data-testid="button-sign-contract"
              >
                Signer le contrat
              </button>
            )}
            
            <button 
              className="btn btn-secondary w-full"
              data-testid="button-view-audit"
            >
              <History className="w-4 h-4 mr-2" />
              Journal d'audit
            </button>
          </div>
        </div>

        {/* Timeline des états */}
        <StateTimeline 
          currentState={fiche.state}
          stateHistory={fiche.stateHistory || []}
        />

        {/* Commentaires */}
        <div className="card">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Commentaires internes
          </h2>
          
          {fiche.comments?.length > 0 && (
            <div className="space-y-3 mb-4">
              {fiche.comments.map((comment) => (
                <div key={comment.id} className="p-3 bg-muted rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground text-sm">
                      {comment.author?.firstName} {comment.author?.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
          
          <div className="space-y-2">
            <textarea 
              className="input-field h-20"
              placeholder="Ajouter un commentaire interne..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              data-testid="textarea-new-comment"
            />
            <button 
              className="btn btn-primary"
              onClick={handleAddComment}
              disabled={!newComment.trim() || addCommentMutation.isPending}
              data-testid="button-add-comment"
            >
              <Send className="w-4 h-4 mr-2" />
              Commenter
            </button>
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">
                Affecter à un EVS/CS
              </h2>
              <button 
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setShowAssignModal(false)}
                data-testid="button-close-modal"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <h3 className="font-medium text-foreground">Organisations disponibles</h3>
              {organizations
                .filter(org => org.epsiId === fiche.epsiId)
                .map((org) => (
                <button
                  key={org.id}
                  className="w-full text-left p-4 border border-border rounded-md hover:bg-muted/50"
                  onClick={() => handleAssign(org.id)}
                  data-testid={`button-assign-org-${org.id}`}
                >
                  <div className="font-medium text-foreground">{org.name}</div>
                  <div className="text-sm text-muted-foreground">{org.type}</div>
                  <div className="text-sm text-muted-foreground">{org.address}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowAssignModal(false)}
                data-testid="button-cancel-assign"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
