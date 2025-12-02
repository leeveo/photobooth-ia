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
      // Au lieu de 0x0, on la place hors écran avec une taille standard
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = '100mm'; // Format 10x15cm
      iframe.style.height = '150mm';
      iframe.style.border = '0';
      // Note: visibility: hidden peut empêcher le rendu du contenu dans certains navigateurs lors de l'impression
      // Le positionnement hors écran est plus sûr.
      
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
                size: 100mm 150mm; /* Format standard DNP 10x15 */
                margin: 0; 
              }
              html, body { 
                margin: 0; 
                padding: 0;
                width: 100%;
                height: 100%;
                overflow: hidden; /* Empêcher le débordement sur une 2ème page */
              }
              body {
                display: flex; 
                justify-content: center; 
                align-items: center; 
                background: white;
              }
              img { 
                width: 100%; 
                height: 100%; 
                object-fit: cover; /* Remplir tout l'espace */
                display: block; 
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
                
                // Petit délai supplémentaire pour garantir le rendu sur iPad
                setTimeout(() => {
                  try {
                    window.print();
                  } catch(e) {
                    console.error('Print error:', e);
                  }
                }, 250);
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
