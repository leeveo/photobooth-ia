/**
 * Génère un lien sécurisé pour accéder à une image d'utilisateur
 * @param {Object} options - Options pour générer le lien
 * @param {string} options.imageUrl - URL directe de l'image
 * @param {string} options.sessionId - ID de la session (optionnel)
 * @param {string} options.photoId - ID de la photo (optionnel)
 * @param {string} options.projectId - ID du projet (optionnel)
 * @returns {string} Lien sécurisé vers l'image
 */
export function generateSecureImageLink({ imageUrl, sessionId, photoId, projectId }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  // Créer les données à encoder dans le token
  const tokenData = {
    imageUrl: imageUrl || null,
    sessionId: sessionId || null,
    photoId: photoId || null,
    timestamp: Date.now() // Pour éviter la mise en cache
  };
  
  // Encoder le token
  const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
  
  // Construire l'URL
  let url = `${baseUrl}/api/image-access?token=${encodeURIComponent(token)}`;
  
  if (projectId) {
    url += `&project=${encodeURIComponent(projectId)}`;
  }
  
  return url;
}

/**
 * Génère un lien direct pour télécharger une image
 * @param {Object} options - Options pour générer le lien
 * @param {string} options.imageUrl - URL directe de l'image
 * @param {string} options.filename - Nom du fichier (optionnel)
 * @returns {string} Lien pour télécharger l'image
 */
export function generateDownloadLink({ imageUrl, filename }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  let url = `${baseUrl}/api/download-image?url=${encodeURIComponent(imageUrl)}`;
  
  if (filename) {
    url += `&filename=${encodeURIComponent(filename)}`;
  }
  
  return url;
}

/**
 * Remplace les variables d'URL dans le template d'email
 * @param {string} htmlContent - Contenu HTML du template
 * @param {Object} imageData - Données de l'image
 * @param {Object} participantData - Données du participant
 * @param {Object} projectData - Données du projet
 * @returns {string} Contenu HTML avec les URLs remplacées
 */
export function replaceImageLinksInEmail(htmlContent, { imageData, participantData, projectData }) {
  let processedContent = htmlContent;
  
  // Générer le lien sécurisé pour l'image
  const secureImageLink = generateSecureImageLink({
    imageUrl: imageData.imageUrl,
    sessionId: imageData.sessionId,
    photoId: imageData.photoId,
    projectId: projectData?.id
  });
  
  // Générer le lien de téléchargement
  const downloadLink = generateDownloadLink({
    imageUrl: imageData.imageUrl,
    filename: `photo-${participantData?.firstname || 'participant'}-${Date.now()}.jpg`
  });
  
  // Remplacer les variables
  processedContent = processedContent
    .replace(/\{\{ticket_url\}\}/g, secureImageLink)
    .replace(/\{\{image_url\}\}/g, secureImageLink)
    .replace(/\{\{download_link\}\}/g, downloadLink)
    .replace(/\{\{secure_image_link\}\}/g, secureImageLink);
  
  return processedContent;
}
