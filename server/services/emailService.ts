import nodemailer from 'nodemailer';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Create transporter with O2Switch configuration - try standard port 587 with STARTTLS
    this.transporter = nodemailer.createTransport({
      host: 'mail.fevesguadeloupeetsaintmartin.org',
      port: 587, // Standard submission port with STARTTLS
      secure: false, // Start with no encryption, then upgrade
      requireTLS: true, // Require STARTTLS encryption
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      },
      // Extended timeouts for slower servers
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
      debug: true,
      logger: true
    });

    // Verify connection configuration on startup
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('SMTP Configuration Error:', error);
      } else {
        console.log('SMTP Server ready to send emails');
      }
    });
  }

  /**
   * Send email notification for EVS assignment
   */
  async sendEvsAssignmentNotification({ contactEmail, contactName, orgName, ficheId }: { contactEmail: string; contactName?: string; orgName?: string; ficheId: string; }) {
    const mailOptions: nodemailer.SendMailOptions = {
      from: {
        name: 'Passerelle CAP - FEVES',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME || ''
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
            <p><strong>Référence :</strong> ${ficheId}</p>
          </div>
          
          <p>Veuillez vous connecter à la plateforme Passerelle CAP pour consulter les détails de cette fiche et commencer l'accompagnement.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://passerelle-cap.replit.app'}" 
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
        Référence : ${ficheId}
        
        Veuillez vous connecter à la plateforme Passerelle CAP pour consulter les détails.
        
        Lien : ${process.env.FRONTEND_URL || 'https://passerelle-cap.replit.app'}
        
        ---
        Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.
        FEVES Guadeloupe et Saint-Martin
      `
    };

      try {
        const result = await this.transporter.sendMail(mailOptions);
        console.log('EVS Assignment email sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };
      } catch (error: any) {
        console.error('Failed to send EVS Assignment email:', error);
        return { success: false, error: error.message };
      }
  }

  /**
   * Send email notification when fiche is returned to emitter
   */
  async sendEmitterReturnNotification({ emitterEmail, emitterName, ficheId, reason }: { emitterEmail: string; emitterName?: string; ficheId: string; reason?: string; }) {
    const mailOptions: nodemailer.SendMailOptions = {
      from: {
        name: 'Passerelle CAP - FEVES',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME || ''
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
        
        Lien : ${process.env.FRONTEND_URL || 'https://passerelle-cap.replit.app'}
        
        ---
        Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.
        FEVES Guadeloupe et Saint-Martin
      `
    };

      try {
        const result = await this.transporter.sendMail(mailOptions);
        console.log('Emitter Return email sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };
      } catch (error: any) {
        console.error('Failed to send Emitter Return email:', error);
        return { success: false, error: error.message };
      }
    }

  /**
   * Send email notification when fiche is submitted to CD
   */
  async sendSubmittedToCdNotification({ cdEmails, emitterName, ficheId, ficheRef }: { cdEmails: string[]; emitterName?: string; ficheId: string; ficheRef: string; }) {
    const mailOptions: nodemailer.SendMailOptions = {
      from: {
        name: 'Passerelle CAP - FEVES',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME || ''
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

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('CD submission notification sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      console.error('Failed to send CD submission notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email notification when fiche is submitted to FEVES
   */
  async sendSubmittedToFevesNotification({ fevesEmails, emitterName, ficheId, ficheRef }: { fevesEmails: string[]; emitterName?: string; ficheId: string; ficheRef: string; }) {
    const mailOptions: nodemailer.SendMailOptions = {
      from: {
        name: 'Passerelle CAP - CD',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME || ''
      },
      to: fevesEmails.join(','),
      subject: 'Fiche CAP validée par le CD - À traiter',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6A8B74;">Fiche CAP validée - À traiter</h2>
          
          <p>Bonjour,</p>
          
          <p>Le Conseil Départemental a validé une fiche CAP qui vous est maintenant transmise pour traitement.</p>
          
          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Référence :</strong> ${ficheRef}</p>
            <p><strong>Émetteur :</strong> ${emitterName || 'Non spécifié'}</p>
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

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('FEVES submission notification sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      console.error('Failed to send FEVES submission notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email notification when CD rejects fiche (back to emitter)
   */
  async sendCdRejectionNotification({ emitterEmail, emitterName, ficheId, ficheRef, reason }: { emitterEmail: string; emitterName?: string; ficheId: string; ficheRef: string; reason?: string; }) {
    const mailOptions: nodemailer.SendMailOptions = {
      from: {
        name: 'Passerelle CAP - CD',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME || ''
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

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('CD rejection notification sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      console.error('Failed to send CD rejection notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email notification when EVS accepts assignment
   */
  async sendEvsAcceptanceNotification({ fevesEmails, evsOrgName, ficheId, ficheRef }: { fevesEmails: string[]; evsOrgName?: string; ficheId: string; ficheRef: string; }) {
    const mailOptions: nodemailer.SendMailOptions = {
      from: {
        name: 'Passerelle CAP - EVS',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME || ''
      },
      to: fevesEmails.join(','),
      subject: 'Fiche CAP acceptée par l\'EVS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6A8B74;">Fiche CAP acceptée par l'EVS</h2>
          
          <p>Bonjour,</p>
          
          <p>L'EVS a accepté la prise en charge de la fiche CAP et peut maintenant procéder à la signature du contrat.</p>
          
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

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('EVS acceptance notification sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      console.error('Failed to send EVS acceptance notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email notification when EVS rejects assignment
   */
  async sendEvsRejectionNotification({ fevesEmails, evsOrgName, ficheId, ficheRef, reason }: { fevesEmails: string[]; evsOrgName?: string; ficheId: string; ficheRef: string; reason?: string; }) {
    const mailOptions: nodemailer.SendMailOptions = {
      from: {
        name: 'Passerelle CAP - EVS',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME || ''
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

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('EVS rejection notification sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      console.error('Failed to send EVS rejection notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email notification when contract is signed (70% payment)
   */
  async sendContractSignedNotification({ cdEmails, evsOrgName, ficheId, ficheRef, totalAmount }: { cdEmails: string[]; evsOrgName?: string; ficheId: string; ficheRef: string; totalAmount?: number; }) {
    const formattedAmount = totalAmount ? (totalAmount / 100).toFixed(2) : 'Non spécifié';
    const advanceAmount = totalAmount ? ((totalAmount * 0.7) / 100).toFixed(2) : 'Non calculé';

    const mailOptions: nodemailer.SendMailOptions = {
      from: {
        name: 'Passerelle CAP - EVS',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME || ''
      },
      to: cdEmails.join(','),
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

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Contract signed notification sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      console.error('Failed to send contract signed notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email notification when activity is completed (field check needed)
   */
  async sendActivityCompletedNotification({ fevesEmails, evsOrgName, ficheId, ficheRef }: { fevesEmails: string[]; evsOrgName?: string; ficheId: string; ficheRef: string; }) {
    const mailOptions: nodemailer.SendMailOptions = {
      from: {
        name: 'Passerelle CAP - EVS',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME || ''
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

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Activity completed notification sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      console.error('Failed to send activity completed notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email notification when field check is completed
   */
  async sendFieldCheckCompletedNotification({ cdEmails, fevesEmails, evsOrgName, ficheId, ficheRef, totalAmount }: { cdEmails: string[]; fevesEmails: string[]; evsOrgName?: string; ficheId: string; ficheRef: string; totalAmount?: number; }) {
    const formattedAmount = totalAmount ? (totalAmount / 100).toFixed(2) : 'Non spécifié';
    const remainingAmount = totalAmount ? ((totalAmount * 0.3) / 100).toFixed(2) : 'Non calculé';
    
    // Email to CD for final payment
    const cdMailOptions: nodemailer.SendMailOptions = {
      from: {
        name: 'Passerelle CAP - FEVES',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME || ''
      },
      to: cdEmails.join(','),
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

    // Email to FEVES for information
    const fevesMailOptions: nodemailer.SendMailOptions = {
      from: {
        name: 'Passerelle CAP - FEVES',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME || ''
      },
      to: fevesEmails.join(','),
      subject: 'Contrôle terrain validé - Fiche en attente de clôture',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B4B61;">Contrôle terrain validé</h2>
          
          <p>Bonjour,</p>
          
          <p>Le contrôle terrain a été effectué et validé. La fiche attend maintenant le paiement final du CD pour être clôturée.</p>
          
          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Référence :</strong> ${ficheRef}</p>
            <p><strong>EVS :</strong> ${evsOrgName || 'Non spécifié'}</p>
          </div>
          
          <p>Vous pouvez suivre l'avancement de la clôture dans la plateforme.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://passerelle-cap.replit.app'}/fiches/${ficheId}" 
               style="background-color: #3B4B61; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Suivre la fiche
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

    try {
      // Send to CD first
      const cdResult = await this.transporter.sendMail(cdMailOptions);
      console.log('Field check completed notification sent to CD:', cdResult.messageId);

      // Send to FEVES
      const fevesResult = await this.transporter.sendMail(fevesMailOptions);
      console.log('Field check completed notification sent to FEVES:', fevesResult.messageId);

      return { 
        success: true, 
        messageId: { cd: cdResult.messageId, feves: fevesResult.messageId }
      };
    } catch (error: any) {
      console.error('Failed to send field check completed notifications:', error);
      return { success: false, error: error.message };
    }
  }
  }

// Export singleton instance
export default new EmailService();