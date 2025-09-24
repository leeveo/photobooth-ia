// Marquer comme dynamique pour éviter l'erreur de rendu statique
export const dynamic = 'force-dynamic';

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
    const { imageId, liked, projectId } = await request.json();

    console.log('🔍 UPDATE SCORE: Image ID:', imageId, 'Liked:', liked);

    // Validation des données
    if (!imageId || liked === undefined) {
      return Response.json(
        { error: 'imageId et liked sont requis' },
        { status: 400 }
      );
    }

    // 1. Récupérer le score actuel
    const { data: currentSession, error: getCurrentError } = await supabase
      .from('sessions')
      .select('score')
      .eq('id', imageId)
      .single();

    if (getCurrentError) {
      console.error('Erreur lors de la récupération du score actuel:', getCurrentError);
      return Response.json(
        { error: 'Erreur lors de la récupération du score actuel' },
        { status: 500 }
      );
    }

    // 2. Calculer le nouveau score
    // Si le score est null ou undefined, commencer à 0
    const currentScore = currentSession.score || 0;
    const newScore = liked ? currentScore + 1 : Math.max(0, currentScore - 1); // Empêcher les scores négatifs

    console.log(`🔍 Score update: ${currentScore} -> ${newScore} (${liked ? 'LIKE +1' : 'DISLIKE -1'})`);

    // 3. Mettre à jour le score dans la table sessions
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .update({ score: newScore })
      .eq('id', imageId)
      .select('id, project_id, score');

    if (sessionError) {
      console.error('❌ Erreur lors de la mise à jour du score dans sessions:', sessionError);
      return Response.json(
        { error: 'Erreur lors de la mise à jour du score' },
        { status: 500 }
      );
    }

    // 4. Enregistrer le vote dans image_votes pour le tracking
    const { error: voteError } = await supabase
      .from('image_votes')
      .insert({
        image_id: imageId,
        liked: liked,
        voted_at: new Date().toISOString(),
        project_id: projectId
      });

    if (voteError) {
      console.error('❌ Erreur lors de l\'enregistrement du vote:', voteError);
      // Ne pas faire échouer la requête si l'enregistrement du vote échoue
    }

    console.log(`✅ Score mis à jour pour l'image ${imageId}: ${newScore} (${liked ? 'liked' : 'passed'})`);

    return Response.json({
      success: true,
      imageId,
      score: newScore,
      liked
    });

  } catch (error) {
    console.error('❌ Erreur dans l\'API update-image-score:', error);
    return Response.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId requis' },
        { status: 400 }
      );
    }

    // Récupérer les statistiques des scores pour un projet
    const { data: stats, error } = await supabase
      .from('sessions')
      .select('score')
      .eq('project_id', projectId)
      .not('score', 'is', null);

    if (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des statistiques' },
        { status: 500 }
      );
    }

    const totalScores = stats.length;
    const likes = stats.filter(s => s.score === 1).length;
    const passes = stats.filter(s => s.score === 0).length;

    return NextResponse.json({
      totalScores,
      likes,
      passes,
      likeRatio: totalScores > 0 ? (likes / totalScores) * 100 : 0
    });

  } catch (error) {
    console.error('Erreur dans l\'API GET update-image-score:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
