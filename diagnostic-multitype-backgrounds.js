/**
 * SCRIPT DE DIAGNOSTIC - BackgroundTemplatesMultiType
 * 
 * À exécuter dans la console du navigateur pour tester le composant
 */

// Test 1: Vérifier le chargement des templates multi-types
console.group('🔍 DIAGNOSTIC - BackgroundTemplatesMultiType');

// Tester la structure JSON
async function testMultiTypeTemplates() {
  try {
    const response = await fetch('/photobooth-ia/admin/data/backgroundTemplatesMultiType.json');
    const data = await response.json();
    
    console.log('📋 Structure des templates multi-types:', data);
    console.log('🖼️ Images horizontales:', data.horizontal_images?.length || 0);
    console.log('📱 Images verticales:', data.vertical_images?.length || 0);
    console.log('🎬 Vidéos horizontales:', data.horizontal_videos?.length || 0);
    console.log('📹 Vidéos verticales:', data.vertical_videos?.length || 0);
    
    return data;
  } catch (error) {
    console.error('❌ Erreur lors du chargement des templates:', error);
    return null;
  }
}

// Test 2: Vérifier l'état du composant
function checkComponentState() {
  console.log('🔄 État actuel du composant:');
  
  // Vérifier les éléments DOM
  const tabs = document.querySelectorAll('[role="tab"], [data-tab]');
  const templateGrid = document.querySelector('[class*="grid"]');
  const videoElements = document.querySelectorAll('video');
  const imageElements = document.querySelectorAll('img[alt*="template"], img[alt*="Template"]');
  
  console.log('📑 Onglets trouvés:', tabs.length);
  console.log('🎭 Grille de templates:', templateGrid ? 'Présente' : 'Absente');
  console.log('🎥 Éléments vidéo:', videoElements.length);
  console.log('🖼️ Éléments image:', imageElements.length);
  
  // Log des vidéos avec leurs URLs
  videoElements.forEach((video, index) => {
    console.log(`📹 Vidéo ${index + 1}:`, {
      src: video.src,
      controls: video.controls,
      muted: video.muted,
      playsInline: video.playsInline,
      loaded: video.readyState > 0 ? 'Oui' : 'Non'
    });
  });
}

// Test 3: Simuler un changement d'onglet
function simulateTabChange(tabType) {
  console.log(`🔄 Simulation changement vers onglet: ${tabType}`);
  
  // Chercher le bouton d'onglet
  const tabButton = Array.from(document.querySelectorAll('button')).find(
    btn => btn.textContent.includes(tabType)
  );
  
  if (tabButton) {
    tabButton.click();
    console.log('✅ Onglet cliqué');
    
    // Attendre et vérifier les changements
    setTimeout(() => {
      checkComponentState();
    }, 500);
  } else {
    console.log('❌ Onglet non trouvé');
  }
}

// Test 4: Vérifier les backgrounds existants
async function checkExistingBackgrounds() {
  console.log('🔍 Vérification des backgrounds existants...');
  
  // Simulation - à adapter selon votre structure
  const projectId = window.location.pathname.split('/').pop();
  console.log('📁 ID du projet détecté:', projectId);
  
  // Vérifier si les sélections sont pré-remplies
  const selectedItems = document.querySelectorAll('[class*="ring-4"], [class*="border-green"]');
  console.log('✅ Éléments pré-sélectionnés:', selectedItems.length);
  
  selectedItems.forEach((item, index) => {
    const img = item.querySelector('img, video');
    console.log(`🎯 Sélection ${index + 1}:`, {
      type: img?.tagName.toLowerCase(),
      src: img?.src || 'Non défini'
    });
  });
}

// Exécution des tests
async function runAllTests() {
  console.clear();
  console.log('🚀 DÉBUT DES TESTS - BackgroundTemplatesMultiType');
  console.log('='.repeat(50));
  
  // Test 1
  await testMultiTypeTemplates();
  
  // Test 2  
  console.log('\n');
  checkComponentState();
  
  // Test 3
  console.log('\n');
  await checkExistingBackgrounds();
  
  console.log('\n');
  console.log('='.repeat(50));
  console.log('✅ TESTS TERMINÉS');
  console.groupEnd();
}

// Interface utilisateur pour les tests
window.diagnosticMultiType = {
  runAllTests,
  testMultiTypeTemplates,
  checkComponentState,
  simulateTabChange,
  checkExistingBackgrounds
};

console.log('🛠️ Diagnostic Multi-Type chargé !');
console.log('📋 Commandes disponibles:');
console.log('• diagnosticMultiType.runAllTests() - Lancer tous les tests');
console.log('• diagnosticMultiType.testMultiTypeTemplates() - Tester le JSON');
console.log('• diagnosticMultiType.checkComponentState() - Vérifier le DOM');
console.log('• diagnosticMultiType.simulateTabChange("Vidéos") - Changer d\'onglet');
console.log('• diagnosticMultiType.checkExistingBackgrounds() - Vérifier les backgrounds');
