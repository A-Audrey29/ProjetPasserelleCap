#!/bin/bash

###############################################################################
# Script de déploiement O2Switch - Passerelle CAP
#
# Ce script prépare un package de déploiement prêt à uploader sur O2Switch
#
# Usage: ./scripts/deploy-o2switch.sh
###############################################################################

set -e  # Exit on error

echo "🚀 Préparation du package de déploiement O2Switch..."
echo ""

# Couleurs pour output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variables
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_DIR="deploy-o2switch-${TIMESTAMP}"
ARCHIVE_NAME="${DEPLOY_DIR}.tar.gz"

# Étape 1: Vérifications préalables
echo "📋 Étape 1/6 - Vérifications préalables..."

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur: package.json non trouvé${NC}"
    exit 1
fi

if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  Warning: .env.production non trouvé${NC}"
    echo "   Vous devrez le créer manuellement sur le serveur O2Switch"
fi

echo -e "${GREEN}✅ Vérifications OK${NC}"
echo ""

# Étape 2: Clean et build
echo "🔨 Étape 2/6 - Build du projet..."

# Clean ancien build
rm -rf dist/

# Build production
echo "   Running: npm run build"
npm run build

if [ ! -f "dist/index.js" ]; then
    echo -e "${RED}❌ Erreur: Build échoué, dist/index.js non créé${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build réussi${NC}"
echo ""

# Étape 3: Création du dossier de déploiement
echo "📦 Étape 3/6 - Préparation du package..."

mkdir -p "${DEPLOY_DIR}"

# Copier les fichiers essentiels
echo "   Copie de dist/..."
cp -r dist/ "${DEPLOY_DIR}/"

echo "   Copie de shared/..."
cp -r shared/ "${DEPLOY_DIR}/"

echo "   Copie de package.json et package-lock.json..."
cp package.json "${DEPLOY_DIR}/"
cp package-lock.json "${DEPLOY_DIR}/"

# Créer le dossier uploads
mkdir -p "${DEPLOY_DIR}/uploads"

echo -e "${GREEN}✅ Package préparé${NC}"
echo ""

# Étape 4: Création des instructions de déploiement
echo "📝 Étape 4/6 - Génération des instructions..."

cat > "${DEPLOY_DIR}/INSTRUCTIONS_DEPLOIEMENT.txt" << 'EOF'
╔═══════════════════════════════════════════════════════════════════╗
║         INSTRUCTIONS DE DÉPLOIEMENT O2SWITCH                      ║
║                   Passerelle CAP                                  ║
╚═══════════════════════════════════════════════════════════════════╝

📦 CONTENU DU PACKAGE:
- dist/            : Application buildée (backend + frontend)
- shared/          : Schémas TypeScript partagés
- package.json     : Dépendances production
- package-lock.json: Versions exactes
- uploads/         : Dossier pour fichiers (vide au départ)

⚠️  FICHIERS MANQUANTS À CRÉER SUR LE SERVEUR:
- .env.production  : Variables d'environnement (voir .env.example)

═══════════════════════════════════════════════════════════════════

🚀 ÉTAPES DE DÉPLOIEMENT:

1️⃣  UPLOAD VIA FTP/SSH
   - Connectez-vous au serveur O2Switch
   - Créez le dossier: /home/USERNAME/passerelle-cap
   - Uploadez tout le contenu de ce package

