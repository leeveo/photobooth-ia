import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Configuration du client S3
const s3Client = new S3Client({
  region: 'eu-west-3', // Région Paris
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Nom du bucket S3
const bucketName = 'leeveostockage';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const fileName = `layout_${timestamp}.png`;
    const s3Key = `templates/${fileName}`;
    
    // Obtenir les données binaires du fichier
    const fileBuffer = await file.arrayBuffer();
    
    console.log(`Tentative d'upload vers S3: ${bucketName}/${s3Key}`);
    
    // Configurer les paramètres d'upload
    const uploadParams = {
      Bucket: bucketName,
      Key: s3Key,
      Body: Buffer.from(fileBuffer),
      ContentType: file.type || 'image/png', // Conserve le type PNG
      ACL: 'public-read' // Rendre le fichier accessible publiquement
    };
    
    // Ajoutez des logs pour déboguer
    console.log(`Uploading file with type: ${file.type}`);
    
    // Exécuter la commande d'upload
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);
    
    // Générer l'URL publique
    const publicUrl = `https://${bucketName}.s3.eu-west-3.amazonaws.com/${s3Key}`;
    
    console.log(`Upload réussi: ${publicUrl}`);
    
    return NextResponse.json({ 
      success: true, 
      url: publicUrl
    });
    
  } catch (error) {
    console.error('Erreur lors du téléchargement vers S3:', error);
    return NextResponse.json({ 
      error: error.message, 
      details: error.stack 
    }, { status: 500 });
  }
}
