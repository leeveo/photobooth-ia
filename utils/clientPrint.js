/**
 * Service d'impression côté client (Browser / iPad)
 * Remplace l'API serveur qui ne peut pas accéder au réseau local.
 */

// Panneau de debug visible sur iPad
let debugPanel = null;
let debugLogs = [];

function createDebugPanel() {
  if (debugPanel) return;
  
  debugPanel = document.createElement('div');
  debugPanel.id = 'print-debug-panel';
  debugPanel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 350px;
    max-height: 80vh;
    background: rgba(0, 0, 0, 0.9);
    color: #00ff00;
    padding: 15px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 12px;
    z-index: 9999999;
    overflow-y: auto;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  `;
  
  const title = document.createElement('div');
  title.style.cssText = 'color: #fff; font-weight: bold; margin-bottom: 10px; font-size: 14px;';
  title.textContent = '🐛 DEBUG IMPRESSION';
  debugPanel.appendChild(title);
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ Fermer';
  closeBtn.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    background: #ff4444;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
  `;
  closeBtn.onclick = () => {
    debugPanel.style.display = 'none';
  };
  debugPanel.appendChild(closeBtn);
  
  const logContainer = document.createElement('div');
  logContainer.id = 'debug-logs';
  logContainer.style.cssText = 'margin-top: 10px;';
  debugPanel.appendChild(logContainer);
  
  document.body.appendChild(debugPanel);
}

function debugLog(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const colors = {
    info: '#00ff00',
    error: '#ff4444',
    warn: '#ffaa00',
    success: '#00ff88'
  };
  
  const log = { timestamp, message, type, color: colors[type] || colors.info };
  debugLogs.push(log);
  
  // Garder seulement les 50 derniers logs
  if (debugLogs.length > 50) {
    debugLogs.shift();
  }
  
  // Afficher dans la console standard aussi
  console.log(`[${timestamp}] ${message}`);
  
  // Mettre à jour le panneau
  if (!debugPanel) {
    createDebugPanel();
  }
  
  const logContainer = document.getElementById('debug-logs');
  if (logContainer) {
    const logDiv = document.createElement('div');
    logDiv.style.cssText = `
      color: ${log.color};
      margin: 5px 0;
      padding: 5px;
      border-left: 3px solid ${log.color};
      padding-left: 8px;
      background: rgba(255,255,255,0.05);
    `;
    logDiv.textContent = `[${timestamp}] ${message}`;
    logContainer.insertBefore(logDiv, logContainer.firstChild);
  }
}

