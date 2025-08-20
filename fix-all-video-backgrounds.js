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

async function fixAllVideoBackgrounds() {
  try {
    console.log('🔧 CORRECTION: Activation automatique de show_animated pour tous les arrière-plans avec vidéos');
    console.log('');

    // 1. Trouver tous les arrière-plans avec des vidéos mais show_animated=false
    console.log('🔍 Recherche des arrière-plans avec vidéos mais show_animated=false...');
    
    const { data: videoBackgrounds, error: searchError } = await supabase
      .from('backgrounds')
      .select('id, project_id, name, show_animated, video_url, video_url_vertical')
      .eq('is_active', true)
      .or('video_url.is.not.null,video_url_vertical.is.not.null');

    if (searchError) {
      console.error('❌ Erreur recherche:', searchError);
      return;
    }

    console.log(`📋 ${videoBackgrounds.length} arrière-plan(s) avec vidéo trouvé(s)`);

    // Filtrer ceux qui ont show_animated=false
    const needFixing = videoBackgrounds.filter(bg => !bg.show_animated);
    
    if (needFixing.length === 0) {
      console.log('✅ Tous les arrière-plans avec vidéo ont déjà show_animated=true');
      
      // Afficher le statut de tous les arrière-plans avec vidéo
      console.log('');
      console.log('📊 STATUT DES ARRIÈRE-PLANS AVEC VIDÉOS:');
      videoBackgrounds.forEach(bg => {
        const hasVideoH = !!bg.video_url;
        const hasVideoV = !!bg.video_url_vertical;
        console.log(`   ✅ ${bg.name}`);
        console.log(`      show_animated: true`);
        console.log(`      Vidéo H: ${hasVideoH ? 'Oui' : 'Non'}`);
        console.log(`      Vidéo V: ${hasVideoV ? 'Oui' : 'Non'}`);
        console.log('');
      });
      return;
    }

    console.log(`⚠️ ${needFixing.length} arrière-plan(s) avec vidéo ont show_animated=false:`);
    needFixing.forEach(bg => {
      const hasVideoH = !!bg.video_url;
      const hasVideoV = !!bg.video_url_vertical;
      console.log(`   - ${bg.name}`);
      console.log(`     Vidéo H: ${hasVideoH ? 'Oui' : 'Non'}`);
      console.log(`     Vidéo V: ${hasVideoV ? 'Oui' : 'Non'}`);
    });

    console.log('');
    console.log('🔧 Correction en cours...');

    // 2. Mettre à jour tous ces arrière-plans pour show_animated=true
    const idsToFix = needFixing.map(bg => bg.id);
    
    const { data: updatedData, error: updateError } = await supabase
      .from('backgrounds')
      .update({ show_animated: true })
      .in('id', idsToFix)
      .select();

    if (updateError) {
      console.error('❌ Erreur mise à jour:', updateError);
      return;
    }

    console.log(`✅ ${updatedData.length} arrière-plan(s) mis à jour avec succès!`);

    // 3. Vérification finale
    console.log('');
    console.log('🔍 Vérification finale...');
    
    const { data: finalCheck, error: checkError } = await supabase
      .from('backgrounds')
      .select('id, project_id, name, show_animated, video_url, video_url_vertical')
      .eq('is_active', true)
      .or('video_url.is.not.null,video_url_vertical.is.not.null');

    if (checkError) {
      console.error('❌ Erreur vérification:', checkError);
      return;
    }

    const stillNeedFixing = finalCheck.filter(bg => !bg.show_animated);
    
    if (stillNeedFixing.length === 0) {
      console.log('🎉 PARFAIT! Tous les arrière-plans avec vidéo ont maintenant show_animated=true');
      
      // Afficher le résumé par projet
      console.log('');
      console.log('📊 RÉSUMÉ PAR PROJET:');
      
      const projectGroups = finalCheck.reduce((acc, bg) => {
        if (!acc[bg.project_id]) {
          acc[bg.project_id] = [];
        }
        acc[bg.project_id].push(bg);
        return acc;
      }, {});

      for (const [projectId, backgrounds] of Object.entries(projectGroups)) {
        console.log(`   Projet ${projectId}: ${backgrounds.length} arrière-plan(s) avec vidéo`);
        backgrounds.forEach(bg => {
          const hasVideoH = !!bg.video_url;
          const hasVideoV = !!bg.video_url_vertical;
          console.log(`      ✅ ${bg.name} (H:${hasVideoH ? 'Oui' : 'Non'}, V:${hasVideoV ? 'Oui' : 'Non'})`);
        });
        console.log('');
      }
    } else {
      console.log(`❌ PROBLÈME: ${stillNeedFixing.length} arrière-plan(s) ont encore show_animated=false`);
    }

    console.log('');
    console.log('🎯 ACTION RECOMMANDÉE:');
    console.log('   1. Actualisez votre page d\'administration');
    console.log('   2. Testez votre photobooth - les vidéos devraient maintenant s\'afficher');
    console.log('   3. Si le problème persiste, vérifiez que les URLs des vidéos sont valides');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter la correction
fixAllVideoBackgrounds();
