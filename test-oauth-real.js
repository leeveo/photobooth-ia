// Test direct OAuth après configuration Google Cloud Console
// Copiez ce code dans la console du navigateur sur https://photobooth.waibooth.app

console.log('🧪 Test OAuth après configuration Google Cloud Console...');

// Test 1: Tentative d'authentification OAuth directe
const clientId = '861872459075-0rddreeofg3us5falu78gpfp5qu5qr0q.apps.googleusercontent.com';
const redirectUri = 'https://photobooth.waibooth.app/photobooth-ia/admin/auth/callback';
const scope = 'openid email profile';

// Construction de l'URL OAuth
const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;

console.log('🔗 URL OAuth complète:', oauthUrl);

// Test 2: Simuler ce qui se passe quand on clique sur "Se connecter avec Google"
console.log('🎯 Test simulation connexion...');
console.log('1. Cliquez sur le bouton "Se connecter avec Google" sur la page');
console.log('2. Ou ouvrez cette URL dans un nouvel onglet:', oauthUrl);

// Test 3: Vérifier les cookies/sessions actuels
console.log('🔍 Sessions actuelles:');
console.log('  - LocalStorage admin_session:', localStorage.getItem('admin_session'));
console.log('  - SessionStorage admin_session:', sessionStorage.getItem('admin_session'));
console.log('  - Cookies:', document.cookie);

// Test 4: Tester l'API en direct avec un faux code valide
setTimeout(() => {
  console.log('🧪 Test API avec code format Google valide...');
  fetch('/api/auth/google-token-exchange', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: '4/0AeanS0wRS7KqJIoeqwK5x8WrSld7gl6Q5L8GRWp7_Qbv7Rh8eHvgNJU1r_rLcKd8rVaOA'
    })
  })
  .then(async response => {
    console.log('📡 Test API - Status:', response.status);
    console.log('📡 Test API - OK:', response.ok);
    const responseText = await response.text();
    console.log('📡 Test API - Response:', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('📡 Test API - JSON:', responseJson);
    } catch (e) {
      console.log('📡 Test API - Not JSON, text response');
    }
  })
  .catch(error => {
    console.error('❌ Test API - Erreur:', error);
  });
}, 1000);

console.log('');
console.log('📋 INSTRUCTIONS:');
console.log('1. Essayez de vous connecter avec Google normalement');
console.log('2. Regardez les logs de la console pendant la connexion');
console.log('3. Si ça échoue, copiez-collez l\'erreur exacte');
console.log('');
console.log('🎯 URL de test direct:', oauthUrl);