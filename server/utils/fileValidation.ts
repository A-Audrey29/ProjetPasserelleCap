import fileType from 'file-type';
import fs from 'fs/promises';
import path from 'path';

/**
 * Allowed file types with their MIME types and extensions
 */
const ALLOWED_FILE_TYPES = {
  pdf: {
    mime: ['application/pdf'],
    ext: ['.pdf']
  },
  jpeg: {
    mime: ['image/jpeg'],
    ext: ['.jpg', '.jpeg']
  },
  png: {
    mime: ['image/png'],
    ext: ['.png']
  }
} as const;

/**
 * Validates the actual file type by checking its magic number (file signature)
 * This prevents malicious files with fake extensions
 * 
 * @param filePath - Path to the uploaded file
 * @returns Object with isValid boolean and error message if invalid
 */
export async function validateFileType(filePath: string): Promise<{ isValid: boolean; error?: string; detectedType?: string }> {
  try {
    // Read file buffer (need minimum bytes for detection, usually 4100)
    const buffer = await fs.readFile(filePath);
    
    // Detect actual file type from magic number
    const detectedType = await fileType.fromBuffer(buffer);
    
    if (!detectedType) {
      return {
        isValid: false,
        error: 'Type de fichier non détectable'
      };
    }
    
    // Check if detected MIME type is allowed
    const allowedMimes: string[] = [
      ...ALLOWED_FILE_TYPES.pdf.mime,
      ...ALLOWED_FILE_TYPES.jpeg.mime,
      ...ALLOWED_FILE_TYPES.png.mime
    ];
    
    if (!allowedMimes.includes(detectedType.mime as string)) {
      return {
        isValid: false,
        error: `Type de fichier non autorisé: ${detectedType.mime}. Seuls PDF, JPEG et PNG sont acceptés`,
        detectedType: detectedType.mime
      };
    }
    
    return {
      isValid: true,
      detectedType: detectedType.mime
    };
    
  } catch (error) {
    return {
      isValid: false,
      error: 'Erreur lors de la validation du fichier'
    };
  }
}

/**
 * Deletes a file if validation fails
 */
export async function deleteInvalidFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error deleting invalid file:', error);
  }
}

/**
 * Gets the file extension from original filename
 */
export function getFileExtension(originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase();
  // Validate extension
  const allowedExts: string[] = [
    ...ALLOWED_FILE_TYPES.pdf.ext,
    ...ALLOWED_FILE_TYPES.jpeg.ext,
    ...ALLOWED_FILE_TYPES.png.ext
  ];
  
  return allowedExts.includes(ext) ? ext : '.bin';
}
