import { storage } from '../storage.ts';
import { logAction } from './auditLogger.js';

// Define valid state transitions by role
const STATE_TRANSITIONS = {
  EMETTEUR: {
    DRAFT: ['SUBMITTED_TO_CD']
  },
  CD: {
    SUBMITTED_TO_CD: ['SUBMITTED_TO_FEVES', 'ARCHIVED']
  },
  RELATIONS_EVS: {
    SUBMITTED_TO_FEVES: ['ASSIGNED_TO_EVS'],
    EVS_ACCEPTED: ['CONTRACT_SENT'],
    CONTRACT_SIGNED: ['ADVANCE_70_PAID'],
    ACTIVITY_DONE: ['FIELD_CHECK_SCHEDULED'],
    FIELD_CHECK_DONE: ['FINAL_REPORT_RECEIVED'],
    FINAL_REPORT_RECEIVED: ['REMAINING_30_PAID'],
    REMAINING_30_PAID: ['CLOSED'],
    CLOSED: ['ARCHIVED']
  },
  EVS_CS: {
    ASSIGNED_TO_EVS: ['EVS_ACCEPTED', 'EVS_REJECTED', 'NEEDS_INFO'],
    CONTRACT_SENT: ['CONTRACT_SIGNED'],
    ADVANCE_70_PAID: ['ACTIVITY_DONE']
  }
};

export function canTransition(userRole, currentState, newState) {
  const allowedTransitions = STATE_TRANSITIONS[userRole];
  if (!allowedTransitions) return false;
  
  const validNextStates = allowedTransitions[currentState];
  return validNextStates?.includes(newState) || false;
}

export async function transitionFicheState(ficheId, newState, userId, metadata = {}) {
  const fiche = await storage.getFiche(ficheId);
  if (!fiche) {
    throw new Error('Fiche not found');
  }

  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Check if transition is allowed
  if (!canTransition(user.role, fiche.state, newState)) {
    throw new Error(`Transition from ${fiche.state} to ${newState} not allowed for role ${user.role}`);
  }

  // Perform the transition
  const updatedFiche = await storage.updateFiche(ficheId, { state: newState });

  // Log the transition
  await logAction(userId, 'state_transition', 'FicheNavette', ficheId, {
    oldState: fiche.state,
    newState: newState,
    ...metadata
  });

  return updatedFiche;
}

export function getValidTransitions(userRole, currentState) {
  const allowedTransitions = STATE_TRANSITIONS[userRole];
  return allowedTransitions?.[currentState] || [];
}
