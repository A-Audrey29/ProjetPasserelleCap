# Guide de Déploiement - Passerelle CAP sur o2switch

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Étape 1 : Préparation de la base de données Neon](#étape-1--préparation-de-la-base-de-données-neon)
4. [Étape 2 : Configuration des variables d'environnement](#étape-2--configuration-des-variables-denvironnement)
5. [Étape 3 : Préparation du code](#étape-3--préparation-du-code)
6. [Étape 4 : Déploiement sur o2switch](#étape-4--déploiement-sur-o2switch)
7. [Étape 5 : Configuration du domaine](#étape-5--configuration-du-domaine)
8. [Étape 6 : Vérifications post-déploiement](#étape-6--vérifications-post-déploiement)
9. [Troubleshooting](#troubleshooting)

---

## Vue d'ensemble

Ce guide détaille le déploiement de **Passerelle CAP** sur l'hébergement o2switch avec Node.js natif.

**Configuration cible** :
- Domaine : `cap.fevesguadeloupeetsaintmartin.org`
- Hébergement : o2switch (Node.js natif)
- Base de données : Neon PostgreSQL (branche production)
- Email : Brevo SMTP
- Architecture : Serveur unique (Vite + Express)

---

## Prérequis

Avant de commencer, assurez-vous d'avoir :

- ✅ Un compte o2switch actif avec accès Node.js
- ✅ Un compte Neon (base de données PostgreSQL)
- ✅ Un compte Brevo (envoi d'emails SMTP)
- ✅ Accès SSH à votre serveur o2switch
- ✅ Le code source de Passerelle CAP
- ✅ Git installé localement

---

## Étape 1 : Préparation de la base de données Neon

### 1.1 Créer une branche production

1. Connectez-vous à [Neon Console](https://console.neon.tech/)
2. Sélectionnez votre projet **Passerelle CAP**
3. Allez dans l'onglet **Branches**
4. Cliquez sur **Create branch**
5. Configurez la branche :
   ```
   Nom : production
   Source : main (branche par défaut)
   Compute endpoint : Create new compute
   ```
6. Cliquez sur **Create branch**

### 1.2 Récupérer l'URL de connexion

1. Une fois la branche créée, cliquez dessus
2. Dans la section **Connection Details**, sélectionnez :
   - **Connection string**
   - **Pooled connection** (recommandé pour production)
3. Copiez l'URL complète, elle ressemble à :
   ```
   postgresql://user:password@ep-xxxxx-pooler.eu-central-1.aws.neon.tech/passerelle_cap?sslmode=require
   ```
4. **Conservez cette URL**, vous en aurez besoin pour `.env.production`

### 1.3 Migrer le schéma vers la production

Sur votre machine locale :

```bash
# Temporairement, définir l'URL de production
export DATABASE_URL="postgresql://user:password@ep-xxxxx-pooler.eu-central-1.aws.neon.tech/passerelle_cap?sslmode=require"

# Pousser le schéma vers la base de production
npm run db:push

# Réinitialiser l'URL locale
unset DATABASE_URL
```

> ⚠️ **Important** : Ne copiez PAS les données de développement en production. La base production doit démarrer vide.

---

## Étape 2 : Configuration des variables d'environnement

### 2.1 Générer le fichier de production

Sur votre machine locale, exécutez :

```bash
node scripts/generate-env-files.js production
```

Cela crée le fichier `.env.production` avec les valeurs par défaut.

### 2.2 Éditer `.env.production`

Ouvrez `.env.production` et modifiez les valeurs suivantes :

#### 🔐 Base de données
```bash
DATABASE_URL=postgresql://user:password@ep-xxxxx-pooler.eu-central-1.aws.neon.tech/passerelle_cap?sslmode=require
```
👉 Utilisez l'URL récupérée à l'étape 1.2

#### 🔐 Sécurité & Authentification

Générez des secrets forts avec OpenSSL :
```bash
openssl rand -base64 32
```

Exécutez cette commande **deux fois** pour obtenir deux secrets différents, puis remplissez :

```bash
JWT_SECRET=VotreSecretJWT_MinimumTrenteDeuxCaracteres_GenereParOpenSSL
COOKIE_SECRET=VotreSecretCookie_MinimumTrenteDeuxCaracteres_GenereParOpenSSL
```

#### 🌐 CORS & Domaine

```bash
CORS_ORIGIN=https://cap.fevesguadeloupeetsaintmartin.org
```

#### 📧 Email / SMTP (Brevo)

1. Connectez-vous à [Brevo](https://app.brevo.com/)
2. Allez dans **Settings** > **SMTP & API**
3. Créez une clé SMTP ou utilisez celle existante
4. Remplissez dans `.env.production` :

```bash
EMAIL_INTERCEPT=false
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USER=votre-email@example.com
EMAIL_PASS=votre-cle-smtp-brevo
EMAIL_FROM_ADDRESS=noreply@fevesguadeloupeetsaintmartin.org
EMAIL_FROM_NAME=Passerelle CAP
```

> ⚠️ **EMAIL_INTERCEPT=false** : Les emails seront **réellement envoyés** en production

#### 🎭 Comptes de démonstration

```bash
ALLOW_DEMO_ACTIONS=false
VITE_ENABLE_DEMO_ACCOUNTS=false
```

> ✅ Les comptes démo seront en **lecture seule** et **masqués** en production

#### 📱 Frontend

```bash
VITE_API_URL=https://cap.fevesguadeloupeetsaintmartin.org
```

### 2.3 Vérifier le fichier complet

Assurez-vous que **toutes les variables** sont remplies. Voici un exemple complet :

```bash
# ========================================
# CONFIGURATION PRODUCTION (O2SWITCH)
# ========================================

# ENVIRONNEMENT
NODE_ENV=production

# SERVEUR
PORT=5000
HOST=0.0.0.0
FRONTEND_URL=https://cap.fevesguadeloupeetsaintmartin.org

# BASE DE DONNÉES
DATABASE_URL=postgresql://user:password@ep-xxxxx-pooler.eu-central-1.aws.neon.tech/passerelle_cap?sslmode=require

# SÉCURITÉ & AUTHENTIFICATION
JWT_SECRET=VotreSecretJWT_GenereParOpenSSL_32Chars
COOKIE_SECRET=VotreSecretCookie_GenereParOpenSSL_32Chars
JWT_EXPIRES_IN=24h
COOKIE_MAX_AGE=86400000
BCRYPT_ROUNDS=12

# CORS & SÉCURITÉ
CORS_ORIGIN=https://cap.fevesguadeloupeetsaintmartin.org

# EMAIL / SMTP
EMAIL_INTERCEPT=false
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USER=votre-email@example.com
EMAIL_PASS=votre-cle-smtp-brevo
EMAIL_FROM_ADDRESS=noreply@fevesguadeloupeetsaintmartin.org
EMAIL_FROM_NAME=Passerelle CAP

# UPLOAD DE FICHIERS
UPLOADS_DIR=uploads
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=application/pdf,image/jpeg,image/png

# RATE LIMITING
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=500

# COMPTES DE DÉMONSTRATION
ALLOW_DEMO_ACTIONS=false

# FRONTEND (Variables VITE_*)
VITE_ENABLE_DEMO_ACCOUNTS=false
VITE_API_URL=https://cap.fevesguadeloupeetsaintmartin.org

# LOGS & DEBUG
LOG_LEVEL=info
```

---

## Étape 3 : Préparation du code

### 3.1 Compiler le projet pour la production

Sur votre machine locale :

```bash
# Installer les dépendances si nécessaire
npm install

# Compiler le frontend (Vite) et le backend (esbuild)
npm run build
```

Cette commande :
1. Compile le frontend React avec Vite → crée `client/dist/`
2. Compile le backend TypeScript avec esbuild → crée `dist/index.js`

> ✅ Les fichiers compilés sont **prêts pour la production** (JavaScript optimisé, pas de TypeScript)

### 3.2 Nettoyer le projet

```bash
# Supprimer les fichiers de développement inutiles
rm -rf node_modules
rm -rf .git

# Créer une archive propre
tar -czf passerelle-cap.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.env.development' \
  --exclude='.env.production' \
  --exclude='.env.local' \
  --exclude='uploads/*' \
  --exclude='.replit' \
  --exclude='replit.nix' \
  .
```

> ⚠️ **Important** : Les fichiers `.env*` (sauf `.env.example`) ne doivent **jamais** être inclus dans l'archive

### 3.3 Vérifier le contenu

Votre archive doit contenir :
- ✅ `dist/index.js` (backend compilé)
- ✅ `client/dist/` (frontend compilé)  
- ✅ `server/` (code source backend - nécessaire au runtime pour certains modules non bundlés)
- ✅ `shared/` (schémas partagés - utilisés au runtime)
- ✅ `scripts/` (scripts utilitaires)
- ✅ `package.json` et `package-lock.json`
- ✅ `vite.config.ts`, `tsconfig.json`, `drizzle.config.ts`
- ✅ `.env.example` (template sans secrets)
- ❌ **PAS** de `node_modules/`
- ❌ **PAS** de `.env.development`, `.env.local`, `.env.production` (secrets)
- ❌ **PAS** de fichiers Replit (`.replit`, `replit.nix`)

---

## Étape 4 : Déploiement sur o2switch

### 4.1 Connexion SSH

Connectez-vous à votre serveur o2switch via SSH :

```bash
ssh votre-utilisateur@votredomaine.com
```

### 4.2 Préparer le répertoire

```bash
# Créer le répertoire pour l'application
mkdir -p ~/cap.fevesguadeloupeetsaintmartin.org
cd ~/cap.fevesguadeloupeetsaintmartin.org
```

### 4.3 Uploader l'archive

Depuis votre machine locale (dans un nouveau terminal) :

```bash
scp passerelle-cap.tar.gz votre-utilisateur@votredomaine.com:~/cap.fevesguadeloupeetsaintmartin.org/
```

### 4.4 Extraire l'archive

Sur le serveur SSH :

```bash
cd ~/cap.fevesguadeloupeetsaintmartin.org
tar -xzf passerelle-cap.tar.gz
rm passerelle-cap.tar.gz
```

### 4.5 Copier le fichier `.env.production`

Depuis votre machine locale :

```bash
scp .env.production votre-utilisateur@votredomaine.com:~/cap.fevesguadeloupeetsaintmartin.org/.env.production
```

### 4.6 Installer les dépendances

Sur le serveur SSH :

```bash
cd ~/cap.fevesguadeloupeetsaintmartin.org

# Vérifier la version de Node.js (doit être >= 18)
node --version

# Installer TOUTES les dépendances (y compris devDependencies)
npm ci
```

> ⚠️ **Important** : Nous installons **toutes** les dépendances (y compris `tsx`, `drizzle-kit`, etc.) car certains modules TypeScript (`shared/`, `server/`) ne sont pas complètement bundlés et sont utilisés au runtime
> 
> 💡 `npm ci` est plus rapide et plus fiable que `npm install` pour la production

### 4.7 Créer les répertoires de stockage

```bash
# Répertoires locaux pour les uploads
mkdir -p uploads/navettes
mkdir -p uploads/bilans
chmod 755 uploads uploads/navettes uploads/bilans

# Répertoires distants SFTP (en dehors du répertoire web, pour sécurité)
mkdir -p ~/uploads/navettes
mkdir -p ~/uploads/bilans
chmod 755 ~/uploads ~/uploads/navettes ~/uploads/bilans
```

> 🔒 **Sécurité** : Les fichiers PDF sont automatiquement synchronisés vers `~/uploads/` (en dehors du répertoire web) via SFTP pour éviter l'accès direct via URL publique.

### 4.8 Configurer la variable SFTP_PASSWORD

Éditez le fichier `.env.production` sur le serveur et assurez-vous que `SFTP_PASSWORD` est bien renseignée :

```bash
nano .env.production
```

Ajoutez ou vérifiez cette ligne :

```env
SFTP_PASSWORD=votre_mot_de_passe_sftp_o2switch
```

> ⚠️ **Important** : Cette variable est **uniquement** utilisée en production pour synchroniser automatiquement les fichiers PDF uploadés (contrats, bilans) vers le stockage sécurisé SFTP.
> 
> En développement (NODE_ENV=development), la synchronisation SFTP est **désactivée** - les fichiers restent locaux uniquement.

**Comment ça fonctionne** :
- Lors d'un upload de PDF (contrat commune ou bilan d'atelier)
- Le fichier est sauvegardé localement dans `/uploads/navettes/` ou `/uploads/bilans/`
- **Automatiquement**, en production, le fichier est aussi transféré via SFTP vers :
  - `/home/kalo4499/uploads/navettes/` (hors répertoire web)
  - `/home/kalo4499/uploads/bilans/` (hors répertoire web)
- En cas d'échec SFTP, le fichier local reste disponible (fallback)

### 4.9 Configuration du process Node.js avec o2switch

O2switch utilise un système de gestion de processus Node.js. Voici comment configurer votre application :

#### Option A : Interface cPanel (recommandé)

1. Connectez-vous au **cPanel o2switch**
2. Allez dans **Setup Node.js App**
3. Créez une nouvelle application :
   ```
   Node.js version : 18.x ou 20.x (la plus récente disponible)
   Application mode : Production
   Application root : cap.fevesguadeloupeetsaintmartin.org
   Application URL : cap.fevesguadeloupeetsaintmartin.org
   Application startup file : dist/index.js
   ```
4. Dans la section **Environment variables**, ajoutez :
   ```
   NODE_ENV=production
   PORT=5000
   ```
5. Cliquez sur **Create**

> ✅ o2switch pointera vers le fichier JavaScript **compilé** (`dist/index.js`), pas vers les sources TypeScript

#### Option B : Utiliser npm start (alternative)

Si l'interface cPanel permet de spécifier une commande au lieu d'un fichier :

1. Dans **Application startup file**, laissez vide ou mettez `package.json`
2. Dans **Custom startup command**, mettez :
   ```
   npm start
   ```
3. Cette commande exécutera automatiquement `node dist/index.js` avec les bonnes variables d'environnement

#### Option C : Configuration PM2 manuelle

Si o2switch utilise PM2 ou un gestionnaire similaire, créez un fichier `ecosystem.config.js` :

```javascript
module.exports = {
  apps: [{
    name: 'passerelle-cap',
    script: 'dist/index.js',
    interpreter: 'node',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
```

Puis démarrez :
```bash
pm2 start ecosystem.config.js --env production
pm2 save
```

> 💡 **Important** : Utilisez toujours le fichier **compilé** (`dist/index.js`) en production, jamais les sources TypeScript (`.ts`)

### 4.9 Démarrer l'application

Si vous avez utilisé l'interface cPanel, l'application démarre automatiquement.

Sinon, démarrez manuellement :

```bash
cd ~/cap.fevesguadeloupeetsaintmartin.org
NODE_ENV=production npm start
```

### 4.10 Vérifier que l'application fonctionne

```bash
# Tester localement sur le serveur
curl http://localhost:5000/api/auth/me

# Vous devriez recevoir une réponse 401 (normal, non authentifié)
# Exemple : {"message":"Non autorisé - Token manquant"}
```

---

## Étape 5 : Configuration du domaine

### 5.1 Pointer le sous-domaine vers o2switch

Dans votre zone DNS (chez votre registrar ou o2switch) :

1. Ajoutez un enregistrement **A** :
   ```
   Type : A
   Nom : cap
   Valeur : [Adresse IP de votre serveur o2switch]
   TTL : 3600
   ```

2. **OU** ajoutez un enregistrement **CNAME** :
   ```
   Type : CNAME
   Nom : cap
   Valeur : votredomaine.com
   TTL : 3600
   ```

> ⏱️ La propagation DNS peut prendre jusqu'à 24h, mais généralement c'est rapide (15-30 min)

### 5.2 Configurer SSL/TLS (HTTPS)

O2switch propose **Let's Encrypt** gratuit via cPanel :

1. Allez dans **cPanel** > **SSL/TLS**
2. Cliquez sur **Let's Encrypt SSL**
3. Sélectionnez le domaine `cap.fevesguadeloupeetsaintmartin.org`
4. Cliquez sur **Issue** pour générer le certificat
5. Le renouvellement est **automatique**

### 5.3 Forcer HTTPS

Dans cPanel > **Domains** :
1. Sélectionnez `cap.fevesguadeloupeetsaintmartin.org`
2. Activez **Force HTTPS Redirect**

---

## Étape 6 : Vérifications post-déploiement

### 6.1 Accès à l'application

Ouvrez votre navigateur et accédez à :
```
https://cap.fevesguadeloupeetsaintmartin.org
```

Vous devriez voir la page de connexion **sans la section "Comptes de démonstration"**.

### 6.2 Vérifier la connexion à la base de données

1. Essayez de vous connecter avec un compte existant
2. Si vous n'avez pas encore de compte, créez-en un via l'interface admin (vous devrez le créer directement en base ou via un script de seed)

### 6.3 Tester l'envoi d'emails

1. Effectuez une action qui déclenche un email (ex: création de fiche)
2. Vérifiez que l'email arrive bien dans la boîte de destination
3. Vérifiez les logs Brevo pour confirmer l'envoi

### 6.4 Vérifier les comptes démo

1. Essayez de vous connecter avec un compte démo (ex: `admin@passerelle.cap`)
2. Essayez d'effectuer une action d'écriture (création, modification, suppression)
3. Vous devriez recevoir un message d'erreur : **"Action non autorisée pour les comptes de démonstration en production"**

### 6.5 Vérifier les logs de l'application

Sur le serveur SSH :

```bash
# Si vous utilisez PM2
pm2 logs passerelle-cap

# Sinon, vérifiez les logs o2switch (selon leur configuration)
tail -f ~/logs/passerelle-cap.log
```

Recherchez :
- ✅ Aucune erreur de connexion à la base de données
- ✅ Message de démarrage : `serving on port 5000`
- ✅ Pas de message `EMAIL INTERCEPTION ACTIVE`

---

## Troubleshooting

### Problème : L'application ne démarre pas

**Symptôme** : Erreur 502 Bad Gateway ou l'application crash au démarrage

**Solutions** :

1. Vérifiez les logs :
   ```bash
   pm2 logs passerelle-cap --lines 100
   ```

2. Vérifiez que `.env.production` existe :
   ```bash
   ls -la .env.production
   ```

3. Vérifiez que `NODE_ENV` est bien défini :
   ```bash
   echo $NODE_ENV
   # Doit afficher : production
   ```

4. Vérifiez les dépendances :
   ```bash
   npm ci --production=false
   ```

### Problème : Erreur de connexion à la base de données

**Symptôme** : Erreur 500 avec message `Connection refused` ou `Database error`

**Solutions** :

1. Vérifiez l'URL de connexion dans `.env.production` :
   ```bash
   grep DATABASE_URL .env.production
   ```

2. Testez la connexion depuis le serveur :
   ```bash
   psql "postgresql://user:password@ep-xxxxx-pooler.eu-central-1.aws.neon.tech/passerelle_cap?sslmode=require" -c "SELECT 1;"
   ```

3. Vérifiez que la branche Neon production est active et accessible

4. Vérifiez les règles de pare-feu (Neon autorise toutes les IPs par défaut)

### Problème : Les emails ne sont pas envoyés

**Symptôme** : Aucun email reçu après une action

**Solutions** :

1. Vérifiez que `EMAIL_INTERCEPT=false` dans `.env.production`

2. Vérifiez les credentials Brevo :
   ```bash
   grep EMAIL_ .env.production
   ```

3. Testez la connexion SMTP depuis le serveur :
   ```bash
   telnet smtp-relay.brevo.com 587
   ```

4. Vérifiez les logs Brevo pour voir si les emails ont été rejetés

5. Vérifiez que l'adresse `EMAIL_FROM_ADDRESS` est vérifiée dans Brevo

### Problème : CORS errors dans la console

**Symptôme** : Erreurs CORS dans la console du navigateur

**Solutions** :

1. Vérifiez `CORS_ORIGIN` dans `.env.production` :
   ```bash
   grep CORS_ORIGIN .env.production
   # Doit être : https://cap.fevesguadeloupeetsaintmartin.org
   ```

2. Assurez-vous d'utiliser HTTPS et non HTTP

3. Redémarrez l'application :
   ```bash
   pm2 restart passerelle-cap
   ```

### Problème : Les fichiers uploadés ne sont pas sauvegardés

**Symptôme** : Erreur lors de l'upload de fichiers

**Solutions** :

1. Vérifiez que le dossier `uploads/` existe et a les bonnes permissions :
   ```bash
   ls -la uploads/
   chmod 755 uploads/
   ```

2. Vérifiez l'espace disque disponible :
   ```bash
   df -h
   ```

### Problème : Les comptes démo fonctionnent encore en écriture

**Symptôme** : Les comptes démo peuvent modifier des données

**Solutions** :

1. Vérifiez `ALLOW_DEMO_ACTIONS` :
   ```bash
   grep ALLOW_DEMO_ACTIONS .env.production
   # Doit être : false
   ```

2. Redémarrez l'application :
   ```bash
   pm2 restart passerelle-cap
   ```

### Problème : Mauvaise version de Node.js

**Symptôme** : Erreurs de syntaxe ou modules incompatibles

**Solutions** :

1. Vérifiez la version de Node.js :
   ```bash
   node --version
   # Doit être >= 18.0.0
   ```

2. Si la version est trop ancienne, demandez à o2switch de mettre à jour ou utilisez `nvm` :
   ```bash
   nvm install 20
   nvm use 20
   ```

### Problème : Application lente ou qui crash

**Symptôme** : Timeouts, 504 Gateway Timeout

**Solutions** :

1. Augmentez la mémoire allouée dans `ecosystem.config.js` :
   ```javascript
   max_memory_restart: '1G'
   ```

2. Vérifiez l'utilisation des ressources :
   ```bash
   pm2 monit
   ```

3. Optimisez les requêtes à la base de données (ajoutez des index si nécessaire)

---

## 🎉 Déploiement terminé !

Votre application **Passerelle CAP** est maintenant en production sur o2switch !

### Checklist finale

- ✅ Application accessible sur `https://cap.fevesguadeloupeetsaintmartin.org`
- ✅ HTTPS actif avec certificat SSL valide
- ✅ Connexion à la base de données Neon production
- ✅ Emails envoyés via Brevo SMTP
- ✅ Comptes démo en lecture seule
- ✅ Section "Comptes de démonstration" masquée
- ✅ Logs accessibles pour le monitoring

### Prochaines étapes

1. **Monitoring** : Configurez une surveillance (uptime monitoring)
2. **Sauvegardes** : Configurez des backups automatiques de la base Neon
3. **Formation** : Formez les utilisateurs à l'utilisation de la plateforme
4. **Documentation** : Créez un guide utilisateur

### Support

En cas de problème :
1. Consultez la section [Troubleshooting](#troubleshooting)
2. Vérifiez les logs de l'application
3. Contactez le support o2switch si nécessaire
4. Vérifiez la documentation Neon et Brevo

---

**Dernière mise à jour** : 23 octobre 2025
