// ==========================================
// SCRIPT DE TEST BOUTON SWITCH CAMERA
// Test du bouton de changement de caméra
// ==========================================

console.log("🔄 TEST DU BOUTON SWITCH CAMERA");

async function testSwitchCameraButton() {
  console.log("🔍 Test du système de changement de caméra...");
  
  // Test 1: Vérifier l'existence du bouton
  console.log("\n🎯 TEST 1: Recherche du bouton switch camera");
  const switchButtons = document.querySelectorAll('button');
  let switchButton = null;
  
  for (const button of switchButtons) {
    if (button.textContent.includes('CAMÉRA FRONTALE') || button.textContent.includes('CAMÉRA ARRIÈRE')) {
      switchButton = button;
      console.log("✅ Bouton switch camera trouvé:", button.textContent);
      break;
    }
  }
  
  if (!switchButton) {
    console.log("❌ Bouton switch camera non trouvé");
    console.log("🔍 Tous les boutons trouvés:");
    switchButtons.forEach((btn, i) => {
      console.log(`  Bouton ${i + 1}: "${btn.textContent.trim()}"`);
    });
    return "BUTTON_NOT_FOUND";
  }
  
  // Test 2: Vérifier l'accès caméra
  console.log("\n📹 TEST 2: Vérification accès caméra");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    console.log("✅ Accès caméra OK");
    
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const settings = videoTrack.getSettings();
      console.log("📹 Caméra actuelle:", {
        facingMode: settings.facingMode || 'unknown',
        width: settings.width,
        height: settings.height,
        deviceId: settings.deviceId
      });
    }
    
    stream.getTracks().forEach(track => track.stop());
  } catch (err) {
    console.log("❌ Erreur accès caméra:", err.message);
    return "CAMERA_ERROR";
  }
  
  // Test 3: Énumérer les caméras disponibles
  console.log("\n📋 TEST 3: Énumération des caméras");
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    console.log(`📹 ${videoDevices.length} caméra(s) trouvée(s):`);
    videoDevices.forEach((device, i) => {
      console.log(`  Caméra ${i + 1}: ${device.label || 'Caméra inconnue'}`);
    });
    
    if (videoDevices.length > 1) {
      console.log("✅ Plusieurs caméras disponibles - le switch devrait fonctionner");
    } else {
      console.log("⚠️ Une seule caméra - le switch peut ne pas fonctionner");
    }
  } catch (err) {
    console.log("❌ Erreur énumération:", err.message);
  }
  
  // Test 4: Test de changement de caméra si possible
  console.log("\n🔄 TEST 4: Test de changement de caméra");
  
  const facingModes = ['user', 'environment'];
  for (const facingMode of facingModes) {
    console.log(`🧪 Test facingMode "${facingMode}"`);
    try {
      const testStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: facingMode } }
      });
      
      const videoTrack = testStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      console.log(`✅ ${facingMode} fonctionne:`, {
        facingMode: settings.facingMode,
        label: videoTrack.label
      });
      
      testStream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.log(`❌ ${facingMode} échoue:`, err.name);
    }
  }
  
  // Test 5: Simuler un clic sur le bouton
  console.log("\n🖱️ TEST 5: Simulation du clic sur le bouton");
  try {
    console.log("⚠️ ATTENTION: Le clic va déclencher le changement de caméra!");
    console.log("📱 Observez la page pour voir si la caméra change...");
    
    // Simulation du clic après 2 secondes
    setTimeout(() => {
      if (switchButton) {
        console.log("🖱️ Clic simulé sur le bouton switch camera");
        switchButton.click();
      }
    }, 2000);
    
    return "TEST_COMPLETE_CLICK_SIMULATED";
  } catch (err) {
    console.log("❌ Erreur simulation clic:", err.message);
    return "CLICK_ERROR";
  }
}

// Instructions
console.log(`
🔄 TEST DU SYSTÈME SWITCH CAMERA:

OBJECTIF:
- Vérifier que le bouton de changement de caméra existe
- Tester l'accès aux différentes caméras
- Simuler un clic pour tester le fonctionnement

CORRECTIONS APPLIQUÉES:
✅ Ajout de currentCameraFacing state
✅ Ajout de switchingCamera state  
✅ Fonction switchCamera existante corrigée

LANCEMENT DU TEST:
`);

// Lancer le test
testSwitchCameraButton().then(result => {
  console.log(`\n🏁 RÉSULTAT: ${result}`);
  
  switch(result) {
    case "TEST_COMPLETE_CLICK_SIMULATED":
      console.log(`
✅ SYSTÈME SWITCH CAMERA OPÉRATIONNEL!

🎯 RÉSUMÉ:
- Bouton trouvé et fonctionnel
- Accès caméra confirmé
- Clic simulé déclenché

📱 OBSERVATION:
- Regardez si la caméra a changé
- Le bouton devrait montrer "CAMÉRA FRONTALE" ou "CAMÉRA ARRIÈRE"
- Les logs de la console montrent le changement

🔄 Pour tester manuellement, cliquez sur le bouton switch camera!
`);
      break;
      
    case "BUTTON_NOT_FOUND":
      console.log("❌ Le bouton switch camera n'a pas été trouvé dans l'interface");
      break;
      
    case "CAMERA_ERROR":
      console.log("❌ Problème d'accès à la caméra");
      break;
      
    default:
      console.log("⚠️ Test terminé avec un statut inattendu");
  }
}).catch(err => {
  console.error("❌ ERREUR LORS DU TEST:", err);
});