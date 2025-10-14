# PLAN D'ACTION IMMÉDIAT - PASSERELLE CAP
## Sécurisation Critique Avant Production

**Durée estimée :** 5-7 jours ouvrés
**Budget minimum :** 3 500 - 5 000€
**Risque si non fait :** 🔴 CRITIQUE - Fuite de données, sanctions RGPD, compromission système

---

## JOUR 1 : SÉCURISATION DES SECRETS 🔴

### Matin (4h)

#### 1. Générer de nouveaux secrets (30min)
```bash
# Sur votre machine locale
echo "JWT_SECRET=$(openssl rand -base64 64)" >> .env.new
echo "COOKIE_SECRET=$(openssl rand -base64 64)" >> .env.new
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env.new

# Afficher les secrets
cat .env.new
```

#### 2. Configurer Replit Secrets (30min)
1. Aller dans **Tools → Secrets** sur Replit
2. Créer les secrets suivants :
   - `JWT_SECRET` : copier depuis .env.new
   - `COOKIE_SECRET` : copier depuis .env.new
   - `DATABASE_URL` : copier depuis .env actuel
   - `SENDGRID_API_KEY` : si vous en avez une
   - `ENCRYPTION_KEY` : copier depuis .env.new

3. **IMPORTANT** : Vérifier que `process.env.JWT_SECRET` fonctionne dans le code

#### 3. Retirer .env du repository (15min)
```bash
# Sauvegarder d'abord
cp .env .env.backup.local

# Retirer du git
git rm --cached .env

# Vérifier que .gitignore contient .env
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
echo "!.env.example" >> .gitignore

# Commit
git add .gitignore
git commit -m "security: Remove .env from repository and add to .gitignore"
git push
```

#### 4. Créer .env.example (15min)
```bash
# Créer fichier template
cat > .env.example << 'EOF'
# Base de données PostgreSQL
DATABASE_URL="postgresql://username:password@host:port/database"

# Secrets (à régénérer avec: openssl rand -base64 64)
JWT_SECRET="CHANGE_ME"
COOKIE_SECRET="CHANGE_ME"
ENCRYPTION_KEY="CHANGE_ME"

# Environnement
NODE_ENV="development"
PORT=5000
HOST="0.0.0.0"

# Email
SENDGRID_API_KEY="YOUR_SENDGRID_API_KEY"
EMAIL_INTERCEPT="true"

# Frontend URL
FRONTEND_URL="http://localhost:5173"
EOF

git add .env.example
git commit -m "docs: Add .env.example template"
git push
```

#### 5. Tester l'application (2h)
```bash
# Vérifier que tout fonctionne
npm run dev

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test JWT
# (vérifier qu'un nouveau JWT est généré)
```

**✅ Livrable Jour 1 :**
- [ ] Secrets régénérés et stockés dans Replit Secrets
- [ ] .env retiré du repository
- [ ] .env.example créé
- [ ] Application testée et fonctionnelle

---

## JOUR 2 : SÉCURITÉ HTTP 🔴

### Matin (3h)

#### 1. Installer Helmet (30min)
```bash
npm install helmet
```

**Fichier :** `server/index.ts`
```typescript
import helmet from 'helmet';

const app = express();

// AJOUTER APRÈS la création de app, AVANT les autres middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));

app.use(express.json());
// ... reste du code
```

#### 2. Forcer HTTPS (1h)
**Fichier :** `server/index.ts`
```typescript
// AJOUTER après app.use(helmet())
app.use((req, res, next) => {
  // En production, forcer HTTPS
  if (process.env.NODE_ENV === 'production') {
    const proto = req.header('x-forwarded-proto') || req.protocol;
    if (proto !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
  }
  next();
});
```

#### 3. Configurer CORS proprement (1h)
```bash
npm install cors
```

**Fichier :** `server/index.ts`
```typescript
import cors from 'cors';

// AJOUTER après le middleware HTTPS
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser requests sans origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### 4. Tester (30min)
```bash
# Vérifier headers de sécurité
curl -I http://localhost:5000/api/auth/me

# Devrait afficher :
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Après-midi (3h)

#### 5. Rate Limiting (2h)
```bash
npm install express-rate-limit
```

**Créer fichier :** `server/middleware/rateLimiter.ts`
```typescript
import rateLimit from 'express-rate-limit';

// Rate limiter pour login (strict)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives
  message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  // Identifier par IP + email
  keyGenerator: (req) => {
    return `${req.ip}-${req.body.email || 'unknown'}`;
  }
});

// Rate limiter pour API générale (souple)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes
  message: 'Trop de requêtes. Veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter pour uploads (très strict)
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // 10 uploads max
  message: 'Limite d\'upload atteinte. Veuillez réessayer dans 1 heure.'
});
```

**Fichier :** `server/routes.ts`
```typescript
import { loginLimiter, apiLimiter, uploadLimiter } from './middleware/rateLimiter';

// AJOUTER au début de registerRoutes
app.use('/api', apiLimiter);

// MODIFIER la route login
app.post('/api/auth/login', loginLimiter, validateRequest(loginSchema), async (req, res) => {
  // ... code existant
});

// MODIFIER les routes upload
app.post('/api/uploads', requireAuth, uploadLimiter, upload.single('file'), async (req, res) => {
  // ... code existant
});
```

