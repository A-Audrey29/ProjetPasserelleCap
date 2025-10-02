import { storage } from '../storage.ts';
import { logAction } from './auditLogger.js';
import notificationService from './notificationService.js';

/**
 * Trouve une session avec de la place OU crée une nouvelle session
 * 
 * LOGIQUE:
 * - Groupe tous les enrollments par sessionNumber
 * - Calcule le total de participants par session
 * - Cherche une session non-verrouillée avec capacité restante (< maxCapacity)
 * - Si aucune session disponible, retourne nouveau numéro de session
 * 
 * @param {string} workshopId - ID de l'atelier
 * @param {string} evsId - ID de l'organisation EVS
 * @param {number} newParticipantCount - Nombre de participants à ajouter
 * @returns {Promise<number>} - Numéro de session à utiliser
 */
async function findOrCreateSessionNumber(workshopId, evsId, newParticipantCount) {
  // 1. Récupérer les infos de l'atelier (notamment maxCapacity)
  const workshop = await storage.getWorkshop(workshopId);
  if (!workshop || !workshop.maxCapacity) {
    console.log(`⚠️ No maxCapacity for workshop ${workshopId}, creating session 1`);
    return 1; // Pas de limite définie, retourner session 1
  }
  
  // 2. Récupérer TOUS les enrollments de cet atelier+EVS
  const allEnrollments = await storage.getWorkshopEnrollments({
    workshopId: workshopId,
    evsId: evsId
  });
  
  if (allEnrollments.length === 0) {
    console.log(`🆕 No existing enrollments, creating session 1`);
    return 1; // Première inscription, créer session 1
  }
  
  // 3. Grouper par sessionNumber et calculer total + état de verrouillage
  const sessionStats = {};
  
  for (const enrollment of allEnrollments) {
    const sessionNum = enrollment.sessionNumber;
    
    if (!sessionStats[sessionNum]) {
      sessionStats[sessionNum] = {
        total: 0,
        isLocked: false
      };
    }
    
    sessionStats[sessionNum].total += enrollment.participantCount;
    sessionStats[sessionNum].isLocked = sessionStats[sessionNum].isLocked || enrollment.isLocked;
  }
  
  // 4. Trier les sessions par numéro (1, 2, 3...)
  const sortedSessionNumbers = Object.keys(sessionStats)
    .map(Number)
    .sort((a, b) => a - b);
  
  // 5. Chercher la première session NON verrouillée avec de la place
  for (const sessionNum of sortedSessionNumbers) {
    const stats = sessionStats[sessionNum];
    
    // Session verrouillée → ignorer
    if (stats.isLocked) {
      console.log(`🔒 Session ${sessionNum} is locked, skipping`);
      continue;
    }
    
    // Vérifier si ajout dépasse maxCapacity
    const totalAfterAdd = stats.total + newParticipantCount;
    
    if (totalAfterAdd <= workshop.maxCapacity) {
      console.log(`✅ Session ${sessionNum} has space: ${stats.total}/${workshop.maxCapacity} → adding ${newParticipantCount}`);
      return sessionNum; // Cette session a de la place
    } else {
      console.log(`⚠️ Session ${sessionNum} would exceed capacity: ${totalAfterAdd} > ${workshop.maxCapacity}`);
    }
  }
  
  // 6. Aucune session disponible → créer nouvelle session
  const maxSessionNumber = Math.max(...sortedSessionNumbers);
  const newSessionNumber = maxSessionNumber + 1;
  
  console.log(`🆕 All sessions full or locked, creating session ${newSessionNumber}`);
  return newSessionNumber;
}

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
      console.log(`🔄 Processing workshop ${workshopId}...`);
      
      // Check existing enrollments for this workshop+EVS combination
      const existingEnrollments = await storage.getEnrollmentsByWorkshopAndEvs(workshopId, fiche.assignedOrgId);
      
      // Look for an open session (not locked and activity not done)
      const openSession = existingEnrollments.find(enrollment => 
        !enrollment.isLocked && !enrollment.activityDone
      );
      
      let enrollment;
      const newParticipants = fiche.participantsCount || 1;
      
      if (openSession) {
        // Found open session, increment participant count
        console.log(`📈 Found open session ${openSession.sessionNumber}, adding ${newParticipants} participants (current: ${openSession.participantCount})`);
        
        enrollment = await storage.updateWorkshopEnrollment(openSession.id, {
          participantCount: openSession.participantCount + newParticipants
        });
        
        console.log(`✅ Updated enrollment ${enrollment.id} for workshop ${workshopId}, session ${enrollment.sessionNumber} - Total: ${enrollment.participantCount} participants`);
      } else {
        // No open session found, create new session
        const maxSessionNumber = existingEnrollments.length > 0 
          ? Math.max(...existingEnrollments.map(e => e.sessionNumber))
          : 0;
        const sessionNumber = maxSessionNumber + 1;
        
        console.log(`🆕 No open session found, creating session ${sessionNumber} with ${newParticipants} participants`);
        
        enrollment = await storage.createWorkshopEnrollment({
          ficheId: fiche.id,
          workshopId: workshopId,
          evsId: fiche.assignedOrgId,
          participantCount: newParticipants,
          sessionNumber: sessionNumber,
          isLocked: false,
          contractSignedByEvs: false,
          contractSignedByCommune: false,
          activityDone: false,
        });
        
        console.log(`✅ Created enrollment ${enrollment.id} for workshop ${workshopId}, session ${sessionNumber}`);
      }
      
      enrollments.push(enrollment);
      
      // ⚡ INLINE THRESHOLD CHECK: Immediately check and lock if threshold reached
      await checkAndLockWorkshopSessions(workshopId, fiche.assignedOrgId);
      
    } catch (error) {
      console.error(`❌ Failed to create enrollment for workshop ${workshopId}:`, error);
    }
  }

  return enrollments;
}