// Helper pour optimiser l'image (redimensionnement + compression)
const optimizeImageForPrint = async (imageUrl, imageBlob) => {
  try {
    debugLog('🔄 Début optimisation image...', 'info');
    
    // Créer une image temporaire pour charger la source
    const tempImg = new Image();
    tempImg.crossOrigin = "Anonymous";
    
    await new Promise(async (resolveLoad, rejectLoad) => {
      tempImg.onload = resolveLoad;
      tempImg.onerror = (e) => {
        // Si erreur de chargement direct (souvent CORS), on essaie via fetch
        console.warn("⚠️ Échec chargement direct image (probablement CORS), tentative via fetch...");
        
        if (!imageBlob && imageUrl && imageUrl.startsWith('http')) {
          // Cache busting pour le fetch aussi
          const urlWithCacheBust = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 'cors_bust=' + new Date().getTime();
          fetch(urlWithCacheBust, { mode: 'cors' })
            .then(res => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.blob();
            })
            .then(blob => {
              const blobUrl = URL.createObjectURL(blob);
              tempImg.onload = () => {
                resolveLoad();
                // Nettoyage du blob url après chargement
                // URL.revokeObjectURL(blobUrl); // On le garde un peu pour le drawImage
              };
              tempImg.onerror = rejectLoad; // Si ça échoue encore, c'est fini
              tempImg.src = blobUrl;
            })
            .catch(fetchErr => {
              console.error("❌ Échec fetch image:", fetchErr);
              rejectLoad(new Error(`Impossible de charger l'image (CORS/Network): ${e.type}`));
            });
        } else {
          rejectLoad(new Error(`Erreur chargement image: ${e.type}`));
        }
      };
      
      // Si on a un blob, on crée une URL temporaire, sinon on utilise l'URL directe
      const srcBase = imageBlob ? URL.createObjectURL(imageBlob) : imageUrl;
      // AJOUT: Cache busting pour forcer le rechargement des headers CORS (évite le cache navigateur pollué)
      if (!imageBlob && srcBase.startsWith('http')) {
         tempImg.src = srcBase + (srcBase.includes('?') ? '&' : '?') + 'cors_bust=' + new Date().getTime();
      } else {
         tempImg.src = srcBase;
      }
    });

    debugLog(`📐 Image source: ${tempImg.width}x${tempImg.height}px`, 'info');

    // Créer un canvas pour le redimensionnement
    const canvas = document.createElement('canvas');
    let width = tempImg.width;
    let height = tempImg.height;
    
    // Limiter à 1800px (résolution max pour 10x15cm à 300dpi)
    const MAX_DIMENSION = 1800;
    
    if (width > height) {
      if (width > MAX_DIMENSION) {
        height *= MAX_DIMENSION / width;
        width = MAX_DIMENSION;
      }
    } else {
      if (height > MAX_DIMENSION) {
        width *= MAX_DIMENSION / height;
        height = MAX_DIMENSION;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    // Fond blanc pour éviter la transparence noire
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(tempImg, 0, 0, width, height);
    
    // Convertir en JPEG compressé (qualité 0.8 est largement suffisant pour l'impression thermique)
    const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.80);
    
    debugLog(`✅ Image optimisée: ${width}x${height}px (${Math.round(optimizedDataUrl.length / 1024)}KB)`, 'success');
    
    // Nettoyage
    if (imageBlob) URL.revokeObjectURL(tempImg.src);
    
    return optimizedDataUrl;
    
  } catch (error) {
    debugLog(`⚠️ Erreur optimisation: ${error.message}`, 'error');
    console.error("⚠️ Erreur optimisation image:", error);
    // En cas d'erreur, retourner l'original (converti en base64 si blob)
    if (imageBlob) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(imageBlob);
      });
    }
    return imageUrl;
  }
};

