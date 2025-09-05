// Test du système d'email avec templates personnalisés et liens sécurisés
// Exécuter avec: node test-email-system.js

async function testEmailSystem() {
  const testData = {
    to: 'test@example.com',
    project: {
      id: 'test-project-id',
      name: 'Test Event',
      email_enabled: true
    },
    imageUrl: 'https://example.com/test-image.jpg',
    participantData: {
      name: 'Jean Dupont',
      email: 'test@example.com',
      phone: '+33123456789',
      firstname: 'Jean',
      lastname: 'Dupont'
    },
    sessionId: 'test-session-id'
  };

  try {
    console.log('🚀 Test du système d\'email...');
    
    const response = await fetch('http://localhost:3000/api/send-photo-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Email envoyé avec succès:', result);
      
      console.log('\n📧 Données envoyées:');
      console.log('- Destinataire:', testData.to);
      console.log('- Projet:', testData.project.name);
      console.log('- Participant:', testData.participantData.name);
      console.log('- Session ID:', testData.sessionId);
      
    } else {
      const error = await response.json();
      console.error('❌ Erreur:', error);
    }
    
  } catch (error) {
    console.error('❌ Erreur réseau:', error);
  }
}

// Test de génération de lien sécurisé
function testSecureLink() {
  console.log('\n🔗 Test de génération de lien sécurisé...');
  
  const { generateSecureImageLink } = require('./lib/imageLinks.js');
  
  const secureLink = generateSecureImageLink({
    imageUrl: 'https://example.com/test-image.jpg',
    sessionId: 'test-session-id',
    photoId: 'test-photo-id',
    projectId: 'test-project-id'
  });
  
  console.log('✅ Lien sécurisé généré:', secureLink);
  
  // Décoder le token pour vérifier
  const url = new URL(secureLink);
  const token = url.searchParams.get('token');
  const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
  console.log('📋 Token décodé:', decoded);
}

console.log('='.repeat(50));
console.log('🧪 TEST DU SYSTÈME EMAIL PHOTOBOOTH');
console.log('='.repeat(50));

testSecureLink();

// Décommenter pour tester l'envoi réel (nécessite un serveur en fonctionnement)
// testEmailSystem();

console.log('\n✨ Tests terminés !');
