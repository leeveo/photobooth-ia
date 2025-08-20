const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = 'https://lguwuucjbdmvkaxltmtk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndXd1dWNqYmRtdmtheGx0bXRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzAzMTUzMywiZXhwIjoyMDQyNjA3NTMzfQ.OOFl9SZdWwCLXNaQoJH7Yr5LKJjYFaLq6YfBxp4Kk7Y';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function quickCheck() {
  try {
    console.log('🔗 Test de connexion Supabase...');
    
    // Test simple de connexion
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, slug')
      .limit(1);

    if (error) {
      console.error('❌ Erreur connexion:', error);
      return;
    }

    console.log('✅ Connexion réussie!');
    console.log('✅ Projet exemple:', data[0]?.name || 'Aucun projet trouvé');

    // Vérifier les arrière-plans coiffure003
    console.log('');
    console.log('🔍 Vérification des arrière-plans coiffure003...');
    
    const { data: backgrounds, error: bgError } = await supabase
      .from('backgrounds')
      .select('id, name, show_animated, video_url, video_url_vertical')
      .eq('project_id', 'fe3f2bc5-bc44-4b39-8eff-5dd5c3d48f9b')
      .eq('is_active', true);

    if (bgError) {
      console.error('❌ Erreur récupération backgrounds:', bgError);
      return;
    }

    console.log(`📋 ${backgrounds.length} arrière-plan(s) trouvé(s):`);
    
    backgrounds.forEach(bg => {
      const hasVideo = bg.video_url || bg.video_url_vertical;
      const animStatus = bg.show_animated ? '✅ Activé' : '❌ Désactivé';
      
      console.log(`   ${bg.name}`);
      console.log(`   show_animated: ${animStatus}`);
      console.log(`   Vidéo: ${hasVideo ? 'Oui' : 'Non'}`);
      console.log('');
    });

    // Résumé
    const videoBackgrounds = backgrounds.filter(bg => bg.video_url || bg.video_url_vertical);
    const activeVideoBackgrounds = videoBackgrounds.filter(bg => bg.show_animated);
    
    console.log('📊 RÉSUMÉ:');
    console.log(`   Total arrière-plans: ${backgrounds.length}`);
    console.log(`   Avec vidéo: ${videoBackgrounds.length}`);
    console.log(`   Avec vidéo ET show_animated=true: ${activeVideoBackgrounds.length}`);
    
    if (videoBackgrounds.length > 0 && activeVideoBackgrounds.length === videoBackgrounds.length) {
      console.log('🎉 PARFAIT: Tous les arrière-plans avec vidéo ont show_animated=true');
    } else if (videoBackgrounds.length > 0) {
      console.log('⚠️ ATTENTION: Certains arrière-plans avec vidéo ont show_animated=false');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Exécuter la vérification
quickCheck();
