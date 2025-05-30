'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';

export default function Dashboard() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalSessions: 0,
    totalPhotos: 0,
    recentSessions: []
  });
  const [projects, setProjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [projectsWithPhotoCount, setProjectsWithPhotoCount] = useState({});
  
  useEffect(() => {
    // Fetch dashboard data
    async function fetchDashboardData() {
      setLoading(true);
      try {
        // Fetch projects
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (projectsError) throw projectsError;
        
        // Fetch recent sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('*, projects(name)')
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (sessionsError) throw sessionsError;
        
        // Calculate stats
        const activeProjects = projectsData ? projectsData.filter(p => p.is_active).length : 0;
        
        setProjects(projectsData || []);
        setSessions(sessionsData || []);
        
        // Fetch photo counts for each project
        let totalPhotos = 0;
        const photoCounts = {};
        
        for (const project of projectsData || []) {
          try {
            // Call API to count S3 images
            const response = await fetch(`/api/s3-project-images?projectId=${project.id}&countOnly=true`);
            if (response.ok) {
              const countData = await response.json();
              const count = countData.count || 0;
              photoCounts[project.id] = count;
              totalPhotos += count;
            }
          } catch (countError) {
            console.error(`Error fetching counts for project ${project.id}:`, countError);
            photoCounts[project.id] = 0;
          }
        }
        
        setProjectsWithPhotoCount(photoCounts);
        
        setStats({
          totalProjects: projectsData ? projectsData.length : 0,
          activeProjects,
          totalSessions: sessionsData ? sessionsData.length : 0,
          totalPhotos,
          recentSessions: sessionsData || []
        });
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Projects Card */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg rounded-lg text-white">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase font-semibold opacity-75">Total des projets</p>
                <h2 className="text-3xl font-bold">{stats.totalProjects}</h2>
              </div>
              <div className="rounded-full bg-white bg-opacity-30 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="font-medium">{stats.activeProjects} actifs</span>
              <span className="mx-2">•</span>
              <span>{stats.totalProjects - stats.activeProjects} inactifs</span>
            </div>
          </div>
          <div className="bg-black bg-opacity-20 px-5 py-3">
            <Link href="/photobooth-ia/admin/projects" className="text-sm font-medium hover:underline flex items-center">
              Voir tous les projets
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
        
        {/* Photos Card - Enhanced with additional information */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg rounded-lg text-white">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase font-semibold opacity-75">Total des photos</p>
                <h2 className="text-3xl font-bold">{stats.totalPhotos}</h2>
              </div>
              <div className="rounded-full bg-white bg-opacity-30 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm flex items-center justify-between">
                <span className="font-medium">Photos générées par IA</span>
                {loading ? (
                  <span className="text-xs opacity-75">Chargement...</span>
                ) : (
                  <span className="text-xs opacity-75">sur {stats.totalProjects} projets</span>
                )}
              </div>
              
              {/* Add a small project breakdown */}
              {!loading && projects.length > 0 && (
                <div className="mt-2 text-xs space-y-1 opacity-90">
                  <div className="flex flex-wrap gap-1">
                    {projects.slice(0, 3).map(project => (
                      <span key={project.id} className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full">
                        {project.name.substring(0, 10)}{project.name.length > 10 ? '...' : ''}: {projectsWithPhotoCount[project.id] || 0}
                      </span>
                    ))}
                    {projects.length > 3 && (
                      <span className="bg-white bg-opacity-10 px-2 py-0.5 rounded-full">
                        +{projects.length - 3} projets
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="bg-black bg-opacity-20 px-5 py-3">
            <Link href="/photobooth-ia/admin/project-gallery" className="text-sm font-medium hover:underline flex items-center">
              Voir la galerie
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
        
        {/* Other stat cards can be added here */}
      </div>
      
      {/* Projects List */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Projets ({projects.length})</h3>
          <Link href="/photobooth-ia/admin/projects" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            Voir tous
          </Link>
        </div>
        
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              <p className="mt-2 text-sm text-gray-500">Chargement des projets...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500">Aucun projet trouvé.</p>
              <Link href="/photobooth-ia/admin/projects" className="mt-2 inline-block text-sm text-indigo-600 hover:text-indigo-500">
                Créer un nouveau projet
              </Link>
            </div>
          ) : (
            <>
              {projects.slice(0, 5).map((project) => (
                <div key={project.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {project.logo_url ? (
                          <div className="w-12 h-12 relative rounded overflow-hidden">
                            <Image
                              src={project.logo_url}
                              alt={project.name}
                              fill
                              sizes="48px"
                              style={{ objectFit: "cover" }}
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-indigo-100 text-indigo-500 rounded flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center">
                          <h4 className="text-base font-medium text-gray-900">{project.name}</h4>
                          <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {projectsWithPhotoCount[project.id] || 0} photos
                          </span>
                        </div>
                        <div className="flex items-center mt-1 text-sm">
                          <span className="text-gray-500">/{project.slug}</span>
                          
                          <span className="mx-2 text-gray-300">•</span>
                          
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            project.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {project.is_active ? 'Actif' : 'Inactif'}
                          </span>
                          
                          <span className="mx-2 text-gray-300">•</span>
                          
                          <span className="text-gray-500">
                            {getPhotoboothTypeLabel(project.photobooth_type)}
                          </span>
                          
                          <span className="mx-2 text-gray-300">•</span>
                          
                          <span className="text-indigo-600 font-medium">
                            {projectsWithPhotoCount[project.id] || 0} photos
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Link
                        href={`/photobooth-ia/admin/project-gallery?id=${project.id}`}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium text-white bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Voir photos ({projectsWithPhotoCount[project.id] || 0})
                      </Link>
                      
                      <Link
                        href={`/photobooth/${project.slug}`}
                        target="_blank"
                        className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Voir
                      </Link>
                      
                      <Link
                        href={`/photobooth-ia/admin/projects/${project.id}`}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium text-white bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow"
                      >
                        Configurer
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              
              {projects.length > 5 && (
                <div className="px-6 py-3 bg-gray-50 text-center">
                  <Link href="/photobooth-ia/admin/projects" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
                    Voir les {projects.length - 5} autres projets
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Other dashboard sections can be added here */}
    </div>
  );
}
