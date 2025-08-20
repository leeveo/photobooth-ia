/**
 * Script de diagnostic pour vérifier les backgrounds vidéo
 */

const { createClient } = require('@supabase/supabase-js');

// Utiliser directement les clés depuis le .env.local
const supabaseUrl = 'https://gyohqmahwntkmebayeej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5b2hxbWFod250a21lYmF5ZWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDg5NDksImV4cCI6MjA2MjYyNDk0OX0.Pfjtro2esmKm1xKdCtgxnagpdOS7oS9JGhuf31aX8_M';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticVideoBackgrounds() {
  try {
    console.log('🔍 DIAGNOSTIC DES BACKGROUNDS VIDÉO\n');
    
    // 1. Récupérer tous les projets
    console.log('📋 Récupération des projets...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, slug')
      .eq('is_active', true);
      
    if (projectsError) {
      console.error('❌ Erreur projets:', projectsError);
      return;
    }
    
    console.log(`✅ ${projects.length} projets trouvés\n`);
    
    // 2. Pour chaque projet, vérifier les backgrounds
    for (const project of projects) {
      console.log(`🎯 PROJET: ${project.name} (${project.slug})`);
      console.log(`   ID: ${project.id}\n`);
      
      // Récupérer les backgrounds
      const { data: backgrounds, error: backgroundsError } = await supabase
        .from('backgrounds')
        .select('*')
        .eq('project_id', project.id)
        .eq('is_active', true);
        
      if (backgroundsError) {
        console.error(`❌ Erreur backgrounds pour ${project.name}:`, backgroundsError);
        continue;
      }
      
      console.log(`   📷 Total backgrounds: ${backgrounds.length}`);
      
      // Analyser les backgrounds
      const animatedBgs = backgrounds.filter(bg => bg.show_animated === true);
      const withVideoUrl = backgrounds.filter(bg => bg.video_url && bg.video_url.trim() !== '');
      const withVideoUrlVertical = backgrounds.filter(bg => bg.video_url_vertical && bg.video_url_vertical.trim() !== '');
      const withBothVideos = backgrounds.filter(bg => 
        (bg.video_url && bg.video_url.trim() !== '') && 
        (bg.video_url_vertical && bg.video_url_vertical.trim() !== '')
      );
      
      console.log(`   🎬 Backgrounds animés: ${animatedBgs.length}`);
      console.log(`   📹 Avec vidéo horizontale: ${withVideoUrl.length}`);
      console.log(`   📱 Avec vidéo verticale: ${withVideoUrlVertical.length}`);
      console.log(`   🔄 Avec les deux vidéos: ${withBothVideos.length}`);
      
      // Détails des backgrounds avec vidéos
      const videoBackgrounds = backgrounds.filter(bg => 
        bg.show_animated === true && 
        ((bg.video_url && bg.video_url.trim() !== '') || 
         (bg.video_url_vertical && bg.video_url_vertical.trim() !== ''))
      );
      
      if (videoBackgrounds.length > 0) {
        console.log('\n   📋 DÉTAILS DES BACKGROUNDS VIDÉO:');
        videoBackgrounds.forEach((bg, index) => {
          console.log(`   ${index + 1}. ${bg.name || 'Sans nom'}`);
          console.log(`      - ID: ${bg.id}`);
          console.log(`      - Animé: ${bg.show_animated}`);
          console.log(`      - Actif: ${bg.is_active}`);
          console.log(`      - Vidéo horizontale: ${bg.video_url || 'AUCUNE'}`);
          console.log(`      - Vidéo verticale: ${bg.video_url_vertical || 'AUCUNE'}`);
          console.log(`      - Image horizontale: ${bg.image_url || 'AUCUNE'}`);
          console.log(`      - Image verticale: ${bg.image_url_vertical || 'AUCUNE'}`);
          
          // Test d'accès aux URLs
          if (bg.video_url) {
            const { data: urlData } = supabase.storage
              .from('backgrounds')
              .getPublicUrl(bg.video_url);
            console.log(`      - URL publique horizontale: ${urlData.publicUrl}`);
          }
          
          if (bg.video_url_vertical) {
            const { data: urlDataVertical } = supabase.storage
              .from('backgrounds')
              .getPublicUrl(bg.video_url_vertical);
            console.log(`      - URL publique verticale: ${urlDataVertical.publicUrl}`);
          }
          
          console.log('');
        });
      } else {
        console.log('   ❌ Aucun background vidéo trouvé pour ce projet\n');
      }
      
      console.log('-'.repeat(80) + '\n');
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le diagnostic
diagnosticVideoBackgrounds();
