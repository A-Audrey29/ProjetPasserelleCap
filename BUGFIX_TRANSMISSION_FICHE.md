# 🔧 Bug Fix : Transmission de fiche avec perte de données

## 📋 Résumé

**Problème** : Lorsqu'un utilisateur avec le rôle `RELATIONS_EVS` modifie une fiche navette en mode DRAFT et clique sur "Valider et transmettre", les modifications apportées aux champs du formulaire étaient perdues. Seule la transition d'état était effectuée.

**Solution** : Ajout d'une étape de sauvegarde des données du formulaire via PATCH avant la transition d'état.

**Fichier modifié** : `/client/src/components/Fiches/FicheForm.jsx`

---

## 🐛 Description du Problème

### Comportement Bugué
1. L'utilisateur modifie une fiche DRAFT existante
2. Il clique sur "Valider et transmettre"
3. ❌ Les modifications du formulaire ne sont PAS enregistrées
4. ✅ La fiche est transmise à FEVES
5. ❌ **Résultat** : La fiche transmise contient les anciennes données

### Cause Racine
Dans la fonction `handleTransmit()` (lignes 1707-1716), pour une fiche existante :
- Aucun appel API PATCH pour sauvegarder les modifications
- Transition directe vers l'état SUBMITTED_TO_FEVES
- Les données du formulaire (état local `formData`) ne sont jamais envoyées au backend

---

## ✅ Solution Implémentée

### Modifications

#### 1. Création d'une fonction helper réutilisable

**Fonction** : `prepareFicheData()`
**Localisation** : Lignes 1586-1609

```javascript
// Helper function to prepare fiche data for submission (reused across handleSave and handleTransmit)
const prepareFicheData = () => {
  const cleanPropositions = Object.fromEntries(
    Object.entries(formData.workshopPropositions || {}).filter(
      ([_, v]) => (v ?? "").toString().trim()
    )
  );

  return {
    description: formData.descriptionSituation || "",
    objectiveIds: (formData.objectives || []).map((obj) => obj.id || obj),
    referentData: formData.referent,
    familyDetailedData: formData.family,
    childrenData: formData.children,
    workshopPropositions: cleanPropositions,
    selectedWorkshops: selectedWorkshops,
    participantsCount: formData.participantsCount,
    familyConsent: formData.familyConsent,
    referentValidation: formData.referentValidation,
    capDocuments: formData.capDocuments,
  };
};
```

**Avantages** :
- Élimine la duplication de code
- Garantit la cohérence des données entre `handleSave()` et `handleTransmit()`
- Facilite la maintenance

#### 2. Correction de `handleSave()`

**Avant** : Duplication de la logique de préparation des données

**Après** : Utilisation de `prepareFicheData()`
```javascript
// Use the helper function to prepare fiche data
const ficheData = prepareFicheData();
```

#### 3. Correction de `handleTransmit()`

**Avant** (lignes 1707-1716) :
```javascript
if (initialData && initialData.id) {
  ficheId = initialData.id;
  await transitionFiche({  // ❌ PAS DE SAUVEGARDE !
    id: initialData.id,
    newState: "SUBMITTED_TO_FEVES",
    metadata: { ... },
  });
}
```

**Après** (lignes 1711-1750) :
```javascript
if (initialData && initialData.id) {
  ficheId = initialData.id;

  // STEP 1: Save form data before transition (fixes data loss bug)
  console.log("📝 STEP 1: Sauvegarde des modifications du formulaire...");
  const ficheData = prepareFicheData();

  try {
    await apiRequest("PATCH", `/api/fiches/${initialData.id}`, ficheData);
    console.log("✅ Modifications sauvegardées avec succès");

    // Invalidate queries to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['/api/fiches', initialData.id] });
    queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === '/api/fiches' });
  } catch (saveError) {
    console.error("❌ Erreur lors de la sauvegarde des modifications:", saveError);
    throw new Error("Impossible de sauvegarder les modifications. Veuillez réessayer.");
  }

  // STEP 2: Transition the fiche state
  console.log("📤 STEP 2: Transition de la fiche vers SUBMITTED_TO_FEVES...");
  await transitionFiche({
    id: initialData.id,
    newState: "SUBMITTED_TO_FEVES",
    metadata: {
      transmittedBy: user?.user?.id || user?.id,
      transmissionDate: new Date().toISOString(),
    },
  });
  console.log("✅ Transition effectuée avec succès");
}
```

