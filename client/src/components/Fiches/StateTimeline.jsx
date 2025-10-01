import { formatDate } from '@/utils/formatters';
import { STATE_LABELS } from '@/utils/constants';
import styles from './StateTimeline.module.css';

export default function StateTimeline({ currentState, stateHistory = [] }) {
  // Define the complete workflow states in order
  const workflowStates = [
    'DRAFT',
    'SUBMITTED_TO_FEVES',
    'ASSIGNED_EVS',
    'ACCEPTED_EVS',
    'CONTRACT_SIGNED',
    'ACTIVITY_DONE',
    'FIELD_CHECK_SCHEDULED',
    'FIELD_CHECK_DONE',
    'CLOSED',
    'CLOTUREE',
    'ARCHIVED'
  ];

  // Alternative workflow branches
  const alternativeStates = ['EVS_REJECTED', 'NEEDS_INFO'];

  const getCurrentStateIndex = () => {
    return workflowStates.indexOf(currentState);
  };

  const isStateCompleted = (state) => {
    const stateIndex = workflowStates.indexOf(state);
    const currentIndex = getCurrentStateIndex();
    
    if (currentIndex === -1) {
      // Current state is an alternative state, check history
      return stateHistory.some(h => h.state === state);
    }
    
    return stateIndex <= currentIndex && stateIndex !== -1;
  };

  const isStateCurrent = (state) => {
    return state === currentState;
  };

  const getStateFromHistory = (state) => {
    return stateHistory.find(h => h.state === state);
  };

  const getStateClass = (state) => {
    if (isStateCurrent(state)) {
      return `${styles.timelineState} ${styles.current}`;
    } else if (isStateCompleted(state)) {
      return `${styles.timelineState} ${styles.completed}`;
    } else {
      return `${styles.timelineState} ${styles.pending}`;
    }
  };

  const getTimelineItemClass = (state) => {
    let classes = [styles.timelineItem];
    
    if (isStateCurrent(state)) {
      classes.push(styles.timelineCurrent);
    } else if (isStateCompleted(state)) {
      classes.push(styles.timelineCompleted);
    }
    
    return classes.join(' ');
  };

  // Filter states to show based on current workflow
  const getVisibleStates = () => {
    const visible = [];
    const currentIndex = getCurrentStateIndex();
    
    if (currentIndex === -1) {
      // Alternative workflow - show relevant states from history plus alternatives
      const historyStates = stateHistory.map(h => h.state);
      
      // Add states from main workflow that were completed
      workflowStates.forEach(state => {
        if (historyStates.includes(state)) {
          visible.push(state);
        }
      });
      
      // Add current alternative state
      if (alternativeStates.includes(currentState)) {
        visible.push(currentState);
      }
    } else {
      // Main workflow - show states up to current + a few ahead
      const endIndex = Math.min(currentIndex + 3, workflowStates.length);
      visible.push(...workflowStates.slice(0, endIndex));
    }
    
    return visible;
  };

  const visibleStates = getVisibleStates();

  return (
    <div className={styles.timelineContainer}>
      <h2 className={styles.timelineTitle}>
        Suivi de la fiche
      </h2>
      <div className={styles.timelineContent}>
        {visibleStates.map((state, index) => {
          const historyEntry = getStateFromHistory(state);
          const isLast = index === visibleStates.length - 1;
          
          return (
            <div 
              key={state} 
              className={`${getTimelineItemClass(state)} ${isLast ? styles.timelineLast : ''}`}
              data-testid={`timeline-item-${state}`}
            >
              <div className={styles.timelineHeader}>
                <span className={getStateClass(state)}>
                  {STATE_LABELS[state] || state}
                </span>
                <span className={styles.timelineTimestamp}>
                  {historyEntry ? formatDate(historyEntry.timestamp || historyEntry.createdAt) : 
                   isStateCurrent(state) ? 'En cours' : '-'}
                </span>
              </div>
              {historyEntry?.actor && (
                <p className={styles.timelineActor}>
                  par {historyEntry.actor.firstName} {historyEntry.actor.lastName}
                </p>
              )}
              {historyEntry?.metadata?.comment && (
                <p className={styles.timelineComment}>
                  {historyEntry.metadata.comment}
                </p>
              )}
            </div>
          );
        })}
        
        {/* Show rejected/needs info states if applicable */}
        {alternativeStates.includes(currentState) && (
          <div className={getTimelineItemClass(currentState)} data-testid={`timeline-item-${currentState}`}>
            <div className={styles.timelineHeader}>
              <span className={getStateClass(currentState)}>
                {STATE_LABELS[currentState] || currentState}
              </span>
              <span className={styles.timelineTimestamp}>
                En cours
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
