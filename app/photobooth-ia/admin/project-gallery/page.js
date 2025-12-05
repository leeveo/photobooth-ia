'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Loader from '../../../components/ui/Loader';
import { 
  RiFilterLine, 
  RiDownloadLine, 
  RiCloseFill, 
  RiArrowLeftLine, 
  RiImageLine, 
  RiSettings3Line,
  RiDeleteBin6Line // Ajout de l'icône de suppression
} from 'react-icons/ri';

export default function ProjectGallery() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectImages, setProjectImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [projectsWithPhotoCount, setProjectsWithPhotoCount] = useState({});
  const [moderationConfirm, setModerationConfirm] = useState(null);
  const [showMosaicSettings, setShowMosaicSettings] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState(null);
  const [selectedRowProject, setSelectedRowProject] = useState(null);
  const [rowProjectImages, setRowProjectImages] = useState([]);
  const [loadingRowImages, setLoadingRowImages] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const IMAGES_PER_PAGE = 20;
  const [mosaicSettings, setMosaicSettings] = useState({
    bg_color: '#000000',
    bg_image_url: '',
    title: '',
    description: '',
    is_public: false,
    enable_swipe: false,
    show_qr_code: false,
    qr_title: 'Scannez-moi',
    qr_description: 'Retrouvez toutes les photos ici',
    qr_position: 'center'
  });
  const [bgImageFile, setBgImageFile] = useState(null);
  const [bgImagePreview, setBgImagePreview] = useState(null);
  const [savingMosaicSettings, setSavingMosaicSettings] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // Ajout de l'état pour la confirmation de suppression
  const [failedImages, setFailedImages] = useState(new Set()); // Add this new state
  
  const supabase = createClientComponentClient();
  const router = useRouter();
  
  // Mettre à jour loadMosaicSettings pour inclure la recherche dans temp_storage (VERSION OPTIMISÉE)
  const loadMosaicSettings = useCallback(async (projectId) => {
    if (!projectId) return;
    
    try {
      // Essayer d'abord avec l'API service role (plus rapide)
      try {
        const response = await fetch(`/api/get-mosaic-settings?projectId=${projectId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const data = result.data;
          
          setMosaicSettings({
            bg_color: data.bg_color || '#000000',
            bg_image_url: data.bg_image_url || '',
            title: data.title || '',
            description: data.description || '',
            is_public: data.is_public || false,
            enable_swipe: data.enable_swipe || false,
            show_qr_code: data.show_qr_code || false,
            qr_title: data.qr_title || 'Scannez-moi',
            qr_description: data.qr_description || 'Retrouvez toutes les photos ici',
            qr_position: data.qr_position || 'center'
          });
          
          if (data.bg_image_url) {
            setBgImagePreview(data.bg_image_url);
          }
          return;
        }
      } catch (apiError) {
        // API fallback silencieux
      }
      
      // Fallback: essayer de charger depuis mosaic_settings directement
      const { data, error } = await supabase
        .from('mosaic_settings')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      
      if (data) {
        setMosaicSettings({
          bg_color: data.bg_color || '#000000',
          bg_image_url: data.bg_image_url || '',
          title: data.title || '',
          description: data.description || '',
          is_public: data.is_public || false,
          enable_swipe: data.enable_swipe || false,
          show_qr_code: data.show_qr_code || false,
          qr_title: data.qr_title || 'Scannez-moi',
          qr_description: data.qr_description || 'Retrouvez toutes les photos ici',
          qr_position: data.qr_position || 'center'
        });
        
        if (data.bg_image_url) {
          setBgImagePreview(data.bg_image_url);
        }
        return;
      }
      
      if (error) {
        // Essayer avec temp_storage si erreur
        const { data: tempData } = await supabase
          .from('temp_storage')
          .select('value')
          .eq('key', `mosaic_settings_${projectId}`)
          .maybeSingle();
          
        if (tempData?.value) {
          try {
            const parsedSettings = JSON.parse(tempData.value);
            setMosaicSettings({
              bg_color: parsedSettings.bg_color || '#000000',
              bg_image_url: parsedSettings.bg_image_url || '',
              title: parsedSettings.title || '',
              description: parsedSettings.description || '',
              is_public: parsedSettings.is_public || false,
              enable_swipe: parsedSettings.enable_swipe || false,
              show_qr_code: parsedSettings.show_qr_code || false,
              qr_title: parsedSettings.qr_title || 'Scannez-moi',
              qr_description: parsedSettings.qr_description || 'Retrouvez toutes les photos ici',
              qr_position: parsedSettings.qr_position || 'center'
            });
            return;
          } catch (parseError) {
            // Parsing error, use defaults
          }
        }
      }
      
      // Valeurs par défaut
      resetMosaicSettings();
    } catch (err) {
      resetMosaicSettings();
    }
  }, [supabase]);
  
  // Ajouter une fonction pour réinitialiser les paramètres
  const resetMosaicSettings = () => {
    setMosaicSettings({
      bg_color: '#000000',
      bg_image_url: '',
      title: '',
      description: '',
      is_public: false,
      enable_swipe: false,
      show_qr_code: false,
      qr_title: 'Scannez-moi',
      qr_description: 'Retrouvez toutes les photos ici',
      qr_position: 'center'
    });
    setBgImagePreview(null);
  };
  
  // Récupérer l'ID de l'admin connecté
  useEffect(() => {
    const getAdminSession = () => {
      try {
        // Récupérer la session depuis localStorage ou sessionStorage
        const sessionStr = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
        
        if (!sessionStr) {
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
          router.push('/photobooth-ia/admin/login');
          return null;
        }

        setCurrentAdminId(sessionData.user_id);
        return sessionData.user_id;
      } catch (err) {
        router.push('/photobooth-ia/admin/login');
        return null;
      }
    };
    
    getAdminSession();
  }, [router]);
  
  // Charger la liste des projets créés par l'admin connecté (VERSION ULTRA-OPTIMISÉE)
  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
      try {
        // 1. Récupérer les projets créés par l'admin connecté
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, name, slug, primary_color, secondary_color, logo_url')
          .eq('created_by', currentAdminId);

        if (projectsError) {
          setError('Erreur récupération des projets');
          setLoading(false);
          return;
        }

        setProjects(projectsData || []);

        // 2. ULTRA-OPTIMISATION: Utiliser notre nouvelle API pour compter toutes les images
        if (projectsData && projectsData.length > 0) {
          const projectIds = projectsData.map(p => p.id);
          
          try {
            const response = await fetch(`/api/get-projects-images-count?projectIds=${projectIds.join(',')}`);
            const result = await response.json();
            
            if (result.success) {
              setProjectsWithPhotoCount(result.data);
            } else {
              // Fallback en cas d'erreur API
              const photoCounts = {};
              projectIds.forEach(id => photoCounts[id] = 0);
              setProjectsWithPhotoCount(photoCounts);
            }
          } catch (apiError) {
            // Fallback local en cas d'erreur API
            const photoCounts = {};
            projectIds.forEach(id => photoCounts[id] = 0);
            setProjectsWithPhotoCount(photoCounts);
          }
        }
      } catch (err) {
        setError('Impossible de charger les projets');
      } finally {
        setLoading(false);
      }
    }

    if (currentAdminId) loadProjects();
  }, [supabase, currentAdminId]);
  
  // Charger les images du projet sélectionné depuis sessions (VERSION OPTIMISÉE)
  useEffect(() => {
    if (!selectedProject) {
      setProjectImages([]);
      return;
    }

    async function loadSessionImages(page = 1) {
      setLoadingImages(true);
      try {
        if (!selectedProject) {
          setProjectImages([]);
          setLoadingImages(false);
          return;
        }

        const projectIdToQuery = String(selectedProject).trim();
        
        // OPTIMISATION: Une seule requête avec comptage et données
        const from = (page - 1) * IMAGES_PER_PAGE;
        const to = page * IMAGES_PER_PAGE - 1;
        
        const { data: sessionsData, error: sessionsError, count } = await supabase
          .from('sessions')
          .select('*', { count: 'exact' })
          .eq('project_id', projectIdToQuery)
          .not('result_s3_url', 'is', null)
          .not('result_image_url', 'is', null)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (sessionsError) {
          setProjectImages([]);
        } else {
          // Calculer le nombre total de pages
          setTotalPages(Math.ceil((count || 0) / IMAGES_PER_PAGE));
          
          // Transformer les données
          const images = (sessionsData || [])
            .filter(session => {
              const url = session.result_s3_url || session.result_image_url;
              return url && url.trim() !== '' && url !== 'null' && url !== 'undefined';
            })
            .map(session => ({
              id: session.id,
              image_url: session.result_s3_url || session.result_image_url,
              created_at: session.created_at,
              metadata: {
                fileName: session.result_s3_url ? session.result_s3_url.split('/').pop() : '',
                size: null
              },
              isModerated: session.moderation === 'M'
            }));
          setProjectImages(images);
        }
        
        // Charger les paramètres mosaïque seulement pour la première page
        if (page === 1) {
          loadMosaicSettings(selectedProject);
        }
      } catch (err) {
        setError('Impossible de charger les images du projet');
      } finally {
        setLoadingImages(false);
      }
    }

    loadSessionImages(currentPage);
  }, [selectedProject, loadMosaicSettings, supabase, currentPage]);
  
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
    
    try {
      // First update the database
      const { data, error } = await supabase
        .from('photos')
        .update({ is_moderated: true })
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      
      // Then update UI
      setProjectImages(projectImages.map(img => 
        img.id === id 
          ? {...img, is_moderated: true} 
          : img
      ));
      
      setSuccess("Image modérée avec succès");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
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

  // Remplacer la fonction saveMosaicSettings pour utiliser directement Supabase
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
          // Générer un nom de fichier unique
          const fileExt = bgImageFile.name.split('.').pop();
          const fileName = `mosaic-bg-${Date.now()}.${fileExt}`;
          const s3Path = `photobooth_uploads/${selectedProject}/backgrounds/${fileName}`;
          
          // Créer FormData pour l'upload vers AWS S3 via l'API
          const formData = new FormData();
          formData.append('file', bgImageFile);
          formData.append('bucket', 'leeveostockage');
          formData.append('path', s3Path);
          
          // Upload du fichier vers AWS S3 via l'API existante
          const uploadResponse = await fetch('/api/upload-s3', {
            method: 'POST',
            body: formData
          });
          
          if (!uploadResponse.ok) {
            throw new Error(`S3 upload failed: ${uploadResponse.statusText}`);
          }
          
          const uploadResult = await uploadResponse.json();
          bgImageUrl = uploadResult.url;
          
        } catch (uploadErr) {
          setError(`Erreur lors du téléchargement de l'image: ${uploadErr.message}`);
          setSavingMosaicSettings(false);
          return;
        }
      }
      
      // Préparer les données pour Supabase
      const mosaicData = {
        bg_color: mosaicSettings.bg_color || '#000000',
        bg_image_url: bgImageUrl || null,
        title: mosaicSettings.title || '',
        description: mosaicSettings.description || '',
        show_qr_code: mosaicSettings.show_qr_code === true,
        qr_title: mosaicSettings.qr_title || 'Scannez-moi',
        qr_description: mosaicSettings.qr_description?.substring(0, 255) || 'Retrouvez toutes les photos ici',
        qr_position: mosaicSettings.qr_position || 'center',
        is_public: mosaicSettings.is_public === true,
        enable_swipe: mosaicSettings.enable_swipe === true,
        updated_at: new Date().toISOString()
      };
      
      // Utiliser l'API pour sauvegarder avec les permissions service role
      const response = await fetch('/api/save-mosaic-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mosaicData,
          projectId: selectedProject
        })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors de la sauvegarde');
      }
      
      setSuccess('Paramètres de mosaïque enregistrés avec succès');
      
      setShowMosaicSettings(false);
      
      // Actualiser les paramètres
      await loadMosaicSettings(selectedProject);

    } catch (err) {
      setError(`Erreur lors de l'enregistrement des paramètres: ${err.message}`);
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
      setError(`Erreur lors de la suppression: ${error.message}`);
    }
  };

  // Fonction pour la suppression d'image
  const deleteImage = async (id, url) => {
    // Afficher la boîte de dialogue de confirmation
    setDeleteConfirm({ id, url });
  };
  
  // Fonction pour gérer la suppression après confirmation (VERSION OPTIMISÉE)
  const handleConfirmedDeletion = async () => {
    if (!deleteConfirm) return;
    
    const { id, url } = deleteConfirm;
    
    try {
      // Appeler notre nouvelle API pour marquer l'image comme modérée
      const response = await fetch('/api/moderate-img', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: id }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la modération');
      }
      
      // Mettre à jour l'interface localement (plus rapide)
      setProjectImages(prevImages => prevImages.map(img => 
        img.id === id 
          ? {...img, isModerated: true} 
          : img
      ));
      
      setSuccess("Image marquée comme modérée avec succès");
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      setError(`Erreur lors de la modération: ${err.message}`);
    } finally {
      setDeleteConfirm(null);
    }
  };
  
  // Annuler la suppression
  const cancelDeletion = () => {
    setDeleteConfirm(null);
  };

  // Fonction pour la démodération d'image (VERSION OPTIMISÉE)
  const unmoderateImage = async (id, url) => {
    try {
      // Appeler notre API pour démodérer l'image
      const response = await fetch('/api/unmoderate-img', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: id }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la démodération');
      }
      
      // Mettre à jour l'interface localement (plus rapide)
      setProjectImages(prevImages => prevImages.map(img => 
        img.id === id 
          ? {...img, isModerated: false} 
          : img
      ));
      
      setSuccess("Image démodérée avec succès");
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      setError(`Erreur lors de la démodération: ${err.message}`);
    }
  };

  // Fonction pour charger les 10 dernières images d'un projet pour la ligne sélectionnée
  const loadRowProjectImages = useCallback(async (projectId) => {
    if (!projectId) return;
    
    setLoadingRowImages(true);
    try {
      const projectIdToQuery = String(projectId).trim();
      
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('project_id', projectIdToQuery)
        .not('result_s3_url', 'is', null)
        .not('result_image_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (sessionsError) {
        setRowProjectImages([]);
      } else {
        const images = (sessionsData || [])
          .filter(session => {
            const url = session.result_s3_url || session.result_image_url;
            return url && url.trim() !== '' && url !== 'null' && url !== 'undefined';
          })
          .map(session => ({
            id: session.id,
            image_url: session.result_s3_url || session.result_image_url,
            created_at: session.created_at,
            isModerated: session.moderation === 'M'
          }));
        setRowProjectImages(images);
      }
    } catch (err) {
      setRowProjectImages([]);
    } finally {
      setLoadingRowImages(false);
    }
  }, [supabase]);

  // Fonction pour gérer la sélection/désélection d'une ligne de projet
  const handleRowProjectSelect = useCallback((projectId) => {
    if (selectedRowProject === projectId) {
      // Désélectionner si déjà sélectionné
      setSelectedRowProject(null);
      setRowProjectImages([]);
    } else {
      // Sélectionner et charger les images
      setSelectedRowProject(projectId);
      loadRowProjectImages(projectId);
    }
  }, [selectedRowProject, loadRowProjectImages]);

  // Add helper function to handle image errors
  const handleImageError = useCallback((imageId) => {
    setFailedImages(prev => new Set([...prev, imageId]));
  }, []);

  // Add helper function to validate image URL
  const isValidImageUrl = useCallback((url) => {
    if (!url || typeof url !== 'string') return false;
    const trimmedUrl = url.trim();
    return trimmedUrl !== '' && trimmedUrl !== 'null' && trimmedUrl !== 'undefined' && 
           (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('/'));
  }, []);

  return (
    <div className="space-y-6">
      {/* Loader global - affiche tant que loading est true */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader size="large" message="Chargement des projets..." variant="premium" />
          <div className="mt-4 text-sm text-gray-500 max-w-md text-center">
            📊 Récupération des projets et comptage des images en cours...
          </div>
        </div>
      ) : (
        <>
           <div className="p-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-xl shadow-lg text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Galerie des Photobooths</h1>
            <p className="text-white text-opacity-80 text-sm">Gérez vos Photobooths, consultez les photos des utilisateurs et diffusez-les sur grands écrans.</p>
          </div>
          <Link
            href="/photobooth-ia/admin/print-monitor"
            className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RiSettings3Line className="w-5 h-5" />
            Monitoring Impression
          </Link>
        </div>
      </div>

          
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
              {/* Tableau des projets avec boutons par ligne */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2 text-indigo-700">Liste des projets</h3>
                <div className="overflow-x-auto w-full">
                  <table className="min-w-full divide-y divide-gray-200 border rounded-lg text-xs sm:text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-500 uppercase"></th>
                        <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-500 uppercase">Nom</th>
                        <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-500 uppercase">Nb photos</th>
                        <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {projects.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-3 text-center text-gray-400">Aucun projet trouvé</td>
                        </tr>
                      )}
                      {projects.map((project, idx) => (
                        <React.Fragment key={project.id}>
                          <tr
                            key={project.id}
                            onClick={() => handleRowProjectSelect(project.id)}
                            className={
                              (idx % 2 === 0 ? "bg-white" : "bg-gray-50") +
                              (selectedProject === project.id ? " bg-indigo-50" : "") +
                              (selectedRowProject === project.id ? " bg-blue-100 border-l-4 border-blue-500" : "") +
                              " cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                            }
                          >
                            {/* Logo du projet */}
                            <td className="px-2 sm:px-4 py-2">
                              {project.logo_url ? (
                                <img
                                  src={project.logo_url}
                                  alt="Logo"
                                  className="w-8 h-8 rounded-full object-cover border"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <RiImageLine className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </td>
                            <td className="px-2 sm:px-4 py-2 font-medium">{project.name}</td>
                            <td className="px-2 sm:px-4 py-2">
                              <span className="font-semibold text-indigo-600">
                                {projectsWithPhotoCount[project.id] !== undefined ? projectsWithPhotoCount[project.id] : '...'}
                              </span>
                            </td>
                            <td className="px-2 sm:px-4 py-2 flex flex-col sm:flex-row gap-2">
                              <Link
                                href={`/photobooth-ia/admin/project-mosaic?projectId=${project.id}&fullscreen=true`}
                                className="inline-flex items-center px-2 sm:px-3 py-1 border text-xs font-medium rounded-lg shadow-sm text-white bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-transparent"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Voir la mosaïque de photos en plein écran"
                              >
                                <RiImageLine className="h-4 w-4 mr-1" />
                                <span className="hidden xs:inline">Voir mosaïque</span>
                                <span className="inline xs:hidden">Mosaïque</span>
                              </Link>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (selectedProject !== project.id) setSelectedProject(project.id);
                                  setTimeout(() => setShowMosaicSettings(true), 0);
                                }}
                                className="inline-flex items-center px-2 sm:px-3 py-1 border text-xs font-medium rounded-lg shadow-sm text-white bg-gradient-to-br from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 border-transparent"
                                title="Personnaliser l'apparence de la mosaïque"
                              >
                                <RiSettings3Line className="h-4 w-4 mr-1" />
                                <span className="hidden xs:inline">Personnaliser</span>
                                <span className="inline xs:hidden">Paramètres</span>
                              </button>
                            </td>
                          </tr>
                          {/* Ligne d'affichage des images avec effet slide */}
                          {selectedRowProject === project.id && (
                            <tr key={`images-${project.id}`}>
                              <td colSpan={4} className="px-4 py-0">
                                <div className="overflow-hidden">
                                  <div className="animate-slideDown bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-lg my-2">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="text-sm font-semibold text-gray-700 flex items-center">
                                        <RiImageLine className="w-4 h-4 mr-2 text-blue-500" />
                                        10 dernières photos du projet "{project.name}"
                                      </h4>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedRowProject(null);
                                          setRowProjectImages([]);
                                        }}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                      >
                                        <RiCloseFill className="w-5 h-5" />
                                      </button>
                                    </div>
                                    
                                    {loadingRowImages ? (
                                      <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                        <div className="relative">
                                          {/* Cercle extérieur qui tourne */}
                                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
                                          {/* Cercle intérieur avec gradient qui tourne dans l'autre sens */}
                                          <div className="absolute top-0 left-0 animate-spin-reverse rounded-full h-12 w-12 border-4 border-transparent border-t-blue-500 border-r-blue-500"></div>
                                          {/* Icône centrale */}
                                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                            <RiImageLine className="w-5 h-5 text-blue-500 animate-pulse" />
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <p className="text-sm font-medium text-gray-700 animate-pulse">
                                            Chargement des images...
                                          </p>
                                          <p className="text-xs text-gray-500 mt-1">
                                            Récupération des 10 dernières photos
                                          </p>
                                        </div>
                                        {/* Barre de progression simulée */}
                                        <div className="w-48 bg-gray-200 rounded-full h-1.5">
                                          <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full animate-progress"></div>
                                        </div>
                                      </div>
                                    ) : rowProjectImages.length > 0 ? (
                                      <div className="flex gap-2">
                                        {rowProjectImages.map((image, imgIdx) => (
                                          <div 
                                            key={image.id} 
                                            className="relative group animate-fadeIn flex-1"
                                            style={{ animationDelay: `${imgIdx * 50}ms` }}
                                          >
                                            <div className="w-full aspect-square relative overflow-hidden rounded-lg shadow-md bg-gray-100 border-2 border-transparent group-hover:border-blue-300 transition-all duration-200">
                                              <Image
                                                src={image.image_url}
                                                alt={`Photo ${imgIdx + 1}`}
                                                fill
                                                className="object-cover transition-transform duration-200 group-hover:scale-110"
                                                sizes="(max-width: 768px) 10vw, (max-width: 1200px) 8vw, 6vw"
                                              />
                                              {image.isModerated && (
                                                <div className="absolute inset-0 bg-red-500 bg-opacity-70 flex items-center justify-center">
                                                  <span className="text-white text-xs font-bold">M</span>
                                                </div>
                                              )}
                                            </div>
                                            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                              {new Date(image.created_at).toLocaleDateString('fr-FR', { 
                                                day: '2-digit', 
                                                month: '2-digit' 
                                              })}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-8 text-gray-500">
                                        <RiImageLine className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                        <p className="text-sm">Aucune image trouvée pour ce projet</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Information sur le nouveau système de sélection */}
              {!selectedRowProject && projects.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    💡 <strong>Astuce :</strong> Cliquez sur une ligne de projet pour voir ses 10 dernières photos s'afficher avec un effet de slide.
                  </p>
                </div>
              )}
              {/* Affiche le nom du projet courant */}
              {selectedProject && (
                <div className="mb-2 text-lg font-semibold text-indigo-700">
                  {projects.find(p => p.id == selectedProject)?.name || 'Projet'}
                </div>
              )}
              {/* Les boutons restent accessibles */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  href={selectedProject ? `/photobooth-ia/admin/project-mosaic?projectId=${selectedProject}&fullscreen=true` : '#'}
                  className={`inline-flex items-center px-4 py-2 h-12 border text-sm font-medium rounded-lg shadow-sm ${
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
                  className={`inline-flex items-center px-4 py-2 h-12 border text-sm font-medium rounded-lg shadow-sm ${
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
            
            {loading && selectedProject ? (
              <div className="p-12 flex flex-col items-center justify-center">
                <Loader size="medium" message="Chargement des images en cours..." variant="premium" />
              </div>
            ) : null}
            
            {!loading && selectedProject && projectImages.length === 0 ? (
              <div className="text-center py-16 px-6">
                <RiImageLine className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-4 text-lg font-medium text-gray-900">Aucune image trouvée</p>
                <p className="mt-2 text-gray-500">Ce projet n'a pas encore d'images générées</p>
              </div>
            ) : null}
            
            {!loading && selectedProject && projectImages.length > 0 && !selectedRowProject && (
              <div className="p-6">
                <div className="mb-4 text-sm flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="text-gray-600 flex items-center">
                    <RiFilterLine className="mr-2 h-5 w-5 text-gray-400" />
                    <span className="font-semibold text-gray-700">{projectImages.length}</span> image(s) trouvée(s) dans le dossier de stockage du projet
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
                        image.isModerated ? 'opacity-50 grayscale' : ''
                      }`}
                    >
                      <div className="aspect-w-2 aspect-h-3 bg-gray-100 relative" style={{ height: '200px' }}>
                        {failedImages.has(image.id) || !isValidImageUrl(image.image_url) ? (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-sm">
                            Image non disponible
                          </div>
                        ) : (
                          <Image
                            src={image.image_url}
                            alt={`Photo ${index}`}
                            fill
                            style={{ objectFit: "cover" }}
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="rounded-t-md"
                            onError={() => handleImageError(image.id)}
                            loading="lazy"
                            placeholder="blur"
                            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                          />
                        )}
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
                          
                          {image.isModerated ? (
                            // Bouton de démodération pour les images modérées
                            <button
                              onClick={() => unmoderateImage(image.id, image.image_url)}
                              className="p-2 bg-gradient-to-br from-green-500 to-teal-600 text-white rounded-full hover:from-green-600 hover:to-teal-700"
                              title="Démodérer cette image"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                              </svg>
                            </button>
                          ) : (
                            // Bouton de modération pour les images non modérées
                            <button
                              onClick={() => deleteImage(image.id, image.image_url)}
                              className="p-2 bg-gradient-to-br from-red-500 to-orange-600 text-white rounded-full hover:from-red-600 hover:to-orange-700"
                              title="Modérer cette image"
                            >
                              <RiDeleteBin6Line className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center mt-6 space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1 || loadingImages}
                      className="px-3 py-2 rounded-md bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Précédent
                    </button>
                    
                    <span className="px-3 py-2 text-sm text-gray-700">
                      Page {currentPage} sur {totalPages}
                    </span>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || loadingImages}
                      className="px-3 py-2 rounded-md bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Suivant
                    </button>
                  </div>
                )}
                
                {loadingImages && (
                  <div className="flex justify-center mt-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                  </div>
                )}
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
                        {/* Galerie publique */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <input
                              type="checkbox"
                              id="is_public"
                              checked={mosaicSettings.is_public || false}
                              onChange={(e) => setMosaicSettings({...mosaicSettings, is_public: e.target.checked})}
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                            />
                            <label htmlFor="is_public" className="ml-2 block text-sm font-medium text-gray-700">
                              🌐 Galerie publique
                            </label>
                          </div>
                          <p className="text-xs text-gray-600 ml-6">
                            Si activé, un lien vers la galerie complète sera affiché sur la page de récupération des photos.
                            Les utilisateurs pourront voir toutes les photos de l'événement.
                          </p>

                        </div>
                        
                        {/* Swipe/Like système */}
                        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <input
                              type="checkbox"
                              id="enable_swipe"
                              checked={mosaicSettings.enable_swipe || false}
                              onChange={(e) => setMosaicSettings({...mosaicSettings, enable_swipe: e.target.checked})}
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                            />
                            <label htmlFor="enable_swipe" className="ml-2 block text-sm font-medium text-gray-700">
                              ❤️ Système de Swipe (Like/Dislike)
                            </label>
                          </div>
                          <p className="text-xs text-gray-600 ml-6">
                            Si activé, un lien vers le système de swipe sera affiché sur la page de récupération des photos.
                            Les utilisateurs pourront liker ou disliker les photos de l'événement façon Tinder.
                          </p>

                        </div>
                        
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

          {/* Delete confirmation modal */}
          {deleteConfirm && (
            <div className="fixed z-40 inset-0 overflow-y-auto">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
                
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <RiDeleteBin6Line className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                          Confirmer la modération
                        </h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">
                            Êtes-vous sûr de vouloir modérer cette image ? Elle sera grisée et apparaîtra comme modérée dans la galerie.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button 
                      type="button" 
                      onClick={handleConfirmedDeletion}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Modérer
                    </button>
                    <button 
                      type="button" 
                      onClick={cancelDeletion}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}