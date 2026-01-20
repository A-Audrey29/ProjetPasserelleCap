import { useState, useEffect } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import styles from './FileUpload.module.css';

const FileUpload = ({ 
  onFilesChange, 
  initialFiles = [], 
  acceptedFormats = ['.pdf', '.jpg', '.jpeg', '.png'],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  title = "Télécharger des fichiers" 
}) => {
  const [files, setFiles] = useState(initialFiles);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Synchronize local state with initialFiles prop changes
  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  const acceptedMimes = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', 
    '.png': 'image/png'
  };

  const validateFile = (file) => {
    // Check file size
    if (file.size > maxFileSize) {
      return `Le fichier "${file.name}" est trop volumineux (max ${maxFileSize / (1024 * 1024)}MB)`;
    }

    // Check file type
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!acceptedFormats.includes(extension)) {
      return `Le fichier "${file.name}" n'est pas au bon format (formats acceptés: ${acceptedFormats.join(', ')})`;
    }

    return null;
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { apiFetch } = await import('@/lib/apiFetch');
      const response = await apiFetch('/api/uploads', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Erreur d'upload: ${response.status}`);
      }

      const result = await response.json();
      return {
        url: result.url,
        name: result.name,
        size: result.size,
        mime: result.mime
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const processFiles = async (newFiles) => {
    setError(null);
    setUploading(true);

    try {
      const validFiles = [];
      const errors = [];

      // Validate all files first
      for (const file of newFiles) {
        const error = validateFile(file);
        if (error) {
          errors.push(error);
        } else {
          validFiles.push(file);
        }
      }

      if (errors.length > 0) {
        setError(errors.join('. '));
        setUploading(false);
        return;
      }

      // Upload valid files
      const uploadPromises = validFiles.map(uploadFile);
      const uploadedFiles = await Promise.all(uploadPromises);
      
      const newFileList = [...files, ...uploadedFiles];
      setFiles(newFileList);
      onFilesChange(newFileList);

    } catch (error) {
      console.error('Processing files error:', error);
      setError('Erreur lors du téléchargement des fichiers');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    // Reset input value so the same file can be selected again
    e.target.value = '';
  };

  const removeFile = (indexToRemove) => {
    const newFileList = files.filter((_, index) => index !== indexToRemove);
    setFiles(newFileList);
    onFilesChange(newFileList);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={styles.fileUploadContainer}>
      <h4 className={styles.title}>{title}</h4>
      
      {/* Upload Zone */}
      <div
        className={`${styles.uploadZone} ${dragActive ? styles.dragActive : ''} ${uploading ? styles.uploading : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        data-testid="file-upload-zone"
      >
        {uploading ? (
          <div className={styles.uploadingState}>
            <div className={styles.spinner}></div>
            <p>Téléchargement en cours...</p>
          </div>
        ) : (
          <div className={styles.uploadPrompt}>
            <Upload size={32} className={styles.uploadIcon} />
            <div>
              <p className={styles.uploadText}>
                Glissez-déposez vos fichiers ici ou{' '}
                <label className={styles.uploadLink}>
                  cliquez pour sélectionner
                  <input
                    type="file"
                    multiple
                    accept={acceptedFormats.join(',')}
                    onChange={handleFileInput}
                    className={styles.hiddenInput}
                    data-testid="file-input"
                  />
                </label>
              </p>
              <p className={styles.uploadHint}>
                Formats acceptés: {acceptedFormats.join(', ')} (max {maxFileSize / (1024 * 1024)}MB par fichier)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.errorMessage} data-testid="upload-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <div className={styles.filesList}>
          <h5 className={styles.filesListTitle}>Fichiers téléchargés ({files.length})</h5>
          {files.map((file, index) => (
            <div key={index} className={styles.fileItem} data-testid={`file-item-${index}`}>
              <div className={styles.fileInfo}>
                <FileText size={16} className={styles.fileIcon} />
                <div className={styles.fileDetails}>
                  <span className={styles.fileName}>{file.name}</span>
                  <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className={styles.removeButton}
                aria-label={`Supprimer ${file.name}`}
                data-testid={`remove-file-${index}`}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;