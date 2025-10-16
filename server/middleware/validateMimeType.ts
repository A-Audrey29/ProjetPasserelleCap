import { Request, Response, NextFunction } from 'express';
import { validateFileType, deleteInvalidFile } from '../utils/fileValidation';
import { ErrorCodes } from '../utils/errorCodes';

/**
 * Middleware to validate uploaded file's actual MIME type
 * Must be used AFTER multer middleware
 */
export async function validateUploadedFileMimeType(req: Request, res: Response, next: NextFunction) {
  try {
    // Check if a file was uploaded
    if (!req.file) {
      return next();
    }

    const filePath = req.file.path;

    // Validate the actual file type using magic number detection
    const validation = await validateFileType(filePath);

    if (!validation.isValid) {
      // Delete the invalid file
      await deleteInvalidFile(filePath);

      // Return error
      const error: any = new Error(validation.error || 'Type de fichier invalide');
      error.status = 400;
      error.code = ErrorCodes.VALIDATION_ERROR;
      error.details = `Fichier rejeté: ${validation.error}`;
      throw error;
    }

    // File is valid, proceed
    next();

  } catch (error) {
    // If error already has status, rethrow it
    if ((error as any).status) {
      next(error);
    } else {
      // Wrap unknown errors
      const wrappedError: any = new Error('Erreur lors de la validation du fichier');
      wrappedError.status = 500;
      wrappedError.code = ErrorCodes.INTERNAL_SERVER_ERROR;
      wrappedError.details = (error as Error).message;
      next(wrappedError);
    }
  }
}
