'use client';

import { useState } from 'react';
import { RiCodeLine, RiClipboardLine, RiCheckLine, RiEyeLine, RiDownloadLine } from 'react-icons/ri';

const IframeIntegrationSection = ({ photoboothUrl }) => {
  const [selectedMode, setSelectedMode] = useState('newwindow');
  const [copiedCode, setCopiedCode] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Génération du code iframe pleine page avec option nouvelle fenêtre
  const generateFullscreenCode = () => {
    return `<!-- Photobooth en pleine page avec option nouvelle fenêtre -->
<div style="position: relative; width: 100%; height: 100vh;">
  <!-- Bouton pour ouvrir en nouvelle fenêtre (optionnel) -->
  <button 
    id="open-new-window-btn"
    onclick="openPhotoboothNewWindow()"
    style="
      position: absolute;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #7f5af0 0%, #ff80b5 100%);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(127, 90, 240, 0.3);
      z-index: 1000;
      transition: all 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    "
    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(127, 90, 240, 0.4)'"
    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(127, 90, 240, 0.3)'"
    title="Ouvrir dans une nouvelle fenêtre pour garantir l'accès caméra"
  >
    🚀 Nouvelle fenêtre
  </button>

  <!-- Iframe principal -->
  <iframe 
    src="${photoboothUrl}" 
    width="100%" 
    height="100%" 
    frameborder="0" 
    allowfullscreen
    allow="camera; microphone; autoplay; encrypted-media; fullscreen; picture-in-picture"
    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
    style="border: none; display: block;"
    title="Photobooth">
  </iframe>
</div>

<script>
function openPhotoboothNewWindow() {
  // Calcul de la taille optimale pour la fenêtre
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  
  // Dimensions de la fenêtre (90% de l'écran pour mode pleine page)
  const windowWidth = Math.min(1400, screenWidth * 0.9);
  const windowHeight = Math.min(900, screenHeight * 0.9);
  
  // Position centrée
  const left = (screenWidth - windowWidth) / 2;
  const top = (screenHeight - windowHeight) / 2;
  
  // Options de la fenêtre
  const windowFeatures = [
    \`width=\${windowWidth}\`,
    \`height=\${windowHeight}\`,
    \`left=\${left}\`,
    \`top=\${top}\`,
    'resizable=yes',
    'scrollbars=yes',
    'status=no',
    'menubar=no',
    'toolbar=no',
    'location=no'
  ].join(',');
  
  // Ouverture de la fenêtre
  const photoboothWindow = window.open(
    '${photoboothUrl}',
    'photobooth_fullscreen',
    windowFeatures
  );
  
  // Focus sur la nouvelle fenêtre
  if (photoboothWindow) {
    photoboothWindow.focus();
  } else {
    alert('Les popups sont bloqués. Veuillez autoriser les popups pour ce site et réessayer.');
  }
}
</script>`;
  };

  // Génération du code iframe popup responsive avec option nouvelle fenêtre
  const generatePopupCode = () => {
    return `<!-- Photobooth en popup responsive avec option nouvelle fenêtre -->
<div id="photobooth-popup-container"></div>

<script>
(function() {
  // Configuration du popup
  const photoboothConfig = {
    url: "${photoboothUrl}",
    buttonText: "📸 Photobooth",
    buttonColor: "#7f5af0",
    popupWidth: "480px",
    popupHeight: "720px", // Augmenté de 600px à 720px pour réduire le scroll
    useNewWindow: false // Changez à true pour forcer l'ouverture en nouvelle fenêtre
  };

  // CSS pour le popup
  const styles = \`
    #photobooth-trigger-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: \${photoboothConfig.buttonColor};
      color: white;
      border: none;
      border-radius: 50px;
      padding: 15px 20px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9998;
      transition: all 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    #photobooth-trigger-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.2);
    }
    
    #photobooth-popup {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: \${photoboothConfig.popupWidth};
      height: \${photoboothConfig.popupHeight};
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      z-index: 9999;
      display: none;
      overflow: hidden;
      border: 2px solid \${photoboothConfig.buttonColor};
    }
    
    #photobooth-popup.show {
      display: block;
      animation: slideUp 0.3s ease;
    }
    
    #photobooth-popup iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    
    #photobooth-close-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.7);
      color: white;
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      cursor: pointer;
      font-size: 18px;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    #photobooth-newwindow-btn {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(127, 90, 240, 0.9);
      color: white;
      border: none;
      border-radius: 15px;
      padding: 5px 10px;
      font-size: 12px;
      cursor: pointer;
      z-index: 10000;
      transition: all 0.3s ease;
    }
    
    #photobooth-newwindow-btn:hover {
      background: rgba(127, 90, 240, 1);
      transform: scale(1.05);
    }
    
    /* Notification d'aide pour la caméra */
    #camera-help-notification {
      position: absolute;
      bottom: 50px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 193, 7, 0.95);
      color: #856404;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 500;
      z-index: 10001;
      display: none;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border: 1px solid #ffeaa7;
    }
    
    @keyframes slideUp {
      from { 
        opacity: 0; 
        transform: translateY(20px) scale(0.95); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0) scale(1); 
      }
    }
    
    /* Responsive pour mobile */
    @media (max-width: 768px) {
      #photobooth-popup {
        bottom: 0;
        right: 0;
        left: 0;
        width: 100% !important;
        height: 85vh !important; /* Augmenté de 80vh à 85vh pour plus d'espace */
        border-radius: 12px 12px 0 0;
        max-height: 90vh; /* Hauteur maximale pour éviter les débordements */
      }
      
      #photobooth-trigger-btn {
        bottom: 15px;
        right: 15px;
        padding: 12px 16px;
        font-size: 14px;
      }
    }
    
    /* Optimisation pour tablettes */
    @media (max-width: 1024px) and (min-width: 769px) {
      #photobooth-popup {
        width: 500px !important;
        height: 750px !important;
      }
    }
  \`;

  // Injection du CSS
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Fonction pour ouvrir en nouvelle fenêtre
  function openInNewWindow() {
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const windowWidth = Math.min(1200, screenWidth * 0.8);
    const windowHeight = Math.min(800, screenHeight * 0.8);
    const left = (screenWidth - windowWidth) / 2;
    const top = (screenHeight - windowHeight) / 2;
    
    const windowFeatures = [
      \`width=\${windowWidth}\`,
      \`height=\${windowHeight}\`,
      \`left=\${left}\`,
      \`top=\${top}\`,
      'resizable=yes',
      'scrollbars=yes',
      'status=no',
      'menubar=no',
      'toolbar=no',
      'location=no'
    ].join(',');
    
    const photoboothWindow = window.open(photoboothConfig.url, 'photobooth', windowFeatures);
    if (photoboothWindow) {
      photoboothWindow.focus();
    } else {
      alert('Les popups sont bloqués. Veuillez autoriser les popups pour ce site.');
    }
  }

  // Création du bouton trigger
  const triggerBtn = document.createElement('button');
  triggerBtn.id = 'photobooth-trigger-btn';
  triggerBtn.textContent = photoboothConfig.buttonText;
  
  // Création du popup
  const popup = document.createElement('div');
  popup.id = 'photobooth-popup';
  
  const closeBtn = document.createElement('button');
  closeBtn.id = 'photobooth-close-btn';
  closeBtn.innerHTML = '&times;';
  
  const newWindowBtn = document.createElement('button');
  newWindowBtn.id = 'photobooth-newwindow-btn';
  newWindowBtn.innerHTML = '🚀 Nouvelle fenêtre';
  newWindowBtn.title = 'Ouvrir dans une nouvelle fenêtre pour un meilleur accès caméra';
  
  // Notification d'aide pour la caméra
  const cameraHelp = document.createElement('div');
  cameraHelp.id = 'camera-help-notification';
  cameraHelp.innerHTML = '💡 Caméra bloquée ? Cliquez sur "Nouvelle fenêtre" ↑';
  
  const iframe = document.createElement('iframe');
  iframe.src = photoboothConfig.url;
  iframe.title = 'Photobooth';
  // Permissions étendues pour un meilleur accès à la caméra
  iframe.setAttribute('allow', 'camera *; microphone *; autoplay; encrypted-media; fullscreen; picture-in-picture; display-capture; geolocation');
  iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-presentation allow-downloads');
  // Ajout de l'attribut importance pour prioriser le chargement
  iframe.setAttribute('importance', 'high');
  iframe.setAttribute('loading', 'eager');
  
  popup.appendChild(closeBtn);
  popup.appendChild(newWindowBtn);
  popup.appendChild(cameraHelp);
  popup.appendChild(iframe);
  
  // Ajout au DOM
  document.body.appendChild(triggerBtn);
  document.body.appendChild(popup);
  
  // Gestion des événements
  triggerBtn.addEventListener('click', function() {
    if (photoboothConfig.useNewWindow) {
      openInNewWindow();
    } else {
      popup.classList.add('show');
      // Message d'aide pour l'accès caméra
      setTimeout(() => {
        console.log('💡 Astuce: Si la caméra ne s\'active pas, utilisez le bouton "Nouvelle fenêtre" pour un accès garanti.');
      }, 1000);
      
      // Afficher la notification d'aide après 8 secondes
      setTimeout(() => {
        if (popup.classList.contains('show')) {
          cameraHelp.style.display = 'block';
          // Masquer la notification après 5 secondes
          setTimeout(() => {
            cameraHelp.style.display = 'none';
          }, 5000);
        }
      }, 8000);
    }
  });
  
  closeBtn.addEventListener('click', function() {
    popup.classList.remove('show');
    cameraHelp.style.display = 'none'; // Masquer la notification
  });
  
  newWindowBtn.addEventListener('click', function() {
    popup.classList.remove('show');
    cameraHelp.style.display = 'none'; // Masquer la notification
    openInNewWindow();
  });
  
  // Fermer en cliquant à l'extérieur
  document.addEventListener('click', function(e) {
    if (!popup.contains(e.target) && e.target !== triggerBtn) {
      popup.classList.remove('show');
      cameraHelp.style.display = 'none'; // Masquer la notification
    }
  });
})();
</script>`;
  };

  // Génération du code bouton nouvelle fenêtre (solution recommandée pour la caméra)
  const generateNewWindowCode = () => {
    return `<!-- Bouton Photobooth - Nouvelle fenêtre (Recommandé pour l'accès caméra) -->
<div style="text-align: center; margin: 20px 0;">
  <button 
    id="photobooth-btn"
    onclick="openPhotobooth()"
    style="
      background: linear-gradient(135deg, #7f5af0 0%, #ff80b5 100%);
      color: white;
      border: none;
      padding: 15px 30px;
      font-size: 18px;
      font-weight: bold;
      border-radius: 50px;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(127, 90, 240, 0.3);
      transition: all 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    "
    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(127, 90, 240, 0.4)'"
    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(127, 90, 240, 0.3)'"
  >
    📸 Ouvrir le Photobooth
  </button>
</div>

<script>
function openPhotobooth() {
  // Calcul de la taille optimale pour la fenêtre
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  
  // Dimensions de la fenêtre (80% de l'écran)
  const windowWidth = Math.min(1200, screenWidth * 0.8);
  const windowHeight = Math.min(800, screenHeight * 0.8);
  
  // Position centrée
  const left = (screenWidth - windowWidth) / 2;
  const top = (screenHeight - windowHeight) / 2;
  
  // Options de la fenêtre
  const windowFeatures = [
    \`width=\${windowWidth}\`,
    \`height=\${windowHeight}\`,
    \`left=\${left}\`,
    \`top=\${top}\`,
    'resizable=yes',
    'scrollbars=yes',
    'status=no',
    'menubar=no',
    'toolbar=no',
    'location=no'
  ].join(',');
  
  // Ouverture de la fenêtre
  const photoboothWindow = window.open(
    '${photoboothUrl}',
    'photobooth',
    windowFeatures
  );
  
  // Focus sur la nouvelle fenêtre
  if (photoboothWindow) {
    photoboothWindow.focus();
  } else {
    // Fallback si le popup est bloqué
    alert('Les popups sont bloqués. Veuillez autoriser les popups pour ce site et réessayer.');
  }
}
</script>`;
  };

  const getCodeByMode = () => {
    switch (selectedMode) {
      case 'newwindow':
        return generateNewWindowCode();
      case 'fullscreen':
        return generateFullscreenCode();
      case 'popup':
        return generatePopupCode();
      default:
        return generateNewWindowCode();
    }
  };

  const copyToClipboard = async (code, mode) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(mode);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie :', err);
    }
  };

  const downloadCode = (code, mode) => {
    const filename = `photobooth-${mode}-integration.html`;
    const blob = new Blob([`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Photobooth Integration - ${mode}</title>
</head>
<body>
${code}
</body>
</html>`], { type: 'text/html' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const modes = [
    {
      id: 'newwindow',
      name: 'Nouvelle Fenêtre',
      description: '⭐ Recommandé - Bouton qui ouvre dans une nouvelle fenêtre',
      icon: '🚀'
    },
    {
      id: 'fullscreen',
      name: 'Pleine Page',
      description: 'Iframe qui occupe toute la page',
      icon: '🖥️'
    },
    {
      id: 'popup',
      name: 'Popup Responsive',
      description: 'Bouton flottant + popup responsive',
      icon: '💬'
    }
  ];

  return (
    <div className="bg-gradient-to-br from-emerald-50 via-cyan-50 to-white p-6 rounded-2xl border-2 border-emerald-200 shadow-xl">
      {/* Header */}
      <div className="flex items-center mb-6">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg mr-3">
          <RiCodeLine className="h-6 w-6 text-white" />
        </span>
        <div>
          <h4 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-cyan-600 tracking-tight">
            Intégration Web
          </h4>
          <p className="text-sm text-gray-600">
            Intégrez le photobooth sur votre site web
          </p>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="mb-6">
        <h5 className="text-sm font-semibold text-gray-700 mb-3">Choisissez le mode d'intégration :</h5>
        <div className="grid grid-cols-1 gap-3">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedMode === mode.id
                  ? 'border-emerald-400 bg-emerald-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-25'
              }`}
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">{mode.icon}</span>
                <div>
                  <div className={`font-semibold ${
                    selectedMode === mode.id ? 'text-emerald-800' : 'text-gray-800'
                  }`}>
                    {mode.name}
                  </div>
                  <div className={`text-sm ${
                    selectedMode === mode.id ? 'text-emerald-600' : 'text-gray-600'
                  }`}>
                    {mode.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Code Display */}
      <div className="bg-gray-900 rounded-lg overflow-hidden shadow-inner">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span className="ml-4 text-gray-300 text-sm font-mono">
              {selectedMode}-integration.html
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => copyToClipboard(getCodeByMode(), selectedMode)}
              className="inline-flex items-center px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-md transition-colors"
            >
              {copiedCode === selectedMode ? (
                <>
                  <RiCheckLine className="h-4 w-4 mr-1" />
                  Copié !
                </>
              ) : (
                <>
                  <RiClipboardLine className="h-4 w-4 mr-1" />
                  Copier
                </>
              )}
            </button>
            <button
              onClick={() => downloadCode(getCodeByMode(), selectedMode)}
              className="inline-flex items-center px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-md transition-colors"
            >
              <RiDownloadLine className="h-4 w-4 mr-1" />
              Télécharger
            </button>
          </div>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
            {getCodeByMode()}
          </pre>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 space-y-4">
        {/* Avertissement important pour l'accès caméra */}
        <div className="p-4 bg-amber-50 rounded-lg border-l-4 border-amber-400">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h6 className="font-semibold text-amber-800 mb-2 flex items-center">
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Accès Caméra - Important !
              </h6>
              <div className="text-sm text-amber-700 space-y-2">
                <p><strong>✅ Pour que la caméra fonctionne dans l'iframe :</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Le site web doit être en <strong>HTTPS</strong> (pas HTTP)</li>
                  <li>L'utilisateur doit <strong>autoriser l'accès caméra</strong> lors de la première visite</li>
                  <li>Certains navigateurs peuvent bloquer l'accès caméra dans les iframes</li>
                  <li>Sur mobile : l'utilisateur peut avoir besoin d'autoriser manuellement</li>
                </ul>
                <p className="font-medium">
                  💡 <strong>Solution recommandée :</strong> Utilisez le mode popup qui ouvre le photobooth dans une nouvelle fenêtre
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions spécifiques par mode */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h6 className="font-semibold text-blue-800 mb-2 flex items-center">
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Instructions d'utilisation
          </h6>
          <div className="text-sm text-blue-700 space-y-1">
            {selectedMode === 'newwindow' && (
              <>
                <p>• Copiez le code et collez-le dans votre page HTML</p>
                <p>• Un bouton stylisé apparaîtra sur votre page</p>
                <p>• Clic sur le bouton = ouverture dans une nouvelle fenêtre</p>
                <p className="font-medium">✅ Solution idéale : accès caméra garanti !</p>
                <p className="font-medium">📱 Compatible tous appareils (PC, mobile, tablette)</p>
              </>
            )}
            {selectedMode === 'fullscreen' && (
              <>
                <p>• Copiez le code et collez-le dans votre page HTML</p>
                <p>• L'iframe occupera toute la hauteur de la fenêtre</p>
                <p>• Idéal pour une page dédiée au photobooth</p>
                <p className="font-medium">⚠️ Assurez-vous que votre site est en HTTPS pour l'accès caméra</p>
              </>
            )}
            {selectedMode === 'popup' && (
              <>
                <p>• Copiez le code et collez-le avant la fermeture de &lt;/body&gt;</p>
                <p>• Un bouton flottant apparaîtra en bas à droite</p>
                <p>• Compatible mobile avec popup plein écran</p>
                <p>• Personnalisable via les variables de configuration</p>
                <p className="font-medium">✅ Meilleure compatibilité pour l'accès caméra</p>
              </>
            )}
            {selectedMode === 'embed' && (
              <>
                <p>• Copiez le code et intégrez-le dans votre contenu</p>
                <p>• Hauteur fixe de 600px, largeur responsive</p>
                <p>• Idéal pour intégrer dans un article ou une section</p>
                <p className="font-medium">⚠️ L'accès caméra peut être bloqué selon le navigateur</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Preview Button */}
      {(selectedMode === 'popup' || selectedMode === 'newwindow') && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white text-sm font-medium rounded-lg transition-all transform hover:-translate-y-0.5"
          >
            <RiEyeLine className="h-4 w-4 mr-2" />
            {showPreview ? 'Masquer' : 'Prévisualiser'} {selectedMode === 'popup' ? 'le popup' : 'le bouton'}
          </button>
        </div>
      )}

      {/* Preview Demo */}
      {showPreview && (selectedMode === 'popup' || selectedMode === 'newwindow') && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 relative min-h-[300px]">
          <p className="text-center text-gray-600 mb-4 text-sm">
            Aperçu du comportement {selectedMode === 'popup' ? 'du popup' : 'du bouton'} (simulation)
          </p>
          <div className="relative h-64 bg-white rounded-lg border overflow-hidden">
            {selectedMode === 'popup' && (
              <div className="absolute bottom-4 right-4">
                <button
                  className="bg-purple-600 text-white px-4 py-3 rounded-full font-semibold shadow-lg hover:bg-purple-700 transition-all transform hover:-translate-y-1"
                  onClick={() => alert('Démonstration du popup - Dans la vraie version, cela ouvrirait le photobooth')}
                >
                  📸 Photobooth
                </button>
              </div>
            )}
            {selectedMode === 'newwindow' && (
              <div className="flex items-center justify-center h-full">
                <button
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                  onClick={() => alert('Démonstration - Dans la vraie version, cela ouvrirait le photobooth dans une nouvelle fenêtre')}
                >
                  📸 Ouvrir le Photobooth
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IframeIntegrationSection;
