'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RiAddLine, RiDeleteBin6Line, RiAlertLine } from 'react-icons/ri';

const StyleManager = ({ 
  projectId, 
  styles, 
  setStyles, 
  setError, 
  setSuccess, 
  typeValidated,
  photoboothType
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
      // Make sure the storage bucket exists
      try {
        const { data: bucketData, error: bucketError } = await supabase
          .storage
          .getBucket('styles');
          
        if (bucketError && bucketError.code === 'PGRST116') {
          // Bucket doesn't exist, create it
          await supabase.storage.createBucket('styles', {
            public: true
          });
        }
      } catch (bucketCheckError) {
        console.warn('Error checking bucket:', bucketCheckError);
        // Continue anyway
      }
      
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
    // Find the style to delete for showing in the confirmation popup
    const style = styles.find(s => s.id === styleId);
    if (style) {
      setStyleToDelete(style);
      setDeleteStyleConfirm(true);
    }
  }

  // Function to confirm style deletion
  async function confirmDeleteStyle() {
    if (!styleToDelete) return;
    
    setDeleteStyleLoading(true);
    
    try {
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

  return (
    <div className={`mt-8 ${!typeValidated ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''}`}>
      <div className="flex justify-between items-center mb-4 relative">
        <div className="flex items-center mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md mr-3">
            <span className="text-white font-semibold">3</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Choix du modèle</h3>
        </div>
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
            onClick={() => setShowStyleTemplates(!showStyleTemplates)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            disabled={!typeValidated}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5m0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Ajouter des styles depuis un template
          </button>
          
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
          {/* Here you would import and render the StyleTemplates component */}
          <p>StyleTemplates Component would render here</p>
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
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 shadow-lg border border-indigo-100">
            <h4 className="text-lg font-semibold text-indigo-800 mb-6 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
              </svg>
              Galerie des styles séléctionnés ({styles.length})
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
                    
                    {/* Tags based on gender */}
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
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
    </div>
  );
};

export default StyleManager;
