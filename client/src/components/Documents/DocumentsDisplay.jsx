import { FileText, Download, Eye } from 'lucide-react';
import styles from './DocumentsDisplay.module.css';

const DocumentsDisplay = ({ 
  documents = [], 
  title = "Documents CAP",
  showTitle = true,
  showDownloadAll = false 
}) => {
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mime) => {
    if (mime?.includes('pdf')) return '📄';
    if (mime?.includes('image')) return '🖼️';
    return '📎';
  };

  const handleViewDocument = (document) => {
    if (document.url) {
      window.open(document.url, '_blank');
    }
  };

  const handleDownloadDocument = (doc) => {
    if (doc.url) {
      const link = window.document.createElement('a');
      link.href = doc.url;
      link.download = doc.name || 'document';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    }
  };

  const handleDownloadAll = () => {
    documents.forEach((doc) => {
      setTimeout(() => handleDownloadDocument(doc), 100); // Small delay between downloads
    });
  };

  if (!documents || documents.length === 0) {
    return null;
  }

  return (
    <div className={styles.documentsContainer}>
      {showTitle && (
        <div className={styles.header}>
          <h4 className={styles.title}>{title}</h4>
          {showDownloadAll && documents.length > 1 && (
            <button 
              type="button"
              className={styles.downloadAllButton}
              onClick={handleDownloadAll}
              data-testid="button-download-all-documents"
            >
              <Download size={16} />
              Télécharger tout
            </button>
          )}
        </div>
      )}
      
      <div className={styles.documentsList}>
        {documents.map((document, index) => (
          <div key={index} className={styles.documentItem} data-testid={`document-item-${index}`}>
            <div className={styles.documentInfo}>
              <div className={styles.documentIcon}>
                <span className={styles.fileEmoji}>{getFileIcon(document.mime)}</span>
                <FileText size={16} className={styles.fileIconSvg} />
              </div>
              <div className={styles.documentDetails}>
                <span className={styles.documentName} title={document.name}>
                  {document.name}
                </span>
                <span className={styles.documentSize}>
                  {formatFileSize(document.size)}
                </span>
              </div>
            </div>
            <div className={styles.documentActions}>
              <button
                type="button"
                onClick={() => handleViewDocument(document)}
                className={styles.actionButton}
                title="Visualiser"
                data-testid={`button-view-document-${index}`}
              >
                <Eye size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleDownloadDocument(document)}
                className={styles.actionButton}
                title="Télécharger"
                data-testid={`button-download-document-${index}`}
              >
                <Download size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {documents.length > 0 && (
        <div className={styles.documentsCount}>
          {documents.length} document{documents.length > 1 ? 's' : ''} disponible{documents.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default DocumentsDisplay;