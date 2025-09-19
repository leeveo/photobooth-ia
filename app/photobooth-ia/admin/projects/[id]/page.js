'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { RiExternalLinkLine, RiArrowLeftLine, RiDeleteBin6Line, RiAlertLine } from 'react-icons/ri';
import { 
  RiInformationLine, 
  RiImageEditLine, 
  RiUser3Line, 
  RiMailSendLine, 
  RiShieldLine, 
  RiPaletteLine, 
  RiLayout5Line 
} from 'react-icons/ri';
import StyleTemplates from '../../components/StyleTemplates';
import BackgroundTemplates from '../../components/BackgroundTemplates';
import dynamic from 'next/dynamic';
import Loader from '../../../../components/ui/Loader';

// Import the components we created
import ProjectInfoForm from '../components/ProjectInfoForm';
import PhotoboothTypeManager from '../components/PhotoboothTypeManager';
import StyleManager from '../components/StyleManager';
import BackgroundManager from '../components/BackgroundManager';
import DataCaptureManager from '../components/DataCaptureManager';
import PhotoboothEmailTemplateEditor from '../components/PhotoboothEmailTemplateEditor';
import PhotoboothImagePageContentEditor from '../components/PhotoboothImagePageContentEditor';
import LogoManager from '../components/LogoManager';

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
  const [emailTemplate, setEmailTemplate] = useState({ subject: '', html_content: '' });
  const [emailTemplateId, setEmailTemplateId] = useState(null);
  const [emailTemplateLoading, setEmailTemplateLoading] = useState(false);
  const [emailTemplateSuccess, setEmailTemplateSuccess] = useState(null);
  const [emailTemplateError, setEmailTemplateError] = useState(null);
  const [showEmailEditor, setShowEmailEditor] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [baseUrl, setBaseUrl] = useState('');
  const [showTestEmailPopup, setShowTestEmailPopup] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [grandPublic, setGrandPublic] = useState(false);

  // Function to get the base URL dynamically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      setBaseUrl(`${url.protocol}//${url.host}`);
    } else {
      setBaseUrl(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
    }
  }, []);

  // Construction de l'URL du photobooth à partir du baseUrl, du type et du slug du projet
  const getPhotoboothUrl = (project) => {
    if (!project?.slug || !project?.photobooth_type || !baseUrl) return '';
    return `${baseUrl}/photobooth-${project.photobooth_type}/${project.slug}`;
  };

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
      console.log('🔍 Fetching project data for projectId:', projectId, 'adminId:', currentAdminId);
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('created_by', currentAdminId) // Ajouter la vérification de l'admin propriétaire
        .single();

      if (projectError) {
        console.error('❌ Project fetch error:', projectError);
        if (projectError.code === 'PGRST116') {
          // Le projet n'existe pas ou n'appartient pas à cet admin
          console.error("Projet non trouvé ou vous n'avez pas les droits d'accès");
          setError("Ce projet n'existe pas ou vous n'avez pas les droits pour y accéder");
          setLoading(false);
          return;
        }
        throw projectError;
      }
      
      console.log('✅ Project data loaded:', projectData);
      console.log('📧 email_enabled value in DB:', projectData.email_enabled, typeof projectData.email_enabled);
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

  // Charger la valeur de email_enabled depuis la table projects
  useEffect(() => {
    if (project) {
      // Si email_enabled existe dans le projet, l'utiliser, sinon défaut à true
      const emailEnabledValue = project.email_enabled !== null && project.email_enabled !== undefined 
        ? project.email_enabled 
        : true;
      console.log('Loading email_enabled from project:', project.email_enabled, '-> setting to:', emailEnabledValue);
      setEmailEnabled(emailEnabledValue);
      
      // Charger la valeur de grand_public depuis la table projects
      const grandPublicValue = project.grand_public !== null && project.grand_public !== undefined 
        ? project.grand_public 
        : false;
      console.log('Loading grand_public from project:', project.grand_public, '-> setting to:', grandPublicValue);
      setGrandPublic(grandPublicValue);
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
        return 'Standard';
      case 'boomerang':
        return 'Boomerang';
      case 'logo':
        return 'Logo Fusion'; // Ajoutez votre nouveau type ici
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

  // Fonction pour archiver le projet et ses dépendances
  async function handleDeleteProject() {
    setDeleteLoading(true);
    
    try {
      console.log(`Début de l'archivage du projet ${projectId} (${project.name})`);
      
      // Utiliser l'API pour archiver le projet
      const response = await fetch('/api/delete-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          projectId,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Échec de l\'archivage du projet');
      }
      
      console.log('Projet archivé avec succès:', result);
      
      // Rediriger vers la liste des projets après un court délai
      setTimeout(() => {
        router.push('/photobooth-ia/admin/projects');
      }, 500);
      
    } catch (error) {
      console.error('Erreur lors de l\'archivage du projet:', error);
      setError(`Erreur lors de l'archivage du projet: ${error.message}`);
      setDeleteConfirm(false);
      setDeleteLoading(false);
    }
  }
  
  // Charger le template d'email à l'ouverture
  useEffect(() => {
    const fetchEmailTemplate = async () => {
      if (!projectId) return;
      setEmailTemplateLoading(true);
      setEmailTemplateError(null);
      try {
        const { data, error } = await supabase
          .from('photobooth_emailtemplate')
          .select('*')
          .eq('id_project', projectId)
          .maybeSingle();
        if (error && error.code !== 'PGRST116') throw error;
        if (data) {
          setEmailTemplate({ subject: data.subject || '', html_content: data.html_content || '' });
          setEmailTemplateId(data.id);
        } else {
          setEmailTemplate({ subject: '', html_content: '' });
          setEmailTemplateId(null);
        }
      } catch (err) {
        setEmailTemplateError("Erreur lors du chargement du template d'email");
      } finally {
        setEmailTemplateLoading(false);
      }
    };
    fetchEmailTemplate();
  }, [projectId]);

  // Fonction de sauvegarde du template d'email
  const handleSaveEmailTemplate = async () => {
    setEmailTemplateLoading(true);
    setEmailTemplateError(null);
    setEmailTemplateSuccess(null);
    try {
      if (emailTemplateId) {
        // Update
        const { error } = await supabase
          .from('photobooth_emailtemplate')
          .update({
            subject: emailTemplate.subject,
            html_content: emailTemplate.html_content,
            updated_at: new Date().toISOString()
          })
          .eq('id', emailTemplateId);
        if (error) throw error;
        setEmailTemplateSuccess('Template mis à jour avec succès');
      } else {
        // Insert
        const { data, error } = await supabase
          .from('photobooth_emailtemplate')
          .insert({
            id_project: projectId,
            subject: emailTemplate.subject,
            html_content: emailTemplate.html_content
          })
          .select()
          .single();
        if (error) throw error;
        setEmailTemplateId(data.id);
        setEmailTemplateSuccess('Template créé avec succès');
      }
    } catch (err) {
      setEmailTemplateError("Erreur lors de la sauvegarde du template d'email");
    } finally {
      setEmailTemplateLoading(false);
    }
  };

  // Switch custom simple (à placer dans le composant)
  function EmailSwitch({ checked, onChange }) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`}
      >
        <span className="sr-only">Activer l'envoi d'email</span>
        <span
          className={`inline-block h-4 w-4 transform bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    );
  }

  // Switch pour le mode grand public
  function GrandPublicSwitch({ checked, onChange }) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-orange-600' : 'bg-gray-300'}`}
      >
        <span className="sr-only">Activer le mode grand public</span>
        <span
          className={`inline-block h-4 w-4 transform bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    );
  }

  // Ajoute une fonction pour gérer la sauvegarde depuis l'éditeur popup
  const handleSaveEmailTemplateFromEditor = async ({ subject, html_content }) => {
    setEmailTemplateLoading(true);
    setEmailTemplateError(null);
    setEmailTemplateSuccess(null);
    try {
      let now = new Date().toISOString();
      console.log('[EmailTemplate] --- Début sauvegarde ---');
      console.log('[EmailTemplate] projectId:', projectId);
      console.log('[EmailTemplate] subject:', subject);
      console.log('[EmailTemplate] html_content:', html_content);

      // Vérifie si le projet existe et log le résultat
      const { data: projectCheck, error: projectCheckError } = await supabase
        .from('projects')
        .select('id,created_by')
        .eq('id', projectId)
        .maybeSingle();
      if (projectCheckError) {
        console.error('[EmailTemplate] Erreur SELECT project:', projectCheckError);
      } else {
        console.log('[EmailTemplate] Projet trouvé:', projectCheck);
      }

      // Vérifie s'il existe déjà un template pour ce projet
      const { data: existing, error: selectError } = await supabase
        .from('photobooth_emailtemplate')
        .select('id')
        .eq('id_project', projectId)
        .maybeSingle();

      if (selectError) {
        console.error('[EmailTemplate] Erreur SELECT template:', selectError);
      } else {
        console.log('[EmailTemplate] Résultat SELECT template:', existing);
      }

      let templateId = existing?.id;

      if (templateId) {
        // Update
        console.log('[EmailTemplate] Update du template existant id:', templateId);
        const { error } = await supabase
          .from('photobooth_emailtemplate')
          .update({
            subject,
            html_content,
            updated_at: now
          })
          .eq('id', templateId);
        if (error) {
          console.error('[EmailTemplate] Erreur UPDATE:', error);
          throw error;
        }
        setEmailTemplateId(templateId);
        setEmailTemplateSuccess('Template mis à jour avec succès');
      } else {
        // Insert
        console.log('[EmailTemplate] Insert nouveau template');
        const { data, error } = await supabase
          .from('photobooth_emailtemplate')
          .insert({
            id_project: projectId,
            subject,
            html_content,
            created_at: now,
            updated_at: now
          })
          .select('id,subject,html_content')
          .single();
        if (error) {
          console.error('[EmailTemplate] Erreur INSERT:', error);
          throw error;
        }
        setEmailTemplateId(data.id);
        setEmailTemplateSuccess('Template créé avec succès');
      }
      setEmailTemplate({ subject, html_content });
      setShowEmailEditor(false);
      console.log('[EmailTemplate] --- Fin sauvegarde OK ---');
    } catch (err) {
      setEmailTemplateError("Erreur lors de la sauvegarde du template d'email");
      console.error('[EmailTemplate] Exception JS:', err);
    } finally {
      setEmailTemplateLoading(false);
    }
  };

  // Ajoutez cette fonction juste avant le return du composant
  const handleEmailEnabledChange = async (enabled) => {
    console.log('handleEmailEnabledChange called with:', enabled);
    setEmailEnabled(enabled);
    try {
      console.log('Updating project email_enabled to:', enabled, 'for project:', projectId);
      const { data, error } = await supabase
        .from('projects')
        .update({ email_enabled: enabled })
        .eq('id', projectId)
        .select('email_enabled'); // Ajoutons select pour voir le résultat
        
      if (error) {
        console.error('Supabase error updating email_enabled:', error);
        throw error;
      }
      
      console.log('Update result from Supabase:', data);
      console.log('Successfully updated email_enabled in database');
      setSuccess(enabled ? "L'envoi d'email a été activé." : "L'envoi d'email a été désactivé.");
      setProject(prev => prev ? { ...prev, email_enabled: enabled } : prev);
      
      // Forcer un refresh du projet depuis la DB pour vérifier
      setTimeout(async () => {
        console.log('🔄 Refreshing project data to verify update...');
        const { data: freshProject, error: refreshError } = await supabase
          .from('projects')
          .select('email_enabled')
          .eq('id', projectId)
          .single();
          
        if (!refreshError) {
          console.log('Fresh data from DB - email_enabled:', freshProject.email_enabled);
        }
      }, 1000);
      
    } catch (err) {
      console.error('Error in handleEmailEnabledChange:', err);
      setError("Erreur lors de la mise à jour de l'activation email.");
      setEmailEnabled(!enabled);
    }
  };

  // Fonction pour gérer le changement du mode grand public
  const handleGrandPublicChange = async (enabled) => {
    console.log('handleGrandPublicChange called with:', enabled);
    setGrandPublic(enabled);
    try {
      console.log('Updating project grand_public to:', enabled, 'for project:', projectId);
      const { data, error } = await supabase
        .from('projects')
        .update({ grand_public: enabled })
        .eq('id', projectId)
        .select('grand_public');
        
      if (error) {
        console.error('Supabase error updating grand_public:', error);
        throw error;
      }
      
      console.log('Update result from Supabase:', data);
      console.log('Successfully updated grand_public in database');
      setSuccess(enabled ? "Le mode grand public a été activé." : "Le mode grand public a été désactivé.");
      setProject(prev => prev ? { ...prev, grand_public: enabled } : prev);
      
      // Forcer un refresh du projet depuis la DB pour vérifier
      setTimeout(async () => {
        console.log('🔄 Refreshing project data to verify grand_public update...');
        const { data: freshProject, error: refreshError } = await supabase
          .from('projects')
          .select('grand_public')
          .eq('id', projectId)
          .single();
          
        if (!refreshError) {
          console.log('Fresh data from DB - grand_public:', freshProject.grand_public);
        }
      }, 1000);
      
    } catch (err) {
      console.error('Error in handleGrandPublicChange:', err);
      setError("Erreur lors de la mise à jour du mode grand public.");
      setGrandPublic(!enabled);
    }
  };

  // Fonction pour tester l'envoi d'email avec le template
  const handleTestEmail = async () => {
    setShowTestEmailPopup(true);
  };

  // Fonction pour envoyer l'email de test
  const sendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      setEmailTemplateError("Veuillez entrer une adresse email valide.");
      return;
    }

    setEmailTemplateLoading(true);
    setEmailTemplateError(null);
    setEmailTemplateSuccess(null);
    setShowTestEmailPopup(false);

    try {
      const response = await fetch('/api/test-email-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: projectId,
          testEmail: testEmailAddress
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'envoi du test');
      }

      if (result.templateFound) {
        setEmailTemplateSuccess(`Email de test envoyé avec succès à ${testEmailAddress} avec votre template personnalisé !`);
      } else {
        setEmailTemplateSuccess(`Email de test envoyé à ${testEmailAddress}, mais aucun template personnalisé n'a été trouvé. Créez un template pour personnaliser vos emails.`);
      }

    } catch (err) {
      console.error('Erreur test email:', err);
      setEmailTemplateError(`Erreur lors de l'envoi du test : ${err.message}`);
    } finally {
      setEmailTemplateLoading(false);
      setTestEmailAddress('');
    }
  };

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
  
  // Define the steps for the horizontal stepper, with icons
  const steps = [
    { key: 'info', label: 'Informations', number: 1, icon: <RiInformationLine className="w-7 h-7" /> },
    { key: 'backgrounds', label: 'Arrière-plans', number: 2, icon: <RiImageEditLine className="w-7 h-7" /> },
    { key: 'data', label: 'Données participant', number: 3, icon: <RiUser3Line className="w-7 h-7" /> },
    { key: 'email', label: 'Email & Partage', number: 4, icon: <RiMailSendLine className="w-7 h-7" /> },
    { key: 'type', label: 'Type Photobooth', number: 5, icon: <RiShieldLine className="w-7 h-7" /> },
    { key: 'styles', label: 'Styles', number: 6, icon: <RiPaletteLine className="w-7 h-7" /> },
    { key: 'canvas', label: 'Canvas', number: 7, icon: <RiLayout5Line className="w-7 h-7" /> },
  ];

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
              href={getPhotoboothUrl(project)}
              target="_blank"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
            >
              <RiExternalLinkLine className="mr-2 h-4 w-4" />
              Voir le projet
              {project.photobooth_type === 'boomerang' && (
                <span className="ml-1 text-xs text-amber-600">(Boomerang)</span>
              )}
              {project.photobooth_type === 'logo' && (
                <span className="ml-1 text-xs text-blue-600">(Logo Fusion)</span>
              )}
              {project.photobooth_type === 'premium' && (
                <span className="ml-1 text-xs text-purple-600">(Premium)</span>
              )}
              {project.photobooth_type === 'photobooth2' && (
                <span className="ml-1 text-xs text-green-600">(MiniMax)</span>
              )}
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
              className="inline-flex items-center px-4 py-2 border border-amber-300 text-sm font-medium rounded-lg text-amber-700 bg-white hover:bg-amber-50 shadow-sm"
            >
              <RiDeleteBin6Line className="mr-2 h-4 w-4" />
              Archiver
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

        {/* Horizontal Stepper Navigation */}
        <div className="bg-white shadow-sm rounded-xl overflow-hidden mb-6">
          <nav className="flex justify-between px-6 py-4 border-b border-gray-200">
            {steps.map((step, idx) => (
              <button
                key={step.key}
                onClick={() => setActiveTab(step.key)}
                className={`flex flex-col items-center px-2 group focus:outline-none transition-all
                  ${activeTab === step.key
                    ? 'text-indigo-700 font-bold'
                    : 'text-gray-500 hover:text-indigo-500'}
                `}
                style={{ minWidth: 90 }}
              >
                <span className={`flex items-center justify-center w-14 h-14 rounded-full mb-1 text-white text-lg font-bold
                  ${activeTab === step.key
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg'
                    : 'bg-gray-200 text-gray-500 group-hover:bg-indigo-100'}
                `}>
                  {/* Icon */}
                  {step.icon}
                </span>
                <span className="text-xs mt-1">{step.label}</span>
                {activeTab === step.key && (
                  <span className="block w-2 h-2 mt-2 rounded-full bg-indigo-500"></span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="p-6 bg-white rounded-xl shadow-sm">
          {/* Informations */}
          {activeTab === 'info' && (
            <ProjectInfoForm 
              project={project} 
              setProject={setProject} 
              setError={setError} 
              setSuccess={setSuccess}
              setShowSuccessPopup={setShowSuccessPopup}
              setSuccessMessage={setSuccessMessage}
            />
          )}

          {/* Arrière-plans */}
          {activeTab === 'backgrounds' && (
            <div>
              <div className="bg-gradient-to-r rounded-lg from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200 mb-6">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md mr-3">
                    <span className="text-white font-semibold">2</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      Arrière-plans du photobooth
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Gérez et personnalisez les arrière-plans utilisés dans votre photobooth.
                    </p>
                  </div>
                </div>
              </div>
              <BackgroundManager
                projectId={projectId}
                backgrounds={backgrounds}
                setBackgrounds={setBackgrounds}
                setError={setError}
                setSuccess={setSuccess}
              />
            </div>
          )}

          {/* Données participant */}
          {activeTab === 'data' && (
            <DataCaptureManager
              projectId={projectId}
              project={project}
              setProject={setProject}
              setError={setError}
              setSuccess={setSuccess}
            />
          )}

          {/* Email & Partage */}
          {activeTab === 'email' && (
            <div>
              <div className="bg-gradient-to-r rounded-lg from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200 mb-6">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md mr-3">
                    <span className="text-white font-semibold">4</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      Email & Partage
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Gérez l'envoi automatique d'email aux participants et personnalisez le contenu.
                    </p>
                  </div>
                </div>
              </div>
              {/* Popup éditeur d'email */}
              {showEmailEditor && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                  <div className="w-full max-w-5xl">
                    <PhotoboothEmailTemplateEditor
                      projectId={projectId}
                      onTemplateChange={() => {}} // inutile ici
                      initialSubject={emailTemplate.subject}
                      initialHtmlContent={emailTemplate.html_content}
                      onSave={handleSaveEmailTemplateFromEditor}
                      onCancel={() => setShowEmailEditor(false)}
                      isSaving={emailTemplateLoading}
                    />
                    <div className="flex justify-end mt-4">
                      <button
                        type="button"
                        onClick={() => setShowEmailEditor(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Encart Mode Grand Public */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 my-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="w-full">
                  <h3 className="text-lg font-semibold mb-1">Support photobooth grand public</h3>
                  <p className="text-gray-500 text-sm mb-2">
                    Activez ce mode pour masquer les boutons de redirection dans la popup QR (Voir ma photo, Télécharger). Idéal pour les événements grand public où vous ne souhaitez pas rediriger vers des pages spécifiques.
                  </p>
                  <div className="flex items-center gap-4">
                    <GrandPublicSwitch checked={grandPublic} onChange={handleGrandPublicChange} />
                    <span className="text-sm text-gray-700">
                      {grandPublic ? "Mode grand public activé" : "Mode grand public désactivé"}
                    </span>
                    {grandPublic && (
                      <span className="ml-4 text-sm text-orange-600 italic font-medium">
                        ⚠️ Les boutons de redirection sont masqués dans la popup QR
                      </span>
                    )}
                    {!grandPublic && (
                      <span className="ml-4 text-sm text-gray-500 italic">
                        Les boutons "Voir ma photo" et "Télécharger" sont affichés normalement
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Encart Email Template Editor avec switch et bouton édition */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 my-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="w-full">
                  <h3 className="text-lg font-semibold mb-1">Personnalisation de l'email de partage d'image</h3>
                  <p className="text-gray-500 text-sm mb-2">
                    Gérez l'envoi automatique d'email aux participants et personnalisez le contenu.
                  </p>
                  <div className="flex items-center gap-4">
                    <EmailSwitch checked={emailEnabled} onChange={handleEmailEnabledChange} />
                    <span className="text-sm text-gray-700">
                      {emailEnabled ? "Envoi d'email activé" : "Envoi d'email désactivé"}
                    </span>
                    {emailEnabled && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowEmailEditor(true)}
                          className="ml-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-md shadow-sm text-sm font-medium flex items-center hover:from-blue-700 hover:to-indigo-800"
                        >
                          <RiShieldLine className="mr-2 h-4 w-4" />
                          Éditer l'email
                        </button>
                        {/* Bouton de test d'email */}
                        <button
                          type="button"
                          onClick={() => handleTestEmail()}
                          className="ml-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-md shadow-sm text-sm font-medium flex items-center hover:from-green-700 hover:to-green-800"
                          disabled={emailTemplateLoading}
                        >
                          {emailTemplateLoading ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Test en cours...
                            </>
                          ) : (
                            <>
                              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Tester l'email
                            </>
                          )}
                        </button>
                      </>
                    )}
                    {!emailEnabled && (
                      <span className="ml-4 text-sm text-gray-500 italic">
                        Les boutons d'envoi d'email sont masqués car la fonctionnalité est désactivée
                      </span>
                    )}
                  </div>
                  {/* Affichage des messages de succès et erreur pour les templates d'email */}
                  {emailTemplateSuccess && (
                    <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                      {emailTemplateSuccess}
                    </div>
                  )}
                  {emailTemplateError && (
                    <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                      {emailTemplateError}
                    </div>
                  )}
                  
                  {/* Aperçu de l'email sous le switch */}
                  {emailEnabled && emailTemplate && emailTemplate.subject && emailTemplate.html_content && (
                    <div className="mt-6 border rounded-md bg-white shadow p-4">
                      <div className="mb-2 text-xs text-gray-400">Aperçu de l'email personnalisé :</div>
                      <div className="mb-2 text-sm font-semibold text-gray-700">Sujet : {emailTemplate.subject}</div>
                      <div className="border rounded bg-gray-50 p-3 overflow-auto" style={{ minHeight: 120 }}>
                        <div dangerouslySetInnerHTML={{ __html: emailTemplate.html_content }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Bloc de personnalisation de la page /image */}
              <PhotoboothImagePageContentEditor projectId={projectId} />
            </div>
          )}

          {/* Type Photobooth */}
          {activeTab === 'type' && (
            <PhotoboothTypeManager
              project={project}
              setProject={setProject}
              typeValidated={typeValidated}
              setTypeValidated={setTypeValidated}
              setError={setError}
              setSuccess={setSuccess}
            />
          )}

          {/* Styles */}
          {activeTab === 'styles' && (
            <>
              {project.photobooth_type === 'logo' ? (
                <LogoManager 
                  projectId={projectId}
                  setError={setError}
                  setSuccess={setSuccess}
                />
              ) : (
                <StyleManager
                  projectId={projectId}
                  styles={styles}
                  setStyles={setStyles}
                  setError={setError}
                  setSuccess={setSuccess}
                  typeValidated={typeValidated}
                  photoboothType={project.photobooth_type}
                />
              )}
            </>
          )}

          {/* Canvas */}
          {activeTab === 'canvas' && (
            <div className={`mt-8 ${!typeValidated ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''}`}>
              <div className="bg-gradient-to-r rounded-lg from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md mr-3">
                    <span className="text-white font-semibold">7</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      Editeur de Canvas
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Personnnalisez l'encadrement de votre photo avec l'éditeur de canvas.
                    </p>
                  </div>
                </div>
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
                        Vous devez d'abord valider le type de photobooth à l'étape 5 avant de pouvoir utiliser l'éditeur de canvas.
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
          )}
        </div>
      </div>

      {/* Delete Project Confirmation Modal - Styled like StyleManager's popup */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center p-4" 
          role="dialog" 
          aria-modal="true">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl overflow-hidden w-full max-w-md transform transition-all animate-success-popup"
               onClick={(e) => e.stopPropagation()}>
            {/* Header with AMBER gradient effect */}
            <div className="h-28 bg-gradient-to-r from-amber-500 to-amber-700 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-cover bg-center opacity-20" 
                   style={{ backgroundImage: `url(${project?.logo_url || ''})` }}></div>
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
                Êtes-vous sûr de vouloir archiver le projet <span className="font-semibold text-amber-400">{project?.name}</span> ?
              </p>
              
              {/* Project preview */}
              {project?.logo_url && (
                <div className="flex justify-center mt-6 animate-success-text" style={{ animationDelay: "0.2s" }}>
                  <div className="w-32 h-32 relative rounded-lg overflow-hidden border border-gray-700 shadow-lg">
                    <Image
                      src={project.logo_url}
                      alt={project.name}
                      fill
                      style={{ objectFit: "contain" }}
                      className="rounded-lg"
                    />
                    
                    {/* Project name */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-1 text-center">
                      <span className="text-white text-xs truncate block">{project.name}</span>
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
                onClick={() => setDeleteConfirm(false)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                disabled={deleteLoading}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
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
              photoboothType={project?.photobooth_type} // <-- assurez-vous que cette valeur est bien transmise
              onStylesAdded={handleStyleTemplatesAdded}
              onError={handleStyleTemplatesError}
              existingStyles={styles}
              onClose={() => setShowStyleTemplates(false)}
            />
          </div>
        </div>
      )}

      {/* Success Popup with higher z-index */}
      
      {/* Test Email Popup */}
      {showTestEmailPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-success-popup">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 rounded-t-lg">
              <h3 className="text-xl font-bold text-white flex items-center">
                <svg className="mr-3 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Tester l'email
              </h3>
              <p className="mt-2 text-green-100 text-sm">
                Entrez une adresse email pour recevoir un test d'envoi
              </p>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label htmlFor="test-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse email
                </label>
                <input
                  id="test-email"
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="exemple@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      sendTestEmail();
                    }
                  }}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowTestEmailPopup(false);
                    setTestEmailAddress('');
                    setEmailTemplateError(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={sendTestEmail}
                  disabled={!testEmailAddress || emailTemplateLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-md hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center"
                >
                  {emailTemplateLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Envoi...
                    </>
                  ) : (
                    <>
                      <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Envoyer le test
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      

      {/* Add popup animations styles */}
      {typeof document !== 'undefined' && (
        <style jsx global>{`
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
        `}</style>
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
}`;

// Add the global styles to the document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = globalStyles;
  document.head.appendChild(style);
}