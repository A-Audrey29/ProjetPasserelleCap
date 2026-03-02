import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { storage } from '../storage.js';
import type { InsertEmailLog } from '@shared/schema';

class EmailService {
  private isInterceptMode: boolean;
  private transporter?: Transporter;

  constructor() {
    // Determine if we should intercept emails (development mode)
    this.isInterceptMode = 
      process.env.EMAIL_INTERCEPT === 'true' || 
      process.env.NODE_ENV !== 'production' || 
      !process.env.EMAIL_HOST || 
      !process.env.EMAIL_USER;

    // Configure Brevo SMTP transporter
    if (!this.isInterceptMode && process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false, // TLS, not SSL
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      console.log('✅ Brevo SMTP configured for production sending');
    } else {
      console.log(`🚫 EMAIL INTERCEPTION ACTIVE - All emails will be logged to database instead of being sent!`);
    }
  }

  /**
   * Central delivery method that handles both real sending and interception
   */
  private async deliver(mailOptions: any, meta: any = {}) {
    const emailLog: InsertEmailLog = {
      to: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to],
      cc: mailOptions.cc ? (Array.isArray(mailOptions.cc) ? mailOptions.cc : [mailOptions.cc]) : null,
      bcc: mailOptions.bcc ? (Array.isArray(mailOptions.bcc) ? mailOptions.bcc : [mailOptions.bcc]) : null,
      subject: mailOptions.subject,
      text: mailOptions.text || null,
      html: mailOptions.html,
      meta: meta,
      status: 'intercepted'
    };

