'use client';

/**
 * Dimensions de référence utilisées dans l'éditeur de filigrane
 */
export const EDITOR_WIDTH = 800;
export const EDITOR_HEIGHT = 1200;

/**
 * Ajuste les coordonnées d'un élément en fonction des dimensions de l'image cible
 * @param {Object} element - Élément du filigrane (texte ou logo)
 * @param {number} targetWidth - Largeur de l'image cible
 * @param {number} targetHeight - Hauteur de l'image cible
 * @returns {Object} - Élément avec coordonnées adaptées
 * @private
 */
function scaleElement(element, targetWidth, targetHeight) {
  const scaleX = targetWidth / EDITOR_WIDTH;
  const scaleY = targetHeight / EDITOR_HEIGHT;
  
  const scaledElement = { ...element };
  
  // Ajuster les positions
  if (typeof scaledElement.x !== 'undefined') {
    scaledElement.x = Math.round(element.x * scaleX);
  }
  
  if (typeof scaledElement.y !== 'undefined') {
    scaledElement.y = Math.round(element.y * scaleY);
  }
  
  // Ajuster les dimensions pour les logos et images
  if ((element.type === 'image' || element.type === 'logo') && element.width && element.height) {
    scaledElement.width = Math.round(element.width * scaleX);
    scaledElement.height = Math.round(element.height * scaleY);
  }
  
  // Ajuster la taille de police pour le texte
  if (element.type === 'text' && element.fontSize) {
    scaledElement.fontSize = Math.round(element.fontSize * Math.min(scaleX, scaleY));
  }
  
  return scaledElement;
}

/**
 * Charge une image à partir d'une URL
 * @param {string} src - URL de l'image à charger
 * @returns {Promise<HTMLImageElement>} - Image chargée
 * @private
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error("Aucune source fournie pour l'image"));
      return;
    }
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => {
      console.error("Échec du chargement de l'image:", src);
      reject(e);
    };
    img.src = src;
  });
}

/**
 * Convertit un canvas en Blob
 * @param {HTMLCanvasElement} canvas - Canvas à convertir
 * @param {string} type - Type MIME
 * @param {number} quality - Qualité (0-1)
 * @returns {Promise<Blob>} - Canvas converti en Blob
 * @private
 */
function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.95) {
  return new Promise((resolve) => {
    canvas.toBlob(blob => resolve(blob), type, quality);
  });
}

/**
 * Applique un filigrane à une image en utilisant Canvas
 * @param {string} imageUrl - URL de l'image source
 * @param {Object} watermarkOptions - Options simples du filigrane
 * @param {Array} watermarkElements - Éléments avancés du filigrane
 * @returns {Promise<Blob>} - Blob de l'image avec filigrane
 */
