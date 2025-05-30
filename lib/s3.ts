// src/lib/s3.ts
import { S3Client, PutObjectCommand, ObjectCannedACL } from "@aws-sdk/client-s3";

// Configurer AWS S3 avec les variables d'environnement correctes
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Fonction pour télécharger un fichier vers S3
 * @param fileBuffer Buffer contenant les données du fichier
 * @param fileName Nom du fichier à utiliser dans le bucket
 * @param contentType Type MIME du fichier
 * @returns URL publique du fichier téléchargé
 */
export async function uploadToS3(
  fileBuffer: Buffer, 
  fileName: string, 
  contentType: string
): Promise<string> {
  console.log(`📤 Téléchargement vers S3: ${fileName} (${contentType})`);
  
  // Vérifier que les variables d'environnement sont définies
  if (!process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || !process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials are not configured properly. Check NEXT_PUBLIC_AWS_ACCESS_KEY_ID and NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY environment variables.');
  }
  
  // Ensure filename doesn't have problematic characters
  const safeFileName = fileName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_.]/g, '');
  
  const bucketName = process.env.AWS_S3_BUCKET_NAME || 'leeveostockage'; // Change bucket name to leeveostockage
  
  // Paramètres de téléchargement
  const uploadParams = {
    Bucket: bucketName,
    Key: `uploads/${safeFileName}`,
    Body: fileBuffer,
    ContentType: contentType,
    ACL: 'public-read' as ObjectCannedACL
  };
  
  try {
    // Télécharger  le fichier vers S3
    await s3Client.send(new PutObjectCommand(uploadParams));
    
    // Construire l'URL du fichier téléchargé
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'eu-west-3'}.amazonaws.com/uploads/${safeFileName}`;
    console.log(`✅ Fichier téléchargé avec succès: ${fileUrl}`);
    
    return fileUrl; // Retourne l'URL publique du fichier
  } catch (err) {
    console.error('❌ Erreur de téléchargement S3:', err);
    throw err;
  }
}
