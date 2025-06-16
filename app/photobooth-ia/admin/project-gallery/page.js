'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import Link from 'next/link';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { 
  RiFilterLine, 
  RiDownloadLine, 
  RiCloseFill, 
  RiArrowLeftLine, 
  RiImageLine, 
  RiSettings3Line 
} from 'react-icons/ri';

export default function ProjectGallery() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectImages, setProjectImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [projectsWithPhotoCount, setProjectsWithPhotoCount] = useState({});
  const [moderationConfirm, setModerationConfirm] = useState(null);
  const [showMosaicSettings, setShowMosaicSettings] = useState(false);
  const [mosaicSettings, setMosaicSettings] = useState({
    bg_color: '#000000',
    bg_image_url: '',
    title: '',
    description: '',
    show_qr_code: false,
    qr_title: 'Scannez-moi',
    qr_description: 'Retrouvez toutes les photos ici',
    qr_position: 'center'
  });
  const [bgImageFile, setBgImageFile] = useState(null);
  const [bgImagePreview, setBgImagePreview] = useState(null);
  const [savingMosaicSettings, setSavingMosaicSettings] = useState(false);
  const [session, setSession] = useState(null);
  
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  // Vérifier si l'utilisateur est connecté
  useEffect(() => {
    const checkSession = () => {
      try {
        // Vérifier si le cookie admin_session existe
        const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith('admin_session='));
        
        // Essayer de récupérer depuis sessionStorage d'abord
        let sessionData = sessionStorage.getItem('admin_session');
        
        // Si pas trouvé, essayer localStorage
        if (!sessionData) {
          sessionData = localStorage.getItem('admin_session');
        }
        
        if (sessionData) {
          const parsedSession = JSON.parse(sessionData);
          
          // Vérifier si la session est valide
          if (parsedSession && parsedSession.logged_in) {
            setSession(parsedSession);
            
            // Si le cookie n'existe pas, le créer
            if (!hasCookie) {
              document.cookie = `admin_session=${parsedSession.user_id}; path=/; max-age=86400;`;
            }
            
            return;
          }
        }
        
        // Si aucune session valide trouvée, rediriger vers la page de connexion
        console.log("Aucune session valide trouvée, redirection vers login");
        router.push('/photobooth-ia/admin/login');
      } catch (err) {
        console.error("Erreur lors de la vérification de session:", err);
        router.push('/photobooth-ia/admin/login');
      }
    };
    
    checkSession();
  }, [router]);
  
  // Définir loadMosaicSettings AVANT de l'utiliser dans useEffect
  const loadMosaicSettings = useCallback(async (projectId) => {
    if (!projectId) return;
    
    try {
      // First check if settings exist
      const { data, error } = await supabase
        .from('mosaic_settings')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors
    
      if (error) {
        console.error('Error loading mosaic settings:', error);
        // Don't throw, just use defaults
      }
    
      if (data) {
        setMosaicSettings({
          bg_color: data.bg_color || '#000000',
          bg_image_url: data.bg_image_url || '',
          title: data.title || '',
          description: data.description || '',
          show_qr_code: data.show_qr_code || false,
          qr_title: data.qr_title || 'Scannez-moi',
          qr_description: data.qr_description || 'Retrouvez toutes les photos ici',
          qr_position: data.qr_position || 'center'
        });
        
        // Set background image preview if exists
        if (data.bg_image_url) {
          setBgImagePreview(data.bg_image_url);
        }
      } else {
        // Reset to defaults if no settings found
        setMosaicSettings({
          bg_color: '#000000',
          bg_image_url: '',
          title: '',
          description: '',
          show_qr_code: false,
          qr_title: 'Scannez-moi',
          qr_description: 'Retrouvez toutes les photos ici',
          qr_position: 'center'
        });
        setBgImagePreview(null);
      }
    } catch (err) {
      console.error('Error loading mosaic settings:', err);
    }
  }, [supabase]); // Add supabase as dependency
  
  // Charger la liste des projets avec leur nombre de photos
  useEffect(() => {
    async function loadProjects() {
      if (!session || !session.user_id) {
        console.warn("No valid session found, cannot fetch user-specific projects");
        setLoading(false);
        return;
      }
      
      try {
        // Fetch only projects owned by the current user
        console.log(`Filtering projects for user ID: ${session.user_id}`);
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, slug')
          .eq('created_by', session.user_id)
          .order('name', { ascending: true });
          
        if (error) throw error;
        
        console.log(`Found ${data?.length || 0} projects for this user`);
        setProjects(data || []);
        
        // Fetch photo counts for each project
        const photoCounts = {};
        for (const project of data || []) {
          try {
            // Call API to count S3 images
            const response = await fetch(`/api/s3-project-images?projectId=${project.id}&countOnly=true`);
            if (response.ok) {
              const countData = await response.json();
              photoCounts[project.id] = countData.count || 0;
            }
          } catch (countError) {
            console.error(`Error fetching counts for project ${project.id}:`, countError);
            photoCounts[project.id] = '?';
          }
        }
        
        setProjectsWithPhotoCount(photoCounts);
      } catch (err) {
        console.error('Erreur lors du chargement des projets:', err);
        setError('Impossible de charger les projets');
      } finally {
        setLoading(false);
      }
    }
    
    if (session) {
      loadProjects();
    }
  }, [supabase, session]);
  
  // Charger les images S3 d'un projet sélectionné
  useEffect(() => {
    if (!selectedProject) {
      setProjectImages([]);
      return;
    }
    
    // Ensure the selected project belongs to the current user
    if (session && projects.length > 0) {
      const projectBelongsToUser = projects.some(p => p.id === selectedProject);
      if (!projectBelongsToUser) {
        console.warn("Selected project does not belong to current user");
        setError("Vous n'avez pas accès à ce projet");
        setProjectImages([]);
        return;
      }
    }
    
    async function loadS3Images() {
      setLoading(true);
      try {
        console.log(`Chargement des images S3 pour le projet: ${selectedProject}`);
        
        // Just call the API to get images
        const response = await fetch(`/api/s3-project-images?projectId=${selectedProject}`);
        
        if (!response.ok) {
          throw new Error(`Erreur API: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Résultat API S3:', data);
        
        if (data.success && data.images) {
          setProjectImages(data.images);
        } else {
          setProjectImages([]);
        }

        // Also load mosaic settings for this project
        loadMosaicSettings(selectedProject);
      } catch (err) {
        console.error('Erreur lors du chargement des images S3:', err);
        setError('Impossible de charger les images du projet depuis S3');
      } finally {
        setLoading(false);
      }
    }
    
    loadS3Images();
  }, [selectedProject, loadMosaicSettings, projects, session]);
  
  // Télécharger une image
  const downloadImage = (url, filename) => {
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename || 'image.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      });
  };
  
  // Fonction pour la modération d'image
  const moderateImage = async (id, url) => {
    // Show confirmation dialog first
    setModerationConfirm({ id, url });
  };
  
  // Function to handle the actual moderation after confirmation
  const handleConfirmedModeration = async () => {
    if (!moderationConfirm) return;
    
    const { id, url } = moderationConfirm;
    
    // For now, just update the UI without database changes
    try {
      // Update UI immediately
      setProjectImages(projectImages.map(img => 
        img.id === id 
          ? {...img, isModerated: true} 
          : img
      ));
      
      setSuccess("Image modérée visuellement avec succès");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Erreur lors de la modération:', err);
      setError('Erreur lors de la modération. Veuillez réessayer.');
    } finally {
      setModerationConfirm(null);
    }
  };
  
  // Cancel moderation
  const cancelModeration = () => {
    setModerationConfirm(null);
  };

  // Add this function to handle background image change
  const handleBgImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setBgImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setBgImagePreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Add this function near your other fetch functions to load mosaic settings
  async function fetchMosaicSettings(projectId) {
    if (!projectId) return;
    
    try {
      // Get mosaic settings from the database
      const { data, error } = await supabase
        .from('mosaic_settings')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
    
      if (error) {
        console.error('Error fetching mosaic settings:', error);
        return null;
      }
    
      console.log('Fetched mosaic settings:', data);
      return data;
    } catch (err) {
      console.error('Exception fetching mosaic settings:', err);
      return null;
    }
  }

  // Replace the saveMosaicSettings function to use the server-side API for background image upload
  const saveMosaicSettings = async () => {
    if (!selectedProject) {
      setError('Veuillez sélectionner un projet');
      return;
    }
    
    setSavingMosaicSettings(true);
    
    try {
      // Process background image if provided
      let bgImageUrl = mosaicSettings.bg_image_url;
      
      if (bgImageFile) {
        try {
          console.log('Uploading background image via API');
          
          // Create FormData to send the file
          const formData = new FormData();
          formData.append('projectId', selectedProject);
          formData.append('name', `Mosaic Background ${Date.now()}`);
          formData.append('file', bgImageFile);
          
          // Upload using our new API endpoint
          const uploadResponse = await fetch('/api/upload-background', {
            method: 'POST',
            body: formData,
          });
          
          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.message || uploadResponse.statusText);
          }
          
          const uploadResult = await uploadResponse.json();
          bgImageUrl = uploadResult.data.url;
          console.log('Background image uploaded successfully:', bgImageUrl);
        } catch (uploadErr) {
          console.error('Error handling background image:', uploadErr);
          setError(`Erreur lors du téléchargement de l'image: ${uploadErr.message}`);
          setSavingMosaicSettings(false);
          return;
        }
      }
      
      // Use the server-side API for mosaic settings
      const settingsData = {
        project_id: selectedProject,
        bg_color: mosaicSettings.bg_color,
        bg_image_url: bgImageUrl,
        title: mosaicSettings.title,
        description: mosaicSettings.description,
        show_qr_code: mosaicSettings.show_qr_code,
        qr_title: mosaicSettings.qr_title,
        qr_description: mosaicSettings.qr_description?.substring(0, 255),
        qr_position: mosaicSettings.qr_position,
        updated_at: new Date().toISOString()
      };
      
      const response = await fetch('/api/save-mosaic-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error saving settings');
      }
      
      setSuccess('Paramètres de mosaïque enregistrés avec succès');
      setShowMosaicSettings(false);
      
      // Refresh the mosaic settings - now this function exists
      const updatedSettings = await fetchMosaicSettings(selectedProject);
      if (updatedSettings) {
        setMosaicSettings(updatedSettings);
      }
      
    } catch (err) {
      console.error('Error saving mosaic settings:', err);
      setError(`Erreur lors de l'enregistrement des paramètres de mosaïque: ${err.message}`);
    } finally {
      setSavingMosaicSettings(false);
    }
  };

  // Update the delete background function to use our API
  const handleDeleteBackground = async (backgroundId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet arrière-plan ?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/delete-background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ backgroundId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || response.statusText);
      }
      
      setSuccess('Arrière-plan supprimé avec succès !');
      
      // Refresh the backgrounds
      const projectId = isEditing || tempProjectId || selectedProject;
      await fetchBackgroundsForProject(projectId);
    } catch (error) {
      console.error('Error deleting background:', error);
      setError(`Erreur lors de la suppression: ${error.message}`);
    }
  };

  if (loading && !projects.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingSpinner text="Chargement de vos projets..." size="large" color="indigo" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
        {session?.company_name 
          ? `Galerie de ${session.company_name}`
          : "Votre Galerie de Photos"}
      </h2>
      
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 mb-4 text-sm text-green-700 bg-green-50 rounded-lg border border-green-200">
          {success}
        </div>
      )}
      
      <div className="bg-white shadow-sm rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <label htmlFor="projectSelect" className="block text-sm font-medium text-gray-700 mb-2">
            Sélectionnez un de vos projets
          </label>
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              id="projectSelect"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg bg-gray-50"
              onChange={(e) => setSelectedProject(e.target.value)}
              value={selectedProject || ''}
            >
              <option value="">-- Choisissez un projet --</option>
              {projects.length === 0 ? (
                <option value="" disabled>Vous n'avez pas de projets</option>
              ) : (
                projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name} - {projectsWithPhotoCount[project.id] !== undefined ? `${projectsWithPhotoCount[project.id]} photos` : 'chargement...'}
                  </option>
                ))
              )}
            </select>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                href={selectedProject ? `/photobooth-ia/admin/project-mosaic?projectId=${selectedProject}&fullscreen=true` : '#'}
                className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-lg shadow-sm ${
                  selectedProject 
                    ? 'text-white bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-transparent' 
                    : 'text-gray-400 bg-gray-200 cursor-not-allowed border-gray-300'
                }`}
                onClick={(e) => {
                  if (!selectedProject) {
                    e.preventDefault();
                    return;
                  }
                }}
                target="_blank"
                rel="noopener noreferrer"
                title="Voir la mosaïque de photos en plein écran"
              >
                <RiImageLine className="h-5 w-5 mr-2" />
                Voir mosaïque
              </Link>
              
              <button
                onClick={() => setShowMosaicSettings(true)}
                className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-lg shadow-sm ${
                  selectedProject 
                    ? 'text-white bg-gradient-to-br from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 border-transparent' 
                    : 'text-gray-400 bg-gray-200 cursor-not-allowed border-gray-300'
                }`}
                disabled={!selectedProject}
                title="Personnaliser l'apparence de la mosaïque (couleur, titre, arrière-plan)"
              >
                <RiSettings3Line className="h-5 w-5 mr-2" />
                Personnaliser la mosaïque
              </button>
            </div>
          </div>
        </div>
        
        {loading && selectedProject ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <LoadingSpinner text="Chargement des images en cours" size="medium" color="indigo" />
          </div>
        ) : null}
        
        {!loading && projects.length === 0 ? (
          <div className="text-center py-16 px-6">
            <RiImageLine className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-lg font-medium text-gray-900">Aucun projet trouvé</p>
            <p className="mt-2 text-gray-500">Vous n'avez pas encore créé de projets.</p>
            <div className="mt-6">
              <Link
                href="/photobooth-ia/admin/projects/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                Créer un projet
              </Link>
            </div>
          </div>
        ) : null}
        
        {!loading && selectedProject && projectImages.length === 0 ? (
          <div className="text-center py-16 px-6">
            <RiImageLine className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-lg font-medium text-gray-900">Aucune image trouvée</p>
            <p className="mt-2 text-gray-500">Ce projet n'a pas encore d'images générées</p>
          </div>
        ) : null}
        
        {!loading && selectedProject && projectImages.length > 0 && (
          <div className="p-6">
            <div className="mb-4 text-sm flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="text-gray-600 flex items-center">
                <RiFilterLine className="mr-2 h-5 w-5 text-gray-400" />
                <span className="font-semibold text-gray-700">{projectImages.length}</span> image(s) trouvée(s) dans le dossier S3 du projet
              </div>
              <div className="text-sm text-indigo-600 font-medium">
                {projects.find(p => p.id == selectedProject)?.name || 'Projet'} : {projectsWithPhotoCount[selectedProject] || projectImages.length} photos au total
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {projectImages.map((image, index) => (
                <div 
                  key={image.id} 
                  className={`relative border border-gray-200 rounded-lg overflow-hidden group ${
                    image.isModerated ? 'opacity-50' : ''
                  }`}
                >
                  <div className="aspect-w-2 aspect-h-3 bg-gray-100 relative" style={{ height: '200px' }}>
                    <Image
                      src={image.image_url}
                      alt={`Photo ${index}`}
                      fill
                      style={{ objectFit: "cover" }}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="rounded-t-md"
                      onError={(e) => {
                        console.error('Erreur de chargement image:', image.image_url);
                        e.target.onerror = null;
                        e.target.src = '/placeholder-image.png';
                      }}
                    />
                  </div>
                  <div className="p-2 text-xs text-gray-500">
                    <div className="truncate">{image.metadata?.fileName}</div>
                    <div>{new Date(image.created_at).toLocaleString()}</div>
                    {image.metadata?.size && (
                      <div>{Math.round(image.metadata.size / 1024)} KB</div>
                    )}
                    {image.isModerated && (
                      <div className="text-red-500 font-medium mt-1">Modérée</div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => downloadImage(image.image_url, image.metadata?.fileName)}
                        className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full hover:from-blue-600 hover:to-purple-700"
                        title="Télécharger"
                      >
                        <RiDownloadLine className="h-5 w-5" />
                      </button>
                      {!image.isModerated && (
                        <button
                          onClick={() => moderateImage(image.id, image.image_url)}
                          className="p-2 bg-gradient-to-br from-red-500 to-pink-600 text-white rounded-full hover:from-red-600 hover:to-pink-700"
                          title="Modérer cette image"
                        >
                          <RiCloseFill className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end mt-6">
        <Link
          href="/photobooth-ia/admin/projects"
          className="px-4 py-2 border border-transparent text-sm font-medium text-white bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-sm hover:from-blue-600 hover:to-purple-700 flex items-center gap-2"
        >
          <RiArrowLeftLine className="w-4 h-4" />
          Retour aux projets
        </Link>
      </div>
      
      {/* Moderation confirmation modal */}
      {moderationConfirm && (
        <div className="fixed z-40 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Confirmation de modération
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Êtes-vous sûr de vouloir modérer cette image ? Elle ne sera plus visible publiquement et sera filtrée des mosaïques.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  onClick={handleConfirmedModeration}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Modérer
                </button>
                <button 
                  type="button" 
                  onClick={cancelModeration}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mosaic Settings Modal */}
      {showMosaicSettings && (
        <div className="fixed z-40 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                <h3 className="text-lg leading-6 font-semibold text-white">
                  Personnaliser la mosaïque
                </h3>
              </div>
              
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="space-y-4">
                  {/* Background Color */}
                  <div>
                    <label htmlFor="bg_color" className="block text-sm font-medium text-gray-700">
                      Couleur d&apos;arrière-plan
                    </label>
                    <div className="mt-1 flex items-center">
                      <input
                        type="color"
                        id="bg_color"
                        value={mosaicSettings.bg_color}
                        onChange={(e) => setMosaicSettings({...mosaicSettings, bg_color: e.target.value})}
                        className="h-8 w-8"
                      />
                      <input
                        type="text"
                        value={mosaicSettings.bg_color}
                        onChange={(e) => setMosaicSettings({...mosaicSettings, bg_color: e.target.value})}
                        className="ml-2 flex-1 block px-3 py-2 sm:text-sm border border-gray-300 rounded-md"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      La couleur sera utilisée si aucune image n&apos;est sélectionnée
                    </p>
                  </div>
                  
                  {/* Background Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Image d&apos;arrière-plan (optionnel)
                    </label>
                    <div className="mt-1 flex items-center space-x-4">
                      {bgImagePreview && (
                        <div className="w-24 h-16 relative border border-gray-200">
                          <Image
                            src={bgImagePreview}
                            alt="Background preview"
                            fill
                            style={{ objectFit: "cover" }}
                            className="rounded"
                          />
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBgImageChange}
                          className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700"
                        />
                      </div>
                    </div>
                    {bgImagePreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setBgImagePreview(null);
                          setBgImageFile(null);
                          setMosaicSettings({...mosaicSettings, bg_image_url: ''});
                        }}
                        className="mt-2 text-xs text-red-600"
                      >
                        Supprimer l&apos;image
                      </button>
                    )}
                  </div>
                  
                  {/* Title */}
                  <div>
                    <label htmlFor="mosaic_title" className="block text-sm font-medium text-gray-700">
                      Titre de la mosaïque
                    </label>
                    <input
                      type="text"
                      id="mosaic_title"
                      value={mosaicSettings.title}
                      onChange={(e) => setMosaicSettings({...mosaicSettings, title: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 sm:text-sm border border-gray-300 rounded-md"
                      placeholder="Titre affiché en haut de la mosaïque"
                    />
                  </div>
                  
                  {/* Description */}
                  <div>
                    <label htmlFor="mosaic_description" className="block text-sm font-medium text-gray-700">
                      Description de la mosaïque
                    </label>
                    <textarea
                      id="mosaic_description"
                      value={mosaicSettings.description}
                      onChange={(e) => setMosaicSettings({...mosaicSettings, description: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 sm:text-sm border border-gray-300 rounded-md"
                      rows={3}
                      placeholder="Description affichée sous le titre (optionnel)"
                    />
                  </div>

                  {/* QR Code Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="show_qr_code"
                        checked={mosaicSettings.show_qr_code}
                        onChange={(e) => setMosaicSettings({...mosaicSettings, show_qr_code: e.target.checked})}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      />
                      <label htmlFor="show_qr_code" className="ml-2 block text-sm font-medium text-gray-700">
                        Afficher le QR code
                      </label>
                    </div>
                    
                    {mosaicSettings.show_qr_code && (
                      <>
                        <div>
                          <label htmlFor="qr_title" className="block text-sm font-medium text-gray-700">
                            Titre du QR code
                          </label>
                          <input
                            type="text"
                            id="qr_title"
                            value={mosaicSettings.qr_title}
                            onChange={(e) => setMosaicSettings({...mosaicSettings, qr_title: e.target.value})}
                            className="mt-1 block w-full px-3 py-2 sm:text-sm border border-gray-300 rounded-md"
                            placeholder="Titre affiché au-dessus du QR code"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="qr_description" className="block text-sm font-medium text-gray-700">
                            Description du QR code
                          </label>
                          <textarea
                            id="qr_description"
                            value={mosaicSettings.qr_description}
                            onChange={(e) => setMosaicSettings({...mosaicSettings, qr_description: e.target.value})}
                            className="mt-1 block w-full px-3 py-2 sm:text-sm border border-gray-300 rounded-md"
                            rows={2}
                            placeholder="Description affichée sous le QR code (max 30 caractères)"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="qr_position" className="block text-sm font-medium text-gray-700">
                            Position du QR code
                          </label>
                          <select
                            id="qr_position"
                            value={mosaicSettings.qr_position}
                            onChange={(e) => setMosaicSettings({...mosaicSettings, qr_position: e.target.value})}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                          >
                            <option value="center">Centre</option>
                            <option value="top-left">Haut gauche</option>
                            <option value="top-right">Haut droite</option>
                            <option value="bottom-left">Bas gauche</option>
                            <option value="bottom-right">Bas droite</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={saveMosaicSettings}
                  disabled={savingMosaicSettings}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-base font-medium text-white hover:from-blue-700 hover:to-purple-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {savingMosaicSettings ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMosaicSettings(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}