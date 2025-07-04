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
  const [currentAdminId, setCurrentAdminId] = useState(null);
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

  const fetchProjects = useCallback(async () => {
    if (!currentAdminId) {
      console.warn("Impossible de charger les projets: ID admin non défini");
      return;
    }
    
    console.log(`Fetching projects from Supabase for admin ID: ${currentAdminId}...`);
    setLoading(true);
    try {
      // Filtrer les projets par l'ID de l'admin connecté et non archivés (incluant NULL)
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('created_by', currentAdminId)
        .or('archive.is.null,archive.eq.false') // Accepter les projets où archive est NULL ou false
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      
      console.log(`Projects received for admin ${currentAdminId}:`, data?.length || 0, "projects");
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  }, [supabase, currentAdminId]);
  
  useEffect(() => {
    if (currentAdminId) {
      console.log(`Projects page mounted with admin ID: ${currentAdminId}, calling fetchProjects`);
      fetchProjects();
    }
  }, [fetchProjects, currentAdminId]);

  async function handleCreateProject() {
    if (!currentAdminId) {
      setError("Vous n'êtes pas connecté. Veuillez vous reconnecter.");
      return;
    }

    // Vérifier le plan de l'utilisateur
    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .select('plan, stripe_subscription_id')
      .eq('id', currentAdminId)
      .single();

    if (adminError || !admin || !admin.stripe_subscription_id) {
      setError("Vous devez souscrire à un plan pour créer un projet.");
      // Rediriger vers la page de choix de plan
      router.push('/photobooth-ia/admin/choose-plan');
      return;
    }
    
    try {
      setCreatingProject(true);
      const newProject = {
        name: 'Nouveau projet',
        slug: `project-${Date.now()}`,
        is_active: true,
        primary_color: '#6366F1',
        secondary_color: '#4F46E5',
        description: 'Description du nouveau projet',
        created_by: currentAdminId, // Ajouter l'ID de l'admin au projet
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
      console.log(`Début de l'archivage du projet ${projectId} (${projectName})`);
      
      // Vérifier que le projet appartient bien à l'admin connecté
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('created_by', currentAdminId)
        .single();
        
      if (projectError || !projectData) {
        throw new Error("Vous n'êtes pas autorisé à archiver ce projet");
      }
      
      // Méthode 1: Utiliser l'API
      try {
        console.log("Tentative d'archivage via API...");
        const response = await fetch('/api/delete-project', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ projectId }),
        });
        
        const result = await response.json();
        console.log("Réponse API:", result);
        
        if (!response.ok) {
          throw new Error(result.error || 'API: Échec de l\'archivage');
        }
        
        console.log('Projet archivé avec succès via API');
      } catch (apiError) {
        console.warn("L'API a échoué, tentative d'archivage direct:", apiError.message);
        
        // Méthode 2: Archiver directement depuis le client (si l'API échoue)
        const { data: updateData, error: updateError } = await supabase
          .from('projects')
          .update({ 
            archive: true
            // Suppression de archived_at qui n'existe pas dans le schéma
          })
          .eq('id', projectId)
          .select();
        
        if (updateError) {
          throw new Error(`Archivage direct: ${updateError.message}`);
        }
        
        console.log("Résultat de l'archivage direct:", updateData);
      }
      
      // Afficher le message de succès
      setDeleteSuccess(`Le projet "${projectName}" a été archivé avec succès.`);
      setTimeout(() => setDeleteSuccess(null), 5000);
      
      // Rafraîchir la liste des projets
      await fetchProjects();
      
    } catch (error) {
      console.error('Erreur lors de l\'archivage du projet:', error);
      setError(`Erreur lors de l\'archivage du projet: ${error.message}`);
    } finally {
      setDeleteLoading(false);
      setDeletingProject(false);
      setDeleteConfirm(null);
    }
  }

  // Add CSS animations for the archive popup
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.innerHTML = `
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes checkmark {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .animate-success-popup {
          animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        
        .animate-success-icon {
          animation: checkmark 0.5s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        
        .animate-success-text {
          opacity: 0;
          animation: fadeInUp 0.5s ease forwards;
          animation-delay: 0.3s;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Replace the existing deleteConfirm modal with this enhanced version
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Projets</h1>
        {/* Create new project button */}
        <Link 
          href="/photobooth-ia/admin/projects/create" 
          className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Créer un nouveau projet
        </Link>
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
        <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl overflow-hidden w-full max-w-md transform transition-all animate-success-popup"
               onClick={(e) => e.stopPropagation()}>
            {/* Header with AMBER gradient effect */}
            <div className="h-28 bg-gradient-to-r from-amber-500 to-amber-700 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-cover bg-center opacity-20" 
                   style={{ backgroundImage: `url(${deleteConfirm.logo_url || ''})` }}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
              
              {/* Archive icon with animation */}
              <div className="z-10 rounded-full bg-white bg-opacity-20 p-4 animate-success-icon">
                <RiDeleteBin6Line className="h-12 w-12 text-white" />
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 text-center">
              <h3 className="text-2xl font-bold text-white mb-3 animate-success-text">Confirmation d'archivage</h3>
              <p className="text-gray-300 mb-4 animate-success-text" style={{ animationDelay: "0.1s" }}>
                Êtes-vous sûr de vouloir archiver le projet <span className="font-semibold text-amber-400">{deleteConfirm.name}</span> ?
              </p>
              
              {/* Project preview */}
              {deleteConfirm.logo_url && (
                <div className="flex justify-center mt-6 animate-success-text" style={{ animationDelay: "0.2s" }}>
                  <div className="w-32 h-32 relative rounded-lg overflow-hidden border border-gray-700 shadow-lg">
                    <Image
                      src={deleteConfirm.logo_url}
                      alt={deleteConfirm.name}
                      fill
                      style={{ objectFit: "contain" }}
                      className="rounded-lg"
                    />
                    
                    {/* Project name */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-1 text-center">
                      <span className="text-white text-xs truncate block">{deleteConfirm.name}</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-6 bg-amber-900 bg-opacity-30 p-4 rounded-lg border border-amber-800 text-sm text-amber-300 animate-success-text" style={{ animationDelay: "0.25s" }}>
                <RiAlertLine className="inline-block h-4 w-4 mr-1" />
                Le projet sera masqué mais ses données seront conservées. Vous pourrez le restaurer ultérieurement.
              </div>
            </div>
            
            {/* Footer with buttons */}
            <div className="bg-gray-900 px-6 py-4 flex justify-center space-x-4 animate-success-text" style={{ animationDelay: "0.3s" }}>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                disabled={deleteLoading}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProject(deleteConfirm.id, deleteConfirm.name)}
                className="px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white text-sm font-medium rounded-lg transition-colors shadow-lg flex items-center"
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Archivage...
                  </>
                ) : (
                  <>
                    <RiDeleteBin6Line className="h-4 w-4 mr-1" />
                    Archiver le projet
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
                        className="inline-flex items-center px-3 py-1.5 border border-amber-300 text-xs font-medium rounded text-amber-700 bg-white hover:bg-amber-50"
                      >
                        <RiDeleteBin6Line className="w-4 h-4 mr-1" />
                        Archiver
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