export const printImageToAirPrint = async (imageUrl, imageBlob, format = 'portrait') => {
  // 0. Mode Hot Folder (Serveur)
  // Si activé via localStorage, on envoie au serveur au lieu d'imprimer via le navigateur
  // Pour activer: ouvrir la console et taper: localStorage.setItem('useHotFolder', 'true')
  if (typeof window !== 'undefined' && localStorage.getItem('useHotFolder') === 'true') {
    return printViaHotFolder(imageUrl, imageBlob);
  }

  // Déterminer les dimensions CSS en fonction du format demandé
  // Par défaut: portrait 10x15cm
  let cssWidth = '100mm';
  let cssHeight = '150mm';
  let pageSize = '100mm 150mm'; // Portrait

  if (format === 'landscape') {
    cssWidth = '150mm';
    cssHeight = '100mm';
    pageSize = '150mm 100mm'; // Landscape
  } else if (format === 'square') {
    // Pour le carré, on imprime souvent sur du 10x15 avec des marges, ou sur du papier spécifique
    // Ici on définit la zone d'impression comme carrée 10x10
    cssWidth = '100mm';
    cssHeight = '100mm';
    pageSize = '100mm 100mm'; 
  }

  // Préparer l'image optimisée (utilisée pour Kiosk Pro ET Fallback)
  // Cela résout souvent les problèmes de page blanche dus à des images trop lourdes
  let optimizedImageSrc = imageUrl;
  try {
    optimizedImageSrc = await optimizeImageForPrint(imageUrl, imageBlob);
  } catch (e) {
    console.error("Echec optimisation, utilisation original", e);
  }

  // 1. Détection Kiosk Pro (pour impression silencieuse)
  // Nécessite Kiosk Pro Plus ou Enterprise et une configuration correcte de l'imprimante dans l'app
  // NOTE: Désactivé temporairement car l'API native produit des écrans blancs sur certaines versions.
  // On privilégie la méthode standard (iframe + window.print) qui fonctionne correctement dans le WebView (comme Safari).
  /* 
  if (typeof window !== 'undefined' && window.kioskpro && window.kioskpro.printing && window.kioskpro.printing.print) {
    try {
      console.log('📱 Kiosk Pro détecté, tentative d\'impression directe...');
      
      // Utiliser l'image optimisée (Base64)
      // Kiosk Pro gère mieux les Base64 optimisés que les URLs distantes ou les blobs bruts
      const targetUrl = optimizedImageSrc;
      
      console.log('📦 Envoi image optimisée à Kiosk Pro (taille:', targetUrl.length, ')');
      
      // Appel API Kiosk Pro: print(url, printerId)
      // On laisse printerId vide ("") pour utiliser l'imprimante par défaut configurée dans Kiosk Pro
      const result = window.kioskpro.printing.print(targetUrl, "");
      console.log('✅ Commande Kiosk Pro envoyée, code retour:', result);
      return true;
    } catch (kpError) {
      console.error('⚠️ Erreur API Kiosk Pro, passage au fallback:', kpError);
      // On continue vers le fallback standard si l'API échoue
    }
  }
  */

  // 2. Fallback: Impression navigateur standard (avec dialogue)
  // APPROCHE HYBRIDE: Popup pour desktop, iframe pour iOS/iPad
  return new Promise(async (resolve, reject) => {
    try {
      const imageSrc = optimizedImageSrc;
      
      // Détecter iOS/iPad
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      
      debugLog(`🖨️ Plateforme: ${isIOS ? 'iOS/iPad' : 'Desktop'}`, 'info');
      debugLog(`📄 Format: ${format}`, 'info');
      debugLog(`📏 Page size: ${pageSize}`, 'info');
      console.log('🖨️ Plateforme détectée:', isIOS ? 'iOS/iPad' : 'Desktop');

      // Créer un HTML complet avec l'image en base64
      const printHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Impression Photo</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      margin: 0;
      padding: 0;
    }
    
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      background: #f0f0f0;
      position: relative;
    }
    
    .preview-container {
      width: 90%;
      height: 90%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: white;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      padding: 20px;
    }
    
    .preview-label {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 18px;
      font-weight: bold;
      color: #333;
      margin-bottom: 15px;
      text-align: center;
    }
    
    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border: 2px solid #ddd;
      border-radius: 5px;
    }
    
    @media print {
      @page {
        size: ${pageSize};
        margin: 0;
      }
      
      * {
        page-break-inside: avoid;
        page-break-after: avoid;
        page-break-before: avoid;
      }
      
      html, body {
        background: white;
        width: 99%;
        height: 99%;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      
      body {
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
      }
      
      .preview-container {
        width: 100%;
        height: 100%;
        box-shadow: none;
        border-radius: 0;
        padding: 0;
        margin: 0;
        background: white;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
        page-break-inside: avoid;
        transform: scale(0.98);
        transform-origin: center;
      }
      
      .preview-label {
        display: none;
      }
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        border: none;
        display: block;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="preview-container">
    <div class="preview-label">📸 Aperçu avant impression</div>
    <img src="${imageSrc}" id="printImg" alt="Photo" />
  </div>
  <script>
    // Ne PAS auto-print - laisser l'iframe gérer manuellement
    console.log('🖼️ Preview HTML chargé');
    document.getElementById('printImg').onload = function() {
      console.log('✅ Image chargée dans preview');
    };
  </script>
</body>
</html>`;

      if (isIOS) {
        // MÉTHODE iOS: Utiliser un iframe (les popups sont bloquées sur iOS)
        debugLog('📱 Méthode: iframe (iOS)', 'info');
        console.log('📱 Méthode iOS: iframe');
        
        // Créer un iframe VISIBLE pour le preview sur iPad
        let printFrame = document.getElementById('print-iframe');
        if (!printFrame) {
          printFrame = document.createElement('iframe');
          printFrame.id = 'print-iframe';
          printFrame.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
            z-index: 999999;
            background: white;
            display: block;
          `;
          document.body.appendChild(printFrame);
          debugLog('✅ Iframe créé et visible', 'success');
        } else {
          // Réafficher l'iframe si elle était cachée
          printFrame.style.display = 'block';
          printFrame.style.background = 'white';
        }
        
        // Écrire le HTML dans l'iframe
        const iframeDoc = printFrame.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(printHTML);
        iframeDoc.close();
        
        debugLog('✅ HTML injecté dans iframe', 'success');
        console.log('✅ Iframe créé et HTML injecté');
        
        // Attendre que l'image soit chargée puis lancer l'impression
        setTimeout(() => {
          try {
            debugLog('🖨️ Appel contentWindow.print()...', 'info');
            debugLog('👁️ Preview visible - Vérifiez l\'image à l\'écran', 'warn');
            console.log('📱 window.print() sur iframe - Preview affiché');
            
            // Appel de l'impression
            printFrame.contentWindow.print();
            debugLog('✅ Dialogue d\'impression ouvert', 'success');
            
            // Masquer l'iframe après un délai plus long (laisser le temps de voir)
            setTimeout(() => {
              if (printFrame && printFrame.parentNode) {
                printFrame.style.display = 'none';
                debugLog('🚫 Iframe masqué', 'info');
              }
              resolve(true);
            }, 3000);
          } catch (e) {
            debugLog(`❌ ERREUR: ${e.message}`, 'error');
            console.error('❌ Erreur impression iframe:', e);
            if (printFrame && printFrame.parentNode) {
              printFrame.style.display = 'none';
            }
            reject(e);
          }
        }, 800);
        
      } else {
        // MÉTHODE DESKTOP: Utiliser window.open() avec HTML simplifié pour impression directe
        debugLog('🖥️ Méthode: window.open (Desktop)', 'info');
        console.log('🖥️ Méthode Desktop: window.open()');
        
        // HTML simplifié sans preview pour desktop
        const desktopPrintHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Impression Photo</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: 100vw;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: white;
    }
    
    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    
    @media print {
      @page {
        size: ${pageSize};
        margin: 0;
      }
      
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      
      body {
        display: flex;
        justify-content: center;
        align-items: center;
      }
      
      img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        display: block;
      }
    }
  </style>