#### 6. Test de charge basique (1h)
```bash
# Installer k6
brew install k6  # macOS
# ou
sudo apt install k6  # Linux

# Créer script de test
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '2m', target: 10 },
    { duration: '1m', target: 0 },
  ],
};

export default function () {
  const res = http.get('http://localhost:5000/api/auth/me');
  check(res, {
    'status is 401': (r) => r.status === 401,
  });
}
EOF

# Lancer test
k6 run load-test.js
```

**✅ Livrable Jour 2 :**
- [ ] Helmet installé et configuré
- [ ] HTTPS forcé
- [ ] CORS configuré
- [ ] Rate limiting implémenté
- [ ] Tests de charge passés

---

## JOUR 3 : SÉCURISATION DES UPLOADS 🔴

### Matin (4h)

#### 1. Noms de fichiers sécurisés (1h)
**Fichier :** `server/routes.ts`
```typescript
import { randomBytes } from 'crypto';

// REMPLACER le multer config pour contracts
const uploadContractPDF = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      // Générer nom aléatoire sécurisé
      const randomName = randomBytes(32).toString('hex');
      const extension = path.extname(file.originalname);
      const filename = `contract_${randomName}${extension}`;
      cb(null, filename);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont autorisés'), false);
    }
  }
});

// MÊME CHOSE pour uploadReportPDF
const uploadReportPDF = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const randomName = randomBytes(32).toString('hex');
      const extension = path.extname(file.originalname);
      const filename = `report_${randomName}${extension}`;
      cb(null, filename);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont autorisés'), false);
    }
  }
});
```

#### 2. Validation MIME type réelle (2h)
```bash
npm install file-type
```

**Créer fichier :** `server/middleware/fileValidator.ts`
```typescript
import { fileTypeFromFile } from 'file-type';
import fs from 'fs';

const ALLOWED_MIME_TYPES = {
  pdf: ['application/pdf'],
  image: ['image/jpeg', 'image/png', 'image/jpg']
};

export async function validateUploadedFile(
  filePath: string,
  expectedType: 'pdf' | 'image'
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: 'Fichier non trouvé' };
    }

    // Vérifier le vrai type MIME
    const fileType = await fileTypeFromFile(filePath);

    if (!fileType) {
      // Fichier non reconnu, supprimer
      fs.unlinkSync(filePath);
      return { valid: false, error: 'Type de fichier non reconnu' };
    }

    const allowedTypes = ALLOWED_MIME_TYPES[expectedType];

    if (!allowedTypes.includes(fileType.mime)) {
      // Type invalide, supprimer
      fs.unlinkSync(filePath);
      return {
        valid: false,
        error: `Type de fichier invalide. Attendu: ${expectedType}, reçu: ${fileType.mime}`
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating file:', error);
    // En cas d'erreur, supprimer le fichier par sécurité
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { valid: false, error: 'Erreur lors de la validation du fichier' };
  }
}
```

**Fichier :** `server/routes.ts`
```typescript
import { validateUploadedFile } from './middleware/fileValidator';

// MODIFIER la route upload
app.post('/api/uploads', requireAuth, uploadLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    // Valider le type MIME réel
    const validation = await validateUploadedFile(
      req.file.path,
      req.file.mimetype === 'application/pdf' ? 'pdf' : 'image'
    );

    if (!validation.valid) {
      return res.status(400).json({ message: validation.error });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      url: fileUrl,
      name: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Erreur lors du téléchargement' });
  }
});
```

#### 3. Scan antivirus (optionnel mais recommandé) (1h)
```bash
# Option 1 : ClamAV (gratuit, self-hosted)
sudo apt-get install clamav clamav-daemon

# Option 2 : VirusTotal API (gratuit jusqu'à 500 req/jour)
npm install virustotal-api
```

**Si VirusTotal :** `server/middleware/virusScan.ts`
```typescript
import virustotal from 'virustotal-api';
import fs from 'fs';

const vt = virustotal(process.env.VIRUSTOTAL_API_KEY);

export async function scanFile(filePath: string): Promise<{ safe: boolean; error?: string }> {
  try {
    const fileBuffer = fs.readFileSync(filePath);

    // Upload et scan
    const result = await vt.fileScan(fileBuffer);

    // Attendre résultat (peut prendre 30s)
    await new Promise(resolve => setTimeout(resolve, 30000));

    const report = await vt.fileReport(result.resource);

    if (report.positives > 0) {
      // Fichier malveillant détecté
      fs.unlinkSync(filePath);
      return {
        safe: false,
        error: `Fichier malveillant détecté (${report.positives}/${report.total} antivirus)`
      };
    }

    return { safe: true };
  } catch (error) {
    console.error('Virus scan error:', error);
    // En cas d'erreur scan, on autorise (mais on log)
    return { safe: true };
  }
}
```

### Après-midi (2h)

