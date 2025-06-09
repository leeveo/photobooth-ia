'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const LayoutTab = ({ 
  projectId, 
  savedLayouts = [], 
  loadLayout, 
  saveLayout,
  setLayoutName,
  layoutName,
  elements,
  stageSize
}) => {
  const [selectedLayoutId, setSelectedLayoutId] = useState(null);
  const [showPresetLayouts, setShowPresetLayouts] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [layoutToDelete, setLayoutToDelete] = useState(null);
  const supabase = createClientComponentClient();

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

  // Supprimer un layout sauvegardé
  const deleteLayout = async (layoutId) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('canvas_layouts')
        .delete()
        .eq('id', layoutId);
        
      if (error) throw error;
      
      // Mettre à jour la liste des layouts
      const updatedLayouts = savedLayouts.filter(layout => layout.id !== layoutId);
      // Ici, on devrait appeler une fonction du parent pour mettre à jour la liste des layouts
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

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Disposition du canvas</h4>
        
        {/* Sauvegarde du layout actuel */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h5 className="text-xs font-medium text-gray-600 mb-2">Sauvegarder la disposition actuelle</h5>
          <div className="flex space-x-2">
            <input
              type="text"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              placeholder="Nom du layout"
              className="flex-grow px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={saveLayout}
              disabled={!layoutName.trim()}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                layoutName.trim() 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Sauvegarder
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Sauvegardez la disposition actuelle pour pouvoir la réutiliser plus tard.
          </p>
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
                  className={`flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                    selectedLayoutId === layout.id 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-200'
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
                      onClick={() => loadLayout(layout.id)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                      title="Charger ce layout"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => confirmDeleteLayout(layout)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Supprimer ce layout"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
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
    </div>
  );
};

export default LayoutTab;
