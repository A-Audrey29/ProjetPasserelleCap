# Configuration de l'envoi d'emails avec Brevo (SMTP)

## 📧 Vue d'ensemble

La plateforme Passerelle CAP utilise **Brevo** (anciennement Sendinblue) comme service SMTP pour l'envoi d'emails transactionnels. Brevo a été choisi pour :

- ✅ **Conformité RGPD** : Hébergement européen (France)
- ✅ **Délivrabilité optimale** : Meilleure performance en Guadeloupe
- ✅ **Simplicité** : Configuration SMTP standard via Nodemailer
- ✅ **Fiabilité** : Service robuste avec monitoring intégré

## 🔧 Obtenir vos credentials SMTP Brevo

### Étape 1 : Créer un compte Brevo

1. Rendez-vous sur [https://www.brevo.com](https://www.brevo.com)
2. Cliquez sur **"Sign Up"** ou **"Créer un compte"**
3. Remplissez le formulaire d'inscription
4. Vérifiez votre email pour activer votre compte

### Étape 2 : Générer une clé SMTP

1. Connectez-vous à votre compte Brevo
2. Allez dans **"Settings"** (Paramètres) → **"SMTP & API"**
3. Dans la section **"SMTP"**, cliquez sur **"Create a new SMTP key"** ou **"Générer une nouvelle clé SMTP"**
4. Donnez un nom à votre clé (exemple : "Passerelle CAP Production")
5. Cliquez sur **"Generate"** / **"Générer"**
6. **⚠️ IMPORTANT** : Copiez immédiatement la clé générée et stockez-la en sécurité (elle ne sera plus visible après)

### Étape 3 : Récupérer vos informations SMTP

Sur la même page **"SMTP & API"**, vous trouverez :

- **Serveur SMTP** : `smtp-relay.brevo.com`
- **Port** : `587` (recommandé pour TLS)
- **Login SMTP** : Votre email Brevo (exemple : `99e9af001@smtp-brevo.com`)
- **Mot de passe SMTP** : La clé générée à l'étape 2

## 🔐 Configuration des variables d'environnement

### Pour l'environnement de développement (`.env.development`)

```bash
# Mode interception : emails loggés en base, pas d'envoi réel
EMAIL_INTERCEPT=true

# Configuration SMTP (optionnelle en dev si EMAIL_INTERCEPT=true)
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USER=votre-login-smtp@smtp-brevo.com
EMAIL_PASS=votre_clé_smtp_brevo
```

### Pour l'environnement de production (`.env.production`)

```bash
# Mode production : envoi réel via Brevo
EMAIL_INTERCEPT=false

# Configuration SMTP (REQUISE en production)
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USER=99e9af001@smtp-brevo.com
EMAIL_PASS=xsmtpsib-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXX
```

### Sur Render (déploiement production)

Allez dans **"Settings"** → **"Environment"** et ajoutez :

| Variable | Valeur |
|----------|--------|
| `EMAIL_INTERCEPT` | `false` |
| `EMAIL_HOST` | `smtp-relay.brevo.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USER` | Votre login SMTP Brevo |
| `EMAIL_PASS` | Votre clé SMTP Brevo |

## 🧪 Tester la configuration

### En développement (mode interception)

Avec `EMAIL_INTERCEPT=true`, les emails sont loggés en base de données au lieu d'être envoyés :

```bash
# Lancer l'application
npm run dev

# Vérifier les logs au démarrage
# Vous devriez voir :
🚫 EMAIL INTERCEPTION ACTIVE - All emails will be logged to database instead of being sent!
```

Les emails interceptés sont visibles :
- Dans l'interface admin → **"Logs d'emails"**
- Directement en base de données (table `email_logs`)

### En production (envoi réel)

Avec `EMAIL_INTERCEPT=false` et credentials SMTP configurés :

```bash
# Les logs au démarrage affichent :
✅ Brevo SMTP configured for production sending

# Lors de l'envoi d'un email :
✅ Email sent successfully via Brevo: <message-id>
```

## 📊 Surveiller vos envois dans Brevo

1. Connectez-vous à votre compte Brevo
2. Allez dans **"Statistics"** → **"Email"**
3. Vous verrez :
   - Nombre d'emails envoyés
   - Taux de délivrabilité
   - Taux d'ouverture
   - Bounces et plaintes

## 🔒 Bonnes pratiques de sécurité

### ❌ NE JAMAIS :
- Committer vos clés SMTP dans Git
- Partager vos credentials SMTP par email non chiffré
- Utiliser la même clé SMTP pour dev et production

### ✅ TOUJOURS :
- Stocker les credentials dans des variables d'environnement
- Générer des clés SMTP différentes pour chaque environnement
- Révoquer immédiatement une clé compromise
- Activer l'authentification à deux facteurs sur Brevo

## 🆘 Dépannage

### Erreur : "SMTP transporter not configured"

**Cause** : Variables d'environnement manquantes

**Solution** :
```bash
# Vérifiez que ces variables sont définies :
echo $EMAIL_HOST
echo $EMAIL_USER
echo $EMAIL_PASS
```

### Erreur : "Authentication failed"

**Cause** : Clé SMTP invalide ou expirée

**Solution** :
1. Générez une nouvelle clé SMTP dans Brevo
2. Mettez à jour `EMAIL_PASS` avec la nouvelle clé
3. Redémarrez l'application

### Emails non reçus en production

**Vérifications** :
1. `EMAIL_INTERCEPT=false` dans les variables Render
2. Credentials SMTP corrects
3. Vérifiez les logs de l'application pour erreurs d'envoi
4. Consultez les statistiques Brevo pour voir si l'email a été envoyé
5. Vérifiez les spams du destinataire

## 📚 Ressources

- [Documentation officielle Brevo SMTP](https://developers.brevo.com/docs/send-a-transactional-email)
- [Nodemailer documentation](https://nodemailer.com/)
- [Tester vos emails avec MailHog (dev)](https://github.com/mailhog/MailHog)

---

**Date de dernière mise à jour** : Novembre 2024  
**Auteur** : Équipe Passerelle CAP
