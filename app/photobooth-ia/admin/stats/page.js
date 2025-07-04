'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { RiBarChart2Line, RiFolder2Line, RiCamera2Line, RiRefreshLine, RiArrowRightSLine, RiImageLine, RiEyeLine, RiDownloadLine } from 'react-icons/ri';
// Ajout des composants recharts
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function StatsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [currentAdminId, setCurrentAdminId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectsWithPhotoCount, setProjectsWithPhotoCount] = useState({});
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalPhotos: 0,
    topProjects: [],
    archivedProjects: [],
    photosByMonth: []
  });
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectPhotos, setProjectPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const itemsPerPage = 12;

  // Récupérer l'ID de l'admin connecté
  useEffect(() => {
    const getAdminSession = () => {
      try {
        // Récupérer la session depuis localStorage ou sessionStorage
        const sessionStr = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
        
        if (!sessionStr) {
          console.warn("Aucune session admin trouvée, redirection vers login");
          router.push('/photobooth-ia/admin/login');
          return null;
        }

        // Correction : décoder base64 avant JSON.parse
        let decodedSession = sessionStr;
        try {
          decodedSession = atob(sessionStr);
        } catch (e) {
          // Si déjà décodé, ignorer
        }
        const sessionData = JSON.parse(decodedSession);

        if (!sessionData.user_id && sessionData.userId) {
          // Support legacy: si userId existe, le mapper
          sessionData.user_id = sessionData.userId;
        }

        if (!sessionData.user_id) {
          console.warn("Session invalide (aucun user_id), redirection vers login");
          router.push('/photobooth-ia/admin/login');
          return null;
        }

        console.log("Session admin trouvée, ID:", sessionData.user_id);
        setCurrentAdminId(sessionData.user_id);
        return sessionData.user_id;
      } catch (err) {
        console.error("Erreur lors de la récupération de la session admin:", err);
        router.push('/photobooth-ia/admin/login');
        return null;
      }
    };
    
    getAdminSession();
  }, [router]);

  // Récupérer les projets et compter les photos
  const fetchStats = useCallback(async () => {
    if (!currentAdminId) {
      console.warn("Impossible de charger les statistiques: admin ID non défini");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // Récupérer uniquement les projets de l'admin connecté
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('created_by', currentAdminId)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;
      
      // Séparer les projets actifs et archivés
      const activeProjects = projectsData?.filter(p => !p.archive) || [];
      const archivedProjects = projectsData?.filter(p => p.archive === true) || [];
      
      setProjects(activeProjects); // Mettre à jour pour n'afficher que les projets actifs dans le sélecteur

      // Compter les photos pour chaque projet depuis la table sessions
      let totalPhotos = 0;
      const photoCounts = {};
      for (const project of projectsData || []) {
        try {
          const { count, error: countError } = await supabase
            .from('sessions')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', project.id);

          if (countError) {
            photoCounts[project.id] = 0;
            continue;
          }
          photoCounts[project.id] = count || 0;
          totalPhotos += count || 0;
        } catch {
          photoCounts[project.id] = 0;
        }
      }
      setProjectsWithPhotoCount(photoCounts);

      // Top 5 projets ACTIFS par nombre de photos
      const topProjects = [...activeProjects]
        .map(p => ({ ...p, photoCount: photoCounts[p.id] || 0 }))
        .sort((a, b) => b.photoCount - a.photoCount)
        .slice(0, 5);

      // Projets archivés avec leur nombre de photos
      const archivedProjectsWithCounts = archivedProjects
        .map(p => ({ ...p, photoCount: photoCounts[p.id] || 0 }))
        .sort((a, b) => b.photoCount - a.photoCount);

      // Statistiques par mois (si possible)
      let photosByMonth = [];
      try {
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('created_at')
          .order('created_at', { ascending: true });

        if (sessionsData) {
          const byMonth = {};
          sessionsData.forEach(s => {
            const d = new Date(s.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            byMonth[key] = (byMonth[key] || 0) + 1;
          });
          photosByMonth = Object.entries(byMonth).map(([month, count]) => ({ month, count }));
        }
      } catch {
        // ignore if sessions table doesn't exist
      }

      setStats({
        totalProjects: projectsData.length,
        activeProjects: activeProjects.length,
        totalPhotos,
        topProjects,
        archivedProjects: archivedProjectsWithCounts,
        photosByMonth
      });
    } catch (err) {
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, [supabase, currentAdminId]);

  // Charger les photos d'un projet spécifique
  const fetchProjectPhotos = useCallback(async (projectId, resetPage = true) => {
    if (!projectId) return;
    
    const currentPage = resetPage ? 1 : page;
    
    setLoadingPhotos(true);
    try {
      const response = await fetch(`/api/s3-project-images?projectId=${projectId}&page=${currentPage}&limit=${itemsPerPage}`);
      
      if (!response.ok) throw new Error('API error');
      
      const data = await response.json();
      
      if (resetPage) {
        setProjectPhotos(data.images || []);
      } else {
        setProjectPhotos(prev => [...prev, ...(data.images || [])]);
      }
      
      setHasMore((data.images || []).length === itemsPerPage);
      
      if (resetPage) {
        setPage(1);
      } else {
        setPage(currentPage + 1);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des photos:', err);
    } finally {
      setLoadingPhotos(false);
    }
  }, [page]);

  // Quand un projet est sélectionné, charger ses photos
  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    fetchProjectPhotos(project.id, true);
  };

  // Charger plus de photos (pagination)
  const loadMorePhotos = () => {
    if (selectedProject && !loadingPhotos) {
      fetchProjectPhotos(selectedProject.id, false);
    }
  };

  useEffect(() => {
    if (currentAdminId) {
      fetchStats();
    }
  }, [fetchStats, currentAdminId]);

  // Palette de couleurs pour les graphiques
  const COLORS = ['#6366F1', '#8B5CF6', '#F59E42', '#10B981', '#F43F5E'];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <RiBarChart2Line className="w-7 h-7 text-indigo-600" />
          Statistiques globales
        </h1>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow hover:from-green-600 hover:to-emerald-700 transition font-medium"
        >
          <RiRefreshLine className="w-5 h-5" />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-blue-50 border-l-4 border-blue-400 rounded-lg shadow-sm flex items-center gap-4">
          <RiFolder2Line className="w-10 h-10 text-blue-600" />
          <div>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <div className="text-sm text-blue-700">Projets créés</div>
          </div>
        </div>
        <div className="p-6 bg-green-50 border-l-4 border-green-400 rounded-lg shadow-sm flex items-center gap-4">
          <RiFolder2Line className="w-10 h-10 text-green-600" />
          <div>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <div className="text-sm text-green-700">Projets actifs</div>
          </div>
        </div>
        <div className="p-6 bg-purple-50 border-l-4 border-purple-400 rounded-lg shadow-sm flex items-center gap-4">
          <RiCamera2Line className="w-10 h-10 text-purple-600" />
          <div>
            <div className="text-2xl font-bold">{stats.totalPhotos}</div>
            <div className="text-sm text-purple-700">Photos générées</div>
          </div>
        </div>
      </div>

      {/* Top projets actifs */}
      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Top 5 projets actifs par nombre de photos</h2>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            {stats.topProjects.length === 0 ? (
              <div className="text-gray-500">Aucun projet actif trouvé.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {stats.topProjects.map((p, idx) => (
                  <li key={p.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-indigo-600">{idx + 1}.</span>
                      <span className="font-medium">{p.name}</span>
                      <span className="text-gray-400 text-xs">/{p.slug}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">{p.photoCount} photos</span>
                      <Link
                        href={`/photobooth-ia/admin/projects/${p.id}`}
                        className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1"
                      >
                        Voir <RiArrowRightSLine className="w-3 h-3" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Pie Chart pour la répartition des photos par projet */}
          {stats.topProjects.length > 0 && (
            <div className="flex-1 min-w-[250px] max-w-[400px] h-[260px]">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={stats.topProjects}
                    dataKey="photoCount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {stats.topProjects.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Nouvelle section: Projets archivés */}
      {stats.archivedProjects && stats.archivedProjects.length > 0 && (
        <div className="bg-white shadow rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <RiFolder2Line className="text-amber-500 mr-2 w-5 h-5" />
            Projets archivés
          </h2>
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projet</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photos</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date d'archivage</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.archivedProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 relative">
                          {project.logo_url ? (
                            <Image
                              src={project.logo_url}
                              alt={project.name}
                              fill
                              className="object-cover rounded-md"
                              sizes="40px"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gray-200 rounded-md flex items-center justify-center">
                              <RiFolder2Line className="h-5 w-5 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{project.name}</div>
                          <div className="text-sm text-gray-500">/{project.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{project.photoCount} photos</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {project.archived_at 
                          ? new Date(project.archived_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })
                          : 'Date inconnue'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/photobooth-ia/admin/projects/${project.id}`}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Statistiques par mois */}
      {stats.photosByMonth.length > 0 && (
        <div className="bg-white shadow rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Évolution des photos générées (par mois)</h2>
          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.photosByMonth}>
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366F1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Nouvelle section: Galerie des photos par projet */}
      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Photos générées par projet</h2>
        
        {/* Sélecteur de projet */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-700">Sélectionnez un projet:</label>
          <div className="flex flex-wrap gap-2">
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => handleProjectSelect(project)}
                className={`px-4 py-2 text-sm rounded-full transition ${
                  selectedProject?.id === project.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {project.name} ({projectsWithPhotoCount[project.id] || 0})
              </button>
            ))}
          </div>
        </div>
        
        {/* Galerie de photos */}
        {selectedProject ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium text-gray-800 flex items-center gap-2">
                <RiImageLine className="text-indigo-500" />
                Photos du projet: {selectedProject.name}
              </h3>
              <span className="text-sm text-gray-500">
                {projectPhotos.length} photo(s) affichée(s)
              </span>
            </div>
            
            {loadingPhotos && projectPhotos.length === 0 ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : projectPhotos.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                <RiImageLine className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucune photo trouvée pour ce projet</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {projectPhotos.map((photo, idx) => (
                    <div key={idx} className="relative group overflow-hidden rounded-lg shadow-sm border border-gray-200">
                      <div className="aspect-square relative">
                        <Image
                          src={photo.url}
                          alt={`Photo ${idx + 1}`}
                          fill
                          className="object-cover transition-all group-hover:opacity-90"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex gap-2">
                          <a
                            href={photo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-white rounded-full text-indigo-600 hover:text-indigo-800"
                            title="Voir l'image"
                          >
                            <RiEyeLine className="w-5 h-5" />
                          </a>
                          <a
                            href={photo.url}
                            download
                            className="p-2 bg-white rounded-full text-green-600 hover:text-green-800"
                            title="Télécharger"
                          >
                            <RiDownloadLine className="w-5 h-5" />
                          </a>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                        {new Date(photo.created_at || photo.last_modified || Date.now()).toLocaleDateString()}
                      </div>
                    </div>
                  ))}

                </div>
                
                {/* Bouton "Charger plus" */}
                {hasMore && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={loadMorePhotos}
                      disabled={loadingPhotos}
                      className="px-5 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-medium disabled:opacity-50"
                    >
                      {loadingPhotos ? (
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-4 w-4 border-t-2 border-r-2 border-indigo-600 rounded-full animate-spin"></span>
                          Chargement...
                        </span>
                      ) : (
                        'Afficher plus de photos'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
            <RiFolder2Line className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Sélectionnez un projet pour voir ses photos</p>
          </div>
        )}
      </div>
    </div>
  );
}
