const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = 'https://gyohqmahwntkmebayeej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5b2hxbWFod250a21lYmF5ZWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDg5NDksImV4cCI6MjA2MjYyNDk0OX0.Pfjtro2esmKm1xKdCtgxnagpdOS7oS9JGhuf31aX8_M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPerformance() {
  const projectId = 'b492a7b4-de73-4401-aa53-d98be285d07b';
  
  console.log('🔍 Test de performance avec différentes limites...');
  
  // Test avec différentes limites
  const limits = [5, 10, 20, 30];
  
  for (const limit of limits) {
    console.log(`\n📊 Test avec limite ${limit}...`);
    
    try {
      const startTime = Date.now();
      
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, result_s3_url, result_image_url, created_at, moderation')
        .eq('project_id', projectId)
        .is('moderation', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      const endTime = Date.now();
      
      if (sessionsError) {
        console.error(`❌ Erreur avec limite ${limit}:`, sessionsError.message);
        break;
      }
      
      console.log(`✅ Limite ${limit}: ${sessionsData.length} sessions en ${endTime - startTime}ms`);
      
      // Si ça marche, essayons de compter sans timeout
      if (limit === 5) {
        console.log('\n🔢 Tentative de décompte avec timeout court...');
        try {
          // Requête avec un timeout plus court pour éviter le blocage
          const { count, error: countError } = await Promise.race([
            supabase
              .from('sessions')
              .select('*', { count: 'exact', head: true })
              .eq('project_id', projectId),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout manuel')), 5000)
            )
          ]);
          
          if (countError) {
            console.error('❌ Erreur de décompte:', countError.message);
          } else {
            console.log(`📈 Total estimé des sessions: ${count}`);
          }
        } catch (timeoutError) {
          console.log('⏱️  Timeout sur le décompte - probablement >100k sessions');
        }
      }
      
    } catch (error) {
      console.error(`💥 Erreur avec limite ${limit}:`, error.message);
      break;
    }
  }
  
  // Solution recommandée
  console.log('\n💡 SOLUTION RECOMMANDÉE:');
  console.log('   1. Réduire la limite par défaut à 20 ou moins');
  console.log('   2. Ajouter une pagination plus agressive');
  console.log('   3. Ajouter un index sur (project_id, created_at, moderation)');
  console.log('   4. Considérer un cache pour les gros projets');
}

testPerformance();