import { formatDate } from '@/utils/formatters';
import { STATE_LABELS } from '@/utils/constants';

export default function StateTimeline({ currentState, stateHistory = [] }) {
  // Define the complete workflow states in order
  const workflowStates = [
    'DRAFT',
    'SUBMITTED_TO_FEVES',
    'ASSIGNED_TO_EVS',
    'EVS_ACCEPTED',
    'CONTRACT_SENT',
    'CONTRACT_SIGNED',
    'ADVANCE_70_PAID',
    'ACTIVITY_DONE',
    'FIELD_CHECK_SCHEDULED',
    'FIELD_CHECK_DONE',
    'FINAL_REPORT_RECEIVED',
    'REMAINING_30_PAID',
    'CLOSED',
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
      return 'text-primary font-medium';
    } else if (isStateCompleted(state)) {
      return 'text-success';
    } else {
      return 'text-muted-foreground';
    }
  };

  const getTimelineItemClass = (state) => {
    let baseClass = 'timeline-item';
    
    if (isStateCurrent(state)) {
      baseClass += ' timeline-current';
    } else if (isStateCompleted(state)) {
      baseClass += ' timeline-completed';
    } else {
      baseClass += ' timeline-pending';
    }
    
    return baseClass;
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
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 text-[#3b4b61]">
        Suivi de la fiche
      </h2>
      <div className="space-y-4">
        {visibleStates.map((state, index) => {
          const historyEntry = getStateFromHistory(state);
          const isLast = index === visibleStates.length - 1;
          
          return (
            <div 
              key={state} 
              className={`${getTimelineItemClass(state)} ${isLast ? 'timeline-last' : ''}`}
              data-testid={`timeline-item-${state}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-medium ${getStateClass(state)}`}>
                  {STATE_LABELS[state] || state}
                </span>
                <span className="text-xs text-muted-foreground">
                  {historyEntry ? formatDate(historyEntry.timestamp || historyEntry.createdAt) : 
                   isStateCurrent(state) ? 'En cours' : '-'}
                </span>
              </div>
              {historyEntry?.actor && (
                <p className="text-sm text-muted-foreground">
                  par {historyEntry.actor.firstName} {historyEntry.actor.lastName}
                </p>
              )}
              {historyEntry?.metadata?.comment && (
                <p className="text-sm text-muted-foreground italic">
                  {historyEntry.metadata.comment}
                </p>
              )}
            </div>
          );
        })}
        
        {/* Show rejected/needs info states if applicable */}
        {alternativeStates.includes(currentState) && (
          <div className={getTimelineItemClass(currentState)} data-testid={`timeline-item-${currentState}`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`font-medium ${getStateClass(currentState)}`}>
                {STATE_LABELS[currentState] || currentState}
              </span>
              <span className="text-xs text-muted-foreground">
                En cours
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