#### 4. Sécuriser l'accès aux fichiers (2h)
**Créer fichier :** `server/middleware/fileAccess.ts`
```typescript
import { storage } from '../storage';

export async function canAccessFile(
  userId: string,
  userRole: string,
  filename: string
): Promise<boolean> {
  try {
    // Extract file type from name
    if (filename.startsWith('contract_')) {
      // Contrat : accessible par ADMIN, RELATIONS_EVS, EVS_CS concerné
      if (['ADMIN', 'RELATIONS_EVS'].includes(userRole)) return true;

      // TODO: Vérifier que l'EVS_CS appartient à l'org du contrat
      return true; // À implémenter correctement
    }

    if (filename.startsWith('report_')) {
      // Rapport : accessible par tous les utilisateurs authentifiés
      return true;
    }

    if (filename.startsWith('final-report-')) {
      // Rapport final : accessible par ADMIN, RELATIONS_EVS, EVS_CS, EMETTEUR de la fiche
      return true; // À implémenter correctement
    }

    // Par défaut, refuser
    return false;
  } catch (error) {
    console.error('File access check error:', error);
    return false;
  }
}
```

**Fichier :** `server/routes.ts`
```typescript
import { canAccessFile } from './middleware/fileAccess';

// REMPLACER la route /uploads/:filename
app.get('/uploads/:filename', requireAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);

    // Vérifier existence
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    // Vérifier permissions
    const hasAccess = await canAccessFile(
      req.user.userId,
      req.user.role,
      filename
    );

    if (!hasAccess) {
      return res.status(403).json({ message: 'Accès interdit' });
    }

    // Servir le fichier
    res.sendFile(filePath);
  } catch (error) {
    console.error('File serve error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
```

**✅ Livrable Jour 3 :**
- [ ] Noms de fichiers aléatoires
- [ ] Validation MIME type réelle
- [ ] Scan antivirus (optionnel)
- [ ] Contrôle d'accès aux fichiers
- [ ] Tests d'upload sécurisés

---

## JOUR 4 : RGPD - POLITIQUE DE CONFIDENTIALITÉ 🟡

### Matin (3h)

#### 1. Créer page politique de confidentialité (3h)
**Créer fichier :** `client/src/pages/privacy-policy.tsx`
```typescript
export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Politique de Confidentialité</h1>

      <p className="text-sm text-gray-600 mb-8">
        Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
      </p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. Responsable du traitement</h2>
        <p>
          FEVES Guadeloupe et Saint-Martin<br />
          Adresse : [À COMPLÉTER]<br />
          Email : dpo@passerelle-cap.fr<br />
          Téléphone : [À COMPLÉTER]
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">2. Données collectées</h2>

        <h3 className="text-xl font-medium mb-2">2.1 Données des utilisateurs</h3>
        <ul className="list-disc ml-6 mb-4">
          <li>Identité : nom, prénom, email</li>
          <li>Coordonnées : téléphone, structure</li>
          <li>Données de connexion : mot de passe (hashé), logs de connexion</li>
          <li>Rôle et organisation</li>
        </ul>

        <h3 className="text-xl font-medium mb-2">2.2 Données des familles bénéficiaires</h3>
        <ul className="list-disc ml-6 mb-4">
          <li>Données du référent social</li>
          <li>Composition familiale (parents, enfants)</li>
          <li>Situation familiale</li>
          <li>Documents CAP (justificatifs)</li>
          <li>Consentement explicite</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">3. Finalités du traitement</h2>
        <ul className="list-disc ml-6">
          <li>Gestion du dispositif CAP (Contrat d'Accompagnement Parental)</li>
          <li>Coordination entre FEVES et structures EVS/CS</li>
          <li>Suivi des ateliers et accompagnements familiaux</li>
          <li>Reporting et statistiques anonymisées</li>
          <li>Audit et traçabilité des actions</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">4. Base légale</h2>
        <p>
          Le traitement est fondé sur :
        </p>
        <ul className="list-disc ml-6">
          <li><strong>Consentement explicite</strong> des familles bénéficiaires (article 6.1.a RGPD)</li>
          <li><strong>Intérêt légitime</strong> pour la gestion administrative (article 6.1.f RGPD)</li>
          <li><strong>Mission d'intérêt public</strong> pour l'accompagnement social (article 6.1.e RGPD)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">5. Destinataires des données</h2>
        <ul className="list-disc ml-6">
          <li>Personnel autorisé FEVES</li>
          <li>Structures EVS/CS partenaires (données des familles assignées uniquement)</li>
          <li>Référents sociaux émetteurs (leurs propres fiches)</li>
          <li>Conseil Départemental (dans le cadre du dispositif)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">6. Durée de conservation</h2>
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Type de données</th>
              <th className="border p-2">Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-2">Comptes utilisateurs actifs</td>
              <td className="border p-2">Durée de la relation</td>
            </tr>
            <tr>
              <td className="border p-2">Fiches navettes actives</td>
              <td className="border p-2">Durée de l'accompagnement</td>
            </tr>
            <tr>
              <td className="border p-2">Fiches archivées</td>
              <td className="border p-2">5 ans</td>
            </tr>
            <tr>
              <td className="border p-2">Logs d'audit</td>
              <td className="border p-2">2 ans</td>
            </tr>
            <tr>
              <td className="border p-2">Emails interceptés (dev)</td>
              <td className="border p-2">3 mois</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">7. Vos droits</h2>
        <p className="mb-4">
          Conformément au RGPD, vous disposez des droits suivants :
        </p>
        <ul className="list-disc ml-6">
          <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
          <li><strong>Droit de rectification</strong> : corriger vos données inexactes</li>
          <li><strong>Droit à l'effacement</strong> : supprimer vos données</li>
          <li><strong>Droit à la portabilité</strong> : récupérer vos données dans un format structuré</li>
          <li><strong>Droit d'opposition</strong> : s'opposer au traitement de vos données</li>
          <li><strong>Droit de limitation</strong> : limiter l'utilisation de vos données</li>
        </ul>

        <p className="mt-4">
          <strong>Pour exercer vos droits :</strong><br />
          Email : dpo@passerelle-cap.fr<br />
          Délai de réponse : 1 mois maximum
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">8. Sécurité</h2>
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles appropriées :
        </p>
        <ul className="list-disc ml-6">
          <li>Chiffrement HTTPS de toutes les communications</li>
          <li>Mots de passe hashés avec bcrypt</li>
          <li>Contrôle d'accès basé sur les rôles (RBAC)</li>
          <li>Logs d'audit de toutes les actions sensibles</li>
          <li>Sauvegarde quotidienne des données</li>
          <li>Hébergement sécurisé (PostgreSQL Neon)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">9. Cookies</h2>
        <p>
          Nous utilisons uniquement des cookies strictement nécessaires :
        </p>
        <ul className="list-disc ml-6">
          <li><code>auth_token</code> : cookie d'authentification (HttpOnly, Secure)</li>
        </ul>
        <p className="mt-2">
          Aucun cookie de tracking ou publicitaire.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">10. Modifications</h2>
        <p>
          Cette politique peut être mise à jour. La date de dernière modification est indiquée en haut de page.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">11. Réclamation</h2>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL :
        </p>
        <p className="mt-2">
          <strong>CNIL</strong><br />
          3 Place de Fontenoy<br />
          TSA 80715<br />
          75334 PARIS CEDEX 07<br />
          Téléphone : 01 53 73 22 22<br />
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
            www.cnil.fr
          </a>
        </p>
      </section>

      <div className="bg-blue-50 p-4 rounded mt-8">
        <p className="text-sm">
          <strong>Contact DPO :</strong> dpo@passerelle-cap.fr
        </p>
      </div>
    </div>
  );
}
```

