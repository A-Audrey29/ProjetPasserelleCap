// server/utils/ftpsUpload.ts
import { Client, AccessOptions } from "basic-ftp";
import fs from "fs/promises";
import path from "path";

export type UploadKind = "navettes" | "bilans";

export interface FTPSConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean; // FTPS explicite (TLS)
  secureOptions?: any;
  verbose: boolean;
  baseDir: string; // ex: "/uploads"
  connTimeoutMs: number;
}

export interface UploadResult {
  success: boolean;
  remotePath?: string;
  message?: string;
  error?: unknown;
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getFTPSConfig(): FTPSConfig {
  // CRITICAL: o2switch FTP client lands at system root (/) but files are in user home directory
  // Production: /home/kalo4499/uploads/uploads/ (absolute path on o2switch server)
  // Development: /uploads/ (relative path or local)
  const defaultBaseDir = process.env.NODE_ENV === 'production'
    ? '/home/kalo4499/uploads/uploads'
    : '/uploads';
  const baseDirEnv = process.env.FTP_BASE_DIR || defaultBaseDir;

  // On évite les chemins parasites "uploads/uploads"
  const normalizedBase = normalizeRemoteDir(baseDirEnv);

  return {
    host: required("FTP_HOST", process.env.FTP_HOST),
    port: Number(process.env.FTP_PORT || 21),
    user: required("FTP_USER", process.env.FTP_USER),
    password: required("FTP_PASSWORD", process.env.FTP_PASSWORD),
    secure: (process.env.FTP_SECURE || "true").toLowerCase() === "true",
    // O2Switch a des certificats valides ; on laisse rejectUnauthorized à true par défaut.
    // Si besoin de débug, tu peux temporairement mettre { rejectUnauthorized: false }
    secureOptions: undefined,
    verbose: (process.env.FTP_VERBOSE || "false").toLowerCase() === "true",
    baseDir: normalizedBase, // ex: "/uploads"
    connTimeoutMs: Number(process.env.FTP_CONN_TIMEOUT_MS || 15000),
  };
}

/** Normalise un répertoire remote en POSIX, sans doublons ni trailing slashes (sauf racine). */
function normalizeRemoteDir(input: string): string {
  // on travaille en POSIX ("/"), jamais en backslash
  let out = input.replace(/\\/g, "/").trim();
  if (!out) out = "/";
  // force leading slash
  if (!out.startsWith("/")) out = "/" + out;
  // supprime doublons "//"
  out = out.replace(/\/{2,}/g, "/");
  // supprime trailing slash sauf racine
  if (out.length > 1 && out.endsWith("/")) out = out.slice(0, -1);

  // évite /uploads/uploads si l'admin met "uploads" ou "/uploads"
  if (/^\/?uploads(\/|$)/i.test(out)) {
    // déjà bon: "/uploads" ou "/uploads/xxx"
    // rien à faire, le normalize a déjà clean.
  }
  return out;
}

/** Construit un chemin POSIX propre: /baseDir/<kind>/<fileName> */
function buildRemotePath(baseDir: string, kind: UploadKind, fileName: string): string {
  const cleanBase = normalizeRemoteDir(baseDir);
  const folder = kind === "navettes" ? "navettes" : "bilans";
  // S'assure qu'on ne duplique pas "uploads" si le fileName arrive déjà préfixé
  const justName = fileName.replace(/^\/+/, "").split("/").pop() || fileName;
  // Concat POSIX
  return `${cleanBase}/${folder}/${justName}`.replace(/\/{2,}/g, "/");
}

/**
 * Client FTPS encapsulé (basic-ftp)
 * - assure la connexion/déconnexion
 * - crée les répertoires distants si besoin (ensureDir)
 * - uploadFrom et vérification basique
 */
class FTPSUploader {
  private client: Client | null = null;
  private cfg: FTPSConfig;

  constructor(cfg: FTPSConfig) {
    this.cfg = cfg;
  }

  private async connect(): Promise<Client> {
    if (this.client) return this.client;

    const client = new Client();
    client.ftp.verbose = this.cfg.verbose;

    // Timeout de connexion (basic-ftp uses ftp.socket after connection)

    const access: AccessOptions = {
      host: this.cfg.host,
      port: this.cfg.port,
      user: this.cfg.user,
      password: this.cfg.password,
      secure: this.cfg.secure, // FTPS explicite
      secureOptions: this.cfg.secureOptions,
    };

    await client.access(access);
    this.client = client;
    return client;
  }

  private async disconnect(): Promise<void> {
    if (this.client) {
      try {
        this.client.close();
      } finally {
        this.client = null;
      }
    }
  }

