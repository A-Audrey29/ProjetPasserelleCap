# Guide Utilisateur - Processus Passerelle CAP

**Version** : 1.0  
**Date** : Octobre 2025  
**Objectif** : Comprendre le parcours d'une fiche navette et le fonctionnement des ateliers collectifs

---

## Table des matières

1. [Qu'est-ce qu'une fiche navette ?](#1-quest-ce-quune-fiche-navette)
2. [Cycle de vie d'une fiche](#2-cycle-de-vie-dune-fiche)
3. [Rôles et responsabilités](#3-rôles-et-responsabilités)
4. [Processus ateliers collectifs](#4-processus-ateliers-collectifs)
5. [Notifications reçues](#5-notifications-reçues)
6. [Scénarios pratiques](#6-scénarios-pratiques)
7. [FAQ - Questions fréquentes](#7-faq---questions-fréquentes)

---

## 1. Qu'est-ce qu'une fiche navette ?

Une **fiche navette** (ou fiche CAP) est un dossier d'accompagnement d'une famille qui parcourt plusieurs acteurs jusqu'à la réalisation d'ateliers collectifs.

### Format de référence

Chaque fiche a une référence unique affichée dans ce format :

**`FN ANNEE-MOIS-CHIFFRE`**

**Exemples** :
- `FN 2025-10-001` → Première fiche d'octobre 2025
- `FN 2025-10-012` → Douzième fiche d'octobre 2025
- `FN 2025-11-005` → Cinquième fiche de novembre 2025

Ce format court facilite la communication entre les équipes.

---

## 2. Cycle de vie d'une fiche

### 2.1 Vue d'ensemble

```
┌─────────────┐
│  ÉMETTEUR   │  1. Création
│ (TAS/FEVES) │     Brouillon
└──────┬──────┘
       │ Transmission
       ↓
┌─────────────┐
│   FEVES     │  2. Validation
│(RELATIONS_  │     Affectation EVS
│    EVS)     │
└──────┬──────┘
       │ Affectation
       ↓
┌─────────────┐
│   EVS/CS    │  3. Acceptation
│             │     Ateliers collectifs
└──────┬──────┘
       │ Réalisation
       ↓
┌─────────────┐
│  CLÔTURE    │  4. Finalisation
│  ARCHIVES   │     Traçabilité
└─────────────┘
```

### 2.2 Les 7 états actifs

| État | Icône | Signification | Qui agit ? |
|------|-------|---------------|------------|
| **Brouillon** | 📝 | Fiche en cours de création | Émetteur |
| **Envoyé FEVES** | 📤 | Fiche transmise à l'équipe FEVES | Émetteur |
| **Affecté EVS** | 📋 | Fiche assignée à une structure EVS/CS | FEVES |
| **Accepté EVS** | ✅ | Structure accepte la mission | EVS/CS |
| **Refusé EVS** | ❌ | Structure refuse (cas rare) | EVS/CS |
| **Clôturé** | 🏁 | Tous les ateliers terminés | EVS/CS ou FEVES |
| **Archivé** | 📦 | Archivage historique | FEVES |

⚠️ **Note** : 5 anciens états existent encore pour les fiches créées avant le nouveau système, mais ne sont plus utilisés.

---

## 3. Rôles et responsabilités

### 3.1 ÉMETTEUR (TAS ou FEVES)

**Mission** : Créer et transmettre les fiches navettes

**Actions possibles** :
- ✏️ Créer une nouvelle fiche (état : Brouillon)
- 📝 Remplir les informations famille
- 🎯 Sélectionner les ateliers proposés
- 📤 Transmettre la fiche à FEVES

**Notifications reçues** :
- 📧 Fiche refusée par FEVES (avec motif)

---

### 3.2 RELATIONS_EVS (Équipe FEVES)

**Mission** : Valider les fiches et affecter aux structures

**Actions possibles** :
- 👀 Consulter les fiches transmises
- ✅ Valider et affecter à un EVS/CS
- ❌ Refuser et renvoyer à l'émetteur (avec motif)
- 📦 Archiver les fiches clôturées

**Notifications reçues** :
- 📧 Nouvelle fiche transmise
- 📧 EVS accepte ou refuse l'affectation
- 📧 Contrat signé (déblocage subvention 70%)
- 📧 Atelier terminé (contrôle à planifier)
- 📧 Tous ateliers terminés (fiche clôturée)

---

### 3.3 EVS_CS (Structures d'accompagnement)

**Mission** : Accompagner les familles et organiser les ateliers

**Actions possibles** :
- 📩 Recevoir une nouvelle affectation
- ✅ Accepter ou ❌ Refuser (avec motif)
- 🎨 Organiser les ateliers collectifs
- ✍️ Signer le contrat (EVS/CS ou structure communale)
- ✔️ Marquer les ateliers comme terminés
- 📄 Uploader les bilans d'ateliers
- 🏁 Clôturer la fiche quand tout est fini

**Notifications reçues** :
- 📧 Nouvelle fiche affectée
- 📧 Atelier prêt à démarrer (seuil minimum atteint)
- 📧 Session pleine (nouvelle session créée)

---

## 4. Processus ateliers collectifs

### 4.1 Fonctionnement des sessions

**Principe** : Les ateliers se font collectivement, avec plusieurs familles ensemble.

#### Exemple : Atelier "Communication parent-enfant"

```
📊 Capacité : Minimum 5 participants / Maximum 10 participants

SESSION 1 (Pleine ✅)
├─ Fiche FN 2025-10-001 : 3 participants
├─ Fiche FN 2025-10-005 : 2 participants  
├─ Fiche FN 2025-10-008 : 3 participants
└─ Total : 8 participants → Session verrouillée

SESSION 2 (En cours ⏳)
├─ Fiche FN 2025-10-012 : 4 participants
├─ Fiche FN 2025-10-015 : 2 participants
└─ Total : 6 participants → Prêt à démarrer !

SESSION 3 (En attente ⏸️)
├─ Fiche FN 2025-10-020 : 2 participants
└─ Total : 2 participants → Attend d'autres inscriptions
```

### 4.2 Création automatique des inscriptions

**Quand ?** Dès que l'EVS/CS accepte la fiche ✅

Transition : `ASSIGNED_EVS` → `ACCEPTED_EVS`

**Comment ?**
1. ✨ **Le système lit automatiquement** les ateliers sélectionnés sur la fiche
2. ✨ **Pour chaque atelier**, il inscrit automatiquement la famille
3. ✨ **Il place la famille** dans la bonne session (selon places disponibles)
4. ✨ **Si une session est pleine**, il crée automatiquement une nouvelle session

**Vous n'avez rien à faire** : Le système gère tout automatiquement dès l'acceptation ! ✨

### 4.3 Notifications de capacité

#### 🎯 Atelier prêt (Seuil minimum atteint)

**Quand ?** La session atteint le nombre minimum de participants

**Exemple** :
```
Atelier : Communication parent-enfant
Session : 2
Participants : 6 (minimum requis : 5)
Fiches : FN 2025-10-012, FN 2025-10-015

→ Email EVS/CS : "L'atelier est prêt à démarrer !"
```

**Une seule notification par session** : Pas de spam ! 📧

---

#### 🔒 Session pleine (Capacité maximum)

**Quand ?** La session atteint la capacité maximum

**Exemple** :
```
Atelier : Communication parent-enfant
Session : 1
Participants : 10 (maximum : 10)

→ Session 1 verrouillée ✅
→ Prochaines inscriptions → Session 2
```

### 4.4 Signature des contrats

**Règle importante** : Un contrat peut être signé de 2 façons différentes (mais **jamais les deux**) :

#### Option 1 : Contrat EVS/CS ✍️

- L'EVS/CS signe directement
- Pas de document à uploader
- → FEVES reçoit notification : **"Déblocage 70% subvention"**

#### Option 2 : Contrat structure communale 📄

- Upload d'un PDF obligatoire
- Signature par une structure communale
- → FEVES reçoit notification : **"Atelier démarré"**

### 4.5 Réalisation et bilan

**Étapes** :

1. **Organiser l'atelier** avec les familles inscrites
2. **Marquer comme terminé** (cocher "Activité terminée")
3. **Uploader le bilan** (PDF ou document)
   - ⚠️ Bouton visible uniquement si activité terminée
   - ⚠️ Réservé aux utilisateurs EVS/CS

**Clôture automatique** :
- Quand TOUS les ateliers d'une fiche sont terminés
- L'EVS/CS peut clôturer la fiche
- → FEVES reçoit notification

---

## 5. Notifications reçues

### 5.1 Notifications ÉMETTEUR

| Situation | Contenu | Action attendue |
|-----------|---------|-----------------|
| 📧 Fiche refusée par FEVES | Motif du refus, référence fiche | Corriger et retransmettre |

### 5.2 Notifications RELATIONS_EVS (FEVES)

| Situation | Contenu | Action attendue |
|-----------|---------|-----------------|
| 📧 Nouvelle fiche transmise | Émetteur, structure, référence | Valider et affecter |
| 📧 EVS accepte | Nom EVS, référence | Suivi |
| 📧 EVS refuse | Nom EVS, motif, référence | Réaffecter |
| 📧 Contrat EVS signé | Atelier, session, EVS | Débloquer 70% subvention |
| 📧 Contrat Commune signé | Atelier, session, EVS | Notification démarrage |
| 📧 Atelier terminé | Atelier, session, EVS | Planifier contrôle terrain |
| 📧 Fiche clôturée | Référence | Archiver |

### 5.3 Notifications EVS_CS

| Situation | Contenu | Action attendue |
|-----------|---------|-----------------|
| 📧 Fiche affectée | Référence, lien plateforme | Accepter ou refuser |
| 📧 Atelier prêt | Atelier, session, participants, fiches | Organiser démarrage |
| 📧 Session pleine | Atelier, session | Information |

---

## 6. Scénarios pratiques

### Scénario 1 : Parcours nominal complet

**Contexte** : Famille Martin, 2 enfants, 3 participants (2 parents + 1 enfant)

1. **Émetteur TAS crée la fiche**
   - Fiche `FN 2025-10-025` (Brouillon)
   - Sélectionne 2 ateliers : "Communication" + "Sport en famille"

2. **Émetteur transmet à FEVES**
   - État : Envoyé FEVES
   - 📧 FEVES reçoit notification

3. **FEVES affecte à EVS "Les Papillons"**
   - État : Affecté EVS
   - 📧 EVS "Les Papillons" reçoit notification

4. **EVS accepte**
   - État : Accepté EVS
   - 📧 FEVES reçoit notification d'acceptation
   - ✨ **Système crée automatiquement 2 enrollments** :
     * Atelier "Communication" → Session 2 (6 participants déjà)
     * Atelier "Sport" → Session 1 (3 participants déjà)

5. **Atelier "Communication" prêt !**
   - Session 2 : 9 participants (3 + 6)
   - 📧 EVS reçoit notification "Atelier prêt"

6. **EVS signe contrat et organise les ateliers**
   - Contrat EVS signé
   - 📧 FEVES : "Déblocage 70% subvention"

7. **Ateliers réalisés**
   - EVS marque ateliers comme terminés
   - EVS uploade les 2 bilans

8. **Clôture**
   - EVS clôture la fiche (tous ateliers finis)
   - 📧 FEVES : "Fiche FN 2025-10-025 clôturée"
   - FEVES archive la fiche

**Durée moyenne** : 2-3 mois

---

### Scénario 2 : EVS refuse l'affectation

1. **Fiche `FN 2025-10-030` affectée à EVS "Soleil"**
   - 📧 EVS reçoit notification

2. **EVS refuse avec motif**
   - Motif : "Pas de place disponible actuellement"
   - État : Envoyé FEVES (retour)
   - 📧 FEVES reçoit notification de refus

3. **FEVES réaffecte à un autre EVS**
   - Nouvelle affectation à EVS "Arc-en-ciel"
   - Le processus continue normalement

---

### Scénario 3 : Session se remplit progressivement

**Atelier "Cuisine familiale"**
- Capacité : Min 8 / Max 12

```
Jour 1 : Fiche FN-001 acceptée (4 participants)
         Session 1 : 4/12 → ⏸️ En attente

Jour 3 : Fiche FN-007 acceptée (3 participants)
         Session 1 : 7/12 → ⏸️ En attente

Jour 5 : Fiche FN-012 acceptée (2 participants)
         Session 1 : 9/12 → 🎯 Prêt ! (> 8)
         📧 EVS reçoit "Atelier prêt à démarrer"

Jour 8 : Fiche FN-015 acceptée (4 participants)
         Session 1 : 13/12 → 🔒 Dépassement !
         → Session 1 verrouillée à 9 participants
         → Fiche FN-015 va en Session 2
         Session 2 : 4/12 → ⏸️ En attente
```

---

## 7. FAQ - Questions fréquentes

### ❓ Pourquoi je ne peux pas uploader le bilan ?

**Réponse** : Deux raisons possibles :

1. **L'activité n'est pas marquée terminée**
   → Cocher d'abord "Activité terminée" sur l'atelier

2. **Vous n'êtes pas EVS/CS**
   → Seules les structures EVS/CS peuvent uploader les bilans

### ❓ Combien de fiches dans une session d'atelier ?

**Réponse** : Ça dépend de la capacité et du nombre de participants par fiche.

**Exemple** :
- Capacité max : 10 participants
- Fiche A : 4 participants
- Fiche B : 3 participants
- Fiche C : 2 participants
- → Session complète avec 3 fiches (9 participants)

### ❓ Que se passe-t-il si j'accepte une fiche puis change d'avis ?

**Réponse** : Une fois acceptée, vous ne pouvez plus refuser. Contactez la FEVES pour gérer la situation.

### ❓ Les anciens états de fiches, c'est quoi ?

**Réponse** : Avant, le système suivait chaque étape individuellement par fiche :
- "Ateliers en cours"
- "Ateliers terminés"
- "Vérification programmée"
- etc.

**Maintenant**, ces étapes sont gérées au niveau des ateliers collectifs dans les sessions. C'est plus efficace et automatique !

Les anciens états restent visibles sur les fiches créées avant le changement.

### ❓ Comment savoir si un atelier est prêt ?

**Réponse** : Vous recevez un email automatique quand le seuil minimum est atteint :

📧 **"Atelier prêt à démarrer : [Nom] - Session [N]"**

Contenu :
- Nombre de participants
- Liste des fiches concernées
- Lien vers la plateforme

### ❓ Puis-je créer manuellement des sessions ?

**Réponse** : Non, c'est automatique ! 🤖

Le système :
1. ✅ Place chaque fiche dans la bonne session
2. ✅ Crée de nouvelles sessions si besoin
3. ✅ Verrouille les sessions pleines
4. ✅ Notifie quand c'est prêt

Vous n'avez qu'à accepter les fiches et organiser les ateliers !

### ❓ Différence entre contrat EVS et contrat Commune ?

**Réponse** :

| Contrat EVS/CS | Contrat structure communale |
|----------------|----------------------------|
| ✍️ Signature directe | 📄 Upload PDF obligatoire |
| Pas de document | Document requis |
| → Déblocage 70% subvention | → Notification démarrage |

⚠️ **Un seul type de contrat par atelier** (jamais les deux)

### ❓ Que veut dire "FN 2025-10-012" ?

**Réponse** :

```
FN 2025-10-012
│  │    │  │
│  │    │  └─ Numéro séquentiel (12ème fiche)
│  │    └──── Mois (Octobre)
│  └───────── Année (2025)
└──────────── Fiche Navette
```

Format court facile à communiquer au téléphone ou par email !

### ❓ Comment fermer une fiche ?

**Réponse** : Deux chemins selon le workflow :

**1. Nouveau workflow - EVS/CS clôture directement (recommandé) ✨**
- **Qui** : EVS/CS  
- **Quand** : Tous les ateliers de la fiche sont terminés  
- **Action** : Bouton "Clôturer la fiche" dans l'interface  
- **Résultat** : État `Clôturé`  
- **Notification** : FEVES reçoit notification automatique  
- **Ensuite** : FEVES archive la fiche

**2. Ancien workflow - FEVES via séquence legacy**
- **Qui** : RELATIONS_EVS (FEVES)  
- **Chemin** : ACCEPTED_EVS → CONTRACT_SIGNED → ACTIVITY_DONE → ... → CLOSED  
- **Usage** : Workflow ancien, toujours supporté pour compatibilité  
- **Note** : Nécessite passage par tous les états legacy intermédiaires

---

## Résumé visuel

```
📝 BROUILLON → Émetteur crée la fiche
    ↓ Transmission
📤 ENVOYÉ FEVES → FEVES reçoit
    ↓ Affectation
📋 AFFECTÉ EVS → EVS/CS reçoit
    ↓ Acceptation
✅ ACCEPTÉ EVS → Ateliers automatiques
    ↓ Réalisation
    ├─ 🎯 Seuil min → Notification prêt
    ├─ 🔒 Seuil max → Verrouillage
    ├─ ✍️ Contrat → Déblocage subvention
    └─ 📄 Bilans → Upload
    ↓ Terminé
🏁 CLÔTURÉ → Fiche fermée
    ↓ Archivage
📦 ARCHIVÉ → Historique
```

---

**Ce guide vous accompagne au quotidien dans l'utilisation de la plateforme Passerelle CAP**

Pour toute question, contactez l'équipe FEVES via l'onglet "Nous contacter" 📞
