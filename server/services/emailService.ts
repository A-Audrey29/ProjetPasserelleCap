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
  }

// Export singleton instance
export default new EmailService();