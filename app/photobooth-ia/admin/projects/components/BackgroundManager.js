'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RiAddLine } from 'react-icons/ri';
import BackgroundTemplates from '../../components/BackgroundTemplates';

const BackgroundManager = ({ 
  projectId, 
  backgrounds, 
  setBackgrounds, 
  setError, 
  setSuccess 
}) => {
  const supabase = createClientComponentClient();
  const [addingBackground, setAddingBackground] = useState(false);
  const [newBackground, setNewBackground] = useState({
    name: '',
  });
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState(null);
  const [addingBackgroundLoading, setAddingBackgroundLoading] = useState(false);
  const [showBackgroundTemplates, setShowBackgroundTemplates] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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

  // Updated function to handle backgrounds added from templates
  const handleBackgroundTemplatesAdded = (addedBackgrounds) => {
    console.log(`✅ Background templates callback received:`, addedBackgrounds);
    
    // Close the template popup
    setShowBackgroundTemplates(false);
    
    // Indicate we're refreshing
    setIsRefreshing(true);
    
    // Set a success message
    setSuccess(`Arrière-plan du projet remplacé avec succès !`);
    
    // Force a direct UI update first
    if (Array.isArray(addedBackgrounds)) {
      setBackgrounds(addedBackgrounds);
    } else if (addedBackgrounds) {
      setBackgrounds([addedBackgrounds]);
    } else {
      setBackgrounds([]);
    }
    
    // After a delay, refresh from the database to ensure we have the latest data
    setTimeout(() => {
      refreshBackgroundsFromDatabase();
    }, 500);
  };

  // Add this new function to refresh backgrounds directly from the database
  const refreshBackgroundsFromDatabase = async () => {
    try {
      console.log("Refreshing backgrounds from database...");
      
      // Get fresh data from the database
      const { data, error } = await supabase
        .from('backgrounds')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true);
      
      if (error) {
        console.error("Error fetching backgrounds:", error);
        setError("Failed to refresh backgrounds");
        return;
      }
      
      console.log("Fresh background data:", data);
      
      // Update the state with the fresh data
      setBackgrounds(data || []);
      
    } catch (err) {
      console.error("Error in refresh:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Function to handle template errors
  const handleBackgroundTemplatesError = (errorMessage) => {
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
    const publicUrlResponse = supabase.storage.from('backgrounds').getPublicUrl(url);
    
    // Handle different versions of Supabase client
    const publicUrl = publicUrlResponse.data?.publicUrl || // newer versions
                      publicUrlResponse.publicURL || // older versions
                      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/backgrounds/${url}`;
    
    console.log('Original URL:', url);
    console.log('Public URL:', publicUrl);
    
    return publicUrl;
  };

  // Debug backgrounds data
  useEffect(() => {
    console.log('Backgrounds data updated:', backgrounds);
    // Check for duplicate IDs
    const ids = backgrounds.map(bg => bg.id);
    const uniqueIds = [...new Set(ids)];
    if (ids.length !== uniqueIds.length) {
      console.warn('Duplicate background IDs detected!', ids);
    }
  }, [backgrounds]);

  return (
    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-medium text-gray-500">Arrière-plans du projet ({backgrounds.length})</h4>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowBackgroundTemplates(true)}
            className="inline-flex items-center px-4 py-2 border border-indigo-300 text-sm font-medium rounded-lg shadow-sm text-indigo-700 bg-white hover:bg-indigo-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5m0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
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
      
      {isRefreshing ? (
        <div className="text-center py-6 bg-white bg-opacity-50 rounded-lg border border-dashed border-gray-300">
          <div className="flex justify-center items-center">
            <svg className="animate-spin h-5 w-5 text-indigo-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-500">Actualisation des arrière-plans...</span>
          </div>
        </div>
      ) : backgrounds.length === 0 ? (
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
                  <>
                    <Image
                      src={getFullImageUrl(background.image_url)}
                      alt={background.name}
                      fill
                      style={{ objectFit: "cover" }}
                      unoptimized={true}
                      onError={(e) => {
                        console.error('Image failed to load:', background.image_url);
                        e.target.style.display = 'none';
                      }}
                    />
                    {/* Add a small badge to show the URL for debugging */}
                    <div className="absolute bottom-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 max-w-full truncate">
                      ID: {background.id?.substring(0, 4)}...
                    </div>
                  </>
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
    </div>
  );
};

export default BackgroundManager;
