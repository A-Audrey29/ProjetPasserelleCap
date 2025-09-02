import { STATE_LABELS } from '@/utils/constants';

export default function StatusBadge({ state, className = '' }) {
  const getStatusClass = (state) => {
    const baseClass = 'status-badge';
    
    switch (state) {
      case 'DRAFT':
        return `${baseClass} status-draft`;
      case 'SUBMITTED_TO_FEVES':
      case 'NEEDS_INFO':
        return `${baseClass} status-submitted`;
      case 'ASSIGNED_TO_EVS':
      case 'CONTRACT_SENT':
        return `${baseClass} status-assigned`;
      case 'EVS_ACCEPTED':
      case 'CONTRACT_SIGNED':
      case 'ADVANCE_70_PAID':
      case 'ACTIVITY_DONE':
      case 'FIELD_CHECK_SCHEDULED':
      case 'FIELD_CHECK_DONE':
      case 'FINAL_REPORT_RECEIVED':
      case 'REMAINING_30_PAID':
        return `${baseClass} status-accepted`;
      case 'EVS_REJECTED':
        return `${baseClass} status-rejected`;
      case 'CLOSED':
      case 'ARCHIVED':
        return `${baseClass} status-closed`;
      default:
        return `${baseClass} status-draft`;
    }
  };

  const statusText = STATE_LABELS[state] || state;

  return (
    <span 
      className="status-badge status-draft bg-[#ffff00] text-[#3b4b61]"
      data-testid={`status-badge-${state}`}
    >
      {statusText}
    </span>
  );
}