  /** Upload d’un fichier local vers un chemin distant final (incluant le nom de fichier). */
  public async uploadLocalFile(localPath: string, finalRemotePath: string): Promise<UploadResult> {
    const client = await this.connect();
    try {
      // Vérifie que le local existe
      await fs.access(localPath);

      // Sépare dir et nom pour ensureDir
      const remoteDir = path.posix.dirname(finalRemotePath);
      const remoteName = path.posix.basename(finalRemotePath);

      await client.ensureDir(remoteDir);
      await client.uploadFrom(localPath, path.posix.join(remoteDir, remoteName));

      // Optionnel: vérification via list
      const list = await client.list(remoteDir);
      const found = list.find((e) => e.name === remoteName);
      if (!found) {
        throw new Error(`Upload seems completed but remote file not listed: ${finalRemotePath}`);
      }

      return { success: true, remotePath: finalRemotePath };
    } catch (error) {
      return {
        success: false,
        message: `FTPS upload failed to ${finalRemotePath}`,
        error,
      };
    } finally {
      await this.disconnect();
    }
  }
}

// =======================
// API publique du module
// =======================

/** Vérifie la connexion FTPS et la présence/permissions du dossier /uploads */
export async function healthCheck(): Promise<{ ok: boolean; cwd?: string; message?: string }> {
  const cfg = getFTPSConfig();
  const client = new Client();
  client.ftp.verbose = cfg.verbose;
  try {
    await client.access({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      secure: cfg.secure,
      secureOptions: cfg.secureOptions,
    });
    await client.ensureDir(cfg.baseDir); // ex: /uploads
    const cwd = await client.pwd();
    return { ok: true, cwd, message: "FTPS OK" };
  } catch (e: any) {
    return { ok: false, message: `FTPS KO: ${e?.message || e}` };
  } finally {
    client.close();
  }
}

/**
 * Upload d’un fichier local (chemin absolu côté Render) vers:
 *  - /uploads/navettes/<fileName> si kind="navettes"
 *  - /uploads/bilans/<fileName>   si kind="bilans"
 */
export async function uploadFile(localPath: string, fileName: string, kind: UploadKind): Promise<UploadResult> {
  const cfg = getFTPSConfig();

  // Nettoie des noms accidentels "uploads/uploads/xxx"
  // Ici on ne veut garder **que** le nom (pas de sous-dossiers venant de fileName).
  const safeName = (fileName || "").replace(/^.*[/\\]/, "");
  if (!safeName) {
    return { success: false, message: "fileName is empty" };
  }

  const remotePath = buildRemotePath(cfg.baseDir, kind, safeName);
  const uploader = new FTPSUploader(cfg);
  return uploader.uploadLocalFile(localPath, remotePath);
}

export async function uploadNavette(localPath: string, fileName: string): Promise<UploadResult> {
  return uploadFile(localPath, fileName, "navettes");
}

export async function uploadBilan(localPath: string, fileName: string): Promise<UploadResult> {
  return uploadFile(localPath, fileName, "bilans");
}

// =======================
// Download API (streaming)
// =======================

export interface DownloadResult {
  success: boolean;
  stream?: NodeJS.ReadableStream;
  size?: number;
  message?: string;
  errorCode?: "NOT_FOUND" | "TIMEOUT" | "CONNECTION_ERROR" | "UNKNOWN";
}

/**
 * Download a file from o2switch via FTPS and return a readable stream.
 * Does NOT load the entire file into memory.
 * 
 * @param subfolder - "navettes" or "bilans"
 * @param filename - The filename (e.g., "uuid.pdf")
 * @param onClose - Callback to close the FTP connection when stream ends/errors
 * @returns DownloadResult with stream if successful
 */
export async function downloadFile(
  subfolder: UploadKind,
  filename: string,
  onClose?: () => void
): Promise<DownloadResult> {
  const cfg = getFTPSConfig();
  const client = new Client(cfg.connTimeoutMs);
  client.ftp.verbose = cfg.verbose;

  const remotePath = `${cfg.baseDir}/${subfolder}/${filename}`.replace(/\/{2,}/g, "/");

  // Log the actual remote path being used for download
  console.log(`[downloadFile] cfg.baseDir: ${cfg.baseDir}`);
  console.log(`[downloadFile] Remote path constructed: ${remotePath}`);

  try {
    await client.access({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      secure: cfg.secure,
      secureOptions: cfg.secureOptions,
    });

    // === FORENSIC LOGGING START ===
    // Show where FTP client landed after connection
    const currentDir = await client.pwd();
    console.log(`[FTPS] 📍 Current Working Directory (where the client landed): ${currentDir}`);

    // List root directory to understand FTP server structure
    try {
      const rootList = await client.list('/');
      console.log('[FTPS] 🏁 LISTING ROOT / :', JSON.stringify(rootList.map(i => i.name)));
    } catch (rootErr: any) {
      console.log(`[FTPS] ⚠️ Failed to list root /: ${rootErr.message}`);
    }

    // List /uploads directory to check if it exists at root level
    try {
      const uploadsList = await client.list('/uploads');
      console.log('[FTPS] 🏁 LISTING /uploads :', JSON.stringify(uploadsList.map(i => i.name)));
    } catch (uploadsErr: any) {
      console.log(`[FTPS] ⚠️ Failed to list /uploads: ${uploadsErr.message}`);
    }

    // Parse remote path for directory listing
    const dir = path.posix.dirname(remotePath);
    const name = path.posix.basename(remotePath);

    console.log(`[FTPS] 📂 Target directory: ${dir}`);
    console.log(`[FTPS] 📄 Target filename: ${name}`);
    console.log(`[FTPS] 🎯 Full remote path: ${remotePath}`);

    // List directory contents to verify file visibility
    try {
      console.log(`[FTPS] 📋 Listing directory contents of: ${dir}`);
      const dirListing = await client.list(dir);
      console.log(`[FTPS] 📋 Found ${dirListing.length} items in ${dir}:`);
      dirListing.forEach(item => {
        console.log(`   - ${item.name} (${item.size} bytes, type: ${item.type})`);
      });

      const targetFile = dirListing.find(f => f.name === name);
      if (targetFile) {
        console.log(`[FTPS] ✅ Target file FOUND in listing: ${name} (${targetFile.size} bytes)`);
      } else {
        console.log(`[FTPS] ❌ Target file NOT FOUND in listing: ${name}`);
        console.log(`[FTPS] 💡 Available files: ${dirListing.map(f => f.name).join(', ')}`);
      }
    } catch (listErr: any) {
      console.log(`[FTPS] ⚠️ Failed to list directory ${dir}: ${listErr.message}`);
    }
    // === FORENSIC LOGGING END ===

    // Check if file exists and get size
    
    let fileSize: number | undefined;
    try {
      const list = await client.list(dir);
      const fileInfo = list.find((f) => f.name === name);
      if (!fileInfo) {
        client.close();
        return {
          success: false,
          message: `File not found: ${remotePath}`,
          errorCode: "NOT_FOUND",
        };
      }
      fileSize = fileInfo.size;
    } catch (listError: any) {
      client.close();
      if (listError.code === 550 || listError.message?.includes("550")) {
        return {
          success: false,
          message: `Directory not found: ${dir}`,
          errorCode: "NOT_FOUND",
        };
      }
      throw listError;
    }

    // Use downloadTo with a PassThrough stream for streaming
    const { PassThrough } = await import("stream");
    const passThrough = new PassThrough();

    // Handle stream cleanup
    const cleanup = () => {
      try {
        client.close();
      } catch (e) {
        // Ignore close errors
      }
      if (onClose) onClose();
    };

    passThrough.on("end", cleanup);
    passThrough.on("error", cleanup);
    passThrough.on("close", cleanup);

    // Start download in background (don't await - let it stream)
    client.downloadTo(passThrough, remotePath).catch((err) => {
      passThrough.destroy(err);
      cleanup();
    });

    return {
      success: true,
      stream: passThrough,
      size: fileSize,
    };
  } catch (error: any) {
    client.close();

    // Categorize errors
    if (error.code === "ETIMEDOUT" || error.message?.includes("timeout")) {
      return {
        success: false,
        message: `Connection timeout to FTPS server`,
        errorCode: "TIMEOUT",
      };
    }

    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return {
        success: false,
        message: `Cannot connect to FTPS server: ${error.message}`,
        errorCode: "CONNECTION_ERROR",
      };
    }

    return {
      success: false,
      message: `FTPS download failed: ${error.message || error}`,
      errorCode: "UNKNOWN",
    };
  }
}

/**
 * Download a navette PDF file
 */
export async function downloadNavette(
  filename: string,
  onClose?: () => void
): Promise<DownloadResult> {
  return downloadFile("navettes", filename, onClose);
}

/**
 * Download a bilan PDF file
 */
export async function downloadBilan(
  filename: string,
  onClose?: () => void
): Promise<DownloadResult> {
  return downloadFile("bilans", filename, onClose);
}
