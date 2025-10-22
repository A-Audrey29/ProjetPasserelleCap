# 🔒 AUDIT DE SÉCURITÉ - PASSERELLE CAP
## Production O2Switch - Analyse complète (CORRIGÉ)

**Date:** 15 octobre 2025  
**Environnement cible:** O2switch (mutualisé avancé Node.js)  
**Base de données:** PostgreSQL (migration depuis Neon)  
**Analyste:** Agent Replit  
**Version:** 1.1 (corrections architecte appliquées)

---

## 📊 RÉSUMÉ EXÉCUTIF

### Niveau de criticité global : 🟠 MODÉRÉ À ÉLEVÉ

**Failles bloquantes pour production : 3**  
**Failles importantes : 1**  
**À améliorer (sécurité) : 2**  
**À évaluer (juridique) : 1**  

### 🔴 FAILLES BLOQUANTES PRODUCTION (3)

| # | Faille | Impact | Fichier concerné |
|---|--------|--------|------------------|
| 1 | Password policy faible (6 chars) | Comptes facilement compromis | `server/utils/validation.js:5` |
| 2 | JWT_SECRET par défaut | Session hijacking possible | `server/auth.js:5` |
| 3 | Pas de rate limiting | Brute force login/DDoS API | `server/routes.ts` (global) |

### 🟠 FAILLE IMPORTANTE (1)

| # | Faille | Impact | Fichier concerné |
|---|--------|--------|------------------|
| 4 | XSS dans commentaires | Injection code malveillant | `server/routes.ts:647` |

### 🟡 À AMÉLIORER (2)

| # | Amélioration | Impact | Fichier concerné |
|---|--------------|--------|------------------|
| 5 | Path traversal uploads | Validation MIME stricte manquante | `server/routes.ts:142-187` |
| 6 | Brute force protection | Lockout automatique après échecs | `server/routes.ts:270` (login) |

### 🟡 À ÉVALUER AVEC DPO/JURISTE (1)

| # | Point | Contexte | Fichier concerné |
|---|-------|----------|------------------|
| 6 | Données sensibles en clair | PostgreSQL + HTTPS déjà actifs | `shared/schema.ts:135-138` |

**Note:** Injection SQL protégée ✅ (Drizzle ORM avec queries paramétrées)  
**Note:** Machine à états sécurisée ✅ (RBAC strict implémenté)

---

## 🔍 PHASE 1 - FAILLES CRITIQUES IMMÉDIATES

### 1.1 🔴 PASSWORD POLICY INSUFFISANTE (BLOQUANT)

**Localisation:** Multiple fichiers

**Problèmes identifiés:**
1. `server/utils/validation.js:5` - Min 1 caractère seulement
2. `client/src/components/Admin/UserForm.jsx:102` - Min 6 caractères
3. Pas de vérification complexité (majuscules, chiffres, caractères spéciaux)
4. Pas de vérification contre mots de passe communs

**✅ CORRECTIF REQUIS (PRIORITÉ 1):**

```javascript
// server/utils/validation.js
export const passwordSchema = z.string()
  .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(/[^A-Za-z0-9]/, 'Le mot de passe doit contenir au moins un caractère spécial')
  .refine(
    (password) => !COMMON_PASSWORDS.includes(password.toLowerCase()),
    'Ce mot de passe est trop commun'
  );

const COMMON_PASSWORDS = [
  'password', 'admin123', 'welcome', '12345678', 'motdepasse',
  'azerty123', 'qwerty123', 'admin2024', 'passerelle'
];

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1) // Login: pas de validation stricte
});

export const createUserSchema = z.object({
  email: z.string().email('Email invalide'),
  password: passwordSchema // Création: validation stricte
});
```

**Estimation:** 2h

---

### 1.2 🔴 JWT_SECRET FAIBLE (BLOQUANT)

**Localisation:** `server/auth.js:5`

```javascript
// ⚠️ DANGEREUX EN PRODUCTION
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
```

