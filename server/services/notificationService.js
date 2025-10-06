import emailService from './emailService.ts';
import { storage } from '../storage.ts';

/**
 * Service de notifications automatiques lors des transitions d'état
 * Basé sur les spécifications exactes du workflow CAP
 */
class NotificationService {
  
  /**
   * Déclenche la notification appropriée selon la transition d'état
   */
  async sendStateTransitionNotification(fiche, oldState, newState, userId, metadata = {}) {
    try {
      console.log(`Notification transition: ${oldState} → ${newState} for fiche ${fiche.ref}`);
      
      // Récupérer les informations de l'émetteur
      const emitter = await storage.getUser(fiche.emitterId);
      const emitterName = emitter ? `${emitter.firstName} ${emitter.lastName}` : undefined;
      
      // Récupérer la structure d'appartenance de l'émetteur
      let emitterStructure = null;
      if (emitter?.orgId) {
        const emitterOrg = await storage.getOrganization(emitter.orgId);
        emitterStructure = emitterOrg?.name;
      } else if (emitter?.structure) {
        // Fallback sur le champ texte libre si pas d'orgId
        emitterStructure = emitter.structure;
      }
      
      // Récupérer les informations de l'organisation assignée si applicable
      let assignedOrg = null;
      let evsOrgName = null;
      if (fiche.assignedOrgId) {
        assignedOrg = await storage.getOrganization(fiche.assignedOrgId);
        evsOrgName = assignedOrg?.name;
      }

      // Déclencher la notification selon la transition
      switch (newState) {
        
        case 'SUBMITTED_TO_CD':
          // Legacy case - kept for existing fiches only
          await this.notifySubmittedToCd(fiche, emitterName);
          break;
          
        case 'SUBMITTED_TO_FEVES':
          if (oldState === 'DRAFT') {
            // Émetteur transmet directement à FEVES (nouveau workflow)
            await this.notifySubmittedToFeves(fiche, emitterName, emitterStructure);
          } else if (oldState === 'SUBMITTED_TO_CD') {
            // Validation par le CD (legacy workflow)
            await this.notifySubmittedToFeves(fiche, emitterName, emitterStructure);
          }
          break;
          
        case 'DRAFT':
          if (oldState === 'SUBMITTED_TO_CD') {
            // Refus par le CD
            await this.notifyCdRejection(fiche, emitter, metadata.reason);
          } else if (oldState === 'SUBMITTED_TO_FEVES') {
            // Refus par FEVES (RELATIONS_EVS)
            await this.notifyFevesRejection(fiche, emitter, metadata.reason);
          }
          break;
          
        case 'ASSIGNED_EVS':
          await this.notifyEvsAssignment(fiche, assignedOrg);
          break;
          
        case 'ACCEPTED_EVS':
          await this.notifyEvsAcceptance(fiche, evsOrgName);
          break;
          
        case 'CONTRACT_SIGNED':
          await this.notifyContractSigned(fiche, evsOrgName);
          break;
          
        case 'ACTIVITY_DONE':
          await this.notifyActivityDone(fiche, evsOrgName);
          break;
          
        case 'FIELD_CHECK_DONE':
          await this.notifyFieldCheckDone(fiche, evsOrgName);
          break;
      }
      
      // Cas spéciaux pour les refus EVS
      if (oldState === 'ASSIGNED_EVS' && newState === 'SUBMITTED_TO_FEVES') {
        await this.notifyEvsRejection(fiche, evsOrgName, metadata.reason);
      }
      
    } catch (error) {
      console.error('Error sending state transition notification:', error);
      // Ne pas faire échouer la transition si l'email échoue
    }
  }

  /**
   * Notification : Fiche soumise au CD
   */
  async notifySubmittedToCd(fiche, emitterName) {
    const cdEmails = await this.getCdEmails();
    if (cdEmails.length > 0) {
      await emailService.sendSubmittedToCdNotification({
        cdEmails,
        emitterName,
        ficheId: fiche.id,
        ficheRef: fiche.ref
      });
    }
  }

  /**
   * Notification : Fiche transmise à FEVES
   */
  async notifySubmittedToFeves(fiche, emitterName, emitterStructure) {
    const fevesEmails = await this.getFevesEmails();
    if (fevesEmails.length > 0) {
      await emailService.sendSubmittedToFevesNotification({
        fevesEmails,
        emitterName,
        emitterStructure,
        ficheId: fiche.id,
        ficheRef: fiche.ref
      });
    }
  }

  /**
   * Notification : Fiche refusée par le CD
   */
  async notifyCdRejection(fiche, emitter, reason) {
    if (emitter?.email) {
      await emailService.sendCdRejectionNotification({
        emitterEmail: emitter.email,
        emitterName: `${emitter.firstName} ${emitter.lastName}`,
        ficheId: fiche.id,
        ficheRef: fiche.ref,
        reason
      });
    }
  }

  /**
   * Notification : Fiche refusée par FEVES (RELATIONS_EVS)
   */
  async notifyFevesRejection(fiche, emitter, reason) {
    if (emitter?.email) {
      await emailService.sendFevesRejectionNotification({
        emitterEmail: emitter.email,
        emitterName: `${emitter.firstName} ${emitter.lastName}`,
        ficheId: fiche.id,
        ficheRef: fiche.ref,
        reason
      });
    }
  }

