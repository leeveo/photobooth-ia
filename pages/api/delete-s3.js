import AWS from 'aws-sdk';

export default async function handler(req, res) {
  // Vérifier si la requête est de type POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    const { bucket, path } = req.body;

    if (!bucket || !path) {
      return res.status(400).json({ message: 'Les paramètres bucket et path sont requis' });
    }

    console.log('Tentative de suppression du fichier S3:', { bucket, path });

    // Configurer AWS avec les identifiants d'environnement
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_KEY,
      region: process.env.AWS_REGION || 'eu-west-3'
    });

    // Décoder l'URL pour gérer les caractères spéciaux
    const decodedPath = decodeURIComponent(path);
    console.log('Chemin décodé:', decodedPath);

    // Paramètres pour supprimer l'objet
    const deleteParams = {
      Bucket: bucket,
      Key: decodedPath
    };

    console.log('Paramètres de suppression:', deleteParams);

    // Supprimer l'objet
    const result = await s3.deleteObject(deleteParams).promise();
    console.log('Résultat de la suppression S3:', result);

    // Retourner un succès
    return res.status(200).json({ 
      message: 'Fichier supprimé avec succès',
      path: decodedPath,
      result 
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du fichier S3:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la suppression du fichier', 
      error: error.message,
      stack: error.stack 
    });
  }
}