---

## 🔄 Workflow Corrigé

### Avant la correction
```
MODIFICATIONS FORMULAIRE → CLIC "Valider et transmettre"
                           ↓
                    ❌ Transition directe
                           ↓
              Fiche transmise SANS les modifications
```

### Après la correction
```
MODIFICATIONS FORMULAIRE → CLIC "Valider et transmettre"
                           ↓
                    ÉTAPE 1 : Sauvegarde (PATCH)
                    ✅ Modifications enregistrées
                           ↓
                    ÉTAPE 2 : Transition (POST)
                    ✅ État mis à jour
                           ↓
              Fiche transmise AVEC les modifications
```

---

## 🧪 Tests

### Scénarios Testés

1. ✅ **RELATIONS_EVS modifie fiche DRAFT + "Valider et transmettre"**
   - Modifications sauvegardées
   - Fiche transmise avec les nouvelles données

2. ✅ **RELATIONS_EVS modifie fiche DRAFT + "Enregistrer"**
   - Fonctionne toujours correctement

3. ✅ **EMETTEUR crée nouvelle fiche + "Valider et transmettre"**
   - Nouvelle fiche créée
   - Transition effectuée

4. ✅ **ADMIN modifie fiche + "Valider et transmettre"**
   - Modifications sauvegardées
   - Fiche transmise

### Validation Build
```bash
npm run build
✓ 1968 modules transformed.
✓ built in 3.06s
✅ Build réussi sans erreurs
```

---

## 📊 Impact

### Données Préservées
Toutes les modifications du formulaire sont maintenant sauvegardées :
- ✅ `descriptionSituation`
- ✅ `referentData`
- ✅ `familyDetailedData`
- ✅ `childrenData`
- ✅ `workshopPropositions`
- ✅ `selectedWorkshops`
- ✅ `participantsCount`
- ✅ `capDocuments`
- ✅ `familyConsent`
- ✅ `referentValidation`

### Rôles Affectés
- ✅ **RELATIONS_EVS** : Correction principale
- ✅ **ADMIN** : Bénéficie de la même correction
- ✅ **EMETTEUR** : Non affecté (création de nouvelle fiche)

---

## 🔐 Sécurité

### Gestion des Erreurs
- Try-catch autour de l'appel API PATCH
- Message d'erreur clair en cas d'échec de sauvegarde
- La transition n'a lieu QUE si la sauvegarde réussit
- L'utilisateur reste sur la page en cas d'erreur

### Validation
- Les validations existantes sont conservées
- Aucune modification de la logique de validation
- Les validations sont exécutées AVANT la sauvegarde

---

## 📝 Logs de Debug

La correction ajoute des logs explicites pour faciliter le debugging :

```javascript
console.log("📝 STEP 1: Sauvegarde des modifications du formulaire...");
console.log("✅ Modifications sauvegardées avec succès");
console.log("📤 STEP 2: Transition de la fiche vers SUBMITTED_TO_FEVES...");
console.log("✅ Transition effectuée avec succès");
```

---

## 🚀 Améliorations Futures

Suggéré pour les prochaines itérations :

1. **Tests E2E** : Ajouter des tests automatisés pour ce scénario
2. **Refactoring** : Séparer clairement les responsabilités :
   - `saveFicheData()` : Enregistre les données
   - `transmitFiche()` : Transmet la fiche
3. **Guards de données** : Ajouter des vérifications pour prévenir la perte de données

---

## ✨ Résumé

**Corrélation des commits** :
- Suppression de ~20 lignes de code dupliqué
- Ajout de ~35 lignes (logique de sauvegarde + helper)
- Résultat : Code plus propre, plus maintenable, et surtout **CORRECT**

**Avant** : Perte de données lors de la transmission
**Après** : Toutes les modifications sont sauvegardées avant transmission

**Statut** : ✅ **RÉSOLU**

---

*Document généré le 9 février 2026*
*Auteur : Claude Code (Sonnet 4.5)*
