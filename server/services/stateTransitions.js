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
  
  // === TRAITEMENT ATELIER PAR ATELIER ===
  for (const workshopId of selectedWorkshopIds) {
    try {
      console.log(`\n🔄 Processing workshop ${workshopId}...`);
      
      // ÉTAPE 1: Vérifier si CETTE fiche a déjà un enrollment pour cet atelier
      const existingEnrollment = await storage.getWorkshopEnrollments({
        ficheId: fiche.id,
        workshopId: workshopId
      });
      
      if (existingEnrollment && existingEnrollment.length > 0) {
        console.log(`⏭️ Enrollment already exists for fiche ${fiche.id}, workshop ${workshopId} - SKIPPING`);
        continue; // Passer au prochain atelier
      }
      
      // ÉTAPE 2: Calculer le numéro de session approprié
      const participantCount = fiche.participantsCount || 1;
      const sessionNumber = await findOrCreateSessionNumber(
        workshopId,
        fiche.assignedOrgId,
        participantCount
      );
      
      console.log(`📍 Assigning fiche ${fiche.id} to session ${sessionNumber} with ${participantCount} participants`);
      
      // ÉTAPE 3: TOUJOURS CRÉER un nouvel enrollment (JAMAIS de update)
      const enrollment = await storage.createWorkshopEnrollment({
        ficheId: fiche.id,
        workshopId: workshopId,
        evsId: fiche.assignedOrgId,
        participantCount: participantCount, // Nombre de participants DE CETTE FICHE uniquement
        sessionNumber: sessionNumber,
        isLocked: false,
        contractSignedByEVS: false,
        contractSignedByCommune: false,
        activityDone: false,
      });
      
      console.log(`✅ Created enrollment ${enrollment.id} for workshop ${workshopId}, session ${sessionNumber}`);
      enrollments.push(enrollment);
      
      // ÉTAPE 4: Vérifier et verrouiller la session si capacité atteinte
      await checkAndLockWorkshopSessions(workshopId, fiche.assignedOrgId);
      
      // ÉTAPE 5: Vérifier si minCapacity atteint et envoyer notification "prêt"
      await checkAndNotifyWorkshopReady(workshopId, fiche.assignedOrgId, sessionNumber);
      
    } catch (error) {
      console.error(`❌ Failed to create enrollment for workshop ${workshopId}:`, error);
      // Continue avec les autres ateliers même en cas d'erreur
    }
  }

  return enrollments;
}

/**
 * Vérifie et verrouille les sessions qui ont atteint leur capacité maximale
 * 
 * LOGIQUE:
 * - Groupe les enrollments par sessionNumber
 * - Calcule le total de participants PAR SESSION
 * - Verrouille chaque session individuellement si total >= maxCapacity
 * 
 * @param {string} workshopId - ID de l'atelier
 * @param {string} evsId - ID de l'organisation EVS
 */
