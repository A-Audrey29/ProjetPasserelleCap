# Scripts Utilitaires - Passerelle CAP

## generate-env-files.js

Script de génération automatique des fichiers de configuration d'environnement (`.env.development` et `.env.production`) pour faciliter le déploiement et la migration du projet.

### 🎯 Objectif

Créer des fichiers `.env` pré-configurés pour différents environnements (développement Replit et production o2switch) avec des valeurs appropriées et une documentation inline complète.

### 📋 Prérequis

- Node.js installé
- Projet Passerelle CAP cloné
- Accès aux informations de configuration (URLs de base de données, clés API, etc.)

### 🚀 Utilisation

#### Générer le fichier de développement

```bash
node scripts/generate-env-files.js development
```

Crée `.env.development` avec :
- Configuration Neon PostgreSQL (branche dev)
- Interception des emails activée
- Comptes démo autorisés
- Logs verbeux (debug)

#### Générer le fichier de production

```bash
node scripts/generate-env-files.js production
```

Crée `.env.production` avec :
- Configuration Neon PostgreSQL (branche main)
- Envoi d'emails réels via SMTP Brevo
- Comptes démo en lecture seule
- Logs production (info level)

#### Générer les deux fichiers

```bash
node scripts/generate-env-files.js all
```

### ⚙️ Configuration Post-Génération

#### Pour `.env.development`

1. **Remplacer les placeholders** :
   - `DATABASE_URL` : URL de votre branche Neon dev
   - `JWT_SECRET` et `COOKIE_SECRET` : Utiliser les Replit Secrets ou générer avec `openssl rand -base64 32`

2. **Vérifier les valeurs** :
   - `EMAIL_INTERCEPT=true` (pas de vrais envois d'emails)
   - `ALLOW_DEMO_ACTIONS=true` (comptes démo opérationnels)

#### Pour `.env.production`

1. **Remplacer TOUS les placeholders critiques** :
   ```bash
   # Générer des clés fortes
   openssl rand -base64 32  # Pour JWT_SECRET
   openssl rand -base64 32  # Pour COOKIE_SECRET
   ```

2. **Configurer la base de données** :
   - `DATABASE_URL` : URL de la branche Neon main/production
   - Format : `postgresql://user:password@host:5432/database?sslmode=require`

3. **Configurer l'email (Brevo SMTP)** :
   - `EMAIL_INTERCEPT=false`
   - `EMAIL_HOST=smtp-relay.brevo.com`
   - `EMAIL_PORT=587`
   - `EMAIL_USER` : Votre email Brevo
   - `EMAIL_PASS` : Clé API Brevo (depuis votre compte Brevo)

4. **Configurer le domaine** :
   - `FRONTEND_URL` : URL de production (ex: `https://passerelle-cap.o2switch.fr`)
   - `CORS_ORIGIN` : Même URL pour autoriser les requêtes cross-origin

5. **Sécurité** :
   - Vérifier que `ALLOW_DEMO_ACTIONS=false`
   - Vérifier que `NODE_ENV=production`

### 🔒 Sécurité

#### Fichiers ignorés par Git

Les fichiers `.env.development` et `.env.production` sont **automatiquement exclus** de Git via `.gitignore`. Cela garantit que vos secrets ne seront jamais commités.

#### Variables sensibles à protéger

- ❌ **Ne JAMAIS** committer de vraies valeurs
- ✅ **Toujours** utiliser le fichier `.env.example` comme template versionné
- ✅ **Toujours** générer des clés fortes pour JWT_SECRET et COOKIE_SECRET
- ✅ **Toujours** vérifier que `.env*` est dans `.gitignore`

### 📊 Structure des Fichiers Générés

Chaque fichier `.env` contient :

1. **En-tête avec métadonnées** :
   - Nom de l'environnement
   - Date de génération
   - Avertissement de sécurité

2. **Sections organisées** :
   - Environnement (NODE_ENV, PORT, HOST)
   - Serveur (FRONTEND_URL)
   - Base de données (DATABASE_URL)
   - Sécurité & Authentification (JWT, COOKIE)
   - CORS
   - Email / SMTP
   - Uploads
   - Rate Limiting
   - Comptes de démonstration
   - Frontend (VITE_*)
   - Logs & Debug

3. **Notes importantes** (production uniquement) :
   - Liste des valeurs à remplacer
   - Commandes pour générer des clés
   - Checklist de vérification

### 🔄 Workflow de Migration vers o2switch

1. **Générer le fichier de production** :
   ```bash
   node scripts/generate-env-files.js production
   ```

2. **Éditer `.env.production`** avec les vraies valeurs

3. **Tester en local** (optionnel) :
   ```bash
   NODE_ENV=production npm run dev
   ```

4. **Déployer sur o2switch** :
   - Uploader le code (via FTP/SSH)
   - Copier `.env.production` sur le serveur
   - Installer les dépendances : `npm install --production`
   - Définir `NODE_ENV=production` dans les variables d'environnement du serveur
   - Démarrer l'application : `npm start`

5. **Vérifier le déploiement** :
   - Tester l'envoi d'emails
   - Vérifier que les comptes démo sont en lecture seule
   - Tester CORS avec le domaine de production
   - Vérifier la connexion à la base de données

### ⚠️ Dépannage

#### Le fichier existe déjà

```
⚠️  Le fichier .env.development existe déjà.
    Pour le remplacer, supprimez-le d'abord: rm .env.development
```

**Solution** : Supprimer manuellement le fichier existant avant de régénérer

#### Variables manquantes

Si certaines variables ne sont pas définies, vérifier :
1. Le template dans `DEVELOPMENT_CONFIG` ou `PRODUCTION_CONFIG`
2. Les sections dans `generateEnvContent()`

### 📚 Ressources

- Documentation complète : Voir `replit.md` section "Environment Configuration & Migration Strategy"
- Template de base : Voir `.env.example`
- Ordre de résolution : Voir documentation dotenv-flow dans replit.md

### 🛠️ Maintenance

#### Ajouter une nouvelle variable

1. Éditer `.env.example` avec la nouvelle variable documentée
2. Ajouter la variable dans `DEVELOPMENT_CONFIG` et `PRODUCTION_CONFIG`
3. Ajouter la variable dans la section appropriée de `generateEnvContent()`
4. Régénérer les fichiers si nécessaire

### ✅ Checklist de Déploiement Production

Avant de mettre en production, vérifier :

- [ ] `DATABASE_URL` pointe vers la branche Neon main
- [ ] `JWT_SECRET` est une clé forte aléatoire (32+ caractères)
- [ ] `COOKIE_SECRET` est une clé forte aléatoire (32+ caractères)
- [ ] `EMAIL_INTERCEPT=false`
- [ ] Credentials SMTP Brevo configurés
- [ ] `FRONTEND_URL` contient le vrai domaine de production
- [ ] `CORS_ORIGIN` contient le vrai domaine de production
- [ ] `ALLOW_DEMO_ACTIONS=false`
- [ ] `NODE_ENV=production`
- [ ] Fichier `.env.production` **NON versionné** dans Git

---

**Auteur** : Système de configuration multi-environnement Passerelle CAP  
**Date de création** : 23 octobre 2025  
**Version** : 1.0
