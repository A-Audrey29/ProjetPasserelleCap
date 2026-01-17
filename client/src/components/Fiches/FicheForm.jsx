import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  UserCheck,
  Users,
  Baby,
  Target,
  Send,
  Plus,
  Edit,
  Check,
  Trash2,
  PenTool,
  ChevronDown,
  ChevronRight,
  Archive,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useFiches } from "@/hooks/useFiches";
import FileUpload from "@/components/FileUpload/FileUpload";
import styles from "./FicheForm.module.css";

// --- utils (module scope) ---
const mapFamilyFromApi = (src = {}) => ({
  code: src.code ?? "",
  email: src.email ?? "",
  mother: src.mother ?? "",
  father: src.father ?? "",
  tiers: src.tiers ?? "",
  lienAvecEnfants: src.lienAvecEnfants ?? "",
  autoriteParentale: Array.isArray(src.autoriteParentale) ? src.autoriteParentale : (src.autoriteParentale ? [src.autoriteParentale] : []),
  situationFamiliale: src.situationFamiliale ?? "",
  situationSocioProfessionnelle: src.situationSocioProfessionnelle ?? "",
  adresse: src.adresse ?? src.address ?? "",
  telephonePortable: src.telephonePortable ?? src.phone ?? "",
  telephoneFixe: src.telephoneFixe ?? src.landline ?? src.phone2 ?? "",
});

