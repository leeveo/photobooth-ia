/**
 * Script pour corriger les backgrounds vidéo de coiffure003
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gyohqmahwntkmebayeej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5b2hxbWFod250a21lYmF5ZWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDg5NDksImV4cCI6MjA2MjYyNDk0OX0.Pfjtro2esmKm1xKdCtgxnagpdOS7oS9JGhuf31aX8_M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCoiffure003() {
  try {
    console.log('🔧 CORRECTION DU PROJET COIFFURE003\n');
    
    // ID du background à corriger
    const backgroundId = 'e01f1d3b-ceac-4591-b6ca-62082ad05760';
    
    console.log(`🎯 Activation de l'animation pour le background: ${backgroundId}`);
    
    // Mettre à jour le background pour activer l'animation
    const { data, error } = await supabase
      .from('backgrounds')
      .update({ 
        show_animated: true 
      })
      .eq('id', backgroundId)
      .select();
      
    if (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      return;
    }
    
    console.log('✅ Mise à jour réussie !');
    console.log('📋 Données mises à jour:', data);
    
    console.log('\n🎬 Le background vidéo devrait maintenant s\'afficher sur votre page !');
    console.log('🔄 Actualisez votre navigateur pour voir les changements.');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

fixCoiffure003();
