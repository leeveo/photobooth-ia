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
    // Déterminer si on doit utiliser S3 ou Supabase
    // Essayons d'abord avec Supabase car c'est plus rapide pour les requêtes structurées
    let images = [];
    let count = 0;

    try {
      // Vérifier dans la table project_images
      const { data, error, count: totalCount } = await supabase
        .from('project_images')
        .select('*', { count: countOnly ? 'exact' : null })
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(countOnly ? 0 : (page - 1) * limit, countOnly ? 0 : page * limit - 1);

      if (error) throw error;

      if (countOnly) {
        return NextResponse.json({ count: totalCount || 0 });
      }

      if (data?.length > 0) {
        images = data.map(item => ({
          url: item.image_url,
          created_at: item.created_at,
          metadata: item.metadata
        }));
        
        return NextResponse.json({ 
          images,
          page,
          limit,
          total: totalCount
        });
      }
    } catch (supabaseError) {
      console.error('Erreur Supabase:', supabaseError);
      // Si Supabase échoue, on continue avec S3
    }

    // Si on n'a pas trouvé d'images dans Supabase ou s'il y a eu une erreur,
    // cherchons dans S3
    
    // Configuration pour S3
    const s3Prefix = `projects/${projectId}/`;
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET,
      Prefix: s3Prefix,
      MaxKeys: countOnly ? 1000 : limit, // Si on compte seulement, on récupère plus d'objets
      ContinuationToken: countOnly ? undefined : (page > 1 ? searchParams.get('token') : undefined)
    });

    const response = await s3Client.send(command);
    
    if (countOnly) {
      // S3 ne permet pas de compter facilement, alors nous devons récupérer tous les objets
      // et les compter côté serveur
      let allObjects = response.Contents || [];
      let nextToken = response.NextContinuationToken;
      
      // Continuer à récupérer tous les objets s'il y en a plus
      while (nextToken && allObjects.length < 5000) { // Limite arbitraire pour éviter les boucles infinies
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
      
      return NextResponse.json({ count: allObjects.length });
    }
    
    // Transformer les objets S3 en liste d'images
    images = (response.Contents || []).map(item => ({
      url: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${item.Key}`,
      last_modified: item.LastModified,
      size: item.Size,
      key: item.Key
    }));

    return NextResponse.json({
      images,
      page,
      limit,
      nextToken: response.NextContinuationToken
    });

  } catch (error) {
    console.error('Error fetching project images:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve project images' },
      { status: 500 }
    );
  }
}