'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RiAddLine, RiCheckboxCircleLine, RiInformationLine, RiRefreshLine } from 'react-icons/ri';
// Import the style templates data from the JSON file
import styleTemplates from './styleTemplatesData.json';

/**
 * Composant de sélection de templates de styles prédéfinis
 */
export default function StyleTemplates({ projectId, photoboothType, onStylesAdded, onError, existingStyles = [] }) {
  // Vérification des props requises pour éviter les erreurs de rendu
  if (!projectId || !photoboothType) {
    console.error("StyleTemplates: Missing required props (projectId or photoboothType)");
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md text-red-700">
        <p className="font-medium">Erreur de configuration du composant</p>
        <p className="text-sm">Veuillez vérifier que projectId et photoboothType sont correctement fournis.</p>
      </div>
    );
  }

  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  const [templateStyles, setTemplateStyles] = useState([]);
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [existingStyleKeys, setExistingStyleKeys] = useState(new Set());
  const [error, setError] = useState(null);
  // État pour le popup de succès
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successData, setSuccessData] = useState(null);
  // Ajout des états pour la confirmation de suppression
  const [showDeleteConfirmPopup, setShowDeleteConfirmPopup] = useState(false);
  const [styleToDelete, setStyleToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null); // État pour le message de succès

  // Effect to build a set of existing style keys when component mounts or existingStyles changes
  useEffect(() => {
    try {
      const styleKeys = new Set();
      existingStyles.forEach(style => {
        styleKeys.add(`${style.style_key}_${style.gender || 'g'}`);
      });
      setExistingStyleKeys(styleKeys);
    } catch (err) {
      console.error("Error in existingStyles effect:", err);
      setError("Erreur lors du chargement des styles existants");
    }
  }, [existingStyles]);

  // Helper function to determine tags for a specific style
  const getTagsForStyle = (templateId, styleName) => {
    // Default tags for all styles
    const defaultTags = ["homme", "femme", "groupe"];
    
    // Collections that don't support group photos - removed "cartoon" from this list
    const noGroupCollections = ["sciencefiction", "digital", "medieval", "post-apocalyptic"];
    
    // Return ["homme", "femme"] for styles in these collections, default tags otherwise
    if (noGroupCollections.includes(templateId)) {
      return ["homme", "femme"];
    }
    
    return defaultTags;
  };

  // Helper function to get tags for a template (aggregating all style tags)
  const getTagsForTemplate = (templateId) => {
    // Most templates support all tags
    const allTags = ["homme", "femme", "groupe"];
    
    // Collections that don't support group photos
    const noGroupCollections = ["sciencefiction", "digital", "medieval", "post-apocalyptic"];
    
    // Return ["homme", "femme"] for these collections, all tags otherwise
    if (noGroupCollections.includes(templateId)) {
      return ["homme", "femme"];
    }
    
    return allTags;
  };

  // Fonction pour rafraîchir les données
  const refreshData = () => {
    setRefreshing(true);
    // Simuler un rafraîchissement des données
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Fonction pour mettre à jour le genre d'un style
  const updateStyleGender = (index, gender) => {
    const updatedStyles = [...templateStyles];
    updatedStyles[index].gender = gender;
    setTemplateStyles(updatedStyles);
  };

  // Fonction pour ouvrir le popup de détails avec les styles du template
  const openDetailsPopup = (templateId) => {
    const template = styleTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      
      // Initialiser les styles avec le genre par défaut 'g' (général/neutre) pour le nouveau processus
      const stylesWithGender = template.styles.map(style => {
        // Vérifier si ce style existe déjà dans le projet
        // Utiliser notre Set à jour qui inclut les styles récemment ajoutés
        const styleExists = existingStyleKeys.has(`${style.style_key}_g`);
        
        return {
          ...style,
          gender: 'g' // Utiliser 'g' comme valeur par défaut pour tous les styles
          , selected: !styleExists // Présélectionner seulement les styles qui n'existent pas déjà
          , disabled: styleExists // Désactiver les styles qui existent déjà
          , tags: style.tags || getTagsForStyle(template.id, style.name) // Utiliser la fonction helper pour déterminer les tags
        };
      });
      
      setTemplateStyles(stylesWithGender);
      // Initialiser les styles sélectionnés avec tous les styles non désactivés
      setSelectedStyles(
        stylesWithGender
          .map((style, index) => style.disabled ? null : index)
          .filter(index => index !== null)
      );
      setShowDetailsPopup(true);
    }
  };

  // Fonction pour gérer la sélection d'un style
  const toggleStyleSelection = (index) => {
    const updatedStyles = [...templateStyles];
    
    // Ne pas permettre la sélection si le style est désactivé
    if (updatedStyles[index].disabled) {
      return;
    }
    
    updatedStyles[index].selected = !updatedStyles[index].selected;
    setTemplateStyles(updatedStyles);
    
    if (updatedStyles[index].selected) {
      setSelectedStyles(prev => [...prev, index]);
    } else {
      setSelectedStyles(prev => prev.filter(i => i !== index));
    }
  };

  // Fonction pour sélectionner/désélectionner tous les styles
  const toggleSelectAll = () => {
    // Vérifier si tous les styles non désactivés sont sélectionnés
    const allSelectableSelected = templateStyles
      .filter(style => !style.disabled)
      .every(style => style.selected);
    
    // Mettre à jour seulement les styles qui ne sont pas désactivés
    const updatedStyles = templateStyles.map(style => ({
      ...style,
      selected: style.disabled ? false : !allSelectableSelected
    }));
    
    setTemplateStyles(updatedStyles);
    
    if (allSelectableSelected) {
      // Tout désélectionner
      setSelectedStyles([]);
    } else {
      // Sélectionner tous les styles non désactivés
      setSelectedStyles(
        updatedStyles
          .map((style, index) => style.disabled ? null : (style.selected ? index : null))
          .filter(index => index !== null)
      );
    }
  };

  // Fonction modifiée pour appliquer le template avec les prompts
  const applyTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      setLoading(true);
      
      // Récupérer le type de projet pour validation
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('photobooth_type')
        .eq('id', projectId)
        .single();
        
      if (projectError) throw projectError;
      
      // Vérifier la compatibilité
      if (!selectedTemplate.compatibleWith.includes(projectData.photobooth_type)) {
        throw new Error(`Ce template n'est pas compatible avec ce type de photobooth (${projectData.photobooth_type})`);
      }
      
      // Récupérer TOUS les styles existants pour vérification complète des doublons
      const { data: existingStyles, error: stylesError } = await supabase
        .from('styles')
        .select('style_key, gender')
        .eq('project_id', projectId);
    
      if (stylesError) throw stylesError;
    
      // Créer un ensemble de clés existantes pour vérification
      const existingStyleKeys = new Set();
      existingStyles?.forEach(style => {
        existingStyleKeys.add(`${style.style_key}_${style.gender || 'g'}`);
      });
      
      console.log("Clés de style existantes:", Array.from(existingStyleKeys));
      
      // Créer un timestamp pour rendre chaque clé unique
      const timestamp = Date.now();
      
      // Filtrer les styles sélectionnés et préparer les données
      const stylesToAdd = templateStyles
        .filter(style => style.selected && !style.disabled)
        .map(style => {
          // Générer une clé de style unique en ajoutant un suffixe au style_key
          // Cela garantit qu'il n'y aura pas de conflit même si la clé et le genre sont identiques
          const uniqueStyleKey = `${style.style_key}_${Math.floor(Math.random() * 1000)}`;
          
          return {
            project_id: projectId,
            name: style.name,
            gender: style.gender || 'g',
            style_key: uniqueStyleKey, // Utiliser la clé unique
            preview_image: style.preview_image,
            description: style.description || '',
            prompt: style.prompt || '',
            is_active: true,
            variations: style.variations || 1
          };
        });
    
      if (stylesToAdd.length === 0) {
        throw new Error("Aucun style n'a été sélectionné pour l'ajout.");
      }
      
      console.log(`Ajout de ${stylesToAdd.length} nouveaux styles:`, stylesToAdd);
      
      // Insérer les styles avec les clés uniques
      const { data, error } = await supabase
        .from('styles')
        .insert(stylesToAdd)
        .select();
        
      if (error) {
        console.error("Error adding styles:", error);
        throw error;
      }
      
      console.log("Styles ajoutés avec succès:", data);
      
      // Préparer les données pour le popup de succès
      const successInfo = {
        count: data.length,
        styles: data,
        templateName: selectedTemplate.name
      };
      
      // IMPORTANT: Stocker les données de succès AVANT de fermer le popup
      setSuccessData(successInfo);
      
      // Fermer le popup de détails
      setShowDetailsPopup(false);
      
      // Utiliser setTimeout avec un délai plus long pour s'assurer que le premier popup est bien fermé
      setTimeout(() => {
        console.log("Preparing to show success popup");
        
        // Toujours afficher notre popup de succès local
        setShowSuccessPopup(true);
        
        // On ne déclenche pas automatiquement le callback parent
        // Le callback sera appelé seulement quand l'utilisateur fermera le popup
      }, 800);
    
    } catch (error) {
      console.error('Error applying template:', error);
      if (typeof onError === 'function') {
        onError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Fonction pour fermer le popup de succès et appeler le callback parent
  const handleSuccessPopupClose = () => {
    setShowSuccessPopup(false);
    
    // Mettre à jour le Set des styles existants pour les nouveaux styles ajoutés
    if (successData && successData.styles) {
      const updatedExistingStyleKeys = new Set(existingStyleKeys);
      
      // Ajouter les clés des nouveaux styles au Set
      successData.styles.forEach(style => {
        updatedExistingStyleKeys.add(`${style.style_key}_${style.gender || 'g'}`);
      });
      
      // Mettre à jour l'état
      setExistingStyleKeys(updatedExistingStyleKeys);
      console.log("Styles existants mis à jour:", Array.from(updatedExistingStyleKeys));
    }
    
    // Appeler le callback parent après la fermeture du popup
    if (typeof onStylesAdded === 'function' && successData) {
      console.log("Calling onStylesAdded callback with data", successData.styles);
      onStylesAdded(successData.styles);
    }
  };

  // Remove these functions - deletion should be handled by the parent component
  // Fonction pour ouvrir le popup de confirmation de suppression
  /*const openDeleteConfirmPopup = (style) => {
    setStyleToDelete(style);
    setShowDeleteConfirmPopup(true);
  };*/

  // Remove the delete confirmation function
  /*const handleDeleteStyleConfirm = async () => {
    // ...existing code...
  };*/

  // Remove the renderStyleCard function which includes delete button
  /*const renderStyleCard = (style, index) => {
    // ...existing code...
  };*/

  return (
    <div className="mt-6 space-y-6">
      <div className="border-t border-gray-200 pt-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Templates de styles prédéfinis</h3>
          <button 
            onClick={refreshData}
            className="flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-800 transition"
            disabled={refreshing}
          >
            <RiRefreshLine className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Rafraîchir</span>
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Sélectionnez un ensemble de styles prédéfinis pour votre projet ({photoboothType})
        </p>
      </div>
      
      {/* Section d'affichage des templates avec les tags ajoutés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {styleTemplates
          .filter(template => template.compatibleWith.includes(photoboothType))
          .map(template => (
            <div 
              key={template.id}
              className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
                selectedTemplate === template.id 
                  ? 'ring-2 ring-indigo-500 border-indigo-500' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => openDetailsPopup(template.id)}
            >
              <div className="h-80 relative">
                <img
                  src={template.image}
                  alt={template.name}
                  className="rounded-t-lg w-full h-full object-cover"
                  onError={(e) => {
                    console.error(`Failed to load image: ${template.image}`);
                    e.target.onerror = null;
                    e.target.src = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/placeholder-style.png';
                  }}
                />
              </div>
              <div className="p-4">
                <h4 className="font-medium text-gray-900">{template.name}</h4>
                <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                <p className="text-xs text-gray-400 mt-2">{template.styles.length} styles</p>
                
                {/* Affichage des tags du template */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {getTagsForTemplate(template.id).map((tag, tagIndex) => (
                    <span 
                      key={tagIndex} 
                      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                        tag === 'homme' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                        tag === 'femme' ? 'bg-pink-100 text-pink-700 border border-pink-300' :
                        'bg-purple-100 text-purple-700 border border-purple-300'
                      }`}
                    >
                      {tag.charAt(0).toUpperCase() + tag.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
      </div>
      
      {/* Popup de détails des styles avec sélection de genre */}
      {showDetailsPopup && selectedTemplate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl overflow-hidden w-full max-w-4xl transform transition-all">
            <div className="relative">
              {/* Header avec image de couverture et titre */}
              <div className="h-40 bg-gradient-to-r from-indigo-600 to-purple-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center opacity-40" 
                     style={{ backgroundImage: `url(${selectedTemplate.image})` }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-6 text-white">
                  <h3 className="text-2xl font-bold">{selectedTemplate.name}</h3>
                  <p className="text-gray-200 text-sm mt-1">{selectedTemplate.description}</p>
                </div>
                {/* Bouton de fermeture */}
                <button 
                  onClick={() => setShowDetailsPopup(false)}
                  className="absolute top-4 right-4 bg-black bg-opacity-40 rounded-full p-2 text-white hover:bg-opacity-60 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-white">
                    <span className="text-gray-300">{templateStyles.length} styles disponibles</span>
                    <span className="mx-2">•</span>
                    <span className="text-gray-300">{selectedStyles.length} sélectionnés</span>
                    <span className="mx-2">•</span>
                    <span className="text-gray-300">{templateStyles.filter(s => s.disabled).length} déjà ajoutés</span>
                  </div>
                  
                  {/* Select all button */}
                                   <button
                    onClick={toggleSelectAll}
                    className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-3 rounded-lg transition-colors flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {templateStyles.filter(s => !s.disabled).every(style => style.selected) ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      )}
                    </svg>
                    {templateStyles.filter(s => !s.disabled).every(style => style.selected) ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto p-2">
                  {templateStyles.map((style, index) => (
                    <div 
                      key={index} 
                      className={`relative bg-gray-800 rounded-xl overflow-hidden transition-all border ${
                        style.selected ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-gray-700'
                      } ${style.disabled ? 'opacity-50 grayscale' : ''}`}
                    >
                      {/* Badge pour styles déjà ajoutés */}
                      {style.disabled && (
                        <div className="absolute top-0 left-0 right-0 z-20 bg-gray-800 bg-opacity-90 text-gray-300 py-1 px-3 text-sm text-center">
                          Déjà ajouté
                        </div>
                      )}
                      
                      {/* Checkbox pour sélection */}
                      <div 
                        className={`absolute top-2 right-2 z-10 p-1 bg-black bg-opacity-60 rounded-md ${style.disabled ? 'opacity-50' : 'cursor-pointer'}`}
                        onClick={() => !style.disabled && toggleStyleSelection(index)}
                      >
                        <div className={`w-5 h-5 flex items-center justify-center rounded ${
                          style.selected ? 'bg-indigo-600' : 'bg-gray-700'
                        }`}>
                          {style.selected && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      
                      {/* Aperçu du style - Hauteur augmentée de h-40 à h-56 */}
                      <div 
                        className={`h-56 ${!style.disabled ? 'cursor-pointer' : ''}`} 
                        onClick={() => !style.disabled && toggleStyleSelection(index)}
                      >
                        {style.preview_image ? (
                          <img
                            src={style.preview_image}
                            alt={style.name}
                            className="w-full h-full object-cover transition-transform hover:scale-105"
                            onError={(e) => {
                              console.error(`Failed to load style preview: ${style.preview_image}`);
                              e.target.onerror = null;
                              e.target.src = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/placeholder-style.png';
                            }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gray-700">
                            <span className="text-gray-400">Aucune image</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3 text-white">
                        <h4 className="font-medium text-md">{style.name}</h4>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{style.description}</p>
                        
                        {/* Affichage des tags individuels */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(style.tags || getTagsForStyle(selectedTemplate.id, style.name)).map((tag, tagIndex) => (
                            <span 
                              key={tagIndex} 
                              className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                                tag === 'homme' ? 'bg-blue-600/30 text-blue-300 border border-blue-600' :
                                tag === 'femme' ? 'bg-pink-600/30 text-pink-300 border border-pink-600' :
                                'bg-purple-600/30 text-purple-300 border border-purple-600'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        
                        {/* Genre selection if needed - disabled for already added styles */}
                        <div className="mt-3">
                          <select
                            value={style.gender}
                            onChange={(e) => updateStyleGender(index, e.target.value)}
                            className={`w-full py-1 px-2 text-xs bg-gray-700 text-white border border-gray-600 rounded focus:ring-1 focus:ring-indigo-500 ${style.disabled ? 'cursor-not-allowed' : ''}`}
                            disabled={style.disabled}
                          >
                            {getGenderOptions().map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Footer with action buttons */}
              <div className="bg-gray-900 px-6 py-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDetailsPopup(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={applyTemplate}
                  disabled={loading || selectedStyles.length === 0}
                  className={`px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center ${
                    loading || selectedStyles.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Application en cours...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Appliquer {selectedStyles.length} style{selectedStyles.length > 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Popup de succès amélioré avec z-index supérieur */}
      {showSuccessPopup && successData && (
        <div 
          className="fixed inset-0 z-[99999] overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center p-4 success-popup-container" 
          role="dialog" 
          aria-modal="true"
          // Suppression du onClick sur le conteneur pour éviter la fermeture accidentelle
        >
          <div 
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl overflow-hidden w-full max-w-md transform transition-all animate-success-popup"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header avec effet de gradient */}
            <div className="h-28 bg-gradient-to-r from-green-500 to-emerald-600 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-cover bg-center opacity-20" 
                   style={{ backgroundImage: `url(${successData.styles[0]?.preview_image || selectedTemplate?.image})` }}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
              
              {/* Icône de succès avec animation */}
              <div className="z-10 rounded-full bg-white bg-opacity-20 p-4 animate-success-icon">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            {/* Contenu */}
            <div className="p-6 text-center">
              <h3 className="text-2xl font-bold text-white mb-3 animate-success-text">Styles ajoutés avec succès!</h3>
              <p className="text-gray-300 mb-4 animate-success-text" style={{ animationDelay: "0.1s" }}>
                {successData.count} style{successData.count > 1 ? 's ont été ajoutés' : ' a été ajouté'} depuis la collection 
                <span className="font-semibold text-emerald-400"> {successData.templateName}</span>
              </p>
              
              {/* Aperçu des styles ajoutés - maximum 3 */}
              {successData.styles && successData.styles.length > 0 && (
                <div className="flex justify-center space-x-3 mt-6 animate-success-text" style={{ animationDelay: "0.2s" }}>
                  {successData.styles.slice(0, 3).map((style, idx) => (
                    <div key={idx} className="w-24 h-24 relative rounded-lg overflow-hidden border border-gray-700 shadow-lg transform transition-transform hover:scale-105">
                      {style.preview_image ? (
                        <img 
                          src={style.preview_image} 
                          alt={style.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/placeholder-style.png';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No image</span>
                        </div>
                      )}
                      
                      {/* Nom du style */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-1 text-center">
                        <span className="text-white text-xs truncate block">{style.name}</span>
                      </div>
                    </div>
                  ))}
                  {successData.styles.length > 3 && (
                    <div className="w-24 h-24 bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700 shadow-lg">
                      <span className="text-white font-medium">+{successData.styles.length - 3}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer avec bouton */}
            <div className="bg-gray-900 px-6 py-4 flex justify-center animate-success-text" style={{ animationDelay: "0.3s" }}>
              <button
                type="button"
                onClick={handleSuccessPopupClose}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg"
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Remove the delete confirmation popup */}
      {/* Popup de confirmation de suppression avec style similaire au popup de succès */}
      {/*showDeleteConfirmPopup && styleToDelete && (
        // ...existing code...
      )*/}

      {/* Keep the success message toast */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-lg z-[99999] animate-fadeIn">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Ajouter les animations CSS améliorées pour le popup
const successAnimations = `
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

.animate-scale-in {
  animation: scaleIn 0.2s ease-out forwards;
}
`;

// Injecter les styles d'animation dans le document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = successAnimations;
  document.head.appendChild(style);
}