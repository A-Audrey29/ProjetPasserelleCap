import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { UserCheck, Users, Baby, Target, Paperclip, Save, Send, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function FicheForm({ 
  initialData = null, 
  onSubmit, 
  onSaveDraft,
  isEditing = false 
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [formData, setFormData] = useState({
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

  return (
    <div className="max-w-4xl">
      {/* Référent Section */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <UserCheck className="w-5 h-5 mr-2" />
          Informations du référent
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              EPSI
            </label>
            <select 
              className="input-field"
              value={formData.epsiId}
              onChange={(e) => handleInputChange('epsiId', e.target.value)}
              required
              data-testid="select-epsi"
            >
              <option value="">Sélectionner une EPSI</option>
              {epsiList.map((epsi) => (
                <option key={epsi.id} value={epsi.id}>
                  {epsi.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Famille Section */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Informations famille
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1">
            Sélectionner une famille existante
          </label>
          <select 
            className="input-field"
            value={formData.familyId}
            onChange={(e) => {
              const familyId = e.target.value;
              const selectedFamily = families.find(f => f.id === familyId);
              handleInputChange('familyId', familyId);
              if (selectedFamily) {
                setFormData(prev => ({
                  ...prev,
                  family: {
                    code: selectedFamily.code || '',
                    address: selectedFamily.address || '',
                    phone: selectedFamily.phone || '',
                    email: selectedFamily.email || '',
                    mother: selectedFamily.mother || '',
                    father: selectedFamily.father || ''
                  }
                }));
              }
            }}
            data-testid="select-family"
          >
            <option value="">Nouvelle famille</option>
            {families.map((family) => (
              <option key={family.id} value={family.id}>
                {family.code} - {family.mother || family.father || 'Famille'}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Code famille
            </label>
            <input 
              type="text" 
              className="input-field"
              placeholder="FAM-XXX"
              value={formData.family.code}
              onChange={(e) => handleFamilyChange('code', e.target.value)}
              required
              data-testid="input-family-code"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Adresse
            </label>
            <input 
              type="text" 
              className="input-field"
              placeholder="Adresse complète"
              value={formData.family.address}
              onChange={(e) => handleFamilyChange('address', e.target.value)}
              data-testid="input-family-address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Téléphone
            </label>
            <input 
              type="tel" 
              className="input-field"
              placeholder="01 23 45 67 89"
              value={formData.family.phone}
              onChange={(e) => handleFamilyChange('phone', e.target.value)}
              data-testid="input-family-phone"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input 
              type="email" 
              className="input-field"
              placeholder="famille@example.fr"
              value={formData.family.email}
              onChange={(e) => handleFamilyChange('email', e.target.value)}
              data-testid="input-family-email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Mère
            </label>
            <input 
              type="text" 
              className="input-field"
              placeholder="Prénom Nom"
              value={formData.family.mother}
              onChange={(e) => handleFamilyChange('mother', e.target.value)}
              data-testid="input-family-mother"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Père
            </label>
            <input 
              type="text" 
              className="input-field"
              placeholder="Prénom Nom"
              value={formData.family.father}
              onChange={(e) => handleFamilyChange('father', e.target.value)}
              data-testid="input-family-father"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-foreground mb-1">
            Description de la situation
          </label>
          <textarea 
            className="input-field h-24"
            placeholder="Décrivez le contexte et les besoins de la famille..."
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            data-testid="textarea-description"
          />
        </div>
      </div>

      {/* Enfants Section */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center">
            <Baby className="w-5 h-5 mr-2" />
            Enfants
          </h2>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={handleAddChild}
            data-testid="button-add-child"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un enfant
          </button>
        </div>
        
        {formData.children.map((child, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-border rounded-md mb-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Prénom
              </label>
              <input 
                type="text" 
                className="input-field"
                placeholder="Prénom de l'enfant"
                value={child.firstName}
                onChange={(e) => handleChildChange(index, 'firstName', e.target.value)}
                data-testid={`input-child-firstname-${index}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Date de naissance
              </label>
              <input 
                type="date" 
                className="input-field"
                value={child.birthDate}
                onChange={(e) => handleChildChange(index, 'birthDate', e.target.value)}
                data-testid={`input-child-birthdate-${index}`}
              />
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Niveau scolaire
                </label>
                <input 
                  type="text" 
                  className="input-field"
                  placeholder="CP, CE1, 6ème..."
                  value={child.level}
                  onChange={(e) => handleChildChange(index, 'level', e.target.value)}
                  data-testid={`input-child-level-${index}`}
                />
              </div>
              <button
                type="button"
                className="btn btn-destructive"
                onClick={() => handleRemoveChild(index)}
                data-testid={`button-remove-child-${index}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Workshop Selection */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2" />
          Sélection d'ateliers
        </h2>
        
        {objectives.map((objective) => (
          <div key={objective.id} className="mb-6">
            <h3 className="font-medium text-foreground mb-3 flex items-center">
              <span className={`px-2 py-1 rounded text-sm mr-2 ${
                objective.code === 'OBJ1' ? 'bg-primary text-primary-foreground' :
                objective.code === 'OBJ2' ? 'bg-success text-success-foreground' :
                'bg-warning text-warning-foreground'
              }`}>
                {objective.code}
              </span>
              {objective.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workshopsByObjective[objective.id]?.map((workshop) => {
                const isSelected = formData.workshops.some(w => w.workshopId === workshop.id);
                const selection = formData.workshops.find(w => w.workshopId === workshop.id);
                
                return (
                  <label 
                    key={workshop.id}
                    className="flex items-center p-3 border border-border rounded-md hover:bg-muted/50 cursor-pointer"
                  >
                    <input 
                      type="checkbox"
                      className="mr-3"
                      checked={isSelected}
                      onChange={(e) => handleWorkshopToggle(workshop.id, e.target.checked)}
                      data-testid={`checkbox-workshop-${workshop.id}`}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{workshop.name}</div>
                      <div className="text-sm text-muted-foreground">{workshop.description}</div>
                      <div className="text-sm font-medium text-primary">
                        {formatCurrency(workshop.priceCents)}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="ml-2">
                        <label className="block text-xs text-muted-foreground mb-1">Qté</label>
                        <input
                          type="number"
                          min="1"
                          className="w-16 px-2 py-1 border border-border rounded text-sm"
                          value={selection?.qty || 1}
                          onChange={(e) => handleWorkshopQtyChange(workshop.id, e.target.value)}
                          data-testid={`input-workshop-qty-${workshop.id}`}
                        />
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between p-4 bg-muted rounded-md">
          <span className="font-medium text-foreground">Total sélectionné:</span>
          <span className="text-lg font-bold text-primary" data-testid="text-total-amount">
            {formatCurrency(calculateTotal())}
          </span>
        </div>
      </div>

      {/* Upload Section */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Paperclip className="w-5 h-5 mr-2" />
          Pièces justificatives
        </h2>
        
        <div className="upload-area">
          <Paperclip className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium mb-2">Glissez-déposez vos fichiers ici</p>
          <p className="text-sm text-muted-foreground mb-4">
            ou cliquez pour sélectionner (PDF, JPG, PNG - max 10 Mo)
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            data-testid="input-file-upload"
          />
          <label htmlFor="file-upload" className="btn btn-secondary cursor-pointer">
            Sélectionner des fichiers
          </label>
        </div>

        {formData.attachments.length > 0 && (
          <div className="mt-4 space-y-2">
            {formData.attachments.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="flex items-center">
                  <Paperclip className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({(file.size / 1024).toFixed(1)} Ko)
                  </span>
                </div>
                <button
                  type="button"
                  className="text-destructive hover:text-destructive/80"
                  onClick={() => handleRemoveAttachment(index)}
                  data-testid={`button-remove-attachment-${index}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={() => handleSubmit(true)}
          disabled={isSubmitting}
          data-testid="button-save-draft"
        >
          <Save className="w-4 h-4 mr-2" />
          Sauvegarder brouillon
        </button>
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={() => handleSubmit(false)}
          disabled={isSubmitting}
          data-testid="button-submit"
        >
          <Send className="w-4 h-4 mr-2" />
          Envoyer à FEVES
        </button>
      </div>
    </div>
  );
}