export async function applyWatermarkWithCanvas(imageUrl, watermarkOptions, watermarkElements = null) {
  // Vérification précoce pour le rendu côté serveur
  if (typeof window === 'undefined') {
    console.warn('applyWatermarkWithCanvas appelé côté serveur');
    return null;
  }

  try {
    // Créer un canvas non visible
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Charger l'image originale
    const baseImage = new Image();
    baseImage.crossOrigin = 'Anonymous';
    baseImage.src = imageUrl;
    
    // Attendre que l'image soit chargée
    await new Promise((resolve, reject) => {
      baseImage.onload = resolve;
      baseImage.onerror = () => {
        console.error("Erreur lors du chargement de l'image de base:", imageUrl);
        reject(new Error("Échec du chargement de l'image"));
      };
    });
    
    // Configurer la taille du canvas selon l'image
    canvas.width = baseImage.width;
    canvas.height = baseImage.height;
    
    // Dessiner l'image originale sur le canvas
    ctx.drawImage(baseImage, 0, 0);
    
    // Si le filigrane est désactivé dans les options de base et qu'il n'y a pas d'éléments avancés,
    // retourner l'image telle quelle
    if ((!watermarkOptions || !watermarkOptions.enabled) && 
        (!Array.isArray(watermarkElements) || watermarkElements.length === 0)) {
      return await canvasToBlob(canvas);
    }
    
    // Si des éléments avancés sont disponibles, les utiliser en priorité
    if (Array.isArray(watermarkElements) && watermarkElements.length > 0) {
      console.log(`Application de ${watermarkElements.length} éléments de filigrane avancés`);
      
      // Dimensions réelles de l'image
      const targetWidth = canvas.width;
      const targetHeight = canvas.height;
      
      console.log(`Dimensions de l'image cible: ${targetWidth}x${targetHeight}`);
      
      // Appliquer chaque élément du filigrane avancé
      for (const element of watermarkElements) {
        try {
          // Mise à l'échelle de l'élément pour l'adapter aux dimensions de l'image cible
          const scaledElement = scaleElement(element, targetWidth, targetHeight);
          
          // Traitement des éléments de type texte
          if (element.type === 'text' && element.text) {
            // Configurer le texte
            ctx.save();
            ctx.font = `${scaledElement.fontSize}px ${scaledElement.fontFamily || 'Arial'}`;
            ctx.fillStyle = scaledElement.color || '#FFFFFF';
            ctx.globalAlpha = element.opacity !== undefined ? element.opacity : 0.8;
            
            // Appliquer une ombre si elle est définie
            if (element.shadow) {
              ctx.shadowColor = element.shadow.color || 'rgba(0,0,0,0.5)';
              ctx.shadowBlur = element.shadow.blur || 5;
              ctx.shadowOffsetX = element.shadow.offsetX || 2;
              ctx.shadowOffsetY = element.shadow.offsetY || 2;
            }
            
            // Appliquer une rotation si elle est définie
            if (element.rotation) {
              ctx.translate(scaledElement.x, scaledElement.y);
              ctx.rotate((element.rotation * Math.PI) / 180);
              ctx.fillText(element.text, 0, 0);
            } else {
              // Position standard sans rotation
              ctx.fillText(element.text, scaledElement.x, scaledElement.y);
            }
            
            ctx.restore();
          } 
          // Traitement des éléments de type image ou logo
          else if ((element.type === 'image' || element.type === 'logo') && element.src) {
            // Charger le logo/image
            const logoImage = await loadImage(element.src);
            
            ctx.save();
            ctx.globalAlpha = element.opacity !== undefined ? element.opacity : 0.8;
            
            // Appliquer une rotation si elle est définie
            if (element.rotation) {
              const width = scaledElement.width || 100;
              const height = scaledElement.height || 100;
              
              ctx.translate(scaledElement.x + width/2, scaledElement.y + height/2);
              ctx.rotate((element.rotation * Math.PI) / 180);
              ctx.drawImage(logoImage, -width/2, -height/2, width, height);
            } else {
              // Position standard sans rotation
              ctx.drawImage(logoImage, scaledElement.x, scaledElement.y, 
                           scaledElement.width || 100, scaledElement.height || 100);
            }
            
            ctx.restore();
          }
        } catch (elementError) {
          console.error("Erreur lors de l'application d'un élément de filigrane:", elementError);
          // Continue avec les autres éléments en cas d'erreur sur un élément
        }
      }
    } 
    // Sinon, utiliser les options de filigrane simple
    else if (watermarkOptions && watermarkOptions.enabled) {
      console.log("Application des options de filigrane simples");
      
      // Appliquer le texte si configuré
      if (watermarkOptions.text) {
        // Configurer le style du texte
        ctx.font = `${watermarkOptions.textSize || 24}px Arial`;
        ctx.fillStyle = watermarkOptions.textColor || '#FFFFFF';
        ctx.globalAlpha = watermarkOptions.opacity !== undefined ? watermarkOptions.opacity : 0.8;
        
        // Calculer la position du texte
        const textMetrics = ctx.measureText(watermarkOptions.text);
        const textWidth = textMetrics.width;
        const textHeight = watermarkOptions.textSize || 24;
        
        let textX = 20;
        let textY = 40;
        
        // Positionner le texte selon les options
        const textPosition = watermarkOptions.textPosition || watermarkOptions.position || 'bottom-right';
        switch (textPosition) {
          case 'top-left':
            textX = 20;
            textY = textHeight + 10;
            break;
          case 'top-center':
            textX = (canvas.width - textWidth) / 2;
            textY = textHeight + 10;
            break;
          case 'top-right':
            textX = canvas.width - textWidth - 20;
            textY = textHeight + 10;
            break;
          case 'bottom-left':
            textX = 20;
            textY = canvas.height - 20;
            break;
          case 'bottom-center':
            textX = (canvas.width - textWidth) / 2;
            textY = canvas.height - 20;
            break;
          case 'bottom-right':
            textX = canvas.width - textWidth - 20;
            textY = canvas.height - 20;
            break;
          case 'center':
            textX = (canvas.width - textWidth) / 2;
            textY = canvas.height / 2;
            break;
        }
        
        // Dessiner le texte
        ctx.fillText(watermarkOptions.text, textX, textY);
      }
      
      // Appliquer le logo si configuré
      if (watermarkOptions.logoUrl) {
        try {
          const logoImage = await loadImage(watermarkOptions.logoUrl);
          
          // Définir la taille max du logo (10-15% de l'image)
          const maxLogoWidth = canvas.width * 0.15;
          const maxLogoHeight = canvas.height * 0.15;
          
          // Calculer les dimensions proportionnelles
          let logoWidth = logoImage.width;
          let logoHeight = logoImage.height;
          
          if (logoWidth > maxLogoWidth) {
            const ratio = maxLogoWidth / logoWidth;
            logoWidth = maxLogoWidth;
            logoHeight = logoHeight * ratio;
          }
          
          if (logoHeight > maxLogoHeight) {
            const ratio = maxLogoHeight / logoHeight;
            logoHeight = maxLogoHeight;
            logoWidth = logoWidth * ratio;
          }
          
          // Calculer la position selon les options
          let logoX = 20;
          let logoY = 20;
          
          const logoPosition = watermarkOptions.position || 'bottom-right';
          switch (logoPosition) {
            case 'top-left':
              logoX = 20;
              logoY = 20;
              break;
            case 'top-center':
              logoX = (canvas.width - logoWidth) / 2;
              logoY = 20;
              break;
            case 'top-right':
              logoX = canvas.width - logoWidth - 20;
              logoY = 20;
              break;
            case 'bottom-left':
              logoX = 20;
              logoY = canvas.height - logoHeight - 20;
              break;
            case 'bottom-center':
              logoX = (canvas.width - logoWidth) / 2;
              logoY = canvas.height - logoHeight - 20;
              break;
            case 'bottom-right':
              logoX = canvas.width - logoWidth - 20;
              logoY = canvas.height - logoHeight - 20;
              break;
            case 'center':
              logoX = (canvas.width - logoWidth) / 2;
              logoY = (canvas.height - logoHeight) / 2;
              break;
          }
          
          // Dessiner le logo avec l'opacité configurée
          ctx.globalAlpha = watermarkOptions.opacity !== undefined ? watermarkOptions.opacity : 0.8;
          ctx.drawImage(logoImage, logoX, logoY, logoWidth, logoHeight);
          ctx.globalAlpha = 1.0;
        } catch (logoError) {
          console.error("Erreur lors de l'application du logo de filigrane:", logoError);
        }
      }
    }
    
    // Convertir le canvas en blob et le renvoyer
    return await canvasToBlob(canvas);
  } catch (error) {
    console.error("Erreur dans applyWatermarkWithCanvas:", error);
    throw error;
  }
}

