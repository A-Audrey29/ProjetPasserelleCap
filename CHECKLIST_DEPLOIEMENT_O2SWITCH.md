# ✅ CHECKLIST DE DÉPLOIEMENT O2SWITCH - Passerelle CAP

**Date:** $(date '+%Y-%m-%d')
**Environnement:** Production O2Switch

---

## 📦 1. FICHIERS ESSENTIELS À DÉPLOYER

### Structure du build (1.7MB total):
```
dist/
├── index.js              (188 KB) - Serveur backend Node.js
└── public/
    ├── index.html        (44 KB)  - Point d'entrée frontend
    └── assets/
        ├── index-*.js    (1.15 MB) - Bundle React minifié
        ├── index-*.css   (164 KB)  - Styles minifiés
        └── *.jpg/png     (109 KB)  - Assets statiques
```

### Fichiers racine nécessaires:
- ✅ `package.json` (définition dépendances production)
- ✅ `package-lock.json` (versions exactes)
- ✅ `.env.production` (variables d'environnement - **NE PAS COMMITER**)

### Dossiers supplémentaires:
- ✅ `shared/` (schémas TypeScript partagés)
- ✅ `uploads/` (créé automatiquement, pour fichiers uploadés)
- ⚠️  `legal/` (documents légaux - déjà dans dist/public/legal/)

---

## 🔧 2. BUILD ET PRÉPARATION

### 2.1 Commande de build
```bash
npm run build
```

**Résultat attendu:**
- ✅ `dist/index.js` créé (187.8 KB)
- ✅ `dist/public/` avec frontend React
- ✅ Pas d'erreurs critiques
- ⚠️  Warnings "replit-cartographer" = OK (dev plugin uniquement)

**Vérification:**
```bash
ls -lh dist/index.js dist/public/index.html
# Doit afficher les 2 fichiers avec tailles correctes
```

### 2.2 Test local du build
```bash
NODE_ENV=production node dist/index.js
# Doit démarrer sur port 5000
# Vérifier: curl http://localhost:5000
```

---

## 🌐 3. SPÉCIFICITÉS O2SWITCH

### 3.1 Architecture O2Switch
- **Node.js Version:** v20.x (vérifier disponibilité)
- **Port:** O2Switch assigne automatiquement (utiliser `process.env.PORT`)
- **Domaine:** Via configuration Apache/Nginx reverse proxy
- **SSH:** Accès via cPanel > Terminal

### 3.2 Configuration Node.js sur O2Switch

**Accès cPanel:**
1. Connexion: https://cpanel.o2switch.net
2. Section "Software" > "Setup Node.js App"
3. Cliquer "Create Application"

**Paramètres à configurer:**
```
Node.js version: 20.x
Application mode: Production
Application root: /home/USERNAME/passerelle-cap
Application URL: cap.fevesguadeloupeetsaintmartin.org
Application startup file: dist/index.js
```

### 3.3 Variables d'environnement O2Switch

**Dans cPanel > Node.js App > Edit:**

Ajouter ces variables (bouton "Add Variable"):
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://... (depuis Neon)
JWT_SECRET=u+zmYFMhc+jQF26Mck8tu9B2uKp/rIQUR2izmp7pUW8=
COOKIE_SECRET=FTKcFymRYWRkBZOXDUaxCKcbqqgCFcb42bI0bAM3EL0=
FRONTEND_URL=https://cap.fevesguadeloupeetsaintmartin.org
CORS_ORIGIN=https://cap.fevesguadeloupeetsaintmartin.org
VITE_API_URL=https://cap.fevesguadeloupeetsaintmartin.org
EMAIL_INTERCEPT=false
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USER=votre-email@example.com
EMAIL_PASS=VOTRE_CLE_API_BREVO
EMAIL_FROM_ADDRESS=noreply@fevesguadeloupeetsaintmartin.org
EMAIL_FROM_NAME=Passerelle CAP
UPLOADS_DIR=uploads
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=application/pdf,image/jpeg,image/png
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
ALLOW_DEMO_ACTIONS=false
VITE_ENABLE_DEMO_ACCOUNTS=false
LOG_LEVEL=info
DEBUG=false
BCRYPT_ROUNDS=12
JWT_EXPIRES_IN=24h
COOKIE_MAX_AGE=86400000
```

---

## 📤 4. PROCESSUS DE DÉPLOIEMENT

### Méthode 1: Upload FTP (Recommandé pour premier déploiement)

**Via FileZilla ou cPanel File Manager:**

1. **Connectez-vous au FTP O2Switch**
   - Host: ftp.votre-domaine.com
   - User: votre-username
   - Password: votre-password

2. **Créer le dossier de l'application**
   ```
   /home/USERNAME/passerelle-cap/
   ```

3. **Upload des fichiers:**
   - ✅ Upload `dist/` complet
   - ✅ Upload `package.json`
   - ✅ Upload `package-lock.json`
   - ✅ Upload dossier `shared/`
   - ⚠️  **NE PAS** upload `node_modules/`
   - ⚠️  **NE PAS** upload `.env.*`

### Méthode 2: Git + SSH (Recommandé pour mises à jour)

**Via SSH O2Switch:**

```bash
# 1. Connexion SSH
ssh username@ssh.o2switch.net

# 2. Clone du repo (première fois)
cd ~
git clone https://github.com/votre-repo/passerelle-cap.git
cd passerelle-cap

# 3. Installation des dépendances
npm install --production

# 4. Build local sur serveur (si Node.js >= 20)
npm run build

# 5. Configuration .env.production
nano .env.production
# Copier les variables depuis votre .env.production local

# 6. Vérifier les permissions
chmod 600 .env.production
chmod -R 755 dist/
mkdir -p uploads && chmod 775 uploads

# 7. Redémarrer l'application (via cPanel Node.js App)
```

### Méthode 3: Build local + Upload dist seulement

```bash
# Local
npm run build
tar -czf deploy.tar.gz dist/ package.json package-lock.json shared/

# Upload deploy.tar.gz via FTP

# SSH O2Switch
ssh username@ssh.o2switch.net
cd ~/passerelle-cap
tar -xzf deploy.tar.gz
npm install --production
# Configurer .env.production
# Restart via cPanel
```

---

## 🔒 5. SÉCURITÉ POST-DÉPLOIEMENT

### 5.1 Permissions fichiers
```bash
# Sur serveur O2Switch via SSH
chmod 600 .env.production      # Lecture seule propriétaire
chmod 755 dist/                # Exécution publique
chmod 775 uploads/             # Lecture/écriture groupe
chmod 644 dist/public/*        # Lecture publique assets
```

### 5.2 Vérifications de sécurité

**Checklist:**
- [ ] `.env.production` contient de vraies valeurs (pas de placeholders)
- [ ] `JWT_SECRET` et `COOKIE_SECRET` sont cryptographiquement forts
- [ ] `DATABASE_URL` pointe vers branche production Neon (pas dev)
- [ ] `ALLOW_DEMO_ACTIONS=false` en production
- [ ] `EMAIL_INTERCEPT=false` pour envoi réel
- [ ] `NODE_ENV=production` défini
- [ ] HTTPS activé sur le domaine
- [ ] Firewall O2Switch autorise ports nécessaires

### 5.3 Test de sécurité

```bash
# Test 1: JWT_SECRET obligatoire
# Le serveur doit refuser de démarrer si JWT_SECRET manque
unset JWT_SECRET && node dist/index.js
# Attendu: "CRITICAL SECURITY ERROR"

# Test 2: HTTPS forcé
curl -I http://cap.fevesguadeloupeetsaintmartin.org
# Attendu: Redirect 301 vers https://

# Test 3: Comptes démo en lecture seule
# Tenter une action critique avec compte demo@...
# Attendu: 403 Forbidden
```

---

## ✅ 6. VÉRIFICATIONS POST-DÉPLOIEMENT

### 6.1 Santé du serveur

```bash
# Test 1: Serveur répond
curl https://cap.fevesguadeloupeetsaintmartin.org
# Attendu: HTML de l'application

# Test 2: API fonctionne
curl https://cap.fevesguadeloupeetsaintmartin.org/api/health
# Attendu: Status 200 ou JSON

# Test 3: Connexion base de données
# Via l'interface admin, vérifier que les tables sont présentes

# Test 4: Upload de fichiers
# Uploader un PDF de test via l'interface
# Vérifier que uploads/ contient le fichier
```

### 6.2 Checklist fonctionnelle

**Interface utilisateur:**
- [ ] Page d'accueil charge correctement
- [ ] Login fonctionne
- [ ] Dashboard affiche les KPIs
- [ ] Création de fiche fonctionne
- [ ] Upload de documents fonctionne
- [ ] Transitions d'état fonctionnent
- [ ] Notifications email sont envoyées

**Backend:**
- [ ] Authentification JWT fonctionne
- [ ] RBAC (rôles) respecté
- [ ] Rate limiting actif (tester 100+ requêtes)
- [ ] Logs d'audit enregistrés
- [ ] Emails envoyés via Brevo
- [ ] Base Neon accessible

**Sécurité:**
- [ ] CSP activée (vérifier headers HTTP)
- [ ] Cookies HttpOnly et Secure
- [ ] CORS limité au domaine
- [ ] Comptes démo en lecture seule

---

## 🔧 7. TROUBLESHOOTING

### Problème 1: Application ne démarre pas

**Symptômes:**
```
Error: Cannot find module 'express'
```

**Solution:**
```bash
cd ~/passerelle-cap
npm install --production
```

---

### Problème 2: Erreur JWT_SECRET

**Symptômes:**
```
CRITICAL SECURITY ERROR: JWT_SECRET environment variable must be set
```

**Solution:**
```bash
# Via cPanel > Node.js App > Variables d'environnement
# Ajouter JWT_SECRET avec la valeur générée
```

---

### Problème 3: Base de données inaccessible

**Symptômes:**
```
Error: getaddrinfo ENOTFOUND ep-xxxxx.neon.tech
```

**Solutions:**
1. Vérifier `DATABASE_URL` dans variables d'environnement
2. Vérifier que l'IP O2Switch est autorisée sur Neon
3. Tester connexion: `psql $DATABASE_URL`

---

### Problème 4: Port déjà utilisé

**Symptômes:**
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:5000
```

**Solution:**
```bash
# Via cPanel > Node.js App > Restart
# Ou SSH:
killall node
# Puis restart via cPanel
```

---

### Problème 5: Emails non envoyés

**Vérifications:**
1. `EMAIL_INTERCEPT=false` dans .env.production
2. Credentials Brevo corrects
3. Vérifier logs: `tail -f logs/email.log`
4. Test SMTP manuel:
```bash
telnet smtp-relay.brevo.com 587
```

---

### Problème 6: 502 Bad Gateway

**Causes possibles:**
1. Application Node.js crashée
2. Port incorrect dans configuration Apache
3. Timeout trop court

**Solutions:**
```bash
# Vérifier logs
tail -f ~/passerelle-cap/logs/error.log

# Vérifier que Node.js tourne
ps aux | grep node

# Restart via cPanel
```

---

## 📊 8. MONITORING POST-DÉPLOIEMENT

### Logs à surveiller

**Via SSH:**
```bash
# Logs application
tail -f ~/passerelle-cap/logs/app.log

# Logs Node.js (via cPanel)
tail -f ~/logs/nodejs/passerelle-cap.log

# Logs Apache (si proxy)
tail -f ~/logs/access.log
tail -f ~/logs/error.log
```

### Métriques importantes

**À surveiller dans les premières 24h:**
- Requêtes HTTP par minute
- Temps de réponse API
- Taux d'erreur 5xx
- Connexions base de données
- Utilisation mémoire Node.js
- Emails envoyés/échoués

---

## 🔄 9. MISES À JOUR FUTURES

### Processus de mise à jour

```bash
# 1. Sur votre machine locale
git pull origin main
npm run build

# 2. Upload via FTP ou Git
scp -r dist/ username@ssh.o2switch.net:~/passerelle-cap/

# 3. SSH sur serveur
ssh username@ssh.o2switch.net
cd ~/passerelle-cap
npm install --production  # Si package.json a changé

# 4. Restart via cPanel > Node.js App > Restart
```

### Migration base de données

```bash
# Si schéma modifié
export DATABASE_URL="postgresql://..." # Production
npm run db:push
```

---

## 📞 10. SUPPORT

### Contacts utiles

- **O2Switch Support:** https://www.o2switch.fr/support/
- **Neon Support:** https://neon.tech/docs
- **Brevo Support:** https://www.brevo.com/fr/support/

### Documentation

- Guide déploiement complet: `DEPLOIEMENT_O2SWITCH.md`
- Audit sécurité: `SECURITY_AUDIT_CORRECTIONS.md`
- Configuration env: `.env.example`

---

**✅ CHECKLIST COMPLÉTÉE - PRÊT POUR DÉPLOIEMENT O2SWITCH**

Généré le: $(date)
