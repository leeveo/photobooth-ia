import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// IMPORTANT: Mise à jour du format de configuration
// Supprimez cette ancienne configuration:
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

// Et utilisez à la place:
export const dynamic = 'force-dynamic';

// Configurez votre client S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

export async function POST(request) {
  console.log('API S3: Début de la requête upload');
  
  try {
    // Vérifier les variables d'environnement requises
    if (!process.env.AWS_ACCESS_KEY_ID || 
        !process.env.AWS_SECRET_ACCESS_KEY || 
        !process.env.AWS_REGION ||
        !process.env.AWS_S3_BUCKET) {
      console.error('API S3: Variables AWS manquantes');
      
      // Log détaillé pour le débogage
      console.log('Variables présentes:', {
        AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
        AWS_REGION: !!process.env.AWS_REGION,
        AWS_S3_BUCKET: !!process.env.AWS_S3_BUCKET
      });
      
      return NextResponse.json({ 
        error: 'Configuration AWS manquante' 
      }, { status: 500 });
    }
    
    // Récupérer le fichier de la requête
    const formData = await request.formData();
    const file = formData.get('file');
    const projectId = formData.get('projectId') || 'unknown';
    const path = formData.get('path');
    
    if (!file) {
      console.error('API S3: Aucun fichier reçu');
      return NextResponse.json({ 
        error: 'Aucun fichier reçu' 
      }, { status: 400 });
    }
    
    // Lire le fichier comme un ArrayBuffer
    const fileArrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);
    
    // Générer un nom de fichier unique si non fourni
    const fileName = path || `photobooth-logo/${projectId}/${uuidv4()}_${file.name.replace(/\s+/g, '_')}`;
    
    // Paramètres de la commande PutObject
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: fileBuffer,
      ContentType: file.type,
      ACL: 'public-read'
    };
    
    try {
      // Exécuter la commande d'upload
      console.log('API S3: Tentative d\'upload du fichier:', fileName);
      const command = new PutObjectCommand(params);
      await s3Client.send(command);
      
      // Construire l'URL du fichier uploadé
      const fileUrl = `https://${params.Bucket}.s3.${process.env.AWS_REGION || 'eu-west-3'}.amazonaws.com/${fileName}`;
      console.log('API S3: Upload réussi, URL:', fileUrl);
      
      return NextResponse.json({ 
        success: true, 
        url: fileUrl,
        key: fileName,
      });
    } catch (uploadError) {
      console.error('API S3: Erreur lors de l\'upload:', uploadError);
      return NextResponse.json({ 
        error: `Erreur d'upload S3: ${uploadError.message}` 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('API S3: Erreur générale:', error);
    return NextResponse.json({ 
      error: `Erreur serveur: ${error.message}` 
    }, { status: 500 });
  }
}