async function checkAndLockWorkshopSessions(workshopId, evsId) {
  console.log(`🔍 ENTERING checkAndLockWorkshopSessions for workshop ${workshopId}, EVS ${evsId}`);
  
  try {
    // 1. Récupérer les infos de l'atelier (notamment maxCapacity)
    const workshop = await storage.getWorkshop(workshopId);
    if (!workshop || !workshop.maxCapacity) {
      console.log(`⚪ No maxCapacity for workshop ${workshopId}, skipping lock check`);
      return;
    }

    // 2. Récupérer TOUS les enrollments de cet atelier+EVS
    const allEnrollments = await storage.getWorkshopEnrollments({
      workshopId: workshopId,
      evsId: evsId
    });
    
    if (allEnrollments.length === 0) {
      console.log(`⚪ No enrollments found for workshop ${workshopId}, EVS ${evsId}`);
      return;
    }

    // 3. Grouper par sessionNumber avec calcul du total et collecte des enrollments
    const sessionGroups = {};
    
    for (const enrollment of allEnrollments) {
      const sessionNum = enrollment.sessionNumber;
      
      if (!sessionGroups[sessionNum]) {
        sessionGroups[sessionNum] = {
          total: 0,
          enrollments: []
        };
      }
      
      sessionGroups[sessionNum].total += enrollment.participantCount;
      sessionGroups[sessionNum].enrollments.push(enrollment);
    }

    // 4. Vérifier et verrouiller chaque session individuellement
    for (const [sessionNum, session] of Object.entries(sessionGroups)) {
      console.log(`📊 Session ${sessionNum}: ${session.total}/${workshop.maxCapacity} participants`);
      
      // Vérifier si la session atteint ou dépasse maxCapacity
      if (session.total >= workshop.maxCapacity) {
        // Filtrer les enrollments non-verrouillés de CETTE session uniquement
        const unlockedEnrollments = session.enrollments.filter(e => !e.isLocked);
        
        if (unlockedEnrollments.length > 0) {
          console.log(`🔒 Session ${sessionNum} FULL! Locking ${unlockedEnrollments.length} enrollments`);
          
          // Verrouiller tous les enrollments de cette session
          const lockPromises = unlockedEnrollments.map(enrollment => 
            storage.updateWorkshopEnrollment(enrollment.id, { isLocked: true })
          );
          
          await Promise.all(lockPromises);
          
          console.log(`✅ Locked session ${sessionNum} for workshop ${workshopId}, EVS ${evsId} (${session.total} >= ${workshop.maxCapacity} max)`);
          
          // TODO: Trigger notification emails (Phase 2.4)
          console.log(`📧 TODO: Send session full notification for workshop ${workshopId}, session ${sessionNum}`);
        } else {
          console.log(`🔒 Session ${sessionNum} already locked`);
        }
      } else {
        console.log(`⏳ Session ${sessionNum} below capacity (${session.total}/${workshop.maxCapacity})`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Failed to check/lock sessions for workshop ${workshopId}, EVS ${evsId}:`, error);
  }
}

/**
 * Vérifie si une session d'atelier atteint minCapacity et envoie notification
 * Notification envoyée UNE SEULE FOIS par session
 * 
 * @param {string} workshopId - ID de l'atelier
 * @param {string} evsId - ID de l'organisation EVS
 * @param {number} sessionNumber - Numéro de la session à vérifier
 */
async function checkAndNotifyWorkshopReady(workshopId, evsId, sessionNumber) {
  console.log(`🎯 ENTERING checkAndNotifyWorkshopReady for workshop ${workshopId}, EVS ${evsId}, session ${sessionNumber}`);
  
  try {
    // 1. Récupérer les infos de l'atelier (notamment minCapacity)
    const workshop = await storage.getWorkshop(workshopId);
    if (!workshop || !workshop.minCapacity) {
      console.log(`⚪ No minCapacity for workshop ${workshopId}, skipping ready notification`);
      return;
    }

    // 2. Récupérer TOUS les enrollments de cette session spécifique
    const allEnrollments = await storage.getWorkshopEnrollments({
      workshopId: workshopId,
      evsId: evsId
    });
    
    // Filtrer uniquement les enrollments de cette session
    const sessionEnrollments = allEnrollments.filter(e => e.sessionNumber === sessionNumber);
    
    if (sessionEnrollments.length === 0) {
      console.log(`⚪ No enrollments found for session ${sessionNumber}`);
      return;
    }

    // 3. Vérifier si la notification a déjà été envoyée pour cette session
    const alreadyNotified = sessionEnrollments.some(e => e.minCapacityNotificationSent);
    if (alreadyNotified) {
      console.log(`⏭️ Notification already sent for session ${sessionNumber}, skipping`);
      return;
    }

    // 4. Calculer le total de participants de cette session
    const totalParticipants = sessionEnrollments.reduce((sum, e) => sum + (e.participantCount || 0), 0);
    
    console.log(`📊 Session ${sessionNumber}: ${totalParticipants}/${workshop.minCapacity} participants (minCapacity)`);

    // 5. Vérifier si minCapacity est atteint
    if (totalParticipants >= workshop.minCapacity) {
      console.log(`🎯 Session ${sessionNumber} READY! Sending notification...`);
      
      // Envoyer la notification
      await notificationService.notifyWorkshopReady(
        workshopId,
        sessionNumber,
        evsId,
        sessionEnrollments
      );
      
      // Marquer le flag sur TOUS les enrollments de cette session
      const updatePromises = sessionEnrollments.map(enrollment => 
        storage.updateWorkshopEnrollment(enrollment.id, { minCapacityNotificationSent: true })
      );
      
      await Promise.all(updatePromises);
      
      console.log(`✅ Notification sent and flag set for session ${sessionNumber} of workshop ${workshopId}`);
    } else {
      console.log(`⏳ Session ${sessionNumber} below minCapacity (${totalParticipants}/${workshop.minCapacity})`);
    }
    
  } catch (error) {
    console.error(`❌ Failed to check/notify workshop ready for workshop ${workshopId}, session ${sessionNumber}:`, error);
  }
}

// Define valid state transitions by role
const STATE_TRANSITIONS = {
  EMETTEUR: {
    DRAFT: ['SUBMITTED_TO_FEVES']
  },
  RELATIONS_EVS: {
    DRAFT: ['SUBMITTED_TO_FEVES'], // RELATIONS_EVS can transmit draft fiches
    SUBMITTED_TO_FEVES: ['ASSIGNED_EVS', 'DRAFT'], // RELATIONS_EVS can assign to EVS or reject back to DRAFT
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
  await storage.updateFiche(ficheId, { state: newState, ...metadata });
  // Reload complete fiche to ensure all fields (including ref) are present
  const updatedFiche = await storage.getFiche(ficheId);

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
