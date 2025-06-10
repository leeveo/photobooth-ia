'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { RiAddLine, RiExternalLinkLine, RiArrowLeftLine, RiSaveLine, RiDeleteBin6Line, RiAlertLine } from 'react-icons/ri';
import StyleTemplates from '../../components/StyleTemplates';
import BackgroundTemplates from '../../components/BackgroundTemplates';
import { QRCodeSVG } from 'qrcode.react';
import dynamic from 'next/dynamic';

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
  // New state for background templates popup
  const [showBackgroundTemplates, setShowBackgroundTemplates] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // Ajout d'un état pour savoir si le type de photobooth est validé
  const [typeValidated, setTypeValidated] = useState(false);
  const [activeStep, setActiveStep] = useState(1); // Étape active pour le wizard
  const [isSubmitting, setIsSubmitting] = useState(false); // État de soumission pour le bouton
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  // Add state variable for canvas layout
  const [canvasLayout, setCanvasLayout] = useState(null);
  // Add these state variables near the other state declarations
  const [deleteStyleConfirm, setDeleteStyleConfirm] = useState(false);
  const [styleToDelete, setStyleToDelete] = useState(null);
  const [deleteStyleLoading, setDeleteStyleLoading] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState([]); // State for saved layouts
  const [layoutName, setLayoutName] = useState(''); // State for layout name
  const [elements, setElements] = useState([]); // State for custom elements
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 }); // State for stage size
  
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

      // Fetch project backgrounds - update this function to filter for active backgrounds
      const { data: backgroundsData, error: backgroundsError } = await supabase
        .from('backgrounds')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true); // Only fetch active backgrounds

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

  // Update the typeValidated state based on project data when it loads
  useEffect(() => {
    if (project) {
      setTypeValidated(!!project.type_validated);
    }
  }, [project]);

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
    setError(null);
    
    try {
      if (!backgroundFile) {
        setError("Veuillez sélectionner une image");
        setAddingBackgroundLoading(false);
        return;
      }
      
      // Create FormData to send the file and metadata
      const formData = new FormData();
      formData.append('projectId', projectId);
      formData.append('name', newBackground.name || 'Arrière-plan sans nom');
      formData.append('isActive', 'true');
      formData.append('file', backgroundFile);
      
      // Use the API endpoint instead of direct Supabase calls
      const response = await fetch('/api/admin/add-background', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'ajout de l'arrière-plan");
      }
      
      const { data } = await response.json();
      
      // Update local state with the backgrounds
      setBackgrounds(data);
      
      // Reset form
      setAddingBackground(false);
      setNewBackground({ name: '' });
      setBackgroundFile(null);
      setBackgroundImagePreview(null);
      
      setSuccess("Arrière-plan ajouté avec succès");
    } catch (error) {
      console.error("Error adding background:", error);
      setError(error.message);
    } finally {
      setAddingBackgroundLoading(false);
    }
  }

  async function handleEditStyle(style) {
    // Implement edit style logic
  }

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

  async function handleEditBackground(background) {
    // This function is no longer needed but we'll keep it for now to avoid breaking any existing references
    console.log("Edit background feature has been removed");
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

  // Enhanced function to handle styles added from template popup
  const handleStyleTemplatesAdded = (addedStyles) => {
    console.log(`✅ ${addedStyles.length} styles added successfully`, addedStyles);
    
    // Close the template popup immediately
    setShowStyleTemplates(false);
    
    // Set a success message
    setSuccess(`${addedStyles.length} styles ont été ajoutés avec succès !`);
    
    // Force refresh the styles data with a direct database query
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
    
    // Immediately refresh styles
    refreshStyles();
    
    // Also call the full data refresh for other data
    setTimeout(() => {
      fetchProjectData();
    }, 500);
  };
  
  // Updated function to handle backgrounds added from templates
  const handleBackgroundTemplatesAdded = (addedBackgrounds) => {
    console.log(`✅ Background updated successfully`, addedBackgrounds);
    
    // Close the template popup
    setShowBackgroundTemplates(false);
    
    // Set a success message
    setSuccess(`Arrière-plan du projet mis à jour avec succès !`);
    
    // Replace the backgrounds with only the newly added background
    setBackgrounds(addedBackgrounds);
    
    // Also call the full data refresh for other data
    setTimeout(() => {
      fetchProjectData();
    }, 500);
  };
  
  // Ajouter cette fonction pour gérer les erreurs des templates d'arrière-plan
  const handleBackgroundTemplatesError = (errorMessage) => {
    setError(errorMessage);
  };

  // Ajouter cette fonction pour gérer les erreurs des templates de style
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

  // Function to handle project field changes
  const handleProjectChange = (e) => {
    const { name, value } = e.target;
    setProject({
      ...project,
      [name]: value
    });
  };

  // Add this function to handle project name changes
  const handleProjectNameChange = (e) => {
    const newName = e.target.value;
    setProject({
      ...project,
      name: newName
    });
  };

  // Add this function right after the existing state declarations
  const handleNameChange = (e) => {
    // Limit to 30 characters
    const newName = e.target.value.slice(0, 30);
    setProject({
      ...project,
      name: newName
    });
  };

  // Add this function to save the project name
  const saveProjectName = async () => {
    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('projects')
        .update({ name: project.name })
        .eq('id', projectId);
        
      if (error) throw error;
      
      setSuccess("Nom du projet mis à jour avec succès");
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error updating project name:', error);
      setError("Erreur lors de la mise à jour du nom du projet");
      setIsSubmitting(false);
    }
  };

  // Add these handlers for description and home message
  const handleDescriptionChange = (e) => {
    // Limit to 200 characters
    const newDescription = e.target.value.slice(0, 200);
    setProject({
      ...project,
      description: newDescription
    });
  };

  const handleHomeMessageChange = (e) => {
    // Limit to 100 characters
    const newHomeMessage = e.target.value.slice(0, 100);
    setProject({
      ...project,
      home_message: newHomeMessage
    });
  };

  // Function to save description
  const saveProjectDescription = async () => {
    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('projects')
        .update({ description: project.description })
        .eq('id', projectId);
        
      if (error) throw error;
      
      setSuccess("Description du projet mise à jour avec succès");
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error updating project description:', error);
      setError("Erreur lors de la mise à jour de la description");
      setIsSubmitting(false);
    }
  };

  // Function to save home message
  const saveProjectHomeMessage = async () => {
    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('projects')
        .update({ home_message: project.home_message })
        .eq('id', projectId);
        
      if (error) throw error;
      
      setSuccess("Message d'accueil mis à jour avec succès");
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error updating home message:', error);
      setError("Erreur lors de la mise à jour du message d'accueil");
      setIsSubmitting(false);
    }
  };

  // Function to copy URL to clipboard
  const copyProjectUrl = () => {
    const fullUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/photobooth/${project.slug}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setSuccess("URL copiée dans le presse-papiers");
    }).catch((err) => {
      console.error('Failed to copy URL:', err);
      setError("Impossible de copier l'URL");
    });
  };

  // Add handlers for color fields
  const handleColorChange = (colorType, value) => {
    setProject({
      ...project,
      [colorType]: value
    });
  };

  // Function to save color changes
  const saveColorChange = async (colorType) => {
    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('projects')
        .update({ [colorType]: project[colorType] })
        .eq('id', projectId);
        
      if (error) throw error;
      
      setSuccess(`Couleur ${colorType === 'primary_color' ? 'principale' : 'secondaire'} mise à jour avec succès`);
      setIsSubmitting(false);
    } catch (error) {
      console.error(`Error updating ${colorType}:`, error);
      setError(`Erreur lors de la mise à jour de la couleur ${colorType === 'primary_color' ? 'principale' : 'secondaire'}`);
      setIsSubmitting(false);
    }
  };

  // Add handler for event date change
  const handleEventDateChange = (e) => {
    setProject({
      ...project,
      event_date: e.target.value
    });
  };

  // Function to save event date
  const saveEventDate = async () => {
    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('projects')
        .update({ event_date: project.event_date })
        .eq('id', projectId);
        
      if (error) throw error;
      
      setSuccess("Date de l'événement mise à jour avec succès");
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error updating event date:', error);
      setError("Erreur lors de la mise à jour de la date de l'événement");
      setIsSubmitting(false);
    }
  };

  // Add a unified save function for all project fields
  const saveProjectInfo = async () => {
    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('projects')
        .update({
          name: project.name,
          description: project.description,
          home_message: project.home_message,
          primary_color: project.primary_color,
          secondary_color: project.secondary_color,
          event_date: project.event_date
        })
        .eq('id', projectId);
        
      if (error) throw error;
      
      // Instead of setting success message, show the popup
      setSuccessMessage("Informations du projet mises à jour avec succès");
      setShowSuccessPopup(true);
      
      // Auto-hide the popup after 3 seconds
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);
      
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error updating project info:', error);
      setError("Erreur lors de la mise à jour des informations du projet");
      setIsSubmitting(false);
    }
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
              {/* Remove the Arrière-plans tab from here */}
            </nav>
          </div>

          {/* Tab content */}
          <div className="p-6">
            {/* Info Tab */}
            {activeTab === 'info' && (
              <>
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Etape 1 : Informations du projet</h3>
                  
                  <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <div className="sm:col-span-2">
                      <h4 className="text-sm font-medium text-gray-500">Nom</h4>
                      <div className="mt-1">
                        <div className="relative">
                          <input
                            type="text"
                            value={project.name}
                            onChange={handleNameChange}
                            maxLength={30}
                            className="block w-full rounded-md border-gray-300 py-3 px-4 text-base shadow-md focus:border-indigo-500 focus:ring-indigo-500 focus:shadow-indigo-200 focus:shadow-lg transition-all duration-200"
                            placeholder="Nom du projet"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500 flex justify-between">
                          <span>Maximum 30 caractères</span>
                          <span className={`${project.name.length >= 25 ? 'text-orange-500' : ''} ${project.name.length >= 30 ? 'text-red-500 font-bold' : ''}`}>
                            {project.name.length}/30
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="sm:col-span-2">
                      <h4 className="text-sm font-medium text-gray-500">URL du projet</h4>
                      <div className="mt-1">
                        <div className="relative">
                          <div className="flex items-center">
                            <div className="relative flex-grow">
                              <input
                                type="text"
                                value={`${process.env.NEXT_PUBLIC_BASE_URL}/photobooth/${project?.slug}`}
                                readOnly
                                className="block w-full rounded-md border-gray-300 bg-gray-50 py-2.5 px-4 text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              />
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                              </div>
                            </div>
                            <button
                              onClick={copyProjectUrl}
                              className="ml-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2v2M7 7h10" />
                              </svg>
                              Copier
                            </button>
                          </div>
                          
                          {/* QR Code directly embedded in the page */}
                          <div className="mt-4 flex flex-col items-center">
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              {project && (
                                <QRCodeSVG
                                  value={`${process.env.NEXT_PUBLIC_BASE_URL}/photobooth/${project.slug}`}
                                  size={150}
                                  level="M"
                                  bgColor="#FFFFFF"
                                  fgColor="#000000"
                                />
                              )}
                            </div>
                            <p className="mt-2 text-xs text-gray-500 text-center">
                              Scannez ce QR code pour accéder directement au photobooth
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="sm:col-span-2">
                      <h4 className="text-sm font-medium text-gray-500">Description</h4>
                      <div className="mt-1">
                        <div className="relative">
                          <textarea
                            value={project.description || ''}
                            onChange={handleDescriptionChange}
                            maxLength={200}
                            rows={3}
                            className="block w-full rounded-md border-gray-300 py-2 px-4 text-base shadow-md focus:border-indigo-500 focus:ring-indigo-500 focus:shadow-indigo-200 focus:shadow-lg transition-all duration-200"
                            placeholder="Description du projet (optionnel)"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500 flex justify-between">
                          <span>Maximum 200 caractères</span>
                          <span className={`${(project.description?.length || 0) >= 180 ? 'text-orange-500' : ''} ${(project.description?.length || 0) >= 200 ? 'text-red-500 font-bold' : ''}`}>
                            {project.description?.length || 0}/200
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="sm:col-span-2">
                      <h4 className="text-sm font-medium text-gray-500">Message d&apos;accueil</h4>
                      <div className="mt-1">
                        <div className="relative">
                          <input
                            type="text"
                            value={project.home_message || ''}
                            onChange={handleHomeMessageChange}
                            maxLength={100}
                            className="block w-full rounded-md border-gray-300 py-3 px-4 text-base shadow-md focus:border-indigo-500 focus:ring-indigo-500 focus:shadow-indigo-200 focus:shadow-lg transition-all duration-200"
                            placeholder="Message d'accueil (optionnel)"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500 flex justify-between">
                          <span>Maximum 100 caractères</span>
                          <span className={`${(project.home_message?.length || 0) >= 80 ? 'text-orange-500' : ''} ${(project.home_message?.length || 0) >= 100 ? 'text-red-500 font-bold' : ''}`}>
                            {project.home_message?.length || 0}/100
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Couleur principale</h4>
                      <div className="mt-1">
                        <div className="flex items-center space-x-2">
                          <div className="relative">
                            <div 
                              className="w-10 h-10 rounded-md shadow-sm cursor-pointer border border-gray-300"
                              style={{ backgroundColor: project.primary_color }}
                            >
                              <input 
                                type="color" 
                                value={project.primary_color} 
                                onChange={(e) => handleColorChange('primary_color', e.target.value)}
                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                aria-label="Choisir couleur principale"
                              />
                            </div>
                          </div>
                          <input
                            type="text"
                            value={project.primary_color}
                            onChange={(e) => handleColorChange('primary_color', e.target.value)}
                            className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="#RRGGBB"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Cliquez sur le carré pour ouvrir le sélecteur de couleur
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Couleur secondaire</h4>
                      <div className="mt-1">
                        <div className="flex items-center space-x-2">
                          <div className="relative">
                            <div 
                              className="w-10 h-10 rounded-md shadow-sm cursor-pointer border border-gray-300"
                              style={{ backgroundColor: project.secondary_color }}
                            >
                              <input 
                                type="color" 
                                value={project.secondary_color} 
                                onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                aria-label="Choisir couleur secondaire"
                              />
                            </div>
                          </div>
                          <input
                            type="text"
                            value={project.secondary_color}
                            onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                            className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="#RRGGBB"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Cliquez sur le carré pour ouvrir le sélecteur de couleur
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Date de l&apos;événement</h4>
                      <div className="mt-1">
                        <div className="flex items-center space-x-2">
                          <input
                            type="datetime-local"
                            value={project.event_date ? new Date(project.event_date).toISOString().slice(0, 16) : ''}
                            onChange={handleEventDateChange}
                            className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {project.event_date ? new Date(project.event_date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Aucune date définie'}
                        </p>
                      </div>
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

                    {/* Add a single save button for all fields */}
                    <div className="sm:col-span-2 mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={saveProjectInfo}
                        disabled={isSubmitting}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Enregistrement...
                          </>
                        ) : (
                          <>
                            <RiSaveLine className="mr-2 h-4 w-4" />
                            Enregistrer les modifications
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Add the Backgrounds section here as an encart */}
                  <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-medium text-gray-500">Arrière-plans du projet ({backgrounds.length})</h4>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setShowBackgroundTemplates(true)}
                          className="inline-flex items-center px-4 py-2 border border-indigo-300 text-sm font-medium rounded-lg shadow-sm text-indigo-700 bg-white hover:bg-indigo-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5M11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                          Ajouter depuis templates
                        </button>
                        <button
                          onClick={() => setAddingBackground(true)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                        >
                          <RiAddLine className="mr-2 h-4 w-4" />
                          Ajouter un arrière-plan
                        </button>
                      </div>
                    </div>
                    
                    {backgrounds.length === 0 ? (
                      <div className="text-center py-6 bg-white bg-opacity-50 rounded-lg border border-dashed border-gray-300">
                        <p className="text-gray-500">
                          Aucun arrière-plan n'a été ajouté à ce projet.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {backgrounds.map((background) => (
                          <div key={background.id} className="border border-gray-200 rounded-md overflow-hidden bg-white">
                            <div className="h-24 bg-gray-100 relative">
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
                            
                            <div className="p-2">
                              <h4 className="font-medium text-gray-900 text-sm truncate">{background.name}</h4>
                              
                              <div className="mt-2 flex justify-end">
                                <button
                                  onClick={() => handleDeleteBackground(background.id)}
                                  className="inline-flex items-center px-2 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Background form */}
                    {addingBackground && (
                      <div className="mt-6 bg-white p-6 rounded-lg border border-gray-200">
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
                                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

                  {/* Add step number to Type de photobooth section */}
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Etape 2 : Type de photobooth</h3>
                  
                  {/* Nouveau sélecteur de type de photobooth */}
                  <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-gray-500">Type de Photobooth</h4>
                      {typeValidated && (
                        <div className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                          Type validé et verrouillé
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
                      
                      {/* Add the validation button here, after the grid and centered */}
                      {!typeValidated && project && (
                        <div className="mt-6 flex justify-center">
                          <button
                            onClick={handleValidatePhotoboothType}
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-teal-600 transition-colors shadow-sm"
                          >
                            Valider le type de photobooth
                          </button>
                        </div>
                      )}
                      
                      <p className="mt-2 text-xs text-gray-500">
                        Sélectionnez le type d'expérience pour ce photobooth. Type actuel: {getPhotoboothTypeLabel(project.photobooth_type || 'standard')}
                        {typeValidated && <span className="text-orange-500 ml-2 font-medium">Ce choix est définitif et ne peut plus être modifié.</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Styles section - directly integrated into the Info tab */}
                <div className={`mt-8 ${!typeValidated ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''}`}>
                  <div className="flex justify-between items-center mb-4 relative">
                    <h3 className="text-lg font-medium text-gray-900">Etape 3 : Styles du projet ({styles.length})</h3>
                    
                    {!typeValidated && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-70 rounded-lg z-10">
                        <div className="bg-white p-3 rounded-lg shadow-md border border-gray-200 text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-orange-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <p className="text-gray-700 font-medium">Veuillez valider le type de photobooth (Étape 2) avant de continuer</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          console.log('🔍 Opening style templates');
                          setShowStyleTemplates(!showStyleTemplates);
                        }}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        disabled={!typeValidated}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5m0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        Ajouter des styles depuis un template
                      </button
                      >
                      
                      <button
                        onClick={() => setAddingStyle(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                        disabled={!typeValidated}
                      >
                        <RiAddLine className="mr-2 h-4 w-4" />
                        Ajouter style manuellement
                      </button>
                    </div>
                  </div>
                  
                  {/* Message de guide pour Etape 3 */}
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
                            Vous devez d'abord valider le type de photobooth à l'étape 2 avant de pouvoir ajouter des styles.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Templates section */}
                  {showStyleTemplates && (
                    <div className="mb-8 border-b border-gray-200 pb-6">
                      <StyleTemplates 
                        projectId={projectId} 
                        photoboothType={project.photobooth_type}
                        onStylesAdded={handleStyleTemplatesAdded}
                        onError={handleStyleTemplatesError}
                        existingStyles={styles} // Pass the current styles to prevent duplicates
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
                                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                    <div className="mb-8">
                      {/* Design-oriented multi-column encart with modern styling */}
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 shadow-lg border border-indigo-100">
                        <h4 className="text-lg font-semibold text-indigo-800 mb-6 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
                          </svg>
                          Galerie des styles séléctionnés ({styles.length})
                          {/* Add debug button in development */}
                        </h4>
                        
                        {/* Modern 5-column grid with responsive design */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {styles.map((style) => (
                            <div 
                              key={style.id} 
                              className="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 border border-gray-200"
                            >
                              <div className="aspect-square bg-gray-100 relative overflow-hidden">
                                {style.preview_image ? (
                                  <Image
                                    src={style.preview_image}
                                    alt={style.name}
                                    fill
                                    style={{ objectFit: "cover" }}
                                    className="transition-transform duration-500 group-hover:scale-110"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 002.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                                
                                {/* Gender badge overlay */}
                                <div className="absolute top-2 right-2">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                    style.gender === 'm' ? 'bg-blue-100 text-blue-800' : 
                                    style.gender === 'f' ? 'bg-pink-100 text-pink-800' :
                                    style.gender === 'ag' ? 'bg-green-100 text-green-800' :
                                    style.gender === 'af' ? 'bg-purple-100 text-purple-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {style.gender === 'm' ? 'Homme' : 
                                     style.gender === 'f' ? 'Femme' : 
                                     style.gender === 'ag' ? 'Ado G' : 
                                     style.gender === 'af' ? 'Ado F' : 'Général'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="p-3">
                                <h5 className="font-medium text-gray-900 mb-1 truncate">{style.name}</h5>
                                <div className="flex items-center text-xs text-gray-500 mb-2">
                                  <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-md">
                                    {style.style_key}
                                  </span>
                                  {style.variations > 1 && (
                                    <span className="ml-2 bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-md">
                                      {style.variations} var.
                                    </span>
                                  )}
                                </div>
                                
                                {/* Tags based on gender - Completely replaced to fix schema error */}
                                <div className="flex flex-wrap gap-1 mt-2 mb-3">
                                {style.gender === 'm' && (
                                  <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                    homme
                                  </span>
                                )}
                                {style.gender === 'f' && (
                                  <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                                    femme
                                  </span>
                                )}
                                {style.gender === 'ag' && (
                                  <>
                                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                                      ado
                                    </span>
                                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
                                      garçon
                                    </span>
                                  </>
                                )}
                                {style.gender === 'af' && (
                                  <>
                                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                                      ado
                                    </span>
                                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                                      fille
                                    </span>
                                  </>
                                )}
                                {(!style.gender || style.gender === '') && (
                                  <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                    général
                                  </span>
                                )}
                              </div>
                                
                                <div className="flex space-x-1 mt-2">
                                  <button
                                    onClick={() => handleDeleteStyle(style.id)}
                                    className="w-full inline-flex justify-center items-center px-2 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    Supprimer
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
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
                
                {/* Ajout de l'étape 4: Éditeur de Canvas */}
                <div className={`mt-8 ${!typeValidated ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''}`}>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Etape 4 : Éditeur de Canvas</h3>
                  
                  {/* Message de guide si le type n'est pas validé */}
                  {!typeValidated && (
                    <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <RiAlertLine className="h-5 w-5 text-orange-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-orange-700">
                            Vous devez d'abord valider le type de photobooth à l'étape 2 avant de pouvoir utiliser l'éditeur de canvas.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Canvas Editor Component */}
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

            {/* Remove the Backgrounds Tab from here since we moved it above */}
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
                    Supprimer ce style de la galerie
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="animate-fadeIn bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 border-l-4 border-green-500 pointer-events-auto">
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

      {/* Style delete confirmation popup */}
      {deleteStyleConfirm && styleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fadeIn">
            <div className="flex items-center text-red-600 mb-4">
              <RiAlertLine className="w-6 h-6 mr-2" />
              <h3 className="text-lg font-medium">Confirmer la suppression</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Êtes-vous sûr de vouloir supprimer le style <strong>"{styleToDelete.name}"</strong> de votre galerie?
              </p>
              
              {styleToDelete.preview_image && (
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24 relative border border-gray-200 rounded-md overflow-hidden">
                    <Image
                      src={styleToDelete.preview_image}
                      alt={styleToDelete.name}
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                </div>
              )}
              
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4 text-sm">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-orange-700">
                      Vous pourrez ajouter ce style depuis les templates 
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteStyleConfirm(false);
                  setStyleToDelete(null);
                }}
                disabled={deleteStyleLoading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteStyle}
                disabled={deleteStyleLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
              >
                {deleteStyleLoading ? (
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
                    Supprimer de la galerie des styles
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

// Add this CSS animation at the top of your file
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
// This should be before the ProjectDetails function
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = globalStyles;
  document.head.appendChild(style);
}

// Ajoutez ces styles CSS supplémentaires
const additionalStyles = `
.highlight-section {
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.5);
  animation: pulseShadow 1.5s ease-in-out;
}

@keyframes pulseShadow {
  0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(79, 70, 229, 0); }
  100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
}
`;

// Ajouter les styles au document
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = globalStyles + additionalStyles;
  document.head.appendChild(styleElement);
}