'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { RiAddLine, RiFolder2Line, RiErrorWarningLine, RiDeleteBin6Line, RiAlertLine } from 'react-icons/ri';
import Loader from '../../../components/ui/Loader';

export default function ProjectsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

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
  
  useEffect(() => {
    console.log("Projects page mounted, calling fetchProjects");
    fetchProjects();
  }, [fetchProjects]);

  async function handleCreateProject() {
    try {
      setCreatingProject(true);
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
      
      router.push(`/photobooth-ia/admin/projects/${data.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      setError('Erreur lors de la création du projet');
    } finally {
      setCreatingProject(false);
    }
  }

  async function handleDeleteProject(projectId, projectName) {
    try {
      setDeleteLoading(true);
      setDeletingProject(true);
      console.log(`Début de la suppression du projet ${projectId} (${projectName})`);
      
      // Utiliser l'API pour supprimer le projet
      const response = await fetch('/api/delete-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Échec de la suppression du projet');
      }
      
      console.log('Projet supprimé avec succès:', result);
      setDeleteSuccess(`Le projet "${projectName}" a été supprimé avec succès.`);
      setTimeout(() => setDeleteSuccess(null), 5000);
      
      // Rafraîchir la liste des projets
      await fetchProjects();
      
    } catch (error) {
      console.error('Erreur lors de la suppression du projet:', error);
      setError(`Erreur lors de la suppression du projet: ${error.message}`);
    } finally {
      setDeleteLoading(false);
      setDeletingProject(false);
      setDeleteConfirm(null);
    }
  }

  // Replace any existing loading state like this:
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader 
          size="large" 
          message="Chargement des projets..." 
          variant="premium" 
        />
      </div>
    );
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
      
      {deleteSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-start gap-3">
          <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p>{deleteSuccess}</p>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center text-red-600 mb-4">
              <RiAlertLine className="w-6 h-6 mr-2" />
              <h3 className="text-lg font-medium">Confirmation de suppression</h3>
            </div>
            
            <p className="mb-4 text-gray-700">
              Êtes-vous sûr de vouloir supprimer le projet <strong>"{deleteConfirm.name}"</strong> ?
              <br /><br />
              Cette action est irréversible et supprimera également :
            </p>
            
            <ul className="list-disc list-inside mb-4 text-sm text-gray-600">
              <li>Tous les styles associés</li>
              <li>Tous les arrière-plans</li>
              <li>Tous les paramètres du projet</li>
            </ul>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteLoading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteProject(deleteConfirm.id, deleteConfirm.name)}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
              >
                {deleteLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Suppression...
                  </>
                ) : (
                  <>
                    <RiDeleteBin6Line className="w-4 h-4 mr-1" />
                    Supprimer définitivement
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-md rounded-xl overflow-hidden">
        {projects.length === 0 ? (
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
                      <Link
                        href={`/photobooth-ia/admin/projects/${project.id}`}
                        className="mr-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Configurer
                      </Link>
                      <button
                        onClick={() => setDeleteConfirm(project)}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50"
                      >
                        <RiDeleteBin6Line className="w-4 h-4 mr-1" />
                        Supprimer
                      </button>
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}