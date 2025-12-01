/**
 * Service d'impression côté client (Browser / iPad)
 * Remplace l'API serveur qui ne peut pas accéder au réseau local.
 */

export const printImageToAirPrint = async (imageUrl, imageBlob) => {
  return new Promise((resolve, reject) => {
    try {
      // 1. Détection Kiosk Pro (pour impression silencieuse)
      // Nécessite Kiosk Pro Plus ou Enterprise et une configuration correcte de l'imprimante dans l'app
      if (typeof window !== 'undefined' && window.kioskpro && window.kioskpro.printing && window.kioskpro.printing.print) {
        console.log('📱 Kiosk Pro détecté, tentative d\'impression directe...');
        
        // Utiliser l'URL distante (S3)
        // Note: Kiosk Pro doit avoir accès à internet pour télécharger l'image
        const targetUrl = imageUrl; 
        
        // Appel API Kiosk Pro: print(url, printerId)
        // On laisse printerId vide ("") pour utiliser l'imprimante par défaut configurée dans Kiosk Pro
        // Si une imprimante spécifique est requise, il faudrait son ID (ex: "Brother QL-820NWB")
        try {
          // Le résultat est généralement 1 (succès de l'envoi) ou 0 (échec)
          const result = window.kioskpro.printing.print(targetUrl, "");
          console.log('✅ Commande Kiosk Pro envoyée, code retour:', result);
          resolve(true);
          return;
        } catch (kpError) {
          console.error('⚠️ Erreur API Kiosk Pro, passage au fallback:', kpError);
          // On continue vers le fallback standard si l'API échoue
        }
      }

      // 2. Fallback: Impression navigateur standard (avec dialogue)
      // Créer une URL locale pour l'image (évite les problèmes CORS et re-téléchargement)
      const blobUrl = imageBlob ? URL.createObjectURL(imageBlob) : imageUrl;

      // Créer une iframe invisible
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden'; // Utiliser visibility hidden au lieu de display none pour que le rendu se fasse
      
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
                size: 4in 6in; /* Format standard DNP 10x15 */
                margin: 0; 
              }
              body { 
                margin: 0; 
                padding: 0;
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
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
            <img src="${blobUrl}" id="printImage" />
            <script>
              // Attendre que l'image soit chargée avant d'imprimer
              const img = document.getElementById('printImage');
              
              function doPrint() {
                // Focus nécessaire pour certains navigateurs
                window.focus();
                
                // Lancer l'impression
                window.print();
                
                // Signaler au parent que c'est fait (via postMessage si besoin, ou juste fermer)
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

      // 4. Nettoyage (après un délai suffisant pour que le dialogue s'ouvre)
      // Sur iOS, le script s'arrête quand le dialogue d'impression est ouvert
      setTimeout(() => {
        document.body.removeChild(iframe);
        if (imageBlob) URL.revokeObjectURL(blobUrl);
        resolve(true);
      }, 2000); // 2 secondes de délai

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
