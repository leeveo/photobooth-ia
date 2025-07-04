'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { RiBarChart2Line, RiFolder2Line, RiCamera2Line, RiRefreshLine, RiArrowRightSLine } from 'react-icons/ri';
// Ajout des composants recharts
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function StatsPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectsWithPhotoCount, setProjectsWithPhotoCount] = useState({});
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalPhotos: 0,
    topProjects: [],
    photosByMonth: []
  });

  // Récupérer les projets et compter les photos
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Compter les photos pour chaque projet
      let totalPhotos = 0;
      const photoCounts = {};
      for (const project of projectsData || []) {
        try {
          const response = await fetch(`/api/s3-project-images?projectId=${project.id}&countOnly=true`);
          if (!response.ok) throw new Error('API error');
          const countData = await response.json();
          const count = countData.count || 0;
          photoCounts[project.id] = count;
          totalPhotos += count;
        } catch {
          photoCounts[project.id] = 0;
        }
      }
      setProjectsWithPhotoCount(photoCounts);

      // Top 5 projets par nombre de photos
      const topProjects = [...(projectsData || [])]
        .map(p => ({ ...p, photoCount: photoCounts[p.id] || 0 }))
        .sort((a, b) => b.photoCount - a.photoCount)
        .slice(0, 5);

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
        activeProjects: projectsData.filter(p => p.is_active).length,
        totalPhotos,
        topProjects,
        photosByMonth
      });
    } catch (err) {
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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

      {/* Top projets */}
      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Top 5 projets par nombre de photos</h2>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            {stats.topProjects.length === 0 ? (
              <div className="text-gray-500">Aucun projet trouvé.</div>
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
    </div>
  );
}
