// Version simplifiée pour corriger les erreurs de syntaxe
// Remplacer la fonction loadSessionImages complètement

const loadSessionImages = async (limit = displayLimit, skipCountCheck = false) => {
  if (!projectId) return;
  
  setLoading(true);
  setError(null);

  try {
    // Gérer les projets problématiques
    const isHugeProject = projectId === 'b492a7b4-de73-4401-aa53-d98be285d07b';
    
    // Skip count check pour les gros projets
    if (!skipCountCheck && !isHugeProject) {
      try {
        const { count: currentCount, error: countError } = await Promise.race([
          supabase
            .from('sessions')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId)
            .is('moderation', null),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('COUNT_TIMEOUT')), 5000)
          )
        ]);
      
        if (!countError) {
          const count = currentCount || 0;
          setLastKnownCount(count);
          
          if (count === lastKnownCount && limit === displayLimit && projectImages.length > 0) {
            console.log('Aucune nouvelle image détectée');
            setLoading(false);
            return;
          }
        }
      } catch (timeoutError) {
        console.warn('Timeout sur le comptage, chargement direct');
      }
    }

    // Définir les limites sécurisées
    const safeLimit = isHugeProject ? 5 : Math.min(limit, 10);
    const timeoutDuration = isHugeProject ? 4000 : 8000;
    
    console.log(`Chargement de ${safeLimit} images${isHugeProject ? ' [PROJET VOLUMINEUX]' : ''}`);

    // Chargement principal avec timeout
    let result;
    try {
      result = await Promise.race([
        supabase
          .from('sessions')
          .select('id, result_s3_url, result_image_url, created_at, moderation')
          .eq('project_id', projectId)
          .is('moderation', null)
          .order('created_at', { ascending: false })
          .limit(safeLimit),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('QUERY_TIMEOUT')), timeoutDuration)
        )
      ]);

      if (result.error) throw result.error;

    } catch (mainError) {
      console.warn('Erreur sur requête principale, essai fallback');
      
      // Fallback avec limite ultra-réduite
      const fallbackLimit = isHugeProject ? 3 : 5;
      
      result = await supabase
        .from('sessions')
        .select('id, result_s3_url, result_image_url, created_at')
        .eq('project_id', projectId)
        .not('result_s3_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(fallbackLimit);

      if (result.error) {
        throw new Error('Impossible de charger les images même en mode minimal');
      }
    }

    // Traitement des résultats
    const sessions = result.data || [];
    const images = sessions
      .map(session => ({
        id: session.id,
        image_url: session.result_s3_url || session.result_image_url,
        created_at: session.created_at,
        metadata: {
          fileName: session.result_s3_url ? session.result_s3_url.split('/').pop() : '',
          size: null
        }
      }))
      .filter(img => img.image_url);

    setProjectImages(images);
    setHasMoreImages(images.length >= safeLimit);
    setLastRefresh(new Date());
    
    console.log(`✅ ${images.length} images chargées avec succès`);

  } catch (error) {
    console.error('Erreur fatale:', error);
    setError(`Impossible de charger la mosaïque: ${error.message}`);
    setProjectImages([]);
    setHasMoreImages(false);
  } finally {
    setLoading(false);
  }
};