**✅ CORRECTIF REQUIS (PRIORITÉ 1):**

```bash
# Générer un secret sécurisé (128 caractères minimum)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Configuration O2switch (cPanel):**
1. Variables d'environnement → Ajouter `JWT_SECRET`
2. Valeur: `[secret généré ci-dessus]`
3. Ne JAMAIS commiter dans Git

```javascript
// server/auth.js - Validation stricte
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 64) {
  throw new Error('❌ JWT_SECRET must be at least 64 characters long');
}

if (JWT_SECRET.includes('dev-secret') || JWT_SECRET.includes('change')) {
  throw new Error('❌ Default JWT_SECRET detected. Change it immediately!');
}
```

**Estimation:** 1h

---

### 1.3 🔴 ABSENCE DE RATE LIMITING (BLOQUANT)

**Localisation:** `server/routes.ts` (global)

**Risques:**
- Brute force sur `/api/auth/login`
- DDoS sur API
- Épuisement ressources serveur O2switch

**✅ CORRECTIF REQUIS (PRIORITÉ 1):**

```bash
npm install express-rate-limit
```

```javascript
// server/middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';

// Rate limiter LOGIN (très strict)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives max
  message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Ne compte que les échecs
  handler: (req, res) => {
    res.status(429).json({
      message: 'Trop de tentatives. Compte temporairement bloqué.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Rate limiter API GÉNÉRALE
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requêtes/min
  message: 'Trop de requêtes. Ralentissez.',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter UPLOAD (ultra strict)
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 20, // 20 uploads/heure
  message: 'Limite d\'uploads atteinte. Réessayez dans 1 heure.',
  skipSuccessfulRequests: false
});

// server/routes.ts
import { loginLimiter, apiLimiter, uploadLimiter } from './middleware/rateLimiter.js';

app.use('/api/', apiLimiter); // Global API
app.post('/api/auth/login', loginLimiter, validateRequest(loginSchema), async (req, res) => {
  // Login logic
});

app.post('/api/fiches/upload', requireAuth, uploadLimiter, upload.single('file'), async (req, res) => {
  // Upload logic
});
```

**Estimation:** 3h

---

### 1.4 🟠 VULNÉRABILITÉ XSS (IMPORTANT)

**Localisation:** `server/routes.ts:647`, `server/services/emailService.ts:89`

**Problèmes:**
1. Commentaires stockés sans sanitization
2. Emails HTML construits avec interpolation directe

**✅ CORRECTIF REQUIS (PRIORITÉ 2):**

```bash
npm install dompurify isomorphic-dompurify
```

```javascript
// server/utils/sanitizer.js
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHTML(dirty) {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p'],
    ALLOWED_ATTR: ['href']
  });
}