export default function FicheForm({
  initialData = null,
  onSubmit,
  onSaveDraft,
  isEditing = false,
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { transitionFiche, isTransitioning } = useFiches();

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(0);
  const [isReferentEditable, setIsReferentEditable] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({});

  // Form state with référent data - Initialize with empty strings to prevent controlled/uncontrolled issues
  const [formData, setFormData] = useState({
    referent: {
      lastName: "",
      firstName: "",
      structure: "",
      phone: "",
      email: "",
      requestDate: new Date().toISOString().split("T")[0],
    },
    description: "",
    family: {
      code: "",
      // UI canonical (French):
      email: "",
      mother: "",
      father: "",
      tiers: "",
      lienAvecEnfants: "",
      autoriteParentale: [],
      situationFamiliale: "",
      situationSocioProfessionnelle: "",
      adresse: "",
      telephonePortable: "",
      telephoneFixe: "",
    },
    children: [
      {
        name: "",
        dateNaissance: "",
        niveauScolaire: "",
      },
    ],
    descriptionSituation: "",
    workshopPropositions: {},
    participantsCount: 1, // Default number of participants for workshops
    capDocuments: [],
    familyConsent: false,
    referentValidation: false,
  });

  // Queries for reference data

  const { data: objectives = [] } = useQuery({
    queryKey: ["/api/objectives"],
    enabled: true,
  });

  const { data: workshopsList = [] } = useQuery({
    queryKey: ["/api/workshops"],
    enabled: true,
  });

  // Initialize form with existing data
  useEffect(() => {
    if (!initialData) return;

    console.log("Initializing form with data:", initialData);

    // 1) pull raw data once
    const familyData =
      initialData.familyDetailedData || initialData.family || {};

    const childrenData = initialData.childrenData || initialData.children || [];

    // 2) set state using the mapper
    setFormData((prev) => ({
      ...prev,
      description: initialData.description || "",
      family: {
        ...prev.family,
        ...mapFamilyFromApi(familyData),
      },
      children: childrenData.map((child) => ({
        name: child.name || child.firstName || "",
        dateNaissance:
          child.dateNaissance ||
          (child.birthDate
            ? new Date(child.birthDate).toISOString().split("T")[0]
            : ""),
        niveauScolaire: child.niveauScolaire || child.level || "",
      })),
      referent: initialData.referentData
        ? {
            lastName: initialData.referentData.lastName || "",
            firstName: initialData.referentData.firstName || "",
            structure: initialData.referentData.structure || "",
            phone: initialData.referentData.phone || "",
            email: initialData.referentData.email || "",
            requestDate:
              initialData.referentData.requestDate || prev.referent.requestDate,
          }
        : initialData.emitter
          ? {
              lastName: initialData.emitter.lastName || "",
              firstName: initialData.emitter.firstName || "",
              structure: initialData.emitter.structure || "",
              phone: initialData.emitter.phone || "",
              email: initialData.emitter.email || "",
              requestDate: initialData.createdAt
                ? new Date(initialData.createdAt).toISOString().split("T")[0]
                : prev.referent.requestDate,
            }
          : prev.referent,
      descriptionSituation:
        initialData.description || initialData.descriptionSituation || "",
      workshopPropositions: initialData.workshopPropositions || {},
      participantsCount: initialData.participantsCount || 1,
      capDocuments: initialData.capDocuments || [],
      familyConsent: initialData.familyConsent || false,
      referentValidation: initialData.referentValidation || false,
    }));

    // Initialize selectedWorkshops from saved data
    if (initialData.selectedWorkshops) {
      setSelectedWorkshops(initialData.selectedWorkshops);
    }
  }, [initialData]);

  // Auto-populate referent fields when user data becomes available
  useEffect(() => {
    if (user && !initialData) {
      const currentUser = user?.user || user;
      setFormData((prev) => ({
        ...prev,
        referent: {
          ...prev.referent,
          lastName: currentUser?.lastName || "",
          firstName: currentUser?.firstName || "",
          structure: currentUser?.structure || "",
          phone: currentUser?.phone || "",
          email: currentUser?.email || "",
        },
      }));
    }
  }, [user, initialData]);

  // Multi-step form steps
  const steps = [
    {
      id: 0,
      title: "Référent à l'origine de la demande",
      icon: UserCheck,
      allowedRoles: ["ADMIN", "EMETTEUR", "RELATIONS_EVS"],
    },
    {
      id: 1,
      title: "Informations famille",
      icon: Users,
      allowedRoles: ["ADMIN", "EMETTEUR", "RELATIONS_EVS"],
    },
    {
      id: 2,
      title: "Enfants concernés",
      icon: Baby,
      allowedRoles: ["ADMIN", "EMETTEUR", "RELATIONS_EVS"],
    },
    {
      id: 3,
      title: "Identification des besoins",
      icon: PenTool,
      allowedRoles: ["ADMIN", "EMETTEUR", "RELATIONS_EVS"],
    },
    {
      id: 4,
      title: "Ateliers et objectifs",
      icon: Target,
      allowedRoles: ["ADMIN", "EMETTEUR", "RELATIONS_EVS"],
    },
    {
      id: 5,
      title: "Revoir et transmettre au Conseil Départemental",
      icon: Send,
      allowedRoles: ["ADMIN", "EMETTEUR", "RELATIONS_EVS"],
    },
  ];

  // Handle référent data validation
  const handleValidateReferent = () => {
    setCurrentStep(1);
    setIsReferentEditable(false);
  };

  const handleModifyReferent = () => {
    setIsReferentEditable(true);
  };

  const updateReferentField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      referent: {
        ...prev.referent,
        [field]: value,
      },
    }));
  };

  const updateFamilyField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      family: {
        ...prev.family,
        [field]: value,
      },
    }));
  };

  // Validation error helpers
  const setFieldError = (fieldPath, message) => {
    setValidationErrors((prev) => ({
      ...prev,
      [fieldPath]: message,
    }));
  };

  const clearFieldError = (fieldPath) => {
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldPath];
      return newErrors;
    });
  };

  const clearAllErrors = () => {
    setValidationErrors({});
  };

  const getFieldError = (fieldPath) => {
    return validationErrors[fieldPath];
  };

  // Error message component
  const ErrorMessage = ({ error, fieldPath }) => {
    if (!error) return null;
    return (
      <div className={styles.errorMessage} data-testid={`error-${fieldPath}`}>
        <AlertCircle className={styles.errorIcon} />
        <span>{error}</span>
      </div>
    );
  };

  const validateReferentStep = () => {
    let isValid = true;
    
    console.log("🔍 Validation détaillée du référent:");
    console.log("  - lastName:", formData.referent.lastName);
    console.log("  - firstName:", formData.referent.firstName);
    console.log("  - structure:", formData.referent.structure);
    console.log("  - phone:", formData.referent.phone);
    console.log("  - email:", formData.referent.email);
    console.log("  - requestDate:", formData.referent.requestDate);
    
    // Clear previous errors for referent fields
    clearFieldError('referent.lastName');
    clearFieldError('referent.firstName');
    clearFieldError('referent.structure');
    clearFieldError('referent.phone');
    clearFieldError('referent.email');
    clearFieldError('referent.requestDate');
    
    if (!formData.referent.lastName?.trim()) {
      console.log("❌ lastName vide");
      setFieldError('referent.lastName', 'Le nom est obligatoire');
      isValid = false;
    }
    
    if (!formData.referent.firstName?.trim()) {
      console.log("❌ firstName vide");
      setFieldError('referent.firstName', 'Le prénom est obligatoire');
      isValid = false;
    }
    
    if (!formData.referent.structure?.trim()) {
      console.log("❌ structure vide");
      setFieldError('referent.structure', 'La structure est obligatoire');
      isValid = false;
    }
    
    if (!formData.referent.phone?.trim()) {
      console.log("❌ phone vide");
      setFieldError('referent.phone', 'Le téléphone est obligatoire');
      isValid = false;
    }
    
    if (!formData.referent.email?.trim()) {
      console.log("❌ email vide");
      setFieldError('referent.email', 'L\'email est obligatoire');
      isValid = false;
    }
    
    if (!formData.referent.requestDate?.trim()) {
      console.log("❌ requestDate vide");
      setFieldError('referent.requestDate', 'La date de la demande est obligatoire');
      isValid = false;
    }
    
    return isValid;
  };

  const validateFamilyStep = () => {
    const {
      mother,
      father,
      tiers,
      lienAvecEnfants,
      autoriteParentale,
      situationFamiliale,
      situationSocioProfessionnelle,
      telephonePortable,
    } = formData.family;
    
    let isValid = true;
    
    // Clear previous family errors
    clearFieldError('family.parentInfo');
    clearFieldError('family.lienAvecEnfants');
    clearFieldError('family.autoriteParentale');
    clearFieldError('family.situationFamiliale');
    clearFieldError('family.situationSocioProfessionnelle');
    clearFieldError('family.telephonePortable');

    // Au moins un des trois (mère, père, tiers) doit être rempli
    const hasParentInfo = Boolean(
      (mother || "").trim() || (father || "").trim() || (tiers || "").trim(),
    );
    if (!hasParentInfo) {
      setFieldError('family.parentInfo', 'Veuillez renseigner au moins l\'un des champs : Mère, Père ou Tiers');
      isValid = false;
    }

    // Si tiers est rempli, le lien avec les enfants est obligatoire
    if ((tiers?.trim?.() || "") && !(lienAvecEnfants?.trim?.() || "")) {
      setFieldError('family.lienAvecEnfants', 'Le lien avec l\'enfant est obligatoire lorsque "Tiers" est renseigné');
      isValid = false;
    }

    // Champs obligatoires - autoriteParentale doit avoir au moins une valeur
    if (!autoriteParentale || !Array.isArray(autoriteParentale) || autoriteParentale.length === 0) {
      setFieldError('family.autoriteParentale', 'Veuillez sélectionner au moins une autorité parentale');
      isValid = false;
    }

    if (!(situationFamiliale?.trim?.() || "")) {
      setFieldError('family.situationFamiliale', 'La situation familiale est obligatoire');
      isValid = false;
    }

    if (!(situationSocioProfessionnelle?.trim?.() || "")) {
      setFieldError('family.situationSocioProfessionnelle', 'La situation socio-professionnelle est obligatoire');
      isValid = false;
    }

    if (!(telephonePortable?.trim?.() || "")) {
      setFieldError('family.telephonePortable', 'Le téléphone portable est obligatoire');
      isValid = false;
    }

    return isValid;
  };

  const updateChildField = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      children: prev.children.map((child, i) =>
        i === index ? { ...child, [field]: value } : child,
      ),
    }));
  };

  const addChild = () => {
    setFormData((prev) => ({
      ...prev,
      children: [
        ...prev.children,
        {
          name: "",
          dateNaissance: "",
          niveauScolaire: "",
        },
      ],
    }));
  };

  const removeChild = (index) => {
    if (formData.children.length > 1) {
      // Clear all children errors to avoid stale/misapplied errors after reindexing
      Object.keys(validationErrors).forEach(key => {
        if (key.startsWith('children.')) {
          clearFieldError(key);
        }
      });
      
      setFormData((prev) => ({
        ...prev,
        children: prev.children.filter((_, i) => i !== index),
      }));
    }
  };

  const validateChildrenStep = () => {
    let isValid = true;
    
    // Clear previous child errors
    for (let i = 0; i < formData.children.length; i++) {
      clearFieldError(`children.${i}.name`);
      clearFieldError(`children.${i}.dateNaissance`);
      clearFieldError(`children.${i}.niveauScolaire`);
    }
    
    for (let i = 0; i < formData.children.length; i++) {
      const child = formData.children[i];

      if (!child.name.trim()) {
        setFieldError(`children.${i}.name`, `Le nom de l'enfant ${i + 1} est obligatoire`);
        isValid = false;
      }

      if (!child.dateNaissance) {
        setFieldError(`children.${i}.dateNaissance`, `La date de naissance de l'enfant ${i + 1} est obligatoire`);
        isValid = false;
      }

      if (!child.niveauScolaire.trim()) {
        setFieldError(`children.${i}.niveauScolaire`, `Le niveau scolaire de l'enfant ${i + 1} est obligatoire`);
        isValid = false;
      }
    }

    return isValid;
  };

  const validateBesoinStep = () => {
    clearFieldError('descriptionSituation');
    
    if (!formData.descriptionSituation.trim()) {
      setFieldError('descriptionSituation', 'La description de la situation est obligatoire');
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
            className={`${styles.fieldTextarea} ${getFieldError('descriptionSituation') ? styles.fieldWithError : ''}`}
            value={formData.descriptionSituation}
            onChange={(e) => {
              setFormData((prev) => ({
                ...prev,
                descriptionSituation: e.target.value,
              }));
              clearFieldError('descriptionSituation');
            }}
            placeholder="Décrivez la situation familiale, les difficultés rencontrées, les besoins identifiés..."
            rows={8}
            data-testid="textarea-description-situation"
          />
          <ErrorMessage error={getFieldError('descriptionSituation')} fieldPath="descriptionSituation" />
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
            {initialData?.state === "DRAFT" || !initialData?.id
              ? "Enregistrer brouillon"
              : "Enregistrer fiche"}
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
              <h3 className={styles.childTitle}>Enfant {index + 1}</h3>
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
              <label
                className={styles.fieldLabel}
                htmlFor={`child-name-${index}`}
              >
                Nom et prénom *
              </label>
              <input
                id={`child-name-${index}`}
                type="text"
                className={`${styles.fieldInput} ${getFieldError(`children.${index}.name`) ? styles.fieldWithError : ''}`}
                value={child.name}
                onChange={(e) => {
                  updateChildField(index, "name", e.target.value);
                  clearFieldError(`children.${index}.name`);
                }}
                placeholder="Nom et prénom de l'enfant"
                data-testid={`input-child-name-${index}`}
              />
              <ErrorMessage error={getFieldError(`children.${index}.name`)} fieldPath={`children.${index}.name`} />
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label
                  className={styles.fieldLabel}
                  htmlFor={`child-birth-${index}`}
                >
                  Date de naissance *
                </label>
                <input
                  id={`child-birth-${index}`}
                  type="date"
                  className={`${styles.fieldInput} ${getFieldError(`children.${index}.dateNaissance`) ? styles.fieldWithError : ''}`}
                  value={child.dateNaissance}
                  onChange={(e) => {
                    updateChildField(index, "dateNaissance", e.target.value);
                    clearFieldError(`children.${index}.dateNaissance`);
                  }}
                  data-testid={`input-child-birth-${index}`}
                />
                <ErrorMessage error={getFieldError(`children.${index}.dateNaissance`)} fieldPath={`children.${index}.dateNaissance`} />
              </div>
              <div className={styles.formField}>
                <label
                  className={styles.fieldLabel}
                  htmlFor={`child-level-${index}`}
                >
                  Niveau scolaire *
                </label>
                <input
                  id={`child-level-${index}`}
                  type="text"
                  className={`${styles.fieldInput} ${getFieldError(`children.${index}.niveauScolaire`) ? styles.fieldWithError : ''}`}
                  value={child.niveauScolaire}
                  onChange={(e) => {
                    updateChildField(index, "niveauScolaire", e.target.value);
                    clearFieldError(`children.${index}.niveauScolaire`);
                  }}
                  placeholder="Ex: CP, CE1, 6ème, Maternelle..."
                  data-testid={`input-child-level-${index}`}
                />
                <ErrorMessage error={getFieldError(`children.${index}.niveauScolaire`)} fieldPath={`children.${index}.niveauScolaire`} />
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
            {initialData?.state === "DRAFT" || !initialData?.id
              ? "Enregistrer brouillon"
              : "Enregistrer fiche"}
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

  const [expandedObjectives, setExpandedObjectives] = useState({});
  const [selectedWorkshops, setSelectedWorkshops] = useState({});

  // Build objectives data dynamically from database
  const objectivesData = objectives.map((objective) => {
    const norm = (v) =>
      String(v ?? "")
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase();
    const filteredWorkshops = workshopsList.filter((w) => {
      const wo = norm(w.objectiveId);
      return (
        wo === norm(objective.id) ||
        (objective.order != null && wo === norm(objective.order))
      );
    });

    return {
      id: objective.order || objective.id,
      title: objective.name,
      workshops: filteredWorkshops.map((w) => ({
        id: w.id,
        name: w.name,
        objective: w.description,
      })),
    };
  });

  const toggleObjective = (objectiveId) => {
    setExpandedObjectives((prev) => ({
      ...prev,
      [objectiveId]: !prev[objectiveId],
    }));
  };

  const updateWorkshopProposition = (workshopId, value) => {
    setFormData((prev) => ({
      ...prev,
      workshopPropositions: {
        ...prev.workshopPropositions,
        [workshopId]: value,
      },
    }));
  };

  // TEMPORAIRE: Sélection multiple d'ateliers par objectif autorisée
  // Pour rétablir la logique "1 atelier par objectif", décommenter le bloc ci-dessous
  // et commenter la version simplifiée
  const toggleWorkshopSelection = (workshopId, objectiveId) => {
    setSelectedWorkshops((prev) => {
      const newSelected = { ...prev };
      
      // Version simplifiée: sélection multiple autorisée
      newSelected[workshopId] = !prev[workshopId];
      
      return newSelected;
    });
    
    /* 
    // VERSION "1 ATELIER PAR OBJECTIF" - Décommenter pour réactiver
    setSelectedWorkshops((prev) => {
      const newSelected = { ...prev };
      
      if (!prev[workshopId]) {
        // Désélectionner tous les autres ateliers du même objectif
        const currentObjectiveWorkshops = objectivesData
          .find(obj => obj.id === objectiveId)?.workshops || [];
        
        currentObjectiveWorkshops.forEach(workshop => {
          if (workshop.id !== workshopId) {
            newSelected[workshop.id] = false;
          }
        });
        
        newSelected[workshopId] = true;
      } else {
        newSelected[workshopId] = false;
      }
      
      return newSelected;
    });
    */
  };

  const validateObjectivesStep = () => {
    let isValid = true;
    
    // Validate participants count - now required
    if (!formData.participantsCount || formData.participantsCount < 1 || formData.participantsCount > 10) {
      setFieldError('participantsCount', 'Le nombre de participants doit être compris entre 1 et 10');
      isValid = false;
    }
    
    return isValid;
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
                <span>
                  OBJECTIF {objective.id} : {objective.title}
                </span>
              </div>
            </button>

            {expandedObjectives[objective.id] && (
              <div className={styles.workshopsContainer}>
                <h4 className={styles.workshopsSubtitle}>Ateliers proposés</h4>

                {objective.workshops.map((workshop) => (
                  <div key={workshop.id} className={styles.workshopContainer}>
                    <input
                      type="checkbox"
                      id={`select-${workshop.id}`}
                      checked={selectedWorkshops[workshop.id] || false}
                      onChange={() => toggleWorkshopSelection(workshop.id, objective.id)}
                      className={styles.workshopCheckbox}
                      data-testid={`checkbox-workshop-${workshop.id}`}
                    />
                    
                    <div className={styles.workshopItem}>
                      <div className={styles.workshopInfo}>
                        <h5 className={styles.workshopName}>{workshop.name}</h5>
                        <p className={styles.workshopObjective}>
                          <strong>Objectif :</strong> {workshop.objective}
                        </p>
                      </div>

                      <div className={styles.workshopProposition}>
                        <label
                          className={styles.fieldLabel}
                          htmlFor={`proposition-${workshop.id}`}
                        >
                          Proposition du référent
                        </label>
                        <textarea
                          id={`proposition-${workshop.id}`}
                          className={styles.fieldTextarea}
                          value={
                            formData.workshopPropositions?.[workshop.id] || ""
                          }
                          onChange={(e) =>
                            updateWorkshopProposition(workshop.id, e.target.value)
                          }
                          placeholder="Décrivez votre proposition pour cet atelier..."
                          rows={3}
                          data-testid={`textarea-proposition-${workshop.id}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Participants Count Section */}
        <div className={styles.participantsSection}>
          <label className={styles.fieldLabel} htmlFor="participantsCount">
            Nombre de participants
          </label>
          <select
            id="participantsCount"
            value={formData.participantsCount}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 1; // Default to 1 if NaN
              setFormData(prev => ({ ...prev, participantsCount: value }));
            }}
            className={styles.fieldSelect}
            data-testid="select-participants-count"
          >
            {[...Array(10)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} participant{i + 1 > 1 ? 's' : ''}
              </option>
            ))}
          </select>
          <ErrorMessage error={getFieldError('participantsCount')} fieldPath="participantsCount" />
          <p className={styles.fieldHint}>
            Nombre de personnes de la fiche navette qui participeront aux ateliers sélectionnés
          </p>
        </div>

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
            {initialData?.state === "DRAFT" || !initialData?.id
              ? "Enregistrer brouillon"
              : "Enregistrer fiche"}
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
              className={`${styles.fieldInput} ${getFieldError('family.parentInfo') ? styles.fieldWithError : ''}`}
              value={formData.family.mother}
              onChange={(e) => {
                updateFamilyField("mother", e.target.value);
                clearFieldError('family.parentInfo');
              }}
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
              className={`${styles.fieldInput} ${getFieldError('family.parentInfo') ? styles.fieldWithError : ''}`}
              value={formData.family.father}
              onChange={(e) => {
                updateFamilyField("father", e.target.value);
                clearFieldError('family.parentInfo');
              }}
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
            className={`${styles.fieldInput} ${getFieldError('family.parentInfo') ? styles.fieldWithError : ''}`}
            value={formData.family.tiers}
            onChange={(e) => {
              updateFamilyField("tiers", e.target.value);
              clearFieldError('family.parentInfo');
            }}
            placeholder="Nom et prénom du tiers"
            data-testid="input-family-tiers"
          />
        </div>
        <ErrorMessage error={getFieldError('family.parentInfo')} fieldPath="family.parentInfo" />

        {formData.family.tiers && (
          <div className={styles.formField}>
            <label className={styles.fieldLabel} htmlFor="family-lien">
              Lien avec l'enfant (les enfants)
              <span className={styles.requiredAsterisk}> *</span>
            </label>
            <input
              id="family-lien"
              type="text"
              className={`${styles.fieldInput} ${getFieldError('family.lienAvecEnfants') ? styles.fieldWithError : ''}`}
              value={formData.family.lienAvecEnfants}
              onChange={(e) => {
                updateFamilyField("lienAvecEnfants", e.target.value);
                clearFieldError('family.lienAvecEnfants');
              }}
              placeholder="Ex: Grand-mère, Oncle, Tuteur légal..."
              data-testid="input-family-lien"
            />
            <ErrorMessage error={getFieldError('family.lienAvecEnfants')} fieldPath="family.lienAvecEnfants" />
          </div>
        )}

        <div className={styles.formField}>
          <label className={styles.fieldLabel}>
            Autorité parentale
            <span className={styles.requiredAsterisk}> *</span>
          </label>
          <div className={`${styles.checkboxGroup} ${getFieldError('family.autoriteParentale') ? styles.fieldWithError : ''}`}>
            {[
              { value: "mere", label: "Mère" },
              { value: "pere", label: "Père" },
              { value: "tiers", label: "Tiers" },
            ].map((option) => (
              <label key={option.value} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={(formData.family.autoriteParentale || []).includes(option.value)}
                  onChange={(e) => {
                    const currentValues = formData.family.autoriteParentale || [];
                    const newValues = e.target.checked
                      ? [...currentValues, option.value]
                      : currentValues.filter((v) => v !== option.value);
                    updateFamilyField("autoriteParentale", newValues);
                    clearFieldError('family.autoriteParentale');
                  }}
                  data-testid={`checkbox-autorite-${option.value}`}
                />
                <span className={styles.checkboxText}>{option.label}</span>
              </label>
            ))}
          </div>
          <ErrorMessage error={getFieldError('family.autoriteParentale')} fieldPath="family.autoriteParentale" />
        </div>

        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="family-situation">
            Situation familiale
            <span className={styles.requiredAsterisk}> *</span>
          </label>
          <input
            id="family-situation"
            type="text"
            className={`${styles.fieldInput} ${getFieldError('family.situationFamiliale') ? styles.fieldWithError : ''}`}
            value={formData.family.situationFamiliale}
            onChange={(e) => {
              updateFamilyField("situationFamiliale", e.target.value);
              clearFieldError('family.situationFamiliale');
            }}
            placeholder="Ex: Famille monoparentale, Couple, Séparés..."
            data-testid="input-family-situation"
          />
          <ErrorMessage error={getFieldError('family.situationFamiliale')} fieldPath="family.situationFamiliale" />
        </div>

        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="family-socio">
            Situation socio-professionnelle
            <span className={styles.requiredAsterisk}> *</span>
          </label>
          <input
            id="family-socio"
            type="text"
            className={`${styles.fieldInput} ${getFieldError('family.situationSocioProfessionnelle') ? styles.fieldWithError : ''}`}
            value={formData.family.situationSocioProfessionnelle}
            onChange={(e) => {
              updateFamilyField("situationSocioProfessionnelle", e.target.value);
              clearFieldError('family.situationSocioProfessionnelle');
            }}
            placeholder="Ex: Demandeur d'emploi, Salarié, RSA..."
            data-testid="input-family-socio"
          />
          <ErrorMessage error={getFieldError('family.situationSocioProfessionnelle')} fieldPath="family.situationSocioProfessionnelle" />
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
            onChange={(e) => updateFamilyField("adresse", e.target.value)}
            placeholder="Adresse complète de la famille"
            data-testid="input-family-address"
          />
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label className={styles.fieldLabel} htmlFor="family-mobile">
              Téléphone portable
              <span className={styles.requiredAsterisk}> *</span>
            </label>
            <input
              id="family-mobile"
              type="tel"
              className={`${styles.fieldInput} ${getFieldError('family.telephonePortable') ? styles.fieldWithError : ''}`}
              value={formData.family.telephonePortable}
              onChange={(e) => {
                updateFamilyField("telephonePortable", e.target.value);
                clearFieldError('family.telephonePortable');
              }}
              placeholder="06 12 34 56 78"
              data-testid="input-family-mobile"
            />
            <ErrorMessage error={getFieldError('family.telephonePortable')} fieldPath="family.telephonePortable" />
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
              onChange={(e) =>
                updateFamilyField("telephoneFixe", e.target.value)
              }
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
            onChange={(e) => updateFamilyField("email", e.target.value)}
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
            {initialData?.state === "DRAFT" || !initialData?.id
              ? "Enregistrer brouillon"
              : "Enregistrer fiche"}
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
              className={`${styles.fieldInput} ${getFieldError('referent.lastName') ? styles.fieldWithError : ''}`}
              value={formData.referent.lastName}
              onChange={(e) => {
                updateReferentField("lastName", e.target.value);
                clearFieldError('referent.lastName');
              }}
              disabled={!isReferentEditable}
              data-testid="input-referent-lastname"
            />
            <ErrorMessage error={getFieldError('referent.lastName')} fieldPath="referent.lastName" />
          </div>
          <div className={styles.formField}>
            <label className={styles.fieldLabel} htmlFor="referent-firstName">
              Prénom *
            </label>
            <input
              id="referent-firstName"
              type="text"
              className={`${styles.fieldInput} ${getFieldError('referent.firstName') ? styles.fieldWithError : ''}`}
              value={formData.referent.firstName}
              onChange={(e) => {
                updateReferentField("firstName", e.target.value);
                clearFieldError('referent.firstName');
              }}
              disabled={!isReferentEditable}
              data-testid="input-referent-firstname"
            />
            <ErrorMessage error={getFieldError('referent.firstName')} fieldPath="referent.firstName" />
          </div>
        </div>

        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="referent-structure">
            Structure d'appartenance *
          </label>
          <input
            id="referent-structure"
            type="text"
            className={`${styles.fieldInput} ${getFieldError('referent.structure') ? styles.fieldWithError : ''}`}
            value={formData.referent.structure}
            onChange={(e) => {
              updateReferentField("structure", e.target.value);
              clearFieldError('referent.structure');
            }}
            disabled={!isReferentEditable}
            data-testid="input-referent-structure"
          />
          <ErrorMessage error={getFieldError('referent.structure')} fieldPath="referent.structure" />
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label className={styles.fieldLabel} htmlFor="referent-phone">
              Téléphone *
            </label>
            <input
              id="referent-phone"
              type="tel"
              className={`${styles.fieldInput} ${getFieldError('referent.phone') ? styles.fieldWithError : ''}`}
              value={formData.referent.phone}
              onChange={(e) => {
                updateReferentField("phone", e.target.value);
                clearFieldError('referent.phone');
              }}
              disabled={!isReferentEditable}
              data-testid="input-referent-phone"
            />
            <ErrorMessage error={getFieldError('referent.phone')} fieldPath="referent.phone" />
          </div>
          <div className={styles.formField}>
            <label className={styles.fieldLabel} htmlFor="referent-email">
              Email *
            </label>
            <input
              id="referent-email"
              type="email"
              className={`${styles.fieldInput} ${getFieldError('referent.email') ? styles.fieldWithError : ''}`}
              value={formData.referent.email}
              onChange={(e) => {
                updateReferentField("email", e.target.value);
                clearFieldError('referent.email');
              }}
              disabled={!isReferentEditable}
              data-testid="input-referent-email"
            />
            <ErrorMessage error={getFieldError('referent.email')} fieldPath="referent.email" />
          </div>
        </div>

        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="referent-date">
            Date de la demande *
          </label>
          <input
            id="referent-date"
            type="date"
            className={`${styles.fieldInput} ${getFieldError('referent.requestDate') ? styles.fieldWithError : ''}`}
            value={formData.referent.requestDate}
            onChange={(e) => {
              updateReferentField("requestDate", e.target.value);
              clearFieldError('referent.requestDate');
            }}
            disabled={!isReferentEditable}
            data-testid="input-referent-date"
          />
          <ErrorMessage error={getFieldError('referent.requestDate')} fieldPath="referent.requestDate" />
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
                {draftSaved
                  ? initialData?.state === "DRAFT"
                    ? "Brouillon sauvegardé"
                    : "Fiche sauvegardée"
                  : initialData?.state === "DRAFT" || !initialData?.id
                    ? "Enregistrer brouillon"
                    : "Enregistrer fiche"}
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
                {draftSaved
                  ? initialData?.state === "DRAFT"
                    ? "Brouillon sauvegardé"
                    : "Fiche sauvegardée"
                  : initialData?.state === "DRAFT" || !initialData?.id
                    ? "Enregistrer brouillon"
                    : "Enregistrer fiche"}
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
    if (
      window.confirm(
        "Êtes-vous sûr de vouloir annuler ? Toutes les données saisies seront perdues.",
      )
    ) {
      // Reset form and go back to dashboard
      window.location.href = "/dashboard";
    }
  };

  const handleModify = () => {
    // Go back to first step with all data preserved
    setCurrentStep(0);
  };

  const handleSave = async () => {
    try {
      const userRole = user?.user?.role || user?.role;
      const currentState = initialData?.state || "DRAFT";
      const isAdmin = userRole === "ADMIN";
      const isDraft = currentState === "DRAFT";

      // Build a dynamic mapping from the technical form id → real DB id
      const cleanPropositions = Object.fromEntries(
        Object.entries(formData.workshopPropositions || {}).filter(
          ([_, v]) => (v ?? "").toString().trim()
        )
      );

      const ficheData = {
        description: formData.descriptionSituation || "",
        objectiveIds: (formData.objectives || []).map((obj) => obj.id || obj),
        // Map form data to detailed JSON fields
        referentData: formData.referent,
        familyDetailedData: formData.family,
        childrenData: formData.children,
        workshopPropositions: cleanPropositions,
        selectedWorkshops: selectedWorkshops, // Save selected workshops (checkboxes)
        participantsCount: formData.participantsCount, // Save participants count for workshops
        familyConsent: formData.familyConsent,
        referentValidation: formData.referentValidation,
        capDocuments: formData.capDocuments, // Save CAP documents
      };

      // For draft fiches or admin users, save as draft
      // For non-draft fiches with non-admin users, save without changing state
      if (isDraft || isAdmin) {
        ficheData.state = "DRAFT";
        await onSaveDraft(ficheData);
      } else {
        // For non-admin editing non-draft fiches, update without state change
        await apiRequest("PATCH", `/api/fiches/${initialData.id}`, ficheData);
        queryClient.invalidateQueries(["/api/fiches"]);
        queryClient.invalidateQueries(["/api/fiches", initialData.id]);
      }

      // Set visual feedback
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000); // Reset after 3 seconds

      const toastTitle = isDraft ? "Brouillon sauvegardé" : "Fiche sauvegardée";
      const toastDescription = isDraft
        ? "Votre fiche a été sauvegardée en brouillon avec succès."
        : "Les modifications de la fiche ont été sauvegardées avec succès.";

      toast({
        title: toastTitle,
        description: toastDescription,
        variant: "default",
      });
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Erreur de sauvegarde",
        description:
          error.message || "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
    }
  };

  // Admin-only actions
  const handleArchive = async () => {
    if (
      !window.confirm(
        "Êtes-vous sûr de vouloir archiver cette fiche ? Cette action ne peut pas être annulée.",
      )
    ) {
      return;
    }

    try {
      await transitionFiche({
        id: initialData.id,
        newState: "ARCHIVED",
        metadata: {
          archivedBy: user?.user?.id || user?.id,
          archiveDate: new Date().toISOString(),
          reason: "Admin archive action",
        },
      });

      toast({
        title: "Fiche archivée",
        description: "La fiche a été archivée avec succès.",
        variant: "default",
      });

      // Redirect to fiches list
      setTimeout(() => {
        window.location.href = "/fiches";
      }, 1000);
    } catch (error) {
      console.error("Archive error:", error);
      toast({
        title: "Erreur d'archivage",
        description:
          error.message || "Une erreur est survenue lors de l'archivage.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Êtes-vous sûr de vouloir supprimer définitivement cette fiche ? Cette action ne peut pas être annulée.",
      )
    ) {
      return;
    }

    try {
      await apiRequest("DELETE", `/api/fiches/${initialData.id}`);

      queryClient.invalidateQueries(["/api/fiches"]);

      toast({
        title: "Fiche supprimée",
        description: "La fiche a été supprimée définitivement.",
        variant: "default",
      });

      // Redirect to fiches list
      setTimeout(() => {
        window.location.href = "/fiches";
      }, 1000);
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Erreur de suppression",
        description:
          error.message || "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      });
    }
  };

  const normalizeError = (e) => {
    if (e?.response) {
      // axios-like or fetch wrapper with response
      return new Error(
        `HTTP ${e.response.status} ${e.response.statusText || ""} ` +
          `${typeof e.response.data === "string" ? e.response.data : JSON.stringify(e.response.data || {})}`,
      );
    }
    if (e instanceof Error) return e;
    try {
      return new Error(JSON.stringify(e));
    } catch {
      return new Error(String(e));
    }
  };

  const handleTransmit = async () => {
    // Prevent double submissions
    if (isSubmitting || isTransitioning) {
      console.log("⚠️ Soumission déjà en cours, clic ignoré");
      return;
    }

    console.log("🔍 DEBUG handleTransmit - Début de la validation");
    setIsSubmitting(true);

    // Clear all previous errors before validation
    clearAllErrors();

    let hasErrors = false;

    // Check specifically for family consent first
    console.log("✅ Consentement famille:", formData.familyConsent);
    if (!formData.familyConsent) {
      console.log("❌ ERREUR: Consentement famille non coché");
      setFieldError('familyConsent', 'Vous devez cocher la case de consentement de la famille avant de transmettre la fiche');
      hasErrors = true;
    }

    // Check for referent TAS validation
    console.log("✅ Validation référent TAS:", formData.referentValidation);
    if (!formData.referentValidation) {
      console.log("❌ ERREUR: Validation référent TAS non cochée");
      setFieldError('referentValidation', 'Vous devez certifier l\'exactitude des informations et valider la transmission pour signature électronique');
      hasErrors = true;
    }

    // Check that CAP document PDF is uploaded
    console.log("✅ Documents CAP:", formData.capDocuments);
    if (!formData.capDocuments || formData.capDocuments.length === 0) {
      console.log("❌ ERREUR: Aucun document CAP uploadé");
      setFieldError('capDocuments', 'Vous devez télécharger la fiche navette CAP (PDF) avant de transmettre');
      hasErrors = true;
    }

    // Run all step validations to show field-specific errors
    console.log("🔍 Validation du référent...");
    const referentValid = validateReferentStep();
    console.log("Référent valide?", referentValid);
    
    console.log("🔍 Validation de la famille...");
    const familyValid = validateFamilyStep();
    console.log("Famille valide?", familyValid);
    
    console.log("🔍 Validation des enfants...");
    const childrenValid = validateChildrenStep();
    console.log("Enfants valides?", childrenValid);
    
    console.log("🔍 Validation des besoins...");
    const besoinValid = validateBesoinStep();
    console.log("Besoins valides?", besoinValid);

    console.log("📊 RÉSUMÉ VALIDATION:");
    console.log("  - hasErrors:", hasErrors);
    console.log("  - referentValid:", referentValid);
    console.log("  - familyValid:", familyValid);
    console.log("  - childrenValid:", childrenValid);
    console.log("  - besoinValid:", besoinValid);

    if (hasErrors || !referentValid || !familyValid || !childrenValid || !besoinValid) {
      console.log("❌ VALIDATION ÉCHOUÉE - Affichage du toast d'erreur");

      // Re-enable the button since validation failed
      setIsSubmitting(false);

      // Ramener l'utilisateur à l'étape contenant l'erreur
      if (!referentValid) {
        console.log("→ Retour à l'étape 0 (Référent)");
        setCurrentStep(0);
      } else if (!familyValid) {
        console.log("→ Retour à l'étape 1 (Famille)");
        setCurrentStep(1);
      } else if (!childrenValid) {
        console.log("→ Retour à l'étape 2 (Enfants)");
        setCurrentStep(2);
      } else if (!besoinValid) {
        console.log("→ Retour à l'étape 3 (Besoins)");
        setCurrentStep(3);
      }

      // Optionally show a general toast for UX
      toast({
        title: "Erreur de validation",
        description: "Veuillez corriger les erreurs indiquées sous les champs concernés.",
        variant: "destructive",
      });
      return;
    }
    
    console.log("✅ TOUTES LES VALIDATIONS RÉUSSIES - Transmission en cours...");

    try {
      let ficheId;

      // If we have an existing fiche (initialData with id), transition its state
      if (initialData && initialData.id) {
        ficheId = initialData.id;
        await transitionFiche({
          id: initialData.id,
          newState: "SUBMITTED_TO_FEVES",
          metadata: {
            transmittedBy: user?.user?.id || user?.id,
            transmissionDate: new Date().toISOString(),
          },
        });
      } else {
        if (!onSubmit) {
          throw new Error("onSubmit prop is required to create a new fiche.");
        }

        const cleanPropositions = Object.fromEntries(
          Object.entries(formData.workshopPropositions || {}).filter(
            ([_, v]) => (v ?? "").toString().trim()
          )
        );

        const ficheData = {
          description:
            formData.description || formData.descriptionSituation || "",
          // Map form data to detailed JSON fields
          referentData: formData.referent,
          familyDetailedData: formData.family,
          childrenData: formData.children,
          workshopPropositions: cleanPropositions,
          selectedWorkshops: selectedWorkshops, // Save selected workshops (checkboxes)
          participantsCount: formData.participantsCount, // Save participants count for workshops
          familyConsent: formData.familyConsent,
          referentValidation: formData.referentValidation,
          capDocuments: formData.capDocuments, // Save CAP documents
        };


        // Create the fiche as DRAFT
        const newFiche = await onSubmit(ficheData);

        if (!newFiche || !newFiche.id) {
          // Don’t hard-crash; allow transition + redirect fallback to list.
          console.warn("onSubmit returned no id. Value was:", newFiche);
        } else {
          ficheId = newFiche.id;
        }

        // Then transition it to SUBMITTED_TO_FEVES (nouveau workflow)
        await transitionFiche({
          id: ficheId || newFiche?.id,
          newState: "SUBMITTED_TO_FEVES",
          metadata: {
            transmittedBy: user?.user?.id || user?.id,
            transmissionDate: new Date().toISOString(),
          },
        });
      }

      toast({
        title: "Fiche Validée!",
        description:
          "La fiche a été transmise avec succès à FEVES pour traitement.",
        variant: "success",
      });

      // Redirect to fiche detail page after successful submission
      setTimeout(() => {
        // If we didn’t get an id, fall back to the list page instead of throwing.
        if (ficheId) {
          window.location.href = `/fiches/${ficheId}`;
        } else {
          window.location.href = `/fiches`;
        }
      }, 2000);
    } catch (err) {
      const error = normalizeError(err, "handleTransmit");
      console.error("Transmission error:", error);
      console.error("Error details:", err);

      // Re-enable the button on error
      setIsSubmitting(false);

      // Extract detailed error information if available
      let errorMessage = "Une erreur est survenue lors de la transmission de la fiche.";
      
      if (err?.response?.data) {
        const data = err.response.data;
        console.error("Backend validation errors:", data);
        
        // If there are validation errors, show them
        if (data.errors && Array.isArray(data.errors)) {
          const errorDetails = data.errors.map(e => `${e.path?.join('.')} : ${e.message}`).join('\n');
          errorMessage = `${data.message || 'Erreur de validation'}\n\n${errorDetails}`;
        } else if (data.message) {
          errorMessage = data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Erreur de transmission",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const validateAllSteps = () => {
    if (!formData.familyConsent || !formData.referentValidation) {
      return false;
    }
    return (
      validateReferentStep() &&
      validateFamilyStep() &&
      validateChildrenStep() &&
      validateBesoinStep() &&
      validateObjectivesStep()
    );
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
            <p>
              <strong>Nom :</strong> {formData.referent.lastName}
            </p>
            <p>
              <strong>Prénom :</strong> {formData.referent.firstName}
            </p>
            <p>
              <strong>Structure :</strong> {formData.referent.structure}
            </p>
            <p>
              <strong>Téléphone :</strong> {formData.referent.phone}
            </p>
            <p>
              <strong>Email :</strong> {formData.referent.email}
            </p>
            <p>
              <strong>Date de la demande :</strong>{" "}
              {formData.referent.requestDate}
            </p>
          </div>
        </div>

        {/* Family Information */}
        <div className={styles.reviewSection}>
          <h3 className={styles.reviewSectionTitle}>
            <Users className={styles.reviewSectionIcon} />
            Informations famille
          </h3>
          <div className={styles.reviewContent}>
            {formData.family.mother && (
              <p>
                <strong>Mère :</strong> {formData.family.mother}
              </p>
            )}
            {formData.family.father && (
              <p>
                <strong>Père :</strong> {formData.family.father}
              </p>
            )}
            {formData.family.tiers && (
              <p>
                <strong>Tiers :</strong> {formData.family.tiers}
              </p>
            )}
            {formData.family.lienAvecEnfants && (
              <p>
                <strong>Lien avec les enfants :</strong>{" "}
                {formData.family.lienAvecEnfants}
              </p>
            )}
            {formData.family.autoriteParentale && formData.family.autoriteParentale.length > 0 && (
              <p>
                <strong>Autorité parentale :</strong>{" "}
                {(Array.isArray(formData.family.autoriteParentale) 
                  ? formData.family.autoriteParentale 
                  : [formData.family.autoriteParentale]
                ).map(v => ({ mere: "Mère", pere: "Père", tiers: "Tiers" }[v] || v)).join(", ")}
              </p>
            )}
            {formData.family.situationFamiliale && (
              <p>
                <strong>Situation familiale :</strong>{" "}
                {formData.family.situationFamiliale}
              </p>
            )}
            {formData.family.situationSocioProfessionnelle && (
              <p>
                <strong>Situation socio-professionnelle :</strong>{" "}
                {formData.family.situationSocioProfessionnelle}
              </p>
            )}
            {formData.family.adresse && (
              <p>
                <strong>Adresse :</strong> {formData.family.adresse}
              </p>
            )}
            {formData.family.telephonePortable && (
              <p>
                <strong>Téléphone portable :</strong>{" "}
                {formData.family.telephonePortable}
              </p>
            )}
            {formData.family.telephoneFixe && (
              <p>
                <strong>Téléphone fixe :</strong>{" "}
                {formData.family.telephoneFixe}
              </p>
            )}
            {formData.family.email && (
              <p>
                <strong>Email :</strong> {formData.family.email}
              </p>
            )}
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
                <p>
                  <strong>Nom et Prénom :</strong> {child.name}
                </p>
                <p>
                  <strong>Date de naissance :</strong> {child.dateNaissance}
                </p>
                <p>
                  <strong>Niveau scolaire :</strong> {child.niveauScolaire}
                </p>
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
            <p>
              {formData.descriptionSituation || "Aucune description fournie"}
            </p>
          </div>
        </div>

        {/* Selected Workshops */}
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
                const selectedWorkshopIds = Object.keys(selectedWorkshops).filter(
                  id => selectedWorkshops[id]
                );
                
                // Fallback for existing fiches: if no checkboxes but propositions exist
                const propositionWorkshopIds = Object.keys(formData.workshopPropositions || {}).filter(
                  id => formData.workshopPropositions[id]?.trim()
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
                const proposition = formData.workshopPropositions?.[workshopId]?.trim();
                
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

        {/* Participants Count */}
        <div className={styles.reviewSection}>
          <h3 className={styles.reviewSectionTitle}>
            <Target className={styles.reviewSectionIcon} />
            Nombre de participants
          </h3>
          <div className={styles.reviewContent}>
            <p>
              <strong>Nombre de participants :</strong> {formData.participantsCount || 1} personne{(formData.participantsCount || 1) > 1 ? 's' : ''}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              Nombre de personnes de la fiche navette qui participeront aux ateliers sélectionnés
            </p>
          </div>
        </div>

        {/* CAP Documents Upload Section */}
        <div className={styles.reviewSection}>
          <FileUpload
            title="Télécharger la fiche navette CAP *"
            onFilesChange={(files) => {
              setFormData((prev) => ({
                ...prev,
                capDocuments: files,
              }));
            }}
            initialFiles={formData.capDocuments || []}
            acceptedFormats={['.pdf', '.jpg', '.jpeg', '.png']}
            maxFileSize={10 * 1024 * 1024} // 10MB
          />
          <ErrorMessage error={getFieldError('capDocuments')} fieldPath="capDocuments" />
        </div>

        {/* Family Consent Checkbox */}
        <div className={styles.consentSection}>
          <label className={styles.consentLabel}>
            <input
              type="checkbox"
              checked={formData.familyConsent || false}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  familyConsent: e.target.checked,
                }))
              }
              className={styles.consentCheckbox}
              data-testid="checkbox-family-consent"
            />
            <span className={styles.consentText}>
              La famille a connaissance de la Fiche Navette et adhère à cet
              accompagnement.
              <span className={styles.requiredAsterisk}> *</span>
            </span>
          </label>
          <ErrorMessage error={getFieldError('familyConsent')} fieldPath="familyConsent" />
        </div>

        {/* Referent TAS Validation Checkbox */}
        <div className={styles.consentSection}>
          <label className={styles.consentLabel}>
            <input
              type="checkbox"
              checked={formData.referentValidation || false}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  referentValidation: e.target.checked,
                }))
              }
              className={styles.consentCheckbox}
              data-testid="checkbox-referent-validation"
            />
            <span className={styles.consentText}>
              En cochant cette case, je certifie l'exactitude des informations transmises et valide la transmission de la présente fiche navette pour signature électronique. Cette validation vaut engagement et signature de ma part.
              <span className={styles.requiredAsterisk}> *</span>
            </span>
          </label>
          <ErrorMessage error={getFieldError('referentValidation')} fieldPath="referentValidation" />
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
              disabled={isTransitioning || isSubmitting}
              className={`${styles.button} ${styles.buttonPrimary}`}
              data-testid="button-transmit"
            >
              {(isTransitioning || isSubmitting) ? (
                <Loader2 className={`${styles.buttonIcon} ${styles.spinner}`} />
              ) : (
                <Send className={styles.buttonIcon} />
              )}
              {(isTransitioning || isSubmitting) ? 'Transmission en cours...' : 'Transmettre'}
            </button>

            {/* Admin-only actions - only show if user is ADMIN and fiche exists */}
            {user?.user?.role === "ADMIN" && initialData?.id && (
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
                className={
                  index < steps.length - 1
                    ? styles.stepItem
                    : styles.stepItemLast
                }
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
                      <Check style={{ width: "1rem", height: "1rem" }} />
                    ) : (
                      <StepIcon style={{ width: "1rem", height: "1rem" }} />
                    )}
                  </div>
                  <div className={styles.stepText}>
                    <div
                      className={
                        isActive
                          ? styles.stepTextActive
                          : styles.stepTextInactive
                      }
                    >
                      {step.title}
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`${styles.stepConnector} ${isCompleted ? styles.stepConnectorCompleted : styles.stepConnectorDefault}`}
                  />
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