// Helper function to check cumulative participants and auto-lock sessions when threshold reached
async function checkAndLockWorkshopSessions(workshopId, evsId) {
  console.log(`🔍 ENTERING checkAndLockWorkshopSessions for workshop ${workshopId}, EVS ${evsId}`);
  try {
    // Get workshop details with capacity thresholds
    const workshop = await storage.getWorkshop(workshopId);
    if (!workshop || !workshop.minCapacity) {
      console.log(`⚪ No capacity threshold for workshop ${workshopId}, skipping lock check`);
      return;
    }

    // Calculate total participants for this specific EVS and workshop
    const evsEnrollments = await storage.getEnrollmentsByWorkshopAndEvs(workshopId, evsId);
    const totalParticipants = evsEnrollments.reduce((sum, enrollment) => sum + enrollment.participantCount, 0);

    console.log(`🔢 Workshop ${workshopId} (EVS ${evsId}): ${totalParticipants}/${workshop.minCapacity} participants (threshold: ${workshop.minCapacity})`);

    // Check if threshold is reached and lock sessions if needed
    if (totalParticipants >= workshop.minCapacity) {
      const unlockedEnrollments = evsEnrollments.filter(enrollment => !enrollment.isLocked);
      
      if (unlockedEnrollments.length > 0) {
        console.log(`🔒 THRESHOLD REACHED! Locking ${unlockedEnrollments.length} sessions for workshop ${workshopId}, EVS ${evsId}`);
        
        // Lock all sessions for this workshop and EVS
        const lockPromises = unlockedEnrollments.map(enrollment => 
          storage.updateWorkshopEnrollment(enrollment.id, { isLocked: true })
        );
        
        await Promise.all(lockPromises);
        
        console.log(`✅ Locked ${unlockedEnrollments.length} sessions for workshop ${workshopId}, EVS ${evsId} (${totalParticipants} participants >= ${workshop.minCapacity} minimum)`);
        
        // TODO: Trigger notification emails (will be implemented in Phase 2.4)
        console.log(`📧 TODO: Send locking notifications for workshop ${workshopId}, EVS ${evsId}`);
      } else {
        console.log(`🔒 Workshop ${workshopId} sessions already locked for EVS ${evsId}`);
      }
    } else {
      console.log(`⏳ Workshop ${workshopId} below threshold for EVS ${evsId} (${totalParticipants}/${workshop.minCapacity})`);
    }
  } catch (error) {
    console.error(`❌ Failed to check/lock sessions for workshop ${workshopId}, EVS ${evsId}:`, error);
  }
}

// Define valid state transitions by role
const STATE_TRANSITIONS = {
  EMETTEUR: {
    DRAFT: ['SUBMITTED_TO_FEVES']
  },
  RELATIONS_EVS: {
    SUBMITTED_TO_FEVES: ['ASSIGNED_EVS'],
    ACCEPTED_EVS: ['CONTRACT_SIGNED', 'ARCHIVED'], // Skip CONTRACT_SENT, go directly to CONTRACT_SIGNED or ARCHIVED
    CONTRACT_SIGNED: ['ACTIVITY_DONE'],
    ACTIVITY_DONE: ['FIELD_CHECK_SCHEDULED'],
    FIELD_CHECK_SCHEDULED: ['FIELD_CHECK_DONE'], // RELATIONS_EVS validates field check
    FIELD_CHECK_DONE: ['FINAL_REPORT_RECEIVED'],
    FINAL_REPORT_RECEIVED: ['CLOSED'], // Final validation closes the fiche
    CLOSED: ['ARCHIVED']
  },
  EVS_CS: {
    ASSIGNED_EVS: ['ACCEPTED_EVS', 'SUBMITTED_TO_FEVES'], // EVS can accept or refuse (back to SUBMITTED_TO_FEVES)
    CONTRACT_SIGNED: ['FIELD_CHECK_SCHEDULED'], // EVS_CS confirms activity completion
    ACCEPTED_EVS: ['CLOSED'] // EVS_CS can close all workshops (definitive, no reversal)
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
    await createWorkshopEnrollments(updatedFiche).catch(error => {
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
