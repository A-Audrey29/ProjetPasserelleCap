import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { UserCheck, Users, Baby, Target, Paperclip, Save, Send, Plus, X, Edit, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function FicheForm({ 
  initialData = null, 
  onSubmit, 
  onSaveDraft,
  isEditing = false 
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(0);
  const [isReferentEditable, setIsReferentEditable] = useState(false);
  
  // Form state with référent data
  const [formData, setFormData] = useState({
    referent: {
      lastName: user?.user?.lastName || user?.lastName || '',
      firstName: user?.user?.firstName || user?.firstName || '',
      structure: user?.user?.organization || user?.organization || '',
      role: user?.user?.role || user?.role || '',
      phone: user?.user?.phone || user?.phone || '',
      email: user?.user?.email || user?.email || '',
      requestDate: new Date().toISOString().split('T')[0]
    },
    familyId: '',
    epsiId: '',
    description: '',
    family: {
      code: '',
      address: '',
      phone: '',
      email: '',
      mother: '',
      father: ''
    },
    children: [],
    workshops: [],
    attachments: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries for reference data
  const { data: epsiList = [] } = useQuery({
    queryKey: ['/api/epsi'],
    enabled: true
  });

  const { data: objectives = [] } = useQuery({
    queryKey: ['/api/objectives'],
    enabled: true
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ['/api/workshops'],
    enabled: true
  });

  const { data: families = [] } = useQuery({
    queryKey: ['/api/families'],
    enabled: true
  });

  // Group workshops by objective
  const workshopsByObjective = objectives.reduce((acc, objective) => {
    acc[objective.id] = workshops.filter(w => w.objectiveId === objective.id);
    return acc;
  }, {});

  // Initialize form with existing data
  useEffect(() => {
    if (initialData) {
      setFormData({
        familyId: initialData.familyId || '',
        epsiId: initialData.epsiId || '',
        description: initialData.description || '',
        family: initialData.family || formData.family,
        children: initialData.children || [],
        workshops: initialData.selections?.map(s => ({
          workshopId: s.workshopId,
          qty: s.qty
        })) || [],
        attachments: initialData.attachments || []
      });
    }
  }, [initialData]);

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiRequest('POST', '/api/uploads', formData);
      return response.json();
    }
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFamilyChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      family: {
        ...prev.family,
        [field]: value
      }
    }));
  };

  const handleAddChild = () => {
    setFormData(prev => ({
      ...prev,
      children: [
        ...prev.children,
        { firstName: '', birthDate: '', level: '' }
      ]
    }));
  };

  const handleChildChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.map((child, i) => 
        i === index ? { ...child, [field]: value } : child
      )
    }));
  };

  const handleRemoveChild = (index) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index)
    }));
  };

  const handleWorkshopToggle = (workshopId, isSelected) => {
    setFormData(prev => ({
      ...prev,
      workshops: isSelected 
        ? [...prev.workshops, { workshopId, qty: 1 }]
        : prev.workshops.filter(w => w.workshopId !== workshopId)
    }));
  };

  const handleWorkshopQtyChange = (workshopId, qty) => {
    setFormData(prev => ({
      ...prev,
      workshops: prev.workshops.map(w => 
        w.workshopId === workshopId ? { ...w, qty: parseInt(qty) || 1 } : w
      )
    }));
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    
    for (const file of files) {
      try {
        const uploadResult = await uploadMutation.mutateAsync(file);
        setFormData(prev => ({
          ...prev,
          attachments: [
            ...prev.attachments,
            {
              name: uploadResult.name,
              url: uploadResult.url,
              mime: uploadResult.mime,
              size: uploadResult.size
            }
          ]
        }));
      } catch (error) {
        toast({
          title: "Erreur de téléchargement",
          description: `Impossible de télécharger ${file.name}`,
          variant: "destructive"
        });
      }
    }
  };

  const handleRemoveAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    return formData.workshops.reduce((total, selection) => {
      const workshop = workshops.find(w => w.id === selection.workshopId);
      return total + (workshop?.priceCents || 0) * selection.qty;
    }, 0);
  };

  // Format currency helper function
  const formatCurrency = (amountInCents) => {
    if (!amountInCents) return '0,00 €';
    return `${(amountInCents / 100).toFixed(2).replace('.', ',')} €`;
  };

  const handleSubmit = async (isDraft = false) => {
    setIsSubmitting(true);
    
    try {
      const submitData = {
        ...formData,
        isDraft
      };
      
      if (isDraft && onSaveDraft) {
        await onSaveDraft(submitData);
      } else if (onSubmit) {
        await onSubmit(submitData);
      }
      
      toast({
        title: isDraft ? "Brouillon sauvegardé" : "Fiche envoyée",
        description: isDraft ? "La fiche a été sauvegardée en brouillon" : "La fiche a été envoyée à FEVES",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Multi-step form steps
  const steps = [
    {
      id: 0,
      title: "Référent à l'origine de la demande",
      icon: UserCheck,
      allowedRoles: ['ADMIN', 'EMETTEUR', 'RELATIONS_EVS']
    },
    {
      id: 1,
      title: "Informations famille",
      icon: Users,
      allowedRoles: ['ADMIN', 'EMETTEUR', 'RELATIONS_EVS']
    },
    {
      id: 2,
      title: "Enfants concernés",
      icon: Baby,
      allowedRoles: ['ADMIN', 'EMETTEUR', 'RELATIONS_EVS']
    },
    {
      id: 3,
      title: "Ateliers et objectifs",
      icon: Target,
      allowedRoles: ['ADMIN', 'EMETTEUR', 'RELATIONS_EVS']
    },
    {
      id: 4,
      title: "Pièces justificatives",
      icon: Paperclip,
      allowedRoles: ['ADMIN', 'EMETTEUR', 'RELATIONS_EVS']
    }
  ];

  const currentStepData = steps[currentStep];
  const userRole = user?.user?.role || user?.role;

  // Handle référent data validation
  const handleValidateReferent = () => {
    setCurrentStep(1);
    setIsReferentEditable(false);
  };

  const handleModifyReferent = () => {
    setIsReferentEditable(true);
  };

  const updateReferentField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      referent: {
        ...prev.referent,
        [field]: value
      }
    }));
  };

  const renderReferentStep = () => (
    <div className="card">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
        <UserCheck className="w-5 h-5 mr-2" />
        Référent à l'origine de la demande
      </h2>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1" htmlFor="referent-lastName">
              Nom *
            </label>
            <input
              id="referent-lastName"
              type="text"
              className="input-field"
              value={formData.referent.lastName}
              onChange={(e) => updateReferentField('lastName', e.target.value)}
              disabled={!isReferentEditable}
              data-testid="input-referent-lastname"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1" htmlFor="referent-firstName">
              Prénom *
            </label>
            <input
              id="referent-firstName"
              type="text"
              className="input-field"
              value={formData.referent.firstName}
              onChange={(e) => updateReferentField('firstName', e.target.value)}
              disabled={!isReferentEditable}
              data-testid="input-referent-firstname"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1" htmlFor="referent-structure">
            Structure d'appartenance *
          </label>
          <input
            id="referent-structure"
            type="text"
            className="input-field"
            value={formData.referent.structure}
            onChange={(e) => updateReferentField('structure', e.target.value)}
            disabled={!isReferentEditable}
            data-testid="input-referent-structure"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1" htmlFor="referent-role">
            Fonction *
          </label>
          <input
            id="referent-role"
            type="text"
            className="input-field"
            value={formData.referent.role}
            onChange={(e) => updateReferentField('role', e.target.value)}
            disabled={!isReferentEditable}
            data-testid="input-referent-role"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1" htmlFor="referent-phone">
              Téléphone *
            </label>
            <input
              id="referent-phone"
              type="tel"
              className="input-field"
              value={formData.referent.phone}
              onChange={(e) => updateReferentField('phone', e.target.value)}
              disabled={!isReferentEditable}
              data-testid="input-referent-phone"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1" htmlFor="referent-email">
              Email *
            </label>
            <input
              id="referent-email"
              type="email"
              className="input-field"
              value={formData.referent.email}
              onChange={(e) => updateReferentField('email', e.target.value)}
              disabled={!isReferentEditable}
              data-testid="input-referent-email"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1" htmlFor="referent-date">
            Date de la demande *
          </label>
          <input
            id="referent-date"
            type="date"
            className="input-field"
            value={formData.referent.requestDate}
            onChange={(e) => updateReferentField('requestDate', e.target.value)}
            disabled={!isReferentEditable}
            data-testid="input-referent-date"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          {!isReferentEditable ? (
            <>
              <button
                type="button"
                onClick={handleModifyReferent}
                className="btn btn-secondary flex items-center gap-2"
                data-testid="button-modify-referent"
              >
                <Edit className="w-4 h-4" />
                Modifier
              </button>
              <button
                type="button"
                onClick={handleValidateReferent}
                className="btn btn-primary flex items-center gap-2"
                data-testid="button-validate-referent"
              >
                <Check className="w-4 h-4" />
                Valider
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsReferentEditable(false)}
              className="btn btn-primary flex items-center gap-2"
              data-testid="button-save-referent"
            >
              <Check className="w-4 h-4" />
              Enregistrer les modifications
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderReferentStep();
      case 1:
        return <div className="card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Informations famille</h2>
          <p className="text-muted-foreground">Cette section sera implémentée dans la prochaine étape.</p>
        </div>;
      case 2:
        return <div className="card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Enfants concernés</h2>
          <p className="text-muted-foreground">Cette section sera implémentée dans la prochaine étape.</p>
        </div>;
      case 3:
        return <div className="card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Ateliers et objectifs</h2>
          <p className="text-muted-foreground">Cette section sera implémentée dans la prochaine étape.</p>
        </div>;
      case 4:
        return <div className="card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Pièces justificatives</h2>
          <p className="text-muted-foreground">Cette section sera implémentée dans la prochaine étape.</p>
        </div>;
      default:
        return renderReferentStep();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Step Progress Indicator */}
      <div className="card">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === index;
            const isCompleted = currentStep > index;
            
            return (
              <div
                key={step.id}
                className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted 
                        ? 'bg-success text-success-foreground' 
                        : isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <StepIcon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="ml-2">
                    <div className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.title}
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-px mx-4 ${isCompleted ? 'bg-success' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Step Content */}
      {renderStepContent()}
    </div>
  );
}
