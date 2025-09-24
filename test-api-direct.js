// Test direct de l'API google-token-exchange en production
// Copiez ce code dans la console du navigateur sur https://photobooth.waibooth.app

console.log('🧪 Test direct de l\'API google-token-exchange...');

// Test 1: Vérifier si l'API route existe
fetch('/api/auth/google-token-exchange', {
  method: 'GET',
})
.then(response => {
  console.log('📡 Test GET - Status:', response.status);
  console.log('📡 Test GET - OK:', response.ok);
  console.log('📡 Test GET - Headers:', Object.fromEntries(response.headers));
  return response.text();
})
.then(text => {
  console.log('📡 Test GET - Response:', text);
})
.catch(error => {
  console.error('❌ Test GET - Erreur:', error);
});

// Test 2: Simuler un appel POST avec un faux code
setTimeout(() => {
  console.log('🧪 Test POST avec faux code...');
  fetch('/api/auth/google-token-exchange', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: 'fake_code_for_testing'
    })
  })
  .then(response => {
    console.log('📡 Test POST - Status:', response.status);
    console.log('📡 Test POST - OK:', response.ok);
    console.log('📡 Test POST - Headers:', Object.fromEntries(response.headers));
    return response.text();
  })
  .then(text => {
    console.log('📡 Test POST - Response:', text);
  })
  .catch(error => {
    console.error('❌ Test POST - Erreur:', error);
  });
}, 2000);

// Test 3: Vérifier les variables d'environnement côté client
console.log('🔍 Variables d\'environnement côté client:');
console.log('- NEXT_PUBLIC_GOOGLE_CLIENT_ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);