export function sanitizeText(text) {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Utilisation dans routes
app.post('/api/fiches/:id/comments', requireAuth, validateRequest(commentSchema), async (req, res) => {
  const { content } = req.validatedData;
  
  const sanitizedContent = sanitizeHTML(content); // Nettoyer avant stockage
  
  const comment = await storage.createComment({
    ficheId: id,
    authorId: req.user.userId,
    content: sanitizedContent
  });
  
  res.status(201).json(comment);
});

// Emails
import { sanitizeText } from './utils/sanitizer.js';

const safeOrgName = sanitizeText(orgName);
const safeContactName = sanitizeText(contactName);

html: `<p>Bonjour ${safeContactName}</p>`
```

**Estimation:** 2h

---

### 1.5 🟡 DONNÉES SENSIBLES EN CLAIR (À ÉVALUER)

**Localisation:** `shared/schema.ts:135-138`

```typescript
// STOCKAGE ACTUEL
familyDetailedData: json("family_detailed_data"), // Noms, prénoms, adresses
childrenData: json("children_data"), // Données enfants sensibles
```

**⚠️ IMPORTANT - Ce n'est PAS un bloquant technique immédiat**

**Analyse de risque:**
- ✅ **Déjà protégé:** HTTPS/TLS en transit (Let's Encrypt O2switch)
- ✅ **Déjà protégé:** RBAC strict (accès contrôlé par rôle)
- ⚠️ **À vérifier:** O2switch PostgreSQL encryption at rest (documenter avec hébergeur)
- ❓ **Question:** Réglementation spécifique exigeant chiffrement applicatif supplémentaire ?

**SI chiffrement applicatif requis (réglementaire ou contractuel), voici le refactoring COMPLET:**

#### Option 1: Chiffrement transparent (recommandé si requis)

**ATTENTION:** Nécessite refactoring complet du schema et de tous les accesseurs

```typescript
// 1. CHANGER LE SCHEMA (shared/schema.ts)
export const ficheNavettes = pgTable("fiche_navettes", {
  // ... autres colonnes ...
  
  // ⚠️ ATTENTION: Changer de JSON → TEXT pour stocker ciphertext
  familyDetailedData: text("family_detailed_data"), // ← Était json(), devient text()
  childrenData: text("children_data"), // ← Était json(), devient text()
});

// 2. SERVICE DE CHIFFREMENT (server/services/encryptionService.js)
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY; // 32 bytes
const ENCRYPTION_IV_LENGTH = 16;

if (!ENCRYPTION_KEY || Buffer.from(ENCRYPTION_KEY, 'hex').length !== 32) {
  throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
}

export function encryptJSON(data) {
  if (!data) return null;
  const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptJSON(encryptedData) {
  if (!encryptedData) return null;
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

// 3. WRAPPER STORAGE (server/storage.ts)
import { encryptJSON, decryptJSON } from './services/encryptionService.js';

// CRÉATION FICHE
async createFiche(data) {
  return await db.insert(ficheNavettes).values({
    ...data,
    // ✅ Chiffrer avant stockage
    familyDetailedData: encryptJSON(data.familyDetailedData),
    childrenData: encryptJSON(data.childrenData)
  }).returning();
}

// LECTURE FICHE
async getFiche(id) {
  const [fiche] = await db.select().from(ficheNavettes).where(eq(ficheNavettes.id, id));
  if (!fiche) return undefined;
  
  // ✅ Déchiffrer après lecture
  return {
    ...fiche,
    familyDetailedData: decryptJSON(fiche.familyDetailedData),
    childrenData: decryptJSON(fiche.childrenData)
  };
}

// ⚠️ REFACTORER TOUS LES ACCESSEURS (getAllFiches, updateFiche, etc.)
```

**Migration des données existantes:**

```javascript
// scripts/encrypt-existing-data.js
import { db } from '../server/db.js';
import { encryptJSON } from '../server/services/encryptionService.js';

async function migrateExistingData() {
  const fiches = await db.select().from(ficheNavettes);
  
  for (const fiche of fiches) {
    if (fiche.familyDetailedData && typeof fiche.familyDetailedData === 'object') {
      await db.update(ficheNavettes)
        .set({
          familyDetailedData: encryptJSON(fiche.familyDetailedData),
          childrenData: encryptJSON(fiche.childrenData)
        })
        .where(eq(ficheNavettes.id, fiche.id));
    }
  }
  
  console.log(`✅ ${fiches.length} fiches chiffrées`);
}
```

**Coût total chiffrement:** 8-12h (schema + storage + migration + tests)

**⚠️ DÉCISION REQUISE:** 
- **OUI chiffrement** → Si exigence réglementaire/contractuelle spécifique
- **NON chiffrement** → Si protection PostgreSQL + TLS suffisante

**Recommandation:** Clarifier avec DPO/juriste avant d'implémenter

**Estimation (si requis):** 10h

---

### 1.6 🟡 PATH TRAVERSAL UPLOADS (À AMÉLIORER)

**Localisation:** `server/routes.ts:142-187`

**État actuel:**
- ✅ Validation MIME type basique (PDF only)
- ✅ Limite taille 5MB
- ❌ Pas de sanitization filename
- ❌ Pas de validation MIME réel (magic numbers)

**✅ CORRECTIF RECOMMANDÉ (PRIORITÉ 3):**

```bash
npm install file-type
```

```javascript
// server/middleware/fileValidator.js
import path from 'path';
import fs from 'fs/promises';
import { fileTypeFromBuffer } from 'file-type';

export async function validateUploadedFile(req, res, next) {
  if (!req.file) return next();
  
  const filePath = req.file.path;
  
  try {
    // 1. Vérifier MIME type réel (magic numbers)
    const buffer = await fs.readFile(filePath);
    const fileType = await fileTypeFromBuffer(buffer);
    
    const allowedTypes = ['application/pdf'];
    
    if (!fileType || !allowedTypes.includes(fileType.mime)) {
      await fs.unlink(filePath); // Supprimer fichier invalide
      return res.status(400).json({ 
        message: 'Type de fichier non autorisé. Seuls les PDF sont acceptés.' 
      });
    }
    
    // 2. Sanitize filename (prévenir path traversal)
    const safeName = path.basename(req.file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Caractères alphanumériques uniquement
      .substring(0, 100); // Limite longueur
    
    const timestamp = Date.now();
    const newFilename = `${timestamp}_${safeName}`;
    const newPath = path.join('uploads', newFilename);
    
    // 3. Renommer avec nom sécurisé
    await fs.rename(filePath, newPath);
    
    req.file.path = newPath;
    req.file.filename = newFilename;
    
    next();
  } catch (error) {
    console.error('File validation error:', error);
    await fs.unlink(filePath).catch(() => {}); // Cleanup
    res.status(500).json({ message: 'Erreur validation fichier' });
  }
}

// Utilisation
app.post('/api/upload', 
  requireAuth, 
  uploadLimiter, 
  upload.single('file'), 
  validateUploadedFile, // ✅ Validation stricte
  async (req, res) => {
    res.json({ url: `/uploads/${req.file.filename}` });
  }
);
```

**Estimation:** 2h

---

## 🔐 PHASE 2 - CONFORMITÉ RGPD (NON BLOQUANT TECHNIQUE)

### 2.1 ⚪ CONFORMITÉ RGPD (À PLANIFIER)

**État actuel:**
- ✅ Consentement familial tracé (`familyConsent` boolean)
- ✅ Audit logs complets (toutes actions tracées)
- ❌ Pas d'anonymisation automatique après 5 ans
- ❌ Pas de logs d'accès données sensibles spécifiques
- ❌ Pas d'export données (portabilité)
- ❌ Pas de droit à l'oubli fonctionnel

**⚠️ IMPORTANT:** Conformité RGPD = obligation **légale**, PAS technique

**✅ CORRECTIF RECOMMANDÉ (NON URGENT SI PAS EN PRODUCTION):**

```javascript
// server/services/gdprService.js
export class GDPRService {
  
  // 1. Anonymisation automatique (5 ans) - CRON JOB
  async anonymizeOldFiches() {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    
    const oldFiches = await db.select()
      .from(ficheNavettes)
      .where(and(
        lte(ficheNavettes.createdAt, fiveYearsAgo),
        eq(ficheNavettes.state, 'CLOSED')
      ));
    
    for (const fiche of oldFiches) {
      await db.update(ficheNavettes)
        .set({
          familyDetailedData: null,
          childrenData: null,
          referentData: null,
          description: `[Données anonymisées - RGPD - ${new Date().toISOString()}]`
        })
        .where(eq(ficheNavettes.id, fiche.id));
      
      // Audit log
      await createAuditLog({
        action: 'anonymize_gdpr',
        entityType: 'FicheNavette',
        entityId: fiche.id,
        performedBy: 'SYSTEM',
        metadata: { reason: 'Rétention 5 ans RGPD' }
      });
    }
  }
  
  // 2. Export données (portabilité)
  async exportUserData(ficheId) {
    const fiche = await storage.getFiche(ficheId);
    
    return {
      reference: fiche.ref,
      createdAt: fiche.createdAt,
      familyData: fiche.familyDetailedData,
      childrenData: fiche.childrenData,
      documents: fiche.capDocuments,
      consent: fiche.familyConsent,
      exportDate: new Date().toISOString()
    };
  }
  
  // 3. Droit à l'oubli
  async deleteUserData(ficheId, requestedBy) {
    const fiche = await storage.getFiche(ficheId);
    
    await db.update(ficheNavettes)
      .set({
        familyDetailedData: null,
        childrenData: null,
        referentData: null,
        description: '[SUPPRIMÉ - Droit à l\'oubli RGPD]',
        state: 'ARCHIVED'
      })
      .where(eq(ficheNavettes.id, ficheId));
    
    // Supprimer fichiers uploadés
    if (fiche.capDocuments) {
      for (const doc of fiche.capDocuments) {
        await fs.unlink(path.join('uploads', path.basename(doc.url)));
      }
    }
    
    await createAuditLog({
      action: 'delete_gdpr',
      entityType: 'FicheNavette',
      entityId: ficheId,
      performedBy: requestedBy,
      metadata: { reason: 'Droit à l\'oubli' }
    });
  }
}

// Cron job (tous les jours à 3h du matin)
import cron from 'node-cron';

cron.schedule('0 3 * * *', async () => {
  const gdpr = new GDPRService();
  await gdpr.anonymizeOldFiches();
  console.log('RGPD: Anonymisation automatique effectuée');
});
```

**Routes API RGPD:**

```javascript
// server/routes.ts

// Export données (portabilité)
app.get('/api/rgpd/export/:ficheId', requireAuth, async (req, res) => {
  const gdpr = new GDPRService();
  const data = await gdpr.exportUserData(req.params.ficheId);
  res.json(data);
});

// Droit à l'oubli
app.delete('/api/rgpd/delete/:ficheId', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const gdpr = new GDPRService();
  await gdpr.deleteUserData(req.params.ficheId, req.user.userId);
  res.json({ message: 'Données supprimées conformément RGPD' });
});
```

**Estimation (si requis):** 6h

---

### 2.2 ⚪ BRUTE FORCE PROTECTION AVANCÉE (OPTIONNEL)

**État actuel:** Rate limiting basique prévu (section 1.3)

**Protection supplémentaire (optionnelle):**

```javascript
// server/middleware/bruteForceProtection.js
const loginAttempts = new Map(); // IP → { count, lastAttempt, lockUntil }

export function bruteForceProtection(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const attempt = loginAttempts.get(ip) || { count: 0, lastAttempt: 0, lockUntil: 0 };
  
  // Vérifier si compte bloqué
  if (attempt.lockUntil > now) {
    const remainingSeconds = Math.ceil((attempt.lockUntil - now) / 1000);
    return res.status(429).json({
      message: `Compte temporairement bloqué. Réessayez dans ${remainingSeconds} secondes.`,
      retryAfter: remainingSeconds
    });
  }
  
  // Reset si > 15 minutes
  if (now - attempt.lastAttempt > 15 * 60 * 1000) {
    loginAttempts.delete(ip);
    return next();
  }
  
  // Bloquer après 5 tentatives
  attempt.count += 1;
  attempt.lastAttempt = now;
  
  if (attempt.count >= 5) {
    attempt.lockUntil = now + 15 * 60 * 1000;
    loginAttempts.set(ip, attempt);
    return res.status(429).json({
      message: 'Trop de tentatives. Compte bloqué 15 minutes.',
      retryAfter: 900
    });
  }
  
  loginAttempts.set(ip, attempt);
  next();
}

// Utilisation (cumul avec rate limiter)
app.post('/api/auth/login', 
  bruteForceProtection, // Protection additionnelle
  loginLimiter, 
  validateRequest(loginSchema), 
  async (req, res) => {
    // Login logic
  }
);
```

**Estimation (si souhaité):** 1h

---

## 🚀 PHASE 3 - MIGRATION O2SWITCH

### 3.1 CONNECTION POOLING (Neon → O2switch PostgreSQL)

**Problème:** Neon utilise pgBouncer (pooling automatique), O2switch PostgreSQL classique

**✅ CORRECTIF REQUIS:**

```javascript
// server/db.ts - Configuration O2switch
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

// ❌ AVANT (Neon serverless)
import { Pool, neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ✅ APRÈS (O2switch PostgreSQL)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  
  // Configuration pooling optimisée O2switch
  max: 10, // Max 10 connexions (mutualisé avancé)
  min: 2, // 2 connexions minimum
  idleTimeoutMillis: 30000, // 30s timeout idle
  connectionTimeoutMillis: 5000, // 5s timeout connexion
  
  // SSL si O2switch l'exige
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // O2switch souvent avec certificat auto-signé
  } : false,
  
  application_name: 'passerelle-cap-production'
});

// Gestion erreurs pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await pool.end();
  console.log('Pool closed gracefully');
  process.exit(0);
});

