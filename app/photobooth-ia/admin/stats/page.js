'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { RiBarChart2Line, RiFolder2Line, RiCamera2Line, RiRefreshLine, RiArrowRightSLine, RiImageLine, RiEyeLine, RiDownloadLine } from 'react-icons/ri';
// Ajout des composants recharts
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Loader from '../../../components/ui/Loader';

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

  // Récupérer l'ID de l'admin connecté
  useEffect(() => {
    const getAdminSession = () => {
      try {
        // Récupérer la session depuis localStorage ou sessionStorage
        const sessionStr = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
        
        if (!sessionStr) {
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
          router.push('/photobooth-ia/admin/login');
          return null;
        }

        setCurrentAdminId(sessionData.user_id);
        return sessionData.user_id;
      } catch (err) {
        router.push('/photobooth-ia/admin/login');
        return null;
      }
    };
    
    getAdminSession();
  }, [router]);

  // Récupérer les projets et compter les photos
  const fetchStats = useCallback(async () => {
    if (!currentAdminId) {
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

  useEffect(() => {
    if (currentAdminId) {
      fetchStats();
    }
  }, [fetchStats, currentAdminId]);

  // Palette de couleurs pour les graphiques
  const COLORS = ['#6366F1', '#8B5CF6', '#F59E42', '#10B981', '#F43F5E'];

  return (
    <div className="space-y-8">
      {/* Loader global - affiche tant que loading est true */}
      {loading ? (
        <Loader size="large" message="Chargement complet des statistiques..." variant="premium" />
      ) : (
        <>
              <div className="p-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-xl shadow-lg text-white mb-6">
        <h1 className="text-2xl font-bold mb-2">Statistiques Globales</h1>
        <p className="text-white text-opacity-80 text-sm">Retrouvez toutes les statistiques de vos projets ici.</p>
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

          {/* Photos par projet */}
          <div className="bg-white shadow rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Photos par projet</h2>
            <div className="flex-1">
              {projects.length === 0 ? (
                <div className="text-gray-500">Aucun projet actif trouvé.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {projects.map((p, idx) => (
                    <li key={p.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-8 w-8 relative">
                          {p.logo_url ? (
                            <Image
                              src={p.logo_url}
                              alt={p.name}
                              fill
                              className="object-cover rounded-md"
                              sizes="32px"
                            />
                          ) : (
                            <div className="h-8 w-8 bg-gray-200 rounded-md flex items-center justify-center">
                              <RiFolder2Line className="h-4 w-4 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <span className="font-medium">{p.name}</span>
                        <span className="text-gray-400 text-xs">/{p.slug}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">{projectsWithPhotoCount[p.id] || 0} photos</span>
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
          </div>
        </>
      )}
    </div>
  );
}
