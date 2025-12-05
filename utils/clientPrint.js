/**
 * Service d'impression côté client (Browser / iPad)
 * Remplace l'API serveur qui ne peut pas accéder au réseau local.
 */

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

  // 1. Détection Kiosk Pro (pour impression silencieuse)
  // NOTE: On désactive l'API JS car elle cause des problèmes d'autorisation et de page blanche.
  // On force l'utilisation de window.print() avec une stratégie CSS robuste.
  /*
  if (typeof window !== 'undefined' && window.kioskpro && window.kioskpro.printing && window.kioskpro.printing.print) {
    try {
      console.log('📱 Kiosk Pro détecté, tentative d\'impression directe via API JS...');
      
      // Utiliser l'URL distante (S3)
      // Note: Kiosk Pro doit avoir accès à internet pour télécharger l'image
      let targetUrl = imageUrl; 

      // TENTATIVE DE FIX PAGE BLANCHE :
      // Si on a un blob, on le convertit en Base64.
      // Kiosk Pro gère souvent mieux les Data URLs que les URLs distantes (problèmes de cache, auth, ou téléchargement)
      if (imageBlob) {
        try {
          const reader = new FileReader();
          targetUrl = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(imageBlob);
          });
          console.log('📦 Image convertie en Base64 pour Kiosk Pro (taille:', targetUrl.length, ')');
        } catch (b64Error) {
          console.error('⚠️ Erreur conversion Base64, utilisation URL distante:', b64Error);
        }
      }
      
      // Appel API Kiosk Pro: print(url, printerId)
      // On laisse printerId vide ("") pour utiliser l'imprimante par défaut configurée dans Kiosk Pro
      // Si une imprimante spécifique est requise, il faudrait son ID (ex: "Brother QL-820NWB")
      
      // Le résultat est généralement 1 (succès de l'envoi) ou 0 (échec)
      const result = window.kioskpro.printing.print(targetUrl, "");
      console.log('✅ Commande Kiosk Pro envoyée, code retour:', result);
      return true;
    } catch (kpError) {
      console.error('⚠️ Erreur API Kiosk Pro, passage au fallback:', kpError);
      // On continue vers le fallback standard si l'API échoue
    }
  }
  */
  /*
  if (typeof window !== 'undefined' && window.kioskpro && window.kioskpro.printing && window.kioskpro.printing.print) {
    try {
      console.log('📱 Kiosk Pro détecté, tentative d\'impression directe...');
      
      // Utiliser l'URL distante (S3)
      // Note: Kiosk Pro doit avoir accès à internet pour télécharger l'image
      let targetUrl = imageUrl; 

      // TENTATIVE DE FIX PAGE BLANCHE :
      // Si on a un blob, on le convertit en Base64.
      // Kiosk Pro gère souvent mieux les Data URLs que les URLs distantes (problèmes de cache, auth, ou téléchargement)
      if (imageBlob) {
        try {
          const reader = new FileReader();
          targetUrl = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(imageBlob);
          });
          console.log('📦 Image convertie en Base64 pour Kiosk Pro (taille:', targetUrl.length, ')');
        } catch (b64Error) {
          console.error('⚠️ Erreur conversion Base64, utilisation URL distante:', b64Error);
        }
      }
      
      // Appel API Kiosk Pro: print(url, printerId)
      // On laisse printerId vide ("") pour utiliser l'imprimante par défaut configurée dans Kiosk Pro
      // Si une imprimante spécifique est requise, il faudrait son ID (ex: "Brother QL-820NWB")
      
      // Le résultat est généralement 1 (succès de l'envoi) ou 0 (échec)
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
      // FIX: Utiliser Base64 au lieu de Blob URL pour éviter que la ressource ne soit inaccessible
      // lors de l'envoi réel à l'imprimante (page blanche sur iPad)
      let imageSrc = imageUrl;
      
      // OPTIMISATION: Redimensionner et compresser l'image avant impression
      // Cela réduit drastiquement le temps de transfert vers l'imprimante (3-4min -> quelques secondes)
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
        ctx.drawImage(tempImg, 0, 0, width, height);
        
        // Convertir en JPEG compressé (qualité 0.8 est largement suffisant pour l'impression thermique)
        // Cela réduit la taille du fichier de plusieurs Mo à quelques centaines de Ko
        imageSrc = canvas.toDataURL('image/jpeg', 0.80);
        
        console.log(`✅ Image optimisée pour impression: ${width}x${height}px`);
        
        // Nettoyage
        if (imageBlob) URL.revokeObjectURL(tempImg.src);
        
      } catch (optError) {
        console.error("⚠️ Erreur optimisation image, utilisation fallback:", optError);
        // Fallback vers la méthode précédente si l'optimisation échoue
        if (imageBlob) {
          try {
            const reader = new FileReader();
            imageSrc = await new Promise((res, rej) => {
              reader.onloadend = () => res(reader.result);
              reader.onerror = rej;
              reader.readAsDataURL(imageBlob);
            });
          } catch (e) {
            imageSrc = imageUrl;
          }
        }
      }

      // Nettoyer l'ancienne iframe si elle existe pour éviter l'accumulation
      const oldIframe = document.getElementById('print-iframe-hidden');
      if (oldIframe) {
        document.body.removeChild(oldIframe);
      }

      // --- NOUVELLE STRATÉGIE POUR KIOSK PRO ---
      // L'utilisation d'une iframe empêche souvent Kiosk Pro de détecter correctement l'appel window.print()
      // pour son mode "Automatic Kiosk Print Mode".
      // On va donc injecter l'image directement dans le body principal, et utiliser @media print
      // pour masquer tout le reste. C'est la méthode recommandée pour les kiosques.

      // 1. Créer le conteneur d'impression s'il n'existe pas
      let printContainer = document.getElementById('print-container-main');
      if (!printContainer) {
        printContainer = document.createElement('div');
        printContainer.id = 'print-container-main';
        document.body.appendChild(printContainer);
      }
      
      // 2. Injecter le style d'impression global
      let printStyle = document.getElementById('print-style-global');
      if (!printStyle) {
        printStyle = document.createElement('style');
        printStyle.id = 'print-style-global';
        printStyle.innerHTML = `
          @media print {
            /* 
               FIX: Utiliser visibility: hidden au lieu de display: none 
               pour le body, car display: none retire les éléments du flux
               et peut empêcher l'impression de fonctionner correctement sur iOS.
               visibility: visible sur l'enfant surcharge visibility: hidden du parent.
            */
            body {
              visibility: hidden !important;
              background: white !important;
            }
            
            /* Afficher uniquement le conteneur d'impression */
            #print-container-main {
              visibility: visible !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: 100% !important;
              z-index: 2147483647 !important; /* Max z-index */
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
            }

            /* Configuration de la page */
            @page {
              size: ${pageSize};
              margin: 0 !important;
            }
            
            /* Image pleine page */
            #print-container-main img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            }
          }
          
          /* Masquer le conteneur d'impression à l'écran */
          @media screen {
            #print-container-main {
              display: none !important;
            }
          }
        `;
        document.head.appendChild(printStyle);
      } else {
        // Mettre à jour la taille de page si elle a changé (ex: portrait vs landscape)
        // On recrée le style pour être sûr que la regex fonctionne
        printStyle.innerHTML = `
          @media print {
            body {
              visibility: hidden !important;
              background: white !important;
            }
            #print-container-main {
              visibility: visible !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: 100% !important;
              z-index: 2147483647 !important;
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
            }
            @page {
              size: ${pageSize};
              margin: 0 !important;
            }
            #print-container-main img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            }
          }
          @media screen {
            #print-container-main {
              display: none !important;
            }
          }
        `;
      }

      // 3. Mettre l'image dans le conteneur
      // Utiliser une promesse pour attendre le chargement de l'image
      const img = new Image();
      img.src = imageSrc;
      img.alt = "Print";
      
      printContainer.innerHTML = ''; // Nettoyer
      printContainer.appendChild(img);

      // 4. Lancer l'impression sur la fenêtre principale
      // Attendre que l'image soit chargée
      const performPrint = () => {
        setTimeout(() => {
          try {
            console.log('🖨️ Lancement impression fenêtre principale...');
            window.print();
            
            // Nettoyage optionnel après délai
            setTimeout(() => {
              printContainer.innerHTML = '';
            }, 5000);
            
          } catch (e) {
            console.error('Print error:', e);
          }
        }, 500); // Petit délai supplémentaire pour le rendu
      };

      if (img.complete) {
        performPrint();
      } else {
        img.onload = performPrint;
        img.onerror = (e) => {
            console.error("Erreur chargement image print:", e);
            // Tenter d'imprimer quand même
            performPrint();
        };
      }

      resolve(true);
      return; // Fin de la nouvelle méthode

      /* ANCIENNE MÉTHODE IFRAME (Désactivée pour Kiosk Pro)
      // Créer une iframe invisible mais avec des dimensions pour que le rendu fonctionne
      const iframe = document.createElement('iframe');
      iframe.id = 'print-iframe-hidden';
      // ... (reste du code iframe)
      */

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
