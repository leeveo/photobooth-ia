// ==========================================
// SCRIPT DE TEST NOTREADABLEERROR POUR IPAD
// À utiliser dans la console du navigateur sur iPad
// ==========================================

console.log("🔧 DIAGNOSTIC SPÉCIAL NOTREADABLEERROR POUR IPAD");

async function testNotReadableErrorSolutions() {
  console.log("📱 Démarrage du test spécialisé NotReadableError...");
  
  // Test 1: Configuration la plus simple possible
  console.log("\n🧪 TEST 1: Configuration ultra-simple");
  try {
    const stream1 = await navigator.mediaDevices.getUserMedia({ video: true });
    console.log("✅ TEST 1 RÉUSSI - Configuration simple fonctionne!");
    stream1.getTracks().forEach(track => track.stop());
    return "SUCCESS - Problème résolu avec configuration simple";
  } catch (err) {
    console.log("❌ TEST 1 ÉCHEC:", err.name, "-", err.message);
    
    if (err.name === 'NotReadableError') {
      console.log("🚨 NOTREADABLEERROR DÉTECTÉE - Application des solutions...");
      
      // Solution 1: Attendre et retry
      console.log("\n⏰ SOLUTION 1: Attente de 3 secondes puis retry...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      try {
        const stream2 = await navigator.mediaDevices.getUserMedia({ video: true });
        console.log("✅ SOLUTION 1 RÉUSSIE - Retry après délai fonctionne!");
        stream2.getTracks().forEach(track => track.stop());
        return "SUCCESS - Problème résolu avec retry après délai";
      } catch (err2) {
        console.log("❌ SOLUTION 1 ÉCHOUÉE:", err2.name, "-", err2.message);
      }
      
      // Solution 2: Essayer avec facingMode user
      console.log("\n🔄 SOLUTION 2: Essayer avec facingMode user...");
      try {
        const stream3 = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user" } 
        });
        console.log("✅ SOLUTION 2 RÉUSSIE - FacingMode user fonctionne!");
        stream3.getTracks().forEach(track => track.stop());
        return "SUCCESS - Problème résolu avec facingMode user";
      } catch (err3) {
        console.log("❌ SOLUTION 2 ÉCHOUÉE:", err3.name, "-", err3.message);
      }
      
      // Solution 3: Essayer avec contraintes minimales
      console.log("\n📐 SOLUTION 3: Contraintes minimales...");
      try {
        const stream4 = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 320 },
            height: { ideal: 240 }
          } 
        });
        console.log("✅ SOLUTION 3 RÉUSSIE - Contraintes minimales fonctionnent!");
        stream4.getTracks().forEach(track => track.stop());
        return "SUCCESS - Problème résolu avec contraintes minimales";
      } catch (err4) {
        console.log("❌ SOLUTION 3 ÉCHOUÉE:", err4.name, "-", err4.message);
      }
      
      // Solution 4: Lister et tester chaque caméra individuellement
      console.log("\n🎯 SOLUTION 4: Test de chaque caméra individuellement...");
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        console.log(`📹 ${videoDevices.length} caméras trouvées, test individuel...`);
        
        for (let i = 0; i < videoDevices.length; i++) {
          const device = videoDevices[i];
          console.log(`🔄 Test caméra ${i + 1}: ${device.label || 'Unknown'}`);
          
          try {
            const stream5 = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: device.deviceId } }
            });
            console.log(`✅ SOLUTION 4 RÉUSSIE - Caméra ${i + 1} fonctionne!`);
            stream5.getTracks().forEach(track => track.stop());
            return `SUCCESS - Problème résolu avec caméra spécifique: ${device.label || device.deviceId}`;
          } catch (err5) {
            console.log(`❌ Caméra ${i + 1} échouée:`, err5.name);
          }
        }
      } catch (enumErr) {
        console.log("❌ SOLUTION 4 ÉCHOUÉE - Impossible d'énumérer les caméras:", enumErr.message);
      }
      
      return "FAILED - Toutes les solutions ont échoué. Veuillez redémarrer Safari ou votre iPad.";
    }
  }
  
  return "UNKNOWN_ERROR - Erreur différente de NotReadableError";
}

// Instructions pour l'utilisateur
console.log(`
🍎 INSTRUCTIONS POUR IPAD:

Si vous voyez "NotReadableError: Could not start video source":

1. ✋ FERMEZ TOUTES LES AUTRES APPS qui pourraient utiliser la caméra:
   - FaceTime
   - Zoom
   - Teams
   - WhatsApp
   - Instagram
   - TikTok
   - Autres navigateurs

2. 🔄 REDÉMARREZ SAFARI:
   - Fermez complètement Safari
   - Attendez 5 secondes
   - Rouvrez Safari

3. 📱 SI LE PROBLÈME PERSISTE:
   - Redémarrez complètement votre iPad
   - Vérifiez que Safari a bien les permissions caméra

4. 🧪 LANCEZ CE TEST:
`);

// Lancer le test automatiquement
testNotReadableErrorSolutions().then(result => {
  console.log(`\n🏁 RÉSULTAT FINAL: ${result}`);
  
  if (result.startsWith("SUCCESS")) {
    console.log("✅ Votre caméra fonctionne maintenant! Vous pouvez rafraîchir votre page photobooth.");
  } else {
    console.log("❌ Le problème persiste. Suivez les instructions manuelles ci-dessus.");
  }
}).catch(err => {
  console.error("❌ ERREUR LORS DU TEST:", err);
});