const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = 'https://gyohqmahwntkmebayeej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5b2hxbWFod250a21lYmF5ZWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDg5NDksImV4cCI6MjA2MjYyNDk0OX0.Pfjtro2esmKm1xKdCtgxnagpdOS7oS9JGhuf31aX8_M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function quickDiagnostic() {
  const projectId = 'b492a7b4-de73-4401-aa53-d98be285d07b';
  
  console.log('🔍 Diagnostic rapide pour:', projectId);
  
  try {
    // Test 1: Récupérer juste quelques sessions récentes
    console.log('\n1. Test de récupération limitée...');
    const { data: recentSessions, error: recentError } = await supabase
      .from('sessions')
      .select('id, created_at, result_s3_url, result_image_url, moderation')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentError) {
      console.error('❌ Erreur:', recentError.message);
      return;
    }
    
    console.log(`✅ Sessions récentes trouvées: ${recentSessions.length}`);
    
    recentSessions.forEach((session, index) => {
      console.log(`\n   Session ${index + 1}:`);
      console.log(`   - ID: ${session.id.substring(0, 8)}...`);
      console.log(`   - Date: ${session.created_at}`);
      console.log(`   - S3: ${session.result_s3_url ? 'OUI' : 'NON'}`);
      console.log(`   - Image: ${session.result_image_url ? 'OUI' : 'NON'}`);
      console.log(`   - Modération: ${session.moderation || 'null'}`);
    });
    
    // Test 2: Compter les sessions non modérées avec images
    console.log('\n2. Filtrage pour mosaïque...');
    const validSessions = recentSessions.filter(s => 
      (s.result_s3_url || s.result_image_url) && !s.moderation
    );
    
    console.log(`🖼️  Sessions valides pour mosaïque: ${validSessions.length}/${recentSessions.length}`);
    
    if (validSessions.length === 0) {
      console.log('\n⚠️  PROBLÈME IDENTIFIÉ:');
      if (recentSessions.every(s => !s.result_s3_url && !s.result_image_url)) {
        console.log('   - Aucune session n\'a d\'image (result_s3_url ou result_image_url)');
      }
      if (recentSessions.some(s => s.moderation)) {
        console.log('   - Certaines sessions sont modérées');
      }
    }
    
    // Test 3: Vérifier la structure complète d'une session
    if (recentSessions.length > 0) {
      console.log('\n3. Détail de la première session:');
      const { data: fullSession, error: fullError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', recentSessions[0].id)
        .single();
      
      if (fullSession) {
        console.log('   Colonnes disponibles:');
        Object.keys(fullSession).forEach(key => {
          console.log(`   - ${key}: ${fullSession[key] ? 'DÉFINI' : 'null/undefined'}`);
        });
      }
    }
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
  }
}

quickDiagnostic();