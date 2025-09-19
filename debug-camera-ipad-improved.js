// ==========================================
// SCRIPT DE DEBUG CAMERA IPAD - VERSION AMÉLIORÉE
// À utiliser dans la console du navigateur sur iPad
// ==========================================

console.log("🚀 DÉMARRAGE DU DIAGNOSTIC CAMÉRA IPAD AMÉLIORÉ");

// Fonction pour vérifier les permissions
async function checkCameraPermission() {
  try {
    if (navigator.permissions) {
      const permission = await navigator.permissions.query({ name: 'camera' });
      console.log("📹 Camera permission status:", permission.state);
      return permission.state;
    }
    console.log("⚠️ Navigator.permissions not available");
    return 'unknown';
  } catch (err) {
    console.log("⚠️ Could not check camera permission:", err.message);
    return 'unknown';
  }
}

// Fonction pour lister toutes les caméras
async function listAllCameras() {
  try {
    console.log("📋 Listing all available media devices...");
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    console.log(`📹 Found ${videoDevices.length} video devices:`);
    videoDevices.forEach((device, index) => {
      console.log(`  Camera ${index + 1}: ${device.label || 'Unknown'} (ID: ${device.deviceId})`);
    });
    
    return videoDevices;
  } catch (err) {
    console.error("❌ Failed to enumerate devices:", err);
    return [];
  }
}

// Fonction pour tester l'accès basique à la caméra
async function testBasicCameraAccess() {
  try {
    console.log("🧪 Testing basic camera access...");
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const videoTrack = stream.getVideoTracks()[0];
    
    if (videoTrack) {
      const settings = videoTrack.getSettings();
      console.log("✅ Basic camera access works! Settings:", {
        deviceId: settings.deviceId,
        facingMode: settings.facingMode,
        width: settings.width,
        height: settings.height,
        label: videoTrack.label
      });
      
      stream.getTracks().forEach(track => track.stop());
      return true;
    }
    return false;
  } catch (err) {
    console.error("❌ Basic camera access failed:", {
      name: err.name,
      message: err.message,
      constraint: err.constraint || 'unknown'
    });
    return false;
  }
}

// Fonction pour tester toutes les configurations iPad
async function testIPadConfigurations() {
  console.log("🍎 Testing iPad-specific camera configurations...");
  
  const configs = [
    { video: { facingMode: { exact: "user" } } },
    { video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } },
    { video: { facingMode: "user" } },
    { video: { width: { ideal: 640 }, height: { ideal: 480 } } },
    { video: true }
  ];
  
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    console.log(`🔄 Testing config ${i + 1}:`, JSON.stringify(config, null, 2));
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia(config);
      const videoTrack = stream.getVideoTracks()[0];
      
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        console.log(`✅ Config ${i + 1} SUCCESS! Settings:`, settings);
        stream.getTracks().forEach(track => track.stop());
        return { success: true, config, settings };
      }
    } catch (err) {
      console.log(`❌ Config ${i + 1} failed:`, err.name, err.message);
    }
  }
  
  return { success: false };
}

// Fonction pour tester l'accès par deviceId
async function testCameraByDeviceId() {
  console.log("🎯 Testing camera access by deviceId...");
  
  const devices = await listAllCameras();
  
  for (const device of devices) {
    console.log(`🔄 Testing device: ${device.label || 'Unknown'}`);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: device.deviceId } }
      });
      
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        console.log(`✅ Device access SUCCESS! Settings:`, settings);
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (err) {
      console.log(`❌ Device access failed:`, err.name, err.message);
    }
  }
}

// Fonction principale de diagnostic
async function runFullDiagnostic() {
  console.log("🔍 STARTING FULL CAMERA DIAGNOSTIC FOR IPAD");
  console.log("=" * 50);
  
  // 1. Détection de l'appareil
  const isIPad = /iPad/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  console.log("📱 Device Detection:");
  console.log(`  🍎 iPad: ${isIPad}`);
  console.log(`  🌐 Safari: ${isSafari}`);
  console.log(`  📱 iOS: ${isIOS}`);
  console.log(`  🖥️ Platform: ${navigator.platform}`);
  console.log(`  👆 MaxTouchPoints: ${navigator.maxTouchPoints}`);
  
  // 2. Vérification du support MediaDevices
  console.log("\n📹 MediaDevices Support:");
  console.log(`  navigator.mediaDevices: ${!!navigator.mediaDevices}`);
  console.log(`  getUserMedia: ${!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)}`);
  console.log(`  enumerateDevices: ${!!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)}`);
  
  // 3. Vérification des permissions
  console.log("\n🔐 Permission Check:");
  const permission = await checkCameraPermission();
  console.log(`  Status: ${permission}`);
  
  // 4. Liste des caméras
  console.log("\n📋 Camera Enumeration:");
  const cameras = await listAllCameras();
  
  // 5. Test d'accès basique
  console.log("\n🧪 Basic Access Test:");
  const basicWorks = await testBasicCameraAccess();
  
  // 6. Test des configurations iPad
  console.log("\n🍎 iPad Configuration Tests:");
  const configResult = await testIPadConfigurations();
  
  // 7. Test par deviceId
  console.log("\n🎯 DeviceId Tests:");
  await testCameraByDeviceId();
  
  console.log("\n✅ DIAGNOSTIC COMPLETED!");
  console.log("=" * 50);
  
  return {
    isIPad,
    isSafari,
    isIOS,
    permission,
    cameras,
    basicWorks,
    configResult
  };
}

// Lancer le diagnostic automatiquement
runFullDiagnostic().then(results => {
  console.log("📊 FINAL RESULTS:", results);
}).catch(err => {
  console.error("❌ DIAGNOSTIC FAILED:", err);
});