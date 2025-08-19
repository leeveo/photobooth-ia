import { createClient } from '@supabase/supabase-js';

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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    console.log('🔍 GET TOP PHOTOS: Project ID reçu:', projectId);

    if (!projectId) {
      return Response.json({ error: 'Project ID requis' }, { status: 400 });
    }

    // Récupérer les sessions avec leurs scores
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('id, result_s3_url, result_image_url, created_at, score')
      .eq('project_id', projectId)
      .is('moderation', null) // Seulement les images non modérées
      .not('result_s3_url', 'is', null) // Avoir une image
      .order('score', { ascending: false })
      .limit(10); // Prendre plus que nécessaire

    if (error) {
      console.error('❌ Erreur lors de la récupération des sessions:', error);
      return Response.json({ 
        error: error.message 
      }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      console.log('❌ Aucune session trouvée pour ce projet');
      return Response.json({ 
        success: true, 
        topPhotos: [] 
      });
    }

    // Pour chaque session, récupérer les votes depuis image_votes
    const photosWithVotes = await Promise.all(
      sessions.map(async (session) => {
        // Récupérer les votes pour cette image
        const { data: votes, error: votesError } = await supabase
          .from('image_votes')
          .select('liked')
          .eq('image_id', session.id);

        if (votesError) {
          console.error(`Erreur votes pour ${session.id}:`, votesError);
          return {
            ...session,
            likes: 0,
            dislikes: 0,
            totalVotes: 0
          };
        }

        const likes = votes ? votes.filter(vote => vote.liked === true).length : 0;
        const dislikes = votes ? votes.filter(vote => vote.liked === false).length : 0;
        const totalVotes = likes + dislikes;
        
        // Calculer le score réel basé sur les votes (au lieu de session.score qui ne se met pas à jour)
        const realScore = Math.max(0, likes - dislikes);

        return {
          id: session.id,
          image_url: session.result_s3_url || session.result_image_url,
          created_at: session.created_at,
          score: realScore, // Utiliser le score calculé au lieu de session.score
          db_score: session.score || 0, // Garder le score DB pour debug
          likes,
          dislikes,
          totalVotes,
          likeRatio: totalVotes > 0 ? (likes / totalVotes) * 100 : 0
        };
      })
    );

    // Filtrer et trier
    const validPhotos = photosWithVotes
      .filter(photo => photo.image_url)
      .sort((a, b) => {
        // Trier par score d'abord, puis par ratio de likes
        if (b.score !== a.score) return b.score - a.score;
        if (b.likeRatio !== a.likeRatio) return b.likeRatio - a.likeRatio;
        return b.likes - a.likes;
      });

    // Prendre le top 3
    const topPhotos = validPhotos.slice(0, 3);

    console.log('✅ Top 3 photos calculé:', topPhotos.map(p => ({
      id: p.id,
      score: p.score,
      db_score: p.db_score,
      likes: p.likes,
      dislikes: p.dislikes
    })));

    return Response.json({
      success: true,
      topPhotos,
      totalPhotos: validPhotos.length
    });

  } catch (error) {
    console.error('❌ Erreur API get-top-photos:', error);
    return Response.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
