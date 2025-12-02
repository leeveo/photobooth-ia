'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function SwipeResultsPage() {
  const params = useParams();
  const slug = params?.slug;
  const supabase = createSupabaseClient();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ totalScores: 0, likes: 0, passes: 0, likeRatio: 0 });

  useEffect(() => {
    async function loadResults() {
      if (!slug) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // 1. Récupérer les infos du projet par slug
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('id, name, slug, description, logo_url, primary_color, secondary_color')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (projectError || !project) {
          throw new Error('Projet non trouvé ou inactif');
        }

        setProjectData(project);

        // 2. Charger les résultats avec scores
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('id, result_s3_url, result_image_url, created_at, score')
          .eq('project_id', project.id)
          .not('score', 'is', null) // Seulement les images qui ont été swipées
          .order('score', { ascending: false })
          .order('created_at', { ascending: false });

        if (sessionsError) {
          throw new Error('Erreur lors du chargement des résultats');
        }

        const resultsWithImages = (sessionsData || [])
          .map(session => ({
            id: session.id,
            image_url: session.result_s3_url || session.result_image_url,
            created_at: session.created_at,
            score: session.score || 0,
          }))
          .filter(img => img.image_url);

        setResults(resultsWithImages);

        // 3. Calculer les statistiques
        const totalScores = resultsWithImages.length;
        const likes = resultsWithImages.filter(r => r.score === 1).length;
        const passes = resultsWithImages.filter(r => r.score === 0).length;
        const likeRatio = totalScores > 0 ? (likes / totalScores) * 100 : 0;

        setStats({ totalScores, likes, passes, likeRatio });

      } catch (err) {
        console.error('Erreur lors du chargement des résultats:', err);
        setError(err.message || 'Impossible de charger les résultats');
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, [slug, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Chargement des résultats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-white mb-4">Erreur</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <a 
            href="/"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  const likedPhotos = results.filter(r => r.score === 1);
  const passedPhotos = results.filter(r => r.score === 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 py-8 px-4">
      {/* En-tête */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="text-center">
          {projectData?.logo_url && (
            <div className="mb-4 flex justify-center">
              <div className="w-32 h-20 relative">
                <Image
                  src={projectData.logo_url}
                  alt={projectData.name}
                  fill
                  className="object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          )}
          
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
            Résultats des votes
          </h1>
          
          <p className="text-lg text-white/90 mb-6">
            {projectData?.name}
          </p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="text-3xl mb-2">📊</div>
            <div className="text-2xl font-bold text-white">{stats.totalScores}</div>
            <div className="text-sm text-white/70">Total évalué</div>
          </motion.div>

          <motion.div
            className="bg-green-500/20 backdrop-blur-sm rounded-2xl p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-3xl mb-2">❤️</div>
            <div className="text-2xl font-bold text-green-300">{stats.likes}</div>
            <div className="text-sm text-green-200">J'aime</div>
          </motion.div>

          <motion.div
            className="bg-red-500/20 backdrop-blur-sm rounded-2xl p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-3xl mb-2">❌</div>
            <div className="text-2xl font-bold text-red-300">{stats.passes}</div>
            <div className="text-sm text-red-200">Passé</div>
          </motion.div>

          <motion.div
            className="bg-blue-500/20 backdrop-blur-sm rounded-2xl p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="text-3xl mb-2">📈</div>
            <div className="text-2xl font-bold text-blue-300">{stats.likeRatio.toFixed(1)}%</div>
            <div className="text-sm text-blue-200">Taux d'approbation</div>
          </motion.div>
        </div>
      </div>

      {/* Photos aimées */}
      {likedPhotos.length > 0 && (
        <div className="max-w-6xl mx-auto mb-12">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-white mb-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            ❤️ Photos les plus appréciées ({likedPhotos.length})
          </motion.h2>
          
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {likedPhotos.map((photo, index) => (
              <motion.div
                key={photo.id}
                className="aspect-square relative rounded-xl overflow-hidden shadow-lg group"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + (index * 0.1) }}
                whileHover={{ scale: 1.05 }}
              >
                <Image
                  src={photo.image_url}
                  alt={`Photo aimée ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/placeholder-image.png';
                  }}
                />
                
                {/* Badge ❤️ */}
                <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  ❤️
                </div>
                
                {/* Date overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white text-xs">
                    {new Date(photo.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Photos passées */}
      {passedPhotos.length > 0 && (
        <div className="max-w-6xl mx-auto mb-12">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-white mb-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            ❌ Photos passées ({passedPhotos.length})
          </motion.h2>
          
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            {passedPhotos.map((photo, index) => (
              <motion.div
                key={photo.id}
                className="aspect-square relative rounded-xl overflow-hidden shadow-lg group opacity-60"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.6, scale: 1 }}
                transition={{ delay: 1 + (index * 0.05) }}
                whileHover={{ opacity: 0.8, scale: 1.02 }}
              >
                <Image
                  src={photo.image_url}
                  alt={`Photo passée ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/placeholder-image.png';
                  }}
                />
                
                {/* Badge ❌ */}
                <div className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  ❌
                </div>
                
                {/* Date overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white text-xs">
                    {new Date(photo.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Actions */}
      <div className="max-w-md mx-auto text-center">
        <div className="flex flex-col gap-4">
          <motion.a
            href={`/photobooth-coiffure/${slug}/swipe`}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-bold shadow-lg hover:from-pink-600 hover:to-purple-700 transition-all"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🔄 Continuer à évaluer
          </motion.a>
          
          <motion.a
            href={`/photobooth-coiffure/${slug}/gallery`}
            className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-lg font-bold shadow-lg hover:bg-white/20 transition-all"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🖼️ Voir la galerie classique
          </motion.a>
        </div>
      </div>
    </div>
  );
}
