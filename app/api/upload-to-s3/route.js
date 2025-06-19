import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
    
    // Initialiser le client S3 avec gestion d'erreur
    let s3Client;
    try {
      s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      console.log('API S3: Client S3 initialisé');
    } catch (s3InitError) {
      console.error('API S3: Erreur d\'initialisation du client S3:', s3InitError);
      return NextResponse.json({ 
        error: `Erreur d'initialisation S3: ${s3InitError.message}` 
      }, { status: 500 });
    }
    
    // Récupérer le fichier de la requête
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      console.error('API S3: Aucun fichier reçu');
      return NextResponse.json({ 
        error: 'Aucun fichier reçu' 
      }, { status: 400 });
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `layouts/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    
    // Paramètres de la commande PutObject
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
      ACL: 'public-read'
    };
    
    try {
      // Exécuter la commande d'upload
      console.log('API S3: Tentative d\'upload du fichier:', fileName);
      const command = new PutObjectCommand(params);
      await s3Client.send(command);
      
      // Construire l'URL du fichier uploadé
      const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
      console.log('API S3: Upload réussi, URL:', fileUrl);
      
      return NextResponse.json({ 
        success: true, 
        url: fileUrl 
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

export const config = {
  api: {
    bodyParser: false,
  },
};
