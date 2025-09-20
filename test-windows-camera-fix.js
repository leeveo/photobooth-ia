// ==========================================
// SCRIPT DE TEST CAMERA WINDOWS/CHROME
// À utiliser dans la console du navigateur
// ==========================================

console.log("🖥️ DIAGNOSTIC CAMÉRA POUR WINDOWS/CHROME");

async function testWindowsCameraFix() {
  console.log("🔍 Test spécifique pour Windows/Chrome...");
  
  // Test 1: Accès basique (celui qui marchait)
  console.log("\n✅ TEST 1: Accès basique (devrait marcher)");
  try {
    const basicStream = await navigator.mediaDevices.getUserMedia({ video: true });
    const videoTrack = basicStream.getVideoTracks()[0];
    if (videoTrack) {
      const settings = videoTrack.getSettings();
      console.log("✅ SUCCÈS - Accès basique fonctionne!", settings);
      basicStream.getTracks().forEach(track => track.stop());
      
      console.log("🎯 SOLUTION: Votre caméra fonctionne parfaitement en mode basique!");
      console.log("Le problème était que le code essayait des contraintes trop complexes après que l'accès basique ait réussi.");
      console.log("Maintenant le système utilise directement l'accès basique qui fonctionne.");
      
      return "SUCCESS - Caméra fonctionne en mode basique";
    }
  } catch (err) {
    console.log("❌ TEST 1 ÉCHEC:", err.name, "-", err.message);
  }
  
  // Test 2: Contraintes qui échouaient
  console.log("\n❌ TEST 2: Contraintes complexes (échouaient avant)");
  const complexConstraints = [
    { video: { width: { ideal: 1920 }, height: { ideal: 1080 }, aspectRatio: { ideal: 16/9 } } },
    { video: { width: { min: 1280 }, height: { min: 720 }, aspectRatio: { ideal: 16/9 } } },
    { video: { width: { min: 640 }, height: { min: 360 }, aspectRatio: { ideal: 16/9 } } }
  ];
  
  for (let i = 0; i < complexConstraints.length; i++) {
    const constraint = complexConstraints[i];
    console.log(`🔄 Test contrainte ${i + 1}:`, constraint);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraint);
      console.log(`✅ Contrainte ${i + 1} fonctionne maintenant!`);
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.log(`❌ Contrainte ${i + 1} échoue:`, err.name);
      
      if (err.name === 'NotReadableError') {
        console.log("   → Caméra bloquée ou utilisée par une autre app");
      } else if (err.name === 'OverconstrainedError') {
        console.log("   → Contraintes trop strictes pour votre caméra");
      }
    }
  }
  
  return "DIAGNOSIS_COMPLETE";
}

// Instructions
console.log(`
🖥️ DIAGNOSTIC WINDOWS/CHROME:

PROBLÈME IDENTIFIÉ:
- Votre caméra fonctionne parfaitement en accès basique
- Mais les contraintes complexes (résolution, aspect ratio) échouent
- Le code essayait les contraintes après que l'accès basique ait réussi

SOLUTION APPLIQUÉE:
- Le système utilise maintenant directement l'accès basique qui fonctionne
- Plus besoin d'essayer les configurations qui échouent
- Rechargez votre page pour tester la correction

LANCEMENT DU TEST:
`);

// Lancer le test
testWindowsCameraFix().then(result => {
  console.log(`\n🏁 RÉSULTAT: ${result}`);
  
  if (result.startsWith("SUCCESS")) {
    console.log(`
✅ VOTRE CAMÉRA FONCTIONNE!

🔄 PROCHAINES ÉTAPES:
1. Rechargez votre page photobooth
2. La caméra devrait maintenant s'activer sans erreur
3. Le système utilise l'accès basique qui fonctionne parfaitement

Le problème était dans la logique qui ignorait le succès de l'accès basique.
`);
  } else {
    console.log("❌ Un problème persiste. Vérifiez que votre caméra n'est pas utilisée par une autre application.");
  }
}).catch(err => {
  console.error("❌ ERREUR LORS DU TEST:", err);
});