import { STATE_LABELS } from '@/utils/constants';
import styles from './StatusBadge.module.css';

export default function StatusBadge({ state, className = '' }) {
  const getStatusClass = (state) => {
    const baseClass = styles.statusBadge;
    
    switch (state) {
      case 'DRAFT':
        return `${baseClass} ${styles.statusDraft}`;
      case 'SUBMITTED_TO_FEVES':
        return `${baseClass} ${styles.statusSubmitted}`;
      case 'ASSIGNED_EVS':
        return `${baseClass} ${styles.statusAssigned}`;
      case 'ACCEPTED_EVS':
      case 'CONTRACT_SIGNED':
      case 'ACTIVITY_DONE':
      case 'FIELD_CHECK_SCHEDULED':
      case 'FIELD_CHECK_DONE':
        return `${baseClass} ${styles.statusAccepted}`;
      case 'EVS_REJECTED':
        return `${baseClass} ${styles.statusRejected}`;
      case 'CLOSED':
      case 'ARCHIVED':
        return `${baseClass} ${styles.statusClosed}`;
      default:
        return `${baseClass} ${styles.statusDraft}`;
    }
  };

  const statusText = STATE_LABELS[state] || state;

  return (
    <span 
      className={`${getStatusClass(state)} ${className}`}
      data-testid={`status-badge-${state}`}
    >
      {statusText}
    </span>
  );
}
