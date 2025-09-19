const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase avec les vraies valeurs
const supabaseUrl = 'https://gyohqmahwntkmebayeej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5b2hxbWFod250a21lYmF5ZWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDg5NDksImV4cCI6MjA2MjYyNDk0OX0.Pfjtro2esmKm1xKdCtgxnagpdOS7oS9JGhuf31aX8_M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugProjectImages() {
  const projectId = 'b492a7b4-de73-4401-aa53-d98be285d07b';
  
  console.log('🔍 Diagnostic pour le projet:', projectId);
  console.log('=' .repeat(60));
  
  try {
    // 1. Vérifier si le projet existe
    console.log('1. Vérification de l\'existence du projet...');
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      console.error('❌ Erreur lors de la récupération du projet:', projectError);
      return;
    }
    
    if (!project) {
      console.error('❌ Projet introuvable');
      return;
    }
    
    console.log('✅ Projet trouvé:');
    console.log('   - Nom:', project.name);
    console.log('   - Slug:', project.slug);
    console.log('   - Actif:', project.is_active);
    console.log('   - Créé le:', project.created_at);
    
    // 2. Compter toutes les sessions du projet
    console.log('\n2. Comptage des sessions...');
    const { count: totalSessions, error: countError } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);
    
    if (countError) {
      console.error('❌ Erreur lors du comptage des sessions:', countError);
    } else {
      console.log('📊 Total des sessions:', totalSessions || 0);
    }
    
    // 3. Analyser les sessions avec images
    console.log('\n3. Analyse des sessions avec images...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, result_s3_url, result_image_url, created_at, moderation')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (sessionsError) {
      console.error('❌ Erreur lors de la récupération des sessions:', sessionsError);
      return;
    }
    
    console.log('📸 Sessions trouvées:', sessions.length);
    
    if (sessions.length === 0) {
      console.log('⚠️  Aucune session trouvée pour ce projet');
      return;
    }
    
    // 4. Analyser chaque session
    let sessionsWithImages = 0;
    let sessionsWithS3 = 0;
    let sessionsWithResultUrl = 0;
    let moderatedSessions = 0;
    
    console.log('\n4. Détail des sessions:');
    sessions.forEach((session, index) => {
      console.log(`\n   Session ${index + 1}:`);
      console.log(`   - ID: ${session.id}`);
      console.log(`   - Créée: ${session.created_at}`);
      console.log(`   - S3 URL: ${session.result_s3_url ? '✅' : '❌'} ${session.result_s3_url || 'Non définie'}`);
      console.log(`   - Result URL: ${session.result_image_url ? '✅' : '❌'} ${session.result_image_url || 'Non définie'}`);
      console.log(`   - Modération: ${session.moderation || 'null'}`);
      
      if (session.result_s3_url || session.result_image_url) {
        sessionsWithImages++;
      }
      if (session.result_s3_url) {
        sessionsWithS3++;
      }
      if (session.result_image_url) {
        sessionsWithResultUrl++;
      }
      if (session.moderation) {
        moderatedSessions++;
      }
    });
    
    // 5. Statistiques
    console.log('\n5. Statistiques:');
    console.log(`   - Sessions avec images: ${sessionsWithImages}/${sessions.length}`);
    console.log(`   - Sessions avec S3 URL: ${sessionsWithS3}/${sessions.length}`);
    console.log(`   - Sessions avec Result URL: ${sessionsWithResultUrl}/${sessions.length}`);
    console.log(`   - Sessions modérées: ${moderatedSessions}/${sessions.length}`);
    
    // 6. Vérifier le filtrage de modération
    console.log('\n6. Test du filtrage de modération...');
    const { data: unmoderatedSessions, error: unmoderatedError } = await supabase
      .from('sessions')
      .select('id, result_s3_url, result_image_url, moderation')
      .eq('project_id', projectId)
      .is('moderation', null);
    
    if (unmoderatedError) {
      console.error('❌ Erreur lors du filtrage:', unmoderatedError);
    } else {
      console.log(`📋 Sessions non modérées: ${unmoderatedSessions.length}`);
      
      const validImages = unmoderatedSessions.filter(s => s.result_s3_url || s.result_image_url);
      console.log(`🖼️  Sessions non modérées avec images: ${validImages.length}`);
    }
    
    // 7. Vérifier les paramètres de mosaïque
    console.log('\n7. Vérification des paramètres de mosaïque...');
    const { data: mosaicSettings, error: mosaicError } = await supabase
      .from('mosaic_settings')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();
    
    if (mosaicError) {
      console.error('❌ Erreur lors de la récupération des paramètres de mosaïque:', mosaicError);
    } else if (mosaicSettings) {
      console.log('✅ Paramètres de mosaïque trouvés:');
      console.log('   - Titre:', mosaicSettings.title);
      console.log('   - QR Code activé:', mosaicSettings.show_qr_code);
    } else {
      console.log('⚠️  Aucun paramètre de mosaïque configuré');
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 DIAGNOSTIC TERMINÉ');
    
  } catch (error) {
    console.error('💥 Erreur générale:', error);
  }
}

// Exécuter le diagnostic
debugProjectImages();