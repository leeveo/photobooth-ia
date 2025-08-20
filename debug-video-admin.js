// SCRIPT DE DIAGNOSTIC POUR L'INTERFACE D'ADMINISTRATION
// À exécuter dans la console du navigateur sur votre page d'administration

console.log('🔍 DIAGNOSTIC VIDÉO BACKGROUNDS - Interface Admin');
console.log('');

// 1. Vérifier si on est sur la bonne page
const currentUrl = window.location.href;
console.log('📍 URL actuelle:', currentUrl);

// 2. Vérifier le projet ID
const projectId = window.id || 'Non défini';
console.log('🆔 Project ID:', projectId);

// 3. Vérifier les backgrounds dans l'état React (si accessible)
try {
  // Essayer d'accéder aux données React
  const reactRoot = document.querySelector('#__next') || document.querySelector('[data-reactroot]');
  if (reactRoot && reactRoot._reactInternalFiber) {
    console.log('⚛️ React détecté, tentative d\'accès aux données...');
  }
} catch (e) {
  console.log('⚛️ Impossible d\'accéder directement aux données React');
}

// 4. Vérifier les éléments DOM des backgrounds
const backgroundElements = document.querySelectorAll('[data-background-id], .bg-gray-50');
console.log('🎨 Éléments de background trouvés:', backgroundElements.length);

// 5. Rechercher les vidéos dans le DOM
const videoElements = document.querySelectorAll('video');
console.log('🎬 Éléments vidéo trouvés:', videoElements.length);

videoElements.forEach((video, index) => {
  console.log(`   Vidéo ${index + 1}:`);
  console.log(`     - src: ${video.src || 'Non défini'}`);
  console.log(`     - autoplay: ${video.autoplay}`);
  console.log(`     - loop: ${video.loop}`);
  console.log(`     - muted: ${video.muted}`);
  console.log(`     - controls: ${video.controls}`);
  console.log(`     - readyState: ${video.readyState}`); // 0=HAVE_NOTHING, 4=HAVE_ENOUGH_DATA
  console.log(`     - networkState: ${video.networkState}`); // 0=EMPTY, 3=LOADED
  console.log(`     - visible: ${video.offsetWidth > 0 && video.offsetHeight > 0}`);
});

// 6. Rechercher les indicateurs show_animated
const animatedIndicators = document.querySelectorAll('*');
let animatedTexts = [];
animatedIndicators.forEach(el => {
  if (el.textContent && el.textContent.includes('Animation')) {
    animatedTexts.push(el.textContent.trim());
  }
});

console.log('✨ Indicateurs d\'animation trouvés:');
animatedTexts.forEach((text, index) => {
  console.log(`   ${index + 1}: "${text}"`);
});

// 7. Vérifier si on est sur l'onglet backgrounds
const activeTab = document.querySelector('[class*="indigo-700"], [class*="indigo-600"]');
if (activeTab && activeTab.textContent.includes('Arrière-plans')) {
  console.log('✅ Vous êtes sur l\'onglet Arrière-plans');
} else {
  console.log('⚠️ Vous n\'êtes PAS sur l\'onglet Arrière-plans');
  console.log('   👉 Cliquez sur l\'onglet "Arrière-plans" pour voir les détails');
}

// 8. Vérifier les erreurs de réseau
if (typeof performance !== 'undefined') {
  const resources = performance.getEntriesByType('resource');
  const videoRequests = resources.filter(r => 
    r.name.includes('.mp4') || 
    r.name.includes('.webm') || 
    r.name.includes('.mov') ||
    r.name.includes('video')
  );
  
  console.log('🌐 Requêtes vidéo trouvées:', videoRequests.length);
  videoRequests.forEach((req, index) => {
    console.log(`   Vidéo ${index + 1}: ${req.name} (${req.responseEnd - req.requestStart}ms)`);
  });
}

console.log('');
console.log('🎯 ACTIONS RECOMMANDÉES:');
console.log('1. Si vous voyez "Animation vidéo activée automatiquement" mais pas de vidéo:');
console.log('   → Vérifiez que les URLs de vidéo sont valides');
console.log('   → Ouvrez les URLs directement dans un nouvel onglet');
console.log('');
console.log('2. Si vous voyez "Aucune vidéo disponible pour l\'animation":');
console.log('   → Le problème est que show_animated=false dans la base de données');
console.log('   → Exécutez le script SQL fix-video-backgrounds.sql');
console.log('');
console.log('3. Si les vidéos sont présentes mais ne se lisent pas:');
console.log('   → Problème de format ou de codec vidéo');
console.log('   → Essayez avec des vidéos au format MP4 H.264');

// 9. Fonction utilitaire pour forcer la mise à jour
window.debugVideoBackgrounds = function() {
  console.log('🔄 Fonction de debug disponible: window.debugVideoBackgrounds()');
  // Ici on pourrait ajouter du code pour forcer un rafraîchissement
};

console.log('');
console.log('💡 Une fonction de debug est maintenant disponible: window.debugVideoBackgrounds()');
