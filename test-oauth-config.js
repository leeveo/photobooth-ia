// Vérification de la configuration OAuth Google actuelle
// Copiez ce code dans la console du navigateur

console.log('🔍 Vérification de la configuration OAuth Google...');

// 1. Vérifier les informations du client OAuth
const clientId = '861872459075-0rddreeofg3us5falu78gpfp5qu5qr0q.apps.googleusercontent.com';
const redirectUri = 'https://photobooth.waibooth.app/photobooth-ia/admin/auth/callback';
const domain = window.location.hostname;

console.log('📋 Configuration actuelle:');
console.log('  - Client ID:', clientId);
console.log('  - Redirect URI:', redirectUri);
console.log('  - Domaine actuel:', domain);
console.log('  - URL complète:', window.location.href);

// 2. Tester l'URL OAuth directement
const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid+email+profile&access_type=offline&prompt=consent`;
console.log('🔗 URL OAuth générée:', oauthUrl);

// 3. Vérifier si on peut accéder aux APIs Google
console.log('🧪 Test de connectivité aux APIs Google...');

// Test Google Discovery
fetch('https://accounts.google.com/.well-known/openid-configuration')
  .then(response => response.json())
  .then(data => {
    console.log('✅ Google Discovery fonctionne');
    console.log('  - Authorization endpoint:', data.authorization_endpoint);
    console.log('  - Token endpoint:', data.token_endpoint);
  })
  .catch(error => console.error('❌ Google Discovery erreur:', error));

// 4. Vérifier les headers CORS
fetch('https://oauth2.googleapis.com/token', { method: 'OPTIONS' })
  .then(response => {
    console.log('✅ CORS OAuth2 API:');
    console.log('  - Status:', response.status);
    console.log('  - Headers:', Object.fromEntries(response.headers));
  })
  .catch(error => console.error('❌ CORS OAuth2 API erreur:', error));

console.log('⚠️  ACTIONS REQUISES:');
console.log('1. Vérifier la configuration dans Google Cloud Console');
console.log('2. Ajouter photobooth.waibooth.app aux domaines autorisés');
console.log('3. Configurer l\'écran de consentement OAuth');
console.log('4. Publier l\'application ou la soumettre pour vérification');