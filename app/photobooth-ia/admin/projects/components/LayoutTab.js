'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const LayoutTab = ({
  projectId,
  savedLayouts,
  loadLayout,
  saveLayout,
  elements,
  stageSize,
  setSavedLayouts,
  activeLayoutId
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createClientComponentClient();

  // Récupérer le layout existant (il ne devrait y en avoir qu'un seul)
  const existingLayout = savedLayouts.length > 0 ? savedLayouts[0] : null;

  const handleDeleteLayout = async () => {
    if (!existingLayout) return;

    if (confirmDelete) {
      // Procéder à la suppression
      setIsDeleting(true);
      try {
        const { error } = await supabase
          .from('canvas_layouts')
          .delete()
          .eq('id', existingLayout.id)
          .eq('project_id', projectId);

        if (error) throw error;

        // Vider la liste des layouts sauvegardés
        setSavedLayouts([]);
        setConfirmDelete(false);
      } catch (error) {
        console.error('Error deleting layout:', error);
        alert('Erreur lors de la suppression du layout');
      } finally {
        setIsDeleting(false);
      }
    } else {
      // Première fois - demander confirmation
      setConfirmDelete(true);
      // Reset confirmation after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <div className="p-3 border border-gray-300 rounded-md bg-white">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          {existingLayout ? 'État du layout' : 'Aucun layout sauvegardé'}
        </h4>
        <p className="text-sm text-gray-600 mb-3">
          {existingLayout 
            ? 'Vous pouvez mettre à jour le layout existant en cliquant sur "Sauvegarder" en haut.' 
            : 'Cliquez sur "Sauvegarder" en haut pour créer un layout pour ce projet.'}
        </p>
        <button
          onClick={saveLayout}
          className="w-full px-4 py-2 rounded-md text-sm bg-green-600 text-white hover:bg-green-700"
        >
          {existingLayout ? 'Mettre à jour le layout' : 'Créer un layout'}
        </button>
      </div>

      <div className="p-3 border border-gray-300 rounded-md bg-white">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Layout sauvegardé</h4>
        
        {!existingLayout ? (
          <p className="text-sm text-gray-500 italic">Aucun layout sauvegardé</p>
        ) : (
          <div className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-start">
              <div className="flex">
                {/* Afficher la miniature si disponible */}
                {existingLayout.thumbnail_url && (
                  <div className="mr-3">
                    <img 
                      src={existingLayout.thumbnail_url}
                      alt="Aperçu du layout"
                      className="w-16 h-12 object-cover rounded border border-gray-200"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/64x48?text=No+Image';
                      }}
                    />
                  </div>
                )}
                <div>
                  <h5 className="font-medium text-sm text-gray-800">{existingLayout.name}</h5>
                  <p className="text-xs text-gray-500">
                    {formatDate(existingLayout.created_at)}
                  </p>
                  {existingLayout.updated_at && existingLayout.updated_at !== existingLayout.created_at && (
                    <p className="text-xs text-gray-400">
                      Mis à jour le {formatDate(existingLayout.updated_at)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => loadLayout(existingLayout.id)}
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  Charger
                </button>
                <button
                  onClick={handleDeleteLayout}
                  disabled={isDeleting}
                  className={`px-2 py-1 text-xs rounded ${
                    isDeleting 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : confirmDelete
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {isDeleting ? 'Suppression...' : confirmDelete ? 'Confirmer' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-medium text-gray-700 mb-2">Layouts sauvegardés</h2>
        
        {savedLayouts.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500">Aucun layout sauvegardé pour ce projet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {savedLayouts.map((layout) => {
              // Vérifier si c'est le layout actif
              const isActive = layout.id === activeLayoutId;
              
              return (
                <div 
                  key={layout.id}
                  onClick={() => loadLayout(layout.id)}
                  className={`
                    cursor-pointer border rounded-lg overflow-hidden transition-all
                    ${isActive 
                      ? 'border-indigo-500 ring-2 ring-indigo-200' 
                      : 'border-gray-200 hover:border-indigo-300'}
                  `}
                >
                  <div className="h-24 bg-gray-50 flex items-center justify-center relative">
                    {layout.thumbnail_url ? (
                      <img 
                        src={layout.thumbnail_url} 
                        alt={layout.name}
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          e.target.onerror = null; 
                          e.target.src = 'https://via.placeholder.com/120x80?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Indicateur de layout actif */}
                    {isActive && (
                      <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-2 bg-white">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{layout.name}</h3>
                    <p className="text-xs text-gray-500">
                      {new Date(layout.updated_at || layout.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LayoutTab;
