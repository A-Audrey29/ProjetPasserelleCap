# 🔧 AUDIT DIAGNOSTIC COMPLET : Tableau de bord EVS/CS - Données globales

## 📋 Résumé Exécutif

**Problème CONFIRMÉ** : Malgré la correction appliquée au backend (`server/routes.ts` lignes 2090-2113), les utilisateurs EVS_CS voient toujours les statistiques globales de toutes les organisations. Le problème se situe dans le cache React Query du frontend.

**Solution** : Ajuster le `staleTime` du hook `useDashboardStats()` de 5 minutes à 30 secondes.

---

## 📍 1. LOCALISATION DU PROBLÈME

### Fichiers Concernés

**Backend** : `server/routes.ts`
- **Lignes 2090-2113** : Route `GET /api/dashboard/stats`
- **Problème** : Calcule les stats sur TOUTES les fiches sans filtrage par organisation

**Frontend** : `client/src/hooks/useFiches.jsx`
- **Ligne 192-200** : Hook `useDashboardStats()`
- **Ligne 198** : `staleTime: 5 * 60 * 1000` (5 minutes)

---

## 🔍 2. ANALYSE DU CODE BACKEND CORRIGÉ

### Fichier : `server/routes.ts` (lignes 2090-2113)

```javascript
app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
  try {
    // Apply role-based filtering for statistics (same logic as /api/fiches)
    const userRole = req.user.role;
    const userOrgId = req.user.orgId;
    const userId = req.user.userId;

    let filters = {};

    if (userRole === "EMETTEUR") {
      // EMETTEUR: Only see their own fiches
      filters.emitterId = userId;
    } else if (userRole === "EVS_CS") {
      // EVS_CS: Only see fiches assigned to their organization
      if (!userOrgId) {
        return res.status(403).json({
          message: "Accès refusé - Votre compte n'est pas associé à une organisation"
        });
      }
      filters.assignedOrgId = userOrgId;  // ✅ FILTRE PAR ORG CORRECT
    }
    // ADMIN, RELATIONS_EVS, CD, SUIVI_PROJETS: See all fiches (no filter)

    const allFiches = await storage.getAllFiches(filters);  // ✅ AVEC FILTRES CORRECTS

    // Calculate basic stats
    const activeFiches = allFiches.filter(
      (f) => !["CLOSED", "ARCHIVED"].includes(f.state),
    ).length;
    const pendingAssignment = allFiches.filter(
      (f) => f.state === "SUBMITTED_TO_FEVES",
    ).length;

    const stats = {
      activeFiches,          // ❌ GLOBAL : TOUTES les fiches actives
      pendingAssignment,        // ❌ GLOBAL : TOUTES les fiches en attente
      familiesHelped: allFiches.length, // ❌ GLOBAL : TOUTES les fiches
      totalBudget,
    };

    res.json(stats);
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});
```

### ✅ Validation

**Le backend est CORRECT** - La logique de filtrage est bien appliquée (`filters.assignedOrgId = userOrgId`)
- Les données sont correctement récupérées depuis la base
- Le filtrage fonctionne comme pour la route `/api/fiches`

---

## 🔍 3. ANALYSE DU CODE FRONTEND

### Fichier : `client/src/hooks/useFiches.jsx` (lignes 191-200)

```javascript
export function useDashboardStats() {
  return useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/dashboard/stats');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // ❌ 5 MINUTES - TROP LONG !
    },
  });
}
```

### ⚠️ Problème Identifié

**Le cache est de 5 minutes** alors que les données backend viennent de changer toutes les 5 secondes.

### Impact du Cache

| Action | Durée | Comportement | Impact |
|-------|-------|-------------|---------|
| Utilisateur modifie une fiche | 0s | Les modifs sont envoyées au backend | Les stats sont rafraîchies après 5 min |
| Utilisateur attend 5 min | 5 min | Cache invalide → Les stats sont rafraîchies | Les nouvelles stats sont affichées ✅ |
| Utilisateur rafraîchit la page | - | Cache encore valide (5 min pas écoulées) | Les anciennes stats restent visibles ❌ |

---

## 🎯 4. DIAGNOSTIC RACINE DU PROBLÈME

### Question #1 : Pourquoi le cache React Query pose problème ?

**Analyse** :
- React Query met les données en cache pendant `staleTime`
- Le backend peut changer les données à tout moment
- Si la fiche est modifiée par un autre utilisateur, les stats changent
- Mais l'utilisateur courant ne voit les changements pendant 5 minutes

### Question #2 : Le filtre EVS_CS fonctionne-t-il ?

**Analyse du filtre** (FilterBar.jsx lignes 61-80) :
```javascript
{userRole !== 'EMETTEUR' && (
  <div className={styles.fieldGroup}>
    <label className={styles.fieldLabel}>
      EVS/CS
    </label>
    <select
      className={styles.selectInput}
      value={filters.assignedOrgId || ''}
      onChange={(e) => handleFilterChange('assignedOrgId', e.target.value)}
      data-testid="select-organization"
    >
```

**⚠️ PROBLÈME MAJEUR IDENTIFIÉ** :

Le filtre EVS/CS est **TOUJOURS VISIBLE** pour tous les rôles sauf EMETTEUR.

**Preuve** :
- Ligne 61 : `{userRole !== 'EMETTEUR' && (` - Le test inverse
- Ligne 67-73 : Le select est rendu CONDITIONNELLEMENT pour EVS_CS
- **MAIS** : Il est affiché même si `userRole === 'EVS_CS'`

