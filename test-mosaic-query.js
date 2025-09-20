const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = 'https://gyohqmahwntkmebayeej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5b2hxbWFod250a21lYmF5ZWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDg5NDksImV4cCI6MjA2MjYyNDk0OX0.Pfjtro2esmKm1xKdCtgxnagpdOS7oS9JGhuf31aX8_M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMosaicQuery() {
  const projectId = 'b492a7b4-de73-4401-aa53-d98be285d07b';
  const limit = 50; // Limite par défaut de la mosaïque
  
  console.log('🔍 Test de la requête exacte de la mosaïque...');
  console.log(`Project ID: ${projectId}`);
  console.log(`Limite: ${limit}`);
  
  try {
    // Simulation exacte de la requête dans project-mosaic/page.js
    console.log('\n1. Requête exacte de la mosaïque...');
    
    const startTime = Date.now();
    
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, result_s3_url, result_image_url, created_at, moderation')
      .eq('project_id', projectId)
      .is('moderation', null)  // Ne sélectionner que les images non modérées
      .order('created_at', { ascending: false }) // Tri décroissant pour avoir les plus récentes en premier
      .limit(limit); // Limiter le nombre d'images chargées

    const endTime = Date.now();
    
    if (sessionsError) {
      console.error('❌ Erreur lors de la requête:', sessionsError);
      return;
    }
    
    console.log(`✅ Requête terminée en ${endTime - startTime}ms`);
    console.log(`📊 Sessions récupérées: ${sessionsData.length}`);
    
    // Transformation comme dans le code de la mosaïque
    const images = (sessionsData || [])
      .map(session => ({
        id: session.id,
        image_url: session.result_s3_url || session.result_image_url,
        created_at: session.created_at,
        metadata: {
          fileName: session.result_s3_url ? session.result_s3_url.split('/').pop() : '',
          size: null
        }
      }))
      .filter(img => img.image_url); // Vérifier que l'image a une URL valide
    
    console.log(`🖼️  Images valides après transformation: ${images.length}`);
    
    if (images.length === 0) {
      console.log('\n⚠️  PROBLÈME: Aucune image valide après filtrage!');
    } else {
      console.log('\n✅ Échantillon des premières images:');
      images.slice(0, 3).forEach((img, index) => {
        console.log(`   ${index + 1}. ${img.id.substring(0, 8)}... - ${img.image_url ? 'URL OK' : 'URL MANQUANTE'}`);
      });
    }
    
    // Test 2: Vérifier s'il y a plus d'images
    console.log('\n2. Test du décompte total...');
    
    const { count: totalCount, error: countError } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .is('moderation', null);
    
    if (countError) {
      console.error('❌ Erreur lors du décompte:', countError);
    } else {
      console.log(`📈 Total des sessions non modérées: ${totalCount}`);
      console.log(`🔢 Ratio affiché/total: ${images.length}/${totalCount}`);
    }
    
  } catch (error) {
    console.error('💥 Erreur générale:', error.message);
  }
}

testMosaicQuery();