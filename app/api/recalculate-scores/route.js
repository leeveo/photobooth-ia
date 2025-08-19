import { createClient } from '@supabase/supabase-js';

// Client Supabase avec service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request) {
  try {
    const { projectId } = await request.json();

    console.log('🔧 RECALCUL SCORES: Project ID reçu:', projectId);

    if (!projectId) {
      return Response.json({ error: 'Project ID requis' }, { status: 400 });
    }

    // 1. Récupérer toutes les sessions du projet
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id')
      .eq('project_id', projectId)
      .not('result_s3_url', 'is', null);

    if (sessionsError) {
      console.error('❌ Erreur lors de la récupération des sessions:', sessionsError);
      return Response.json({ error: sessionsError.message }, { status: 500 });
    }

    let updatedCount = 0;
    const scoreUpdates = [];

    // 2. Pour chaque session, recalculer le score
    for (const session of sessions) {
      // Récupérer les votes pour cette session
      const { data: votes, error: votesError } = await supabase
        .from('image_votes')
        .select('liked')
        .eq('image_id', session.id);

      if (votesError) {
        console.error(`Erreur votes pour ${session.id}:`, votesError);
        continue;
      }

      // Calculer le score
      const likes = votes ? votes.filter(vote => vote.liked === true).length : 0;
      const dislikes = votes ? votes.filter(vote => vote.liked === false).length : 0;
      const calculatedScore = Math.max(0, likes - dislikes); // Minimum 0

      // Mettre à jour le score
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ score: calculatedScore })
        .eq('id', session.id);

      if (updateError) {
        console.error(`Erreur mise à jour score pour ${session.id}:`, updateError);
      } else {
        updatedCount++;
        scoreUpdates.push({
          imageId: session.id,
          likes,
          dislikes,
          score: calculatedScore
        });
        console.log(`✅ Score mis à jour pour ${session.id}: ${calculatedScore} (${likes} likes, ${dislikes} dislikes)`);
      }
    }

    console.log(`🎯 Recalcul terminé: ${updatedCount} scores mis à jour`);

    return Response.json({
      success: true,
      message: `${updatedCount} scores recalculés avec succès`,
      updatedCount,
      scoreUpdates: scoreUpdates.slice(0, 10) // Limiter pour éviter une réponse trop lourde
    });

  } catch (error) {
    console.error('❌ Erreur API recalculate-scores:', error);
    return Response.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