export const db = drizzle(pool, { schema });
```

**Package.json:**
```json
{
  "dependencies": {
    "pg": "^8.11.3", // ✅ PostgreSQL client classique
    "drizzle-orm": "^0.29.0"
  }
}
```

```bash
# Supprimer dépendances Neon
npm uninstall @neondatabase/serverless ws

# Installer client PostgreSQL standard
npm install pg
```

**Estimation:** 3h

---

### 3.2 CONFIGURATION APACHE REVERSE PROXY

**Fichier:** `.htaccess` (racine application O2switch)

```apache
# .htaccess - Configuration Apache pour Node.js
RewriteEngine On

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Headers de sécurité
<IfModule mod_headers.c>
  # HSTS (1 an)
  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
  
  # Protection XSS
  Header always set X-XSS-Protection "1; mode=block"
  
  # Pas de sniffing MIME
  Header always set X-Content-Type-Options "nosniff"
  
  # Clickjacking protection
  Header always set X-Frame-Options "SAMEORIGIN"
  
  # CSP (Content Security Policy)
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'"
  
  # Referrer policy
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  
  # Permissions policy
  Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
</IfModule>

# Proxy vers Node.js (port configuré dans Passenger)
PassengerEnabled on
PassengerAppType node
PassengerStartupFile server/index.ts
PassengerAppEnv production
PassengerNodejs /usr/bin/node

