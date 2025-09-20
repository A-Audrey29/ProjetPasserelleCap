import sgMail from '@sendgrid/mail';

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function testSendGrid() {
  console.log('🧪 Testing SendGrid configuration...');
  
  const msg = {
    from: {
      name: 'Passerelle CAP - Test',
      email: 'noreply@passerellecap.fr'
    },
    to: 'test@example.com', // This will show in SendGrid Activity but won't be delivered
    subject: '🧪 Test Configuration SendGrid - Passerelle CAP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B4B61;">Test Configuration SendGrid</h2>
        <p>✅ Félicitations ! Votre configuration SendGrid fonctionne parfaitement.</p>
        <p>Le système de notifications automatiques de <strong>Passerelle CAP</strong> est maintenant opérationnel.</p>
        <div style="background: #F5F6F7; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #6A8B74; margin-top: 0;">Notifications configurées :</h3>
          <ul>
            <li>✉️ Soumission au CD</li>
            <li>✅ Validation par le CD</li>
            <li>❌ Refus par le CD</li>
            <li>👥 Assignation EVS</li>
            <li>✅❌ Acceptation/Refus EVS</li>
            <li>📋 Signature contrat</li>
            <li>🎯 Activité terminée</li>
            <li>✔️ Contrôle terrain validé</li>
          </ul>
        </div>
        <p style="color: #8C4A4A;"><em>Email de test envoyé le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</em></p>
      </div>
    `,
    text: `Test Configuration SendGrid - Passerelle CAP

✅ Félicitations ! Votre configuration SendGrid fonctionne parfaitement.
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

Email de test envoyé le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`
  };

  try {
    const result = await sgMail.send(msg);
    console.log('✅ Email de test envoyé avec succès !');
    console.log('📊 Status:', result[0].statusCode);
    console.log('🆔 Message ID:', result[0].headers['x-message-id']);
    console.log('🎯 Consultez votre tableau de bord SendGrid pour voir l\'activité');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du test:', error.message);
    if (error.response) {
      console.error('📄 Détails:', error.response.body);
    }
    return false;
  }
}

// Run the test
testSendGrid().then(success => {
  if (success) {
    console.log('\n🎉 CONCLUSION: Configuration SendGrid opérationnelle !');
    console.log('📧 Le système de notifications automatiques est prêt.');
  } else {
    console.log('\n❌ CONCLUSION: Problème de configuration détecté.');
  }
  process.exit(success ? 0 : 1);
});