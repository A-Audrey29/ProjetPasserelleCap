#!/usr/bin/env node

/**
 * Script de génération des fichiers .env.development et .env.production
 * 
 * Ce script crée les fichiers de configuration d'environnement à partir du template .env.example
 * pour faciliter la migration et le déploiement sur o2switch ou autre hébergeur.
 * 
 * Usage:
 *   node scripts/generate-env-files.js development
 *   node scripts/generate-env-files.js production
 *   node scripts/generate-env-files.js all
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Équivalent de __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

/**
 * Configuration pour l'environnement de développement (Replit)
 */
const DEVELOPMENT_CONFIG = {
  NODE_ENV: 'development',
  PORT: '5000',
  HOST: '0.0.0.0',
  FRONTEND_URL: 'http://localhost:5173',
  
  // Base de données - Branche Neon dev
  DATABASE_URL: 'postgresql://user:password@ep-example-dev.region.aws.neon.tech/passerelle_cap_dev?sslmode=require',
  
  // Sécurité (clés de développement - à remplacer par Replit Secrets)
  JWT_SECRET: 'dev-jwt-secret-replit-REMPLACER-minimum-32-chars',
  COOKIE_SECRET: 'dev-cookie-secret-replit-REMPLACER-minimum-32-chars',
  JWT_EXPIRES_IN: '24h',
  COOKIE_MAX_AGE: '86400000',
  BCRYPT_ROUNDS: '12',
  
  // CORS
  CORS_ORIGIN: 'http://localhost:5000,http://localhost:5173,https://*.replit.dev,https://*.replit.app',
  
  // Email - Mode interception
  EMAIL_INTERCEPT: 'true',
  EMAIL_HOST: 'smtp.example.com',
  EMAIL_PORT: '587',
  EMAIL_USER: 'dev@example.com',
  EMAIL_PASS: 'not-used-in-intercept-mode',
  EMAIL_FROM_ADDRESS: 'noreply@passerelle-cap-dev.replit.app',
  EMAIL_FROM_NAME: 'Passerelle CAP (Dev)',
  
  // Uploads
  UPLOADS_DIR: 'uploads',
  UPLOAD_MAX_SIZE: '10485760',
  UPLOAD_ALLOWED_TYPES: 'application/pdf,image/jpeg,image/png',
  
  // Rate limiting (plus souple en dev)
  RATE_LIMIT_WINDOW: '900000',
  RATE_LIMIT_MAX: '500',
  
  // Comptes démo
  ALLOW_DEMO_ACTIONS: 'true',
  
  // Frontend (variables VITE_*)
  VITE_ENABLE_DEMO_ACCOUNTS: 'true',
  VITE_API_URL: 'http://localhost:5000',
  
  // Logs
  LOG_LEVEL: 'debug',
  DEBUG: 'true'
};

/**
 * Configuration pour l'environnement de production (o2switch)
 */
const PRODUCTION_CONFIG = {
  NODE_ENV: 'production',
  PORT: '5000',
  HOST: '0.0.0.0',
  FRONTEND_URL: 'https://votre-domaine.com',
  
  // Base de données - Branche Neon main
  DATABASE_URL: 'postgresql://user:password@ep-example-main.region.aws.neon.tech/passerelle_cap?sslmode=require',
  
  // Sécurité (CRITICAL: générer avec openssl rand -base64 32)
  JWT_SECRET: 'GENERER_UNE_VRAIE_CLE_ALEATOIRE_32_CHARS_MINIMUM',
  COOKIE_SECRET: 'GENERER_UNE_AUTRE_CLE_ALEATOIRE_32_CHARS_MINIMUM',
  JWT_EXPIRES_IN: '24h',
  COOKIE_MAX_AGE: '86400000',
  BCRYPT_ROUNDS: '12',
  
  // CORS (domaine de production uniquement)
  CORS_ORIGIN: 'https://votre-domaine.com',
  
  // Email - SMTP Brevo
  EMAIL_INTERCEPT: 'false',
  EMAIL_HOST: 'smtp-relay.brevo.com',
  EMAIL_PORT: '587',
  EMAIL_USER: 'votre-email@example.com',
  EMAIL_PASS: 'VOTRE_CLE_API_BREVO',
  EMAIL_FROM_ADDRESS: 'noreply@votre-domaine.com',
  EMAIL_FROM_NAME: 'Passerelle CAP',
  
  // Uploads
  UPLOADS_DIR: 'uploads',
  UPLOAD_MAX_SIZE: '10485760',
  UPLOAD_ALLOWED_TYPES: 'application/pdf,image/jpeg,image/png',
  
  // Rate limiting (strict en production)
  RATE_LIMIT_WINDOW: '900000',
  RATE_LIMIT_MAX: '100',
  
  // Comptes démo (désactivés en production)
  ALLOW_DEMO_ACTIONS: 'false',
  
  // Frontend (variables VITE_*)
  VITE_ENABLE_DEMO_ACCOUNTS: 'false',
  VITE_API_URL: 'https://votre-domaine.com',
  
  // Logs (moins verbeux en production)
  LOG_LEVEL: 'info',
  DEBUG: 'false'
};

/**
 * Génère le contenu du fichier .env avec des commentaires
 */