/**
 * Génère un aperçu du filigrane avec les éléments donnés
 * @param {Array} elements - Tableau des éléments du filigrane (texte, images)
 * @param {String} backgroundImage - URL de l'image de fond
 * @param {Object} dimensions - Dimensions pour l'éditeur et l'aperçu
 * @returns {Promise<String>} - URL de données de l'image d'aperçu
 */
export async function generateWatermarkPreview(elements, backgroundImage, dimensions = {}) {
  // Vérification précoce pour le rendu côté serveur
  if (typeof window === 'undefined') {
    console.warn('generateWatermarkPreview appelé côté serveur');
    return null;
  }

  if (!elements || elements.length === 0) {
    console.log("Aucun élément à prévisualiser");
    return null;
  }

  console.log("Génération de l'aperçu du filigrane avec les éléments:", elements);
  
  try {
    // Utiliser les dimensions par défaut si non fournies
    const editorWidth = dimensions.editorWidth || EDITOR_WIDTH;
    const editorHeight = dimensions.editorHeight || EDITOR_HEIGHT;
    const previewWidth = dimensions.previewWidth || 400;
    const previewHeight = dimensions.previewHeight || 600;
    
    // Calculer le facteur d'échelle tout en maintenant le ratio d'aspect
    const ratio = editorHeight / editorWidth;
    const targetRatio = previewHeight / previewWidth;
    
    // Calculer les dimensions du canvas qui maintiennent le même ratio d'aspect
    let canvasWidth, canvasHeight;
    if (ratio > targetRatio) {
      // La hauteur est le facteur limitant
      canvasHeight = previewHeight;
      canvasWidth = canvasHeight / ratio;
    } else {
      // La largeur est le facteur limitant
      canvasWidth = previewWidth;
      canvasHeight = canvasWidth * ratio;
    }
    
    // Créer le canvas
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    // Charger l'image de fond
    const bgImage = await loadImage(backgroundImage);
    
    // Dessiner l'image de fond en maintenant le ratio d'aspect
    ctx.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);
    
    // Calculer les facteurs d'échelle pour les coordonnées x et y
    const scaleX = canvasWidth / editorWidth;
    const scaleY = canvasHeight / editorHeight;
    
    console.log(`Dimensions du canvas: ${canvasWidth}x${canvasHeight}, Facteurs d'échelle: ${scaleX}x${scaleY}`);
    
    // Dessiner les éléments du filigrane avec mise à l'échelle
    for (const element of elements) {
      const scaledElement = { ...element };
      
      // Mise à l'échelle de la position
      scaledElement.x = element.x * scaleX;
      scaledElement.y = element.y * scaleY;
      
      // Traitement des éléments selon leur type
      try {
        if (element.type === 'text') {
          // Mise à l'échelle de la taille de police
          scaledElement.fontSize = element.fontSize * scaleX;
          
          // Configuration du texte
          ctx.save();
          ctx.font = `${scaledElement.fontSize}px ${scaledElement.fontFamily || 'Arial'}`;
          ctx.fillStyle = scaledElement.color || '#FFFFFF';
          ctx.globalAlpha = element.opacity !== undefined ? element.opacity : 0.8;
          
          // Appliquer une rotation si elle est définie
          if (scaledElement.rotation) {
            ctx.translate(scaledElement.x, scaledElement.y);
            ctx.rotate((scaledElement.rotation * Math.PI) / 180);
            ctx.fillText(scaledElement.text || '', 0, 0);
          } else {
            // Position standard sans rotation
            ctx.fillText(scaledElement.text || '', scaledElement.x, scaledElement.y);
          }
          
          ctx.restore();
        } 
        else if (element.type === 'image' || element.type === 'logo') {
          // Mise à l'échelle des dimensions
          scaledElement.width = (element.width || 100) * scaleX;
          scaledElement.height = (element.height || 100) * scaleY;
          
          // Chargement et rendu de l'image
          const img = await loadImage(scaledElement.src);
          
          ctx.save();
          ctx.globalAlpha = element.opacity !== undefined ? element.opacity : 0.8;
          
          // Appliquer une rotation si elle est définie
          if (scaledElement.rotation) {
            ctx.translate(scaledElement.x + scaledElement.width/2, 
                          scaledElement.y + scaledElement.height/2);
            ctx.rotate((scaledElement.rotation * Math.PI) / 180);
            ctx.drawImage(img, -scaledElement.width/2, -scaledElement.height/2, 
                          scaledElement.width, scaledElement.height);
          } else {
            // Position standard sans rotation
            ctx.drawImage(img, scaledElement.x, scaledElement.y, 
                          scaledElement.width, scaledElement.height);
          }
          
          ctx.restore();
        }
      } catch (elementError) {
        console.error("Erreur lors du rendu d'un élément:", elementError);
        // Continue avec les autres éléments en cas d'erreur sur un élément
      }
    }
    
    // Retourner l'URL de données
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch (error) {
    console.error("Erreur lors de la génération de l'aperçu du filigrane:", error);
    return null;
  }
}
