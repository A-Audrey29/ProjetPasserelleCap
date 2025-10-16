# RAPPORT D'AUDIT COMPLET - PASSERELLE CAP
## Sécurité, RGPD & Qualité du Code

**Date :** 14 octobre 2025
**Application :** Passerelle CAP (Replit)
**Type :** Application Node.js/Express + React
**Base de données :** PostgreSQL (Neon)
**Environnement :** Développement (Replit)

---

## 📋 SYNTHÈSE EXÉCUTIVE

### Risques Majeurs Identifiés

🔴 **CRITIQUES (Action Immédiate Requise)**
1. **Secrets exposés dans .env** - Les clés API, JWT secrets et credentials SMTP sont visibles dans le fichier .env commité
2. **Absence totale de tests** - Aucun test unitaire, intégration ou E2E
3. **JWT_SECRET faible** - Le secret JWT actuel est un placeholder texte simple
4. **Upload de fichiers non sécurisé** - Pas de validation antivirale, taille limitée mais noms prédictibles
5. **Sessions non configurées** - Aucun système de gestion de session Express

🟡 **IMPORTANTS (Court Terme)**
6. Logging insuffisant des accès aux données personnelles
7. Absence de rate limiting global
8. Pas de HTTPS forcé
9. Validation input incomplète
10. Pas de politique de rétention des données

🟢 **OPTIMISATIONS (Long Terme)**
11. Performance des requêtes DB non optimisée
12. Absence de monitoring/alerting
13. Documentation API manquante
14. Pas de CI/CD configuré

### Score Global
- **Sécurité :** 45/100 🔴
- **RGPD :** 55/100 🟡
- **Qualité Code :** 60/100 🟡
- **Tests :** 0/100 🔴
- **Architecture :** 70/100 🟢

---

## 1. CARTOGRAPHIE DES DONNÉES PERSONNELLES (RGPD)

### 1.1 Données Personnelles Identifiées

#### Catégorie 1 : **Données Utilisateurs** (Table `users`)
| Donnée | Type | Sensibilité | Finalité | Durée de conservation |
|--------|------|-------------|----------|----------------------|
| `email` | Identifiant | HAUTE | Authentification | Durée du compte |
| `passwordHash` | Mot de passe | TRÈS HAUTE | Authentification | Durée du compte |
| `firstName` | Prénom | HAUTE | Identification | Durée du compte |
| `lastName` | Nom | HAUTE | Identification | Durée du compte |
| `phone` | Téléphone | MOYENNE | Contact | Durée du compte |
| `structure` | Organisation | FAIBLE | Profil professionnel | Durée du compte |
| `role` | Rôle | FAIBLE | Autorisation | Durée du compte |
| `orgId` | Organisation | FAIBLE | Lien organisationnel | Durée du compte |

#### Catégorie 2 : **Données Familles** (Table `fiche_navettes`)
| Donnée | Type | Sensibilité | Finalité | Durée de conservation |
|--------|------|-------------|----------|----------------------|
| `referentData` (JSON) | Données référent social | HAUTE | Accompagnement CAP | **NON DÉFINIE** ⚠️ |
| `familyDetailedData` (JSON) | Données famille complètes | **TRÈS HAUTE** | Suivi social | **NON DÉFINIE** ⚠️ |
| `childrenData` (JSON) | Données enfants | **TRÈS HAUTE** | Accompagnement familial | **NON DÉFINIE** ⚠️ |
| `familyConsent` | Consentement | HAUTE | RGPD | Durée de la fiche |
| `capDocuments` (JSON) | Documents CAP | HAUTE | Justificatifs | **NON DÉFINIE** ⚠️ |

**⚠️ PROBLÈME CRITIQUE :** Les JSON contiennent potentiellement :
- Noms/prénoms des parents
- Noms/prénoms des enfants
- Adresses postales
- Numéros de téléphone
- Situations familiales sensibles
- Données de revenus potentielles

#### Catégorie 3 : **Données Organisations** (Table `organizations`)
| Donnée | Type | Sensibilité | Finalité | Durée de conservation |
|--------|------|-------------|----------|----------------------|
| `name` | Nom organisation | FAIBLE | Identification | Permanente |
| `contactName` | Nom contact | MOYENNE | Communication | Durée de la relation |
| `contactEmail` | Email contact | MOYENNE | Communication | Durée de la relation |
| `contactPhone` | Téléphone | MOYENNE | Communication | Durée de la relation |
| `contact` (adresse) | Adresse | FAIBLE | Localisation | Durée de la relation |

#### Catégorie 4 : **Logs d'Audit** (Table `audit_logs`)
| Donnée | Type | Sensibilité | Finalité | Durée de conservation |
|--------|------|-------------|----------|----------------------|
| `actorId` | ID utilisateur | HAUTE | Traçabilité | **NON DÉFINIE** ⚠️ |
| `action` | Action effectuée | MOYENNE | Audit | **NON DÉFINIE** ⚠️ |
| `entityId` | ID entité modifiée | HAUTE | Traçabilité | **NON DÉFINIE** ⚠️ |
| `meta` (JSON) | Métadonnées | VARIABLE | Contexte | **NON DÉFINIE** ⚠️ |

#### Catégorie 5 : **Emails Interceptés** (Table `email_logs`)
| Donnée | Type | Sensibilité | Finalité | Durée de conservation |
|--------|------|-------------|----------|----------------------|
| `to`, `cc`, `bcc` | Adresses email | HAUTE | Logs emails | **NON DÉFINIE** ⚠️ |
| `subject` | Sujet | MOYENNE | Debug | **NON DÉFINIE** ⚠️ |
| `html`, `text` | Contenu email | HAUTE | Debug | **NON DÉFINIE** ⚠️ |

