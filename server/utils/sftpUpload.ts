import SftpClient from "ssh2-sftp-client";
import path from "path";
import fs from "fs/promises";

/**
 * Configuration SFTP pour o2switch
 * Note: password is checked before connection attempt
 */
function getSFTPConfig() {
  if (!process.env.SFTP_PASSWORD) {
    throw new Error("SFTP_PASSWORD is not configured");
  }

  return {
    host: "millet.o2switch.net",
    port: 22,
    username: "kalo4499",
    password: process.env.SFTP_PASSWORD,
  };
}

/**
 * Chemins distants sur o2switch (en dehors du répertoire web)
 */
export const REMOTE_PATHS = {
  navettes: "/home/kalo4499/uploads/navettes/",
  bilans: "/home/kalo4499/uploads/bilans/",
};

/**
 * Types de fichiers supportés
 */
export type UploadType = "navettes" | "bilans";

/**
 * Upload un fichier vers o2switch via SFTP
 * ⚠️ Fonctionne uniquement en mode production (NODE_ENV=production)
 *
 * @param localFilePath - Chemin complet du fichier local (ex: /home/runner/workspace/uploads/navettes/abc123.pdf)
 * @param uploadType - Type d'upload ('navettes' ou 'bilans')
 * @returns true si succès, false si échec ou si pas en production
 */
export async function uploadToSFTP(
  localFilePath: string,
  uploadType: UploadType,
): Promise<boolean> {
  console.log("🌍 [SFTP] Environnement:", process.env.NODE_ENV);
  console.log("📄 [SFTP] Fichier à transférer:", localFilePath);
  console.log("📂 [SFTP] Type de transfert:", uploadType);

  // ⚠️ Ne fonctionne qu'en production
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `📁 [SFTP] Mode développement - Skip upload SFTP pour: ${path.basename(localFilePath)}`,
    );
    return true; // Considéré comme succès en dev
  }

  // Vérifier que le mot de passe SFTP est configuré
  if (!process.env.SFTP_PASSWORD) {
    console.error(
      "❌ [SFTP] SFTP_PASSWORD non configuré dans les variables d'environnement",
    );
    return false;
  }

  const sftp = new SftpClient();

  try {
    // Get SFTP config (throws if password not set)
    const sftpConfig = getSFTPConfig();

    // Connexion au serveur SFTP o2switch
    console.log(`🔌 [SFTP] Connexion à ${sftpConfig.host}...`);
    await sftp.connect(sftpConfig);

    // Déterminer le chemin distant
    const remotePath = REMOTE_PATHS[uploadType];
    const fileName = path.basename(localFilePath);
    const remoteFilePath = path.posix.join(remotePath, fileName);

    console.log(`📦 [SFTP] Chemin distant: ${remoteFilePath}`);

    // Vérifier que le fichier local existe
    try {
      await fs.access(localFilePath);
    } catch (error) {
      console.error(`❌ [SFTP] Fichier local introuvable: ${localFilePath}`);
      return false;
    }

    // Upload du fichier
    console.log(`📤 [SFTP] Upload: ${fileName} → ${remoteFilePath}`);
    await sftp.put(localFilePath, remoteFilePath);

    console.log(`✅ [SFTP] Upload réussi: ${fileName} (${uploadType})`);
    return true;
  } catch (error) {
    console.error(`❌ [SFTP] Erreur lors de l'upload:`, error);
    console.error(`   Fichier: ${localFilePath}`);
    console.error(`   Type: ${uploadType}`);
    return false;
  } finally {
    // Toujours fermer la connexion SFTP
    try {
      await sftp.end();
    } catch (closeError) {
      console.error(
        "⚠️ [SFTP] Erreur lors de la fermeture de la connexion:",
        closeError,
      );
    }
  }
}

/**
 * Teste la connexion SFTP (utile pour le déploiement)
 */
export async function testSFTPConnection(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") {
    console.log("🧪 [SFTP] Test de connexion skip en développement");
    return true;
  }

  if (!process.env.SFTP_PASSWORD) {
    console.error("❌ [SFTP] SFTP_PASSWORD non configuré");
    return false;
  }

  const sftp = new SftpClient();

  try {
    // Get SFTP config (throws if password not set)
    const sftpConfig = getSFTPConfig();

    console.log("🧪 [SFTP] Test de connexion...");
    await sftp.connect(sftpConfig);

    // Vérifier que les dossiers distants existent
    const navettesExists = await sftp.exists(REMOTE_PATHS.navettes);
    const bilansExists = await sftp.exists(REMOTE_PATHS.bilans);

    console.log(
      `   ✅ Dossier navettes: ${navettesExists ? "OK" : "❌ INTROUVABLE"}`,
    );
    console.log(
      `   ✅ Dossier bilans: ${bilansExists ? "OK" : "❌ INTROUVABLE"}`,
    );

    if (!navettesExists || !bilansExists) {
      console.error("❌ [SFTP] Certains dossiers distants sont introuvables");
      return false;
    }

    console.log("✅ [SFTP] Test de connexion réussi");
    return true;
  } catch (error) {
    console.error("❌ [SFTP] Test de connexion échoué:", error);
    return false;
  } finally {
    try {
      await sftp.end();
    } catch (closeError) {
      // Ignorer les erreurs de fermeture lors du test
    }
  }
}
