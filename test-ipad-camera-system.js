// Test du système de caméra iPad amélioré
// Fichier de test pour vérifier que les fonctionnalités ajoutées fonctionnent

console.log("🧪 Test du système de caméra iPad amélioré");

// ✅ 1. Test de détection iPad/iOS + Safari
function testIpadDetection() {
  console.log("\n🔍 Test de détection iPad/iOS + Safari:");
  
  const isIPad = /iPad/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  console.log("📱 iPad détecté:", isIPad);
  console.log("🌐 Safari détecté:", isSafari);
  console.log("📱 iOS détecté:", isIOS);
  console.log("🖥️ Platform:", navigator.platform);
  console.log("👆 MaxTouchPoints:", navigator.maxTouchPoints);
  
  const shouldUseiPadMethod = (isIPad || isIOS) && isSafari;
  console.log("✅ Utiliser méthode spécialisée iPad:", shouldUseiPadMethod);
  
  return shouldUseiPadMethod;
}

// ✅ 2. Test d'énumération des caméras
async function testCameraEnumeration() {
  console.log("\n📹 Test d'énumération des caméras:");
  
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    console.log(`📊 ${videoDevices.length} caméras détectées:`);
    
    videoDevices.forEach((device, index) => {
      console.log(`  ${index + 1}. ${device.label || 'Caméra sans nom'}`);
      console.log(`     - deviceId: ${device.deviceId.substring(0, 20)}...`);
    });
    
    return videoDevices;
  } catch (error) {
    console.error("❌ Erreur lors de l'énumération:", error);
    return [];
  }
}

// ✅ 3. Test des configurations de caméra
async function testCameraConfigurations() {
  console.log("\n🎯 Test des configurations de caméra:");
  
  const frontCameraConfigs = [
    { video: { facingMode: { exact: "user" } } },
    { video: { facingMode: { ideal: "user" } } },
    { video: { facingMode: "user" } },
    { video: { facingMode: "user", width: 1280, height: 720 } },
    { video: { facingMode: "user", width: { min: 320 }, height: { min: 240 } } },
  ];
  
  for (let i = 0; i < frontCameraConfigs.length; i++) {
    const config = frontCameraConfigs[i];
    console.log(`🔄 Test config ${i + 1}:`, config);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia(config);
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      
      console.log(`✅ Config ${i + 1} réussie:`, {
        facingMode: settings.facingMode || 'non spécifié',
        width: settings.width,
        height: settings.height
      });
      
      // Arrêter le stream pour libérer la caméra
      stream.getTracks().forEach(track => track.stop());
      
      return { success: true, config, settings };
    } catch (err) {
      console.log(`❌ Config ${i + 1} échouée:`, err.message);
    }
  }
  
  return { success: false };
}

// ✅ 4. Test du système complet
async function runCompleteTest() {
  console.log("🚀 Démarrage du test complet du système iPad...\n");
  
  // Test 1: Détection iPad
  const shouldUseiPadMethod = testIpadDetection();
  
  // Test 2: Énumération des caméras
  const cameras = await testCameraEnumeration();
  
  // Test 3: Configurations de caméra
  const configTest = await testCameraConfigurations();
  
  // Résumé
  console.log("\n📋 RÉSUMÉ DES TESTS:");
  console.log("==================");
  console.log("🍎 Méthode iPad recommandée:", shouldUseiPadMethod ? "✅ OUI" : "❌ NON");
  console.log("📹 Caméras détectées:", cameras.length);
  console.log("🎯 Configuration testée:", configTest.success ? "✅ SUCCÈS" : "❌ ÉCHEC");
  
  if (shouldUseiPadMethod && cameras.length > 0 && configTest.success) {
    console.log("\n🎉 SYSTÈME PRÊT POUR IPAD!");
    console.log("Le système de basculement de caméra devrait fonctionner correctement.");
  } else {
    console.log("\n⚠️ PROBLÈMES DÉTECTÉS:");
    if (!shouldUseiPadMethod) console.log("- Appareil non-iPad ou navigateur non-Safari");
    if (cameras.length === 0) console.log("- Aucune caméra détectée");
    if (!configTest.success) console.log("- Impossible d'accéder aux caméras");
  }
}

// Lancer le test automatiquement
if (typeof window !== 'undefined' && navigator.mediaDevices) {
  runCompleteTest().catch(error => {
    console.error("❌ Erreur dans le test complet:", error);
  });
} else {
  console.log("❌ MediaDevices API non disponible - test impossible");
}

// Exporter les fonctions pour utilisation manuelle
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testIpadDetection,
    testCameraEnumeration,
    testCameraConfigurations,
    runCompleteTest
  };
}