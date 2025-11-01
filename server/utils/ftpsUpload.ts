import { Client } from 'basic-ftp';
import path from 'path';
import fs from 'fs/promises';

/**
 * Configuration FTPS pour o2switch
 * 
 * IMPORTANT: o2switch utilise FTPS (FTP over TLS), PAS SFTP
 * - FTPS = FTP sécurisé avec chiffrement TLS/SSL (port 21 en mode explicite)
 * - SFTP = SSH File Transfer Protocol (port 22) - NON SUPPORTÉ PAR O2SWITCH
 */

interface FTPSConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
  timeout: number;
  verbose: boolean;
}

function getFTPSConfig(): FTPSConfig {
  if (!process.env.FTP_PASSWORD) {
    throw new Error('❌ FTP_PASSWORD non définie dans les variables d\'environnement');
  }

  return {
    host: process.env.FTP_HOST || 'kalo4499.odns.fr',
    port: parseInt(process.env.FTP_PORT || '21', 10),
    user: process.env.FTP_USER || 'render@kalo4499.odns.fr',
    password: process.env.FTP_PASSWORD,
    secure: process.env.FTP_SECURE === 'true', // Par défaut: false (FTP simple)
    timeout: parseInt(process.env.FTP_TIMEOUT || '30000', 10), // 30 secondes par défaut
    verbose: process.env.NODE_ENV !== 'production', // Logs détaillés en dev
  };
}

/**
 * Chemins distants sur le serveur o2switch
 * 
 * IMPORTANT: Ces chemins sont RELATIFS au répertoire home de l'utilisateur FTP
 * - Ne PAS utiliser /home/kalo4499/ comme préfixe
 * - o2switch jail automatiquement dans /home/kalo4499/
 * - Utiliser simplement: /uploads/navettes/ ou /uploads/bilans/
 */
export const REMOTE_PATHS = {
  navettes: '/uploads/navettes/',
  bilans: '/uploads/bilans/',
};

export type UploadType = 'navettes' | 'bilans';

/**
 * Client FTPS avec retry logic et gestion d'erreurs robuste
 */
class FTPSClient {
  private client: Client;
  private config: FTPSConfig;
  private connected: boolean = false;

  constructor() {
    this.client = new Client();
    this.config = getFTPSConfig();
    
    // Configurer le client
    this.client.ftp.verbose = this.config.verbose;
  }

  /**
   * Obtenir le client FTP interne (pour tests et diagnostics)
   */
  getClient(): Client {
    return this.client;
  }

  /**
   * Connexion au serveur FTPS avec retry
   */
  async connect(maxRetries: number = 3): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔌 [FTPS] Tentative ${attempt}/${maxRetries} - Connexion à ${this.config.host}:${this.config.port}...`);
        console.log(`👤 [FTPS] Utilisateur: ${this.config.user}`);
        console.log(`🔒 [FTPS] Mode sécurisé: ${this.config.secure ? 'OUI (TLS)' : 'NON'}`);
        console.log(`⏱️ [FTPS] Timeout: ${this.config.timeout}ms`);
        
        await this.client.access({
          host: this.config.host,
          port: this.config.port,
          user: this.config.user,
          password: this.config.password,
          secure: this.config.secure, // Explicit FTPS (TLS over FTP)
          secureOptions: {
            // En production: valider strictement les certificats
            // En dev: accepter les certificats auto-signés
            rejectUnauthorized: process.env.NODE_ENV === 'production',
            minVersion: 'TLSv1.2', // TLS 1.2 minimum pour sécurité
          },
        });

        this.connected = true;
        console.log(`✅ [FTPS] Connexion réussie au serveur o2switch`);
        
        // Afficher le répertoire courant pour debug
        const pwd = await this.client.pwd();
        console.log(`📁 [FTPS] Répertoire courant: ${pwd}`);
        
        return;
      } catch (error: any) {
        lastError = error;
        console.error(`❌ [FTPS] Échec tentative ${attempt}/${maxRetries}: ${error.message}`);
        
        if (attempt < maxRetries) {
          const delayMs = attempt * 1000; // Backoff progressif: 1s, 2s, 3s
          console.log(`⏳ [FTPS] Nouvelle tentative dans ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // Toutes les tentatives ont échoué
    throw new Error(`Échec de connexion FTPS après ${maxRetries} tentatives: ${lastError?.message}`);
  }

  /**
   * Upload un fichier vers o2switch
   */
  async uploadFile(localFilePath: string, remoteDirectory: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Client FTPS non connecté. Appelez connect() d\'abord.');
    }

    const fileName = path.basename(localFilePath);
    const remoteFilePath = path.posix.join(remoteDirectory, fileName);

    console.log(`📍 [FTPS] Fichier local: ${localFilePath}`);
    console.log(`📍 [FTPS] Fichier distant: ${remoteFilePath}`);

    // Vérifier que le fichier local existe
    try {
      await fs.access(localFilePath);
    } catch (error) {
      throw new Error(`Fichier local introuvable: ${localFilePath}`);
    }

    // Vérifier/créer le répertoire distant
    try {
      console.log(`📁 [FTPS] Vérification du répertoire distant: ${remoteDirectory}`);
      await this.client.ensureDir(remoteDirectory);
      console.log(`✅ [FTPS] Répertoire distant prêt: ${remoteDirectory}`);
    } catch (error: any) {
      console.error(`⚠️ [FTPS] Impossible de créer le répertoire ${remoteDirectory}: ${error.message}`);
      // Continuer malgré l'erreur - le répertoire existe peut-être déjà
    }

    // Upload du fichier
    console.log(`📤 [FTPS] Début de l'upload...`);
    await this.client.uploadFrom(localFilePath, remoteFilePath);
    console.log(`✅ [FTPS] Upload réussi: ${fileName} → ${remoteDirectory}`);
  }

  /**
   * Fermer la connexion FTPS
   */
  async disconnect(): Promise<void> {
    try {
      this.client.close();
      this.connected = false;
      console.log('🔌 [FTPS] Connexion fermée');
    } catch (error: any) {
      console.error(`⚠️ [FTPS] Erreur lors de la fermeture: ${error.message}`);
    }
  }
}