### 1.2 Flux de Données Personnelles

```
┌─────────────────┐
│   EMETTEUR      │ (Crée fiche avec données famille)
│   (Frontend)    │
└────────┬────────┘
         │
         ▼ HTTPS ❓
┌─────────────────┐
│  Express API    │ (Aucune encryption au repos)
│  server/routes  │
└────────┬────────┘
         │
         ▼ Connexion SSL ✅
┌─────────────────┐
│  PostgreSQL     │ (Neon - encryption at rest ✅)
│  (Neon Cloud)   │
└─────────────────┘
```

**🔴 PROBLÈMES IDENTIFIÉS :**
1. **Pas de chiffrement des données sensibles au repos côté application** (familyDetailedData, childrenData stockés en clair dans JSON)
2. **Pas de pseudonymisation** des données
3. **Aucune anonymisation** des données pour analytics
4. **Les fichiers uploadés** (`uploads/`) ne sont pas chiffrés

---

## 2. VULNÉRABILITÉS DE SÉCURITÉ (OWASP TOP 10)

### 2.1 A01:2021 – Broken Access Control ⚠️ MOYEN

**Observations :**
- ✅ Middleware RBAC implémenté (`requireAuth`, `requireRole`, `requireFicheAccess`)
- ✅ Contrôle des rôles : ADMIN, EMETTEUR, RELATIONS_EVS, CD, EVS_CS
- ⚠️ **Faiblesse** : Pas de contrôle au niveau des lignes (Row-Level Security) dans PostgreSQL

**Risques :**
- Un utilisateur EVS_CS pourrait potentiellement accéder aux fiches d'autres organisations si les contrôles middleware échouent
- Pas de protection au niveau base de données

**Recommandation :**
```sql
-- Implémenter RLS dans PostgreSQL
ALTER TABLE fiche_navettes ENABLE ROW LEVEL SECURITY;

CREATE POLICY fiche_access_policy ON fiche_navettes
  USING (
    assigned_org_id = current_setting('app.current_org_id')::VARCHAR
    OR emitter_id = current_setting('app.current_user_id')::VARCHAR
  );
```

**Localisation du code :** `server/middleware/rbac.js:56-70`

---

### 2.2 A02:2021 – Cryptographic Failures 🔴 CRITIQUE

**Observations :**
- ❌ **JWT_SECRET faible** : `"your-super-secret-jwt-key-change-in-production-with-strong-random-key"` (`.env:7`)
- ❌ **COOKIE_SECRET faible** : `"another-super-secret-for-cookies-change-in-production"` (`.env:26`)
- ❌ **Secrets exposés dans le repo** : fichier `.env` commité (visible dans git)
- ✅ Hashing bcrypt correct (`SALT_ROUNDS=12`) - `server/auth.js:6`
- ❌ **Pas de HTTPS forcé** - Pas de middleware `helmet` ou redirection HTTPS

**Code vulnérable** (`server/auth.js:5`) :
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
```

**Risques :**
1. **Tokens JWT compromis** → Accès non autorisé à tout le système
2. **Man-in-the-Middle** → Interception des credentials en clair
3. **Session hijacking** → Vol de cookies

**Recommandations URGENTES :**

1. **Générer des secrets forts** :
```bash
# Générer JWT_SECRET
openssl rand -base64 64

# Générer COOKIE_SECRET
openssl rand -base64 64
```

2. **Retirer .env du repo** :
```bash
git rm --cached .env
echo ".env" >> .gitignore
git commit -m "Remove .env from repository"
```

3. **Utiliser Replit Secrets** :
- Aller dans "Tools" → "Secrets" sur Replit
- Migrer toutes les variables sensibles

4. **Forcer HTTPS** (`server/index.ts`) :
```typescript
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.header('host')}${req.url}`);
  }
  next();
});
```

---

### 2.3 A03:2021 – Injection 🟡 MOYEN

**SQL Injection :** ✅ **PROTÉGÉ**
- Utilisation de Drizzle ORM avec requêtes paramétrées
- Pas de concatenation SQL brute détectée

**Code sûr** (`server/storage.ts:354-358`) :
```typescript
const [fiche] = await db
  .select()
  .from(ficheNavettes)
  .where(ilike(ficheNavettes.ref, ref));
```

**XSS (Cross-Site Scripting) :** ⚠️ **MOYEN**

**Vulnérabilités potentielles :**
1. **Upload de fichiers** - Pas de validation du contenu
2. **Commentaires** - Pas de sanitization visible côté API
3. **Email HTML** - Construction manuelle sans escape

**Code à risque** (`server/routes.ts:644-653`) :
```typescript
app.post('/api/fiches/:id/comments', requireAuth, requireFicheAccess, validateRequest(commentSchema), auditMiddleware('comment', 'FicheNavette'), async (req, res) => {
  const { content } = req.validatedData;
  const comment = await storage.createComment({
    ficheId: id,
    authorId: req.user.userId,
    content  // ⚠️ Pas de sanitization explicite
  });
});
```

**Recommandations :**

1. **Installer DOMPurify côté serveur** :
```bash
npm install isomorphic-dompurify
```

2. **Sanitizer les commentaires** :
```typescript
import DOMPurify from 'isomorphic-dompurify';

const sanitizedContent = DOMPurify.sanitize(content);
```

