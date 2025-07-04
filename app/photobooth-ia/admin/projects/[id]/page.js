'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { RiExternalLinkLine, RiArrowLeftLine, RiDeleteBin6Line } from 'react-icons/ri';
import StyleTemplates from '../../components/StyleTemplates';
import BackgroundTemplates from '../../components/BackgroundTemplates';
import dynamic from 'next/dynamic';
import Loader from '../../../../components/ui/Loader';

// Import the components we created
import ProjectInfoForm from '../components/ProjectInfoForm';
import PhotoboothTypeManager from '../components/PhotoboothTypeManager';
import StyleManager from '../components/StyleManager';
import BackgroundManager from '../components/BackgroundManager';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

// Import CanvasEditorWrapper with dynamic import to prevent SSR
const CanvasEditor = dynamic(
  () => import('../components/CanvasEditorWrapper'),
  { ssr: false }
);

// Composant pour initialiser les variables globales
function InitializeGlobals({ id }) {
  useEffect(() => {
    // Définir id comme variable globale pour éviter l'erreur
    if (typeof window !== 'undefined') {
      window.id = id;
      console.log('ID initialisé:', id);
    }
  }, [id]);
  
  return null;
}

export default function ProjectDetails({ params }) {
  const projectId = params.id;
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [currentAdminId, setCurrentAdminId] = useState(null);
  const [project, setProject] = useState(null);
  const [settings, setSettings] = useState(null);
  const [styles, setStyles] = useState([]);
  const [backgrounds, setBackgrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [showStyleTemplates, setShowStyleTemplates] = useState(false);
  const [showBackgroundTemplates, setShowBackgroundTemplates] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [typeValidated, setTypeValidated] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [canvasLayout, setCanvasLayout] = useState(null);
  
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
  
  const fetchProjectData = useCallback(async () => {
    if (!currentAdminId) {
      console.warn("Impossible de charger le projet: admin ID non défini");
      return;
    }
    
    setLoading(true);
    try {
      // Fetch project data with security check
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('created_by', currentAdminId) // Ajouter la vérification de l'admin propriétaire
        .single();

      if (projectError) {
        if (projectError.code === 'PGRST116') {
          // Le projet n'existe pas ou n'appartient pas à cet admin
          console.error("Projet non trouvé ou vous n'avez pas les droits d'accès");
          setError("Ce projet n'existe pas ou vous n'avez pas les droits pour y accéder");
          setLoading(false);
          return;
        }
        throw projectError;
      }
      
      setProject(projectData);

      // Fetch project settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('project_settings')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') { // Not found is OK
        throw settingsError;
      }
      setSettings(settingsData || {
        project_id: projectId,
        default_gender: 'm',
        enable_qr_codes: true,
        enable_fullscreen: true,
        show_countdown: true,
        max_processing_time: 60
      });

      // Fetch project styles
      const { data: stylesData, error: stylesError } = await supabase
        .from('styles')
        .select('*')
        .eq('project_id', projectId);

      if (stylesError) throw stylesError;
      setStyles(stylesData || []);

      // Fetch project backgrounds
      const { data: backgroundsData, error: backgroundsError } = await supabase
        .from('backgrounds')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (backgroundsError) throw backgroundsError;
      setBackgrounds(backgroundsData || []);

    } catch (error) {
      console.error('Error fetching project data:', error);
      setError('Erreur lors du chargement des données du projet');
    } finally {
      setLoading(false);
    }
  }, [supabase, projectId, currentAdminId]);

  useEffect(() => {
    // Initialiser window.id si nécessaire (pour éviter l'erreur)
    if (typeof window !== 'undefined') {
      window.id = projectId || '';
    }
    
    if (currentAdminId) {
      fetchProjectData();
    }
  }, [fetchProjectData, projectId, currentAdminId]);

  // Update the typeValidated state based on project data when it loads
  useEffect(() => {
    if (project) {
      setTypeValidated(!!project.type_validated);
    }
  }, [project]);

  async function saveSettings(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('project_settings')
          .update({
            default_gender: settings.default_gender,
            enable_qr_codes: settings.enable_qr_codes,
            enable_fullscreen: settings.enable_fullscreen,
            show_countdown: settings.show_countdown,
            max_processing_time: settings.max_processing_time
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from('project_settings')
          .insert({
            project_id: projectId,
            default_gender: settings.default_gender,
            enable_qr_codes: settings.enable_qr_codes,
            enable_fullscreen: settings.enable_fullscreen,
            show_countdown: settings.show_countdown,
            max_processing_time: settings.max_processing_time
          });

        if (error) throw error;
      }

      setSuccess('Paramètres enregistrés avec succès !');
      fetchProjectData(); // Refresh data
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Erreur lors de l\'enregistrement des paramètres');
    }
  }

  // Fonction pour valider le type de photobooth
  const handleValidatePhotoboothType = async () => {
    try {
      // Mettre à jour le projet dans Supabase avec l'attribut type_validated = true
      const { error } = await supabase
        .from('projects')
        .update({ type_validated: true })
        .eq('id', project.id);
      
      if (error) throw error;
      
      // Mettre à jour l'état local
      setProject({...project, type_validated: true});
      setTypeValidated(true);
      setSuccess('Type de photobooth validé avec succès. Le type ne peut plus être modifié.');
    } catch (error) {
      console.error('Erreur lors de la validation du type:', error);
      setError('Erreur lors de la validation du type de photobooth');
    }
  };

  // Function to get photobooth type label
  const getPhotoboothTypeLabel = (type) => {
    switch (type) {
      case 'premium':
        return 'Premium';
      case 'photobooth2':
        return 'MiniMax';
      case 'standard':
        return 'FaceSwapping';
      default:
        return 'FaceSwapping';
    }
  };

  // Replace the handleDeleteStyle function with this new version
  async function handleDeleteStyle(styleId) {
    // Find the style to delete for showing in the confirmation popup
    const style = styles.find(s => s.id === styleId);
    if (style) {
      setStyleToDelete(style);
      setDeleteStyleConfirm(true);
    }
  }

  // Add this new function to actually perform the deletion
  async function confirmDeleteStyle() {
    if (!styleToDelete) return;
    
    setDeleteStyleLoading(true);
    
    try {
      setError(null);
      
      // Delete the style from the database
      const { error } = await supabase
        .from('styles')
        .delete()
        .eq('id', styleToDelete.id);
        
      if (error) throw error;
      
      // Update the local state to remove the style
      const updatedStyles = styles.filter(s => s.id !== styleToDelete.id);
      setStyles(updatedStyles);
      
      // Show success message
      setSuccess(`Style "${styleToDelete.name}" supprimé avec succès`);
      
      // If style templates component is open, refresh to make the style selectable again
      if (showStyleTemplates) {
        // This will cause the StyleTemplates component to re-evaluate existing styles
        // and make the deleted style selectable again
        const { data: freshStyles, error: refreshError } = await supabase
          .from('styles')
          .select('*')
          .eq('project_id', projectId);
          
        if (!refreshError) {
          setStyles(freshStyles || []);
        }
      }
    } catch (error) {
      console.error('Error deleting style:', error);
      setError(`Erreur lors de la suppression du style: ${error.message}`);
    } finally {
      setDeleteStyleLoading(false);
      setDeleteStyleConfirm(false);
      setStyleToDelete(null);
    }
  }

  async function handleDeleteBackground(backgroundId) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet arrière-plan ?")) {
      return;
    }
    
    try {
      setError(null);
      // Delete the background from the database
      const { error } = await supabase
        .from('backgrounds')
        .delete()
        .eq('id', backgroundId);
        
      if (error) throw error;
      
      // Update the local state
      setBackgrounds(backgrounds.filter(bg => bg.id !== backgroundId));
      setSuccess("Arrière-plan supprimé avec succès");
    } catch (error) {
      console.error('Error deleting background:', error);
      setError(`Erreur lors de la suppression de l'arrière-plan: ${error.message}`);
    }
  }

  // Enhanced function to handle styles added from template popup
  const handleStyleTemplatesAdded = (addedStyles) => {
    console.log(`✅ ${addedStyles.length} styles added successfully`, addedStyles);
    
    // Close the template popup immediately
    setShowStyleTemplates(false);
    
    // Set a success message for the inline notification
    setSuccess(`${addedStyles.length} styles ont été ajoutés avec succès !`);
    
    // Show the success popup with more details
    setSuccessMessage(`${addedStyles.length} styles ont été ajoutés à votre projet depuis la collection de templates.`);
    setShowSuccessPopup(true);
    
    // Force refresh the styles data
    const refreshStyles = async () => {
      try {
        const { data: freshStyles, error } = await supabase
          .from('styles')
          .select('*')
          .eq('project_id', projectId);
          
        if (error) {
          console.error('Error refreshing styles:', error);
          return;
        }
        
        console.log(`📋 Refreshed styles from database: ${freshStyles.length} styles found`);
        setStyles(freshStyles || []);
      } catch (err) {
        console.error('Failed to refresh styles:', err);
      }
    };
    
    refreshStyles();
    
    // Also call the full data refresh for other data
    setTimeout(() => {
      fetchProjectData();
    }, 500);
  };
  
  // Updated function to handle backgrounds added from templates
  const handleBackgroundTemplatesAdded = (addedBackgrounds) => {
    console.log(`✅ Received updated backgrounds`, addedBackgrounds);
    
    // Close template popup
    setShowBackgroundTemplates(false);
    
    // Show success message
    setSuccess(`Arrière-plan du projet remplacé avec succès !`);
    
    // Force a complete UI refresh by setting loading state
    setLoading(true);
    
    // Update the backgrounds state with the new data
    if (Array.isArray(addedBackgrounds)) {
      console.log(`Setting ${addedBackgrounds.length} backgrounds`);
      setBackgrounds(addedBackgrounds);
    } else if (addedBackgrounds) {
      console.log('Setting single background');
      setBackgrounds([addedBackgrounds]);
    } else {
      console.warn('No background data received');
      setBackgrounds([]);
    }
    
    // Then do a full refresh after a short delay
    setTimeout(() => {
      fetchProjectData()
        .then(() => {
          console.log("Project data refreshed successfully");
        })
        .catch(err => {
          console.error("Error refreshing project data:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 500);
  };
  
  // Functions to handle template errors
  const handleBackgroundTemplatesError = (errorMessage) => {
    setError(errorMessage);
  };

  const handleStyleTemplatesError = (errorMessage) => {
    setError(errorMessage);
  };

  // Fonction pour supprimer le projet et ses dépendances
  async function handleDeleteProject() {
    setDeleteLoading(true);
    
    try {
      console.log(`Début de la suppression du projet ${projectId} (${project.name})`);
      
      // Première étape: Supprimer les enregistrements dans toutes les tables liées
      // 1. Supprimer les styles liés au projet
      const { error: stylesError } = await supabase
        .from('styles')
        .delete()
        .eq('project_id', projectId);
      
      if (stylesError) {
        console.warn("Erreur lors de la suppression des styles:", stylesError);
      } else {
        console.log("Styles supprimés avec succès");
      }
      
      // 2. Supprimer les arrière-plans liés au projet
      const { error: backgroundsError } = await supabase
        .from('backgrounds')
        .delete()
        .eq('project_id', projectId);
      
      if (backgroundsError) {
        console.warn("Erreur lors de la suppression des arrière-plans:", backgroundsError);
      } else {
        console.log("Arrière-plans supprimés avec succès");
      }
      
      // 3. Supprimer les paramètres du projet
      const { error: settingsError } = await supabase
        .from('project_settings')
        .delete()
        .eq('project_id', projectId);
      
      if (settingsError) {
        console.warn("Erreur lors de la suppression des paramètres:", settingsError);
      } else {
        console.log("Paramètres supprimés avec succès");
      }

      // 4. Vérifier et supprimer d'autres tables potentiellement liées
      // Canvas layouts
      const { error: canvasError } = await supabase
        .from('canvas_layouts')
        .delete()
        .eq('project_id', projectId);
      
      if (canvasError && canvasError.code !== 'PGRST116') { // Ignorer si table n'existe pas
        console.warn("Erreur lors de la suppression des layouts de canvas:", canvasError);
      }
      
      // Deuxième étape: Utiliser l'API pour supprimer le projet principal
      // et toute autre donnée que nous n'avons pas pu nettoyer directement
      const response = await fetch('/api/delete-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          projectId,
          fullCleanup: true // Indiquer qu'une suppression complète est nécessaire
        }),
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Échec de la suppression du projet');
      }
      
      const result = await response.json();
      console.log('Réponse API de suppression:', result);
      
      // Troisième étape: Vérifier que le projet a bien été supprimé
      const { data: checkProject, error: checkError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .single();
      
      if (!checkError && checkProject) {
        throw new Error("Le projet existe toujours après la tentative de suppression");
      }
      
      console.log('Projet supprimé avec succès:', result);
      
      // Rediriger vers la liste des projets après un court délai
      setTimeout(() => {
        router.push('/photobooth-ia/admin/projects');
      }, 500);
      
    } catch (error) {
      console.error('Erreur lors de la suppression du projet:', error);
      
      // Tentative de nettoyage final direct en cas d'échec de l'API
      try {
        console.log("Tentative de suppression directe du projet...");
        const { error: finalError } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId);
          
        if (finalError) {
          console.error("Échec de la suppression finale:", finalError);
        } else {
          console.log("Suppression directe réussie");
          setTimeout(() => {
            router.push('/photobooth-ia/admin/projects');
          }, 500);
          return; // Sortir si la suppression a finalement réussi
        }
      } catch (finalErr) {
        console.error("Erreur lors de la tentative finale:", finalErr);
      }
      
      setError(`Erreur lors de la suppression du projet: ${error.message}`);
      setDeleteConfirm(false);
      setDeleteLoading(false);
    }
  }
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader 
          size="large" 
          message="Chargement du projet..." 
          variant="premium" 
        />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Projet non trouvé</h3>
        <p className="text-gray-500 mb-6">Le projet que vous recherchez n&apos;existe pas ou a été supprimé.</p>
        <Link 
          href="/photobooth-ia/admin/projects" 
          className="text-indigo-600 hover:text-indigo-500 font-medium flex items-center justify-center gap-2"
        >
          <RiArrowLeftLine className="w-4 h-4" />
          Retour à la liste des projets
        </Link>
      </div>
    );
  }
  
  return (
    <>
      {/* Composant qui initialise les variables globales */}
      <InitializeGlobals id={projectId} />
      
      <div className="space-y-6">
        {/* Header with project info */}
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-4">
            {project.logo_url ? (
              <div className="w-14 h-14 relative">
                <Image
                  src={project.logo_url}
                  alt={project.name}
                  fill
                  style={{ objectFit: "contain" }}
                  className="rounded-xl"
                />
              </div>
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{project.name}</h2>
              <div className="text-sm text-gray-500 flex items-center">
                <span>URL: /{project.slug}</span>
                <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  project.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {project.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Link
              href={`/photobooth/${project.slug}`}
              target="_blank"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
            >
              <RiExternalLinkLine className="mr-2 h-4 w-4" />
              Voir le projet
            </Link>
            <Link
              href="/photobooth-ia/admin/projects"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
            >
              <RiArrowLeftLine className="mr-2 h-4 w-4" />
              Retour à la liste
            </Link>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 shadow-sm"
            >
              <RiDeleteBin6Line className="mr-2 h-4 w-4" />
              Supprimer
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg border border-red-200">
            {error}
          </div>
        )}
        
        {success && (
          <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg border border-green-200">
            {success}
          </div>
        )}

        {/* Tabs for different sections */}
        <div className="bg-white shadow-sm rounded-xl overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex px-6 -mb-px space-x-8">
              <button
                onClick={() => setActiveTab('info')}
                className={`border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'info' ? 'border-indigo-500 text-indigo-600' : ''
                }`}
              >
                Informations
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings' ? 'border-indigo-500 text-indigo-600' : ''
                }`}
              >
                Paramètres
              </button>
            </nav>
          </div>

          {/* Tab content */}
          <div className="p-6">
            {/* Info Tab */}
            {activeTab === 'info' && (
              <>
                <div className="space-y-6">
                  {/* Project Info Section */}
                  <ProjectInfoForm 
                    project={project} 
                    setProject={setProject} 
                    setError={setError} 
                    setSuccess={setSuccess}
                    setShowSuccessPopup={setShowSuccessPopup}
                    setSuccessMessage={setSuccessMessage}
                  />
                  
                  {/* Background Manager Section */}
                  <BackgroundManager
                    projectId={projectId}
                    backgrounds={backgrounds}
                    setBackgrounds={setBackgrounds}
                    setError={setError}
                    setSuccess={setSuccess}
                  />

                  {/* Photobooth Type Manager Section */}
                  <PhotoboothTypeManager
                    project={project}
                    setProject={setProject}
                    typeValidated={typeValidated}
                    setTypeValidated={setTypeValidated}
                    setError={setError}
                    setSuccess={setSuccess}
                  />

                  {/* Style Manager Section */}
                  <StyleManager
                    projectId={projectId}
                    styles={styles}
                    setStyles={setStyles}
                    setError={setError}
                    setSuccess={setSuccess}
                    typeValidated={typeValidated}
                    photoboothType={project.photobooth_type}
                  />
                  
                  {/* Canvas Editor Section */}
                  <div className={`mt-8 ${!typeValidated ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''}`}>
                    <div className="flex items-center mb-6">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md mr-3">
                        <span className="text-white font-semibold">4</span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">Editeur de cadres photos</h3>
                    </div>
                    
                    {!typeValidated && (
                      <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-orange-700">
                              Vous devez d'abord valider le type de photobooth à l'étape 2 avant de pouvoir utiliser l'éditeur de canvas.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      <CanvasEditor 
                        projectId={projectId} 
                        onSave={(layoutData) => {
                          setCanvasLayout(layoutData);
                          setSuccess("Layout de canvas enregistré avec succès!");
                        }}
                        initialData={canvasLayout}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <form onSubmit={saveSettings} className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Paramètres du projet</h3>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="default_gender" className="block text-sm font-medium text-gray-700">
                      Genre par défaut
                    </label>
                    <select
                      id="default_gender"
                      name="default_gender"
                      value={settings.default_gender}
                      onChange={handleSettingChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="m">Homme</option>
                      <option value="f">Femme</option>
                      <option value="ag">Ado Garçon</option>
                      <option value="af">Ado Fille</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="enable_qr_codes" className="flex items-center">
                      <input
                        id="enable_qr_codes"
                        name="enable_qr_codes"
                        type="checkbox"
                        checked={settings.enable_qr_codes}
                        onChange={handleSettingChange}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Activer les codes QR
                      </span>
                    </label>
                  </div>
                  
                  <div>
                    <label htmlFor="enable_fullscreen" className="flex items-center">
                      <input
                        id="enable_fullscreen"
                        name="enable_fullscreen"
                        type="checkbox"
                        checked={settings.enable_fullscreen}
                        onChange={handleSettingChange}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Activer le mode plein écran
                      </span>
                    </label>
                  </div>
                  
                  <div>
                    <label htmlFor="show_countdown" className="flex items-center">
                      <input
                        id="show_countdown"
                        name="show_countdown"
                        type="checkbox"
                        checked={settings.show_countdown}
                        onChange={handleSettingChange}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Afficher le compte à rebours
                      </span>
                    </label>
                  </div>
                  
                  <div>
                    <label htmlFor="max_processing_time" className="block text-sm font-medium text-gray-700">
                      Temps de traitement max (en secondes)
                    </label>
                    <input
                      type="number"
                      id="max_processing_time"
                      name="max_processing_time"
                      value={settings.max_processing_time}
                      onChange={handleSettingChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('info')}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-md shadow-sm hover:from-indigo-700 hover:to-purple-700"
                  >
                    Enregistrer les paramètres
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Delete Project Confirmation Modal */}
      <DeleteConfirmationModal 
        isOpen={deleteConfirm}
        title="Confirmation de suppression"
        message={`Êtes-vous sûr de vouloir supprimer le projet "${project?.name}" ?`}
        dangerText="Cette action est irréversible et supprimera également tous les styles, arrière-plans et paramètres associés."
        onCancel={() => setDeleteConfirm(false)}
        onConfirm={handleDeleteProject}
        isDeleting={deleteLoading}
        confirmText="Supprimer définitivement"
        itemToDelete={{
          name: project?.name,
          imageUrl: project?.logo_url
        }}
      />

      {/* Background templates popup */}
      {showBackgroundTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <BackgroundTemplates
            projectId={projectId}
            onBackgroundsAdded={handleBackgroundTemplatesAdded}
            onError={handleBackgroundTemplatesError}
            onClose={() => setShowBackgroundTemplates(false)}
          />
        </div>
      )}

      {/* Style templates popup with improved structure */}
      {showStyleTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4">
          <div className="w-full max-w-4xl">
            <StyleTemplates 
              projectId={projectId} 
              photoboothType={project.photobooth_type}
              onStylesAdded={handleStyleTemplatesAdded}
              onError={handleStyleTemplatesError}
              existingStyles={styles}
              onClose={() => setShowStyleTemplates(false)}
            />
          </div>
        </div>
      )}

      {/* Success Popup with higher z-index */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-[99999] pointer-events-auto">
          <div className="animate-fadeIn bg-white rounded-lg shadow-2xl p-6 max-w-sm w-full mx-4 border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-full p-2">
                <svg className="h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-900">Succès!</p>
                <p className="mt-1 text-sm text-gray-500">{successMessage}</p>
              </div>
              <button 
                onClick={() => setShowSuccessPopup(false)}
                className="ml-4 text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Add this CSS animation for fade in effect
const globalStyles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}
`;

// Add the global styles to the document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = globalStyles;
  document.head.appendChild(style);
}