</head>
<body>
  <img src="${imageSrc}" id="printImg" />
  <script>
    document.getElementById('printImg').onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 500);
      }, 100);
    };
  </script>
</body>
</html>`;
        
        const blob = new Blob([desktopPrintHTML], { type: 'text/html' });
        const blobURL = URL.createObjectURL(blob);
        
        const printWindow = window.open(blobURL, '_blank', 'width=800,height=600');
        
        if (!printWindow) {
          const isKioskMode = window.matchMedia('(display-mode: fullscreen)').matches;
          
          debugLog('❌ Popup bloqué!', 'error');
          console.error('❌ Impossible d\'ouvrir la fenêtre (popup bloqué)');
          
          if (!isKioskMode) {
            debugLog('⚠️ MODE KIOSQUE NON DÉTECTÉ', 'error');
            debugLog('📋 Solution: Lancez le script start-photobooth-silent.bat', 'info');
            console.warn('⚠️ ATTENTION: Vous devez utiliser Chrome en mode kiosque pour l\'impression automatique!');
            console.warn('📋 Téléchargez et lancez le script: start-photobooth-silent.bat');
          }
          
          reject(new Error('Popup bloqué - Mode kiosque requis'));
          return;
        }
        
        debugLog('✅ Fenêtre popup ouverte', 'success');
        console.log('✅ Fenêtre d\'impression ouverte');
        
        setTimeout(() => {
          URL.revokeObjectURL(blobURL);
          debugLog('🧹 Nettoyage effectué', 'info');
          resolve(true);
        }, 2000);
      }

    } catch (error) {
      debugLog(`❌ ERREUR FATALE: ${error.message}`, 'error');
      console.error("❌ Erreur lors de la préparation de l'impression:", error);
      reject(error);
    }
  });
};
/**
 * Détecte si l'application tourne dans Kiosk Pro
 */
export const isKioskPro = () => {
  return typeof window !== 'undefined' && (window.kioskpro || /Kiosk Pro/.test(navigator.userAgent));
};

/**
 * Envoie l'image vers le dossier surveillé (Hot Folder) sur le serveur
 * Utile pour l'impression automatique via DNP Hot Folder Print
 */
export const printViaHotFolder = async (imageUrl, imageBlob) => {
  console.log('🖨️ Tentative d\'impression via Hot Folder...');
  try {
    let body = { imageUrl };
    
    // Si on a un blob, on le convertit en base64 pour l'envoyer à l'API
    if (imageBlob) {
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(imageBlob);
      });
      body.imageBase64 = base64;
    }

    const response = await fetch('/api/print-hotfolder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de l\'envoi au Hot Folder');
    }

    console.log('✅ Impression Hot Folder réussie:', data.path);
    return true;

  } catch (error) {
    console.error('❌ Erreur impression Hot Folder:', error);
    return false;
  }
};
