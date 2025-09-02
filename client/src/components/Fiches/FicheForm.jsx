import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { UserCheck, Users, Baby, Target, Paperclip, Save, Send, Plus, X, Edit, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import styles from './FicheForm.module.css';

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
      father: '',
      tiers: '',
      lienAvecEnfants: '',
      autoriteParentale: '',
      situationFamiliale: '',
      situationSocioProfessionnelle: ''
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

  const updateFamilyField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      family: {
        ...prev.family,
        [field]: value
      }
    }));
  };

  const validateFamilyStep = () => {
    const { mother, father, tiers, lienAvecEnfants, autoriteParentale, situationFamiliale, situationSocioProfessionnelle } = formData.family;
    
    // Au moins un des trois (mère, père, tiers) doit être rempli
    const hasParentInfo = mother.trim() || father.trim() || tiers.trim();
    if (!hasParentInfo) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez renseigner au moins l'un des champs : Mère, Père ou Tiers",
        variant: "destructive"
      });
      return false;
    }

    // Si tiers est rempli, le lien avec les enfants est obligatoire
    if (tiers.trim() && !lienAvecEnfants.trim()) {
      toast({
        title: "Erreur de validation", 
        description: "Le champ 'Lien avec l'enfant (les enfants)' est obligatoire lorsque 'Tiers' est renseigné",
        variant: "destructive"
      });
      return false;
    }

    // Champs obligatoires
    if (!autoriteParentale) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez sélectionner l'autorité parentale",
        variant: "destructive"
      });
      return false;
    }

    if (!situationFamiliale.trim()) {
      toast({
        title: "Erreur de validation",
        description: "Le champ 'Situation familiale' est obligatoire",
        variant: "destructive"
      });
      return false;
    }

    if (!situationSocioProfessionnelle.trim()) {
      toast({
        title: "Erreur de validation",
        description: "Le champ 'Situation socio-professionnelle' est obligatoire",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const renderFamilyStep = () => (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>
        <Users className={styles.cardTitleIcon} />
        Informations famille
      </h2>
      
      <div className={styles.formSection}>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label className={styles.fieldLabel} htmlFor="family-mother">
              Mère
            </label>
            <input
              id="family-mother"
              type="text"
              className={styles.fieldInput}
              value={formData.family.mother}
              onChange={(e) => updateFamilyField('mother', e.target.value)}
              placeholder="Nom et prénom de la mère"
              data-testid="input-family-mother"
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.fieldLabel} htmlFor="family-father">
              Père
            </label>
            <input
              id="family-father"
              type="text"
              className={styles.fieldInput}
              value={formData.family.father}
              onChange={(e) => updateFamilyField('father', e.target.value)}
              placeholder="Nom et prénom du père"
              data-testid="input-family-father"
            />
          </div>
        </div>

        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="family-tiers">
            Tiers
          </label>
          <input
            id="family-tiers"
            type="text"
            className={styles.fieldInput}
            value={formData.family.tiers}
            onChange={(e) => updateFamilyField('tiers', e.target.value)}
            placeholder="Nom et prénom du tiers"
            data-testid="input-family-tiers"
          />
        </div>

        {formData.family.tiers && (
          <div className={styles.formField}>
            <label className={styles.fieldLabel} htmlFor="family-lien">
              Lien avec l'enfant (les enfants) *
            </label>
            <input
              id="family-lien"
              type="text"
              className={styles.fieldInput}
              value={formData.family.lienAvecEnfants}
              onChange={(e) => updateFamilyField('lienAvecEnfants', e.target.value)}
              placeholder="Ex: Grand-mère, Oncle, Tuteur légal..."
              data-testid="input-family-lien"
            />
          </div>
        )}

        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="family-autorite">
            Autorité parentale *
          </label>
          <select
            id="family-autorite"
            className={styles.fieldSelect}
            value={formData.family.autoriteParentale}
            onChange={(e) => updateFamilyField('autoriteParentale', e.target.value)}
            data-testid="select-family-autorite"
          >
            <option value="">Sélectionner...</option>
            <option value="mere">Mère</option>
            <option value="pere">Père</option>
            <option value="tiers">Tiers</option>
          </select>
        </div>

        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="family-situation">
            Situation familiale *
          </label>
          <input
            id="family-situation"
            type="text"
            className={styles.fieldInput}
            value={formData.family.situationFamiliale}
            onChange={(e) => updateFamilyField('situationFamiliale', e.target.value)}
            placeholder="Ex: Famille monoparentale, Couple, Séparés..."
            data-testid="input-family-situation"
          />
        </div>

        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="family-socio">
            Situation socio-professionnelle *
          </label>
          <input
            id="family-socio"
            type="text"
            className={styles.fieldInput}
            value={formData.family.situationSocioProfessionnelle}
            onChange={(e) => updateFamilyField('situationSocioProfessionnelle', e.target.value)}
            placeholder="Ex: Demandeur d'emploi, Salarié, RSA..."
            data-testid="input-family-socio"
          />
        </div>

        <div className={styles.buttonContainer}>
          <button
            type="button"
            onClick={() => setCurrentStep(0)}
            className={`${styles.button} ${styles.buttonSecondary}`}
            data-testid="button-previous-step"
          >
            Précédent
          </button>
          <button
            type="button"
            onClick={() => {
              if (validateFamilyStep()) {
                setCurrentStep(2);
              }
            }}
            className={`${styles.button} ${styles.buttonPrimary}`}
            data-testid="button-next-step"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );

  const renderReferentStep = () => (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>
        <UserCheck className={styles.cardTitleIcon} />
        Référent à l'origine de la demande
      </h2>
      
      <div className={styles.formSection}>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label className={styles.fieldLabel} htmlFor="referent-lastName">
              Nom *
            </label>
            <input
              id="referent-lastName"
              type="text"
              className={styles.fieldInput}
              value={formData.referent.lastName}
              onChange={(e) => updateReferentField('lastName', e.target.value)}
              disabled={!isReferentEditable}
              data-testid="input-referent-lastname"
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.fieldLabel} htmlFor="referent-firstName">
              Prénom *
            </label>
            <input
              id="referent-firstName"
              type="text"
              className={styles.fieldInput}
              value={formData.referent.firstName}
              onChange={(e) => updateReferentField('firstName', e.target.value)}
              disabled={!isReferentEditable}
              data-testid="input-referent-firstname"
            />
          </div>
        </div>

        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="referent-structure">
            Structure d'appartenance *
          </label>
          <input
            id="referent-structure"
            type="text"
            className={styles.fieldInput}
            value={formData.referent.structure}
            onChange={(e) => updateReferentField('structure', e.target.value)}
            disabled={!isReferentEditable}
            data-testid="input-referent-structure"
          />
        </div>

        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="referent-role">
            Fonction *
          </label>
          <input
            id="referent-role"
            type="text"
            className={styles.fieldInput}
            value={formData.referent.role}
            onChange={(e) => updateReferentField('role', e.target.value)}
            disabled={!isReferentEditable}
            data-testid="input-referent-role"
          />
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label className={styles.fieldLabel} htmlFor="referent-phone">
              Téléphone *
            </label>
            <input
              id="referent-phone"
              type="tel"
              className={styles.fieldInput}
              value={formData.referent.phone}
              onChange={(e) => updateReferentField('phone', e.target.value)}
              disabled={!isReferentEditable}
              data-testid="input-referent-phone"
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.fieldLabel} htmlFor="referent-email">
              Email *
            </label>
            <input
              id="referent-email"
              type="email"
              className={styles.fieldInput}
              value={formData.referent.email}
              onChange={(e) => updateReferentField('email', e.target.value)}
              disabled={!isReferentEditable}
              data-testid="input-referent-email"
            />
          </div>
        </div>

        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="referent-date">
            Date de la demande *
          </label>
          <input
            id="referent-date"
            type="date"
            className={styles.fieldInput}
            value={formData.referent.requestDate}
            onChange={(e) => updateReferentField('requestDate', e.target.value)}
            disabled={!isReferentEditable}
            data-testid="input-referent-date"
          />
        </div>

        <div className={styles.buttonContainer}>
          {!isReferentEditable ? (
            <>
              <button
                type="button"
                onClick={handleModifyReferent}
                className={`${styles.button} ${styles.buttonSecondary}`}
                data-testid="button-modify-referent"
              >
                <Edit className={styles.buttonIcon} />
                Modifier
              </button>
              <button
                type="button"
                onClick={handleValidateReferent}
                className={`${styles.button} ${styles.buttonPrimary}`}
                data-testid="button-validate-referent"
              >
                <Check className={styles.buttonIcon} />
                Valider
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsReferentEditable(false)}
              className={`${styles.button} ${styles.buttonPrimary}`}
              data-testid="button-save-referent"
            >
              <Check className={styles.buttonIcon} />
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
        return renderFamilyStep();
      case 2:
        return <div className={styles.card}>
          <h2 className={styles.cardTitle}>Enfants concernés</h2>
          <p className={styles.placeholderSection}>Cette section sera implémentée dans la prochaine étape.</p>
        </div>;
      case 3:
        return <div className={styles.card}>
          <h2 className={styles.cardTitle}>Ateliers et objectifs</h2>
          <p className={styles.placeholderSection}>Cette section sera implémentée dans la prochaine étape.</p>
        </div>;
      case 4:
        return <div className={styles.card}>
          <h2 className={styles.cardTitle}>Pièces justificatives</h2>
          <p className={styles.placeholderSection}>Cette section sera implémentée dans la prochaine étape.</p>
        </div>;
      default:
        return renderReferentStep();
    }
  };

  return (
    <div className={styles.container}>
      {/* Step Progress Indicator */}
      <div className={styles.progressCard}>
        <div className={styles.progressIndicator}>
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === index;
            const isCompleted = currentStep > index;
            
            return (
              <div
                key={step.id}
                className={index < steps.length - 1 ? styles.stepItem : styles.stepItemLast}
              >
                <div className={styles.stepContent}>
                  <div
                    className={`${styles.stepIcon} ${
                      isCompleted 
                        ? styles.stepIconCompleted
                        : isActive 
                        ? styles.stepIconActive
                        : styles.stepIconInactive
                    }`}
                  >
                    {isCompleted ? (
                      <Check style={{width: '1rem', height: '1rem'}} />
                    ) : (
                      <StepIcon style={{width: '1rem', height: '1rem'}} />
                    )}
                  </div>
                  <div className={styles.stepText}>
                    <div className={isActive ? styles.stepTextActive : styles.stepTextInactive}>
                      {step.title}
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`${styles.stepConnector} ${isCompleted ? styles.stepConnectorCompleted : styles.stepConnectorDefault}`} />
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
