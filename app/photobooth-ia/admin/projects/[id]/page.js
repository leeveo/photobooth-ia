'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { RiAddLine, RiExternalLinkLine, RiArrowLeftLine, RiSaveLine, RiDeleteBin6Line, RiAlertLine } from 'react-icons/ri';
import StyleTemplates from '../../components/StyleTemplates';

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
  const [project, setProject] = useState(null);
  const [settings, setSettings] = useState(null);
  const [styles, setStyles] = useState([]);
  const [backgrounds, setBackgrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [addingStyle, setAddingStyle] = useState(false);
  const [newStyle, setNewStyle] = useState({
    name: '',
    gender: '',
    style_key: '',
    variations: 1,
    description: '',
  });
  const [styleFile, setStyleFile] = useState(null);
  const [styleImagePreview, setStyleImagePreview] = useState(null);
  const [addingStyleLoading, setAddingStyleLoading] = useState(false);
  const [addingBackground, setAddingBackground] = useState(false);
  const [newBackground, setNewBackground] = useState({
    name: '',
  });
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState(null);
  const [addingBackgroundLoading, setAddingBackgroundLoading] = useState(false);
  const [showStyleTemplates, setShowStyleTemplates] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // Ajout d'un état pour savoir si le type de photobooth est validé
  const [typeValidated, setTypeValidated] = useState(false);

  // CORRECTION: Supprimer 'id' des dépendances, utiliser seulement projectId
  const fetchProjectData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch project data
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
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
        .eq('project_id', projectId);

      if (backgroundsError) throw backgroundsError;
      setBackgrounds(backgroundsData || []);

    } catch (error) {
      console.error('Error fetching project data:', error);
      setError('Erreur lors du chargement des données du projet');
    } finally {
      setLoading(false);
    }
  }, [supabase, projectId]); // CORRECTION: 'id' supprimé des dépendances

  useEffect(() => {
    // Initialiser window.id si nécessaire (pour éviter l'erreur)
    if (typeof window !== 'undefined') {
      window.id = projectId || '';
    }
    
    fetchProjectData();
  }, [fetchProjectData, projectId]);

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

  function handleSettingChange(e) {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  }

  function handleStyleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      setStyleFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setStyleImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleBackgroundImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      setBackgroundFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleAddStyle(e) {
    e.preventDefault();
    setAddingStyleLoading(true);
    try {
      // Upload style image
      const { data: styleImageData, error: styleImageError } = await supabase
        .storage
        .from('styles')
        .upload(`public/${styleFile.name}`, styleFile);

      if (styleImageError) throw styleImageError;

      // Add new style
      const { error: addStyleError } = await supabase
        .from('styles')
        .insert({
          project_id: projectId,
          name: newStyle.name,
          gender: newStyle.gender,
          style_key: newStyle.style_key,
          variations: newStyle.variations,
          description: newStyle.description,
          preview_image: styleImageData.Key
        });

      if (addStyleError) throw addStyleError;

      setAddingStyle(false);
      setNewStyle({
        name: '',
        gender: '',
        style_key: '',
        variations: 1,
        description: '',
      });
      setStyleFile(null);
      setStyleImagePreview(null);
      fetchProjectData(); // Refresh data
    } catch (error) {
      console.error('Error adding style:', error);
      setError('Erreur lors de l\'ajout du style');
    } finally {
      setAddingStyleLoading(false);
    }
  }

  async function handleAddBackground(e) {
    e.preventDefault();
    setAddingBackgroundLoading(true);
    try {
      // Upload background image
      const { data: backgroundImageData, error: backgroundImageError } = await supabase
        .storage
        .from('backgrounds')
        .upload(`public/${backgroundFile.name}`, backgroundFile);

      if (backgroundImageError) throw backgroundImageError;
      
      // Get the public URL for the uploaded file
      const publicURL = supabase
        .storage
        .from('backgrounds')
        .getPublicUrl(backgroundImageData.path || `public/${backgroundFile.name}`).data.publicUrl;

      // Add new background with the public URL
      const { error: addBackgroundError } = await supabase
        .from('backgrounds')
        .insert({
          project_id: projectId,
          name: newBackground.name,
          image_url: publicURL // Store the complete public URL
        });

      if (addBackgroundError) throw addBackgroundError;

      setAddingBackground(false);
      setNewBackground({
        name: '',
      });
      setBackgroundFile(null);
      setBackgroundImagePreview(null);
      fetchProjectData(); // Refresh data
    } catch (error) {
      console.error('Error adding background:', error);
      setError('Erreur lors de l\'ajout de l\'arrière-plan');
    } finally {
      setAddingBackgroundLoading(false);
    }
  }

  async function handleEditStyle(style) {
    // Implement edit style logic
  }

  async function handleDeleteStyle(styleId) {
    // Implement delete style logic
  }

  async function handleEditBackground(background) {
    // Implement edit background logic
  }

  async function handleDeleteBackground(backgroundId) {
    // Implement delete background logic
  }

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

  // Ajouter cette fonction pour gérer l'ajout de styles via template
  const handleStyleTemplatesAdded = (addedStyles) => {
    // Rafraîchir les styles après l'ajout
    fetchProjectData();
    setSuccess(`${addedStyles.length} styles ont été ajoutés avec succès !`);
  };
  
  // Ajouter cette fonction pour gérer les erreurs
  const handleStyleTemplatesError = (errorMessage) => {
    setError(errorMessage);
  };

  // Helper function to ensure we have a full URL
  const getFullImageUrl = (url) => {
    if (!url) return null;
    
    // Check if it's already a full URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it's just a storage path, convert to public URL
    return supabase
      .storage
      .from('backgrounds')
      .getPublicUrl(url).data.publicUrl;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <span className="ml-3 text-gray-600">Chargement...</span>
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

  // Fonction pour supprimer le projet et ses dépendances
  async function handleDeleteProject() {
    setDeleteLoading(true);
    
    try {
      console.log(`Début de la suppression du projet ${projectId} (${project.name})`);
      
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
      
      // Rediriger vers la liste des projets après un court délai
      setTimeout(() => {
        router.push('/photobooth-ia/admin/projects');
      }, 500);
      
    } catch (error) {
      console.error('Erreur lors de la suppression du projet:', error);
      setError(`Erreur lors de la suppression du projet: ${error.message}`);
      setDeleteConfirm(false);
      setDeleteLoading(false);
    }
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
              <button
                onClick={() => setActiveTab('backgrounds')}
                className={`border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'backgrounds' ? 'border-indigo-500 text-indigo-600' : ''
                }`}
              >
                Arrière-plans <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-600">{backgrounds.length}</span>
              </button>
            </nav>
          </div>

          {/* Tab content */}
          <div className="p-6">
            {/* Info Tab */}
            {activeTab === 'info' && (
              <>
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Informations du projet</h3>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 bg-gray-50 p-5 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Nom</h4>
                      <div className="mt-1 text-sm text-gray-900">{project.name}</div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">URL du projet</h4>
                      <div className="mt-1 text-sm text-gray-900">/photobooth/{project.slug}</div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Description</h4>
                      <div className="mt-1 text-sm text-gray-900">{project.description || '-'}</div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Statut</h4>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          project.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {project.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Couleur principale</h4>
                      <div className="mt-1 flex items-center">
                        <div 
                          className="w-5 h-5 mr-2 rounded-full" 
                          style={{ backgroundColor: project.primary_color }}
                        ></div>
                        <span className="text-sm text-gray-900">{project.primary_color}</span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Couleur secondaire</h4>
                      <div className="mt-1 flex items-center">
                        <div 
                          className="w-5 h-5 mr-2 rounded-full" 
                          style={{ backgroundColor: project.secondary_color }}
                        ></div>
                        <span className="text-sm text-gray-900">{project.secondary_color}</span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Message d&apos;accueil</h4>
                      <div className="mt-1 text-sm text-gray-900">{project.home_message || '-'}</div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Date de création</h4>
                      <div className="mt-1 text-sm text-gray-900">
                        {new Date(project.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Nouveau sélecteur de type de photobooth */}
                  <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-gray-500">Type de Photobooth</h4>
                      {/* Bouton de validation du type */}
                      {!typeValidated && project && (
                        <button
                          onClick={handleValidatePhotoboothType}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-teal-600 transition-colors shadow-sm"
                        >
                          Valider le type de photobooth
                        </button>
                      )}
                      {typeValidated && (
                        <div className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                          Type validé
                        </div>
                      )}
                    </div>

                    <div className="mt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          onClick={async () => {
                            if (typeValidated) return; // Ne rien faire si le type est déjà validé
                            
                            const { error } = await supabase
                              .from('projects')
                              .update({ photobooth_type: 'standard' })
                              .eq('id', project.id);
                            
                            if (!error) {
                              setProject({...project, photobooth_type: 'standard'});
                              setSuccess('Type de photobooth mis à jour');
                              // Montrer les templates de styles pour ce type
                              setShowStyleTemplates(true);
                            }
                          }}
                          disabled={typeValidated && project.photobooth_type !== 'standard'}
                          className={`flex flex-col items-center p-3 border rounded-lg transition-colors ${
                            project.photobooth_type === 'standard' || !project.photobooth_type 
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                              : typeValidated 
                                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' 
                                : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 002-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <span className="text-sm font-medium">FaceSwapping</span>
                        </button>
                        
                        <button
                          onClick={async () => {
                            if (typeValidated) return; // Ne rien faire si le type est déjà validé
                            
                            const { error } = await supabase
                              .from('projects')
                              .update({ photobooth_type: 'premium' })
                              .eq('id', project.id);
                            
                            if (!error) {
                              setProject({...project, photobooth_type: 'premium'});
                              setSuccess('Type de photobooth mis à jour');
                            }
                          }}
                          disabled={typeValidated && project.photobooth_type !== 'premium'}
                          className={`flex flex-col items-center p-3 border rounded-lg transition-colors ${
                            project.photobooth_type === 'premium' 
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                              : typeValidated 
                                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' 
                                : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="text-sm font-medium">Premium</span>
                        </button>
                        
                        <button
                          onClick={async () => {
                            if (typeValidated) return; // Ne rien faire si le type est déjà validé
                            
                            const { error } = await supabase
                              .from('projects')
                              .update({ photobooth_type: 'photobooth2' })
                              .eq('id', project.id);
                            
                            if (!error) {
                              setProject({...project, photobooth_type: 'photobooth2'});
                              setSuccess('Type de photobooth mis à jour');
                            }
                          }}
                          disabled={typeValidated && project.photobooth_type !== 'photobooth2'}
                          className={`flex flex-col items-center p-3 border rounded-lg transition-colors ${
                            project.photobooth_type === 'photobooth2' 
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                              : typeValidated 
                                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' 
                                : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 002.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm font-medium">MiniMax</span>
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Sélectionnez le type d'expérience pour ce photobooth. Type actuel: {getPhotoboothTypeLabel(project.photobooth_type || 'standard')}
                        {typeValidated && <span className="text-orange-500 ml-2 font-medium">Ce choix est définitif et ne peut plus être modifié.</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Styles section - directly integrated into the Info tab */}
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Styles du projet ({styles.length})</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowStyleTemplates(!showStyleTemplates)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        {showStyleTemplates ? 'Masquer les templates' : 'Ajouter depuis templates'}
                      </button>
                      
                      <button
                        onClick={() => setAddingStyle(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                      >
                        <RiAddLine className="mr-2 h-4 w-4" />
                        Ajouter style manuellement
                      </button>
                    </div>
                  </div>
                  
                  {/* Templates section */}
                  {showStyleTemplates && (
                    <div className="mb-8 border-b border-gray-200 pb-6">
                      <StyleTemplates 
                        projectId={projectId} 
                        photoboothType={project.photobooth_type || 'standard'} 
                        onStylesAdded={handleStyleTemplatesAdded}
                        onError={handleStyleTemplatesError}
                      />
                    </div>
                  )}
                  
                  {/* Style form */}
                  {addingStyle && (
                    <div className="mb-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
                      <h4 className="text-md font-medium mb-3">Nouveau style</h4>
                      <form onSubmit={handleAddStyle} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="styleName" className="block text-sm font-medium text-gray-700">
                              Nom du style *
                            </label>
                            <input
                              type="text"
                              id="styleName"
                              value={newStyle.name}
                              onChange={(e) => setNewStyle({...newStyle, name: e.target.value})}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="styleGender" className="block text-sm font-medium text-gray-700">
                              Catégorie *
                            </label>
                            <select
                              id="styleGender"
                              value={newStyle.gender}
                              onChange={(e) => setNewStyle({...newStyle, gender: e.target.value})}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black"
                              required
                            >
                              <option value="">Sélectionner...</option>
                              <option value="m">Homme</option>
                              <option value="f">Femme</option>
                              <option value="ag">Ado Garçon</option>
                              <option value="af">Ado Fille</option>
                            </select>
                          </div>
                          <div>
                            <label htmlFor="styleKey" className="block text-sm font-medium text-gray-700">
                              Clé de style (s1, s2, etc.) *
                            </label>
                            <input
                              type="text"
                              id="styleKey"
                              value={newStyle.style_key}
                              onChange={(e) => setNewStyle({...newStyle, style_key: e.target.value})}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="styleVariations" className="block text-sm font-medium text-gray-700">
                              Nombre de variations
                            </label>
                            <input
                              type="number"
                              id="styleVariations"
                              min="1"
                              max="10"
                              value={newStyle.variations}
                              onChange={(e) => setNewStyle({...newStyle, variations: e.target.value})}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="styleDescription" className="block text-sm font-medium text-gray-700">
                            Description
                          </label>
                          <textarea
                            id="styleDescription"
                            rows={2}
                            value={newStyle.description}
                            onChange={(e) => setNewStyle({...newStyle, description: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Image de prévisualisation *</label>
                          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                              {styleImagePreview ? (
                                <div className="flex flex-col items-center">
                                  <div className="w-40 h-40 mb-3 relative">
                                    <Image
                                      src={styleImagePreview}
                                      alt="Aperçu"
                                      fill
                                      style={{ objectFit: "contain" }}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setStyleFile(null);
                                      setStyleImagePreview(null);
                                    }}
                                    className="text-xs px-2 py-1 bg-gray-200 rounded-md hover:bg-gray-300"
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                  <div className="flex text-sm text-gray-600">
                                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                                      <span>Télécharger un fichier</span>
                                      <input
                                        type="file"
                                        className="sr-only"
                                        accept="image/*"
                                        onChange={handleStyleImageChange}
                                      />
                                    </label>
                                  </div>
                                  <p className="text-xs text-gray-500">PNG, JPG, GIF jusqu&apos;à 10MB</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => setAddingStyle(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                          >
                            Annuler
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-md shadow-sm hover:from-indigo-700 hover:to-purple-700"
                            disabled={addingStyleLoading}
                          >
                            {addingStyleLoading ? 'Ajout en cours...' : 'Ajouter'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                  
                  {/* Message si aucun style n'est disponible */}
                  {styles.length === 0 && !showStyleTemplates && !addingStyle && (
                    <div className="text-center py-10 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="mt-4 text-gray-500">
                        Aucun style n&apos;a été ajouté à ce projet.
                      </p>
                      <div className="mt-6 flex justify-center space-x-3">
                        <button
                          onClick={() => setShowStyleTemplates(true)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                          Ajouter des styles depuis un template
                        </button>
                        
                        <button
                          onClick={() => setAddingStyle(true)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                        >
                          <RiAddLine className="mr-2 h-4 w-4" />
                          Ajouter manuellement
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Affichage de la grille des styles existants */}
                  {styles.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {styles.map((style) => (
                        <div key={style.id} className="border border-gray-200 rounded-md overflow-hidden text-black">
                          <div className="h-40 bg-gray-100 relative">
                            {style.preview_image ? (
                              <Image
                                src={style.preview_image}
                                alt={style.name}
                                fill
                                style={{ objectFit: "contain" }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-gray-400">Aucune image</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="p-4">
                            <h4 className="font-medium text-gray-900">{style.name}</h4>
                            <div className="mt-1 flex items-center text-sm text-gray-500">
                              <span>{style.gender === 'm' ? 'Homme' : 
                                    style.gender === 'f' ? 'Femme' : 
                                    style.gender === 'ag' ? 'Ado Garçon' : 'Ado Fille'}</span>
                              <span className="mx-2">•</span>
                              <span>Style {style.style_key}</span>
                            </div>
                            
                            <div className="mt-4 flex space-x-2">
                              <button
                                onClick={() => handleEditStyle(style)}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => handleDeleteStyle(style.id)}
                                className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50"
                              >
                                Supprimer
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => router.push(`/photobooth-ia/admin/projects`)}
                      className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <RiArrowLeftLine className="mr-2 h-4 w-4" />
                      Retour
                    </button>
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

            {/* Backgrounds Tab */}
            {activeTab === 'backgrounds' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Arrière-plans du projet</h3>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {backgrounds.map((background) => (
                    <div key={background.id} className="border border-gray-200 rounded-md overflow-hidden">
                      <div className="h-40 bg-gray-100 relative">
                        {background.image_url ? (
                          <Image
                            src={getFullImageUrl(background.image_url)}
                            alt={background.name}
                            fill
                            style={{ objectFit: "cover" }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-gray-400">Aucune image</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <h4 className="font-medium text-gray-900">{background.name}</h4>
                        
                        <div className="mt-4 flex space-x-2">
                          <button
                            onClick={() => handleEditBackground(background)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDeleteBackground(background.id)}
                            className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => setAddingBackground(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    <RiAddLine className="mr-2 h-4 w-4" />
                    Ajouter un arrière-plan
                  </button>
                </div>
                
                {/* Formulaire d'ajout d'arrière-plan */}
                {addingBackground && (
                  <div className="mt-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h4 className="text-md font-medium mb-3">Nouvel arrière-plan</h4>
                    <form onSubmit={handleAddBackground} className="space-y-4">
                      <div>
                        <label htmlFor="backgroundName" className="block text-sm font-medium text-gray-700">
                          Nom de l'arrière-plan *
                        </label>
                        <input
                          type="text"
                          id="backgroundName"
                          value={newBackground.name}
                          onChange={(e) => setNewBackground({...newBackground, name: e.target.value})}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Image de l'arrière-plan *</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                          <div className="space-y-1 text-center">
                            {backgroundImagePreview ? (
                              <div className="flex flex-col items-center">
                                <div className="w-40 h-40 mb-3 relative">
                                  <Image
                                    src={backgroundImagePreview}
                                    alt="Aperçu"
                                    fill
                                    style={{ objectFit: "cover" }}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBackgroundFile(null);
                                    setBackgroundImagePreview(null);
                                  }}
                                  className="text-xs px-2 py-1 bg-gray-200 rounded-md hover:bg-gray-300"
                                >
                                  Supprimer
                                </button>
                              </div>
                            ) : (
                              <>
                                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <div className="flex text-sm text-gray-600">
                                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                                    <span>Télécharger un fichier</span>
                                    <input
                                      type="file"
                                      className="sr-only"
                                      accept="image/*"
                                      onChange={handleBackgroundImageChange}
                                    />
                                  </label>
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG, GIF jusqu&apos;à 10MB</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setAddingBackground(false)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-md shadow-sm hover:from-indigo-700 hover:to-purple-700"
                          disabled={addingBackgroundLoading}
                        >
                          {addingBackgroundLoading ? 'Ajout en cours...' : 'Ajouter'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fenêtre modale de confirmation de suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center text-red-600 mb-4">
              <RiAlertLine className="w-6 h-6 mr-2" />
              <h3 className="text-lg font-medium">Confirmation de suppression</h3>
            </div>
            
            <p className="mb-4 text-gray-700">
              Êtes-vous sûr de vouloir supprimer le projet <strong>"{project?.name}"</strong> ?
              <br /><br />
              Cette action est irréversible et supprimera également :
            </p>
            
            <ul className="list-disc list-inside mb-4 text-sm text-gray-600">
              <li>Tous les styles associés ({styles.length})</li>
              <li>Tous les arrière-plans ({backgrounds.length})</li>
              <li>Tous les paramètres du projet</li>
            </ul>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={deleteLoading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteProject}
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
    </>
  );
}
