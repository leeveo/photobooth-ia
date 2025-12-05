/**
 * Service d'impression côté client (Browser / iPad)
 * Remplace l'API serveur qui ne peut pas accéder au réseau local.
 */

// Helper pour optimiser l'image (redimensionnement + compression)
const optimizeImageForPrint = async (imageUrl, imageBlob) => {
  try {
    // Créer une image temporaire pour charger la source
    const tempImg = new Image();
    tempImg.crossOrigin = "Anonymous";
    
    await new Promise((resolveLoad, rejectLoad) => {
      tempImg.onload = resolveLoad;
      tempImg.onerror = rejectLoad;
      // Si on a un blob, on crée une URL temporaire, sinon on utilise l'URL directe
      tempImg.src = imageBlob ? URL.createObjectURL(imageBlob) : imageUrl;
    });

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
    
    console.log(`✅ Image optimisée pour impression: ${width}x${height}px`);
    
    // Nettoyage
    if (imageBlob) URL.revokeObjectURL(tempImg.src);
    
    return optimizedDataUrl;
    
  } catch (error) {
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
  // APPROCHE FINALE KIOSK PRO: Créer une page HTML simple avec juste l'image
  // Kiosk Pro ne capture pas correctement les overlays dynamiques
  return new Promise(async (resolve, reject) => {
    try {
      const imageSrc = optimizedImageSrc;
      
      console.log('🖨️ Méthode: Création HTML simple pour Kiosk Pro');

      // Créer un HTML complet avec l'image en base64
      const printHTML = `
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
      
      body {
        width: 100%;
        height: 100%;
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
    }
  </style>
</head>
<body>
  <img src="${imageSrc}" onload="setTimeout(function(){window.print(); setTimeout(function(){window.close();}, 500);}, 100);" />
</body>
</html>`;

      console.log('📄 HTML créé, ouverture de la fenêtre d\'impression...');
      
      // Créer un Blob avec le HTML
      const blob = new Blob([printHTML], { type: 'text/html' });
      const blobURL = URL.createObjectURL(blob);
      
      // Ouvrir dans une nouvelle fenêtre
      const printWindow = window.open(blobURL, '_blank', 'width=800,height=600');
      
      if (!printWindow) {
        console.error('❌ Impossible d\'ouvrir la fenêtre d\'impression (popup bloqué?)');
        reject(new Error('Popup bloqué - impossible d\'ouvrir la fenêtre d\'impression'));
        return;
      }
      
      console.log('✅ Fenêtre d\'impression ouverte');
      
      // Nettoyer l'URL après un délai
      setTimeout(() => {
        URL.revokeObjectURL(blobURL);
        console.log('🧹 Blob URL nettoyé');
        resolve(true);
      }, 2000);

    } catch (error) {
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
