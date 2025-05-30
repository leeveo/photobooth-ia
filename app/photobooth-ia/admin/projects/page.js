'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { RiAddLine, RiFolder2Line, RiErrorWarningLine } from 'react-icons/ri';

export default function ProjectsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Définir fetchProjects avec useCallback AVANT useEffect
  const fetchProjects = useCallback(async () => {
    console.log("Fetching projects from Supabase...");
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      
      console.log("Projects received:", data?.length || 0, "projects");
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  }, [supabase]);
  
  // Utiliser fetchProjects dans useEffect
  useEffect(() => {
    console.log("Projects page mounted, calling fetchProjects");
    fetchProjects();
  }, [fetchProjects]);

  async function handleCreateProject() {
    try {
      const newProject = {
        name: 'Nouveau projet',
        slug: `project-${Date.now()}`,
        is_active: true,
        primary_color: '#6366F1',
        secondary_color: '#4F46E5',
        description: 'Description du nouveau projet',
      };
      
      const { data, error } = await supabase
        .from('projects')
        .insert(newProject)
        .select()
        .single();
        
      if (error) throw error;
      
      // Rediriger vers la page d'édition du nouveau projet
      router.push(`/photobooth-ia/admin/projects/${data.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      setError('Erreur lors de la création du projet');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Projets</h1>
        <button
          onClick={handleCreateProject}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-sm flex items-center gap-2"
        >
          <RiAddLine className="w-5 h-5" />
          Créer un nouveau projet
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3">
          <RiErrorWarningLine className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white shadow-md rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-2"></div>
            <p className="text-sm text-gray-500">Chargement des projets...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-10 text-center border border-dashed border-gray-300 rounded-xl m-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RiFolder2Line className="w-8 h-8 text-indigo-500" />
            </div>
            <p className="text-gray-500 mb-4">Aucun projet trouvé. Créez votre premier projet !</p>
            <button
              onClick={handleCreateProject}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-sm inline-flex items-center gap-2"
            >
              <RiAddLine className="w-5 h-5" />
              Créer un projet
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {projects.map((project) => (
              <li key={project.id} className="hover:bg-gray-50 transition duration-150">
                <Link href={`/photobooth-ia/admin/projects/${project.id}`} className="block">
                  <div className="px-6 py-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {project.logo_url ? (
                          <div className="h-12 w-12 rounded-lg overflow-hidden mr-4 border border-gray-200">
                            <Image
                              src={project.logo_url}
                              alt={project.name}
                              width={48}
                              height={48}
                              className="h-12 w-12 object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-12 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-500 rounded-lg flex items-center justify-center mr-4">
                            <RiFolder2Line className="h-6 w-6" />
                          </div>
                        )}
                        <div>
                          <p className="text-lg font-medium text-indigo-600">{project.name}</p>
                          <p className="text-sm text-gray-500 mt-1">/{project.slug}</p>
                        </div>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          project.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {project.is_active ? 'Actif' : 'Inactif'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Accès via: /{project.slug}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <p>
                          Créé le {new Date(project.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}