**Ajouter route dans `App.tsx` :**
```typescript
import PrivacyPolicy from './pages/privacy-policy';

// Dans le Router
<Route path="/privacy-policy" component={PrivacyPolicy} />
```

### Après-midi (3h)

#### 2. Ajouter lien dans footer (30min)
**Fichier :** `client/src/components/Layout.tsx` (ou équivalent)
```typescript
<footer className="bg-gray-100 py-4 mt-auto">
  <div className="container mx-auto px-4 text-center text-sm text-gray-600">
    <p>© {new Date().getFullYear()} FEVES - Passerelle CAP</p>
    <div className="mt-2 space-x-4">
      <a href="/privacy-policy" className="hover:underline">
        Politique de confidentialité
      </a>
      <a href="mailto:dpo@passerelle-cap.fr" className="hover:underline">
        Contact DPO
      </a>
    </div>
  </div>
</footer>
```

#### 3. Renforcer consentement création fiche (1h)
**Fichier :** `client/src/components/FicheForm.tsx`
```typescript
// Ajouter checkbox consentement AVANT la soumission
<div className="border border-yellow-500 bg-yellow-50 p-4 rounded mb-4">
  <label className="flex items-start space-x-3">
    <input
      type="checkbox"
      checked={familyConsent}
      onChange={(e) => setFamilyConsent(e.target.checked)}
      required
      className="mt-1"
    />
    <span className="text-sm">
      <strong className="text-red-600">* Consentement obligatoire :</strong><br />
      J'atteste avoir informé la famille bénéficiaire du traitement de ses données personnelles
      dans le cadre du dispositif CAP et avoir recueilli son consentement explicite, conformément
      à notre{' '}
      <a
        href="/privacy-policy"
        target="_blank"
        className="text-blue-600 underline"
      >
        politique de confidentialité
      </a>.
      La famille dispose d'un droit d'accès, de rectification et de suppression de ses données.
    </span>
  </label>
</div>
```

