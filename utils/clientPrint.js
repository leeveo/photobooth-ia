import { jsPDF } from "jspdf";

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

  // 2. Fallback: Impression PDF (pour éviter les marges Safari)
  // Au lieu d'imprimer une page HTML (qui ajoute des headers/footers), on génère un PDF
  // iOS imprime les PDF sans ajouter d'artefacts de navigateur.
  return new Promise(async (resolve, reject) => {
    try {
      console.log('📄 Génération PDF pour impression AirPrint...');
      
      // Dimensions en mm pour 10x15cm (4x6 pouces)
      // 4x6 pouces = 101.6 x 152.4 mm
      let pdfWidth = 101.6;
      let pdfHeight = 152.4;
      let orientation = 'p'; // portrait

      if (format === 'landscape') {
        pdfWidth = 152.4;
        pdfHeight = 101.6;
        orientation = 'l'; // landscape
      } else if (format === 'square') {
        pdfWidth = 101.6;
        pdfHeight = 101.6;
        orientation = 'p';
      }

      // Créer le PDF avec les dimensions exactes
      const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      // Charger l'image
      let imageData = imageUrl;
      
      // Si on a un blob ou une URL distante, il faut la convertir en base64 pour jsPDF
      if (imageBlob) {
        const reader = new FileReader();
        imageData = await new Promise((res, rej) => {
          reader.onload = () => res(reader.result);
          reader.onerror = rej;
          reader.readAsDataURL(imageBlob);
        });
      } else {
        // Si c'est une URL, on la télécharge et convertit
        const img = new Image();
        img.crossOrigin = "Anonymous";
        imageData = await new Promise((res, rej) => {
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            res(canvas.toDataURL('image/jpeg'));
          };
          img.onerror = rej;
          img.src = imageUrl;
        });
      }

      // Ajouter l'image au PDF (remplit toute la page)
      doc.addImage(imageData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      // Sauvegarder/Ouvrir le PDF pour impression
      // Sur iOS, doc.autoPrint() ne fonctionne pas toujours bien, 
      // mais ouvrir le blob dans une nouvelle fenêtre déclenche souvent le viewer PDF natif qui a un bouton print propre.
      
      // Méthode 1: Ouvrir dans une nouvelle fenêtre (souvent bloqué par popup blocker)
      // const pdfBlob = doc.output('bloburl');
      // window.open(pdfBlob, '_blank');

      // Méthode 2: Utiliser l'iframe existante pour charger le PDF
      // C'est la méthode la plus fiable pour iOS sans popup
      const pdfDataUri = doc.output('datauristring');
      
      const oldIframe = document.getElementById('print-iframe-hidden');
      if (oldIframe) document.body.removeChild(oldIframe);

      const iframe = document.createElement('iframe');
      iframe.id = 'print-iframe-hidden';
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      
      // Sur iOS, pour imprimer un PDF sans dialogue, c'est complexe.
      // Le mieux est d'ouvrir le PDF dans un nouvel onglet et laisser l'utilisateur faire "Partager -> Imprimer"
      // OU utiliser une librairie comme print.js, mais jsPDF a sa propre méthode.
      
      // APPROCHE HYBRIDE : On utilise window.open avec le blob PDF.
      // C'est le seul moyen fiable d'avoir un rendu "Document" et pas "Page Web" sur iOS.
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      // Créer un lien invisible et cliquer dessus (contourne parfois les bloqueurs)
      // Ou ouvrir directement.
      
      // Sur iPad, l'expérience utilisateur la plus propre pour éviter les marges est d'afficher le PDF
      // et laisser l'utilisateur imprimer via le bouton de partage natif.
      // Mais pour l'automatisation, on peut essayer d'injecter le PDF dans l'iframe et print l'iframe.
      
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.print();
        }, 500);
      };

      // Fallback si l'iframe print ne marche pas (fréquent sur iOS pour les PDF dans iframe)
      // On ouvre une nouvelle fenêtre après un court délai si l'utilisateur n'a rien vu
      // (Optionnel, à voir selon les tests)

      resolve(true);

    } catch (error) {
      console.error("❌ Erreur génération PDF:", error);
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
