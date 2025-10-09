# Documentation Technique - Processus Passerelle CAP

**Version** : 1.0  
**Date** : Octobre 2025  
**Objectif** : Documentation complète du système de gestion des fiches navettes CAP et ateliers collectifs

---

## Table des matières

1. [Vue d'ensemble de l'architecture](#1-vue-densemble-de-larchitecture)
2. [États des fiches navettes](#2-états-des-fiches-navettes)
3. [Machine à états - Transitions autorisées](#3-machine-à-états---transitions-autorisées)
4. [Système d'ateliers collectifs](#4-système-dateliers-collectifs)
5. [Notifications automatiques](#5-notifications-automatiques)
6. [Règles métier spécifiques](#6-règles-métier-spécifiques)
7. [Schémas de base de données](#7-schémas-de-base-de-données)

---

## 1. Vue d'ensemble de l'architecture

### 1.1 Rôles du système

| Rôle | Code | Description |
|------|------|-------------|
| **Administrateur** | `ADMIN` | Accès complet, peut effectuer toutes les transitions |
| **Suivi Projets** | `SUIVI_PROJETS` | Suivi et monitoring des projets |
| **Émetteur** | `EMETTEUR` | Créateur de fiches (TAS ou FEVES) |
| **Relations EVS** | `RELATIONS_EVS` | Équipe FEVES - gestion et validation |
| **EVS/CS** | `EVS_CS` | Structures d'accompagnement (EVS ou Centres Sociaux) |
| **Conseil Départemental** | `CD` | Rôle legacy - consultation uniquement |

### 1.2 Flux de données principal

```
ÉMETTEUR → RELATIONS_EVS (FEVES) → EVS/CS → Ateliers Collectifs → Clôture
```

### 1.3 Format de référence

- **Format technique** : UUID (ex: `a1b2c3d4-e5f6-...`)
- **Format utilisateur** : `FN ANNEE-MOIS-CHIFFRE` (ex: `FN 2025-10-001`)
- **Affichage frontend** : Toujours format court pour lisibilité

---

## 2. États des fiches navettes

### 2.1 États actifs (Nouveau workflow)

| État | Label | Description | Rôle responsable |
|------|-------|-------------|------------------|
| `DRAFT` | Brouillon | Fiche créée mais non transmise | EMETTEUR |
| `SUBMITTED_TO_FEVES` | Envoyé FEVES | Fiche transmise à l'équipe FEVES | EMETTEUR |
| `ASSIGNED_EVS` | Affecté EVS | Fiche assignée à une structure EVS/CS | RELATIONS_EVS |
| `ACCEPTED_EVS` | Accepté EVS | Structure EVS/CS accepte la mission | EVS_CS |
| `EVS_REJECTED` | Refusé EVS | État technique (non utilisé en pratique) | - |
| `CLOSED` | Clôturé | Tous les ateliers terminés, fiche clôturée | RELATIONS_EVS ou EVS_CS |
| `ARCHIVED` | Archivé | Fiche archivée pour traçabilité historique | RELATIONS_EVS |

**États actifs totaux** : 7

### 2.2 États legacy (Ancien workflow - Obsolètes)

| État | Label | Description | Statut |
|------|-------|-------------|--------|
| `CONTRACT_SIGNED` | Ateliers en cours | Ancien système de suivi atelier par atelier | ⚠️ Obsolète |
| `ACTIVITY_DONE` | Ateliers terminés | Ancien marqueur de fin d'activité | ⚠️ Obsolète |
| `FIELD_CHECK_SCHEDULED` | Vérification programmée | Ancien contrôle terrain | ⚠️ Obsolète |
| `FIELD_CHECK_DONE` | Vérification effectuée | Ancien contrôle validé | ⚠️ Obsolète |
| `FINAL_REPORT_RECEIVED` | Rapport final reçu | Ancien rapport de clôture | ⚠️ Obsolète |

**États legacy totaux** : 5

⚠️ **Note importante** : Les états legacy sont conservés dans la base de données pour compatibilité avec les anciennes fiches, mais ne sont **plus utilisés dans le nouveau workflow**. Le nouveau système utilise les `workshopEnrollments` pour gérer les ateliers collectivement.

### 2.3 États totaux

**Total général** : 12 états (7 actifs + 5 legacy)

---

## 3. Machine à états - Transitions autorisées

### 3.1 Matrice de transitions par rôle

#### **EMETTEUR** (TAS, FEVES émetteur)

| État actuel | États suivants autorisés | Condition |
|-------------|-------------------------|-----------|
| `DRAFT` | `SUBMITTED_TO_FEVES` | Fiche complète et validée |

**Action** : Soumission de la fiche à l'équipe FEVES

---

#### **RELATIONS_EVS** (Équipe FEVES)

| État actuel | États suivants autorisés | Condition |
|-------------|-------------------------|-----------|
| `SUBMITTED_TO_FEVES` | `ASSIGNED_EVS` | Affectation à une structure EVS/CS |
| `SUBMITTED_TO_FEVES` | `DRAFT` | Refus/Retour à l'émetteur pour corrections |
| `ACCEPTED_EVS` | `CONTRACT_SIGNED` | ⚠️ Legacy - Workflow ancien |
| `ACCEPTED_EVS` | `ARCHIVED` | Archivage direct si nécessaire |
| `CONTRACT_SIGNED` | `ACTIVITY_DONE` | ⚠️ Legacy - Workflow ancien |
| `ACTIVITY_DONE` | `FIELD_CHECK_SCHEDULED` | ⚠️ Legacy - Workflow ancien |
| `FIELD_CHECK_SCHEDULED` | `FIELD_CHECK_DONE` | ⚠️ Legacy - Workflow ancien |
| `FIELD_CHECK_DONE` | `FINAL_REPORT_RECEIVED` | ⚠️ Legacy - Workflow ancien |
| `FINAL_REPORT_RECEIVED` | `CLOSED` | ⚠️ Legacy - Workflow ancien, clôture par FEVES |
| `CLOSED` | `ARCHIVED` | Archivage final de la fiche |

**Actions principales** :
- Validation et affectation des fiches
- Refus avec motif
- Archivage final

---

#### **EVS_CS** (Structures d'accompagnement)

| État actuel | États suivants autorisés | Condition |
|-------------|-------------------------|-----------|
| `ASSIGNED_EVS` | `ACCEPTED_EVS` | Acceptation de la mission |
| `ASSIGNED_EVS` | `SUBMITTED_TO_FEVES` | Refus avec motif (retour FEVES) |
| `ACCEPTED_EVS` | `CLOSED` | **Nouveau workflow** : Clôture directe quand tous ateliers terminés |
| `CONTRACT_SIGNED` | `FIELD_CHECK_SCHEDULED` | ⚠️ Legacy - Workflow ancien |

**Actions principales** :
- Acceptation ou refus de l'affectation
- Réalisation et suivi des ateliers collectifs
- **Clôture directe** après réalisation de tous les ateliers (nouveau workflow)

---

#### **ADMIN** (Administrateur)

✅ **Peut effectuer TOUTES les transitions sans restriction**

Fonction de secours et maintenance du système.

---

### 3.2 Déclencheurs automatiques

| Transition | Déclencheur | Action automatique |
|------------|-------------|-------------------|
| `DRAFT` → `SUBMITTED_TO_FEVES` | Émetteur transmet | Notification RELATIONS_EVS |
| `SUBMITTED_TO_FEVES` → `ASSIGNED_EVS` | FEVES affecte | Notification EVS/CS |
| `SUBMITTED_TO_FEVES` → `DRAFT` | FEVES refuse | Notification émetteur |
| `ASSIGNED_EVS` → `ACCEPTED_EVS` | EVS/CS accepte | Notification FEVES + **Création automatique des enrollments** |
| `ASSIGNED_EVS` → `SUBMITTED_TO_FEVES` | EVS/CS refuse | Notification FEVES |
| `ACCEPTED_EVS` → `CLOSED` | EVS/CS clôture tous ateliers | Notification FEVES (nouveau workflow) |
| `FINAL_REPORT_RECEIVED` → `CLOSED` | FEVES clôture | Archivage (workflow legacy) |
| `CLOSED` → `ARCHIVED` | FEVES archive | Archivage historique |

---

## 4. Système d'ateliers collectifs

### 4.1 Architecture des enrollments

**Principe** : Gestion collective des ateliers par sessions au lieu du suivi individuel par fiche.

#### Table `workshops`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | varchar | Identifiant unique de l'atelier |
| `objectiveId` | varchar | Objectif pédagogique (OBJ1, OBJ2, OBJ3) |
| `name` | text | Nom de l'atelier |
| `description` | text | Description détaillée |
| `minCapacity` | integer | **Seuil minimum** pour démarrer l'atelier |
| `maxCapacity` | integer | **Capacité maximum** avant nouvelle session |

#### Table `workshopEnrollments`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | varchar | ID unique de l'enrollment |
| `ficheId` | varchar | Référence à la fiche navette |
| `workshopId` | varchar | Référence à l'atelier |
| `evsId` | varchar | Organisation EVS/CS responsable |
| `participantCount` | integer | Nombre de participants de cette fiche (1-10) |
| `sessionNumber` | integer | Numéro de session (1, 2, 3...) |
| **État session** | | |
| `isLocked` | boolean | Session verrouillée (maxCapacity atteint) |
| `minCapacityNotificationSent` | boolean | Notification "prêt" envoyée |
| **Contrats** | | |
| `contractSignedByEVS` | boolean | Contrat signé par EVS/CS |
| `contractSignedByCommune` | boolean | Contrat signé par structure communale |
| `contractCommunePdfUrl` | text | PDF du contrat communal uploadé |
| `contractSignedAt` | timestamp | Date de signature |
| **Activité** | | |
| `activityDone` | boolean | Atelier terminé |
| `activityCompletedAt` | timestamp | Date de fin d'atelier |
| **Contrôle** | | |
| `controlScheduled` | boolean | Contrôle terrain programmé |
| `controlValidatedAt` | timestamp | Date validation contrôle |
| **Bilan** | | |
| `reportUrl` | text | URL du bilan uploadé |
| `reportUploadedAt` | timestamp | Date upload du bilan |
| `reportUploadedBy` | varchar | ID utilisateur ayant uploadé |

### 4.2 Création automatique des enrollments

**Déclencheur** : Transition vers l'état `ACCEPTED_EVS` (quand EVS/CS accepte la fiche)

**Processus** :

1. **Extraction des ateliers sélectionnés**
   ```javascript
   selectedWorkshops = { "atelier-1": true, "atelier-2": true, ... }
   participantsCount = 3 // Nombre de participants
   ```

2. **Pour chaque atelier sélectionné** :
   
   a. **Vérification anti-doublon**
   ```sql
   SELECT * FROM workshopEnrollments 
   WHERE ficheId = ? AND workshopId = ?
   ```
   Si existe → Passer au suivant
   
   b. **Calcul du numéro de session**
   - Récupérer tous les enrollments pour cet atelier + EVS
   - Grouper par `sessionNumber`
   - Calculer total participants par session
   - Chercher session non-verrouillée avec place disponible
   - Si aucune → Créer nouveau numéro de session
   
   c. **Création de l'enrollment**
   ```sql
   INSERT INTO workshopEnrollments (
     ficheId, workshopId, evsId, 
     participantCount, sessionNumber,
     isLocked: false, activityDone: false, ...
   )
   ```

3. **Vérifications post-création** :
   - ✅ Vérifier si session atteint `maxCapacity` → Verrouiller
   - ✅ Vérifier si session atteint `minCapacity` → Notifier "prêt"

### 4.3 Gestion des seuils de capacité

#### **minCapacity** (Seuil minimum)

**Objectif** : Notifier quand l'atelier a assez de participants pour démarrer

**Calcul** :
```javascript
totalParticipants = SUM(participantCount) WHERE sessionNumber = N
if (totalParticipants >= minCapacity && !minCapacityNotificationSent) {
  // Envoyer notification à EVS/CS
  // Marquer flag: minCapacityNotificationSent = true
}
```

**Notification envoyée à** : EVS/CS (contactEmail de l'organisation)

**Contenu** :
- Nom de l'atelier
- Numéro de session
- Nombre de participants
- Liste des fiches concernées

**Flag** : `minCapacityNotificationSent` = `true` (envoi unique par session)

---

#### **maxCapacity** (Capacité maximum)

**Objectif** : Verrouiller la session et créer nouvelle session si besoin

**Calcul** :
```javascript
totalParticipants = SUM(participantCount) WHERE sessionNumber = N
if (totalParticipants >= maxCapacity) {
  // Verrouiller TOUS les enrollments de cette session
  UPDATE workshopEnrollments SET isLocked = true 
  WHERE sessionNumber = N
}
```

**Conséquence** : 
- Session verrouillée → Nouveaux enrollments vont en session N+1
- Notification "session pleine" (à implémenter)

### 4.4 Système multi-sessions

**Exemple concret** :

| Session | Fiches | Participants total | État |
|---------|--------|-------------------|------|
| Session 1 | FN 2025-10-001 (3p), FN 2025-10-005 (2p), FN 2025-10-008 (3p) | 8 | ✅ Verrouillée (maxCapacity=8) |
| Session 2 | FN 2025-10-012 (4p), FN 2025-10-015 (2p) | 6 | ⏳ Active (minCapacity=5 atteint) |
| Session 3 | FN 2025-10-020 (2p) | 2 | ⏸️ En attente (minCapacity=5) |

---

## 5. Notifications automatiques

### 5.1 Notifications liées aux fiches

| Événement | Déclencheur | Destinataire(s) | Contenu |
|-----------|-------------|-----------------|---------|
| **Fiche transmise à FEVES** | `DRAFT` → `SUBMITTED_TO_FEVES` | RELATIONS_EVS | Nouvelle fiche, émetteur, structure, référence |
| **Fiche refusée par FEVES** | `SUBMITTED_TO_FEVES` → `DRAFT` | EMETTEUR | Fiche refusée, motif, référence |
| **Fiche affectée EVS** | `SUBMITTED_TO_FEVES` → `ASSIGNED_EVS` | EVS/CS (contactEmail) | Nouvelle affectation, référence, lien plateforme |
| **EVS accepte** | `ASSIGNED_EVS` → `ACCEPTED_EVS` | RELATIONS_EVS | Acceptation, nom EVS, référence |
| **EVS refuse** | `ASSIGNED_EVS` → `SUBMITTED_TO_FEVES` | RELATIONS_EVS | Refus, nom EVS, motif, référence |
| **Tous ateliers terminés** | EVS/CS clôture | RELATIONS_EVS | Fiche clôturée, référence |

### 5.2 Notifications liées aux ateliers

| Événement | Déclencheur | Destinataire(s) | Contenu |
|-----------|-------------|-----------------|---------|
| **Atelier prêt** | `totalParticipants >= minCapacity` | EVS/CS | Atelier, session, nb participants, fiches |
| **Session pleine** | `totalParticipants >= maxCapacity` | EVS/CS + RELATIONS_EVS | Session verrouillée, nouvelle session créée |
| **Contrat EVS signé** | `contractSignedByEVS = true` | RELATIONS_EVS | Déblocage 70% subvention, atelier, session |
| **Contrat Commune signé** | `contractSignedByCommune = true` | RELATIONS_EVS | Notification démarrage, atelier, session |
| **Activité terminée** | `activityDone = true` | RELATIONS_EVS | Atelier terminé, contrôle à planifier |

### 5.3 Paramètres d'envoi

**Mode développement** : 
- Variable `EMAIL_INTERCEPT=true` ou `NODE_ENV=development`
- Emails interceptés et stockés dans table `emailLogs`
- Statut : `intercepted`

**Mode production** :
- SendGrid API Key configurée
- Envoi réel via SendGrid
- Statut : `sent` ou `error`

**Expéditeur** : 
- Nom : `Passerelle CAP - FEVES`
- Email : `studio.makeawave@gmail.com`

**Traçabilité** :
- Tous les emails loggés dans `emailLogs`
- Métadonnées : `ficheId`, `ficheRef`, `event`, `triggerUserId`

---

## 6. Règles métier spécifiques

### 6.1 Signature des contrats

**Règle EXCLUSIVE** : 
```
contractSignedByEVS OU contractSignedByCommune (JAMAIS les deux)
```

**Cas 1 : Contrat EVS/CS**
- EVS/CS signe directement
- `contractSignedByEVS = true`
- → Notification FEVES : **Déblocage 70% subvention**

**Cas 2 : Contrat structure communale**
- Upload PDF obligatoire (`contractCommunePdfUrl`)
- `contractSignedByCommune = true`
- → Notification FEVES : **Notification démarrage**

### 6.2 Upload du bilan d'atelier

**Condition d'affichage du bouton upload** :
```javascript
if (userRole === 'EVS_CS' && enrollment.activityDone === true) {
  // Afficher bouton upload bilan
}
```

**Contraintes** :
- ❌ Pas conditionné par `controlScheduled`
- ❌ Pas conditionné par `controlValidatedAt`
- ✅ Uniquement : rôle EVS_CS + activité terminée

**Message d'aide** :
- Si `activityDone = false` : "L'activité doit être marquée comme terminée"
- Si `userRole !== EVS_CS` : "Seuls les EVS/CS peuvent uploader le bilan"

### 6.3 Clôture de fiche

**Deux chemins possibles** :

**Option 1 : EVS/CS clôture directe (Nouveau workflow)**
```
ACCEPTED_EVS → CLOSED
```
**Rôle** : EVS_CS  
**Condition** : Tous les ateliers de la fiche sont terminés  
**Action** : Bouton "Clôturer la fiche" dans l'interface EVS/CS  
**Notification** : FEVES reçoit notification de clôture

**Option 2 : FEVES clôture via séquence legacy (Ancien workflow)**
```
ACCEPTED_EVS → CONTRACT_SIGNED → ACTIVITY_DONE → 
FIELD_CHECK_SCHEDULED → FIELD_CHECK_DONE → 
FINAL_REPORT_RECEIVED → CLOSED → ARCHIVED
```
**Rôle** : RELATIONS_EVS  
**Condition** : Séquence complète d'états legacy  
**Usage** : Workflow ancien, toujours supporté pour compatibilité

### 6.4 Workflow obsolète vs nouveau

| Ancien (Legacy) | Nouveau (Collectif) |
|-----------------|---------------------|
| États fiche : CONTRACT_SIGNED, ACTIVITY_DONE, etc. | États enrollment : activityDone, contractSigned, etc. |
| Suivi par fiche individuelle | Suivi par session collective |
| Transition d'état de fiche à chaque étape | Fiche reste ACCEPTED_EVS jusqu'à clôture |
| Contrôles terrain par fiche | Contrôles par session d'atelier |
| Pas de gestion de capacité | minCapacity/maxCapacity automatique |

---

## 7. Schémas de base de données

### 7.1 Relations principales

```
users (EMETTEUR, RELATIONS_EVS, EVS_CS)
  ↓
ficheNavettes
  ├─→ organizations (assignedOrgId)
  └─→ workshopEnrollments (ficheId)
        ├─→ workshops (workshopId)
        └─→ organizations (evsId)

workshopEnrollments
  ↔ sessionNumber (groupement logique)
  ↔ isLocked (état de verrouillage)
```

### 7.2 Index de performance

**ficheNavettes** :
- `ref` (unique)
- `state`
- `emitterId`
- `assignedOrgId`

**workshopEnrollments** :
- `(ficheId, workshopId)` - unique constraint
- `(workshopId, evsId, sessionNumber)` - session grouping
- `ficheId`, `workshopId`, `evsId` - individual indexes

**emailLogs** :
- `status`
- `createdAt`

### 7.3 Contraintes d'intégrité

1. **Anti-doublon enrollment** :
   ```sql
   UNIQUE (ficheId, workshopId)
   ```
   Une fiche ne peut s'inscrire qu'une fois à un atelier

2. **États enum strictes** :
   - `fiche_state` : 12 valeurs possibles
   - `role` : 6 rôles définis
   - `email_status` : 5 statuts possibles

3. **Référence formatée** :
   - Pattern : `FN-YYYY-MM-XXX`
   - Générée automatiquement
   - Unique par fiche

---

## Conclusion technique

### Points clés du système

1. ✅ **12 états de fiches** : 7 actifs + 5 legacy (compatibilité)
2. ✅ **Gestion collective des ateliers** : sessions multi-fiches
3. ✅ **Seuils automatiques** : minCapacity (prêt) / maxCapacity (verrouillage)
4. ✅ **12+ types de notifications** : Automatiques et traçables
5. ✅ **Règle exclusive contrats** : EVS OU Commune (jamais les deux)
6. ✅ **Audit complet** : Toutes actions loggées
7. ✅ **Format court références** : FN ANNEE-MOIS-CHIFFRE partout en frontend

### Architecture robuste

- **Séparation claire** : États fiche ≠ États ateliers
- **Scalabilité** : Système multi-sessions sans limite
- **Traçabilité** : Audit logs + Email logs complets
- **Sécurité** : RBAC strict + Validation transitions
- **UX** : Format court lisible + Notifications contextuelles

---

**Document créé pour validation du processus métier avec le client**