#### 4. Email de confirmation consentement (1h30)
**Fichier :** `server/services/emailService.ts`
```typescript
async sendConsentConfirmationEmail({
  referentEmail,
  referentName,
  ficheRef,
  familyName
}: {
  referentEmail: string;
  referentName: string;
  ficheRef: string;
  familyName: string;
}) {
  const mailOptions = {
    from: {
      name: 'Passerelle CAP - FEVES',
      email: 'studio.makeawave@gmail.com'
    },
    to: referentEmail,
    subject: `Confirmation - Consentement fiche ${ficheRef}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B4B61;">Confirmation de consentement</h2>

        <p>Bonjour ${referentName},</p>

        <p>
          Ce message confirme que vous avez créé la fiche <strong>${ficheRef}</strong>
          pour la famille <strong>${familyName}</strong> et attesté avoir recueilli
          le consentement explicite de la famille pour le traitement de leurs données personnelles.
        </p>

        <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Rappel des droits de la famille :</strong></p>
          <ul>
            <li>Droit d'accès à leurs données</li>
            <li>Droit de rectification</li>
            <li>Droit à l'effacement (droit à l'oubli)</li>
            <li>Droit à la portabilité</li>
          </ul>
        </div>

        <p>
          Pour toute question ou exercice de droits :
          <a href="mailto:dpo@passerelle-cap.fr">dpo@passerelle-cap.fr</a>
        </p>

        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Conformément au RGPD, cette confirmation est conservée pendant 5 ans.
        </p>
      </div>
    `
  };

  const meta = {
    event: 'consent_confirmation',
    ficheRef,
    referentEmail
  };

  return await this.deliver(mailOptions, meta);
}
```

**✅ Livrable Jour 4 :**
- [ ] Page politique de confidentialité créée
- [ ] Lien footer ajouté
- [ ] Consentement renforcé dans formulaire
- [ ] Email de confirmation consentement
- [ ] Contact DPO ajouté partout

---

## JOUR 5 : RGPD - DROIT À L'EFFACEMENT 🟡

### Toute la journée (6h)

#### 1. Endpoint suppression compte (3h)
**Créer fichier :** `server/routes/gdpr.ts`
```typescript
import type { Express } from "express";
import { requireAuth } from '../middleware/rbac';
import { storage } from '../storage';
import { auditMiddleware } from '../services/auditLogger';

export function registerGdprRoutes(app: Express) {

  // Droit à l'effacement (droit à l'oubli)
  app.post('/api/gdpr/delete-account',
    requireAuth,
    auditMiddleware('gdpr_deletion_request', 'User'),
    async (req, res) => {
      try {
        const userId = req.user.userId;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Vérifier que l'utilisateur n'est pas un ADMIN (sécurité)
        if (user.role === 'ADMIN') {
          return res.status(403).json({
            message: 'Les comptes administrateurs ne peuvent pas être supprimés via cette interface'
          });
        }

        // 1. Anonymiser les fiches émises
        const fiches = await storage.getAllFiches({ emitterId: userId });
        for (const fiche of fiches) {
          await storage.updateFiche(fiche.id, {
            referentData: null,
            familyDetailedData: null,
            childrenData: null,
            description: `[Données supprimées - Demande RGPD du ${new Date().toLocaleDateString('fr-FR')}]`
          });
        }

        // 2. Anonymiser les commentaires
        const comments = await storage.getAllComments();
        const userComments = comments.filter(c => c.authorId === userId);
        for (const comment of userComments) {
          await storage.updateComment(comment.id, {
            content: `[Commentaire supprimé - RGPD]`,
            authorId: 'DELETED_USER'
          });
        }

        // 3. Logger la demande AVANT suppression
        await storage.createAuditLog({
          action: 'gdpr_account_deleted',
          entity: 'User',
          entityId: userId,
          actorId: userId,
          meta: {
            email: user.email,
            deletionDate: new Date().toISOString(),
            reason: 'User request (RGPD Article 17)'
          }
        });

        // 4. Supprimer l'utilisateur
        await storage.deleteUser(userId);

        // 5. Clear cookie
        res.clearCookie('auth_token');

        res.json({
          message: 'Votre compte a été supprimé avec succès. Vos données ont été anonymisées conformément au RGPD.'
        });
      } catch (error) {
        console.error('GDPR deletion error:', error);
        res.status(500).json({ message: 'Erreur lors de la suppression du compte' });
      }
    }
  );

  // Droit d'accès (export données)
  app.get('/api/gdpr/export-my-data',
    requireAuth,
    auditMiddleware('gdpr_data_export', 'User'),
    async (req, res) => {
      try {
        const userId = req.user.userId;

        const userData = {
          user: await storage.getUser(userId),
          fiches: await storage.getAllFiches({ emitterId: userId }),
          comments: await storage.getAllComments().then(comments =>
            comments.filter(c => c.authorId === userId)
          ),
          auditLogs: await storage.getAuditLogs(userId)
        };

        // Masquer mot de passe
        if (userData.user) {
          delete userData.user.passwordHash;
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=my-data.json');
        res.send(JSON.stringify(userData, null, 2));
      } catch (error) {
        console.error('GDPR export error:', error);
        res.status(500).json({ message: 'Erreur lors de l\'export des données' });
      }
    }
  );
}
```

**Ajouter dans `server/routes.ts` :**
```typescript
import { registerGdprRoutes } from './routes/gdpr';

export async function registerRoutes(app: Express): Promise<Server> {
  // ... code existant

  // AJOUTER avant "return httpServer"
  registerGdprRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
```

