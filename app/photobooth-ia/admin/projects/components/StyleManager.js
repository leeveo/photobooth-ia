'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RiAddLine, RiDeleteBin6Line, RiAlertLine } from 'react-icons/ri';
import StyleTemplates from '../../components/StyleTemplates';
import styleTemplateDataCoifure from '../../components/styleTemplateDataCoifure.json';

const StyleManager = ({ 
  projectId, 
  styles, 
  setStyles, 
  setError, 
  setSuccess, 
  typeValidated,
  photoboothType: initialPhotoboothType // <-- rename for clarity
}) => {
  const supabase = createClientComponentClient();
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
  const [showStyleTemplates, setShowStyleTemplates] = useState(false);
  const [deleteStyleConfirm, setDeleteStyleConfirm] = useState(false);
  const [styleToDelete, setStyleToDelete] = useState(null);
  const [deleteStyleLoading, setDeleteStyleLoading] = useState(false);
  const [photoboothType, setPhotoboothType] = useState(initialPhotoboothType);

  // Fetch photobooth_type from projects table on mount or when projectId changes
  useEffect(() => {
    const fetchPhotoboothType = async () => {
      if (!projectId) return;
      
      console.log('Fetching photobooth type for project:', projectId);
      
      const { data, error } = await supabase
        .from('projects')
        .select('photobooth_type')
        .eq('id', projectId)
        .single();
        
      if (!error && data) {
        // Normalize to lowercase and trim any whitespace
        const normalizedType = data.photobooth_type?.toLowerCase().trim();
        console.log('Photobooth type fetched:', normalizedType);
        setPhotoboothType(normalizedType);
      } else if (error) {
        console.error('Error fetching photobooth type:', error);
      }
    };
    
    fetchPhotoboothType();
  }, [projectId, supabase]);

  // Additional effect to log when photoboothType changes
  useEffect(() => {
    console.log('Current photoboothType:', photoboothType);
    console.log('Is disabled:', !typeValidated || ['simple', 'boomerang'].includes(photoboothType?.toLowerCase()?.trim()));
  }, [photoboothType, typeValidated]);

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
          name: newStyle.name,         // <-- valeur saisie dans le champ "Nom du style"
          gender: newStyle.gender,     // <-- valeur choisie dans le select "Catégorie"
          style_key: newStyle.style_key,
          variations: newStyle.variations,
          description: newStyle.description, // <-- valeur saisie dans le champ "Description"
          preview_image: styleImageData.Key
        });

      if (addStyleError) throw addStyleError;

      // Refresh styles data
      const { data: freshStyles, error } = await supabase
        .from('styles')
        .select('*')
        .eq('project_id', projectId);
        
      if (!error) {
        setStyles(freshStyles || []);
      }

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
      setSuccess('Style ajouté avec succès');
    } catch (error) {
      console.error('Error adding style:', error);
      setError('Erreur lors de l\'ajout du style');
    } finally {
      setAddingStyleLoading(false);
    }
  }

  // Function to handle style deletion
  async function handleDeleteStyle(styleId) {
    // Log all style ids for debug
    console.log('All style ids:', styles.map(s => s.id));
    console.log('Trying to delete style with id:', styleId);
    // Find the style to delete for showing in the confirmation popup
    const style = styles.find(s => s.id === styleId);
    if (style) {
      setStyleToDelete(style);
      setDeleteStyleConfirm(true);
    } else {
      console.warn('Style not found for deletion:', styleId);
    }
  }

  // Function to confirm style deletion - updated with better styling
  async function confirmDeleteStyle() {
    if (!styleToDelete) return;

    setDeleteStyleLoading(true);

    try {
      // Log the id to be deleted
      console.log('Deleting style with id:', styleToDelete.id);

      // Delete the style from the database
      const { error } = await supabase
        .from('styles')
        .delete()
        .eq('id', styleToDelete.id);

      if (error) throw error;

      // Refresh styles data from Supabase to ensure UI is up-to-date
      const { data: freshStyles, error: fetchError } = await supabase
        .from('styles')
        .select('*')
        .eq('project_id', projectId);

      // Log the ids after refresh
      if (freshStyles) {
        console.log('Styles after deletion:', freshStyles.map(s => s.id));
      }

      if (fetchError) {
        console.error('Error refreshing styles:', fetchError);
        setError('Erreur lors de la mise à jour des styles');
      } else {
        setStyles(freshStyles || []);
      }

      // Show success message
      setSuccess(`Style "${styleToDelete.name}" supprimé avec succès`);

    } catch (error) {
      console.error('Error deleting style:', error);
      setError(`Erreur lors de la suppression du style: ${error.message}`);
    } finally {
      setDeleteStyleLoading(false);
      setDeleteStyleConfirm(false);
      setStyleToDelete(null);
    }
  }

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
    
    refreshStyles();
  };
  
  // Function to handle template errors
  const handleStyleTemplatesError = (errorMessage) => {
    setError(errorMessage);
  };

  // Make the condition more robust with null checking and normalization
  const isDisabled = !typeValidated || 
    (photoboothType && ['simple', 'boomerang'].includes(photoboothType.toLowerCase().trim()));

  // Modifiez la logique qui filtre les styles disponibles selon le type
  const getCompatibleStyles = (photoboothType) => {
    switch (photoboothType) {
      case 'premium':
        return ['style1', 'style2', /* etc */];
      case 'logo':
        // Ajoutez les styles compatibles avec votre nouveau type
        return ['style_logo', 'logo_fusion', /* etc */];
      default:
        return [];
    }
  };

  return (
    <div 
      className={`mt-8 ${isDisabled ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''}`}
      style={isDisabled ? { pointerEvents: 'none' } : {}} // Extra safety with inline style
    >
      <div className="bg-gradient-to-r rounded-lg from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md mr-3">
            <span className="text-white font-semibold">6</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              
              Choix du modèle
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Choisissez le type de photobooth pour votre projet. Ce choix est définitif et ne peut plus être modifié une fois validé.
            </p>
          </div>
        </div>
      </div>

      {/* Si photobooth_type est simple, afficher le message d'indisponibilité */}
      {photoboothType === 'simple' && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Non disponible pour le photobooth simple.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Si photobooth_type est boomerang, afficher le message d'indisponibilité */}
      {photoboothType === 'boomerang' && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Non disponible pour le photobooth boomerang.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Message de guide si le type n'est pas validé */}
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
            photoboothType={photoboothType}
            styleTemplatesData={
              photoboothType &&
              ['photobooth-coiffure', 'coiffure'].includes(photoboothType.toLowerCase().trim())
                ? styleTemplateDataCoifure
                : undefined
            }
            onStylesAdded={handleStyleTemplatesAdded}
            onStyleDeleted={(deletedStyleId) => {
              setStyles(styles.filter(s => s.id !== deletedStyleId));
              setSuccess(`Style supprimé avec succès`);
            }}
            onError={handleStyleTemplatesError}
            existingStyles={styles}
            onClose={() => setShowStyleTemplates(false)}
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
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5m0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Ajouter un style depuis une Catégorie
            </button>
            
           
          </div>
        </div>
      )}

      {/* Affichage de la grille des styles existants */}
      {styles.length > 0 && (
        <div className="mb-8">
          <div className="bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 rounded-2xl p-8 shadow-2xl border border-indigo-700/30 relative overflow-visible">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-lg font-bold text-white flex items-center drop-shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
                </svg>
                Galerie des styles sélectionnés ({styles.length})
              </h4>
              <button
                onClick={() => setShowStyleTemplates(true)}
                className="inline-flex items-center px-4 py-2 border rounded-full border-transparent text-sm font-medium shadow-sm text-white bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5m0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Ajouter depuis une Catégorie
              </button>
            </div>
            {/* Modern 5-column grid with responsive design */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-7">
              {styles.map((style) => (
                <div 
                  key={style.id}
                  className="group relative bg-gradient-to-br from-gray-800 via-indigo-800 to-purple-800 rounded-2xl overflow-visible shadow-xl border-2 border-transparent hover:border-purple-500 transition-all duration-300 transform hover:-translate-y-2 hover:scale-105"
                  style={{ minHeight: 320 }}
                >
                  {/* Glow effect */}
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-purple-500/30 via-indigo-500/20 to-transparent blur-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-0"></div>
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="aspect-square bg-gray-900 relative overflow-hidden rounded-t-2xl border-b border-indigo-700/40">
                      {style.preview_image ? (
                        <Image
                          src={style.preview_image}
                          alt={style.name}
                          fill
                          style={{ objectFit: "cover" }}
                          className="transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 002.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {/* Gender badge overlay */}
                      <div className="absolute top-3 right-3 z-20">
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold shadow-lg border-2 ${
                          style.gender === 'm' ? 'bg-blue-600/80 text-white border-blue-300' : 
                          style.gender === 'f' ? 'bg-pink-600/80 text-white border-pink-300' :
                          style.gender === 'ag' ? 'bg-green-600/80 text-white border-green-300' :
                          style.gender === 'af' ? 'bg-purple-600/80 text-white border-purple-300' :
                          'bg-gray-700/80 text-white border-gray-400'
                        }`}>
                          {style.gender === 'm' ? 'Homme' : 
                          style.gender === 'f' ? 'Femme' : 
                          style.gender === 'ag' ? 'Ado G' : 
                          style.gender === 'af' ? 'Ado F' : 'Général'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between p-4">
                      <div>
                        <h5 className="font-bold text-white mb-1 truncate text-lg">{style.name}</h5>
                        <div className="flex items-center text-xs text-indigo-200 mb-2 space-x-2">
                          <span className="bg-indigo-700/80 text-indigo-100 px-2 py-0.5 rounded-md font-mono tracking-wide shadow">
                            {style.style_key}
                          </span>
                          {style.variations > 1 && (
                            <span className="bg-purple-700/80 text-purple-100 px-2 py-0.5 rounded-md shadow">
                              {style.variations} var.
                            </span>
                          )}
                        </div>
                        {/* Tags based on gender */}
                        <div className="flex flex-wrap gap-1 mt-2 mb-3">
                          {style.gender === 'm' && (
                            <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/40">
                              homme
                            </span>
                          )}
                          {style.gender === 'f' && (
                            <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full bg-pink-500/20 text-pink-200 border border-pink-400/40">
                              femme
                            </span>
                          )}
                          {style.gender === 'ag' && (
                            <>
                              <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full bg-yellow-400/20 text-yellow-100 border border-yellow-400/40">
                                ado
                              </span>
                              <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full bg-green-500/20 text-green-200 border border-green-400/40">
                                garçon
                              </span>
                            </>
                          )}
                          {style.gender === 'af' && (
                            <>
                              <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full bg-yellow-400/20 text-yellow-100 border border-yellow-400/40">
                                ado
                              </span>
                              <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full bg-pink-500/20 text-pink-200 border border-pink-400/40">
                                fille
                              </span>
                            </>
                          )}
                          {(!style.gender || style.gender === '') && (
                            <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/40">
                              général
                            </span>
                          )}
                        </div>
                        {style.description && (
                          <div className="text-xs text-gray-300 mt-2 line-clamp-2">{style.description}</div>
                        )}
                      </div>
                      <div className="flex space-x-2 mt-4">
                        <button
                          onClick={() => handleDeleteStyle(style.id)}
                          className="w-full inline-flex justify-center items-center px-3 py-1.5 border border-red-400 text-xs font-bold rounded-lg text-red-200 bg-gradient-to-r from-red-700/80 to-red-600/80 hover:from-red-800 hover:to-red-700 shadow-lg transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Style delete confirmation popup - updated with matching style to success popup */}
      {deleteStyleConfirm && styleToDelete && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center p-4 delete-popup-container" 
          role="dialog" 
          aria-modal="true">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl overflow-hidden w-full max-w-md transform transition-all animate-success-popup"
               onClick={(e) => e.stopPropagation()}>
            {/* Header with RED gradient effect */}
            <div className="h-28 bg-gradient-to-r from-red-500 to-red-700 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-cover bg-center opacity-20" 
                   style={{ backgroundImage: `url(${styleToDelete?.preview_image})` }}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
              
              {/* Delete icon with animation */}
              <div className="z-10 rounded-full bg-white bg-opacity-20 p-4 animate-success-icon">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 text-center">
              <h3 className="text-2xl font-bold text-white mb-3 animate-success-text">Confirmer la suppression</h3>
              <p className="text-gray-300 mb-4 animate-success-text" style={{ animationDelay: "0.1s" }}>
                Êtes-vous sûr de vouloir supprimer le style <span className="font-semibold text-red-400">{styleToDelete.name}</span> ?
              </p>
              
              {/* Style preview */}
              <div className="flex justify-center mt-6 animate-success-text" style={{ animationDelay: "0.2s" }}>
                <div className="w-32 h-32 relative rounded-lg overflow-hidden border border-gray-700 shadow-lg">
                  {styleToDelete.preview_image ? (
                    <img 
                      src={styleToDelete.preview_image} 
                      alt={styleToDelete.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/placeholder-style.png';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">Aucune image</span>
                    </div>
                  )}
                  
                  {/* Style name */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-1 text-center">
                    <span className="text-white text-xs truncate block">{styleToDelete.name}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 text-sm text-gray-400 animate-success-text" style={{ animationDelay: "0.25s" }}>
                Cette action ne peut pas être annulée.
              </div>
            </div>
            
            {/* Footer with buttons */}
            <div className="bg-gray-900 px-6 py-4 flex justify-center space-x-4 animate-success-text" style={{ animationDelay: "0.3s" }}>
              <button
                type="button"
                onClick={() => setDeleteStyleConfirm(false)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                disabled={deleteStyleLoading}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteStyle}
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white text-sm font-medium rounded-lg transition-colors shadow-lg flex items-center"
                disabled={deleteStyleLoading}
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Supprimer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add matching animation styles
const deletePopupAnimations = `
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

// Inject animation styles into document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = deletePopupAnimations;
  document.head.appendChild(style);
}

export default StyleManager;

