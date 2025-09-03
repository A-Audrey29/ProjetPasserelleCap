import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { UserCheck, Users, Baby, Target, Paperclip, Save, Send, Plus, X, Edit, Check, Trash2, PenTool, ChevronDown, ChevronRight, Archive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useFiches } from '@/hooks/useFiches';
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
  const { transitionFiche } = useFiches();
  
  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(0);
  const [isReferentEditable, setIsReferentEditable] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  
  // Form state with référent data - Initialize with empty strings to prevent controlled/uncontrolled issues
  const [formData, setFormData] = useState({
    referent: {
      lastName: '',
      firstName: '',
      structure: '',
      phone: '',
      email: '',
      requestDate: new Date().toISOString().split('T')[0]
    },
    familyId: '',
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
      situationSocioProfessionnelle: '',
      adresse: '',
      telephonePortable: '',
      telephoneFixe: ''
    },
    children: [
      {
        name: '',
        dateNaissance: '',
        niveauScolaire: ''
      }
    ],
    workshops: [],
    attachments: [],
    descriptionSituation: '',
    workshopPropositions: {}
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries for reference data

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
      console.log('Initializing form with data:', initialData);
      
      // Extract family data from familyDetailedData JSON field or family object
      const familyData = initialData.familyDetailedData || initialData.family || {};
      
      // Extract children data from childrenData JSON field or children array
      const childrenData = initialData.childrenData || initialData.children || [];
      
      setFormData(prev => ({
        ...prev,
        familyId: initialData.familyId || '',
        description: initialData.description || '',
        family: {
          ...prev.family,
          code: familyData.code || '',
          address: familyData.address || '',
          phone: familyData.phone || '',
          email: familyData.email || '',
          mother: familyData.mother || '',
          father: familyData.father || '',
          tiers: familyData.tiers || '',
          lienAvecEnfants: familyData.lienAvecEnfants || '',
          autoriteParentale: familyData.autoriteParentale || '',
          situationFamiliale: familyData.situationFamiliale || '',
          situationSocioProfessionnelle: familyData.situationSocioProfessionnelle || '',
          adresse: familyData.adresse || '',
          telephonePortable: familyData.telephonePortable || '',
          telephoneFixe: familyData.telephoneFixe || ''
        },
        children: childrenData.map(child => ({
          name: child.name || child.firstName || '',
          dateNaissance: child.dateNaissance || (child.birthDate ? new Date(child.birthDate).toISOString().split('T')[0] : ''),
          niveauScolaire: child.niveauScolaire || child.level || ''
        })),
        workshops: initialData.selections?.map(s => ({
          workshopId: s.workshopId,
          qty: s.qty
        })) || [],
        attachments: initialData.attachments || [],
        referent: initialData.referentData ? {
          lastName: initialData.referentData.lastName || '',
          firstName: initialData.referentData.firstName || '',
          structure: initialData.referentData.structure || '',
          phone: initialData.referentData.phone || '',
          email: initialData.referentData.email || '',
          requestDate: initialData.referentData.requestDate || prev.referent.requestDate
        } : (initialData.emitter ? {
          lastName: initialData.emitter.lastName || '',
          firstName: initialData.emitter.firstName || '',
          structure: initialData.emitter.structure || '',
          phone: initialData.emitter.phone || '',
          email: initialData.emitter.email || '',
          requestDate: initialData.createdAt ? new Date(initialData.createdAt).toISOString().split('T')[0] : prev.referent.requestDate
        } : prev.referent),
        descriptionSituation: initialData.description || initialData.descriptionSituation || '',
        workshopPropositions: initialData.workshopPropositions || {},
        familyConsent: initialData.familyConsent || false
      }));
    }
  }, [initialData]);

  // Auto-populate referent fields when user data becomes available
  useEffect(() => {
    if (user && !initialData) {
      const currentUser = user?.user || user;
      setFormData(prev => ({
        ...prev,
        referent: {
          ...prev.referent,
          lastName: currentUser?.lastName || '',
          firstName: currentUser?.firstName || '',
          structure: currentUser?.structure || '',
          phone: currentUser?.phone || '',
          email: currentUser?.email || ''
        }
      }));
    }
  }, [user, initialData]);

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
      title: "Identification des besoins",
      icon: PenTool,
      allowedRoles: ['ADMIN', 'EMETTEUR', 'RELATIONS_EVS']
    },
    {
      id: 4,
      title: "Ateliers et objectifs",
      icon: Target,
      allowedRoles: ['ADMIN', 'EMETTEUR', 'RELATIONS_EVS']
    },
    {
      id: 5,
      title: "Revoir et transmettre au Conseil Départemental",
      icon: Send,
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

  const validateReferentStep = () => {
    if (!formData.referent.lastName || !formData.referent.firstName) {
      return false;
    }
    if (!formData.referent.structure) {
      return false;
    }
    if (!formData.referent.phone || !formData.referent.email) {
      return false;
    }
    return true;
  };

  const validateFamilyStep = () => {
    const { mother, father, tiers, lienAvecEnfants, autoriteParentale, situationFamiliale, situationSocioProfessionnelle, telephonePortable } = formData.family;
    
    // Au moins un des trois (mère, père, tiers) doit être rempli
    const hasParentInfo = (mother?.trim?.() || '') || (father?.trim?.() || '') || (tiers?.trim?.() || '');
    if (!hasParentInfo) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez renseigner au moins l'un des champs : Mère, Père ou Tiers",
        variant: "destructive"
      });
      return false;
    }

    // Si tiers est rempli, le lien avec les enfants est obligatoire
    if ((tiers?.trim?.() || '') && !(lienAvecEnfants?.trim?.() || '')) {
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

    if (!(situationFamiliale?.trim?.() || '')) {
      toast({
        title: "Erreur de validation",
        description: "Le champ 'Situation familiale' est obligatoire",
        variant: "destructive"
      });
      return false;
    }

    if (!(situationSocioProfessionnelle?.trim?.() || '')) {
      toast({
        title: "Erreur de validation",
        description: "Le champ 'Situation socio-professionnelle' est obligatoire",
        variant: "destructive"
      });
      return false;
    }

    if (!(telephonePortable?.trim?.() || '')) {
      toast({
        title: "Erreur de validation",
        description: "Le champ 'Téléphone portable' est obligatoire",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const updateChildField = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.map((child, i) => 
        i === index ? { ...child, [field]: value } : child
      )
    }));
  };

  const addChild = () => {
    setFormData(prev => ({
      ...prev,
      children: [
        ...prev.children,
        {
          name: '',
          dateNaissance: '',
          niveauScolaire: ''
        }
      ]
    }));
  };

  const removeChild = (index) => {
    if (formData.children.length > 1) {
      setFormData(prev => ({
        ...prev,
        children: prev.children.filter((_, i) => i !== index)
      }));
    }
  };

  const validateChildrenStep = () => {
    for (let i = 0; i < formData.children.length; i++) {
      const child = formData.children[i];
      
      if (!child.name.trim()) {
        toast({
          title: "Erreur de validation",
          description: `Le nom de l'enfant ${i + 1} est obligatoire`,
          variant: "destructive"
        });
        return false;
      }

      if (!child.dateNaissance) {
        toast({
          title: "Erreur de validation",
          description: `La date de naissance de l'enfant ${i + 1} est obligatoire`,
          variant: "destructive"
        });
        return false;
      }

      if (!child.niveauScolaire.trim()) {
        toast({
          title: "Erreur de validation",
          description: `Le niveau scolaire de l'enfant ${i + 1} est obligatoire`,
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  const validateBesoinStep = () => {
    if (!formData.descriptionSituation.trim()) {
      toast({
        title: "Erreur de validation",
        description: "La description de la situation est obligatoire",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const renderBesoinStep = () => (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>
        <PenTool className={styles.cardTitleIcon} />
        Identification des besoins de la famille
      </h2>
      
      <div className={styles.formSection}>
        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="description-situation">
            Description de la situation *
          </label>
          <textarea
            id="description-situation"
            className={styles.fieldTextarea}
            value={formData.descriptionSituation}
            onChange={(e) => setFormData(prev => ({ ...prev, descriptionSituation: e.target.value }))}
            placeholder="Décrivez la situation familiale, les difficultés rencontrées, les besoins identifiés..."
            rows={8}
            data-testid="textarea-description-situation"
          />
        </div>

        <div className={styles.buttonContainer}>
          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`${styles.button} ${styles.buttonSecondary}`}
            data-testid="button-previous-step"
          >
            Précédent
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`${styles.button} ${styles.buttonDraft}`}
            data-testid="button-save-draft"
          >
            {(initialData?.state === 'DRAFT' || !initialData?.id) ? 'Enregistrer brouillon' : 'Enregistrer fiche'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (validateBesoinStep()) {
                setCurrentStep(4);
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

  const renderChildrenStep = () => (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>
        <Baby className={styles.cardTitleIcon} />
        Enfants concernés
      </h2>
      
      <div className={styles.formSection}>
        {formData.children.map((child, index) => (
          <div key={index} className={styles.childSection}>
            <div className={styles.childHeader}>
              <h3 className={styles.childTitle}>
                Enfant {index + 1}
              </h3>
              {formData.children.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeChild(index)}
                  className={styles.removeChildButton}
                  data-testid={`button-remove-child-${index}`}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor={`child-name-${index}`}>
                Nom et prénom *
              </label>
              <input
                id={`child-name-${index}`}
                type="text"
                className={styles.fieldInput}
                value={child.name}
                onChange={(e) => updateChildField(index, 'name', e.target.value)}
                placeholder="Nom et prénom de l'enfant"
                data-testid={`input-child-name-${index}`}
              />
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.fieldLabel} htmlFor={`child-birth-${index}`}>
                  Date de naissance *
                </label>
                <input
                  id={`child-birth-${index}`}
                  type="date"
                  className={styles.fieldInput}
                  value={child.dateNaissance}
                  onChange={(e) => updateChildField(index, 'dateNaissance', e.target.value)}
                  data-testid={`input-child-birth-${index}`}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.fieldLabel} htmlFor={`child-level-${index}`}>
                  Niveau scolaire *
                </label>
                <input
                  id={`child-level-${index}`}
                  type="text"
                  className={styles.fieldInput}
                  value={child.niveauScolaire}
                  onChange={(e) => updateChildField(index, 'niveauScolaire', e.target.value)}
                  placeholder="Ex: CP, CE1, 6ème, Maternelle..."
                  data-testid={`input-child-level-${index}`}
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addChild}
          className={styles.addChildButton}
          data-testid="button-add-child"
        >
          <Plus size={16} />
          Ajouter un enfant
        </button>

        <div className={styles.buttonContainer}>
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`${styles.button} ${styles.buttonSecondary}`}
            data-testid="button-previous-step"
          >
            Précédent
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`${styles.button} ${styles.buttonDraft}`}
            data-testid="button-save-draft"
          >
            {(initialData?.state === 'DRAFT' || !initialData?.id) ? 'Enregistrer brouillon' : 'Enregistrer fiche'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (validateChildrenStep()) {
                setCurrentStep(3);
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

  // Static objectives and workshops data based on user requirements
  const objectivesData = [
    {
      id: 1,
      title: "Développement des compétences parentales pour favoriser la réussite scolaire des enfants",
      workshops: [
        {
          id: "workshop_1_1",
          name: "Atelier communication parent-enfant",
          objective: "Aider les familles à organiser le temps entre les activités scolaires, les loisirs et la vie familiale."
        },
        {
          id: "workshop_1_2", 
          name: "Gestion des émotions",
          objective: "Renforcer la communication au sein de la famille pour créer un environnement propice à l'apprentissage."
        },
        {
          id: "workshop_1_3",
          name: "Techniques éducatives positives",
          objective: "Fournir aux parents des outils pratiques pour soutenir l'apprentissage des enfants à la maison."
        },
        {
          id: "workshop_1_4",
          name: "Soutien émotionnel et la motivation scolaire",
          objective: "Apprendre aux parents à soutenir la motivation de leurs enfants et à gérer les émotions liées à l'école (stress, anxiété, etc.)."
        }
      ]
    },
    {
      id: 2,
      title: "Renforcement des liens familiaux par la communication intergénérationnelle pour favoriser la réussite scolaire des enfants",
      workshops: [
        {
          id: "workshop_2_1",
          name: "Ateliers famille",
          objective: "Aider les parents à mieux accompagner leurs enfants dans leur parcours scolaire."
        },
        {
          id: "workshop_2_2",
          name: "Dialogue intergénérationnel",
          objective: "Gérer les émotions liées à l'école."
        },
        {
          id: "workshop_2_3",
          name: "Médiation familiale",
          objective: "Soutenir les enfants dans leur parcours."
        },
        {
          id: "workshop_2_4",
          name: "Renforcer la motivation scolaire par le dialogue",
          objective: "Encourager la projection positive."
        }
      ]
    },
    {
      id: 3,
      title: "Renforcement des dynamiques familiales positives par le sport",
      workshops: [
        {
          id: "workshop_3_1",
          name: "Jeux coopératifs",
          objective: "Renforcer les liens familiaux par le bien-être physique et mental."
        },
        {
          id: "workshop_3_2",
          name: "Randonnée familiale",
          objective: "Comprendre l'impact du sport sur la motivation scolaire."
        },
        {
          id: "workshop_3_3",
          name: "Sport collectif famille",
          objective: "Créer un événement sportif ludique inter-familles."
        }
      ]
    }
  ];

  const [expandedObjectives, setExpandedObjectives] = useState({});

  const toggleObjective = (objectiveId) => {
    setExpandedObjectives(prev => ({
      ...prev,
      [objectiveId]: !prev[objectiveId]
    }));
  };

  const updateWorkshopProposition = (workshopId, value) => {
    setFormData(prev => ({
      ...prev,
      workshopPropositions: {
        ...prev.workshopPropositions,
        [workshopId]: value
      }
    }));
  };

  const validateObjectivesStep = () => {
    // This step doesn't require validation as propositions are optional
    return true;
  };

  const renderObjectivesStep = () => (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>
        <Target className={styles.cardTitleIcon} />
        Ateliers et objectifs
      </h2>
      
      <div className={styles.formSection}>
        {objectivesData.map((objective) => (
          <div key={objective.id} className={styles.objectiveSection}>
            <button
              type="button"
              onClick={() => toggleObjective(objective.id)}
              className={styles.objectiveHeader}
              data-testid={`button-objective-${objective.id}`}
            >
              <div className={styles.objectiveTitle}>
                {expandedObjectives[objective.id] ? (
                  <ChevronDown size={20} />
                ) : (
                  <ChevronRight size={20} />
                )}
                <span>OBJECTIF {objective.id} : {objective.title}</span>
              </div>
            </button>

            {expandedObjectives[objective.id] && (
              <div className={styles.workshopsContainer}>
                <h4 className={styles.workshopsSubtitle}>Ateliers proposés</h4>
                
                {objective.workshops.map((workshop) => (
                  <div key={workshop.id} className={styles.workshopItem}>
                    <div className={styles.workshopInfo}>
                      <h5 className={styles.workshopName}>{workshop.name}</h5>
                      <p className={styles.workshopObjective}>
                        <strong>Objectif :</strong> {workshop.objective}
                      </p>
                    </div>
                    
                    <div className={styles.workshopProposition}>
                      <label className={styles.fieldLabel} htmlFor={`proposition-${workshop.id}`}>
                        Proposition du référent
                      </label>
                      <textarea
                        id={`proposition-${workshop.id}`}
                        className={styles.fieldTextarea}
                        value={formData.workshopPropositions?.[workshop.id] || ''}
                        onChange={(e) => updateWorkshopProposition(workshop.id, e.target.value)}
                        placeholder="Décrivez votre proposition pour cet atelier..."
                        rows={3}
                        data-testid={`textarea-proposition-${workshop.id}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className={styles.buttonContainer}>
          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className={`${styles.button} ${styles.buttonSecondary}`}
            data-testid="button-previous-step"
          >
            Précédent
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`${styles.button} ${styles.buttonDraft}`}
            data-testid="button-save-draft"
          >
            {(initialData?.state === 'DRAFT' || !initialData?.id) ? 'Enregistrer brouillon' : 'Enregistrer fiche'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (validateObjectivesStep()) {
                setCurrentStep(5);
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

        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="family-address">
            Adresse
          </label>
          <input
            id="family-address"
            type="text"
            className={styles.fieldInput}
            value={formData.family.adresse}
            onChange={(e) => updateFamilyField('adresse', e.target.value)}
            placeholder="Adresse complète de la famille"
            data-testid="input-family-address"
          />
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label className={styles.fieldLabel} htmlFor="family-mobile">
              Téléphone portable *
            </label>
            <input
              id="family-mobile"
              type="tel"
              className={styles.fieldInput}
              value={formData.family.telephonePortable}
              onChange={(e) => updateFamilyField('telephonePortable', e.target.value)}
              placeholder="06 12 34 56 78"
              data-testid="input-family-mobile"
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.fieldLabel} htmlFor="family-landline">
              Téléphone fixe
            </label>
            <input
              id="family-landline"
              type="tel"
              className={styles.fieldInput}
              value={formData.family.telephoneFixe}
              onChange={(e) => updateFamilyField('telephoneFixe', e.target.value)}
              placeholder="01 23 45 67 89"
              data-testid="input-family-landline"
            />
          </div>
        </div>

        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="family-email">
            Email
          </label>
          <input
            id="family-email"
            type="email"
            className={styles.fieldInput}
            value={formData.family.email}
            onChange={(e) => updateFamilyField('email', e.target.value)}
            placeholder="exemple@email.com"
            data-testid="input-family-email"
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
            onClick={handleSave}
            className={`${styles.button} ${styles.buttonDraft}`}
            data-testid="button-save-draft"
          >
            {(initialData?.state === 'DRAFT' || !initialData?.id) ? 'Enregistrer brouillon' : 'Enregistrer fiche'}
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
                onClick={handleSave}
                className={`${styles.button} ${draftSaved ? styles.buttonDraftSaved : styles.buttonDraft}`}
                data-testid="button-save-draft"
              >
                {draftSaved ? 
                  (initialData?.state === 'DRAFT' ? 'Brouillon sauvegardé' : 'Fiche sauvegardée') :
                  ((initialData?.state === 'DRAFT' || !initialData?.id) ? 'Enregistrer brouillon' : 'Enregistrer fiche')
                }
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
            <>
              <button
                type="button"
                onClick={handleSave}
                className={`${styles.button} ${draftSaved ? styles.buttonDraftSaved : styles.buttonDraft}`}
                data-testid="button-save-draft"
              >
                {draftSaved ? 
                  (initialData?.state === 'DRAFT' ? 'Brouillon sauvegardé' : 'Fiche sauvegardée') :
                  ((initialData?.state === 'DRAFT' || !initialData?.id) ? 'Enregistrer brouillon' : 'Enregistrer fiche')
                }
              </button>
              <button
                type="button"
                onClick={() => setIsReferentEditable(false)}
                className={`${styles.button} ${styles.buttonPrimary}`}
                data-testid="button-save-referent"
              >
                <Check className={styles.buttonIcon} />
                Enregistrer les modifications
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const handleCancel = () => {
    if (window.confirm('Êtes-vous sûr de vouloir annuler ? Toutes les données saisies seront perdues.')) {
      // Reset form and go back to dashboard
      window.location.href = '/dashboard';
    }
  };

  const handleModify = () => {
    // Go back to first step with all data preserved
    setCurrentStep(0);
  };

  const handleSave = async () => {
    try {
      console.log('Save clicked! Current user:', user);
      console.log('Current form data:', formData);
      
      const userRole = user?.user?.role || user?.role;
      const currentState = initialData?.state || 'DRAFT';
      const isAdmin = userRole === 'ADMIN';
      const isDraft = currentState === 'DRAFT';

      // Create minimal family data (even if incomplete for non-draft saves)
      const familyData = {
        lastName: formData.family?.lastName || '',
        firstName: formData.family?.firstName || '',
        birthDate: formData.family?.birthDate || '',
        birthPlace: formData.family?.birthPlace || '',
        nationality: formData.family?.nationality || '',
        lienAvecEnfants: formData.family?.lienAvecEnfants || '',
        autoriteParentale: formData.family?.autoriteParentale || '',
        situationFamiliale: formData.family?.situationFamiliale || '',
        situationSocioProfessionnelle: formData.family?.situationSocioProfessionnelle || '',
        telephonePortable: formData.family?.telephonePortable || '',
        telephoneFixe: formData.family?.telephoneFixe || '',
        email: formData.family?.email || '',
        address: formData.family?.adresse || ''
      };

      // Transform workshop propositions
      // Map technical form IDs to actual database workshop IDs
      const workshopIdMapping = {
        'workshop_1_1': '0ae9279f-9d7a-4778-875a-3ed84ee9d1b1', // Atelier communication parent-enfant
        'workshop_1_2': 'bca25252-1dcf-4e35-b426-7374b79bafe1', // Gestion des émotions
        'workshop_1_3': '102d9611-e264-42a9-aca8-0da0a73956ba', // Techniques éducatives positives
        'workshop_2_1': '0c28af6d-e911-4c98-b5b2-10d9c585d3bb', // Ateliers famille
        'workshop_2_2': '3f48eed0-f7a0-4cc5-85d4-f2feb39371e7', // Dialogue intergénérationnel
        'workshop_2_3': '69ab54c3-a222-4fce-b6d4-1fe56fbf046f', // Médiation familiale
        'workshop_3_1': '475e5207-044a-4ef0-a285-a1350f049ef7', // Jeux coopératifs
        'workshop_3_2': 'c09e5c74-a78b-4da8-9e48-1a4e7e28b58a', // Randonnée familiale
        'workshop_3_3': '0b7fbcb2-6d56-48fe-ad97-07a5f9fb5293'  // Sport collectif famille
      };

      const workshops = formData.workshopPropositions ? 
        Object.entries(formData.workshopPropositions).map(([technicalId, _]) => ({
          workshopId: workshopIdMapping[technicalId] || technicalId,
          qty: 1
        })) : [];

      const ficheData = {
        description: formData.descriptionSituation || '',
        workshops: workshops,
        objectiveIds: (formData.objectives || []).map(obj => obj.id || obj),
        family: familyData,
        // Map form data to detailed JSON fields
        referentData: formData.referent,
        familyDetailedData: formData.family,
        childrenData: formData.children,
        workshopPropositions: formData.workshopPropositions,
        familyConsent: formData.familyConsent
      };

      // For draft fiches or admin users, save as draft
      // For non-draft fiches with non-admin users, save without changing state
      if (isDraft || isAdmin) {
        ficheData.state = 'DRAFT';
        await onSaveDraft(ficheData);
      } else {
        // For non-admin editing non-draft fiches, update without state change
        await apiRequest('PATCH', `/api/fiches/${initialData.id}`, ficheData);
        queryClient.invalidateQueries(['/api/fiches']);
        queryClient.invalidateQueries(['/api/fiches', initialData.id]);
      }
      
      // Set visual feedback
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000); // Reset after 3 seconds

      const toastTitle = isDraft ? "Brouillon sauvegardé" : "Fiche sauvegardée";
      const toastDescription = isDraft ? 
        "Votre fiche a été sauvegardée en brouillon avec succès." :
        "Les modifications de la fiche ont été sauvegardées avec succès.";

      toast({
        title: toastTitle,
        description: toastDescription,
        variant: "default"
      });

    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: error.message || "Une erreur est survenue lors de la sauvegarde.",
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
      await transitionFiche({
        id: initialData.id,
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
      console.error('Archive error:', error);
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
      await apiRequest('DELETE', `/api/fiches/${initialData.id}`);
      
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

  const handleTransmit = async () => {
    if (!validateAllSteps()) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez remplir tous les champs obligatoires. Vérifiez particulièrement les champs Structure et Téléphone dans l'étape Référent.",
        variant: "destructive"
      });
      return;
    }

    try {
      let ficheId;
      
      // If we have an existing fiche (initialData with id), transition its state
      if (initialData && initialData.id) {
        ficheId = initialData.id;
        await transitionFiche({
          id: initialData.id,
          newState: 'SUBMITTED_TO_CD',
          metadata: {
            transmittedBy: user?.user?.id || user?.id,
            transmissionDate: new Date().toISOString()
          }
        });
      } else {
        // If it's a new fiche, create it as draft first, then transition it
        // Transform workshopPropositions to workshops array format
        // Map technical form IDs to actual database workshop IDs
        const workshopIdMapping = {
          'workshop_1_1': '0ae9279f-9d7a-4778-875a-3ed84ee9d1b1', // Atelier communication parent-enfant
          'workshop_1_2': 'bca25252-1dcf-4e35-b426-7374b79bafe1', // Gestion des émotions
          'workshop_1_3': '102d9611-e264-42a9-aca8-0da0a73956ba', // Techniques éducatives positives
          'workshop_2_1': '0c28af6d-e911-4c98-b5b2-10d9c585d3bb', // Ateliers famille
          'workshop_2_2': '3f48eed0-f7a0-4cc5-85d4-f2feb39371e7', // Dialogue intergénérationnel
          'workshop_2_3': '69ab54c3-a222-4fce-b6d4-1fe56fbf046f', // Médiation familiale
          'workshop_3_1': '475e5207-044a-4ef0-a285-a1350f049ef7', // Jeux coopératifs
          'workshop_3_2': 'c09e5c74-a78b-4da8-9e48-1a4e7e28b58a', // Randonnée familiale
          'workshop_3_3': '0b7fbcb2-6d56-48fe-ad97-07a5f9fb5293'  // Sport collectif famille
        };

        const workshops = formData.workshopPropositions ? 
          Object.entries(formData.workshopPropositions).map(([technicalId, qty]) => ({
            workshopId: workshopIdMapping[technicalId] || technicalId,
            qty: parseInt(qty) || 1
          })) : [];

        const ficheData = {
          familyId: formData.familyId,
          description: formData.description || formData.descriptionSituation || '',
          workshops: workshops,
          // Include family data for dynamic creation
          family: formData.familyId ? undefined : {
            code: `FAM_${Date.now()}`, // Generate a unique family code
            mother: formData.family.mother,
            father: formData.family.father,
            phone: formData.family.telephonePortable,
            email: formData.family.email,
            address: formData.family.adresse
          },
          // Map form data to detailed JSON fields
          referentData: formData.referent,
          familyDetailedData: formData.family,
          childrenData: formData.children,
          workshopPropositions: formData.workshopPropositions,
          familyConsent: formData.familyConsent
        };

        // Create the fiche as DRAFT
        const newFiche = await onSubmit(ficheData);
        
        if (!newFiche || !newFiche.id) {
          throw new Error('Fiche creation failed - no ID returned');
        }
        
        ficheId = newFiche.id;
        
        // Then transition it to SUBMITTED_TO_CD
        const transitionResult = await transitionFiche({
          id: newFiche.id,
          newState: 'SUBMITTED_TO_CD',
          metadata: {
            transmittedBy: user?.user?.id || user?.id,
            transmissionDate: new Date().toISOString()
          }
        });
      }
      
      toast({
        title: "Fiche Validée!",
        description: "La fiche a été transmise avec succès au Conseil Départemental pour validation.",
        variant: "success"
      });

      // Redirect to fiche detail page after successful submission
      setTimeout(() => {
        window.location.href = `/fiches/${ficheId}`;
      }, 2000);

    } catch (error) {
      console.error('Transmission error:', error);
      toast({
        title: "Erreur de transmission",
        description: error.message || "Une erreur est survenue lors de la transmission de la fiche.",
        variant: "destructive"
      });
    }
  };

  const validateAllSteps = () => {
    if (!formData.familyConsent) {
      return false;
    }
    return validateReferentStep() && 
           validateFamilyStep() && 
           validateChildrenStep() && 
           validateBesoinStep() && 
           validateObjectivesStep();
  };

  const renderReviewStep = () => (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>
        <Send className={styles.cardTitleIcon} />
        Revoir et transmettre au Conseil Départemental
      </h2>
      
      <div className={styles.formSection}>
        {/* Référent Information */}
        <div className={styles.reviewSection}>
          <h3 className={styles.reviewSectionTitle}>
            <UserCheck className={styles.reviewSectionIcon} />
            Référent à l'origine de la demande
          </h3>
          <div className={styles.reviewContent}>
            <p><strong>Nom :</strong> {formData.referent.lastName}</p>
            <p><strong>Prénom :</strong> {formData.referent.firstName}</p>
            <p><strong>Structure :</strong> {formData.referent.structure}</p>
            <p><strong>Téléphone :</strong> {formData.referent.phone}</p>
            <p><strong>Email :</strong> {formData.referent.email}</p>
            <p><strong>Date de la demande :</strong> {formData.referent.requestDate}</p>
          </div>
        </div>

        {/* Family Information */}
        <div className={styles.reviewSection}>
          <h3 className={styles.reviewSectionTitle}>
            <Users className={styles.reviewSectionIcon} />
            Informations famille
          </h3>
          <div className={styles.reviewContent}>
            <p><strong>Nom :</strong> {formData.family.lastName}</p>
            <p><strong>Prénom :</strong> {formData.family.firstName}</p>
            <p><strong>Date de naissance :</strong> {formData.family.birthDate}</p>
            <p><strong>Lieu de naissance :</strong> {formData.family.birthPlace}</p>
            <p><strong>Nationalité :</strong> {formData.family.nationality}</p>
            <p><strong>Lien avec les enfants :</strong> {formData.family.lienAvecEnfants}</p>
            <p><strong>Autorité parentale :</strong> {formData.family.autoriteParentale}</p>
            <p><strong>Situation familiale :</strong> {formData.family.situationFamiliale}</p>
            <p><strong>Situation socio-professionnelle :</strong> {formData.family.situationSocioProfessionnelle}</p>
            {formData.family.adresse && <p><strong>Adresse :</strong> {formData.family.adresse}</p>}
            <p><strong>Téléphone portable :</strong> {formData.family.telephonePortable}</p>
            {formData.family.telephoneFixe && <p><strong>Téléphone fixe :</strong> {formData.family.telephoneFixe}</p>}
            {formData.family.email && <p><strong>Email :</strong> {formData.family.email}</p>}
          </div>
        </div>

        {/* Children Information */}
        <div className={styles.reviewSection}>
          <h3 className={styles.reviewSectionTitle}>
            <Baby className={styles.reviewSectionIcon} />
            Enfants concernés ({formData.children.length})
          </h3>
          <div className={styles.reviewContent}>
            {formData.children.map((child, index) => (
              <div key={index} className={styles.childReview}>
                <h4>Enfant {index + 1}</h4>
                <p><strong>Prénom :</strong> {child.firstName}</p>
                <p><strong>Date de naissance :</strong> {child.birthDate}</p>
                <p><strong>Niveau scolaire :</strong> {child.level}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Needs Description */}
        <div className={styles.reviewSection}>
          <h3 className={styles.reviewSectionTitle}>
            <PenTool className={styles.reviewSectionIcon} />
            Identification des besoins de la famille
          </h3>
          <div className={styles.reviewContent}>
            <p>{formData.description || 'Aucune description fournie'}</p>
          </div>
        </div>

        {/* Workshop Propositions */}
        <div className={styles.reviewSection}>
          <h3 className={styles.reviewSectionTitle}>
            <Target className={styles.reviewSectionIcon} />
            Propositions d'ateliers
          </h3>
          <div className={styles.reviewContent}>
            {Object.entries(formData.workshopPropositions || {}).filter(([_, value]) => value?.trim()).length > 0 ? (
              Object.entries(formData.workshopPropositions || {}).map(([workshopId, proposition]) => {
                if (!proposition?.trim()) return null;
                const workshop = workshops?.find(w => w.id === workshopId);
                const workshopName = workshop?.name || `Atelier ${workshopId}`;
                return (
                  <div key={workshopId} className={styles.propositionReview}>
                    <h4>{workshopName}</h4>
                    <p>{proposition}</p>
                  </div>
                );
              })
            ) : (
              <p>Aucune proposition d'atelier</p>
            )}
          </div>
        </div>

        {/* Family Consent Checkbox */}
        <div className={styles.consentSection}>
          <label className={styles.consentLabel}>
            <input
              type="checkbox"
              checked={formData.familyConsent || false}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                familyConsent: e.target.checked
              }))}
              className={styles.consentCheckbox}
              data-testid="checkbox-family-consent"
            />
            <span className={styles.consentText}>
              La famille a connaissance de la Fiche Navette et adhère à cet accompagnement.
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className={styles.reviewActions}>
          <button
            type="button"
            onClick={handleCancel}
            className={`${styles.button} ${styles.buttonDanger}`}
            data-testid="button-cancel"
          >
            Annuler
          </button>
          
          <div className={styles.reviewActionsRight}>
            <button
              type="button"
              onClick={handleModify}
              className={`${styles.button} ${styles.buttonSecondary}`}
              data-testid="button-modify"
            >
              <Edit className={styles.buttonIcon} />
              Modifier
            </button>
            <button
              type="button"
              onClick={handleTransmit}
              className={`${styles.button} ${styles.buttonPrimary}`}
              data-testid="button-transmit"
            >
              <Send className={styles.buttonIcon} />
              Transmettre
            </button>
            
            {/* Admin-only actions - only show if user is ADMIN and fiche exists */}
            {user?.user?.role === 'ADMIN' && initialData?.id && (
              <>
                <button
                  type="button"
                  onClick={handleArchive}
                  className={`${styles.button} ${styles.buttonWarning}`}
                  data-testid="button-archive-fiche"
                >
                  <Archive className={styles.buttonIcon} />
                  Archiver
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className={`${styles.button} ${styles.buttonDanger}`}
                  data-testid="button-delete-fiche"
                >
                  <Trash2 className={styles.buttonIcon} />
                  Supprimer
                </button>
              </>
            )}
          </div>
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
        return renderChildrenStep();
      case 3:
        return renderBesoinStep();
      case 4:
        return renderObjectivesStep();
      case 5:
        return renderReviewStep();
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