#### 2. Interface suppression compte (2h)
**Créer fichier :** `client/src/pages/settings.tsx`
```typescript
import { useState } from 'react';
import { useNavigate } from 'wouter';

export default function Settings() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [, setLocation] = useNavigate();

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SUPPRIMER') {
      alert('Veuillez taper SUPPRIMER pour confirmer');
      return;
    }

    if (!confirm('Cette action est IRRÉVERSIBLE. Voulez-vous vraiment continuer ?')) {
      return;
    }

    try {
      const res = await fetch('/api/gdpr/delete-account', {
        method: 'POST',
        credentials: 'include'
      });

      if (res.ok) {
        alert('Votre compte a été supprimé. Vous allez être déconnecté.');
        setLocation('/login');
      } else {
        const data = await res.json();
        alert(`Erreur: ${data.message}`);
      }
    } catch (error) {
      alert('Erreur lors de la suppression du compte');
    }
  };

  const handleExportData = async () => {
    try {
      const res = await fetch('/api/gdpr/export-my-data', {
        credentials: 'include'
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my-data.json';
        a.click();
      }
    } catch (error) {
      alert('Erreur lors de l\'export');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Paramètres du compte</h1>

      {/* Export données */}
      <section className="bg-white shadow rounded p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">📥 Export de vos données</h2>
        <p className="mb-4 text-gray-600">
          Conformément à l'article 20 du RGPD, vous pouvez récupérer vos données dans un format structuré.
        </p>
        <button
          onClick={handleExportData}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Télécharger mes données (JSON)
        </button>
      </section>

      {/* Suppression compte */}
      <section className="bg-red-50 border border-red-200 rounded p-6">
        <h2 className="text-xl font-semibold mb-4 text-red-700">
          ⚠️ Zone de danger
        </h2>
        <p className="mb-4 text-gray-700">
          <strong>Suppression définitive du compte</strong><br />
          Cette action supprimera votre compte et anonymisera toutes les données associées.
          Cette action est <strong className="text-red-600">IRRÉVERSIBLE</strong>.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Supprimer mon compte
          </button>
        ) : (
          <div className="bg-white p-4 rounded border border-red-300">
            <p className="mb-3 font-medium">
              Pour confirmer, tapez <code className="bg-gray-100 px-2 py-1">SUPPRIMER</code> ci-dessous :
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="border rounded px-3 py-2 w-full mb-3"
              placeholder="Tapez SUPPRIMER"
            />
            <div className="flex space-x-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'SUPPRIMER'}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmer la suppression
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="mt-6 text-sm text-gray-600">
        <p>
          Pour toute question sur vos données :
          <a href="mailto:dpo@passerelle-cap.fr" className="text-blue-600 underline ml-1">
            dpo@passerelle-cap.fr
          </a>
        </p>
      </div>
    </div>
  );
}
```

#### 3. Tâche cron purge automatique (1h)
**Créer fichier :** `server/cron/gdprCleanup.ts`
```typescript
import { storage } from '../storage';

/**
 * Tâche CRON à exécuter mensuellement
 * Supprime/anonymise les données selon politique de rétention
 */
export async function runGdprCleanup() {
  console.log('🧹 Starting GDPR cleanup task...');

  try {
    const now = new Date();

    // 1. Supprimer fiches archivées > 5 ans
    const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
    const oldFiches = await storage.getAllFiches({ state: 'ARCHIVED' });

    let deletedFiches = 0;
    for (const fiche of oldFiches) {
      if (new Date(fiche.updatedAt) < fiveYearsAgo) {
        await storage.deleteFiche(fiche.id);
        deletedFiches++;
      }
    }

    // 2. Supprimer audit logs > 2 ans
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    // TODO: Implémenter deleteOldAuditLogs dans storage

    // 3. Supprimer email logs > 3 mois
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    // TODO: Implémenter deleteOldEmailLogs dans storage

    console.log(`✅ GDPR cleanup completed: ${deletedFiches} fiches deleted`);

    return {
      success: true,
      deletedFiches,
      timestamp: now
    };
  } catch (error) {
    console.error('❌ GDPR cleanup failed:', error);
    throw error;
  }
}

// Si exécuté directement
if (require.main === module) {
  runGdprCleanup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
```

**Ajouter cron job (Replit) :**
Dans `.replit` :
```
[[ports]]
localPort = 5000
externalPort = 80

[deployment]
run = ["npm", "start"]

# AJOUTER
[cron]
enabled = true

[[cron.jobs]]
name = "GDPR Cleanup"
schedule = "0 0 1 * *"  # 1er de chaque mois à minuit
command = "tsx server/cron/gdprCleanup.ts"
```

**✅ Livrable Jour 5 :**
- [ ] Endpoint suppression compte
- [ ] Interface utilisateur suppression
- [ ] Export de données implémenté
- [ ] Tâche cron purge automatique
- [ ] Tests de bout en bout

---

## JOUR 6-7 : TESTS ET VALIDATION 🟡

### Jour 6 : Tests unitaires critiques (6h)

#### 1. Setup tests (1h)
```bash
npm install --save-dev vitest @vitest/ui supertest @types/supertest
```