3. **Valider les uploads** :
```typescript
import fileType from 'file-type';

// Vérifier le type MIME réel
const type = await fileType.fromFile(req.file.path);
if (!['application/pdf', 'image/jpeg', 'image/png'].includes(type.mime)) {
  throw new Error('Invalid file type');
}
```

---

### 2.4 A04:2021 – Insecure Design 🟡 MOYEN

**Problèmes identifiés :**

1. **Pas de rate limiting global** - Risque de brute force sur `/api/auth/login`
2. **Noms de fichiers prédictibles** :
   - `contract_commune_YYYYMMDD_HHMMSS.pdf` (`server/routes.ts:149`)
   - `report_YYYYMMDD_HHMMSS.pdf` (`server/routes.ts:175`)

   ⚠️ **Risque** : Un attaquant peut deviner les URLs et accéder aux fichiers

3. **Pas de CAPTCHA** sur le login
4. **Pas de 2FA** (acceptable pour MVP)

**Code vulnérable** (`server/routes.ts:148-150`) :
```typescript
const timestamp = new Date().toISOString().replace(/[:-]/g, '').replace(/\..+/, '').replace('T', '_');
const filename = `contract_commune_${timestamp}.pdf`;
// ⚠️ Facilement devinable
```

**Recommandations :**

1. **Rate limiting** :
```bash
npm install express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives
  message: 'Trop de tentatives de connexion, réessayez dans 15 minutes'
});

app.post('/api/auth/login', loginLimiter, validateRequest(loginSchema), async (req, res) => {
  // ...
});
```

2. **Noms de fichiers aléatoires** :
```typescript
import { randomBytes } from 'crypto';

const randomName = randomBytes(16).toString('hex');
const filename = `contract_${randomName}.pdf`;
```

3. **Token d'accès aux fichiers** :
```typescript
// Générer un token éphémère pour chaque accès
app.get('/uploads/:token', requireAuth, async (req, res) => {
  const fileInfo = await verifyUploadToken(req.params.token);
  if (!fileInfo) return res.status(404).send();

  res.sendFile(fileInfo.path);
});
```

---

### 2.5 A05:2021 – Security Misconfiguration 🔴 CRITIQUE

**Problèmes détectés :**

1. **CORS non restreint** (`.env:52`) :
```env
CORS_ORIGIN="http://localhost:5000,http://localhost:5173"
```
⚠️ Pas de configuration CORS visible dans le code serveur

2. **Headers de sécurité manquants** :
   - Pas de `Helmet` installé
   - Pas de CSP (Content Security Policy)
   - Pas de `X-Frame-Options`
   - Pas de `X-Content-Type-Options`

3. **Logs verbeux en production** :
```typescript
console.log(`🔍 Recherche intelligente: détection référence fiche "${trimmedSearch}"`);
```

4. **Messages d'erreur détaillés** (`server/index.ts:46-51`) :
```typescript
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  throw err; // ⚠️ Expose stack trace
});
```

**Recommandations URGENTES :**

1. **Installer Helmet** :
```bash
npm install helmet
```

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

2. **Configurer CORS proprement** :
```typescript
import cors from 'cors';

const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true
}));
```

3. **Masquer les erreurs en production** :
```typescript
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;

  if (process.env.NODE_ENV === 'production') {
    // Masquer les détails en prod
    res.status(status).json({
      message: status === 500 ? 'Internal Server Error' : err.message
    });
  } else {
    res.status(status).json({ message: err.message, stack: err.stack });
  }

  // Logger mais ne pas throw
  console.error(err);
});
```

---

### 2.6 A07:2021 – Identification and Authentication Failures 🟡 MOYEN

**Points positifs :**
- ✅ Bcrypt avec 12 rounds
- ✅ JWT avec expiration 24h
- ✅ Cookies HttpOnly

**Faiblesses identifiées :**

1. **Pas de gestion de blacklist JWT** - Un token reste valide même après logout jusqu'à expiration
2. **Pas de rotation des tokens**
3. **Pas de détection de sessions multiples**
4. **Pas de politique de mot de passe forte** (longueur, complexité)
5. **Pas de limite de tentatives de login**

**Code à améliorer** (`server/auth.js:38-50`) :
```javascript
export async function authenticateUser(email, password) {
  const user = await storage.getUserByEmail(email);
  if (!user) {
    return null; // ⚠️ Même délai qu'un échec de password -> timing attack possible
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return user;
}
```

**Recommandations :**

1. **Blacklist JWT** (Redis ou DB) :
```typescript
// Lors du logout
await storage.blacklistToken(token, decoded.exp);

// Lors de la vérification
if (await storage.isTokenBlacklisted(token)) {
  throw new Error('Token invalidé');
}
```

2. **Politique de mot de passe** :
```typescript
import passwordValidator from 'password-validator';

const schema = new passwordValidator();
schema
  .is().min(12)
  .has().uppercase()
  .has().lowercase()
  .has().digits()
  .has().symbols();

if (!schema.validate(password)) {
  throw new Error('Mot de passe trop faible');
}
```

3. **Protection timing attack** :
```javascript
export async function authenticateUser(email, password) {
  const user = await storage.getUserByEmail(email);

  // Toujours vérifier le hash même si user n'existe pas
  const hashToCheck = user?.passwordHash || '$2a$12$dummy.hash.to.prevent.timing.attack';
  const isValid = await verifyPassword(password, hashToCheck);

  if (!user || !isValid) {
    return null;
  }

  return user;
}
```

---

### 2.7 A08:2021 – Software and Data Integrity Failures 🟡 MOYEN

