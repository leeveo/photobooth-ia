'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';

export default function AdminDashboard() {
  const supabase = createClientComponentClient();
  const [stats, setStats] = useState({
    backgrounds: 0,
    styles: 0,
    configurations: 0,
    totalPhotos: 0,
  });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsWithPhotoCount, setProjectsWithPhotoCount] = useState({});
  const [photoCountsLoading, setPhotoCountsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch backgrounds count
        const { count: backgroundsCount, error: backgroundsError } = await supabase
          .from('backgrounds')
          .select('*', { count: 'exact', head: true });

        // Fetch styles count
        const { count: stylesCount, error: stylesError } = await supabase
          .from('styles')
          .select('*', { count: 'exact', head: true });

        // Fetch configurations count
        const { count: configurationsCount, error: configurationsError } = await supabase
          .from('settings')
          .select('*', { count: 'exact', head: true });

        if (backgroundsError || stylesError || configurationsError) {
          throw new Error('Erreur lors de la récupération des statistiques');
        }

        setStats({
          backgrounds: backgroundsCount || 0,
          styles: stylesCount || 0,
          configurations: configurationsCount || 0,
          totalPhotos: 0, // Will be updated after fetching photo counts
        });
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    // Fetch projects data
    const fetchProjects = async () => {
      try {
        setProjectsLoading(true);
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);
        
        // Once projects are loaded, fetch photo counts
        if (data && data.length > 0) {
          await fetchPhotoCounts(data);
        } else {
          setPhotoCountsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setPhotoCountsLoading(false);
      } finally {
        setProjectsLoading(false);
      }
    };
    
    // Fetch photo counts for all projects
    const fetchPhotoCounts = async (projectsData) => {
      try {
        setPhotoCountsLoading(true);
        let totalCount = 0;
        const counts = {};
        
        for (const project of projectsData) {
          try {
            // Call the API to get photo count for each project
            const response = await fetch(`/api/s3-project-images?projectId=${project.id}&countOnly=true`);
            if (response.ok) {
              const data = await response.json();
              const count = data.count || 0;
              counts[project.id] = count;
              totalCount += count;
            } else {
              counts[project.id] = 0;
            }
          } catch (err) {
            console.error(`Error fetching photo count for project ${project.id}:`, err);
            counts[project.id] = 0;
          }
        }
        
        setProjectsWithPhotoCount(counts);
        setStats(prev => ({ ...prev, totalPhotos: totalCount }));
      } catch (error) {
        console.error('Error fetching photo counts:', error);
      } finally {
        setPhotoCountsLoading(false);
      }
    };

    fetchStats();
    fetchProjects();
  }, [supabase]);

  // Function to get photobooth type label
  const getPhotoboothTypeLabel = (type) => {
    switch (type) {
      case 'premium':
        return 'Premium';
      case 'photobooth2':
        return 'MiniMax';
      default:
        return 'Standard';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Photo Stats Card - Enhanced with bigger numbers */}
      <div className="p-6 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-500 rounded-lg shadow text-white">
        <h3 className="text-xl font-medium mb-6">Statistiques Globales</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Photos count with bigger number */}
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white text-opacity-80">Total des photos générées</p>
              <div className="flex items-center">
                <span className="text-4xl font-bold">{photoCountsLoading ? '...' : stats.totalPhotos}</span>
                <span className="ml-2 text-sm text-white text-opacity-70">images créées par l&apos;IA</span>
              </div>
            </div>
          </div>
          
          {/* Projects count with bigger number */}
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H5a2 2 0 00-2 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white text-opacity-80">Projets actifs</p>
              <div className="flex items-center">
                <span className="text-4xl font-bold">{projects.length}</span>
                <span className="ml-2 text-sm text-white text-opacity-70">photobooth configurés</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-between items-center border-t border-white border-opacity-20 pt-4">
          <Link href="/photobooth-ia/admin/project-gallery" className="text-sm font-medium hover:underline inline-flex items-center">
            Voir la galerie complète
            <svg className="ml-1 w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
          
          <Link href="/photobooth-ia/admin/projects" className="text-sm font-medium hover:underline inline-flex items-center">
            Gérer les projets
            <svg className="ml-1 w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Projects Summary Card - Keep white for contrast */}
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Tous Vos Projets ({projects.length})</h3>
          <Link href="/photobooth-ia/admin/projects" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            Voir tous les projets
          </Link>
        </div>
        
        {projectsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8 border border-gray-200 rounded-lg">
            <p className="text-gray-500 mb-4">Aucun projet trouvé</p>
            <Link 
              href="/photobooth-ia/admin/projects" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Créer un projet
            </Link>
          </div>
        ) : (
          <div>
            {/* Grille de projets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {projects.slice(0, 6).map((project) => (
                <div 
                  key={project.id}
                  className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Partie supérieure avec logo ou nom */}
                  <div 
                    className="h-40 flex items-center justify-center p-4"
                    style={{ 
                      backgroundColor: project.primary_color || '#f3f4f6',
                      backgroundImage: project.background_image ? `url(${project.background_image})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    {project.logo_url ? (
                      <div className="w-28 h-28 relative bg-white bg-opacity-80 rounded-full p-3 flex items-center justify-center">
                        <Image
                          src={project.logo_url}
                          alt={project.name}
                          fill
                          style={{ objectFit: "contain" }}
                          className="p-2"
                        />
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-white bg-black bg-opacity-50 px-4 py-2 rounded-md">
                        {project.name}
                      </div>
                    )}
                  </div>
                  
                  {/* Corps de la carte avec infos */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{project.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        project.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {project.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-500 mb-2">
                      <div className="flex items-center space-x-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                        </svg>
                        <span className="truncate">/{project.slug}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 rounded">
                          {photoCountsLoading ? '...' : (projectsWithPhotoCount[project.id] || 0)} photos
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{getPhotoboothTypeLabel(project.photobooth_type)}</span>
                      </div>
                      
                      {project.client_name && (
                        <div className="flex items-center space-x-1 mt-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{project.client_name}</span>
                        </div>
                      )}
                      
                      {project.event_date && (
                        <div className="flex items-center space-x-1 mt-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{new Date(project.event_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Boutons d'action */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
                      <Link
                        href={`/photobooth-ia/admin/project-gallery?id=${project.id}`}
                        className="flex-1 text-center text-xs px-2 py-1.5 border border-blue-300 rounded text-blue-700 bg-blue-50 hover:bg-blue-100"
                      >
                        Photos ({projectsWithPhotoCount[project.id] || 0})
                      </Link>
                      <Link
                        href={`/photobooth/${project.slug}`}
                        target="_blank"
                        className="flex-1 text-center text-xs px-2 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                      >
                        Voir
                      </Link>
                      <Link
                        href={`/photobooth-ia/admin/projects/${project.id}`}
                        className="flex-1 text-center text-xs px-2 py-1.5 border border-transparent rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                      >
                        Configurer
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {projects.length > 6 && (
              <div className="mt-6 text-center">
                <Link 
                  href="/photobooth-ia/admin/projects" 
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Voir les {projects.length - 6} autres projets
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Backgrounds Card - Blue Theme */}
        <div className="p-6 bg-blue-50 border-l-4 border-blue-400 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-blue-800">Arrière-plans</h3>
            <span className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
              {stats.backgrounds} total
            </span>
          </div>
          <p className="mt-2 text-sm text-blue-600">
            Gérez les images d&apos;arrière-plan de votre photobooth
          </p>
          <div className="mt-6">
            <Link href="/photobooth-ia/admin/backgrounds" className="text-sm font-medium text-blue-700 hover:text-blue-500 flex items-center">
              Voir tous les arrière-plans
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Styles Card - Purple Theme */}
        <div className="p-6 bg-purple-50 border-l-4 border-purple-400 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-purple-800">Styles</h3>
            <span className="px-3 py-1 text-xs font-medium text-purple-600 bg-purple-100 rounded-full">
              {stats.styles} total
            </span>
          </div>
          <p className="mt-2 text-sm text-purple-600">
            Gérez les styles et tenues disponibles pour les utilisateurs
          </p>
          <div className="mt-6">
            <Link href="/photobooth-ia/admin/styles" className="text-sm font-medium text-purple-700 hover:text-purple-500 flex items-center">
              Voir tous les styles
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Watermark Editor Card - NEW - Green Theme */}
        <div className="p-6 bg-green-50 border-l-4 border-green-400 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-green-800">Éditeur de Filigrane</h3>
            <span className="px-3 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-full">
              Nouveau
            </span>
          </div>
          <p className="mt-2 text-sm text-green-600">
            Créez des filigranes avancés avec du texte et des logos positionnés librement
          </p>
          <div className="mt-6">
            <Link 
              href="/photobooth-ia/admin/watermark-editor"
              className="text-sm font-medium text-green-700 hover:text-green-500 flex items-center"
            >
              Ouvrir l&apos;éditeur de filigrane
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Guide - Use the three colors in sequence */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Guide rapide</h3>
        <div className="space-y-4">
          <div className="p-4 border border-blue-200 bg-blue-50 rounded-md">
            <h4 className="font-medium text-blue-800">1. Création d&apos;un nouveau projet</h4>
            <p className="mt-1 text-sm text-blue-600">
              Commencez par créer un nouveau projet dans la section Projet. Renseignez le nom, le slug URL,
              choisissez le type de photobooth (Standard, Premium, MiniMax ou Avatar), et personnalisez les couleurs.
              Vous pouvez également ajouter un logo et configurer le partage par QR code ou email.
            </p>
          </div>
          <div className="p-4 border border-purple-200 bg-purple-50 rounded-md">
            <h4 className="font-medium text-purple-800">2. Configuration du filigrane</h4>
            <p className="mt-1 text-sm text-purple-600">
              Dans l&apos;onglet Filigrane de votre projet, activez et personnalisez le filigrane qui apparaîtra sur les photos. 
              Vous pouvez ajouter un texte et/ou un logo, définir leur position, couleur, taille et opacité.
            </p>
          </div>
          <div className="p-4 border border-green-200 bg-green-50 rounded-md">
            <h4 className="font-medium text-green-800">3. Ajout des styles</h4>
            <p className="mt-1 text-sm text-green-600">
              Dans l&apos;onglet Styles du projet, ajoutez différents styles de vêtements pour chaque catégorie (homme, femme, ado, groupe).
              Vous pouvez télécharger des images ou utiliser les templates prédéfinis. Chaque style nécessite un nom, une catégorie et une clé unique.
            </p>
          </div>
          <div className="p-4 border border-blue-200 bg-blue-50 rounded-md">
            <h4 className="font-medium text-blue-800">4. Ajout des arrière-plans</h4>
            <p className="mt-1 text-sm text-blue-600">
              Dans l&apos;onglet &quot;Arrière-plans&quot;, téléchargez des images qui seront disponibles comme fond pour les photos.
              Pour de meilleurs résultats, utilisez des images de haute résolution (minimum 1920x1080px).
            </p>
          </div>
          <div className="p-4 border border-purple-200 bg-purple-50 rounded-md">
            <h4 className="font-medium text-purple-800">5. Personnalisation de la galerie mosaïque</h4>
            <p className="mt-1 text-sm text-purple-600">
              Accédez à &quot;Galerie&quot; pour configurer l&apos;affichage mosaïque des photos. Personnalisez l&apos;arrière-plan,
              les couleurs, ajoutez un titre et une description. Vous pouvez également configurer un QR code pour
              permettre aux utilisateurs d&apos;accéder à la galerie complète depuis leur mobile.
            </p>
          </div>
          <div className="p-4 border border-green-200 bg-green-50 rounded-md">
            <h4 className="font-medium text-green-800">6. Test et déploiement</h4>
            <p className="mt-1 text-sm text-green-600">
              Une fois votre projet configuré, testez-le en accédant à l&apos;URL du photobooth. Vérifiez que tous les
              styles s&apos;affichent correctement et que le processus de génération et de partage fonctionne. Si tout est correct,
              vous pouvez partager l&apos;URL ou le QR code à vos utilisateurs.
            </p>
          </div>
          <div className="p-4 border border-blue-200 bg-blue-50 rounded-md">
            <h4 className="font-medium text-blue-800">7. Gestion des photos générées</h4>
            <p className="mt-1 text-sm text-blue-600">
              Depuis la page &quot;Galerie&quot;, vous pouvez visualiser et gérer toutes les photos générées pour chaque projet.
              Vous pouvez également suivre les statistiques d&apos;utilisation sur cette page principale.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