# Protection répertoires sensibles
<FilesMatch "^\.">
  Require all denied
</FilesMatch>

# Bloquer accès fichiers sensibles
<FilesMatch "\.(env|md|json|lock|log|ts|tsx|jsx)$">
  Require all denied
</FilesMatch>

# Cache statique
<FilesMatch "\.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$">
  Header set Cache-Control "max-age=2592000, public"
</FilesMatch>
```

**Estimation:** 2h

---

### 3.3 CONFIGURATION PASSENGER

**Fichier:** `passenger.json` (racine application)

```json
{
  "app_type": "node",
  "startup_file": "server/index.ts",
  "envvars": {
    "NODE_ENV": "production",
    "PORT": "5000"
  },
  "nodejs": {
    "version": "20"
  },
  "min_instances": 2,
  "max_pool_size": 4,
  "pool_idle_time": 300,
  "spawn_method": "smart",
  "max_requests": 1000,
  "memory_limit": 512,
  "log_level": "info"
}
```

**Estimation:** 1h

---

### 3.4 CONFIGURATION BREVO EMAIL (Production)

**✅ CORRECTIF REQUIS:**

```javascript
// server/services/emailService.ts
import nodemailer from 'nodemailer';

const isProduction = process.env.NODE_ENV === 'production';

// Configuration Brevo (production)
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY
  }
});