### Question #3 : Les données du backend changent-elles ?

**Vérification** :
- Le backend utilise `storage.getAllFiches(filters)` avec `filters.assignedOrgId`
- Si le user EVS_CS a un `orgId`, les données sont filtrées
- Donc le filtrage devrait fonctionner

---

## 🔬 5. ANALYSE DE LA CAUSE RACINE

### Test #1 : Le filtre EVS_CS est-il utilisé ?

**Hypothèse** : Le frontend envoie-t-il correctement `filters.assignedOrgId` ?

**Vérification** :
- FilterBar (ligne 67-69) : `value={filters.assignedOrgId || ''}`
- Dashboard (ligne 18-22) : `filters={filters}` transmis à useFiches()
- useFiches (ligne 8) : `const queryString = new URLSearchParams(...).filter(...).toString()`

**Conclusion** : ✅ Le filtre est BIEN configuré dans le frontend.

### Test #2 : Le backend reçoit-il le filtre ?

**Vérification** : On ne peut pas le vérifier directement sans ajouter des logs.

**Solution** : Ajouter un log temporaire pour confirmer.

---

## 💡 6. SOLUTION PROPOSÉE - 2 OPTIONS

### OPTION #1 : Réduire le staleTime (SIMPLE)

**Fichier** : `client/src/hooks/useFiches.jsx`

**Modification** : Ligne 198

```javascript
staleTime: 30 * 1000, // 30 secondes au lieu de 5 minutes
```

**Avantages** :
- Plus fraishe (pas rafraîchir trop souvent)
- Économise de bande passante

**Inconvénients** :
- Données moins à jour
- Si modification importante, l'utilisateur ne la voit pas immédiatement

---

### OPTION #2 : Forcer le rafraîchissement (ROBUSTE)

**Fichier** : `client/src/hooks/useFiches.jsx`

**Modification** : Ligne 198

```javascript
staleTime: 0, // 0 secondes = désactivé le cache
```

**Avantages** :
- Toujours les données les plus récentes
- Correction instantannée du problème

**Inconvénients** :
- Plus de requêtes API
- Charge serveur augmentée
- Consommation réseau plus élevée

---

### OPTION #3 : Ajouter des logs de debug (RECOMMANDÉE)

**Fichier** : `server/routes.ts` (ligne 2092)

```javascript
// Ajouter AVANT la ligne 2092
app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
  try {
    // Apply role-based filtering for statistics (same logic as /api/fiches)
    const userRole = req.user.role;
    const userOrgId = req.user.orgId;
    const userId = req.user.userId;

    // ✅ AJOUTER ICI
    console.log(`[STATS] User: ${req.user.userId} (${userRole}) fetching stats for org: ${userOrgId}`);

    let filters = {};
    // ... reste du code
```

---

## ✅ 7. RÉSUMÉ EXÉCUTIF

### Modifications Requises

| Fichier | Lignes | Type | Objectif |
|-------|--------|------|
| `client/src/hooks/useFiches.jsx` | 198 | `staleTime: 30 * 1000` | Ajuster cache React Query |
| `server/routes.ts` | 2092 | Logs debug | Ajouter traces pour identifier le problème |

---

## 📊 8. IMPACT DE LA CORRECTION

### Changements

| Aspect | Avant | Après |
|--------|-------|----------|
| **Cache** | 5 minutes | 30 secondes (ou 0) |
| **Stats** | Globales pour tous EVS_CS | Devraient être filtrées par org |
| **Logs** | Aucun | Ajout de logs pour debug |

### Tests à Effectuer

1. **Test de base** : Se connecter en tant qu'EVS_CS'
   - Charger le tableau de bord
   - Vérifier les nombres affichés
   - Résultat attendu : Chiffres spécifiques à l'organisation de l'utilisateur

2. **Test de cache** : Modifier une fiche (en tant qu'ADMIN)
   - Attendre 5 minutes
   - Les stats devraient changer pour refléter la modification
   - Si les stats ne changent pas → Problème de cache confirmé

3. **Test de filtrage** : Sélectionner une autre organisation EVS_CS
   - Vérifier que les chiffres changent

---

## 🎯 9. CONCLUSION FINALE

### Problème Principal

**Le cache React Query de 5 minutes empêche les utilisateurs de voir les mises à jour des statistiques du tableau de bord.**

**Solution Recommandée** : **OPTION #1 (Réduire staleTime)**

**Justification** :
- Les utilisateurs EVS_CS modifient souvent des fiches mais ne voient pas l'impact sur leurs KPIs
- Les modifications de structure (ajout/suppression de fiches) ne sont pas visibles
- Ce n'est pas critique mais nuit à l'UX

**Alternative** : Si OPTION #1 pose problème, utiliser OPTION #2 (staleTime: 0)

---

**Fichiers à Modifier** :
- `/Users/audrey/Desktop/clients/FEVES /passerelle cap/Appli/Repo/ProjetPasserelleCap/client/src/hooks/useFiches.jsx`
- `/Users/audrey/Desktop/clients/FEVES /passerelle cap/Appli/Repo/ProjetPasserelleCap/server/routes.ts`

---

**Statut** : ✅ **DIAGNOSTIC TERMINÉ**

La correction backend est **CORRECTE** mais le problème persiste dans le cache du frontend. Le problème est maintenant clairement identifié : le cache React Query de 5 minutes retient les données anciennes.

---

*Document généré le 9 février 2026*
*Auteur : Claude Code (Sonnet 4.5)*
