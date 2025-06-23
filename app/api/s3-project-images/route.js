import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

// Initialiser le client S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Initialiser le client Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const countOnly = searchParams.get('countOnly') === 'true';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  if (!projectId) {
    return NextResponse.json(
      { error: 'Project ID is required' },
      { status: 400 }
    );
  }

  try {
    // Essayons d'abord avec la table 'photos' de Supabase
    try {
      console.log(`Tentative de récupération depuis la table photos pour le projet ${projectId}`);
      
      // Requête à la table photos au lieu de project_images
      const { data, error, count: totalCount } = await supabase
        .from('photos')
        .select('*', { count: countOnly ? 'exact' : null })
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(countOnly ? 0 : (page - 1) * limit, countOnly ? 0 : page * limit - 1);

      console.log(`Résultat requête photos:`, error ? 'Erreur' : `${data?.length || 0} résultats`);
      
      if (error) {
        console.error('Erreur Supabase lors de la requête photos:', error);
        throw error;
      }

      if (countOnly) {
        return NextResponse.json({ count: totalCount || 0, source: 'supabase' });
      }

      if (data?.length > 0) {
        const images = data.map(item => ({
          id: item.id,
          image_url: item.image_url,
          created_at: item.created_at,
          metadata: item.metadata,
          is_moderated: item.is_moderated || false
        }));
        
        return NextResponse.json({ 
          success: true,
          images,
          page,
          limit,
          total: totalCount,
          source: 'supabase'
        });
      }
    } catch (supabaseError) {
      console.error('Erreur lors de la requête Supabase:', supabaseError);
      // Continuer avec S3 si la requête Supabase échoue
    }

    // Recherche dans S3 - maintenant avec le bon préfixe
    console.log('Recherche dans S3 avec le dossier layouts');
    
    // Modification ici : utilisation du dossier layouts
    const s3Prefix = 'layouts/';
    
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET,
      Prefix: s3Prefix,
      MaxKeys: countOnly ? 1000 : limit,
      ContinuationToken: countOnly ? undefined : (page > 1 ? searchParams.get('token') : undefined)
    });

    console.log(`Envoi requête S3 avec préfixe: ${s3Prefix}`);
    const response = await s3Client.send(command);
    
    if (countOnly) {
      // Pour le comptage, on filtre manuellement les images contenant l'ID du projet
      let allObjects = response.Contents || [];
      let nextToken = response.NextContinuationToken;
      
      while (nextToken && allObjects.length < 5000) {
        const nextCommand = new ListObjectsV2Command({
          Bucket: process.env.AWS_S3_BUCKET,
          Prefix: s3Prefix,
          MaxKeys: 1000,
          ContinuationToken: nextToken
        });
        
        const nextResponse = await s3Client.send(nextCommand);
        allObjects = [...allObjects, ...(nextResponse.Contents || [])];
        nextToken = nextResponse.NextContinuationToken;
      }
      
      // Filtrer les objets qui contiennent l'ID du projet
      const projectObjects = allObjects.filter(obj => 
        obj.Key.includes(`-${projectId}-`) || // Format potentiel incluant le projectId
        obj.Key.includes(`_project-${projectId}_`) // Autre format possible
      );
      
      console.log(`S3: ${allObjects.length} objets totaux, ${projectObjects.length} objets pour le projet ${projectId}`);
      
      return NextResponse.json({ 
        count: projectObjects.length,
        source: 's3'
      });
    }
    
    // Pour les images, filtrer et transformer les objets S3
    let filteredContents = (response.Contents || []).filter(obj => 
      obj.Key.includes(`-${projectId}-`) || // Format potentiel incluant le projectId
      obj.Key.includes(`_project-${projectId}_`) // Autre format possible
    );
    
    // Si on a un nombre limité d'images, on peut charger plus d'objets pour atteindre la limite
    if (filteredContents.length < limit && response.NextContinuationToken) {
      let nextToken = response.NextContinuationToken;
      let attempts = 0; // Limiter le nombre de tentatives
      
      while (nextToken && filteredContents.length < limit && attempts < 5) {
        attempts++;
        const nextCommand = new ListObjectsV2Command({
          Bucket: process.env.AWS_S3_BUCKET,
          Prefix: s3Prefix,
          MaxKeys: 1000,
          ContinuationToken: nextToken
        });
        
        const nextResponse = await s3Client.send(nextCommand);
        const additionalFiltered = (nextResponse.Contents || []).filter(obj => 
          obj.Key.includes(`-${projectId}-`) ||
          obj.Key.includes(`_project-${projectId}_`
        ));
        
        filteredContents = [...filteredContents, ...additionalFiltered];
        nextToken = nextResponse.NextContinuationToken;
      }
    }
    
    // Limiter au nombre demandé
    filteredContents = filteredContents.slice(0, limit);
    
    // Transformer les objets S3 en liste d'images
    const images = filteredContents.map(item => {
      // Extraire les informations à partir du nom de fichier
      const fileName = item.Key.split('/').pop();
      const parts = fileName.split('_');
      const timestamp = parts[0];
      
      // Essayer d'extraire des métadonnées du nom de fichier
      let metadata = {};
      try {
        // Format hypothétique: timestamp_photobooth-premium-userId-projectName-username-timestamp.jpg
        const filenameParts = fileName.split('-');
        metadata = {
          fileName,
          timestamp,
          size: item.Size,
          // Autres métadonnées extraites du nom de fichier si disponible
        };
      } catch (e) {
        metadata = { fileName, timestamp, size: item.Size };
      }
      
      return {
        id: `s3_${item.Key.replace(/[\/\.]/g, '_')}`, // ID unique pour l'image
        image_url: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${item.Key}`,
        created_at: item.LastModified || new Date(parseInt(timestamp) || Date.now()).toISOString(),
        metadata,
        key: item.Key
      };
    });

    console.log(`S3: Retour de ${images.length} images pour le projet ${projectId}`);
    
    return NextResponse.json({
      success: true,
      images,
      page,
      limit,
      nextToken: response.NextContinuationToken,
      source: 's3'
    });

  } catch (error) {
    console.error('Error fetching project images:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve project images', details: error.message },
      { status: 500 }
    );
  }
}