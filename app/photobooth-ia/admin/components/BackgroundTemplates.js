'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import backgroundData from '../data/backgroundTemplates.json';

export default function BackgroundTemplates({ projectId, onBackgroundsAdded, onError, onClose }) {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingBackground, setSavingBackground] = useState(false);
  
  // Load templates from JSON file
  useEffect(() => {
    try {
      setLoading(true);
      
      // Extract templates from the JSON data
      const templatesFromJson = backgroundData.templates || [];
      
      // Get unique categories
      const uniqueCategories = ['All', ...new Set(templatesFromJson.map(t => t.category))];
      setCategories(uniqueCategories);
      
      // Transform templates for display
      const formattedTemplates = templatesFromJson.map(template => ({
        id: template.id,
        name: template.name,
        url: template.url,
        category: template.category,
        path: template.url // For compatibility with existing code
      }));
      
      setTemplates(formattedTemplates);
      console.log('Loaded templates from JSON:', formattedTemplates);
    } catch (error) {
      console.error('Error loading templates from JSON:', error);
      onError && onError('Erreur lors du chargement des templates');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Handle file selection for upload
  const handleFileSelection = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Preview the uploaded file
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage({
        id: `upload-${Date.now()}`,
        file,
        name: file.name.replace(/\.[^/.]+$/, ""),
        previewUrl: reader.result,
        category: 'Custom'
      });
      
      // Automatically select this uploaded image
      setSelectedTemplate({
        id: `upload-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        previewUrl: reader.result,
        isUploaded: true
      });
    };
    reader.readAsDataURL(file);
  };

  // Filter templates based on category and search query
  const filteredTemplates = templates.filter(template => {
    const matchesCategory = activeCategory === 'All' || template.category === activeCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Save the selected background to the project
  const handleSaveBackground = async () => {
    if (!selectedTemplate) {
      onError && onError('Veuillez sélectionner un arrière-plan');
      return;
    }

    try {
      setSavingBackground(true);
      
      let backgroundData = {
        projectId: projectId,
        name: selectedTemplate.name,
      };
      
      // If it's an uploaded image, upload it to Supabase first
      if (selectedTemplate.isUploaded && uploadedImage?.file) {
        // Use FormData to send the file
        const formData = new FormData();
        formData.append('file', uploadedImage.file);
        formData.append('projectId', projectId);
        formData.append('name', selectedTemplate.name);
        
        // Use API route to bypass RLS
        const response = await fetch('/api/admin/add-background', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erreur lors de l'ajout de l'arrière-plan");
        }
        
        const { data } = await response.json();
        console.log('Added background via API:', data);
        
        // Call the callback with the added background
        onBackgroundsAdded && onBackgroundsAdded(data);
      } else {
        // It's a template from the JSON file - use API endpoint
        const response = await fetch('/api/admin/add-background-from-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId: projectId,
            name: selectedTemplate.name,
            imageUrl: selectedTemplate.url,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erreur lors de l'ajout de l'arrière-plan");
        }
        
        const { data } = await response.json();
        console.log('Added background via API:', data);
        
        // Call the callback with the added background
        onBackgroundsAdded && onBackgroundsAdded(data);
      }
      
      // Close the popup
      onClose && onClose();
    } catch (error) {
      console.error('Error saving background:', error);
      onError && onError('Erreur lors de l\'enregistrement de l\'arrière-plan: ' + error.message);
    } finally {
      setSavingBackground(false);
    }
  };

  return (
    // Reduce max height and make it scrollable to ensure buttons are always visible
    <div className="bg-white rounded-xl shadow-2xl p-4 max-w-4xl w-full mx-auto overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Sélectionner un arrière-plan
        </h3>
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

      {/* Search & Upload Section */}
      <div className="flex flex-col md:flex-row gap-2 mb-3">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Rechercher un arrière-plan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-colors whitespace-nowrap">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Télécharger
          <input 
            type="file" 
            className="sr-only" 
            accept="image/*"
            onChange={handleFileSelection}
          />
        </label>
      </div>

      {/* Categories */}
      <div className="mb-3 overflow-x-auto">
        <div className="flex space-x-2 pb-2">
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

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <span className="ml-3 text-gray-600">Chargement des arrière-plans...</span>
          </div>
        ) : (
          <>
            {/* Display backgrounds grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {/* Show uploaded image if any */}
              {uploadedImage && (
                <div 
                  key={uploadedImage.id}
                  onClick={() => setSelectedTemplate({
                    id: uploadedImage.id,
                    name: uploadedImage.name,
                    previewUrl: uploadedImage.previewUrl,
                    isUploaded: true
                  })}
                  className={`relative rounded-lg overflow-hidden shadow-md cursor-pointer transition-all transform hover:-translate-y-1 hover:shadow-lg ${
                    selectedTemplate?.id === uploadedImage.id
                      ? 'ring-4 ring-indigo-500 scale-95'
                      : ''
                  }`}
                >
                  <div className="aspect-square relative">
                    <Image
                      src={uploadedImage.previewUrl}
                      alt={uploadedImage.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                      className="object-cover"
                    />
                    
                    {selectedTemplate?.id === uploadedImage.id && (
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
                    <h4 className="font-medium text-gray-900 truncate text-sm">{uploadedImage.name}</h4>
                  </div>
                </div>
              )}
              
              {/* Template backgrounds */}
              {filteredTemplates.map((template) => (
                <div 
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`relative rounded-lg overflow-hidden shadow-md cursor-pointer transition-all transform hover:-translate-y-1 hover:shadow-lg ${
                    selectedTemplate?.id === template.id
                      ? 'ring-4 ring-indigo-500 scale-95'
                      : ''
                  }`}
                >
                  <div className="aspect-square relative">
                    <Image
                      src={template.url}
                      alt={template.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                      className="object-cover"
                    />
                    
                    {selectedTemplate?.id === template.id && (
                      <div className="absolute inset-0 bg-indigo-500 bg-opacity-20 flex items-center justify-center">
                        <div className="bg-white rounded-full p-2 shadow-lg">
                          <svg className="h-6 w-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                    
                    {template.category && (
                      <span className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                        {template.category}
                      </span>
                    )}
                  </div>
                  
                  <div className="p-2 bg-white">
                    <h4 className="font-medium text-gray-900 truncate text-sm">{template.name}</h4>
                  </div>
                </div>
              ))}
              
              {filteredTemplates.length === 0 && !uploadedImage && (
                <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-4 text-gray-500">
                    Aucun arrière-plan trouvé pour cette recherche.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Selected background preview and buttons (fixed at bottom) */}
      <div className="mt-2 border-t border-gray-200 pt-3">
        {selectedTemplate && (
          <div className="mb-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Arrière-plan sélectionné</h4>
            <div className="flex items-center">
              <div className="w-12 h-12 relative rounded overflow-hidden mr-3">
                <Image 
                  src={selectedTemplate.previewUrl || selectedTemplate.url} 
                  alt={selectedTemplate.name} 
                  fill 
                  className="object-cover" 
                />
              </div>
              <div>
                <h5 className="font-medium text-gray-900 text-sm">{selectedTemplate.name}</h5>
                <p className="text-xs text-gray-500">
                  {selectedTemplate.isUploaded ? 'Image personnalisée' : 'Template'}
                </p>
              </div>
            </div>
          </div>
        )}

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
            onClick={handleSaveBackground}
            disabled={!selectedTemplate || savingBackground}
            className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white ${
              !selectedTemplate
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
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
              'Définir comme arrière-plan'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
