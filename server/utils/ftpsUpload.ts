// src/utils/ftpsUpload.ts

import ftp from "basic-ftp";
import fs from "fs/promises";
import path from "path";

/**
 * Configuration FTPS
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

/**
 * Récupère la configuration FTPS à partir des variables d'environnement Render.
 */
function getFTPSConfig(): FTPSConfig {
  const password = process.env.FTP_PASS || process.env.FTP_PASSWORD;

  if (!password) {
    throw new Error(
      "❌ Aucun mot de passe FTP trouvé (FTP_PASS ou FTP_PASSWORD manquant dans Render)."
    );
  }

  return {
    host: process.env.FTP_HOST || "ftp.kalo4499.odns.fr",
    port: Number(process.env.FTP_PORT) || 21,
    user: process.env.FTP_USER || "render@kalo4499.odns.fr",
    password,
    secure: process.env.FTP_SECURE === "true",
    timeout: Number(process.env.FTP_TIMEOUT) || 30000,
    verbose: process.env.FTP_VERBOSE === "true",
  };
}

/**
 * Classe de gestion FTPS pour connexion et upload.
 */
export class FTPSUploader {
  private client: ftp.Client;
  private config: FTPSConfig;
  private connected = false;

  constructor() {
    this.client = new ftp.Client();
    this.config = getFTPSConfig();
    this.client.ftp.verbose = this.config.verbose;
  }

  /**
   * Connexion FTPS sécurisée
   */
  async connect(): Promise<void> {
    try {
      console.log("🔌 Connexion à O2Switch via FTPS...");
      await this.client.access({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        secure: this.config.secure,
        secureOptions: {
          rejectUnauthorized: false, // accepte TLS auto-signé
          minVersion: "TLSv1.2",
        },
        timeout: this.config.timeout,
      });

      this.connected = true;
      console.log("✅ Connecté à O2Switch (FTPS TLS actif)");
    } catch (err: any) {
      console.error("❌ Erreur de connexion FTPS:", err.message);
      throw err;
    }
  }

  /**
   * Upload d’un fichier dans le bon dossier distant (/uploads/bilans ou /uploads/navettes)
   */
  async uploadFile(localFilePath: string, remoteDirectory: string): Promise<void> {
    if (!this.connected) {
      throw new Error("Client FTPS non connecté. Appelez connect() d'abord.");
    }

    const fileName = path.basename(localFilePath);

    // 🧩 Normalisation du répertoire distant
    let cleanRemoteDir = (remoteDirectory || "").trim().replace(/^\/+/, "");

    // Accepte "uploads/navettes", "navettes", "uploads/bilans", "bilans"
    if (cleanRemoteDir === "navettes" || cleanRemoteDir === "bilans") {
      cleanRemoteDir = path.posix.join("uploads", cleanRemoteDir);
    } else if (cleanRemoteDir.startsWith("uploads/uploads")) {
      cleanRemoteDir = cleanRemoteDir.replace(/^uploads\/uploads/, "uploads");
    } else if (!cleanRemoteDir.startsWith("uploads")) {
      cleanRemoteDir = path.posix.join("uploads", cleanRemoteDir || "");
    }

    // Sécurise les dossiers cibles
    if (cleanRemoteDir === "uploads") {
      console.warn("ℹ️ [FTPS] Aucun sous-dossier fourni, dépôt à la racine /uploads.");
    } else if (
      cleanRemoteDir !== "uploads/navettes" &&
      cleanRemoteDir !== "uploads/bilans"
    ) {
      console.warn(`ℹ️ [FTPS] Dossier non standard "${cleanRemoteDir}", redirection vers /uploads.`);
      cleanRemoteDir = "uploads";
    }

    const remoteFilePath = path.posix.join(cleanRemoteDir, fileName);

    console.log(`📍 [FTPS] Fichier local: ${localFilePath}`);
    console.log(`📁 [FTPS] Dossier distant: ${cleanRemoteDir}`);
    console.log(`📄 [FTPS] Fichier distant: ${remoteFilePath}`);

    // Vérifier que le fichier local existe
    try {
      await fs.access(localFilePath);
    } catch {
      throw new Error(`Fichier local introuvable: ${localFilePath}`);
    }

    // Vérifie ou crée le dossier distant
    try {
      await this.client.ensureDir(cleanRemoteDir);
    } catch (error: any) {
      console.warn(`⚠️ [FTPS] Impossible de créer ${cleanRemoteDir}: ${error.message}`);
    }

    // Upload
    console.log("📤 [FTPS] Début de l'upload...");
    await this.client.uploadFrom(localFilePath, remoteFilePath);
    console.log(`✅ [FTPS] Upload réussi: ${fileName} → ${cleanRemoteDir}`);
  }

  /**
   * Déconnexion FTPS
   */
  close(): void {
    this.client.close();
    this.connected = false;
    console.log("🔒 Connexion FTPS fermée.");
  }
}

/**
 * Fonction utilitaire directe pour un upload simple
 */
export async function uploadToFTPS(localFilePath: string, remoteDir: string): Promise<boolean> {
  const uploader = new FTPSUploader();
  try {
    await uploader.connect();
    await uploader.uploadFile(localFilePath, remoteDir);
    return true;
  } catch (err: any) {
    console.error("❌ Erreur upload FTPS:", err.message);
    return false;
  } finally {
    uploader.close();
  }
}
