// Diagnostic avancé du callback OAuth
// Ajoutez ce code au début du callback page.tsx temporairement

console.log('🔬 DIAGNOSTIC CALLBACK AVANCÉ');
console.log('1. URL complète:', window.location.href);
console.log('2. Search params:', window.location.search);
console.log('3. Hash:', window.location.hash);

// Analyser les paramètres URL
const urlParams = new URLSearchParams(window.location.search);
console.log('4. Paramètres détaillés:');
urlParams.forEach((value, key) => {
  console.log(`   ${key}: ${value}`);
});

// Vérifier les différents types d'erreurs possibles
if (urlParams.has('error')) {
  console.log('❌ ERREUR OAuth détectée:', urlParams.get('error'));
  console.log('❌ Description:', urlParams.get('error_description'));
  console.log('❌ URI:', urlParams.get('error_uri'));
}

if (urlParams.has('code')) {
  const code = urlParams.get('code');
  console.log('✅ Code OAuth reçu');
  console.log('   Longueur:', code.length);
  console.log('   Premier caractère:', code[0]);
  console.log('   Format valide:', code.startsWith('4/') ? 'OUI' : 'NON');
  
  // Test de l'API avec ce code réel
  console.log('🧪 Test API avec code réel...');
  
  fetch('/api/auth/google-token-exchange', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code: code })
  })
  .then(async response => {
    console.log('📡 API Response Status:', response.status);
    console.log('📡 API Response OK:', response.ok);
    console.log('📡 API Response Headers:');
    response.headers.forEach((value, key) => {
      console.log(`   ${key}: ${value}`);
    });
    
    const responseText = await response.text();
    console.log('📡 API Response Text:', responseText);
    
    // Essayer de parser en JSON
    try {
      const jsonResponse = JSON.parse(responseText);
      console.log('📡 API Response JSON:', jsonResponse);
      
      // Si succès, créer la session
      if (jsonResponse.success || jsonResponse.user) {
        console.log('✅ Authentification réussie!');
        console.log('👤 Utilisateur:', jsonResponse.user);
        
        // Sauvegarder la session
        const sessionData = {
          user: jsonResponse.user,
          timestamp: Date.now(),
          source: 'google-oauth'
        };
        
        localStorage.setItem('admin_session', btoa(JSON.stringify(sessionData)));
        console.log('💾 Session sauvegardée');
        
        // Rediriger vers le dashboard
        console.log('🔀 Redirection vers dashboard...');
        window.location.href = '/photobooth-ia/admin/dashboard';
      } else {
        console.log('❌ Authentification échouée:', jsonResponse);
      }
    } catch (e) {
      console.error('❌ Impossible de parser la réponse JSON:', e);
      console.log('📄 Réponse brute:', responseText);
    }
  })
  .catch(error => {
    console.error('❌ Erreur fetch API:', error);
  });
}

console.log('🔬 Diagnostic terminé. Vérifiez les logs ci-dessus.');