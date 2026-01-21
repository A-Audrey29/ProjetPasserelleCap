# Documentation API Make.com - Passerelle CAP

**Version:** 1.0  
**Dernière mise à jour:** Janvier 2026

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Authentification](#authentification)
3. [Rate Limiting](#rate-limiting)
4. [Mode Test](#mode-test)
5. [Endpoints](#endpoints)
   - [POST /api/fiches](#post-apifiches)
   - [POST /api/fiches/:id/documents](#post-apifichesiddocuments)
6. [Schéma JSON complet](#schéma-json-complet)
7. [Codes d'erreur](#codes-derreur)
8. [Idempotence](#idempotence)
9. [Exemples cURL](#exemples-curl)
10. [Bonnes pratiques](#bonnes-pratiques)

---

## Vue d'ensemble

L'API Passerelle CAP permet à Make.com de créer des fiches navettes et d'uploader des documents PDF. L'API est conçue pour être **permissive** : les valeurs invalides ou vides sont ignorées silencieusement au lieu de générer des erreurs.

### URL de base

```
https://votre-domaine.replit.app
```

### Format des données

- **Requêtes:** `application/json` pour les fiches, `multipart/form-data` pour les documents
- **Réponses:** `application/json`
- **Encodage:** UTF-8

---

## Authentification

L'API utilise une authentification par clé API via le header `X-API-Key`.

### Configuration

Les clés API sont configurées dans la variable d'environnement `MAKE_API_KEYS` (séparées par des virgules pour la rotation).

```
MAKE_API_KEYS=cle1,cle2,cle3
```

### Header requis

```
X-API-Key: votre-cle-api
```

### Exemple

```bash
curl -X POST "https://votre-domaine.replit.app/api/fiches" \
  -H "X-API-Key: votre-cle-api" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### Rôle assigné

Les requêtes authentifiées par clé API reçoivent automatiquement le rôle `INTEGRATION_MAKE` avec les restrictions suivantes :
- Création de fiches uniquement en état `DRAFT`
- Upload de documents uniquement sur fiches `DRAFT`
- Pas de transitions d'état autorisées
- `capDocuments` interdit dans POST /api/fiches (utiliser l'endpoint documents)

---

## Rate Limiting

| Paramètre | Valeur |
|-----------|--------|
| Limite | 100 requêtes |
| Fenêtre | 15 minutes |
| Scope | Par adresse IP |

### Headers de réponse

Les headers utilisent le format standard (RFC 6585) :

```
RateLimit-Limit: 100
RateLimit-Remaining: 99
RateLimit-Reset: 900
Retry-After: 300
```

### Réponse si limite dépassée

**Status:** `429 Too Many Requests`

```json
{
  "message": "Trop de requêtes - Réessayez plus tard",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 300
}
```

Le champ `retryAfter` indique le nombre de secondes avant de pouvoir réessayer.

---

## Mode Test

Pour les tests avec Make.com, utilisez le header `X-Test-Mode` pour créer des fiches avec le préfixe `TEST-` au lieu de `FN-`.

### Header

```
X-Test-Mode: true
```

### Comportement

| Header X-Test-Mode | Préfixe référence |
|--------------------|-------------------|
| Absent ou `false` | `FN-2026-01-001` |
| `true` | `TEST-2026-01-001` |

### Avantages

- Les fiches TEST- peuvent être supprimées librement sans affecter les vraies fiches
- Le compteur TEST- est indépendant du compteur FN-
- Facilite les tests d'intégration

### Nettoyage des fiches test

```sql
DELETE FROM fiche_navettes WHERE ref LIKE 'TEST-%';
```

---

## Endpoints

### POST /api/fiches

Crée une nouvelle fiche navette en état DRAFT.

#### URL

```
POST /api/fiches
```

#### Headers requis

| Header | Valeur | Obligatoire |
|--------|--------|-------------|
| `X-API-Key` | Votre clé API | Oui |
| `Content-Type` | `application/json` | Oui |
| `X-Test-Mode` | `true` | Non (mode test) |

#### Corps de la requête

Voir [Schéma JSON complet](#schéma-json-complet) pour tous les champs.

**Champ obligatoire pour Make.com :**
- `externalId` : Identifiant unique externe pour la déduplication

#### Réponse succès

**Status:** `201 Created`

```json
{
  "id": "4efba60b-df80-437c-a887-82993dd9f397",
  "ref": "FN-2026-01-004",
  "state": "DRAFT",
  "externalId": "make-scenario-12345",
  "createdAt": "2026-01-21T18:04:02.000Z"
}
```

#### Réponses erreur

| Status | Code | Description |
|--------|------|-------------|
| 400 | `CAPDOCUMENTS_NOT_ALLOWED` | capDocuments interdit via API key |
| 400 | `EXTERNAL_ID_REQUIRED` | externalId obligatoire pour Make |
| 409 | `DUPLICATE_EXTERNAL_ID` | Fiche avec cet externalId existe déjà |
| 429 | `RATE_LIMIT_EXCEEDED` | Trop de requêtes |

---

### POST /api/fiches/:id/documents

Upload un document PDF sur une fiche existante.

#### URL

```
POST /api/fiches/{ficheId}/documents
```

#### Headers requis

| Header | Valeur | Obligatoire |
|--------|--------|-------------|
| `X-API-Key` | Votre clé API | Oui |
| `Content-Type` | `multipart/form-data` | Oui |
| `X-Idempotency-Key` | UUID unique | Recommandé |

#### Corps de la requête

| Champ | Type | Description |
|-------|------|-------------|
| `file` | binary | Fichier PDF (max 10 MB) |

#### Validation du fichier

- **Format:** PDF uniquement (magic bytes `%PDF-` vérifiés)
- **Taille max:** 10 MB
- **Nom:** Conservé depuis le fichier uploadé

#### Réponse succès

**Status:** `201 Created`

```json
{
  "message": "Document uploadé avec succès",
  "document": {
    "url": "/uploads/4efba60b-df80-437c-a887-82993dd9f397/abc123.pdf",
    "name": "attestation.pdf",
    "size": 245789,
    "mime": "application/pdf"
  }
}
```

#### Réponses erreur

| Status | Code | Description |
|--------|------|-------------|
| 400 | `FILE_REQUIRED` | Fichier requis |
| 400 | `INVALID_MIME_TYPE` | Seuls les fichiers PDF sont acceptés |
| 400 | `INVALID_IDEMPOTENCY_KEY` | X-Idempotency-Key invalide (vide ou trop long) |
| 403 | `FICHE_NOT_DRAFT` | Fiche n'est pas en état DRAFT |
| 404 | `FICHE_NOT_FOUND` | Fiche non trouvée |
| 409 | `IDEMPOTENCY_KEY_MISMATCH` | Clé idempotence déjà utilisée avec fichier différent |
| 413 | `FILE_TOO_LARGE` | Fichier trop volumineux (max 10 MB) |
| 500 | `UPLOAD_ERROR` | Erreur lors de l'upload |

---

## Schéma JSON complet

### Structure principale

```json
{
  "externalId": "make-scenario-12345",
  "participantsCount": 2,
  "description": "Description optionnelle",
  "referentData": { ... },
  "familyDetailedData": { ... },
  "childrenData": [ ... ],
  "selectedWorkshops": { ... },
  "workshopPropositions": { ... },
  "familyConsent": true,
  "referentValidation": false
}
```

### Champs racine

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `externalId` | string | **Oui** (Make) | Identifiant unique externe (max 255 chars) |
| `participantsCount` | number | Non | Nombre de participants (1-10, défaut: 1) |
| `description` | string | Non | Description libre (max 5000 chars, tronqué si plus long) |
| `familyConsent` | boolean | Non | Consentement famille |
| `referentValidation` | boolean | Non | Validation référent (défaut: false) |

### referentData (objet)

Informations sur le référent qui fait la demande.

```json
{
  "referentData": {
    "lastName": "Dupont",
    "firstName": "Marie",
    "structure": "CAF de Paris",
    "phone": "0612345678",
    "email": "marie.dupont@caf.fr",
    "requestDate": "2026-01-15"
  }
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `lastName` | string | Nom |
| `firstName` | string | Prénom |
| `structure` | string | Structure/organisme |
| `phone` | string | Téléphone |
| `email` | string | Email (validé, ignoré si invalide) |
| `requestDate` | string | Date de demande (format YYYY-MM-DD) |

### familyDetailedData (objet)

Informations détaillées sur la famille.

```json
{
  "familyDetailedData": {
    "mother": "Sophie Martin",
    "father": "Jean Martin",
    "tiers": "",
    "lienAvecEnfants": "Parents",
    "autoriteParentale": ["mere", "pere"],
    "situationFamiliale": "Mariés",
    "situationSocioProfessionnelle": "Employés",
    "adresse": "12 rue de la Paix, 75001 Paris",
    "email": "famille.martin@email.com",
    "telephonePortable": "0612345678",
    "telephoneFixe": "0112345678",
    "code": "75001"
  }
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `mother` | string | Nom de la mère |
| `father` | string | Nom du père |
| `tiers` | string | Nom du tiers (si applicable) |
| `lienAvecEnfants` | string | Lien avec les enfants |
| `autoriteParentale` | array | Valeurs: `["mere"]`, `["pere"]`, `["tiers"]`, ou combinaison |
| `situationFamiliale` | string | Situation familiale |
| `situationSocioProfessionnelle` | string | Situation socio-professionnelle |
| `adresse` | string | Adresse complète |
| `email` | string | Email famille |
| `telephonePortable` | string | Téléphone portable |
| `telephoneFixe` | string | Téléphone fixe |
| `code` | string | Code postal |

**Note:** `autoriteParentale` accepte les valeurs en majuscules ou minuscules, elles sont automatiquement normalisées.

### childrenData (tableau)

Liste des enfants (max 15). Les entrées avec nom vide/invalide sont automatiquement filtrées.

```json
{
  "childrenData": [
    {
      "name": "Lucas Martin",
      "birthYear": 2015,
      "niveauScolaire": "CM1"
    },
    {
      "name": "Emma Martin",
      "birthYear": 2018,
      "niveauScolaire": "CP"
    }
  ]
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `name` | string | Nom de l'enfant |
| `birthYear` | number | Année de naissance (1900-2030) |
| `niveauScolaire` | string | Niveau scolaire |

**Comportement permissif :**
- Un enfant sans `name` valide est automatiquement ignoré
- `birthYear` invalide → ignoré (pas l'enfant entier)
- Placeholders ("null", "n/a", "-") → traités comme vide

### selectedWorkshops (objet)

Ateliers sélectionnés (max 50). Clé = code atelier, valeur = booléen.

```json
{
  "selectedWorkshops": {
    "ATL1": true,
    "ATL2": true,
    "ATL3": false,
    "ATL4": true,
    "ATL5": false,
    "ATL6": true,
    "ATL7": false,
    "ATL8": true,
    "ATL9": false,
    "ATL10": true,
    "ATL11": false
  }
}
```

**Ateliers disponibles :**

| Code | Atelier |
|------|---------|
| ATL1 | Accompagnement à la scolarité |
| ATL2 | Animation collective famille |
| ATL3 | Atelier parent |
| ATL4 | Atelier enfant |
| ATL5 | Médiation familiale |
| ATL6 | Espace rencontre |
| ATL7 | Aide aux vacances familiales |
| ATL8 | Accompagnement social |
| ATL9 | Insertion professionnelle |
| ATL10 | Soutien à la parentalité |
| ATL11 | Autre |

### workshopPropositions (objet)

Propositions pour les ateliers (max 50, texte max 500 chars).

```json
{
  "workshopPropositions": {
    "ATL1": "Soutien scolaire le mercredi après-midi",
    "ATL11": "Atelier cuisine familiale"
  }
}
```

---

## Codes d'erreur

### Erreurs d'authentification (401)

| Code | Message |
|------|---------|
| `UNAUTHORIZED` | Non autorisé - Token manquant |
| `INVALID_API_KEY` | Clé API invalide |

### Erreurs de validation (400)

| Code | Message |
|------|---------|
| `CAPDOCUMENTS_NOT_ALLOWED` | capDocuments interdit via API key. Utiliser POST /api/fiches/:id/documents |
| `EXTERNAL_ID_REQUIRED` | externalId obligatoire pour intégration Make |
| `FILE_REQUIRED` | Fichier requis |
| `INVALID_MIME_TYPE` | Seuls les fichiers PDF sont acceptés |
| `INVALID_IDEMPOTENCY_KEY` | X-Idempotency-Key invalide (vide ou trop long) |
| - | Données invalides (message générique sans code) |

**Note:** Avec la validation permissive, la plupart des erreurs de validation ne se produisent plus. Les valeurs invalides sont simplement ignorées.

### Erreurs de conflit (409)

| Code | Message |
|------|---------|
| `DUPLICATE_EXTERNAL_ID` | Fiche avec cet externalId existe déjà |
| `IDEMPOTENCY_KEY_MISMATCH` | Clé idempotence déjà utilisée avec fichier différent |

### Erreurs de ressource (403/404)

| Code | Message |
|------|---------|
| `FICHE_NOT_FOUND` | Fiche non trouvée |
| `FICHE_NOT_DRAFT` | Action interdite - La fiche n'est pas en état DRAFT |

### Erreurs de limite (413/429)

| Code | Message |
|------|---------|
| `FILE_TOO_LARGE` | Fichier trop volumineux (max 10 MB) |
| `RATE_LIMIT_EXCEEDED` | Trop de requêtes - Réessayez plus tard |

### Erreurs serveur (500)

| Code | Message |
|------|---------|
| `UPLOAD_ERROR` | Erreur lors de l'upload |
| - | Erreur interne du serveur (sans code) |

**Note:** Les erreurs 500 ne contiennent généralement pas de code spécifique, sauf pour `UPLOAD_ERROR`.

---

## Idempotence

Pour garantir la sécurité des retries, utilisez le header `X-Idempotency-Key` lors de l'upload de documents.

### Fonctionnement

1. Envoyez une requête avec `X-Idempotency-Key: <uuid-unique>`
2. Le serveur stocke la clé + hash du fichier pendant 24h
3. **Même clé + même fichier** → réponse cachée avec status `200` (IDEMPOTENT_RETRY)
4. **Même clé + fichier différent** → erreur `409` avec code `IDEMPOTENCY_KEY_MISMATCH`
5. **Nouvelle clé** → upload normal avec status `201`

### Exemple

```bash
curl -X POST "https://votre-domaine.replit.app/api/fiches/xxx/documents" \
  -H "X-API-Key: votre-cle" \
  -H "X-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -F "file=@document.pdf"
```

### Durée de vie

Les clés d'idempotence expirent après **24 heures**.

---

## Exemples cURL

### Créer une fiche (production)

```bash
curl -X POST "https://votre-domaine.replit.app/api/fiches" \
  -H "X-API-Key: votre-cle-api" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "make-scenario-12345",
    "participantsCount": 2,
    "referentData": {
      "lastName": "Dupont",
      "firstName": "Marie",
      "structure": "CAF de Paris",
      "email": "marie.dupont@caf.fr",
      "requestDate": "2026-01-15"
    },
    "familyDetailedData": {
      "mother": "Sophie Martin",
      "father": "Jean Martin",
      "autoriteParentale": ["mere", "pere"],
      "adresse": "12 rue de la Paix, 75001 Paris",
      "email": "famille.martin@email.com",
      "telephonePortable": "0612345678",
      "code": "75001"
    },
    "childrenData": [
      {
        "name": "Lucas Martin",
        "birthYear": 2015,
        "niveauScolaire": "CM1"
      }
    ],
    "selectedWorkshops": {
      "ATL1": true,
      "ATL4": true
    },
    "familyConsent": true
  }'
```

### Créer une fiche (mode test)

```bash
curl -X POST "https://votre-domaine.replit.app/api/fiches" \
  -H "X-API-Key: votre-cle-api" \
  -H "X-Test-Mode: true" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "test-123",
    "participantsCount": 1
  }'
```

### Uploader un document PDF

```bash
curl -X POST "https://votre-domaine.replit.app/api/fiches/4efba60b-df80-437c-a887-82993dd9f397/documents" \
  -H "X-API-Key: votre-cle-api" \
  -H "X-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -F "file=@attestation.pdf"
```

### Exemple avec données vides/invalides (validation permissive)

```bash
curl -X POST "https://votre-domaine.replit.app/api/fiches" \
  -H "X-API-Key: votre-cle-api" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "make-test-456",
    "participantsCount": "invalid",
    "referentData": {
      "email": "not-an-email",
      "phone": "null"
    },
    "familyDetailedData": {
      "code": "n/a",
      "autoriteParentale": ["MERE", "invalid", "PERE"]
    },
    "childrenData": [
      {"name": "", "birthYear": 2015},
      {"name": "null", "birthYear": 2018},
      {"name": "Lucas", "birthYear": "invalid"}
    ]
  }'
```

**Résultat :**
- `participantsCount` → 1 (défaut)
- `referentData.email` → ignoré (invalide)
- `referentData.phone` → ignoré ("null")
- `familyDetailedData.code` → ignoré ("n/a")
- `autoriteParentale` → `["mere", "pere"]` (normalisé, "invalid" filtré)
- Premier enfant → ignoré (nom vide)
- Deuxième enfant → ignoré (nom = "null")
- Troisième enfant → gardé, `birthYear` ignoré

---

## Bonnes pratiques

### 1. Toujours utiliser externalId

```json
{
  "externalId": "make-scenario-{{scenarioId}}-{{timestamp}}"
}
```

Cela permet :
- La déduplication automatique
- Le tracking des créations depuis Make.com
- La corrélation entre Make et Passerelle CAP

### 2. Utiliser le mode test pour le développement

```
X-Test-Mode: true
```

Cela crée des fiches `TEST-*` que vous pouvez supprimer librement.

### 3. Implémenter la gestion des erreurs

```javascript
// Dans Make.com - Error Handler
if (statusCode === 409 && errorCode === "DUPLICATE_EXTERNAL_ID") {
  // Fiche déjà créée, continuer avec existingFicheId
  return existingFicheId;
}
```

### 4. Utiliser X-Idempotency-Key pour les uploads

```
X-Idempotency-Key: {{$uuid}}
```

Protège contre les doubles uploads en cas de timeout/retry.

### 5. Ne pas envoyer capDocuments

Le champ `capDocuments` est **interdit** dans POST /api/fiches via API key. Utilisez l'endpoint `/api/fiches/:id/documents` après création.

### 6. Gérer les valeurs vides

L'API accepte les placeholders Make.com :
- `""` (vide)
- `"null"`
- `"n/a"`, `"na"`, `"none"`
- `"-"`
- `"undefined"`

Ces valeurs sont automatiquement converties en `undefined`.

---

## Support

Pour toute question sur l'intégration :
1. Vérifiez les logs dans l'interface d'administration Passerelle CAP
2. Consultez les erreurs retournées par l'API
3. Utilisez le mode test pour valider vos scénarios

---

*Documentation générée pour Passerelle CAP - Janvier 2026*
