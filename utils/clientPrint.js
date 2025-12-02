/**
 * Service d'impression côté client (Browser / iPad)
 * Remplace l'API serveur qui ne peut pas accéder au réseau local.
 */

export const printImageToAirPrint = async (imageUrl, imageBlob) => {
  // 1. Détection Kiosk Pro (pour impression silencieuse)
  // Nécessite Kiosk Pro Plus ou Enterprise et une configuration correcte de l'imprimante dans l'app
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

  // 2. Fallback: Impression navigateur standard (avec dialogue)
  return new Promise(async (resolve, reject) => {
    try {
      // FIX: Utiliser Base64 au lieu de Blob URL pour éviter que la ressource ne soit inaccessible
      // lors de l'envoi réel à l'imprimante (page blanche sur iPad)
      let imageSrc = imageUrl;
      if (imageBlob) {
        try {
          const reader = new FileReader();
          imageSrc = await new Promise((res, rej) => {
            reader.onloadend = () => res(reader.result);
            reader.onerror = rej;
            reader.readAsDataURL(imageBlob);
          });
        } catch (e) {
          console.error("Erreur conversion blob vers base64:", e);
          // Fallback sur l'URL si la conversion échoue
          imageSrc = imageUrl;
        }
      }

      // Nettoyer l'ancienne iframe si elle existe pour éviter l'accumulation
      const oldIframe = document.getElementById('print-iframe-hidden');
      if (oldIframe) {
        document.body.removeChild(oldIframe);
      }

      // Créer une iframe invisible mais avec des dimensions pour que le rendu fonctionne
      const iframe = document.createElement('iframe');
      iframe.id = 'print-iframe-hidden';
      iframe.style.position = 'fixed';
      // Utiliser opacity: 0 et z-index négatif au lieu de le sortir de l'écran
      // Cela garantit que le navigateur effectue le rendu graphique (nécessaire pour l'impression d'images sur iOS)
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = '100mm'; // Format 10x15cm
      iframe.style.height = '150mm';
      iframe.style.zIndex = '-9999';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.border = '0';
      
      document.body.appendChild(iframe);

      // 3. Définir le contenu de l'iframe
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Impression</title>
            <style>
              @page { 
                size: 100mm 150mm; 
                margin: 0; 
              }
              html, body { 
                width: 100mm;
                height: 150mm;
                margin: 0 !important; 
                padding: 0 !important;
                overflow: hidden !important;
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
                display: block; 
                margin: 0;
                padding: 0;
              }
            </style>
          </head>
          <body>
            <img src="${imageSrc}" id="printImage" />
            <script>
              // Attendre que l'image soit chargée avant d'imprimer
              const img = document.getElementById('printImage');
              
              function doPrint() {
                // Focus nécessaire pour certains navigateurs
                window.focus();
                
                // Délai augmenté pour garantir le décodage de l'image sur iPad (évite page blanche)
                setTimeout(() => {
                  try {
                    window.print();
                  } catch(e) {
                    console.error('Print error:', e);
                  }
                }, 1000);
              }

              if (img.complete) {
                doPrint();
              } else {
                img.onload = doPrint;
              }
            </script>
          </body>
        </html>
      `);
      doc.close();

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