**Problèmes :**

1. **Pas de SRI (Subresource Integrity)** pour les CDN externes
2. **Pas de vérification de signature des packages NPM**
3. **Dépendances non auditées régulièrement**

**Recommandations :**

1. **Audit des dépendances** :
```bash
npm audit --production
npm audit fix
```

2. **Lock files** :
✅ `package-lock.json` présent

3. **Automatiser les audits** (GitHub Actions) :
```yaml
name: Security Audit
on:
  schedule:
    - cron: '0 0 * * 0' # Tous les dimanches
  push:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run npm audit
        run: npm audit --audit-level=moderate
```

---

### 2.8 A09:2021 – Security Logging and Monitoring Failures 🔴 CRITIQUE

**État actuel :**
- ✅ Audit logs implémentés (`audit_logs` table)
- ✅ Email logs pour debug
- ❌ **Pas de logging des échecs d'authentification**
- ❌ **Pas d'alerting sur activités suspectes**
- ❌ **Pas de monitoring temps réel**
- ❌ **Logs non centralisés**

**Recommandations :**

1. **Logger les échecs d'auth** :
```typescript
app.post('/api/auth/login', async (req, res) => {
  const user = await authenticateUser(email, password);

  if (!user) {
    // Logger l'échec
    await storage.createAuditLog({
      action: 'login_failed',
      entity: 'User',
      entityId: email,
      actorId: null,
      meta: {
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    return res.status(401).json({ message: 'Credentials invalides' });
  }

  // Logger le succès
  await storage.createAuditLog({
    action: 'login_success',
    entity: 'User',
    entityId: user.id,
    actorId: user.id,
    meta: { ip: req.ip }
  });
});
```

2. **Alerting** (ex: Winston + Sentry) :
```bash
npm install winston @sentry/node
```

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

// Capturer les erreurs critiques
app.use(Sentry.Handlers.errorHandler());
```

3. **Monitoring** :
- Intégrer Prometheus + Grafana pour métriques temps réel
- Ou solution SaaS : Datadog, New Relic

---

### 2.9 A10:2021 – Server-Side Request Forgery (SSRF) ✅ NON APPLICABLE

**Aucune fonctionnalité identifiée permettant des requêtes serveur vers des URLs externes fournies par l'utilisateur.**

---

## 3. ANALYSE QUALITÉ DU CODE

### 3.1 Architecture Globale

**Stack Technique :**
```
Frontend: React + TypeScript + Vite + TanStack Query
Backend: Express.js + TypeScript
ORM: Drizzle ORM
Database: PostgreSQL (Neon)
Authentication: JWT + Cookies HttpOnly
Emails: SendGrid
```

**Structure du projet :**
```
/
├── client/          # Frontend React
│   └── src/
├── server/          # Backend Express
│   ├── routes.ts    # 1905 lignes ⚠️ TROP LONG
│   ├── storage.ts   # ~950 lignes
│   ├── auth.js
│   ├── middleware/
│   └── services/
├── shared/          # Types partagés
│   └── schema.ts
└── uploads/         # Fichiers uploadés
```

**🔴 PROBLÈME MAJEUR : Fichier routes.ts monolithique**
- **1905 lignes** - Violation du principe Single Responsibility
- Mélange de logique métier et routage
- Difficile à maintenir et tester

**Recommandation :**
Refactoriser en modules :
```
server/
├── routes/
│   ├── auth.routes.ts
│   ├── fiches.routes.ts
│   ├── users.routes.ts
│   ├── organizations.routes.ts
│   ├── workshops.routes.ts
│   └── index.ts
├── controllers/
│   ├── ficheController.ts
│   ├── userController.ts
│   └── ...
└── services/
    ├── ficheService.ts
    ├── authService.ts
    └── ...