2️⃣  CONFIGURATION cPanel (https://cpanel.o2switch.net)
   Section: Software > Setup Node.js App > Create Application

   Paramètres:
   - Node.js version: 20.x
   - Application mode: Production
   - Application root: /home/USERNAME/passerelle-cap
   - Application URL: cap.fevesguadeloupeetsaintmartin.org
   - Application startup file: dist/index.js

3️⃣  VARIABLES D'ENVIRONNEMENT
   Dans cPanel > Node.js App > Edit > Variables d'environnement

   OBLIGATOIRES:
   - NODE_ENV=production
   - DATABASE_URL=postgresql://...  (depuis Neon)
   - JWT_SECRET=<voir fichier .env.production local>
   - COOKIE_SECRET=<voir fichier .env.production local>
   - FRONTEND_URL=https://cap.fevesguadeloupeetsaintmartin.org
   - CORS_ORIGIN=https://cap.fevesguadeloupeetsaintmartin.org

   EMAIL (Brevo):
   - EMAIL_INTERCEPT=false
   - EMAIL_HOST=smtp-relay.brevo.com
   - EMAIL_PORT=587
   - EMAIL_USER=<votre-email>
   - EMAIL_PASS=<votre-clé-api-brevo>

   AUTRES (voir .env.example pour liste complète)

4️⃣  INSTALLATION DES DÉPENDANCES
   Via SSH ou cPanel Terminal:

   cd ~/passerelle-cap
   npm install --production

5️⃣  PERMISSIONS FICHIERS
   chmod 755 dist/
   chmod 775 uploads/
   chmod 600 .env.production  # Si créé manuellement

6️⃣  DÉMARRAGE
   Via cPanel > Node.js App > Restart

═══════════════════════════════════════════════════════════════════

✅ VÉRIFICATIONS POST-DÉPLOIEMENT:

1. Ouvrir: https://cap.fevesguadeloupeetsaintmartin.org
   → Doit afficher la page d'accueil

2. Tester login:
   → Doit permettre connexion avec compte admin

3. Vérifier uploads:
   → Tester upload d'un document PDF

4. Vérifier emails:
   → Créer une fiche > doit envoyer email notification

═══════════════════════════════════════════════════════════════════

🔧 TROUBLESHOOTING:

Problème: Application ne démarre pas
→ Vérifier logs: tail -f ~/logs/nodejs/passerelle-cap.log
→ Vérifier que npm install a réussi
→ Vérifier NODE_ENV=production dans variables

Problème: Erreur JWT_SECRET
→ Vérifier que JWT_SECRET est défini dans variables cPanel
→ Valeur doit être cryptographiquement forte (44 chars min)

Problème: Base de données inaccessible
→ Vérifier DATABASE_URL correcte
→ Vérifier IP O2Switch autorisée sur Neon
→ Tester: psql $DATABASE_URL

═══════════════════════════════════════════════════════════════════

📚 DOCUMENTATION COMPLÈTE:
- DEPLOIEMENT_O2SWITCH.md (guide complet)
- CHECKLIST_DEPLOIEMENT_O2SWITCH.md (checklist détaillée)
- SECURITY_AUDIT_CORRECTIONS.md (sécurité)

═══════════════════════════════════════════════════════════════════
EOF

echo -e "${GREEN}✅ Instructions générées${NC}"
echo ""

# Étape 5: Création de l'archive
echo "📦 Étape 5/6 - Compression du package..."

tar -czf "${ARCHIVE_NAME}" "${DEPLOY_DIR}/"

ARCHIVE_SIZE=$(du -h "${ARCHIVE_NAME}" | cut -f1)

echo -e "${GREEN}✅ Archive créée: ${ARCHIVE_NAME} (${ARCHIVE_SIZE})${NC}"
echo ""

# Étape 6: Résumé et instructions
echo "📋 Étape 6/6 - Résumé..."
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ PACKAGE DE DÉPLOIEMENT PRÊT !${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📦 Archive créée:"
echo "   ${ARCHIVE_NAME} (${ARCHIVE_SIZE})"
echo ""
echo "📁 Contenu du package:"
echo "   - dist/            (application buildée)"
echo "   - shared/          (schémas TypeScript)"
echo "   - package.json     (dépendances)"
echo "   - package-lock.json"
echo "   - uploads/         (dossier vide)"
echo "   - INSTRUCTIONS_DEPLOIEMENT.txt"
echo ""
echo "🚀 PROCHAINES ÉTAPES:"
echo ""
echo "1. Uploadez ${ARCHIVE_NAME} sur O2Switch (via FTP/SSH)"
echo ""
echo "2. Sur le serveur O2Switch:"
echo "   tar -xzf ${ARCHIVE_NAME}"
echo "   cd ${DEPLOY_DIR}"
echo ""
echo "3. Suivez les instructions dans:"
echo "   ${DEPLOY_DIR}/INSTRUCTIONS_DEPLOIEMENT.txt"
echo ""
echo "4. Configurez les variables d'environnement via cPanel"
echo ""
echo "5. Installez les dépendances:"
echo "   npm install --production"
echo ""
echo "6. Démarrez l'app via cPanel > Node.js App > Restart"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "   - Ne commitez PAS .env.production dans Git"
echo "   - Configurez JWT_SECRET et COOKIE_SECRET sur le serveur"
echo "   - Vérifiez DATABASE_URL pointe vers production Neon"
echo "   - Activez HTTPS sur le domaine"
echo ""
echo "📚 Documentation complète:"
echo "   - DEPLOIEMENT_O2SWITCH.md"
echo "   - CHECKLIST_DEPLOIEMENT_O2SWITCH.md"
echo "   - SECURITY_AUDIT_CORRECTIONS.md"
echo ""
echo -e "${GREEN}✨ Déploiement O2Switch prêt !${NC}"
echo ""

# Cleanup du dossier temporaire (garder l'archive)
rm -rf "${DEPLOY_DIR}"

exit 0