    if (this.isInterceptMode) {
      // In intercept mode, just log to database
      try {
        const log = await storage.createEmailLog(emailLog);
        console.log(`📧 Email intercepted: ${mailOptions.subject} -> ${mailOptions.to} (ID: ${log.id})`);
        return { success: true, intercepted: true, logId: log.id };
      } catch (error: any) {
        console.error('Failed to log intercepted email:', error);
        return { success: false, error: error.message, intercepted: true };
      }
    } else {
      // In production mode, send via Brevo SMTP and log
      if (!this.transporter) {
        console.error('❌ SMTP transporter not configured - cannot send email');
        emailLog.status = 'error';
        emailLog.error = 'SMTP transporter not configured';
        await storage.createEmailLog(emailLog);
        return { success: false, error: 'SMTP transporter not configured', intercepted: false };
      }

      try {
        const result = await this.transporter.sendMail(mailOptions);
        
        // Log successful send
        emailLog.status = 'sent';
        emailLog.messageId = result.messageId;
        await storage.createEmailLog(emailLog);
        
        console.log('✅ Email sent successfully via Brevo:', result.messageId);
        return { success: true, messageId: result.messageId, intercepted: false };
      } catch (error: any) {
        // Log error
        emailLog.status = 'error';
        emailLog.error = error.message;
        await storage.createEmailLog(emailLog);
        
        console.error('❌ Failed to send email via Brevo:', error);
        return { success: false, error: error.message, intercepted: false };
      }
    }
  }

  /**
   * Send email notification for EVS assignment
   * Affiche la référence formatée (FN-ANNEE-MOIS-CHIFFRE) au lieu de l'UUID technique
   */
  async sendEvsAssignmentNotification({ contactEmail, contactName, orgName, ficheId, ficheRef }: { contactEmail: string; contactName?: string; orgName?: string; ficheId: string; ficheRef: string; }) {
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Passerelle CAP',
        address: process.env.EMAIL_FROM_ADDRESS || 'noreply@passerelle-cap.fr'
      },
      to: contactEmail,
      subject: 'Nouvelle fiche CAP assignée',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B4B61;">Nouvelle fiche CAP assignée</h2>
          
          <p>Bonjour ${contactName || 'cher partenaire'},</p>
          
          <p>Une nouvelle fiche CAP vous a été assignée par l'équipe FEVES.</p>
          
          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Organisation :</strong> ${orgName}</p>
            <p><strong>Référence :</strong> ${ficheRef}</p>
          </div>
          
          <p>Veuillez vous connecter à la plateforme Passerelle CAP pour consulter les détails de cette fiche navette et la valider pour commencer l'accompagnement (ou la refuser si besoin).</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
               style="background-color: #6A8B74; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Accéder à la plateforme
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.<br>
            FEVES Guadeloupe et Saint-Martin
          </p>
        </div>
      `,
      text: `
        Nouvelle fiche CAP assignée
        
        Bonjour ${contactName || 'cher partenaire'},
        
        Une nouvelle fiche CAP vous a été assignée par l'équipe FEVES.
        
        Organisation : ${orgName}
        Référence : ${ficheRef}
        
        Veuillez vous connecter à la plateforme Passerelle CAP pour consulter les détails.
        
        Lien : ${process.env.FRONTEND_URL || 'http://localhost:5173'}
        
        ---
        Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.
        FEVES Guadeloupe et Saint-Martin
      `
    };

    const meta = {
      event: 'evs_assignment',
      ficheId,  // UUID conservé pour traçabilité logs
      orgName,
      contactEmail
    };

    return await this.deliver(mailOptions, meta);
  }

  /**
   * Send email notification when workshop session reaches minCapacity and is ready to start
   */
  async sendWorkshopReadyNotification({ contactEmail, contactName, orgName, workshopName, sessionNumber, participantCount, ficheList }: { contactEmail: string; contactName?: string; orgName?: string; workshopName: string; sessionNumber: number; participantCount: number; ficheList: string; }) {
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Passerelle CAP',
        address: process.env.EMAIL_FROM_ADDRESS || 'noreply@passerelle-cap.fr'
      },
      to: contactEmail,
      subject: `Atelier prêt à démarrer : ${workshopName} - Session ${sessionNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6A8B74;">Atelier prêt à démarrer 🎯</h2>
          
          <p>Bonjour ${contactName || 'cher partenaire'},</p>
          
          <p>Un atelier a atteint le seuil minimum de participants et est maintenant prêt à démarrer.</p>
          
          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Atelier :</strong> ${workshopName}</p>
            <p><strong>Session :</strong> ${sessionNumber}</p>
            <p><strong>Organisation :</strong> ${orgName}</p>
            <p><strong>Nombre de participants :</strong> ${participantCount}</p>
            <p><strong>Fiches concernées :</strong> ${ficheList}</p>
          </div>
          
          <p>Vous avez organisé le démarrage de cet atelier avec les familles inscrites et vos partenaires. Si c'est le cas, allez sur la plateforme, dans votre interface, puis dans l'onglet 'Gestion ateliers', vous trouverez l'atelier 'prêt à démarrer', vous devez cocher l'une des cases correspondantes à la situation de votre stucture (EVS ou communale).</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/ateliers" 
               style="background-color: #6A8B74; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Consulter les ateliers
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.<br>
            FEVES Guadeloupe et Saint-Martin
          </p>
        </div>
      `,
      text: `
        Atelier prêt à démarrer
        
        Bonjour ${contactName || 'cher partenaire'},
        
        Un atelier a atteint le seuil minimum de participants et est maintenant prêt à démarrer.
        
        Atelier : ${workshopName}
        Session : ${sessionNumber}
        Organisation : ${orgName}
        Nombre de participants : ${participantCount}
        Fiches concernées : ${ficheList}
        
       Vous avez organisé le démarrage de cet atelier avec les familles inscrites et vos partenaires. Si c'est le cas, allez sur la plateforme, dans votre interface, puis dans l'onglet 'Gestion ateliers', vous trouverez l'atelier 'prêt à démarrer', vous devez cocher l'une des cases correspondantes à la situation de votre stucture (EVS ou communale).
        
        Lien : ${process.env.FRONTEND_URL || 'http://localhost:5173'}/ateliers
        
        ---
        Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.
        FEVES Guadeloupe et Saint-Martin
      `
    };

    const meta = {
      event: 'workshop_ready',
      workshopName,
      sessionNumber,
      orgName,
      contactEmail
    };

    return await this.deliver(mailOptions, meta);
  }

  /**
   * Send email notification when fiche is returned to emitter
   */
  async sendEmitterReturnNotification({ emitterEmail, emitterName, ficheId, reason }: { emitterEmail: string; emitterName?: string; ficheId: string; reason?: string; }) {
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Passerelle CAP',
        address: process.env.EMAIL_FROM_ADDRESS || 'noreply@passerelle-cap.fr'
      },
      to: emitterEmail,
      subject: 'Fiche CAP renvoyée pour modification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #D9A066;">Fiche CAP renvoyée</h2>
          
          <p>Bonjour ${emitterName || 'cher partenaire'},</p>
          
          <p>Votre fiche CAP a été renvoyée pour modification par l'équipe FEVES.</p>
          
          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Référence :</strong> ${ficheId}</p>
            ${reason ? `<p><strong>Motif :</strong> ${reason}</p>` : ''}
          </div>
          
          <p>Veuillez vous connecter à la plateforme Passerelle CAP pour voir les commentaires et effectuer les modifications nécessaires.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://passerelle-cap.replit.app'}" 
               style="background-color: #D9A066; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Modifier la fiche
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.<br>
            FEVES Guadeloupe et Saint-Martin
          </p>
        </div>
      `,
      text: `
        Fiche CAP renvoyée pour modification
        
        Bonjour ${emitterName || 'cher partenaire'},
        
        Votre fiche CAP a été renvoyée pour modification par l'équipe FEVES.
        
        Référence : ${ficheId}
        ${reason ? `Motif : ${reason}` : ''}
        
        Veuillez vous connecter à la plateforme pour voir les commentaires et effectuer les modifications.
        
        Lien : ${process.env.FRONTEND_URL || 'http://localhost:5173'}
        
        ---
        Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.
        FEVES Guadeloupe et Saint-Martin
      `
    };

    const meta = {
      event: 'emitter_return',
      ficheId,
      emitterEmail,
      emitterName,
      reason
    };

    return await this.deliver(mailOptions, meta);
  }

  /**
   * Send email notification when fiche is submitted to CD
   */
  async sendSubmittedToCdNotification({ cdEmails, emitterName, ficheId, ficheRef }: { cdEmails: string[]; emitterName?: string; ficheId: string; ficheRef: string; }) {
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Passerelle CAP',
        address: process.env.EMAIL_FROM_ADDRESS || 'noreply@passerelle-cap.fr'
      },
      to: cdEmails.join(','),
      subject: 'Nouvelle fiche CAP soumise pour validation',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B4B61;">Nouvelle fiche CAP soumise</h2>
          
          <p>Bonjour,</p>
          
          <p>Une nouvelle fiche CAP a été soumise et attend votre validation.</p>
          
          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Référence :</strong> ${ficheRef}</p>
            <p><strong>Émetteur :</strong> ${emitterName || 'Non spécifié'}</p>
          </div>
          
          <p>Veuillez vous connecter à la plateforme Passerelle CAP pour examiner cette fiche et prendre une décision.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://passerelle-cap.replit.app'}/fiches/${ficheId}" 
               style="background-color: #3B4B61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Examiner la fiche
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.<br>
            FEVES Guadeloupe et Saint-Martin
          </p>
        </div>
      `
    };

    const meta = {
      event: 'submitted_to_cd',
      ficheId,
      ficheRef,
      emitterName,
      cdEmails
    };

    return await this.deliver(mailOptions, meta);
  }

  /**
   * Send email notification when fiche is submitted to FEVES
   */
  async sendSubmittedToFevesNotification({ fevesEmails, emitterName, emitterStructure, ficheId, ficheRef }: { fevesEmails: string[]; emitterName?: string; emitterStructure?: string; ficheId: string; ficheRef: string; }) {
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Passerelle CAP',
        address: process.env.EMAIL_FROM_ADDRESS || 'noreply@passerelle-cap.fr'
      },
      to: fevesEmails.join(','),
      subject: 'Nouvelle fiche CAP à traiter',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6A8B74;">Nouvelle fiche CAP à traiter</h2>
          
          <p>Bonjour,</p>
          
          <p>Une nouvelle fiche CAP a été soumise et vous est maintenant transmise pour traitement.</p>
          
          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Référence :</strong> ${ficheRef}</p>
            <p><strong>Émetteur :</strong> ${emitterName || 'Non spécifié'}</p>
            ${emitterStructure ? `<p><strong>Structure :</strong> ${emitterStructure}</p>` : ''}
          </div>
          
          <p>Veuillez vous connecter à la plateforme pour examiner cette fiche et procéder à l'assignation EVS.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://passerelle-cap.replit.app'}/fiches/${ficheId}" 
               style="background-color: #6A8B74; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Traiter la fiche
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.<br>
            FEVES Guadeloupe et Saint-Martin
          </p>
        </div>
      `
    };

    const meta = {
      event: 'submitted_to_feves',
      ficheId,
      ficheRef,
      emitterName,
      emitterStructure,
      fevesEmails
    };

    return await this.deliver(mailOptions, meta);
  }

  /**
   * Send email notification when CD rejects fiche (back to emitter)
   */
  async sendCdRejectionNotification({ emitterEmail, emitterName, ficheId, ficheRef, reason }: { emitterEmail: string; emitterName?: string; ficheId: string; ficheRef: string; reason?: string; }) {
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Passerelle CAP',
        address: process.env.EMAIL_FROM_ADDRESS || 'noreply@passerelle-cap.fr'
      },
      to: emitterEmail,
      subject: 'Fiche CAP renvoyée par le Conseil Départemental',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #D9A066;">Fiche CAP renvoyée - Modifications requises</h2>
          
          <p>Bonjour ${emitterName || 'cher partenaire'},</p>
          
          <p>Le Conseil Départemental a examiné votre fiche CAP et demande des modifications avant validation.</p>
          
          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Référence :</strong> ${ficheRef}</p>
            ${reason ? `<p><strong>Motif :</strong> ${reason}</p>` : ''}
          </div>
          
          <p>Veuillez vous connecter à la plateforme pour voir les commentaires du CD et effectuer les modifications demandées.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://passerelle-cap.replit.app'}/fiches/${ficheId}" 
               style="background-color: #D9A066; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Modifier la fiche
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.<br>
            Conseil Départemental
          </p>
        </div>
      `
    };

    const meta = {
      event: 'cd_rejection',
      ficheId,
      ficheRef,
      emitterEmail,
      emitterName,
      reason
    };

    return await this.deliver(mailOptions, meta);
  }

  /**
   * Send email notification when FEVES (RELATIONS_EVS) rejects fiche (back to emitter)
   */
  async sendFevesRejectionNotification({ emitterEmail, emitterName, ficheId, ficheRef, reason }: { emitterEmail: string; emitterName?: string; ficheId: string; ficheRef: string; reason?: string; }) {
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Passerelle CAP',
        address: process.env.EMAIL_FROM_ADDRESS || 'noreply@passerelle-cap.fr'
      },
      to: emitterEmail,
      subject: `Fiche ${ficheRef} - Corrections requises`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #D9A066;">Fiche CAP renvoyée - Corrections requises</h2>
          
          <p>Bonjour ${emitterName || 'cher partenaire'},</p>
          
          <p>La FEVES a refusée la fiche CAP et demande des corrections avant de pouvoir la transmettre à une structure EVS/CS.</p>
          
          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Référence :</strong> ${ficheRef}</p>
            ${reason ? `<p><strong>Motif :</strong> ${reason}</p>` : ''}
          </div>
          
          <p>Veuillez vous connecter à la plateforme pour consulter les commentaires et effectuer les modifications demandées.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://passerelle-cap.replit.app'}/fiches/${ficheId}" 
               style="background-color: #D9A066; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Modifier la fiche
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.<br>
            FEVES Guadeloupe et Saint-Martin
          </p>
        </div>
      `
    };

    const meta = {
      event: 'feves_rejection',
      ficheId,
      ficheRef,
      emitterEmail,
      emitterName,
      reason
    };

    return await this.deliver(mailOptions, meta);
  }

  /**
   * Send email notification when EVS accepts assignment
   */
  async sendEvsAcceptanceNotification({ fevesEmails, evsOrgName, ficheId, ficheRef }: { fevesEmails: string[]; evsOrgName?: string; ficheId: string; ficheRef: string; }) {
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Passerelle CAP',
        address: process.env.EMAIL_FROM_ADDRESS || 'noreply@passerelle-cap.fr'
      },
      to: fevesEmails.join(','),
      subject: 'Fiche CAP acceptée par l\'EVS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6A8B74;">Fiche CAP acceptée par l'EVS</h2>
          
          <p>Bonjour,</p>
          
          <p>L'EVS a accepté la prise en charge de la fiche CAP qui qui s'intègre dans l'organisation de leurs ateliers.</p>
          
          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Référence :</strong> ${ficheRef}</p>
            <p><strong>EVS :</strong> ${evsOrgName || 'Non spécifié'}</p>
          </div>
          
          <p>Vous pouvez suivre l'avancement du processus dans la plateforme Passerelle CAP.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://passerelle-cap.replit.app'}/fiches/${ficheId}" 
               style="background-color: #6A8B74; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Voir la fiche
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.<br>
            FEVES Guadeloupe et Saint-Martin
          </p>
        </div>
      `
    };

    const meta = {
      event: 'evs_acceptance',
      ficheId,
      ficheRef,
      evsOrgName,
      fevesEmails
    };

    return await this.deliver(mailOptions, meta);
  }

  /**
   * Send email notification when EVS rejects assignment
   */
  async sendEvsRejectionNotification({ fevesEmails, evsOrgName, ficheId, ficheRef, reason }: { fevesEmails: string[]; evsOrgName?: string; ficheId: string; ficheRef: string; reason?: string; }) {
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Passerelle CAP',
        address: process.env.EMAIL_FROM_ADDRESS || 'noreply@passerelle-cap.fr'
      },
      to: fevesEmails.join(','),
      subject: 'Fiche CAP refusée par l\'EVS - Réassignation nécessaire',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #D9A066;">Fiche CAP refusée par l'EVS</h2>
          
          <p>Bonjour,</p>
          
          <p>L'EVS a refusé la prise en charge de la fiche CAP. Une réassignation est nécessaire.</p>
          
          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Référence :</strong> ${ficheRef}</p>
            <p><strong>EVS :</strong> ${evsOrgName || 'Non spécifié'}</p>
            ${reason ? `<p><strong>Motif :</strong> ${reason}</p>` : ''}
          </div>
          
          <p>Veuillez vous connecter à la plateforme pour réassigner cette fiche à un autre EVS.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://passerelle-cap.replit.app'}/fiches/${ficheId}" 
               style="background-color: #D9A066; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Réassigner la fiche
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.<br>
            FEVES Guadeloupe et Saint-Martin
          </p>
        </div>
      `
    };

    const meta = {
      event: 'evs_rejection',
      ficheId,
      ficheRef,
      evsOrgName,
      fevesEmails,
      reason
    };

    return await this.deliver(mailOptions, meta);
  }

  /**
   * Send email notification when contract is signed (70% payment)
   */
  async sendContractSignedNotification({ fevesEmails, evsOrgName, ficheId, ficheRef, totalAmount }: { fevesEmails: string[]; evsOrgName?: string; ficheId: string; ficheRef: string; totalAmount?: number; }) {
    const formattedAmount = totalAmount ? (totalAmount / 100).toFixed(2) : 'Non spécifié';
    const advanceAmount = totalAmount ? ((totalAmount * 0.7) / 100).toFixed(2) : 'Non calculé';

    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Passerelle CAP',
        address: process.env.EMAIL_FROM_ADDRESS || 'noreply@passerelle-cap.fr'
      },
      to: fevesEmails.join(','),
      subject: 'Contrat CAP signé - Acompte de 70% à verser',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6A8B74;">Contrat CAP signé - Paiement requis</h2>
          
          <p>Bonjour,</p>
          
          <p>Le contrat CAP a été signé et l'activité peut commencer. L'acompte de 70% est maintenant dû.</p>
          
          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Référence :</strong> ${ficheRef}</p>
            <p><strong>EVS :</strong> ${evsOrgName || 'Non spécifié'}</p>
            <p><strong>Montant total :</strong> ${formattedAmount}€</p>
            <p><strong>Acompte (70%) :</strong> ${advanceAmount}€</p>
          </div>
          
          <p>Veuillez procéder au virement de l'acompte et marquer le paiement comme effectué dans la plateforme.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://passerelle-cap.replit.app'}/fiches/${ficheId}" 
               style="background-color: #6A8B74; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Gérer le paiement
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.<br>
            FEVES Guadeloupe et Saint-Martin
          </p>
        </div>
      `
    };

    const meta = {
      event: 'contract_signed',
      ficheId,
      ficheRef,
      evsOrgName,
      totalAmount,
      fevesEmails
    };

    return await this.deliver(mailOptions, meta);
  }

  /**
   * Send email notification when activity is completed (field check needed)
   */
  async sendActivityCompletedNotification({ fevesEmails, evsOrgName, ficheId, ficheRef }: { fevesEmails: string[]; evsOrgName?: string; ficheId: string; ficheRef: string; }) {
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Passerelle CAP',
        address: process.env.EMAIL_FROM_ADDRESS || 'noreply@passerelle-cap.fr'
      },
      to: fevesEmails.join(','),
      subject: 'Activité CAP terminée - Contrôle terrain requis',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B4B61;">Activité CAP terminée</h2>
          
          <p>Bonjour,</p>
          
          <p>L'EVS a déclaré l'activité CAP comme terminée. Un contrôle terrain doit maintenant être programmé.</p>
          
          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Référence :</strong> ${ficheRef}</p>
            <p><strong>EVS :</strong> ${evsOrgName || 'Non spécifié'}</p>
          </div>
          
          <p>Veuillez programmer le contrôle terrain et mettre à jour le statut dans la plateforme.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://passerelle-cap.replit.app'}/fiches/${ficheId}" 
               style="background-color: #3B4B61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Programmer le contrôle
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.<br>
            FEVES Guadeloupe et Saint-Martin
          </p>
        </div>
      `
    };

    const meta = {
      event: 'activity_completed',
      ficheId,
      ficheRef,
      evsOrgName,
      fevesEmails
    };

    return await this.deliver(mailOptions, meta);
  }

  /**
   * Send email notification when field check is completed
   */
  async sendFieldCheckCompletedNotification({ fevesEmails, evsOrgName, ficheId, ficheRef, totalAmount }: { fevesEmails: string[]; evsOrgName?: string; ficheId: string; ficheRef: string; totalAmount?: number; }) {
    const formattedAmount = totalAmount ? (totalAmount / 100).toFixed(2) : 'Non spécifié';
    const remainingAmount = totalAmount ? ((totalAmount * 0.3) / 100).toFixed(2) : 'Non calculé';
    
    // Email to RELATIONS_EVS only
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Passerelle CAP',
        address: process.env.EMAIL_FROM_ADDRESS || 'noreply@passerelle-cap.fr'
      },
      to: fevesEmails.join(','),
      subject: 'Contrôle terrain validé - Solde de 30% à verser',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6A8B74;">Contrôle terrain validé - Paiement final</h2>
          
          <p>Bonjour,</p>
          
          <p>Le contrôle terrain a été effectué et validé. Le solde de 30% peut maintenant être versé.</p>
          
          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Référence :</strong> ${ficheRef}</p>
            <p><strong>EVS :</strong> ${evsOrgName || 'Non spécifié'}</p>
            <p><strong>Montant total :</strong> ${formattedAmount}€</p>
            <p><strong>Solde (30%) :</strong> ${remainingAmount}€</p>
          </div>
          
          <p>Veuillez procéder au virement du solde et clôturer la fiche dans la plateforme.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://passerelle-cap.replit.app'}/fiches/${ficheId}" 
               style="background-color: #6A8B74; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Finaliser le paiement
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.<br>
            FEVES Guadeloupe et Saint-Martin
          </p>
        </div>
      `
    };

    const meta = {
      event: 'field_check_completed',
      ficheId,
      ficheRef,
      evsOrgName,
      fevesEmails
    };

    return await this.deliver(mailOptions, meta);
  }

  /**
   * Test de la connexion SMTP
   */
  async testConnection(): Promise<boolean> {
    try {
      // SendGrid doesn't have a verify method, so we'll just test if the API key is configured
      if (process.env.SENDGRID_API_KEY) {
        console.log('✅ SendGrid API key configured successfully');
        return true;
      } else {
        console.error('❌ SendGrid API key not found');
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur de configuration SendGrid:', error);
      return false;
    }
  }

  /**
   * Envoi d'un email de test simple
   */
  async sendTestEmail(to?: string): Promise<void> {
    const testEmail = to || 'admin@passerelle-cap.com';
    
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Passerelle CAP',
        address: process.env.EMAIL_FROM_ADDRESS || 'noreply@passerelle-cap.fr'
      },
      to: testEmail,
      subject: '🧪 Test Configuration SMTP - Passerelle CAP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B4B61;">Test Configuration SMTP</h2>
          <p>Félicitations ! Votre configuration SMTP Breavo fonctionne parfaitement.</p>
          <p>Le système de notifications automatiques de <strong>Passerelle CAP</strong> est maintenant opérationnel.</p>
          <div style="background: #F5F6F7; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #6A8B74; margin-top: 0;">Notifications configurées :</h3>
            <ul>
              <li>Soumission au CD</li>
              <li>Validation par le CD</li>
              <li>Refus par le CD</li>
              <li>Assignation EVS</li>
              <li>Acceptation/Refus EVS</li>
              <li>Signature contrat</li>
              <li>Activité terminée</li>
              <li>Contrôle terrain validé</li>
            </ul>
          </div>
          <p style="color: #8C4A4A;"><em>Email envoyé automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</em></p>
        </div>
      `,
      text: `Test Configuration SMTP - Passerelle CAP

Félicitations ! Votre configuration SMTP Breavo fonctionne parfaitement.
Le système de notifications automatiques de Passerelle CAP est maintenant opérationnel.

Notifications configurées :
- Soumission au CD
- Validation par le CD
- Refus par le CD
- Assignation EVS
- Acceptation/Refus EVS
- Signature contrat
- Activité terminée
- Contrôle terrain validé

Email envoyé automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`
    };

    const meta = {
      event: 'test_email',
      testEmail
    };

    await this.deliver(mailOptions, meta);
  }

  /**
   * Send notification when a workshop activity is completed
   */
  async sendWorkshopActivityCompletedNotification({ fevesEmails, workshopName, sessionNumber, evsName, participantCount, ficheList, sessionId }: {
    fevesEmails: string[];
    workshopName: string;
    sessionNumber: number;
    evsName: string;
    participantCount: number;
    ficheList: string;
    sessionId: string;
  }) {
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Passerelle CAP',
        address: process.env.EMAIL_FROM_ADDRESS || 'noreply@passerelle-cap.fr'
      },
      to: fevesEmails,
      subject: `Atelier terminé - ${workshopName} (Session ${sessionNumber})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B4B61;">Atelier terminé - Contrôle requis</h2>
          
          <p>Bonjour,</p>
          
          <p>L'atelier <strong>${workshopName}</strong> session <strong>${sessionNumber}</strong> à <strong>${evsName}</strong> est terminé et nécessite un contrôle.</p>
          
          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #6A8B74; margin-top: 0;">Détails de la session</h3>
            <p><strong>Atelier :</strong> ${workshopName}</p>
            <p><strong>Numéro de session :</strong> ${sessionNumber}</p>
            <p><strong>Organisation :</strong> ${evsName}</p>
            <p><strong>Nombre de participants :</strong> ${participantCount}</p>
            <p><strong>Fiches concernées :</strong> ${ficheList}</p>
          </div>
          
          <p>Veuillez vous connecter à la plateforme pour effectuer le contrôle terrain.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/ateliers" 
               style="background-color: #6A8B74; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Accéder aux ateliers
            </a>
          </div>
        </div>
      `,
      text: `Atelier terminé - Contrôle requis

L'atelier ${workshopName} session ${sessionNumber} à ${evsName} est terminé et nécessite un contrôle.

Détails de la session :
- Atelier : ${workshopName}
- Numéro de session : ${sessionNumber}
- Organisation : ${evsName}
- Nombre de participants : ${participantCount}
- Fiches concernées : ${ficheList}

Veuillez vous connecter à la plateforme pour effectuer le contrôle terrain.`
    };

    const meta = {
      event: 'workshop_activity_completed',
      sessionId,
      workshopName,
      sessionNumber,
      evsName
    };

    await this.deliver(mailOptions, meta);
  }

  /**
   * Send notification when EVS/CS contract is signed - 70% subsidy to be released
   */
  async sendWorkshopContractEvsSignedNotification({ fevesEmails, workshopName, sessionNumber, evsName, sessionId }: {
    fevesEmails: string[];
    workshopName: string;
    sessionNumber: number;
    evsName: string;
    sessionId: string;
  }) {
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Passerelle CAP',
        address: process.env.EMAIL_FROM_ADDRESS || 'noreply@passerelle-cap.fr'
      },
      to: fevesEmails.join(','),
      subject: `Contrat EVS/CS signé - Déblocage subvention 70% : ${workshopName} Session ${sessionNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6A8B74;">💰 Contrat EVS/CS signé - Subvention à débloquer</h2>
          
          <p>Bonjour,</p>
          
          <p>Le contrat EVS/CS pour un atelier a été signé. Vous devez maintenant débloquer <strong>70% de la subvention</strong> pour cet atelier.</p>
          
          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #3B4B61; margin-top: 0;">Détails de l'atelier</h3>
            <p><strong>Atelier :</strong> ${workshopName}</p>
            <p><strong>Session :</strong> ${sessionNumber}</p>
            <p><strong>Organisation EVS/CS :</strong> ${evsName}</p>
            <p style="color: #6A8B74; font-weight: bold; font-size: 1.1em; margin-top: 15px;">💵 Action requise : Débloquer 70% de la subvention</p>
          </div>
          
          <p>Le contrat a été validé, l'atelier peut maintenant démarrer.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/ateliers" 
               style="background-color: #6A8B74; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Gérer les ateliers
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.<br>
            FEVES Guadeloupe et Saint-Martin
          </p>
        </div>
      `,
      text: `
        Contrat EVS/CS signé - Subvention à débloquer
        
        Le contrat EVS/CS pour un atelier a été signé. Vous devez maintenant débloquer 70% de la subvention pour cet atelier.
        
        Détails de l'atelier :
        - Atelier : ${workshopName}
        - Session : ${sessionNumber}
        - Organisation EVS/CS : ${evsName}
        
        Action requise : Débloquer 70% de la subvention
        
        Le contrat a été validé, l'atelier peut maintenant démarrer.
        
        Lien : ${process.env.FRONTEND_URL || 'http://localhost:5173'}/ateliers
        
        ---
        Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.
        FEVES Guadeloupe et Saint-Martin
      `
    };

    const meta = {
      event: 'workshop_contract_evs_signed',
      sessionId,
      workshopName,
      sessionNumber,
      evsName
    };

    await this.deliver(mailOptions, meta);
  }

  /**
   * Send notification when Commune contract is signed - simple start notification
   */
  async sendWorkshopContractCommuneSignedNotification({ fevesEmails, workshopName, sessionNumber, evsName, sessionId }: {
    fevesEmails: string[];
    workshopName: string;
    sessionNumber: number;
    evsName: string;
    sessionId: string;
  }) {
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Passerelle CAP',
        address: process.env.EMAIL_FROM_ADDRESS || 'noreply@passerelle-cap.fr'
      },
      to: fevesEmails.join(','),
      subject: `Contrat Commune signé - Atelier prêt : ${workshopName} Session ${sessionNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B4B61;">✅ Contrat Commune signé - Atelier prêt à démarrer</h2>
          
          <p>Bonjour,</p>
          
          <p>Le contrat avec la commune pour un atelier a été signé. L'atelier est maintenant prêt à démarrer.</p>
          
          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #3B4B61; margin-top: 0;">Détails de l'atelier</h3>
            <p><strong>Atelier :</strong> ${workshopName}</p>
            <p><strong>Session :</strong> ${sessionNumber}</p>
            <p><strong>Organisation :</strong> ${evsName}</p>
            <p style="color: #3B4B61; font-weight: bold; margin-top: 15px;">ℹ️ Contrat communal - Pas de subvention associée</p>
          </div>
          
          <p>Le contrat a été validé, l'atelier peut maintenant démarrer.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/ateliers" 
               style="background-color: #3B4B61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Consulter les ateliers
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px;">
            Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.<br>
            FEVES Guadeloupe et Saint-Martin
          </p>
        </div>
      `,
      text: `
        Contrat Commune signé - Atelier prêt à démarrer
        
        Le contrat avec la commune pour un atelier a été signé. L'atelier est maintenant prêt à démarrer.
        
        Détails de l'atelier :
        - Atelier : ${workshopName}
        - Session : ${sessionNumber}
        - Organisation : ${evsName}
        
        Note : Contrat communal - Pas de subvention associée
        
        Le contrat a été validé, l'atelier peut maintenant démarrer.
        
        Lien : ${process.env.FRONTEND_URL || 'http://localhost:5173'}/ateliers
        
        ---
        Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.
        FEVES Guadeloupe et Saint-Martin
      `
    };

    const meta = {
      event: 'workshop_contract_commune_signed',
      sessionId,
      workshopName,
      sessionNumber,
      evsName
    };

    await this.deliver(mailOptions, meta);
  }

  /**
   * Send notification when all workshops for a fiche are completed
   */
  async sendFicheAllWorkshopsCompletedNotification({ emails, ficheRef, ficheId }: {
    emails: string[];
    ficheRef: string;
    ficheId: string;
  }) {
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Passerelle CAP',
        address: process.env.EMAIL_FROM_ADDRESS || 'noreply@passerelle-cap.fr'
      },
      to: emails,
      subject: `Fiche clôturée - ${ficheRef}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B4B61;">Fiche clôturée</h2>
          
          <p>Bonjour,</p>
          
          <p>La fiche <strong>${ficheRef}</strong> a été clôturée, tous les ateliers sont réalisés.</p>
          
          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #6A8B74; margin-top: 0;">Détails</h3>
            <p><strong>Référence :</strong> ${ficheRef}</p>
            <p><strong>Statut :</strong> CLÔTURÉE</p>
          </div>
          
          <p>Vous pouvez consulter les détails de la fiche sur la plateforme.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/fiches/${ficheId}" 
               style="background-color: #6A8B74; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Voir la fiche
            </a>
          </div>
          
          <p style="color: #8C4A4A;"><em>Email envoyé automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</em></p>
        </div>
      `,
      text: `Fiche clôturée - ${ficheRef}

La fiche ${ficheRef} a été clôturée, tous les ateliers sont réalisés.

Détails :
- Référence : ${ficheRef}
- Statut : CLÔTURÉE

Vous pouvez consulter les détails de la fiche sur la plateforme.

Email envoyé automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`
    };

    const meta = {
      event: 'fiche_all_workshops_completed',
      ficheRef,
      ficheId
    };

    await this.deliver(mailOptions, meta);
  }
}

// Export singleton instance
export default new EmailService();