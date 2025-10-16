// Date formatting utilities
export function formatDate(date, format = 'short') {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const options = {
    short: {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    },
    long: {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    },
    datetime: {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    },
    time: {
      hour: '2-digit',
      minute: '2-digit'
    }
  };

  return new Intl.DateTimeFormat('fr-FR', options[format] || options.short).format(d);
}

// Relative date formatting (e.g., "il y a 2 heures")
export function formatRelativeDate(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now - d) / 1000);
  
  if (diffInSeconds < 60) {
    return 'À l\'instant';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
  }
  
  return formatDate(date);
}

// Currency formatting
export function formatCurrency(amountInCents, currency = 'EUR') {
  if (typeof amountInCents !== 'number') return '0,00 €';
  
  const amount = amountInCents / 100;
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Number formatting
export function formatNumber(number, options = {}) {
  if (typeof number !== 'number') return '0';
  
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options
  }).format(number);
}

// Percentage formatting
export function formatPercentage(decimal, decimals = 1) {
  if (typeof decimal !== 'number') return '0%';
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(decimal);
}

// File size formatting
export function formatFileSize(bytes) {
  if (typeof bytes !== 'number') return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

// Phone number formatting
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // French phone number formatting
  if (digits.length === 10 && digits.startsWith('0')) {
    return digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  
  return phone;
}

// Name formatting
export function formatFullName(firstName, lastName) {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.join(' ');
}

export function formatInitials(firstName, lastName) {
  const first = firstName ? firstName.charAt(0).toUpperCase() : '';
  const last = lastName ? lastName.charAt(0).toUpperCase() : '';
  return first + last;
}

// Text formatting utilities
export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength) + '...';
}

export function capitalizeFirst(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function toTitleCase(text) {
  if (!text) return '';
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

// Reference code formatting
export function formatFicheRef(ref) {
  if (!ref) return '';
  // Format: FN-2024-001
  return ref.toUpperCase();
}

export function formatFamilyCode(code) {
  if (!code) return '';
  // Format: FAM-XXX
  return code.toUpperCase();
}

// State/Status formatting
export function formatState(state) {
  if (!state) return '';
  
  const stateMap = {
    DRAFT: 'Brouillon',
    SUBMITTED_TO_FEVES: 'Envoyé FEVES',
    ASSIGNED_EVS: 'Affecté EVS',
    ACCEPTED_EVS: 'Accepté EVS',
    EVS_REJECTED: 'Refusé EVS',
    CONTRACT_SENT: 'Contrat envoyé',
    CONTRACT_SIGNED: 'Contrat signé',
    ADVANCE_70_PAID: 'Avance 70% payée',
    ACTIVITY_DONE: 'Activité réalisée',
    FIELD_CHECK_SCHEDULED: 'Vérification programmée',
    FIELD_CHECK_DONE: 'Vérification effectuée',
    FINAL_REPORT_RECEIVED: 'Rapport final reçu',
    CLOSED: 'Clôturé',
    ARCHIVED: 'Archivé'
  };
  
  return stateMap[state] || state;
}

// Address formatting
export function formatAddress(address) {
  if (!address) return '';
  
  // Basic address formatting - could be enhanced
  return address.trim();
}

// Duration formatting
export function formatDuration(durationInDays) {
  if (typeof durationInDays !== 'number') return '';
  
  if (durationInDays === 0) return 'Aujourd\'hui';
  if (durationInDays === 1) return '1 jour';
  if (durationInDays < 7) return `${durationInDays} jours`;
  
  const weeks = Math.floor(durationInDays / 7);
  const remainingDays = durationInDays % 7;
  
  let result = `${weeks} semaine${weeks > 1 ? 's' : ''}`;
  if (remainingDays > 0) {
    result += ` et ${remainingDays} jour${remainingDays > 1 ? 's' : ''}`;
  }
  
  return result;
}

// Validation helpers
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone) {
  const phoneRegex = /^(?:(?:\+33|0)[1-9](?:[0-9]{8}))$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// URL formatting
export function formatFileUrl(url) {
  if (!url) return '';
  
  // Ensure URL starts with protocol or is relative
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
    return url;
  }
  
  return `/${url}`;
}