**Créer fichier :** `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]
    }
  }
});
```

**Fichier :** `package.json`
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

#### 2. Tests authentification (2h)
**Créer fichier :** `server/__tests__/auth.test.ts`
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';  // À adapter

describe('Authentication', () => {
  let authToken: string;

  it('should reject login with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('incorrect');
  });

  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',  // À créer en seed
        password: 'ValidPassword123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();

    // Extraire token pour tests suivants
    const cookie = res.headers['set-cookie'][0];
    authToken = cookie.split(';')[0].split('=')[1];
  });

  it('should access protected route with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `auth_token=${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
  });

  it('should reject protected route without token', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  it('should rate limit after 5 failed attempts', async () => {
    // Faire 5 tentatives ratées
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrong'
        });
    }

    // La 6ème devrait être bloquée
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrong'
      });

    expect(res.status).toBe(429);
    expect(res.body.message).toContain('Trop de tentatives');
  });
});
```

#### 3. Tests RBAC (2h)
**Créer fichier :** `server/__tests__/rbac.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index';

describe('Role-Based Access Control', () => {
  let adminToken: string;
  let emetteurToken: string;
  let evsToken: string;

  beforeAll(async () => {
    // Login avec différents rôles
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'admin123' });
    adminToken = adminRes.headers['set-cookie'][0].split(';')[0].split('=')[1];

    const emetteurRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'emetteur@test.com', password: 'emetteur123' });
    emetteurToken = emetteurRes.headers['set-cookie'][0].split(';')[0].split('=')[1];

    const evsRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'evs@test.com', password: 'evs123' });
    evsToken = evsRes.headers['set-cookie'][0].split(';')[0].split('=')[1];
  });

  it('ADMIN should access admin routes', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Cookie', `auth_token=${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('EMETTEUR should NOT access admin routes', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Cookie', `auth_token=${emetteurToken}`);

    expect(res.status).toBe(403);
  });

  it('EVS should only see their organization fiches', async () => {
    const res = await request(app)
      .get('/api/fiches')
      .set('Cookie', `auth_token=${evsToken}`);

    expect(res.status).toBe(200);
    const fiches = res.body;

    // Toutes les fiches retournées doivent appartenir à cette org
    fiches.forEach(fiche => {
      expect(fiche.assignedOrgId).toBe('org-id-evs');  // À adapter
    });
  });
});
```

#### 4. Lancer tests (1h)
```bash
# Lancer tous les tests
npm test

# Avec UI
npm run test:ui

# Avec couverture
npm run test:coverage
```

### Jour 7 : Tests d'intégration et validation finale (6h)

#### 1. Test workflow complet fiche (3h)
**Créer fichier :** `server/__tests__/fiche-workflow.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index';

describe('Fiche Workflow', () => {
  let emetteurToken: string;
  let relationsEvsToken: string;
  let evsToken: string;
  let ficheId: string;

  beforeAll(async () => {
    // Login users
    // ...
  });

  it('EMETTEUR creates fiche in DRAFT', async () => {
    const res = await request(app)
      .post('/api/fiches')
      .set('Cookie', `auth_token=${emetteurToken}`)
      .send({
        description: 'Test fiche',
        familyConsent: true,
        participantsCount: 2,
        referentData: { name: 'Test Referent' },
        familyDetailedData: { mother: 'Test Mother' },
        childrenData: [{ name: 'Child 1', age: 5 }]
      });

    expect(res.status).toBe(201);
    expect(res.body.state).toBe('DRAFT');
    expect(res.body.ref).toMatch(/^FN-\d{4}-\d{2}-\d{3}$/);
    ficheId = res.body.id;
  });

  it('EMETTEUR submits fiche to FEVES', async () => {
    const res = await request(app)
      .post(`/api/fiches/${ficheId}/transition`)
      .set('Cookie', `auth_token=${emetteurToken}`)
      .send({ newState: 'SUBMITTED_TO_FEVES' });

    expect(res.status).toBe(200);
    expect(res.body.state).toBe('SUBMITTED_TO_FEVES');
  });

  it('RELATIONS_EVS assigns fiche to EVS', async () => {
    const res = await request(app)
      .post(`/api/fiches/${ficheId}/assign`)
      .set('Cookie', `auth_token=${relationsEvsToken}`)
      .send({ assignedOrgId: 'org-evs-test' });

    expect(res.status).toBe(200);
    expect(res.body.state).toBe('ASSIGNED_EVS');
  });

  it('EVS accepts fiche', async () => {
    const res = await request(app)
      .post(`/api/fiches/${ficheId}/transition`)
      .set('Cookie', `auth_token=${evsToken}`)
      .send({ newState: 'ACCEPTED_EVS' });

    expect(res.status).toBe(200);
    expect(res.body.state).toBe('ACCEPTED_EVS');
  });

  // Continuer workflow jusqu'à CLOSED
});
```

#### 2. Test uploads sécurisés (2h)
**Créer fichier :** `server/__tests__/uploads.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import fs from 'fs';
import path from 'path';