// Vérifier connexion au démarrage
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Brevo SMTP connection failed:', error);
  } else {
    console.log('✅ Brevo SMTP ready to send emails');
  }
});

export class EmailService {
  async send({ to, subject, html }) {
    if (!isProduction) {
      // Mode développement: logs DB
      console.log('📧 [DEV] Email intercepted:', { to, subject });
      return;
    }
    
    try {
      const info = await transporter.sendMail({
        from: {
          name: 'Passerelle CAP - FEVES',
          address: process.env.BREVO_FROM_EMAIL || 'noreply@passerellecap.fr'
        },
        to,
        subject,
        html
      });
      
      console.log('✅ Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Email send error:', error);
      throw error;
    }
  }
}
```

**Variables d'environnement O2switch (cPanel):**
```
BREVO_SMTP_USER=votre-email@domain.com
BREVO_SMTP_KEY=xkeysib-xxxxxxxxxxxxx
BREVO_FROM_EMAIL=noreply@passerellecap.fr
```

**Estimation:** 2h

---

### 3.5 LOGS & MONITORING

**✅ CORRECTIF REQUIS:**

```javascript
// server/utils/logger.js
import fs from 'fs/promises';
import path from 'path';

const logsDir = path.join(process.cwd(), 'logs');

// Créer répertoire logs
await fs.mkdir(logsDir, { recursive: true });

