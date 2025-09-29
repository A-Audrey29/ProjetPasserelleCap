import { storage } from '../storage.ts';
import { logAction } from './auditLogger.js';
import notificationService from './notificationService.js';

// Helper function to create workshop enrollments when fiche transitions to ACCEPTED_EVS
async function createWorkshopEnrollments(fiche) {
  if (!fiche.selectedWorkshops || !fiche.assignedOrgId) {
    console.log(`No selected workshops or assigned org for fiche ${fiche.id}, skipping enrollment creation`);
    return;
  }

  const selectedWorkshops = typeof fiche.selectedWorkshops === 'string' 
    ? JSON.parse(fiche.selectedWorkshops) 
    : fiche.selectedWorkshops;

  const selectedWorkshopIds = Object.entries(selectedWorkshops)
    .filter(([_, isSelected]) => isSelected)
    .map(([workshopId, _]) => workshopId);

  if (selectedWorkshopIds.length === 0) {
    console.log(`No workshops selected for fiche ${fiche.id}, skipping enrollment creation`);
    return;
  }

  console.log(`Creating enrollments for fiche ${fiche.id} with workshops:`, selectedWorkshopIds);

  const enrollments = [];
  for (const workshopId of selectedWorkshopIds) {
    try {
      // Check if enrollment already exists for this combination
      const existingEnrollments = await storage.getEnrollmentsByWorkshopAndEvs(workshopId, fiche.assignedOrgId);
      
      // Determine session number (next available session for this workshop+EVS)
      const sessionNumber = existingEnrollments.length + 1;

      const enrollment = await storage.createWorkshopEnrollment({
        ficheId: fiche.id,
        workshopId: workshopId,
        evsId: fiche.assignedOrgId,
        participantCount: fiche.participantsCount || 1,
        sessionNumber: sessionNumber,
        isLocked: false,
        contractSignedByEvs: false,
        contractSignedByCommune: false,
        activityDone: false,
      });

      enrollments.push(enrollment);
      console.log(`✅ Created enrollment ${enrollment.id} for workshop ${workshopId}, session ${sessionNumber}`);
    } catch (error) {
      console.error(`❌ Failed to create enrollment for workshop ${workshopId}:`, error);
    }
  }

  return enrollments;
}

// Define valid state transitions by role
const STATE_TRANSITIONS = {
  EMETTEUR: {
    DRAFT: ['SUBMITTED_TO_FEVES']
  },
  CD: {
    SUBMITTED_TO_CD: ['SUBMITTED_TO_FEVES', 'ARCHIVED', 'DRAFT']
  },
  RELATIONS_EVS: {
    SUBMITTED_TO_FEVES: ['ASSIGNED_EVS'],
    ACCEPTED_EVS: ['CONTRACT_SIGNED', 'ARCHIVED'], // Skip CONTRACT_SENT, go directly to CONTRACT_SIGNED or ARCHIVED
    CONTRACT_SIGNED: ['ACTIVITY_DONE'],
    ACTIVITY_DONE: ['FIELD_CHECK_SCHEDULED'],
    FIELD_CHECK_SCHEDULED: ['FIELD_CHECK_DONE'], // RELATIONS_EVS validates field check
    FIELD_CHECK_DONE: ['CLOSED'],
    CLOSED: ['ARCHIVED']
  },
  EVS_CS: {
    ASSIGNED_EVS: ['ACCEPTED_EVS', 'SUBMITTED_TO_FEVES'], // EVS can accept or refuse (back to SUBMITTED_TO_FEVES)
    CONTRACT_SIGNED: ['FIELD_CHECK_SCHEDULED'] // EVS_CS confirms activity completion
  }
};

export function canTransition(userRole, currentState, newState) {
  // ADMIN can perform any transition
  if (userRole === 'ADMIN') {
    return true;
  }
  
  const allowedTransitions = STATE_TRANSITIONS[userRole];
  if (!allowedTransitions) return false;
  
  const validNextStates = allowedTransitions[currentState];
  return validNextStates?.includes(newState) || false;
}

export async function transitionFicheState(ficheId, newState, userId, metadata = {}) {
  console.log(`🔄 ENTERING transitionFicheState: ${ficheId} -> ${newState}`);
  
  // Parallelize fiche and user retrieval
  const [fiche, user] = await Promise.all([
    storage.getFiche(ficheId),
    storage.getUser(userId)
  ]);
  
  if (!fiche) {
    throw new Error('Fiche not found');
  }

  if (!user) {
    throw new Error('User not found');
  }

  // Check if transition is allowed
  if (!canTransition(user.role, fiche.state, newState)) {
    throw new Error(`Transition from ${fiche.state} to ${newState} not allowed for role ${user.role}`);
  }

  // Perform the transition
  const updatedFiche = await storage.updateFiche(ficheId, { state: newState, ...metadata });

  // Handle automatic workshop enrollment creation for ACCEPTED_EVS transition
  if (newState === 'ACCEPTED_EVS') {
    console.log(`🎯 TRIGGERING WORKSHOP ENROLLMENT CREATION for fiche ${ficheId}`);
    void createWorkshopEnrollments(updatedFiche).catch(error => {
      console.error('Workshop enrollment creation failed for fiche', ficheId, ':', error);
    });
  }

  // Start background tasks without blocking the response
  void Promise.allSettled([
    // Log the transition
    logAction(userId, 'state_transition', 'FicheNavette', ficheId, {
      oldState: fiche.state,
      newState: newState,
      ...metadata
    }).catch(error => {
      console.error('Audit logging failed for fiche', ficheId, ':', error);
    }),
    // Send automatic email notifications (non-blocking)
    notificationService.sendStateTransitionNotification(
      updatedFiche, 
      fiche.state, 
      newState, 
      userId, 
      metadata
    ).catch(error => {
      console.error('Email notification failed for fiche', ficheId, ':', error);
    })
  ]);
  
  return updatedFiche;
}

export function getValidTransitions(userRole, currentState) {
  const allowedTransitions = STATE_TRANSITIONS[userRole];
  return allowedTransitions?.[currentState] || [];
}