describe('File Uploads Security', () => {
  let authToken: string;

  beforeAll(async () => {
    // Login
  });

  it('should accept valid PDF', async () => {
    const res = await request(app)
      .post('/api/uploads')
      .set('Cookie', `auth_token=${authToken}`)
      .attach('file', path.join(__dirname, 'fixtures/valid.pdf'));

    expect(res.status).toBe(200);
    expect(res.body.url).toBeDefined();
  });

  it('should reject file > 5MB', async () => {
    // Créer fichier temporaire > 5MB
    const largePath = path.join(__dirname, 'fixtures/large.pdf');
    fs.writeFileSync(largePath, Buffer.alloc(6 * 1024 * 1024));

    const res = await request(app)
      .post('/api/uploads')
      .set('Cookie', `auth_token=${authToken}`)
      .attach('file', largePath);

    expect(res.status).toBe(413);

    // Cleanup
    fs.unlinkSync(largePath);
  });

  it('should reject fake PDF (renamed .exe)', async () => {
    // Créer fichier .exe renommé en .pdf
    const fakePath = path.join(__dirname, 'fixtures/malicious.pdf');
    fs.writeFileSync(fakePath, 'MZ\x90\x00'); // Magic bytes .exe

    const res = await request(app)
      .post('/api/uploads')
      .set('Cookie', `auth_token=${authToken}`)
      .attach('file', fakePath);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Type de fichier invalide');

    // Cleanup
    fs.unlinkSync(fakePath);
  });

  it('should generate random filenames', async () => {
    const res1 = await request(app)
      .post('/api/uploads')
      .set('Cookie', `auth_token=${authToken}`)
      .attach('file', path.join(__dirname, 'fixtures/valid.pdf'));

    const res2 = await request(app)
      .post('/api/uploads')
      .set('Cookie', `auth_token=${authToken}`)
      .attach('file', path.join(__dirname, 'fixtures/valid.pdf'));

    expect(res1.body.url).not.toBe(res2.body.url);
    expect(res1.body.url).toMatch(/^\/uploads\/[a-f0-9]{64}\.pdf$/);
  });
});
```

#### 3. Validation finale et checklist (1h)
```bash
# 1. Tests passent tous
npm run test:coverage
# Objectif : >70% couverture

# 2. Audit dépendances
npm audit --production
# Objectif : 0 vulnérabilités high/critical

# 3. Build production
npm run build
# Objectif : pas d'erreurs

# 4. Test manuel login/logout
# 5. Test manuel création fiche
# 6. Test manuel upload fichier
# 7. Test manuel suppression compte
```

**Checklist finale :**
```markdown
## Sécurité
- [ ] Tous les secrets dans Replit Secrets
- [ ] .env retiré du repository
- [ ] Helmet activé
- [ ] HTTPS forcé
- [ ] CORS configuré
- [ ] Rate limiting actif
- [ ] Noms fichiers aléatoires
- [ ] Validation MIME type

## RGPD
- [ ] Page politique confidentialité
- [ ] Consentement explicite fiche
- [ ] Droit à l'effacement
- [ ] Export de données
- [ ] Contact DPO affiché
- [ ] Cron purge automatique

## Tests
- [ ] Tests auth passent
- [ ] Tests RBAC passent
- [ ] Tests workflow passent
- [ ] Tests uploads passent
- [ ] Couverture >70%

## Production
- [ ] Build sans erreurs
- [ ] Audit npm clean
- [ ] Test manuel complet
- [ ] Documentation à jour
```

**✅ Livrable Jours 6-7 :**
- [ ] Suite de tests complète
- [ ] Couverture >70%
- [ ] Tous les tests passent
- [ ] Checklist validée à 100%
- [ ] Application prête pour production

---

## RÉCAPITULATIF 7 JOURS

| Jour | Tâches | Heures | Bloquant |
|------|--------|--------|----------|
| 1 | Sécurisation secrets | 6h | 🔴 OUI |
| 2 | Sécurité HTTP (Helmet, CORS, Rate limiting) | 6h | 🔴 OUI |
| 3 | Sécurisation uploads | 6h | 🔴 OUI |
| 4 | RGPD - Politique confidentialité | 6h | 🟡 IMPORTANT |
| 5 | RGPD - Droit à l'effacement | 6h | 🟡 IMPORTANT |
| 6 | Tests unitaires | 6h | 🟡 IMPORTANT |
| 7 | Tests intégration + validation | 6h | 🟡 IMPORTANT |
| **TOTAL** | **42 heures** | | |

**Budget estimé :**
- 42h × 70€/h (dev senior) = **2 940€**
- + Buffer 20% imprévus = **3 530€**

**Résultat attendu :**
✅ Application sécurisée conforme OWASP
✅ Conformité RGPD de base (droit à l'effacement, politique confidentialité)
✅ Tests couvrant les fonctions critiques
✅ Prêt pour mise en production (MVP sécurisé)

---

**IMPORTANT :** Ce plan ne couvre que les éléments CRITIQUES et IMPORTANTS. Les optimisations (Phase 3 du rapport principal) devront être planifiées post-lancement sur 1-3 mois.