```

### 3.2 Complexité Cyclomatique

**Fonctions complexes identifiées :**

1. `server/routes.ts:414-462` - **createFiche** (~30 lignes, logique métier complexe)
2. `server/routes.ts:810-992` - **Import CSV** (~180 lignes ⚠️)
3. `server/storage.ts:633-785` - **getWorkshopSessions** (~150 lignes)

**Recommandation :** Extraire en services dédiés

### 3.3 Gestion des Erreurs

**Points positifs :**
- ✅ Try-catch sur toutes les routes
- ✅ Codes HTTP appropriés

**Faiblesses :**
- ❌ Pas de classe d'erreur personnalisée
- ❌ Logs d'erreur basiques (console.error)
- ❌ Pas de distinction erreur métier / technique

**Recommandation :**
```typescript
// server/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Non autorisé') {
    super(message, 401);
  }
}
```

### 3.4 Documentation

**État actuel :**
- ❌ Pas de documentation API (Swagger/OpenAPI)
- ❌ Commentaires minimalistes
- ✅ README.md présent (2069 octets)
- ✅ Fichiers PROCESSUS_CAP_.md (documentation métier)

**Recommandation :**
```bash
npm install swagger-jsdoc swagger-ui-express
```

```typescript
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Passerelle CAP API',
      version: '1.0.0',
    },
  },
  apis: ['./server/routes/*.ts'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

---

## 4. TESTS ET QUALITÉ

### 4.1 État de la Couverture de Tests

**Constat : AUCUN TEST 🔴**

Recherche effectuée :
```bash
find . -name "*.test.*" -o -name "*.spec.*"
# Résultat : Aucun fichier de test applicatif
```

**Impact :**
- 🔴 **Risque de régression élevé** lors de modifications
- 🔴 **Pas de garantie de non-régression**
- 🔴 **Déploiement à risque**
- 🔴 **Maintenance difficile**

### 4.2 Recommandations de Tests

**Phase 1 : Tests Critiques (1-2 semaines)**

1. **Tests d'authentification** :
```typescript
// tests/auth.test.ts
describe('Authentication', () => {
  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'ValidPassword123!' })
      .expect(200);

    expect(res.body.user).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' })
      .expect(401);
  });

  it('should rate limit after 5 failed attempts', async () => {
    // Test rate limiting
  });
});
```

2. **Tests RBAC** :
```typescript
describe('Authorization', () => {
  it('EMETTEUR cannot access admin routes', async () => {
    const token = getTokenForRole('EMETTEUR');
    await request(app)
      .get('/api/admin/users')
      .set('Cookie', `auth_token=${token}`)
      .expect(403);
  });

  it('EVS_CS can only see their organization fiches', async () => {
    // Test isolation des données
  });
});
```

3. **Tests création fiche** :
```typescript
describe('Fiche Navette', () => {
  it('should create fiche with valid data', async () => {
    // Test création complète
  });

  it('should validate CAP documents', async () => {
    // Test validation documents
  });

  it('should require family consent', async () => {
    // Test consentement obligatoire
  });
});
```

**Phase 2 : Tests d'Intégration (2-3 semaines)**

1. **Workflow complet fiche** :
   - DRAFT → SUBMITTED_TO_FEVES → ASSIGNED_EVS → ACCEPTED_EVS → CLOSED

2. **Upload fichiers** :
   - Test taille maximum
   - Test types MIME
   - Test scan antivirus (si implémenté)

3. **Emails** :
   - Test interception en dev
   - Test envoi en prod (mocked)

**Phase 3 : Tests E2E (3-4 semaines)**

Utiliser Playwright ou Cypress :
```typescript
// e2e/fiche-workflow.spec.ts
test('Complete fiche workflow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'emetteur@test.com');
  await page.fill('[name="password"]', 'password');
  await page.click('[type="submit"]');

  await page.goto('/fiches/new');
  // Remplir formulaire complet
  // ...
  await page.click('button:has-text("Soumettre")');

  await expect(page).toHaveURL(/\/fiches\/FN-/);
});
```

**Framework recommandé :**
```bash
npm install --save-dev vitest @vitest/ui supertest @types/supertest
npm install --save-dev @playwright/test
```

### 4.3 Fiches Navettes de Test

**Question Critique :** Conserver ou supprimer les fiches tests après mise en production ?

**Recommandation :**

1. **AVANT production :**
   - ✅ Conserver toutes les fiches tests
   - ✅ Créer un flag `isTest` dans la table `fiche_navettes`
   - ✅ Utiliser ces fiches pour audits internes

2. **Procédure de migration vers production :**
```sql
-- Étape 1 : Ajouter colonne isTest
ALTER TABLE fiche_navettes ADD COLUMN is_test BOOLEAN DEFAULT FALSE;

-- Étape 2 : Marquer toutes les fiches actuelles comme tests
UPDATE fiche_navettes SET is_test = TRUE WHERE created_at < '2025-11-01';

-- Étape 3 : Créer une vue sans tests
CREATE VIEW fiche_navettes_prod AS
  SELECT * FROM fiche_navettes WHERE is_test = FALSE;
```

3. **APRÈS 3 mois de production stable :**
```sql
-- Anonymiser les fiches tests (RGPD)
UPDATE fiche_navettes
SET
  family_detailed_data = jsonb_set(family_detailed_data, '{mother}', '"ANONYME"'),
  children_data = '[]'::jsonb,
  referent_data = NULL
WHERE is_test = TRUE;

-- Puis supprimer après 6 mois
DELETE FROM fiche_navettes WHERE is_test = TRUE AND created_at < NOW() - INTERVAL '6 months';
```

**🔴 IMPORTANT RGPD :**
- Les fiches tests contiennent potentiellement des **vraies données personnelles** (si créées avec données réelles)
- **Obligation légale** de les supprimer ou anonymiser

---

## 5. CHECKLIST RGPD FINALE

### 5.1 Conformité RGPD - Score : 55/100 🟡

| Critère | État | Score | Actions requises |
|---------|------|-------|------------------|
| **Base légale du traitement** | ⚠️ | 60% | Documenter la base légale (intérêt légitime / consentement) |
| **Consentement explicite** | ✅ | 90% | `familyConsent` présent dans le schéma |
| **Information des personnes** | ❌ | 20% | Créer page "Politique de confidentialité" |
| **Droit d'accès** | ❌ | 0% | Implémenter endpoint GET `/api/gdpr/my-data` |
| **Droit de rectification** | ✅ | 80% | Possible via interface, à documenter |
| **Droit à l'effacement** | ❌ | 10% | Endpoint DELETE `/api/gdpr/delete-my-data` manquant |
| **Droit à la portabilité** | ❌ | 0% | Export JSON/CSV à implémenter |
| **Droit d'opposition** | ❌ | 0% | Mécanisme opt-out manquant |
| **Limitation de la conservation** | ❌ | 10% | Aucune politique de rétention définie |
| **Sécurité des données** | 🟡 | 50% | Voir section vulnérabilités |
| **Notification de violation** | ❌ | 0% | Procédure <72h non documentée |
| **DPO désigné** | ❌ | 0% | Contact DPO manquant |
| **Registre des traitements** | ❌ | 20% | Documenter tous les traitements |
| **AIPD (Analyse d'impact)** | ❌ | 0% | Données sensibles → AIPD obligatoire |

### 5.2 Actions Prioritaires RGPD

#### 🔴 CRITIQUE - À faire AVANT mise en production

1. **Politique de confidentialité** (2-3 jours)
   - Créer page `/privacy-policy`
   - Détailler : quelles données, pourquoi, durée, droits
   - Lien visible dans le footer

2. **Consentement renforcé** (1 jour)
   - Ajouter checkbox explicite lors création fiche
   - Texte : "J'accepte que mes données personnelles et celles de ma famille soient traitées dans le cadre du dispositif CAP, conformément à notre politique de confidentialité"

3. **Droit à l'effacement** (3-5 jours)
```typescript
// server/routes/gdpr.ts
app.post('/api/gdpr/delete-account', requireAuth, async (req, res) => {
  const userId = req.user.userId;

  // 1. Anonymiser les fiches émises
  await storage.anonymizeFichesByEmitter(userId);

  // 2. Anonymiser les commentaires
  await storage.anonymizeCommentsByAuthor(userId);

  // 3. Supprimer l'utilisateur
  await storage.deleteUser(userId);

  // 4. Logger la demande (RGPD exige traçabilité)
  await storage.createAuditLog({
    action: 'gdpr_deletion',
    entity: 'User',
    entityId: userId,
    actorId: userId,
    meta: { timestamp: new Date() }
  });

  res.json({ message: 'Compte supprimé avec succès' });
});
```

4. **Politique de rétention** (1-2 jours)
```sql
-- Script à exécuter via cron mensuel
-- Supprimer fiches archivées > 5 ans
DELETE FROM fiche_navettes
WHERE state = 'ARCHIVED'
  AND updated_at < NOW() - INTERVAL '5 years';

-- Supprimer audit logs > 2 ans
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '2 years';

-- Supprimer email logs > 3 mois
DELETE FROM email_logs
WHERE created_at < NOW() - INTERVAL '3 months';
```

5. **Désigner un DPO** (1 jour)
   - Identifier le responsable RGPD (interne ou externe)
   - Ajouter contact dans footer : `dpo@passerelle-cap.fr`

#### 🟡 IMPORTANT - Dans les 30 jours

6. **Registre des traitements** (2-3 jours)
   - Documenter chaque traitement de données :
     * Finalité
     * Catégories de données
     * Destinataires
     * Durée de conservation
     * Mesures de sécurité

7. **AIPD (Analyse d'Impact)** (5-7 jours)
   - Obligatoire car traitement de données sensibles (enfants, situation sociale)
   - Identifier et évaluer les risques
   - Définir mesures pour réduire risques

8. **Formation des utilisateurs** (1 jour)
   - Sensibiliser EMETTEUR/RELATIONS_EVS à la protection des données
   - Guide de bonnes pratiques

9. **Procédure de violation de données** (1 jour)
   - Documenter processus de notification <72h à la CNIL
   - Contact CNIL : 01 53 73 22 22

#### 🟢 OPTIMISATION - Dans les 90 jours

10. **Export de données** (3-4 jours)
```typescript
app.get('/api/gdpr/export-my-data', requireAuth, async (req, res) => {
  const userId = req.user.userId;

  const userData = {
    user: await storage.getUser(userId),
    fiches: await storage.getFichesByEmitter(userId),
    comments: await storage.getCommentsByAuthor(userId),
    auditLogs: await storage.getAuditLogsByActor(userId)
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=my-data.json');
  res.send(JSON.stringify(userData, null, 2));
});
```

11. **Chiffrement des données sensibles** (5-10 jours)
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

class EncryptionService {
  private key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes

  encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`;
  }

  decrypt(encrypted: string): string {
    const [ivHex, encryptedHex, authTagHex] = encrypted.split(':');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    return decipher.update(Buffer.from(encryptedHex, 'hex')) + decipher.final('utf8');
  }
}

// Utilisation dans storage.ts
const encryptionService = new EncryptionService();

async createFiche(data: InsertFicheNavette) {
  return await db.insert(ficheNavettes).values({
    ...data,
    familyDetailedData: encryptionService.encrypt(JSON.stringify(data.familyDetailedData)),
    childrenData: encryptionService.encrypt(JSON.stringify(data.childrenData))
  }).returning();
}
```

12. **Audit de sécurité annuel** (Budget externe ~1500-3000€)
    - Faire auditer par un professionnel RGPD
    - Pen-test de l'application

---

## 6. RECOMMANDATIONS PRIORITAIRES

### 6.1 Roadmap de Mise en Production

#### Phase 1 : CRITIQUE 🔴 (1-2 semaines) - BLOQUANT

**Sécurité**
- [ ] Régénérer tous les secrets (JWT, COOKIE, DB)
- [ ] Retirer `.env` du repository
- [ ] Migrer vers Replit Secrets ou Variables d'environnement sécurisées
- [ ] Activer HTTPS forcé
- [ ] Installer et configurer Helmet
- [ ] Implémenter rate limiting sur login
- [ ] Sécuriser les noms de fichiers (UUIDs aléatoires)
- [ ] Ajouter validation antivirale des uploads (ClamAV ou VirusTotal API)

**RGPD**
- [ ] Créer page Politique de confidentialité
- [ ] Renforcer consentement explicite
- [ ] Implémenter droit à l'effacement
- [ ] Définir politique de rétention des données
- [ ] Désigner un DPO

**Code**
- [ ] Corriger handler d'erreurs (masquer stack traces)
- [ ] Configurer CORS proprement
- [ ] Supprimer logs verbeux en production

**Estimation :** 60-80 heures de développement

#### Phase 2 : IMPORTANT 🟡 (2-4 semaines) - HAUTE PRIORITÉ

**Tests**
- [ ] Implémenter tests auth (login, JWT, RBAC)
- [ ] Tests création/modification fiches
- [ ] Tests upload fichiers
- [ ] Tests workflow complet
- [ ] Couverture cible : 70% minimum

**Sécurité**
- [ ] Ajouter blacklist JWT (Redis)
- [ ] Implémenter politique de mot de passe forte
- [ ] Protection timing attacks
- [ ] Logging des échecs d'authentification
- [ ] Intégrer Sentry pour monitoring erreurs

**RGPD**
- [ ] Rédiger registre des traitements
- [ ] Réaliser AIPD
- [ ] Procédure notification violation <72h
- [ ] Formation utilisateurs

**Qualité**
- [ ] Refactoriser routes.ts en modules
- [ ] Extraire logique métier dans services
- [ ] Ajouter documentation API (Swagger)
- [ ] Classes d'erreur personnalisées

**Estimation :** 120-160 heures

#### Phase 3 : OPTIMISATION 🟢 (1-3 mois) - POST-LANCEMENT

**Sécurité avancée**
- [ ] Chiffrement AES-256 des données sensibles
- [ ] Row-Level Security PostgreSQL
- [ ] Scan régulier des dépendances (Dependabot)
- [ ] CSP stricte
- [ ] Audit externe de sécurité

**RGPD avancé**
- [ ] Export de données (portabilité)
- [ ] Anonymisation automatique des vieilles données
- [ ] Tableau de bord transparence données

**Performance**
- [ ] Optimisation requêtes DB (indexes)
- [ ] Cache Redis
- [ ] CDN pour fichiers statiques
- [ ] Monitoring Prometheus/Grafana

**CI/CD**
- [ ] Pipeline GitHub Actions
- [ ] Tests automatiques sur PR
- [ ] Déploiement automatique
- [ ] Rollback automatique si tests échouent

**Estimation :** 200-300 heures

### 6.2 Budget Estimatif

| Phase | Développeur Junior (35€/h) | Développeur Senior (70€/h) | Expert Sécu/RGPD (100€/h) |
|-------|----------------------------|----------------------------|---------------------------|
| Phase 1 (70h) | 2 450€ | 4 900€ | 7 000€ |
| Phase 2 (140h) | 4 900€ | 9 800€ | 14 000€ |
| Phase 3 (250h) | 8 750€ | 17 500€ | 25 000€ |
| **TOTAL** | **16 100€** | **32 200€** | **46 000€** |

**Recommandation réaliste pour MVP :**
- Phase 1 : Senior (4 900€) + Expert partiel (2 jours = 1 400€) = **6 300€**
- Phase 2 : Junior (4 900€) + Senior review (2 jours = 1 120€) = **6 020€**
- **TOTAL MINIMUM pour production propre : 12 320€**

### 6.3 Quick Wins (< 1 jour chacun)

1. **Installer Helmet** - 30min
```bash
npm install helmet
# Ajouter app.use(helmet()) dans server/index.ts
```

2. **Rate limiting login** - 1h
```bash
npm install express-rate-limit
```

3. **Secrets forts** - 15min
```bash
openssl rand -base64 64 > jwt_secret.txt
# Copier dans Replit Secrets
```

4. **HTTPS forcé** - 30min
```typescript
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.header('host')}${req.url}`);
  }
  next();
});
```

5. **Politique de confidentialité** - 2-3h
- Utiliser template CNIL : https://www.cnil.fr/fr/modele/mention/politique-de-confidentialite

6. **Masquer erreurs production** - 30min
```typescript
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  res.status(status).json({
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
  console.error(err); // Logger côté serveur
});
```

7. **Logs d'échecs d'auth** - 1h
```typescript
// Dans /api/auth/login
if (!user) {
  await storage.createAuditLog({
    action: 'login_failed',
    entity: 'User',
    entityId: email,
    actorId: null,
    meta: { ip: req.ip }
  });
}
```

**Total Quick Wins : 1 jour de travail = ~560€ (senior) pour sécuriser 30% des risques critiques**

---

## 7. QUESTIONS POUR AVANCER

### 7.1 Technique

1. **Hébergement production :**
   - Resterez-vous sur Replit ou migration vers AWS/Azure/GCP ?
   - Budget hébergement prévu ? (~50-200€/mois)

2. **Sauvegardes :**
   - Stratégie de backup PostgreSQL ?
   - RPO/RTO cibles ? (ex: RPO=1h, RTO=4h)

3. **Monitoring :**
   - Budget pour outils SaaS (Sentry, Datadog) ? (~50-150€/mois)
   - Ou préférez-vous self-hosted (Prometheus) ?

4. **Tests :**
   - Qui va écrire les tests ? (dev interne ou externe)
   - Timeline souhaitée ? (2 semaines à 2 mois)

### 7.2 RGPD

1. **DPO :**
   - Avez-vous quelqu'un en interne ?
   - Ou besoin d'externaliser ? (300-800€/an pour PME)

2. **Durée de conservation :**
   - Combien de temps garder les fiches fermées ? (5 ans ? 10 ans ?)
   - Même question pour les audit logs ? (2 ans réglementaire)

3. **Chiffrement :**
   - Niveau de sensibilité des données ?
   - Budget pour solution HSM ou KMS ? (optionnel, 500-2000€/an)

4. **AIPD :**
   - Souhaitez-vous assistance externe ? (1500-3000€)
   - Ou réalisation interne guidée ? (modèle CNIL disponible)

### 7.3 Organisationnel

1. **Équipe actuelle :**
   - Combien de développeurs ?
   - Niveau d'expertise sécurité ?

2. **Timeline :**
   - Date limite de mise en production ?
   - Contraintes réglementaires (appel d'offres, financement) ?

3. **Budget :**
   - Enveloppe globale disponible ?
   - Priorisation : Sécurité vs Features vs Performance ?

4. **Utilisateurs :**
   - Combien d'utilisateurs attendus ? (impact sur architecture)
   - Pic de charge prévu ? (ex: rentrée scolaire)

---

## 8. ANNEXES

### 8.1 Checklist de Déploiement Production

#### Avant le déploiement

- [ ] Tous les secrets sont dans des variables d'environnement sécurisées
- [ ] `.env` retiré du repository Git
- [ ] HTTPS activé et forcé
- [ ] Helmet installé et configuré
- [ ] Rate limiting sur toutes les routes sensibles
- [ ] CORS configuré avec whitelist stricte
- [ ] Logs d'erreur masqués en production
- [ ] Monitoring et alerting configurés (Sentry)
- [ ] Backups PostgreSQL automatiques (quotidiens)
- [ ] Tests critiques passent (auth, RBAC, fiches)
- [ ] Page Politique de confidentialité publiée
- [ ] DPO désigné et contact affiché
- [ ] Registre des traitements RGPD complété
- [ ] Procédure de violation de données documentée

#### Jour du déploiement

- [ ] Backup complet de la base de données
- [ ] Test de restauration du backup
- [ ] Vérification des certificats SSL
- [ ] Test de charge basique (Apache Bench ou k6)
- [ ] Vérification des logs en temps réel
- [ ] Plan de rollback documenté et testé
- [ ] Équipe de support disponible (24h post-déploiement)

#### Post-déploiement (7 jours)

- [ ] Monitoring quotidien des erreurs
- [ ] Analyse des logs d'échecs d'authentification
- [ ] Vérification des performances (temps de réponse)
- [ ] Feedback utilisateurs collecté
- [ ] Aucune fuite de données détectée
- [ ] Audit des accès administrateurs

### 8.2 Outils Recommandés

**Sécurité**
- Helmet.js (headers HTTP)
- express-rate-limit (rate limiting)
- express-validator (validation input)
- ClamAV (scan antivirus)
- Snyk ou Dependabot (scan dépendances)

**Tests**
- Vitest (tests unitaires)
- Supertest (tests API)
- Playwright (tests E2E)
- Artillery ou k6 (load testing)

**Monitoring**
- Sentry (erreurs applicatives)
- Prometheus + Grafana (métriques)
- Winston (logging structuré)
- Datadog ou New Relic (APM - si budget)

**RGPD**
- Template CNIL (politique confidentialité)
- Axeptio ou Cookiebot (gestion consentement cookies - si applicable)
- OneTrust (plateforme RGPD complète - si gros budget)

### 8.3 Ressources Utiles

**Sécurité**
- OWASP Top 10 2021 : https://owasp.org/Top10/
- OWASP Cheat Sheet Series : https://cheatsheetseries.owasp.org/
- ANSSI Bonnes Pratiques : https://www.ssi.gouv.fr/

**RGPD**
- Guide CNIL développeurs : https://www.cnil.fr/fr/guide-rgpd-du-developpeur
- Modèles CNIL : https://www.cnil.fr/fr/modeles/
- AIPD template : https://www.cnil.fr/fr/PIA

**Node.js Security**
- Node.js Security Best Practices : https://nodejs.org/en/docs/guides/security/
- npm audit : https://docs.npmjs.com/cli/v8/commands/npm-audit

### 8.4 Contacts Utiles

**RGPD**
- CNIL : 01 53 73 22 22
- Email CNIL : contact@cnil.fr
- Plateforme plaintes : https://www.cnil.fr/fr/plaintes

**Sécurité**
- CERT-FR (incident) : cert-fr.cossi@ssi.gouv.fr
- ANSSI : https://www.ssi.gouv.fr/contactez-nous/

---

## CONCLUSION

Votre application **Passerelle CAP** présente une base solide mais nécessite des améliorations **critiques** avant mise en production, notamment :

🔴 **BLOQUANTS (1-2 semaines)** :
- Sécuriser les secrets (JWT, cookies)
- Retirer .env du repository
- Activer HTTPS et Helmet
- Implémenter droit à l'effacement RGPD
- Créer politique de confidentialité

🟡 **HAUTE PRIORITÉ (1 mois)** :
- Implémenter tests (70% couverture minimum)
- Refactoriser architecture (routes.ts)
- Compléter registre des traitements
- Réaliser AIPD

Le **coût minimal** pour une mise en production sécurisée et conforme RGPD est estimé à **12 320€** (phases 1 et 2), incluant :
- 7 jours de développeur senior
- 2 jours d'expert sécurité/RGPD
- 10 jours de développeur junior pour tests

**Prochaines étapes recommandées** :
1. Implémenter les Quick Wins (1 jour = 560€)
2. Valider budget et timeline
3. Prioriser Phase 1 (critique)
4. Planifier Phase 2 en parallèle du développement Phase 1

N'hésitez pas à me solliciter pour toute précision ou assistance sur la mise en œuvre de ces recommandations.

---

**Rédigé par :** Claude Code (Anthropic)
**Date :** 14 octobre 2025
**Version :** 1.0
