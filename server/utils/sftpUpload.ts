import SftpClient from 'ssh2-sftp-client';
import path from 'path';
import fs from 'fs/promises';

function getSFTPConfig() {
  if (!process.env.SFTP_PASSWORD) {
    throw new Error('SFTP_PASSWORD is not configured');
  }

  return {
    host: process.env.SFTP_HOST || 'millet.o2switch.net',
    port: parseInt(process.env.SFTP_PORT || '22', 10),
    username: process.env.SFTP_USER || 'kalo4499',
    password: process.env.SFTP_PASSWORD,
  };
}

export const REMOTE_PATHS = {
  navettes: '/home/kalo4499/uploads/navettes/',
  bilans: '/home/kalo4499/uploads/bilans/',
};

export type UploadType = 'navettes' | 'bilans';

export async function uploadToSFTP(
  localFilePath: string,
  uploadType: UploadType
): Promise<boolean> {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📁 [SFTP] Mode développement - SFTP ignoré pour: ${path.basename(localFilePath)}`);
    return true;
  }

  console.log(`🚀 [SFTP] uploadToSFTP lancé pour ${uploadType} → ${localFilePath}`);

  if (!process.env.SFTP_PASSWORD) {
    console.error('❌ [SFTP] SFTP_PASSWORD non défini dans les variables d\'environnement');
    return false;
  }

  const sftp = new SftpClient();

  try {
    const sftpConfig = getSFTPConfig();

    console.log(`🔌 [SFTP] Connexion à ${sftpConfig.host}:${sftpConfig.port} avec utilisateur ${sftpConfig.username}...`);
    await sftp.connect(sftpConfig);

    const remotePath = REMOTE_PATHS[uploadType];
    const fileName = path.basename(localFilePath);
    const remoteFilePath = path.posix.join(remotePath, fileName);

    console.log(`📍 [SFTP] Fichier local : ${localFilePath}`);
    console.log(`📍 [SFTP] Fichier distant : ${remoteFilePath}`);

    try {
      await fs.access(localFilePath);
    } catch (error) {
      console.error(`❌ [SFTP] Fichier local introuvable: ${localFilePath}`);
      return false;
    }

    console.log(`📤 [SFTP] Upload en cours...`);
    await sftp.put(localFilePath, remoteFilePath);
    console.log(`✅ [SFTP] Upload réussi : ${fileName} → ${uploadType}`);

    return true;

  } catch (error: any) {
    console.error(`❌ [SFTP] Erreur upload : ${error.message}`);
    console.error(error.stack);
    return false;
  } finally {
    try {
      await sftp.end();
      console.log('🔌 [SFTP] Connexion SFTP fermée');
    } catch (closeError: any) {
      console.error('⚠️ [SFTP] Erreur fermeture connexion :', closeError.message);
    }
  }
}