/**
 * Fonction principale d'upload vers o2switch via FTPS
 * 
 * @param localFilePath Chemin du fichier local à uploader
 * @param uploadType Type d'upload ('navettes' ou 'bilans')
 * @returns true si succès, false si échec
 */
export async function uploadToFTPS(
  localFilePath: string,
  uploadType: UploadType
): Promise<boolean> {
  // En développement: skip FTPS
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📁 [FTPS] Mode développement - Upload FTPS ignoré pour: ${path.basename(localFilePath)}`);
    return true;
  }

  console.log(`🚀 [FTPS] Début de l'upload ${uploadType} → ${path.basename(localFilePath)}`);

  // Vérifier la configuration
  if (!process.env.FTP_PASSWORD) {
    console.error('❌ [FTPS] FTP_PASSWORD non définie dans les variables d\'environnement');
    console.error('💡 [FTPS] Configurez FTP_PASSWORD sur Render pour activer l\'upload FTPS');
    return false;
  }

  const ftpsClient = new FTPSClient();

  try {
    // Connexion avec retry automatique
    await ftpsClient.connect(3);

    // Upload du fichier
    const remoteDirectory = REMOTE_PATHS[uploadType];
    await ftpsClient.uploadFile(localFilePath, remoteDirectory);

    console.log(`✅ [FTPS] Upload terminé avec succès`);
    return true;

  } catch (error: any) {
    console.error(`❌ [FTPS] Erreur lors de l'upload: ${error.message}`);
    console.error(`📋 [FTPS] Stack trace:`);
    console.error(error.stack);
    
    // Diagnostics supplémentaires
    console.error(`🔍 [FTPS] Diagnostics:`);
    console.error(`   - Fichier: ${localFilePath}`);
    console.error(`   - Type: ${uploadType}`);
    console.error(`   - Serveur: ${process.env.FTP_HOST || 'millet.o2switch.net'}`);
    console.error(`   - Port: ${process.env.FTP_PORT || '21'}`);
    console.error(`   - Utilisateur: ${process.env.FTP_USER || 'kalo4499'}`);
    console.error(`   - Mot de passe configuré: ${process.env.FTP_PASSWORD ? 'OUI' : 'NON'}`);
    
    return false;

  } finally {
    // Toujours fermer la connexion
    await ftpsClient.disconnect();
  }
}

/**
 * Tester la connexion FTPS (pour endpoint de diagnostic)
 */
export async function testFTPSConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  console.log(`🧪 [FTPS] Test de connexion FTPS...`);

  if (!process.env.FTP_PASSWORD) {
    return {
      success: false,
      message: 'FTP_PASSWORD non configurée',
      details: {
        host: process.env.FTP_HOST || 'millet.o2switch.net',
        port: process.env.FTP_PORT || '21',
        user: process.env.FTP_USER || 'kalo4499',
        passwordConfigured: false,
      },
    };
  }

  const ftpsClient = new FTPSClient();

  try {
    await ftpsClient.connect(1); // 1 seule tentative pour le test

    // Récupérer le client connecté pour effectuer les opérations
    const client = ftpsClient.getClient();

    // Lister le répertoire courant
    const pwd = await client.pwd();
    const files = await client.list();

    return {
      success: true,
      message: 'Connexion FTPS réussie',
      details: {
        host: process.env.FTP_HOST || 'millet.o2switch.net',
        port: process.env.FTP_PORT || '21',
        user: process.env.FTP_USER || 'kalo4499',
        currentDirectory: pwd,
        filesCount: files.length,
        sampleFiles: files.slice(0, 5).map(f => ({ name: f.name, type: f.type })),
      },
    };

  } catch (error: any) {
    return {
      success: false,
      message: `Échec de connexion: ${error.message}`,
      details: {
        host: process.env.FTP_HOST || 'kalo4499.odns.fr',
        port: process.env.FTP_PORT || '21',
        user: process.env.FTP_USER || 'render@kalo4499.odns.fr',
        error: error.message,
        stack: error.stack,
      },
    };

  } finally {
    await ftpsClient.disconnect();
  }
}
