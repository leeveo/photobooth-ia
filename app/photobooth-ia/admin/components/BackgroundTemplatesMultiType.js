'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import backgroundData from '../data/backgroundTemplatesMultiType.json';

const BackgroundTemplatesMultiType = ({ 
  projectId, 
  onBackgroundsAdded, 
  onError, 
  onClose
}) => {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [savingBackground, setSavingBackground] = useState(false);
  const [activeTab, setActiveTab] = useState('packages'); // Commencer par les packages
  
  // État pour les sélections de chaque type
  const [selections, setSelections] = useState({
    packages: null,
    horizontal_image: null,
    vertical_image: null,
    horizontal_video: null,
    vertical_video: null
  });

  // État pour les fichiers uploadés
  const [uploadedFiles, setUploadedFiles] = useState({
    packages: null,
    horizontal_image: null,
    vertical_image: null,
    horizontal_video: null,
    vertical_video: null
  });

  // Configuration des onglets
  const tabs = [
    { 
      id: 'packages', 
      label: 'Packages Complets', 
      color: 'indigo',
      accept: null,
      icon: '📦',
      required: false,
      description: 'Sélectionnez un package complet avec tous les médias'
    },
    { 
      id: 'horizontal_image', 
      label: 'Images Horizontales', 
      color: 'blue',
      accept: 'image/*',
      icon: '🖼️',
      required: true
    },
    { 
      id: 'vertical_image', 
      label: 'Images Verticales', 
      color: 'green',
      accept: 'image/*',
      icon: '📱',
      required: true
    },
    { 
      id: 'horizontal_video', 
      label: 'Vidéos Horizontales', 
      color: 'purple',
      accept: 'video/*',
      icon: '🎬',
      required: false
    },
    { 
      id: 'vertical_video', 
      label: 'Vidéos Verticales', 
      color: 'orange',
      accept: 'video/*',
      icon: '📹',
      required: false
    }
  ];

  // Load templates from JSON file
  useEffect(() => {
    try {
      setLoading(true);
      
      // Extract templates from the JSON data for all types
      const allTemplates = {
        packages: backgroundData.packages || [],
        horizontal_image: backgroundData.horizontal_images || [],
        vertical_image: backgroundData.vertical_images || [],
        horizontal_video: backgroundData.horizontal_videos || [],
        vertical_video: backgroundData.vertical_videos || []
      };
      
      // Get unique categories from all templates
      const allCategories = [];
      Object.values(allTemplates).forEach(typeTemplates => {
        typeTemplates.forEach(template => {
          if (!allCategories.includes(template.category)) {
            allCategories.push(template.category);
          }
        });
      });
      
      const uniqueCategories = ['All', ...allCategories];
      setCategories(uniqueCategories);
      
      // Store all templates grouped by type
      setTemplates(allTemplates);
      console.log('Loaded multi-type templates from JSON:', allTemplates);
    } catch (error) {
      console.error('Error loading templates from JSON:', error);
      onError && onError('Erreur lors du chargement des templates');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Load existing backgrounds for this project
  useEffect(() => {
    const loadExistingBackgrounds = async () => {
      if (!projectId) return;
      
      try {
        console.log('Chargement des backgrounds existants pour le projet:', projectId);
        
        const { data: existingBackgrounds, error } = await supabase
          .from('backgrounds')
          .select('*')
          .eq('project_id', projectId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1); // Get the most recent background

        if (error) {
          console.error('Erreur lors du chargement des backgrounds existants:', error);
          return;
        }

        if (existingBackgrounds && existingBackgrounds.length > 0) {
          const background = existingBackgrounds[0];
          console.log('Background existant trouvé:', background);
          
          // Create template objects for existing backgrounds
          const existingSelections = {};
          
          if (background.image_url) {
            existingSelections.horizontal_image = {
              id: `existing-h-img-${background.id}`,
              name: 'Image Horizontale Existante',
              url: background.image_url,
              category: 'Existant'
            };
          }
          
          if (background.image_url_vertical) {
            existingSelections.vertical_image = {
              id: `existing-v-img-${background.id}`,
              name: 'Image Verticale Existante',
              url: background.image_url_vertical,
              category: 'Existant'
            };
          }
          
          if (background.video_url) {
            existingSelections.horizontal_video = {
              id: `existing-h-vid-${background.id}`,
              name: 'Vidéo Horizontale Existante',
              url: background.video_url,
              category: 'Existant'
            };
          }
          
          if (background.video_url_vertical) {
            existingSelections.vertical_video = {
              id: `existing-v-vid-${background.id}`,
              name: 'Vidéo Verticale Existante',
              url: background.video_url_vertical,
              category: 'Existant'
            };
          }
          
          setSelections(existingSelections);
          console.log('Sélections chargées depuis les backgrounds existants:', existingSelections);
        } else {
          console.log('Aucun background existant trouvé pour ce projet');
        }
      } catch (error) {
        console.error('Erreur lors du chargement des backgrounds existants:', error);
      }
    };

    loadExistingBackgrounds();
  }, [projectId, supabase]);

  // Handle file selection for upload
  const handleFileSelection = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Preview the uploaded file
    const reader = new FileReader();
    reader.onloadend = () => {
      const uploadedFile = {
        id: `upload-${type}-${Date.now()}`,
        file,
        name: file.name.replace(/\.[^/.]+$/, ""),
        previewUrl: reader.result,
        category: 'Custom',
        type: type
      };

      setUploadedFiles(prev => ({
        ...prev,
        [type]: uploadedFile
      }));
      
      // Automatically select this uploaded file
      setSelections(prev => ({
        ...prev,
        [type]: uploadedFile
      }));
    };
    reader.readAsDataURL(file);
  };

  // Filter templates based on category and active tab
  const filteredTemplates = (() => {
    const currentTabTemplates = templates[activeTab] || [];
    return currentTabTemplates.filter(template => {
      const matchesCategory = activeCategory === 'All' || template.category === activeCategory;
      return matchesCategory;
    });
  })();

  // Handle template selection
  const handleTemplateSelection = (template) => {
    if (activeTab === 'packages') {
      // Sélection d'un package complet - remplir tous les champs
      handlePackageSelection(template);
    } else {
      // Sélection normale d'un template individuel
      setSelections(prev => ({
        ...prev,
        [activeTab]: template
      }));
    }
  };

  // Handle package selection - populate all media types
  const handlePackageSelection = (packageTemplate) => {
    console.log('Package sélectionné:', packageTemplate);
    
    // Créer des objets template pour chaque type de média
    const packageSelections = {
      packages: packageTemplate,
      horizontal_image: packageTemplate.media.horizontal_image ? {
        id: `${packageTemplate.id}-h-img`,
        name: `${packageTemplate.name} - Image Horizontale`,
        url: packageTemplate.media.horizontal_image,
        category: packageTemplate.category
      } : null,
      vertical_image: packageTemplate.media.vertical_image ? {
        id: `${packageTemplate.id}-v-img`,
        name: `${packageTemplate.name} - Image Verticale`,
        url: packageTemplate.media.vertical_image,
        category: packageTemplate.category
      } : null,
      horizontal_video: packageTemplate.media.horizontal_video ? {
        id: `${packageTemplate.id}-h-vid`,
        name: `${packageTemplate.name} - Vidéo Horizontale`,
        url: packageTemplate.media.horizontal_video,
        category: packageTemplate.category
      } : null,
      vertical_video: packageTemplate.media.vertical_video ? {
        id: `${packageTemplate.id}-v-vid`,
        name: `${packageTemplate.name} - Vidéo Verticale`,
        url: packageTemplate.media.vertical_video,
        category: packageTemplate.category
      } : null
    };

    setSelections(packageSelections);
  };

  // Get color classes for tabs
  const getTabColorClasses = (tabId, isActive) => {
    const tab = tabs.find(t => t.id === tabId);
    const colors = {
      indigo: isActive ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'bg-gray-100 text-gray-800 hover:bg-indigo-50',
      blue: isActive ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-gray-100 text-gray-800 hover:bg-blue-50',
      green: isActive ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-800 hover:bg-green-50',
      purple: isActive ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-gray-100 text-gray-800 hover:bg-purple-50',
      orange: isActive ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-gray-100 text-gray-800 hover:bg-orange-50'
    };
    return colors[tab?.color] || colors.blue;
  };

  // Get button color classes for upload buttons
  const getUploadButtonClasses = (tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    const colors = {
      indigo: 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800',
      blue: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
      green: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800',
      purple: 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800',
      orange: 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
    };
    return colors[tab?.color] || colors.blue;
  };

  // Save all selections to the database
  const handleSaveAllSelections = async () => {
    console.log('Début du processus de sauvegarde multi-type');
    console.log('ID du projet:', projectId);
    console.log('Sélections:', selections);
    
    try {
      setSavingBackground(true);
      
      // TEMPORARY: Skip session check for now (same fix as media deletion)
      console.log('🧪 [SAVE BACKGROUND] Skipping session check, proceeding with save...');
      
      // Get user ID from current session (if available)
      let userId = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id || 'anonymous';
        console.log('🧪 [SAVE BACKGROUND] Session check:', { hasSession: !!session, userId });
      } catch (sessionError) {
        console.log('🧪 [SAVE BACKGROUND] Session error, using anonymous:', sessionError);
        userId = 'anonymous';
      }

      // Prepare background data object
      const backgroundData = {
        project_id: projectId,
        name: `Background Multi-Type ${new Date().toLocaleDateString()}`,
        is_active: true,
        show_animated: true, // Automatiquement activé pour que les vidéos s'affichent
        created_by: userId
      };

      // Add URLs for each type if selected
      if (selections.horizontal_image) {
        backgroundData.image_url = selections.horizontal_image.url || selections.horizontal_image.previewUrl;
      }
      
      if (selections.vertical_image) {
        backgroundData.image_url_vertical = selections.vertical_image.url || selections.vertical_image.previewUrl;
      }
      
      if (selections.horizontal_video) {
        backgroundData.video_url = selections.horizontal_video.url || selections.horizontal_video.previewUrl;
      }
      
      if (selections.vertical_video) {
        backgroundData.video_url_vertical = selections.vertical_video.url || selections.vertical_video.previewUrl;
      }

      console.log('Données à sauvegarder:', backgroundData);

      // Check if we have at least one selection
      const hasAnySelection = Object.values(selections).some(sel => sel !== null);
      if (!hasAnySelection) {
        throw new Error('Veuillez sélectionner au moins un arrière-plan');
      }

      // Check if we have at least one image (horizontal or vertical) - required for database constraint
      const hasImageHorizontal = selections.horizontal_image !== null;
      const hasImageVertical = selections.vertical_image !== null;
      
      if (!hasImageHorizontal && !hasImageVertical) {
        throw new Error('Au moins une image (horizontale ou verticale) est requise');
      }

      // If we have uploaded files, we need to upload them first
      const formData = new FormData();
      formData.append('projectId', projectId);
      formData.append('name', backgroundData.name);
      formData.append('isActive', 'true');
      formData.append('showAnimated', 'true'); // Automatiquement activé pour que les vidéos s'affichent

      let hasUploadedFiles = false;

      // Add uploaded files to FormData
      if (uploadedFiles.horizontal_image?.file) {
        formData.append('file', uploadedFiles.horizontal_image.file);
        hasUploadedFiles = true;
      }
      if (uploadedFiles.vertical_image?.file) {
        formData.append('fileVertical', uploadedFiles.vertical_image.file);
        hasUploadedFiles = true;
      }
      if (uploadedFiles.horizontal_video?.file) {
        formData.append('videoFile', uploadedFiles.horizontal_video.file);
        hasUploadedFiles = true;
      }
      if (uploadedFiles.vertical_video?.file) {
        formData.append('videoFileVertical', uploadedFiles.vertical_video.file);
        hasUploadedFiles = true;
      }

      // Add template URLs for non-uploaded selections
      if (selections.horizontal_image && !uploadedFiles.horizontal_image?.file) {
        formData.append('templateImageUrl', selections.horizontal_image.url);
      }
      if (selections.vertical_image && !uploadedFiles.vertical_image?.file) {
        formData.append('templateImageVerticalUrl', selections.vertical_image.url);
      }
      if (selections.horizontal_video && !uploadedFiles.horizontal_video?.file) {
        formData.append('templateVideoUrl', selections.horizontal_video.url);
      }
      if (selections.vertical_video && !uploadedFiles.vertical_video?.file) {
        formData.append('templateVideoVerticalUrl', selections.vertical_video.url);
      }

      // Use API endpoint for upload
      const response = await fetch('/api/admin/add-background', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur API: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Arrière-plans ajoutés avec succès:', result);

      // Get all backgrounds for this project
      const { data: allBackgrounds, error: fetchError } = await supabase
        .from('backgrounds')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (fetchError) {
        console.error('Erreur lors de la récupération:', fetchError);
        throw new Error(`Erreur lors de la récupération: ${fetchError.message}`);
      }

      console.log('✅ Tous les arrière-plans récupérés:', allBackgrounds);

      // Call the callback with the updated backgrounds
      onBackgroundsAdded(allBackgrounds || []);
      
      // Close the modal on success
      onClose();

    } catch (error) {
      console.error('Error saving backgrounds:', error);
      onError && onError('Erreur lors de l\'enregistrement des arrière-plans: ' + error.message);
    } finally {
      setSavingBackground(false);
    }
  };

  // Get current tab info
  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <div className="bg-white rounded-xl shadow-2xl p-4 max-w-6xl w-full mx-auto overflow-hidden flex flex-col" style={{ maxHeight: '95vh' }}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Sélectionner des arrière-plans multi-types
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Au moins une image (horizontale ou verticale) est requise. Les vidéos sont optionnelles.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500 transition-colors"
        >
          <span className="sr-only">Fermer</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Onglets pour chaque type */}
      <div className="mb-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-2 px-3 border-b-2 font-medium text-sm rounded-t-lg transition-colors
                  ${activeTab === tab.id
                    ? getTabColorClasses(tab.id, true) + ' border-current'
                    : getTabColorClasses(tab.id, false) + ' border-transparent'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {tab.required && (
                  <span className="ml-1 text-red-500 font-bold">*</span>
                )}
                {selections[tab.id] && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-green-500 rounded-full">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Upload Section */}
      <div className="flex justify-center mb-3">
        {/* Upload button - masqué pour les packages */}
        {activeTab !== 'packages' && (
          <label className={`cursor-pointer inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white ${getUploadButtonClasses(activeTab)} transition-colors`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Télécharger {currentTab?.label}
            <input 
              type="file" 
              className="sr-only" 
              accept={currentTab?.accept}
              onChange={(e) => handleFileSelection(e, activeTab)}
            />
          </label>
        )}
        
        {/* Message d'information pour les packages */}
        {activeTab === 'packages' && (
          <div className="text-sm text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200">
            📦 Sélectionnez un package complet ci-dessous
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="mb-4 flex-shrink-0">
        <div className="overflow-x-auto">
          <div className="flex space-x-2 pb-2 min-w-max">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-3 py-1 text-sm font-medium rounded-full whitespace-nowrap ${
                  activeCategory === category
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <span className="ml-3 text-gray-600">Chargement des arrière-plans...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
            {/* Show uploaded file for current tab - sauf pour packages */}
            {uploadedFiles[activeTab] && activeTab !== 'packages' && (
              <div 
                key={uploadedFiles[activeTab].id}
                onClick={() => handleTemplateSelection(uploadedFiles[activeTab])}
                className={`relative rounded-lg overflow-hidden shadow-md cursor-pointer transition-all transform hover:-translate-y-1 hover:shadow-lg ${
                  selections[activeTab]?.id === uploadedFiles[activeTab].id
                    ? 'ring-4 ring-indigo-500 scale-95'
                    : ''
                }`}
              >
                <div className="aspect-square relative">
                  {activeTab.includes('video') ? (
                    <video
                      src={uploadedFiles[activeTab].previewUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      controls
                      poster={uploadedFiles[activeTab].posterUrl || ''}
                    />
                  ) : (
                    <Image
                      src={uploadedFiles[activeTab].previewUrl}
                      alt={uploadedFiles[activeTab].name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
                      className="object-cover"
                    />
                  )}
                  
                  {selections[activeTab]?.id === uploadedFiles[activeTab].id && (
                    <div className="absolute inset-0 bg-indigo-500 bg-opacity-20 flex items-center justify-center">
                      <div className="bg-white rounded-full p-2 shadow-lg">
                        <svg className="h-6 w-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                  
                  <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    Nouveau
                  </span>
                </div>
                
                <div className="p-2 bg-white">
                  <h4 className="font-medium text-gray-900 truncate text-sm">{uploadedFiles[activeTab].name}</h4>
                </div>
              </div>
            )}
            
            {/* Template backgrounds */}
            {filteredTemplates.map((template) => (
              <div 
                key={template.id}
                onClick={() => handleTemplateSelection(template)}
                className={`relative rounded-lg overflow-hidden shadow-md cursor-pointer transition-all transform hover:-translate-y-1 hover:shadow-lg ${
                  selections[activeTab]?.id === template.id
                    ? 'ring-4 ring-indigo-500 scale-95'
                    : ''
                }`}
              >
                {/* Affichage spécial pour les packages */}
                {activeTab === 'packages' ? (
                  <>
                    <div className="aspect-square relative bg-gradient-to-br from-indigo-50 to-purple-50 p-2">
                      {/* Grid 2x2 pour afficher les 4 médias */}
                      <div className="grid grid-cols-2 gap-1 h-full">
                        {/* Image horizontale */}
                        <div className="relative rounded overflow-hidden bg-blue-100">
                          <Image
                            src={template.thumbnail || template.media?.horizontal_image}
                            alt="Horizontal"
                            fill
                            className="object-cover"
                          />
                          <div className="absolute bottom-0 left-0 bg-blue-500 text-white text-xs px-1 py-0.5">
                            📱 H
                          </div>
                        </div>
                        
                        {/* Image verticale */}
                        <div className="relative rounded overflow-hidden bg-green-100">
                          {template.media?.vertical_image ? (
                            <Image
                              src={template.media.vertical_image}
                              alt="Vertical"
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <span className="text-lg">📱</span>
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 bg-green-500 text-white text-xs px-1 py-0.5">
                            📱 V
                          </div>
                        </div>
                        
                        {/* Vidéo horizontale */}
                        <div className="relative rounded overflow-hidden bg-purple-100">
                          {template.media?.horizontal_video ? (
                            <video
                              src={template.media.horizontal_video}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <span className="text-lg">🎬</span>
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 bg-purple-500 text-white text-xs px-1 py-0.5">
                            🎬 H
                          </div>
                        </div>
                        
                        {/* Vidéo verticale */}
                        <div className="relative rounded overflow-hidden bg-orange-100">
                          {template.media?.vertical_video ? (
                            <video
                              src={template.media.vertical_video}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <span className="text-lg">📹</span>
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 bg-orange-500 text-white text-xs px-1 py-0.5">
                            📹 V
                          </div>
                        </div>
                      </div>
                      
                      {/* Badge Package */}
                      <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                        📦 PACKAGE
                      </div>
                    </div>
                  </>
                ) : (
                  /* Affichage normal pour les autres types */
                  <div className="aspect-square relative">
                    {activeTab.includes('video') ? (
                      <video
                        src={template.url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        controls
                        poster={template.posterUrl || ''}
                      />
                    ) : (
                      <Image
                        src={template.url}
                        alt={template.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
                        className="object-cover"
                      />
                    )}
                    
                    {template.category && (
                      <span className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                        {template.category}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Indicateur de sélection */}
                {selections[activeTab]?.id === template.id && (
                  <div className="absolute inset-0 bg-indigo-500 bg-opacity-20 flex items-center justify-center">
                    <div className="bg-white rounded-full p-2 shadow-lg">
                      <svg className="h-6 w-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
                
                <div className="p-2 bg-white">
                  <h4 className="font-medium text-gray-900 truncate text-sm">{template.name}</h4>
                  {activeTab === 'packages' && (
                    <p className="text-xs text-gray-500 truncate">{template.description}</p>
                  )}
                </div>
              </div>
            ))}
            
            {filteredTemplates.length === 0 && !uploadedFiles[activeTab] && (
              <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-4 text-gray-500">
                  Aucun arrière-plan trouvé dans cette catégorie.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Selections summary and buttons */}
      <div className="mt-4 border-t border-gray-200 pt-4">
        
        {/* Message spécial pour les packages */}
        {selections.packages && (
          <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="text-indigo-600 text-lg mr-2">📦</span>
              <h4 className="text-sm font-medium text-indigo-800">Package sélectionné</h4>
            </div>
            <p className="text-sm text-indigo-700 mb-3">
              <strong>{selections.packages.name}</strong> - {selections.packages.description}
            </p>
            <div className="text-xs text-indigo-600">
              Ce package a automatiquement rempli tous les types de médias disponibles. 
              Vous pouvez maintenant créer l'arrière-plan ou modifier individuellement chaque type.
            </div>
          </div>
        )}
        
        {/* Resume des selections */}
        <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Résumé des sélections</h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {tabs.filter(tab => tab.id !== 'packages').map((tab) => (
              <div key={tab.id} className="text-center">
                <div className={`text-xs font-medium mb-1 ${selections[tab.id] ? 'text-green-600' : 'text-gray-400'}`}>
                  {tab.icon} {tab.label}
                </div>
                {selections[tab.id] ? (
                  <div className="w-16 h-16 mx-auto relative rounded overflow-hidden border-2 border-green-500">
                    {tab.id.includes('video') ? (
                      <video
                        src={selections[tab.id].previewUrl || selections[tab.id].url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        poster={selections[tab.id].posterUrl || ''}
                      />
                    ) : (
                      <Image 
                        src={selections[tab.id].previewUrl || selections[tab.id].url} 
                        alt={selections[tab.id].name} 
                        fill 
                        className="object-cover" 
                      />
                    )}
                  </div>
                ) : (
                  <div className="w-16 h-16 mx-auto bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-gray-400 text-xs">Aucun</span>
                  </div>
                )}
                <div className="text-xs text-gray-600 mt-1 truncate max-w-full">
                  {selections[tab.id]?.name || 'Non sélectionné'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSaveAllSelections}
            disabled={
              !Object.values(selections).some(sel => sel !== null) || 
              (!selections.horizontal_image && !selections.vertical_image) ||
              savingBackground
            }
            className={`px-6 py-2 rounded-md shadow-sm text-sm font-medium text-white ${
              !Object.values(selections).some(sel => sel !== null) || (!selections.horizontal_image && !selections.vertical_image)
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
            title={
              !selections.horizontal_image && !selections.vertical_image
                ? 'Au moins une image (horizontale ou verticale) est requise'
                : ''
            }
          >
            {savingBackground ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enregistrement...
              </>
            ) : (
              'Ajouter tous les arrière-plans sélectionnés'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BackgroundTemplatesMultiType;