function generateEnvContent(config, environment) {
  const envName = environment === 'development' ? 'DÉVELOPPEMENT (REPLIT)' : 'PRODUCTION (O2SWITCH)';
  
  let content = `# ========================================
# CONFIGURATION ${envName}
# ========================================
# Fichier généré automatiquement par scripts/generate-env-files.js
# ATTENTION: Ne jamais committer ce fichier (vérifié dans .gitignore)
# Date de génération: ${new Date().toISOString()}

`;

  // Sections organisées
  const sections = {
    'ENVIRONNEMENT': ['NODE_ENV'],
    'SERVEUR': ['PORT', 'HOST', 'FRONTEND_URL'],
    'BASE DE DONNÉES': ['DATABASE_URL'],
    'SÉCURITÉ & AUTHENTIFICATION': ['JWT_SECRET', 'COOKIE_SECRET', 'JWT_EXPIRES_IN', 'COOKIE_MAX_AGE', 'BCRYPT_ROUNDS'],
    'CORS & SÉCURITÉ': ['CORS_ORIGIN'],
    'EMAIL / SMTP': ['EMAIL_INTERCEPT', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM_ADDRESS', 'EMAIL_FROM_NAME'],
    'UPLOAD DE FICHIERS': ['UPLOADS_DIR', 'UPLOAD_MAX_SIZE', 'UPLOAD_ALLOWED_TYPES'],
    'RATE LIMITING': ['RATE_LIMIT_WINDOW', 'RATE_LIMIT_MAX'],
    'COMPTES DE DÉMONSTRATION': ['ALLOW_DEMO_ACTIONS'],
    'FRONTEND (Variables VITE_*)': ['VITE_ENABLE_DEMO_ACCOUNTS', 'VITE_API_URL'],
    'LOGS & DEBUG': ['LOG_LEVEL', 'DEBUG']
  };

  for (const [sectionName, keys] of Object.entries(sections)) {
    content += `# ========================================\n`;
    content += `# ${sectionName}\n`;
    content += `# ========================================\n`;
    
    for (const key of keys) {
      if (config[key] !== undefined) {
        content += `${key}=${config[key]}\n`;
      }
    }
    content += '\n';
  }

  // Ajouter des notes importantes selon l'environnement
  if (environment === 'production') {
    content += `# ========================================\n`;
    content += `# NOTES IMPORTANTES POUR LA PRODUCTION\n`;
    content += `# ========================================\n`;
    content += `# 1. REMPLACER toutes les valeurs "GENERER_..." par de vraies clés aléatoires\n`;
    content += `#    Commande: openssl rand -base64 32\n`;
    content += `# 2. Configurer la vraie URL de base de données Neon (branche main)\n`;
    content += `# 3. Configurer les credentials SMTP Brevo\n`;
    content += `# 4. Remplacer "votre-domaine.com" par le vrai domaine\n`;
    content += `# 5. Vérifier que ALLOW_DEMO_ACTIONS=false\n`;
    content += `# 6. Ne JAMAIS committer ce fichier\n`;
  }

  return content;
}

/**
 * Crée un fichier .env
 */
function createEnvFile(environment) {
  const filename = `.env.${environment}`;
  const filepath = path.join(process.cwd(), filename);
  
  // Vérifier si le fichier existe déjà
  if (fs.existsSync(filepath)) {
    log(`⚠️  Le fichier ${filename} existe déjà.`, 'yellow');
    log(`   Pour le remplacer, supprimez-le d'abord: rm ${filename}`, 'yellow');
    return false;
  }
  
  const config = environment === 'development' ? DEVELOPMENT_CONFIG : PRODUCTION_CONFIG;
  const content = generateEnvContent(config, environment);
  
  try {
    fs.writeFileSync(filepath, content, 'utf8');
    log(`✅ Fichier ${filename} créé avec succès !`, 'green');
    
    if (environment === 'production') {
      log(`\n⚠️  ATTENTION: N'oubliez pas de remplacer les placeholders dans ${filename}:`, 'yellow');
      log(`   - JWT_SECRET`, 'yellow');
      log(`   - COOKIE_SECRET`, 'yellow');
      log(`   - DATABASE_URL`, 'yellow');
      log(`   - EMAIL_PASS (clé API Brevo)`, 'yellow');
      log(`   - FRONTEND_URL et CORS_ORIGIN (votre domaine)`, 'yellow');
    }
    
    return true;
  } catch (error) {
    log(`❌ Erreur lors de la création de ${filename}: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Main
 */
function main() {
  const args = process.argv.slice(2);
  const environment = args[0];
  
  log('🔧 Générateur de fichiers .env\n', 'cyan');
  
  if (!environment || !['development', 'production', 'all'].includes(environment)) {
    log('❌ Usage: node scripts/generate-env-files.js [development|production|all]', 'red');
    log('\nExemples:', 'cyan');
    log('  node scripts/generate-env-files.js development  # Crée .env.development', 'reset');
    log('  node scripts/generate-env-files.js production   # Crée .env.production', 'reset');
    log('  node scripts/generate-env-files.js all          # Crée les deux fichiers', 'reset');
    process.exit(1);
  }
  
  if (environment === 'all') {
    createEnvFile('development');
    createEnvFile('production');
  } else {
    createEnvFile(environment);
  }
  
  log('\n✅ Génération terminée !', 'green');
  log('\n📝 Prochaines étapes:', 'cyan');
  log('   1. Vérifier les fichiers générés', 'reset');
  log('   2. Remplacer les placeholders par les vraies valeurs', 'reset');
  log('   3. NE JAMAIS committer les fichiers .env.* (déjà dans .gitignore)', 'reset');
}

main();
