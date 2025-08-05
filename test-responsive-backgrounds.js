/**
 * TEST DE BACKGROUND RESPONSIVE - Orientation Aware
 * 
 * À exécuter dans la console du navigateur pour tester le système d'orientation
 */

console.group('📱💻 TEST BACKGROUND RESPONSIVE');

// Test 1: Simuler différentes tailles d'écran
function simulateScreenSize(width, height, label) {
  console.log(`🔄 Simulation ${label}: ${width}x${height}`);
  
  // Modifier temporairement la taille de l'écran (simulation)
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Déclencher un événement resize
  window.dispatchEvent(new Event('resize'));
  
  const isMobile = width <= 768 || height > width;
  console.log(`📊 Détection: ${isMobile ? 'Mobile/Portrait' : 'Desktop/Landscape'}`);
  
  return { isMobile, orientation: height > width ? 'portrait' : 'landscape' };
}

// Test 2: Vérifier les URLs de background actuelles
function checkCurrentBackgrounds() {
  console.log('🖼️ Vérification des backgrounds actuels:');
  
  // Vérifier les éléments d'image
  const backgroundDivs = document.querySelectorAll('[style*="background-image"]');
  const imgElements = document.querySelectorAll('img[alt*="Background"]');
  const videoElements = document.querySelectorAll('video');
  
  console.log('📋 Éléments trouvés:', {
    backgroundDivs: backgroundDivs.length,
    images: imgElements.length,
    videos: videoElements.length
  });
  
  backgroundDivs.forEach((div, index) => {
    const style = div.style.backgroundImage;
    const url = style.match(/url\(['"]?([^'"]*)['"]?\)/)?.[1];
    console.log(`🎨 Background Div ${index + 1}:`, url);
    
    // Analyser si c'est horizontal ou vertical
    if (url) {
      const isVertical = url.includes('vertical') || url.includes('portrait');
      console.log(`   └─ Type: ${isVertical ? 'Vertical/Portrait' : 'Horizontal/Landscape'}`);
    }
  });
  
  imgElements.forEach((img, index) => {
    console.log(`🖼️ Image ${index + 1}:`, img.src);
    const isVertical = img.src.includes('vertical') || img.src.includes('portrait');
    console.log(`   └─ Type: ${isVertical ? 'Vertical/Portrait' : 'Horizontal/Landscape'}`);
  });
  
  videoElements.forEach((video, index) => {
    console.log(`🎥 Video ${index + 1}:`, video.src);
    const isVertical = video.src.includes('vertical') || video.src.includes('portrait');
    console.log(`   └─ Type: ${isVertical ? 'Vertical/Portrait' : 'Horizontal/Landscape'}`);
  });
}

// Test 3: Tester différentes orientations
async function testOrientations() {
  console.log('🔄 Test des orientations multiples...');
  
  const scenarios = [
    { width: 1920, height: 1080, label: 'Desktop Full HD' },
    { width: 1366, height: 768, label: 'Laptop' },
    { width: 768, height: 1024, label: 'Tablette Portrait' },
    { width: 1024, height: 768, label: 'Tablette Paysage' },
    { width: 375, height: 667, label: 'iPhone Portrait' },
    { width: 667, height: 375, label: 'iPhone Paysage' },
    { width: 414, height: 896, label: 'iPhone Pro Portrait' }
  ];
  
  for (const scenario of scenarios) {
    const result = simulateScreenSize(scenario.width, scenario.height, scenario.label);
    
    // Attendre un moment pour que React se mette à jour
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Vérifier les backgrounds après changement
    console.log(`📱 ${scenario.label} - Résultat:`, result);
    checkCurrentBackgrounds();
    console.log('---');
  }
}

// Test 4: Vérifier la structure des données de background
async function checkBackgroundData() {
  try {
    console.log('🔍 Vérification des données de background...');
    
    // Essayer de récupérer les logs de debug s'ils existent
    const debugLogs = window.console.history || [];
    const backgroundLogs = debugLogs.filter(log => 
      typeof log === 'string' && log.includes('background')
    );
    
    console.log('📊 Logs de background trouvés:', backgroundLogs.length);
    
    // Vérifier les éléments DOM pour les indices sur les types de background
    const allElements = document.querySelectorAll('*');
    let horizontalCount = 0;
    let verticalCount = 0;
    
    allElements.forEach(el => {
      const style = el.style.backgroundImage || '';
      const src = el.src || '';
      const combined = style + src;
      
      if (combined.includes('vertical') || combined.includes('portrait')) {
        verticalCount++;
      } else if (combined.includes('horizontal') || combined.includes('landscape') || combined.includes('http')) {
        horizontalCount++;
      }
    });
    
    console.log('📈 Analyse des types de background:', {
      horizontal: horizontalCount,
      vertical: verticalCount,
      total: horizontalCount + verticalCount
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

// Interface utilisateur pour les tests
window.testResponsiveBackgrounds = {
  simulateScreenSize,
  checkCurrentBackgrounds,
  testOrientations,
  checkBackgroundData,
  
  // Tests rapides
  testMobile: () => simulateScreenSize(375, 667, 'Test Mobile'),
  testDesktop: () => simulateScreenSize(1920, 1080, 'Test Desktop'),
  testTablet: () => simulateScreenSize(768, 1024, 'Test Tablette'),
  
  // Test complet
  runAllTests: async () => {
    console.clear();
    console.log('🚀 DÉBUT DES TESTS RESPONSIVE');
    console.log('='.repeat(60));
    
    await checkBackgroundData();
    console.log('\n');
    
    checkCurrentBackgrounds();
    console.log('\n');
    
    await testOrientations();
    
    console.log('='.repeat(60));
    console.log('✅ TESTS RESPONSIVE TERMINÉS');
    console.groupEnd();
  }
};

console.log('🛠️ Tests de Background Responsive chargés !');
console.log('📋 Commandes disponibles:');
console.log('• testResponsiveBackgrounds.runAllTests() - Lancer tous les tests');
console.log('• testResponsiveBackgrounds.testMobile() - Tester mobile');
console.log('• testResponsiveBackgrounds.testDesktop() - Tester desktop');
console.log('• testResponsiveBackgrounds.testTablet() - Tester tablette');
console.log('• testResponsiveBackgrounds.checkCurrentBackgrounds() - Vérifier backgrounds actuels');
console.log('• testResponsiveBackgrounds.testOrientations() - Tester toutes orientations');

// Auto-test au chargement
console.log('\n🔄 Lancement du test automatique...');
setTimeout(() => {
  testResponsiveBackgrounds.checkCurrentBackgrounds();
}, 1000);
