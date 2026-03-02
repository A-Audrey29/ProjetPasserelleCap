import { Filter } from 'lucide-react';
import { WORKSHOP_STATE_LABELS } from '@/utils/constants';
import styles from '@/pages/Fiches.module.css';

/**
 * WorkshopStateFilter - Composant de filtre pour l'état des ateliers
 *
 * Permet de filtrer les fiches selon l'état opérationnel de leurs ateliers :
 * - NOT_STARTED : En attente (aucun atelier commencé)
 * - IN_PROGRESS : En cours (au moins un atelier actif)
 * - COMPLETED : Terminés (tous les ateliers terminés)
 * - PARTIAL : Partiellement terminés (mixe)
 */
export default function WorkshopStateFilter({ value, onChange, className = '' }) {
  return (
    <div className={`${styles.filterSection} ${className}`.trim()}>
      <Filter className={styles.filterIcon} />
      <select
        className={styles.stateFilter}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid="select-workshop-state-filter"
      >
        <option value="">Tous les états d'ateliers</option>
        {Object.entries(WORKSHOP_STATE_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