export class Logger {
  static async log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...metadata
    };
    
    // Console
    console.log(`[${level}] ${message}`, metadata);
    
    // Fichier (rotation journalière)
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `app-${date}.log`);
    
    await fs.appendFile(
      logFile,
      JSON.stringify(logEntry) + '\n',
      'utf8'
    );
  }
  
  static async error(message, error) {
    await this.log('ERROR', message, {
      error: error.message,
      stack: error.stack
    });
  }
  
  static async info(message, metadata) {
    await this.log('INFO', message, metadata);
  }
}

// Rotation logs (garder 30 jours)
import cron from 'node-cron';

cron.schedule('0 2 * * *', async () => {
  const files = await fs.readdir(logsDir);
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  
  for (const file of files) {
    const filePath = path.join(logsDir, file);
    const stats = await fs.stat(filePath);
    
    if (stats.mtimeMs < thirtyDaysAgo) {
      await fs.unlink(filePath);
      console.log(`Deleted old log: ${file}`);
    }
  }
});
```

**UptimeRobot configuration:**
- URL: `https://votre-sous-domaine.o2switch.net/api/health`
- Intervalle: 5 minutes

**Health check endpoint:**

```javascript
// server/routes.ts
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

**Estimation:** 2h

---

## 📋 CHECKLIST DE DÉPLOIEMENT O2SWITCH

### 🔴 BLOQUANTS (À FAIRE AVANT PRODUCTION)

- [ ] **Password policy stricte** (12 chars min + complexité)
- [ ] **JWT_SECRET sécurisé** (128 chars, généré)
- [ ] **Rate limiting** (login + API + uploads)

### 🟠 IMPORTANT (FORTEMENT RECOMMANDÉ)

- [ ] **XSS sanitization** (commentaires + emails)

### 🟡 À AMÉLIORER (SÉCURITÉ)

- [ ] **Path traversal protection** (uploads validation stricte)
- [ ] **Brute force protection** (lockout 15min après 5 tentatives)

### 🟡 À ÉVALUER (SI REQUIS)

- [ ] **Chiffrement données sensibles** (SI requis réglementaire)

### ⚪ CONFORMITÉ (PLANIFIER AVANT MISE EN PRODUCTION RÉELLE)

- [ ] **RGPD: Anonymisation auto** (cron 5 ans)
- [ ] **RGPD: Export données** (portabilité)
- [ ] **RGPD: Droit à l'oubli** (endpoint suppression)

### 🚀 MIGRATION O2SWITCH

- [ ] **Connection pooling PostgreSQL** (pg au lieu de @neondatabase/serverless)
- [ ] **Configuration Apache** (.htaccess headers sécurité)
- [ ] **Configuration Passenger** (passenger.json)
- [ ] **Brevo SMTP** (emails production)
- [ ] **Logs rotation** (30 jours)
- [ ] **Health check** (/api/health UptimeRobot)

### 🔧 CONFIGURATION SERVEUR

- [ ] **Variables environnement cPanel** (JWT_SECRET, BREVO_*, DATA_ENCRYPTION_KEY si chiffrement)
- [ ] **SSL/TLS Let's Encrypt** (auto O2switch)
- [ ] **Répertoire /logs** (permissions 755)
- [ ] **Répertoire /uploads** (permissions 755, privé)

### ✅ TESTS FINAUX

- [ ] Test charge (50 utilisateurs simultanés)
- [ ] Test rate limiting (bloquer après 5 login)
- [ ] Test upload (PDF 5MB validé)
- [ ] Test XSS (commentaire avec `<script>` bloqué)

---

## 📊 ESTIMATION TEMPS & COÛTS

### PRIORITÉ 1 - BLOQUANTS (15h)

| Tâche | Temps | Criticité |
|-------|-------|-----------|
| Password policy + validation | 2h | 🔴 |
| JWT_SECRET production | 1h | 🔴 |
| Rate limiting (login + API + uploads) | 3h | 🔴 |
| Connection pooling PostgreSQL | 3h | 🔴 |
| Configuration Apache/Passenger | 2h | 🔴 |
| Brevo email config | 2h | 🔴 |
| Logs & monitoring | 1h | 🔴 |

### PRIORITÉ 2 - IMPORTANT (2h)

| Tâche | Temps | Criticité |
|-------|-------|-----------|
| XSS sanitization | 2h | 🟠 |

### PRIORITÉ 3 - À AMÉLIORER (3h)

| Tâche | Temps | Criticité |
|-------|-------|-----------|
| Path traversal protection | 2h | 🟡 |
| Brute force protection | 1h | 🟡 |

### PRIORITÉ 4 - SI REQUIS (16h)

| Tâche | Temps | Criticité |
|-------|-------|-----------|
| Chiffrement données (SI requis) | 10h | 🟡 |
| RGPD complet (anonymisation + export + oubli) | 6h | ⚪ |

**Total minimum (production):** 15h (bloquants seulement)  
**Total recommandé:** 20h (bloquants + important + améliorer)  
**Total maximum (avec RGPD + chiffrement):** 36h (tout inclus)  

**Coût estimé (50€/h):** 750€ - 1800€

---

## ⚠️ NOTES IMPORTANTES

### ✅ DÉJÀ SÉCURISÉ (PAS DE CORRECTIF REQUIS)

1. **Injection SQL** → Drizzle ORM avec queries paramétrées ✅
2. **Machine à états** → RBAC strict, transitions contrôlées ✅
3. **Authentification JWT** → Bcrypt (12 rounds) + HTTPOnly cookies ✅
4. **Chiffrement transit** → HTTPS/TLS Let's Encrypt O2switch ✅
5. **Chiffrement repos DB** → À vérifier avec O2switch (PostgreSQL standard)

### ❓ À CLARIFIER AVEC DPO/JURISTE

1. **Chiffrement applicatif** → Requis ou PostgreSQL encryption suffit ?
2. **RGPD anonymisation** → Délai exact (5 ans, 3 ans, autre ?) ?
3. **Logs d'accès RGPD** → Obligation ou bonne pratique ?

### 🔄 RISQUES RÉSIDUELS (POST-CORRECTIFS)

1. **Mutualisé O2switch** → Isolation moindre qu'un VPS
2. **Pas d'accès root** → Firewall non configurable
3. **DDoS** → Pas de protection avancée (Cloudflare recommandé)

---

## 📞 SUPPORT

**Questions techniques:** Agent Replit  
**Hébergeur:** O2switch - support@o2switch.fr  
**Email service:** Brevo - support@brevo.com  

---

**Dernière mise à jour:** 15 octobre 2025  
**Version:** 1.1 (corrections architecte appliquées)
