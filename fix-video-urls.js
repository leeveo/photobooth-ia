/**
 * Script pour corriger les URLs vidéo de coiffure003
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gyohqmahwntkmebayeej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5b2hxbWFod250a21lYmF5ZWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDg5NDksImV4cCI6MjA2MjYyNDk0OX0.Pfjtro2esmKm1xKdCtgxnagpdOS7oS9JGhuf31aX8_M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixVideoUrls() {
  try {
    console.log('🔧 CORRECTION DES URLs VIDÉO COIFFURE003\n');
    
    const backgroundId = 'e01f1d3b-ceac-4591-b6ca-62082ad05760';
    
    // URLs correctes (seulement le storage path, pas l'URL complète)
    const correctVideoUrl = 'coiffure003/backgrounds/1755692247979_video_horizontal.mp4';
    const correctVideoUrlVertical = 'videos/portrait/forest-vertical.mp4';
    
    console.log('🎯 Correction des URLs vidéo...');
    console.log(`   Horizontale: ${correctVideoUrl}`);
    console.log(`   Verticale: ${correctVideoUrlVertical}`);
    
    // Mettre à jour avec les bonnes URLs
    const { data, error } = await supabase
      .from('backgrounds')
      .update({ 
        video_url: correctVideoUrl,
        video_url_vertical: correctVideoUrlVertical,
        storage_path_video: correctVideoUrl,
        storage_path_video_vertical: correctVideoUrlVertical
      })
      .eq('id', backgroundId)
      .select();
      
    if (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      return;
    }
    
    console.log('✅ URLs vidéo corrigées !');
    
    // Test des URLs publiques
    const { data: urlData } = supabase.storage
      .from('backgrounds')
      .getPublicUrl(correctVideoUrl);
      
    const { data: urlDataVertical } = supabase.storage
      .from('backgrounds')
      .getPublicUrl(correctVideoUrlVertical);
    
    console.log('\n🔗 URLs publiques corrigées:');
    console.log(`   Horizontale: ${urlData.publicUrl}`);
    console.log(`   Verticale: ${urlDataVertical.publicUrl}`);
    
    console.log('\n🎬 Les vidéos devraient maintenant se charger correctement !');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

fixVideoUrls();