  /**
   * Notification : Fiche assignée à un EVS
   * Envoie la référence formatée (FN-ANNEE-MOIS-CHIFFRE) pour affichage lisible
   */
  async notifyEvsAssignment(fiche, assignedOrg) {
    if (assignedOrg?.contactEmail) {
      await emailService.sendEvsAssignmentNotification({
        contactEmail: assignedOrg.contactEmail,
        contactName: assignedOrg.contactName,
        orgName: assignedOrg.name,
        ficheId: fiche.id,        // UUID pour traçabilité logs
        ficheRef: fiche.reference // Référence formatée pour affichage utilisateur
      });
    }
  }

  /**
   * Notification : EVS accepte l'assignation
   */
  async notifyEvsAcceptance(fiche, evsOrgName) {
    const fevesEmails = await this.getFevesEmails();
    if (fevesEmails.length > 0) {
      await emailService.sendEvsAcceptanceNotification({
        fevesEmails,
        evsOrgName,
        ficheId: fiche.id,
        ficheRef: fiche.ref
      });
    }
  }

  /**
   * Notification : EVS refuse l'assignation
   */
  async notifyEvsRejection(fiche, evsOrgName, reason) {
    const fevesEmails = await this.getFevesEmails();
    if (fevesEmails.length > 0) {
      await emailService.sendEvsRejectionNotification({
        fevesEmails,
        evsOrgName,
        ficheId: fiche.id,
        ficheRef: fiche.ref,
        reason
      });
    }
  }

  /**
   * Notification : Contrat signé (paiement 70% à déclencher)
   */
  async notifyContractSigned(fiche, evsOrgName) {
    const cdEmails = await this.getCdEmails();
    if (cdEmails.length > 0) {
      await emailService.sendContractSignedNotification({
        cdEmails,
        evsOrgName,
        ficheId: fiche.id,
        ficheRef: fiche.ref,
        totalAmount: fiche.totalAmount
      });
    }
  }

  /**
   * Notification : Activité terminée (contrôle terrain à déclencher)
   */
  async notifyActivityDone(fiche, evsOrgName) {
    const fevesEmails = await this.getFevesEmails();
    if (fevesEmails.length > 0) {
      await emailService.sendActivityCompletedNotification({
        fevesEmails,
        evsOrgName,
        ficheId: fiche.id,
        ficheRef: fiche.ref
      });
    }
  }

  /**
   * Notification : Contrôle terrain validé (paiement final + clôture)
   */
  async notifyFieldCheckDone(fiche, evsOrgName) {
    const cdEmails = await this.getCdEmails();
    const fevesEmails = await this.getFevesEmails();
    
    if (cdEmails.length > 0 || fevesEmails.length > 0) {
      await emailService.sendFieldCheckCompletedNotification({
        cdEmails,
        fevesEmails,
        evsOrgName,
        ficheId: fiche.id,
        ficheRef: fiche.ref,
        totalAmount: fiche.totalAmount
      });
    }
  }

  /**
   * Notification : Activité d'atelier terminée
   */
  async notifyWorkshopActivityCompleted(session, enrollments) {
    try {
      const fevesEmails = await this.getFevesEmails();
      if (fevesEmails.length === 0) {
        console.log('No FEVES emails found for workshop activity notification');
        return;
      }

      // Get all fiches for this session
      const ficheRefs = enrollments.map(e => e.ficheId);
      const fiches = [];
      for (const ficheId of ficheRefs) {
        const fiche = await storage.getFiche(ficheId);
        if (fiche) {
          fiches.push(fiche);
        }
      }

      // Prepare notification data
      const workshopName = session.workshop?.name || 'Atelier';
      const sessionNumber = session.sessionNumber;
      const evsName = session.evs?.name || 'Organisation';
      const participantCount = session.participantCount;
      const ficheList = fiches.map(f => `#${f.ref}`).join(', ');

      // Send email notification
      await emailService.sendWorkshopActivityCompletedNotification({
        fevesEmails,
        workshopName,
        sessionNumber,
        evsName,
        participantCount,
        ficheList,
        sessionId: session.id
      });

      console.log(`Workshop activity completion notification sent for ${workshopName} session ${sessionNumber}`);
    } catch (error) {
      console.error('Error sending workshop activity completed notification:', error);
      throw error;
    }
  }

  /**
   * Récupère les emails des utilisateurs CD
   */
  async getCdEmails() {
    try {
      const cdUsers = await storage.getUsersByRole('CD');
      return cdUsers
        .filter(user => user.isActive && user.email)
        .map(user => user.email);
    } catch (error) {
      console.error('Error getting CD emails:', error);
      return [];
    }
  }

  /**
   * Récupère les emails des utilisateurs FEVES
   */
  async getFevesEmails() {
    try {
      const fevesUsers = await storage.getUsersByRole('RELATIONS_EVS');
      return fevesUsers
        .filter(user => user.isActive && user.email)
        .map(user => user.email);
    } catch (error) {
      console.error('Error getting FEVES emails:', error);
      return [];
    }
  }

  /**
   * Notification: Tous les ateliers d'une fiche sont terminés, fiche clôturée
   */
  async notifyFicheAllWorkshopsCompleted(fiche) {
    try {
      // Get emails for RELATIONS_EVS and CD
      const fevesEmails = await this.getFevesEmails();
      const cdEmails = await this.getCdEmails();
      const allEmails = [...fevesEmails, ...cdEmails];

      if (allEmails.length === 0) {
        console.log('No RELATIONS_EVS or CD emails found for fiche closure notification');
        return;
      }

      // Send email notification
      await emailService.sendFicheAllWorkshopsCompletedNotification({
        emails: allEmails,
        ficheRef: fiche.ref,
        ficheId: fiche.id
      });

      console.log(`Fiche closure notification sent for ${fiche.ref} to ${allEmails.length} recipients`);
    } catch (error) {
      console.error('Error sending fiche closure notification:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new NotificationService();