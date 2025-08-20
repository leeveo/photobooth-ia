const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lguwuucjbdmvkaxltmtk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndXd1dWNqYmRtdmtheGx0bXRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzAzMTUzMywiZXhwIjoyMDQyNjA3NTMzfQ.OOFl9SZdWwCLXNaQoJH7Yr5LKJjYFaLq6YfBxp4Kk7Y';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testShowAnimatedDefault() {
  try {
    console.log('🧪 TEST: Vérification que show_animated=true par défaut');
    console.log('');

    // Obtenir un projet test (coiffure003)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, slug')
      .eq('slug', 'coiffure003')
      .single();

    if (projectError) {
      console.error('❌ Erreur récupération projet:', projectError);
      return;
    }

    console.log('✅ Projet trouvé:', project.name, `(ID: ${project.id})`);

    // Créer un arrière-plan test avec show_animated par défaut
    const testBackgroundData = {
      project_id: project.id,
      name: `Test Background ${new Date().toISOString()}`,
      image_url: 'https://example.com/test-image.jpg',
      video_url: 'https://example.com/test-video.mp4',
      is_active: true,
      show_animated: true // Test avec la valeur par défaut
    };

    console.log('');
    console.log('🔍 Création d\'un arrière-plan test avec show_animated=true...');
    
    const { data: newBackground, error: insertError } = await supabase
      .from('backgrounds')
      .insert(testBackgroundData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erreur création arrière-plan:', insertError);
      return;
    }

    console.log('✅ Arrière-plan créé avec succès!');
    console.log('   ID:', newBackground.id);
    console.log('   Nom:', newBackground.name);
    console.log('   show_animated:', newBackground.show_animated);
    console.log('   video_url:', newBackground.video_url ? 'Présent' : 'Absent');

    // Vérifier que show_animated est bien true
    if (newBackground.show_animated === true) {
      console.log('✅ SUCCESS: show_animated est correctement défini à true');
    } else {
      console.log('❌ ERREUR: show_animated n\'est pas true:', newBackground.show_animated);
    }

    // Nettoyer - supprimer l'arrière-plan test
    console.log('');
    console.log('🧹 Nettoyage - suppression de l\'arrière-plan test...');
    
    const { error: deleteError } = await supabase
      .from('backgrounds')
      .delete()
      .eq('id', newBackground.id);

    if (deleteError) {
      console.error('⚠️ Erreur suppression arrière-plan test:', deleteError);
    } else {
      console.log('✅ Arrière-plan test supprimé avec succès');
    }

    console.log('');
    console.log('🎯 VÉRIFICATION des arrière-plans existants avec vidéos...');
    
    // Vérifier les arrière-plans existants avec des vidéos
    const { data: videoBackgrounds, error: videoError } = await supabase
      .from('backgrounds')
      .select('id, name, show_animated, video_url, video_url_vertical')
      .eq('project_id', project.id)
      .eq('is_active', true)
      .or('video_url.is.not.null,video_url_vertical.is.not.null');

    if (videoError) {
      console.error('❌ Erreur récupération arrière-plans vidéo:', videoError);
      return;
    }

    if (videoBackgrounds.length === 0) {
      console.log('ℹ️ Aucun arrière-plan avec vidéo trouvé pour ce projet');
    } else {
      console.log(`📹 ${videoBackgrounds.length} arrière-plan(s) avec vidéo trouvé(s):`);
      
      videoBackgrounds.forEach(bg => {
        const hasVideoH = !!bg.video_url;
        const hasVideoV = !!bg.video_url_vertical;
        const status = bg.show_animated ? '✅ Activé' : '❌ Désactivé';
        
        console.log(`   - ${bg.name}`);
        console.log(`     show_animated: ${status}`);
        console.log(`     Vidéo H: ${hasVideoH ? 'Oui' : 'Non'}`);
        console.log(`     Vidéo V: ${hasVideoV ? 'Oui' : 'Non'}`);
        console.log('');
      });

      // Compter ceux qui ont des vidéos mais show_animated=false
      const inactiveVideoBackgrounds = videoBackgrounds.filter(bg => !bg.show_animated);
      
      if (inactiveVideoBackgrounds.length > 0) {
        console.log(`⚠️ ATTENTION: ${inactiveVideoBackgrounds.length} arrière-plan(s) avec vidéo ont show_animated=false`);
        console.log('   Ces arrière-plans ne montreront pas leurs vidéos aux utilisateurs.');
      } else {
        console.log('✅ Tous les arrière-plans avec vidéo ont show_animated=true');
      }
    }

    console.log('');
    console.log('🎉 Test terminé avec succès!');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le test
testShowAnimatedDefault();
