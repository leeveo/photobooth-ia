'use client';

import { useState } from 'react';

const LayoutTab = ({
  projectId,
  savedLayouts,
  loadLayout,
  saveLayout,
  setLayoutName,
  layoutName,
  elements,
  stageSize,
  setSavedLayouts
}) => {
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDeleteLayout = async (layoutId) => {
    if (confirmDelete === layoutId) {
      // This would be replaced with actual delete logic when backend is ready
      try {
        // Simulate removing the layout from the savedLayouts array
        const updatedLayouts = savedLayouts.filter(layout => layout.id !== layoutId);
        setSavedLayouts(updatedLayouts);
        setConfirmDelete(null);
      } catch (error) {
        console.error('Error deleting layout:', error);
      }
    } else {
      // First click sets the layout to confirm
      setConfirmDelete(layoutId);
      // Reset confirmation after 3 seconds
      setTimeout(() => setConfirmDelete(null), 3000);
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
        <h4 className="text-sm font-medium text-gray-700 mb-2">Enregistrer le layout actuel</h4>
        <div className="flex space-x-2">
          <input
            type="text"
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            placeholder="Nom du layout"
            className="flex-grow px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <button
            onClick={saveLayout}
            disabled={!layoutName.trim()}
            className={`px-4 py-2 rounded-md text-sm ${
              layoutName.trim()
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Enregistrer
          </button>
        </div>
      </div>

      <div className="p-3 border border-gray-300 rounded-md bg-white">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Layouts sauvegardés</h4>
        
        {savedLayouts.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Aucun layout sauvegardé</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {savedLayouts.map((layout) => (
              <div 
                key={layout.id} 
                className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-medium text-sm text-gray-800">{layout.name}</h5>
                    <p className="text-xs text-gray-500">
                      {formatDate(layout.created_at)}
                    </p>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => loadLayout(layout.id)}
                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Charger
                    </button>
                    <button
                      onClick={() => handleDeleteLayout(layout.id)}
                      className={`px-2 py-1 text-xs rounded ${
                        confirmDelete === layout.id
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {confirmDelete === layout.id ? 'Confirmer' : 'Supprimer'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LayoutTab;
