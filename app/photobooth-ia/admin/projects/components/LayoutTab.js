'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import LayoutTemplateSelector from './LayoutTemplateSelector';

const LayoutTab = ({ 
  projectId, 
  savedLayouts = [], 
  loadLayout, 
  saveLayout,
  setLayoutName,
  layoutName,
  elements,
  stageSize,
  setSavedLayouts
}) => {
  const [selectedLayoutId, setSelectedLayoutId] = useState(null);
  const [showPresetLayouts, setShowPresetLayouts] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [layoutToDelete, setLayoutToDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const supabase = createClientComponentClient();
  
  // États pour les popups
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loadedLayoutName, setLoadedLayoutName] = useState('');
  // Nouvel état pour le message d'information
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  // État pour suivre si un layout vient d'être chargé
  const [justLoaded, setJustLoaded] = useState(false);
  // État pour l'animation du layout sélectionné
  const [highlightedLayoutId, setHighlightedLayoutId] = useState(null);

  // Préréglages de layouts
  const presetLayouts = [
    {
      id: 'single-image',
      name: 'Image centrée',
      description: 'Une seule image au centre',
      elements: [
        {
          id: `image-${Date.now()}-1`,
          type: 'rect',
          x: stageSize.width / 2 - 150,
          y: stageSize.height / 2 - 100,
          width: 300,
          height: 200,
          fill: '#f0f0f0',
          name: 'Zone image',
          rotation: 0
        }
      ]
    },
    {
      id: 'split-vertical',
      name: 'Division verticale',
      description: 'Deux images côte à côte',
      elements: [
        {
          id: `image-${Date.now()}-1`,
          type: 'rect',
          x: stageSize.width / 4 - 100,
          y: stageSize.height / 2 - 100,
          width: 200,
          height: 200,
          fill: '#e5e7eb',
          name: 'Zone gauche',
          rotation: 0
        },
        {
          id: `image-${Date.now()}-2`,
          type: 'rect',
          x: (stageSize.width * 3) / 4 - 100,
          y: stageSize.height / 2 - 100,
          width: 200,
          height: 200,
          fill: '#f3f4f6',
          name: 'Zone droite',
          rotation: 0
        }
      ]
    },
    {
      id: 'grid-4',
      name: 'Grille 2x2',
      description: 'Quatre images en grille',
      elements: [
        {
          id: `image-${Date.now()}-1`,
          type: 'rect',
          x: stageSize.width / 4 - 75,
          y: stageSize.height / 4 - 75,
          width: 150,
          height: 150,
          fill: '#e5e7eb',
          name: 'Zone 1',
          rotation: 0
        },
        {
          id: `image-${Date.now()}-2`,
          type: 'rect',
          x: (stageSize.width * 3) / 4 - 75,
          y: stageSize.height / 4 - 75,
          width: 150,
          height: 150,
          fill: '#f3f4f6',
          name: 'Zone 2',
          rotation: 0
        },
        {
          id: `image-${Date.now()}-3`,
          type: 'rect',
          x: stageSize.width / 4 - 75,
          y: (stageSize.height * 3) / 4 - 75,
          width: 150,
          height: 150,
          fill: '#f3f4f6',
          name: 'Zone 3',
          rotation: 0
        },
        {
          id: `image-${Date.now()}-4`,
          type: 'rect',
          x: (stageSize.width * 3) / 4 - 75,
          y: (stageSize.height * 3) / 4 - 75,
          width: 150,
          height: 150,
          fill: '#e5e7eb',
          name: 'Zone 4',
          rotation: 0
        }
      ]
    },
    {
      id: 'polaroid',
      name: 'Style Polaroid',
      description: 'Une image avec espace pour texte en bas',
      elements: [
        {
          id: `rect-${Date.now()}-1`,
          type: 'rect',
          x: stageSize.width / 2 - 150,
          y: stageSize.height / 2 - 175,
          width: 300,
          height: 350,
          fill: '#ffffff',
          stroke: '#e5e5e5',
          strokeWidth: 2,
          name: 'Cadre Polaroid',
          rotation: 0
        },
        {
          id: `rect-${Date.now()}-2`,
          type: 'rect',
          x: stageSize.width / 2 - 125,
          y: stageSize.height / 2 - 150,
          width: 250,
          height: 250,
          fill: '#f3f4f6',
          name: 'Zone image',
          rotation: 0
        },
        {
          id: `text-${Date.now()}-1`,
          type: 'text',
          x: stageSize.width / 2 - 125,
          y: stageSize.height / 2 + 120,
          text: 'Votre texte ici',
          fontSize: 16,
          fontFamily: 'Arial',
          fill: '#000000',
          width: 250,
          align: 'center',
          name: 'Texte Polaroid',
          rotation: 0
        }
      ]
    }
  ];

  // Appliquer un préréglage de layout
  const applyPresetLayout = (layoutId) => {
    const preset = presetLayouts.find(layout => layout.id === layoutId);
    if (preset) {
      // Utiliser les éléments de ce préréglage
      const elementsWithNewIds = preset.elements.map(el => ({
        ...el,
        id: `${el.type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      }));
      loadLayout(null, elementsWithNewIds);
      setShowPresetLayouts(false);
    }
  };

  // Nouvelle fonction pour sauvegarder le layout en utilisant la route API
  const handleSaveLayout = async () => {
    if (!layoutName.trim()) return;
    
    console.log('🔍 Tentative de sauvegarde du layout:', layoutName);
    console.log('📦 Elements à sauvegarder:', elements.length);
    console.log('📐 StageSize:', stageSize);
    
    setIsSaving(true);
    try {
      // Validation des données
      if (!elements || !Array.isArray(elements) || elements.length === 0) {
        console.error('❌ Aucun élément à sauvegarder');
        alert('Aucun élément à sauvegarder. Veuillez ajouter des éléments au canvas.');
        setIsSaving(false);
        return;
      }
      
      if (!projectId) {
        console.error('❌ Pas de projectId');
        alert('Erreur: ID du projet manquant');
        setIsSaving(false);
        return;
      }
      
      const payload = {
        projectId,
        name: layoutName,
        elements,
        stageSize,
        setAsDefault
      };
      
      console.log('📤 Envoi de la requête à /api/admin/save-layout');
      
      const response = await fetch('/api/admin/save-layout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      console.log('📥 Réponse reçue, status:', response.status);
      
      const result = await response.json();
      console.log('📄 Résultat:', result);
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save layout');
      }
      
      // Mettre à jour la liste des layouts
      if (result.allLayouts) {
        console.log('✅ Mise à jour de la liste des layouts:', result.allLayouts.length);
        setSavedLayouts(result.allLayouts);
      }
      
      // Réinitialiser le formulaire
      setLayoutName('');
      setSetAsDefault(false);
      
      // Afficher un message de succès
      console.log('✅ Layout enregistré avec succès:', result.data);
      alert('Layout enregistré avec succès!');
      
      // Appeler la fonction existante si nécessaire
      if (saveLayout) {
        saveLayout();
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement du layout:', error);
      alert(`Erreur lors de l'enregistrement du layout: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Nouvelle fonction pour supprimer un layout en utilisant la route API
  const deleteLayout = async (layoutId) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('canvas_layouts')
        .delete()
        .eq('id', layoutId);
        
      if (error) throw error;
      
      // Mettre à jour la liste des layouts
      setSavedLayouts(savedLayouts.filter(layout => layout.id !== layoutId));
      
    } catch (error) {
      console.error('Error deleting layout:', error);
    } finally {
      setIsDeleting(false);
      setLayoutToDelete(null);
    }
  };

  // Confirmer la suppression d'un layout
  const confirmDeleteLayout = (layout) => {
    setLayoutToDelete(layout);
  };

  // Générer une miniature du layout (version simplifiée)
  const getLayoutThumbnail = (layoutElements) => {
    // Ici, vous pourriez implémenter une logique pour générer une miniature
    // à partir des éléments du layout
    return null;
  };

  // Modifiez cette fonction existante pour charger correctement le layout sélectionné
  const handleLoadLayout = (layoutId) => {
    console.log('🔄 Chargement du layout:', layoutId);
    
    // Trouver le layout dans la liste des layouts sauvegardés
    const selectedLayout = savedLayouts.find(layout => layout.id === layoutId);
    
    if (selectedLayout) {
      try {
        console.log('📋 Layout trouvé:', selectedLayout);
        
        // Vérifier et extraire les éléments et la taille du stage
        // Correction: Vérifier si les données sont déjà des objets ou des chaînes JSON
        let elements, stageSize;
        
        if (typeof selectedLayout.elements === 'string') {
          elements = JSON.parse(selectedLayout.elements || '[]');
        } else if (selectedLayout.elements) {
          elements = selectedLayout.elements;
        } else {
          elements = [];
        }
        
        if (typeof selectedLayout.stage_size === 'string') {
          stageSize = JSON.parse(selectedLayout.stage_size || '{}');
        } else if (selectedLayout.stage_size) {
          stageSize = selectedLayout.stage_size;
        } else {
          stageSize = {};
        }
        
        console.log('🧩 Éléments à charger:', elements.length);
        console.log('📏 Taille du stage:', stageSize);
        
        // Appeler la fonction loadLayout du parent avec les données
        loadLayout(layoutId, elements, stageSize);
        
        // Mettre à jour l'ID du layout sélectionné
        setSelectedLayoutId(layoutId);
        
        // Mettre à jour l'état justLoaded pour l'animation
        setJustLoaded(true);
        
        // Mettre en évidence le layout sélectionné
        setHighlightedLayoutId(layoutId);
        
        // Afficher le popup de succès au lieu de l'alerte
        setLoadedLayoutName(selectedLayout.name);
        setSuccessMessage(`Layout "${selectedLayout.name}" chargé avec succès!`);
        setShowSuccessPopup(true);
        
        // Fermer automatiquement le popup après 3 secondes
        setTimeout(() => {
          setShowSuccessPopup(false);
        }, 3000);
        
        // Réinitialiser l'état justLoaded après 5 secondes
        setTimeout(() => {
          setJustLoaded(false);
        }, 5000);
        
        // Réinitialiser la mise en évidence après un certain temps
        setTimeout(() => {
          setHighlightedLayoutId(null);
        }, 2000);
        
        // Afficher un message d'information après la fermeture du popup
        setTimeout(() => {
          setInfoMessage("Pour voir le layout chargé, allez dans l'onglet Canvas");
          setShowInfoPopup(true);
          
          // Fermer le message d'information après 4 secondes
          setTimeout(() => {
            setShowInfoPopup(false);
          }, 4000);
        }, 3500);
      } catch (error) {
        console.error('❌ Erreur lors du chargement du layout:', error);
        alert(`Erreur lors du chargement du layout: ${error.message}`);
      }
    } else {
      console.error('❌ Layout non trouvé:', layoutId);
      alert('Layout non trouvé');
    }
  };

  // Nouvelle fonction pour gérer la sélection d'un template
  const handleTemplateSelect = (template) => {
    console.log('🔍 Template sélectionné:', template);
    
    try {
      // Extraire les éléments et la taille du stage du template
      const templateElements = template.elements;
      const templateStageSize = template.stage_size;
      
      // Appliquer le template sélectionné
      loadLayout(null, templateElements, templateStageSize);
      
      // Mettre à jour le nom du layout avec celui du template
      setLayoutName(template.name);
      
      // Fermer le sélecteur
      setShowTemplateSelector(false);
      
      // Afficher un message de succès
      setSuccessMessage(`Template "${template.name}" chargé avec succès!`);
      setShowSuccessPopup(true);
      
      // Fermer automatiquement le popup après 3 secondes
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);
    } catch (error) {
      console.error('❌ Erreur lors du chargement du template:', error);
      alert(`Erreur lors du chargement du template: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Disposition du canvas</h4>
        
        {/* Sauvegarde du layout actuel */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h5 className="text-xs font-medium text-gray-600 mb-2">Sauvegarder la disposition actuelle</h5>
          <div className="space-y-3">
            <div className="flex space-x-2">
              <input
                type="text"
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                placeholder="Nom du layout"
                className="flex-grow px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={handleSaveLayout}
                disabled={!layoutName.trim() || isSaving}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                  layoutName.trim() && !isSaving
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Sauvegarder
                  </>
                )}
              </button>
            </div>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={setAsDefault}
                onChange={(e) => setSetAsDefault(e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="ml-2 text-xs text-gray-600">
                Définir comme disposition par défaut pour ce projet
              </span>
            </label>
            
            <p className="text-xs text-gray-500">
              Sauvegardez la disposition actuelle pour pouvoir la réutiliser plus tard.
            </p>
          </div>
        </div>
        
        {/* Ajouter le bouton pour les templates externes ici */}
        <div className="mb-6">
          <h5 className="text-xs font-medium text-gray-600 mb-3 flex items-center justify-between">
            <span>Templates de layouts</span>
            <button
              onClick={() => setShowTemplateSelector(true)}
              className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center"
            >
              Parcourir les templates
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 ml-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </h5>
          
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-indigo-700">
                  Vous pouvez utiliser des templates prédéfinis pour créer rapidement des layouts professionnels.
                </p>
                <button
                  onClick={() => setShowTemplateSelector(true)}
                  className="mt-2 inline-flex items-center px-3 py-1.5 border border-indigo-300 text-xs font-medium rounded text-indigo-700 bg-white hover:bg-indigo-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Importer un template
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Layouts préréglés */}
        <div className="mb-6">
          <h5 className="text-xs font-medium text-gray-600 mb-3 flex items-center justify-between">
            <span>Préréglages de disposition</span>
            <button
              onClick={() => setShowPresetLayouts(!showPresetLayouts)}
              className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center"
            >
              {showPresetLayouts ? 'Masquer' : 'Afficher'}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-4 w-4 ml-1 transition-transform ${showPresetLayouts ? 'transform rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </h5>
          
          {showPresetLayouts && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              {presetLayouts.map(layout => (
                <div 
                  key={layout.id}
                  onClick={() => applyPresetLayout(layout.id)}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all duration-200"
                >
                  <div className="h-24 bg-gray-50 relative flex items-center justify-center p-2">
                    {/* Représentation visuelle du layout */}
                    <div className="w-full h-full flex items-center justify-center">
                      {layout.id === 'single-image' && (
                        <div className="w-3/5 h-3/5 bg-indigo-100 rounded-lg border border-indigo-200"></div>
                      )}
                      {layout.id === 'split-vertical' && (
                        <div className="w-full h-3/5 flex space-x-2">
                          <div className="flex-1 bg-indigo-100 rounded-lg border border-indigo-200"></div>
                          <div className="flex-1 bg-purple-100 rounded-lg border border-purple-200"></div>
                        </div>
                      )}
                      {layout.id === 'grid-4' && (
                        <div className="w-4/5 h-4/5 grid grid-cols-2 gap-1">
                          <div className="bg-indigo-100 rounded-lg border border-indigo-200"></div>
                          <div className="bg-purple-100 rounded-lg border border-purple-200"></div>
                          <div className="bg-purple-100 rounded-lg border border-purple-200"></div>
                          <div className="bg-indigo-100 rounded-lg border border-indigo-200"></div>
                        </div>
                      )}
                      {layout.id === 'polaroid' && (
                        <div className="w-3/5 h-4/5 bg-white rounded-lg border border-gray-300 flex flex-col">
                          <div className="flex-grow bg-indigo-100 m-1 rounded"></div>
                          <div className="h-3 bg-gray-100 mx-1 mb-1 rounded"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-2">
                    <h6 className="font-medium text-gray-800 text-sm">{layout.name}</h6>
                    <p className="text-xs text-gray-500">{layout.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Layouts sauvegardés */}
        <div>
          <h5 className="text-xs font-medium text-gray-600 mb-3">Layouts sauvegardés</h5>
          
          {savedLayouts.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <p className="text-gray-500 text-sm">
                Aucun layout sauvegardé pour ce projet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {savedLayouts.map(layout => (
                <div 
                  key={layout.id}
                  className={`flex justify-between items-center p-3 border rounded-lg transition-all duration-300 ${
                    highlightedLayoutId === layout.id 
                      ? 'border-green-500 bg-green-50 shadow-md transform scale-102' 
                      : selectedLayoutId === layout.id 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-grow">
                    <h6 className="font-medium text-gray-800 text-sm">{layout.name}</h6>
                    <p className="text-xs text-gray-500">
                      {new Date(layout.created_at).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleLoadLayout(layout.id)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors relative group"
                      title="Charger ce layout"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs font-medium text-white bg-gray-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Charger ce layout
                      </span>
                    </button>
                    
                    <button
                      onClick={() => confirmDeleteLayout(layout)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors relative group"
                      title="Supprimer ce layout"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs font-medium text-white bg-gray-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Supprimer ce layout
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Améliorez le popup de succès avec une animation plus fluide */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 border-l-4 border-green-500 pointer-events-auto transform transition-all duration-300">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100 text-green-600">
                  <svg className="h-8 w-8 animate-checkmark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-lg font-medium text-gray-900">Layout chargé!</p>
                <p className="mt-1 text-sm text-gray-500">{successMessage}</p>
                <div className="mt-3 bg-green-50 p-2 rounded-md">
                  <p className="text-xs text-green-800">
                    Vous pouvez maintenant voir le layout "{loadedLayoutName}" dans l'éditeur de canvas.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowSuccessPopup(false)}
                className="ml-4 inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Message d'information après le chargement */}
      {showInfoPopup && (
        <div className="fixed bottom-4 right-4 z-50 animate-slideUp">
          <div className="bg-indigo-100 border-l-4 border-indigo-500 text-indigo-700 p-4 rounded shadow-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{infoMessage}</p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button 
                    onClick={() => setShowInfoPopup(false)}
                    className="inline-flex rounded-md p-1.5 text-indigo-500 hover:bg-indigo-200 focus:outline-none"
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Popup de confirmation de suppression */}
      {layoutToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Confirmer la suppression</h3>
            <p className="text-gray-600 mb-4">
              Êtes-vous sûr de vouloir supprimer le layout <strong>"{layoutToDelete.name}"</strong> ? Cette action est irréversible.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setLayoutToDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteLayout(layoutToDelete.id)}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Ajouter le sélecteur de templates */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <LayoutTemplateSelector 
            onSelectTemplate={handleTemplateSelect} 
            onClose={() => setShowTemplateSelector(false)} 
          />
        </div>
      )}
    </div>
  );
};

// Améliorez les animations CSS avec de nouvelles animations
const animations = `
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-slideUp {
  animation: slideUp 0.4s ease-out forwards;
}

@keyframes checkmark {
  0% { stroke-dashoffset: 100; }
  100% { stroke-dashoffset: 0; }
}

.animate-checkmark {
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  animation: checkmark 0.6s ease-in-out forwards;
}

.scale-102 {
  transform: scale(1.02);
}
`;

// Ajouter les styles globaux (côté client uniquement)
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = animations;
  document.head.appendChild(style);
}

export default LayoutTab;
