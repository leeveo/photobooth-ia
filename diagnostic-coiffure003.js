/**
 * Script de diagnostic spécifique pour coiffure003
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gyohqmahwntkmebayeej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5b2hxbWFod250a21lYmF5ZWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDg5NDksImV4cCI6MjA2MjYyNDk0OX0.Pfjtro2esmKm1xKdCtgxnagpdOS7oS9JGhuf31aX8_M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticCoiffure003() {
  try {
    console.log('🔍 DIAGNOSTIC SPÉCIFIQUE - PROJET COIFFURE003\n');
    
    // Récupérer le projet coiffure003
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('slug', 'coiffure003')
      .single();
      
    if (projectError) {
      console.error('❌ Erreur projet:', projectError);
      return;
    }
    
    console.log('📋 DONNÉES DU PROJET:');
    console.log(`   Nom: ${project.name}`);
    console.log(`   Slug: ${project.slug}`);
    console.log(`   ID: ${project.id}`);
    console.log(`   Actif: ${project.is_active}`);
    console.log(`   Type: ${project.photobooth_type || 'non défini'}`);
    console.log('');
    
    // Récupérer TOUS les backgrounds (même inactifs)
    const { data: backgrounds, error: backgroundsError } = await supabase
      .from('backgrounds')
      .select('*')
      .eq('project_id', project.id);
      
    if (backgroundsError) {
      console.error('❌ Erreur backgrounds:', backgroundsError);
      return;
    }
    
    console.log(`📷 TOTAL BACKGROUNDS: ${backgrounds.length}\n`);
    
    backgrounds.forEach((bg, index) => {
      console.log(`${index + 1}. BACKGROUND "${bg.name || 'Sans nom'}"`);
      console.log(`   - ID: ${bg.id}`);
      console.log(`   - Actif: ${bg.is_active}`);
      console.log(`   - Animé: ${bg.show_animated}`);
      console.log(`   - Créé le: ${bg.created_at}`);
      console.log(`   - Type: ${bg.type || 'non défini'}`);
      console.log('');
      
      console.log('   📹 VIDÉOS:');
      console.log(`   - Horizontale: ${bg.video_url || 'AUCUNE'}`);
      console.log(`   - Verticale: ${bg.video_url_vertical || 'AUCUNE'}`);
      console.log('');
      
      console.log('   📷 IMAGES:');
      console.log(`   - Horizontale: ${bg.image_url || 'AUCUNE'}`);
      console.log(`   - Verticale: ${bg.image_url_vertical || 'AUCUNE'}`);
      console.log('');
      
      // Test des URLs publiques
      if (bg.video_url) {
        const { data: urlData } = supabase.storage
          .from('backgrounds')
          .getPublicUrl(bg.video_url);
        console.log(`   🔗 URL publique vidéo horizontale: ${urlData.publicUrl}`);
      }
      
      if (bg.video_url_vertical) {
        const { data: urlDataVertical } = supabase.storage
          .from('backgrounds')
          .getPublicUrl(bg.video_url_vertical);
        console.log(`   🔗 URL publique vidéo verticale: ${urlDataVertical.publicUrl}`);
      }
      
      console.log('-'.repeat(60));
    });
    
    // SOLUTION: Activer l'animation pour les backgrounds avec vidéos
    const backgroundsWithVideo = backgrounds.filter(bg => 
      bg.is_active && (bg.video_url || bg.video_url_vertical)
    );
    
    if (backgroundsWithVideo.length > 0) {
      console.log('\n🔧 SOLUTION PROPOSÉE:');
      console.log('Les backgrounds suivants ont des vidéos mais show_animated=false:');
      
      for (const bg of backgroundsWithVideo) {
        if (!bg.show_animated) {
          console.log(`   - ${bg.name || 'Sans nom'} (ID: ${bg.id})`);
          console.log('     Action: Mettre show_animated=true');
        }
      }
      
      console.log('\n✅ Voulez-vous corriger automatiquement ? (Ajoutez confirm=true au script)');
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

diagnosticCoiffure003();
