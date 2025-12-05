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
  return new Promise(async (resolve, reject) => {
    try {
      // Utiliser l'image optimisée calculée plus haut
      const imageSrc = optimizedImageSrc;

      // Nettoyer l'ancienne iframe si elle existe pour éviter l'accumulation
      const oldIframe = document.getElementById('print-iframe-hidden');
      if (oldIframe) {
        document.body.removeChild(oldIframe);
      }

      // Créer une iframe pour l'impression
      const iframe = document.createElement('iframe');
      iframe.id = 'print-iframe-hidden';
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = cssWidth;
      iframe.style.height = cssHeight;
      iframe.style.border = '0';
      
      // FIX KIOSK PRO: Rendre l'iframe brièvement visible pour forcer le rendu dans le WebView
      // Kiosk Pro Enterprise a besoin que l'iframe soit visible pour effectuer le rendu de l'image
      iframe.style.zIndex = '9999';
      iframe.style.opacity = '1';
      iframe.style.pointerEvents = 'none';
      iframe.style.backgroundColor = 'white';
      
      document.body.appendChild(iframe);

      // 3. Attendre que l'iframe soit prête avant d'injecter le contenu
      iframe.onload = () => {
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>&nbsp;</title>
              <style>
                /* Reset global */
                * {
                  box-sizing: border-box;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }

                /* Configuration spécifique pour l'impression sans marges */
                @media print {
                  @page {
                    size: ${pageSize};
                    margin: 0 !important; /* Essentiel pour supprimer les headers/footers */
                  }
                  
                  html, body {
                    width: 100%;
                    height: 100%;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                  }
                }

                /* Styles généraux */
                html, body { 
                  width: 100%;
                  height: 100%;
                  margin: 0; 
                  padding: 0;
                  overflow: hidden;
                  background: white;
                }
                
                body {
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                }
                
                img { 
                  width: 100%; 
                  height: 100%; 
                  object-fit: cover;
                  object-position: center; 
                  display: block; 
                  /* Légère échelle pour garantir le bord à bord (bleed) et éviter les liserés blancs */
                  transform: scale(1.01); 
                  transform-origin: center;
                }
              </style>
            </head>
            <body>
              <img src="${imageSrc}" id="printImage" />
              <script>
                // FIX KIOSK PRO: Attendre que l'image soit complètement chargée ET rendue
                const img = document.getElementById('printImage');
                
                function waitForImageAndPrint() {
                  // Vérifier que l'image est chargée avec des dimensions valides
                  if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
                    console.log('Image ready:', img.naturalWidth, 'x', img.naturalHeight);
                    
                    // Forcer un reflow/repaint pour garantir le rendu dans Kiosk Pro
                    img.style.display = 'none';
                    img.offsetHeight; // Force reflow
                    img.style.display = 'block';
                    
                    // Attendre un cycle de rendu supplémentaire (requestAnimationFrame)
                    requestAnimationFrame(() => {
                      requestAnimationFrame(() => {
                        // Double RAF pour garantir le rendu complet
                        setTimeout(() => {
                          try {
                            console.log('Calling window.print()...');
                            window.focus();
                            window.print();
                            
                            // Masquer l'iframe après ouverture du dialogue
                            setTimeout(() => {
                              const parentIframe = window.frameElement;
                              if (parentIframe) {
                                parentIframe.style.opacity = '0';
                                parentIframe.style.zIndex = '-9999';
                              }
                            }, 500);
                          } catch(e) {
                            console.error('Print error:', e);
                          }
                        }, 500); // Délai final de sécurité
                      });
                    });
                  } else {
                    // Image pas encore prête, réessayer
                    console.log('Image not ready, waiting... complete:', img.complete, 'width:', img.naturalWidth);
                    setTimeout(waitForImageAndPrint, 100);
                  }
                }
                
                // Démarrer la vérification
                img.onload = () => {
                  console.log('Image onload triggered');
                  waitForImageAndPrint();
                };
                
                img.onerror = (e) => {
                  console.error('Image failed to load:', e);
                };
                
                // Lancer immédiatement au cas où l'image serait déjà en cache
                if (img.complete) {
                  console.log('Image already in cache');
                  waitForImageAndPrint();
                }
              </script>
            </body>
          </html>
        `);
        doc.close();
      };

      // 4. Nettoyage
      // IMPORTANT: Sur iPad/iOS, ne PAS supprimer l'iframe immédiatement.
      // Le spooler d'impression a besoin que le document existe encore.
      // On laisse l'iframe, elle sera nettoyée au prochain appel via son ID.
      resolve(true);

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
