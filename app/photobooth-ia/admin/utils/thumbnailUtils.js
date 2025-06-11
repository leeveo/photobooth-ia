import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Convertit une URL de données en Blob
 * @param {string} dataUrl - L'URL de données à convertir
 * @returns {Promise<Blob>} - Le blob résultant
 */
export const dataUrlToBlob = async (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string') {
    console.error('dataUrl invalide:', dataUrl);
    return null;
  }
  
  try {
    // Si c'est déjà une URL HTTP, retourner null (pas besoin de convertir)
    if (dataUrl.startsWith('http')) {
      return null;
    }
    
    // Conversion via fetch
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    console.log('Conversion dataUrl en blob réussie, type:', blob.type, 'taille:', blob.size);
    return blob;
  } catch (error) {
    console.error('Erreur lors de la conversion de dataUrl en blob:', error);
    return null;
  }
};

/**
 * Convertit un dataURL en buffer pour AWS S3
 */
export const dataUrlToBuffer = async (dataUrl) => {
  try {
    const blob = await dataUrlToBlob(dataUrl);
    return await blob.arrayBuffer();
  } catch (error) {
    console.error('Erreur lors de la conversion en buffer:', error);
    throw error;
  }
};

/**
 * Télécharge une miniature vers AWS S3
 * @param {string} dataUrl - L'URL de données de la miniature
 * @param {string} id - L'ID à associer à la miniature
 * @returns {Promise<string>} - L'URL publique de la miniature téléchargée
 */
export const uploadThumbnail = async (dataUrl, id) => {
  if (!dataUrl) return null;
  
  // Si c'est déjà une URL HTTP, vérifier si c'est déjà sur S3
  if (dataUrl.startsWith('http')) {
    if (dataUrl.includes('leeveostockage.s3') || dataUrl.includes('amazonaws.com')) {
      console.log('Image déjà hébergée sur S3:', dataUrl);
      return dataUrl;
    }
    console.log('URL externe, sera convertie vers S3');
  }
  
  try {
    console.log('Préparation de l\'upload vers AWS S3...');
    
    // Créer un client S3 avec les infos d'identification
    const s3Client = new S3Client({
      region: process.env.NEXT_PUBLIC_AWS_REGION,
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
      }
    });
    
    // Obtenir le contenu de l'image
    let buffer;
    let contentType;
    
    if (dataUrl.startsWith('data:')) {
      // Convertir le dataURL en buffer
      const blob = await dataUrlToBlob(dataUrl);
      buffer = await blob.arrayBuffer();
      contentType = blob.type || 'image/png';
    } else {
      // Si c'est une URL externe, télécharger l'image d'abord
      const response = await fetch(dataUrl);
      buffer = await response.arrayBuffer();
      contentType = response.headers.get('content-type') || 'image/png';
    }
    
    // Créer un nom de fichier unique avec timestamp
    const timestamp = Date.now();
    const fileName = `templates/thumbnail_${id}_${timestamp}.png`;
    
    console.log(`Téléchargement vers S3: ${fileName}, type: ${contentType}`);
    
    // Préparer la commande d'upload
    const command = new PutObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read', // Rendre le fichier accessible publiquement
    });
    
    // Exécuter la commande d'upload
    const response = await s3Client.send(command);
    
    console.log('Upload S3 réussi:', response);
    
    // Construire l'URL publique
    const publicUrl = `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${fileName}`;
    
    console.log('URL publique S3 générée:', publicUrl);
    
    return publicUrl;
  } catch (error) {
    console.error('Erreur lors de l\'upload S3:', error);
    // En cas d'erreur, retourner l'URL d'origine
    return dataUrl;
  }
};

/**
 * Met à jour l'URL de la miniature d'un template dans la base de données
 * @param {object} supabase - Le client Supabase
 * @param {number} templateId - L'ID du template
 * @param {string} thumbnailUrl - L'URL de la miniature
 * @returns {Promise<boolean>} - Si la mise à jour a réussi
 */
export const updateTemplateThumbnail = async (supabase, templateId, thumbnailUrl) => {
  if (!templateId || !thumbnailUrl) return false;
  
  try {
    console.log(`Mise à jour de la miniature pour le template ${templateId}`);
    
    const { data, error } = await supabase
      .from('layout_templates')
      .update({ thumbnail_url: thumbnailUrl })
      .eq('id', templateId)
      .select();
      
    if (error) {
      console.error('Erreur lors de la mise à jour:', error);
      return false;
    }
    
    console.log('Miniature mise à jour avec succès:', data);
    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la miniature:', error);
    return false;
  }
};

/**
 * Migre les miniatures existantes des URL de données vers AWS S3
 * @returns {Promise<void>}
 */
export const migrateExistingThumbnails = async () => {
  const supabase = createClientComponentClient();
  
  try {
    console.log('Début de la migration des miniatures vers AWS S3...');
    
    // Récupérer tous les templates avec des URL de données ou URL non-AWS
    const { data: templates, error } = await supabase
      .from('layout_templates')
      .select('id, thumbnail_url')
      .or('thumbnail_url.like.data:image/%,thumbnail_url.not.like.%amazonaws.com%');
      
    if (error) {
      throw error;
    }
    
    console.log(`Trouvé ${templates?.length || 0} templates à migrer vers S3`);
    
    if (!templates || templates.length === 0) {
      console.log('Aucun template à migrer');
      return;
    }
    
    // Traiter chaque template
    let successCount = 0;
    let failCount = 0;
    
    for (const template of templates) {
      if (!template.thumbnail_url) continue;
      
      console.log(`Migration de la miniature pour le template ${template.id}...`);
      
      try {
        // Télécharger vers AWS S3
        const newUrl = await uploadThumbnail(template.thumbnail_url, template.id);
        
        if (newUrl && newUrl !== template.thumbnail_url) {
          // Mettre à jour l'URL dans la base de données
          const success = await updateTemplateThumbnail(supabase, template.id, newUrl);
          
          if (success) {
            console.log(`✅ Migration vers S3 réussie pour le template ${template.id}`);
            successCount++;
          } else {
            console.error(`❌ Échec de la mise à jour en base de données pour le template ${template.id}`);
            failCount++;
          }
        } else {
          console.log(`⚠️ Pas de changement pour le template ${template.id}, l'URL reste la même`);
          failCount++;
        }
      } catch (templateError) {
        console.error(`❌ Erreur lors de la migration du template ${template.id}:`, templateError);
        failCount++;
      }
    }
    
    console.log(`Migration S3 terminée. Succès: ${successCount}, Échecs: ${failCount}`);
  } catch (error) {
    console.error('Erreur lors de la migration des miniatures vers S3:', error);
  }
};
