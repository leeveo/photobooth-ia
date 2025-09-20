/**
 * Script de test pour vérifier que le système de basculement de caméra fonctionne sur iPad
 * 
 * Instructions pour tester :
 * 1. Ouvrir ce projet sur un iPad
 * 2. Aller sur la page /photobooth-coiffure/[slug]/cam
 * 3. Vérifier que le bouton "Changer caméra" apparaît si plusieurs caméras sont disponibles
 * 4. Cliquer sur le bouton pour basculer entre caméra frontale et arrière
 * 
 * Fonctionnalités ajoutées :
 * ✅ Détection automatique des iPad
 * ✅ Énumération des caméras disponibles avec navigator.mediaDevices.enumerateDevices()
 * ✅ Sélection intelligente de la caméra frontale par défaut
 * ✅ Bouton de basculement visible uniquement sur iPad avec plusieurs caméras
 * ✅ Fonction switchCamera() qui change de caméra et redémarre le stream
 * ✅ Affichage du numéro de caméra active (ex: 1/2)
 * ✅ Support du deviceId dans la fonction useWebcam
 * ✅ Interface utilisateur optimisée pour iPad
 * 
 * Le bouton de basculement :
 * - N'apparaît que sur iPad (détection via navigator.userAgent)
 * - N'apparaît que s'il y a au moins 2 caméras disponibles
 * - N'apparaît que quand aucune photo n'est prise (!enabled)
 * - Affiche la caméra actuelle et le total de caméras
 * - Anime avec des icônes de caméra et de rotation
 * 
 * Détection des caméras :
 * - Front/User/FaceTime camera = priorité pour la caméra frontale
 * - Fallback sur la première caméra disponible si pas de frontale détectée
 * - Logs détaillés dans la console pour debugging
 * 
 * Comment débugger :
 * 1. Ouvrir les outils développeur sur iPad (Safari + Develop menu depuis Mac)
 * 2. Regarder les logs console pour voir les caméras détectées
 * 3. Vérifier que selectedCameraId change lors du basculement
 * 4. Vérifier que le stream vidéo se redémarre après changement
 */

console.log("Script de test du système de basculement de caméra pour iPad");
console.log("Consultez les logs de la page pour voir le fonctionnement en temps réel");

// Fonction de test pour simuler l'énumération des caméras
async function testCameraEnumeration() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.error("enumerateDevices not supported");
      return;
    }
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    console.log("=== TEST: Caméras disponibles ===");
    videoDevices.forEach((device, index) => {
      console.log(`Camera ${index + 1}:`, {
        deviceId: device.deviceId,
        label: device.label,
        groupId: device.groupId
      });
    });
    
    // Détecter caméra frontale
    const frontCamera = videoDevices.find(device => 
      device.label.toLowerCase().includes('front') || 
      device.label.toLowerCase().includes('user') ||
      device.label.toLowerCase().includes('facetime')
    );
    
    if (frontCamera) {
      console.log("✅ Caméra frontale détectée:", frontCamera.label);
    } else {
      console.log("❌ Aucune caméra frontale détectée dans les labels");
    }
    
    return videoDevices;
  } catch (error) {
    console.error("Erreur lors de l'énumération des caméras:", error);
  }
}

// Fonction de test pour vérifier la détection iPad
function testIpadDetection() {
  const isIpad = /(iPad)/i.test(navigator.userAgent);
  console.log("=== TEST: Détection iPad ===");
  console.log("User Agent:", navigator.userAgent);
  console.log("Est un iPad:", isIpad);
  return isIpad;
}

// Exporter les fonctions de test
if (typeof window !== 'undefined') {
  window.testCameraSwitch = {
    testCameraEnumeration,
    testIpadDetection
  };
}