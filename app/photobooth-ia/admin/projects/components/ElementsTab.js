'use client';

import { useState } from 'react';

// Composant principal pour l'onglet Elements
const ElementsTab = ({ 
  addElement, 
  elements, 
  selectedId, 
  handleColorSelect, 
  showColorPicker, 
  setShowColorPicker, 
  selectedColor, 
  setSelectedColor, 
  colorPickerTarget, 
  setColorPickerTarget,
  presetColors
}) => {
  // État local pour la gestion des propriétés
  const [shapeProps, setShapeProps] = useState({
    fill: '#000000',
    stroke: '#000000',
    strokeWidth: 2
  });

  // Fonction pour gérer les changements de propriétés de forme
  const handleShapePropertyChange = (property, value) => {
    // Mettre à jour l'état local
    setShapeProps(prev => ({
      ...prev,
      [property]: value
    }));
    
    // Mise à jour de l'élément sélectionné
    if (!selectedId) return;
    
    if (property === 'fill' || property === 'stroke' || property === 'strokeWidth') {
      // Pour ces propriétés, on met directement à jour l'élément
      if (elements && elements.length > 0) {
        const updatedElements = elements.map(el => {
          if (el.id === selectedId) {
            return {
              ...el,
              [property]: value
            };
          }
          return el;
        });
        
        // Cette fonction sera passée en props par le parent pour mettre à jour les éléments
        // setElements(updatedElements);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Formes</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            onClick={() => addElement('rect', null, 'Rectangle')}
            className="p-2 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
          >
            <div className="bg-blue-500 w-full h-6 rounded"></div>
            <span className="text-xs mt-1 block">Rectangle</span>
          </button>
          <button
            onClick={() => addElement('circle', null, 'Cercle')}
            className="p-2 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
          >
            <div className="flex justify-center items-center h-6">
              <div className="bg-green-500 w-6 h-6 rounded-full"></div>
            </div>
            <span className="text-xs mt-1 block">Cercle</span>
          </button>
          <button
            onClick={() => addElement('ellipse', null, 'Ellipse')}
            className="p-2 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
          >
            <div className="flex justify-center items-center h-6">
              <div className="bg-purple-500 w-10 h-5 rounded-full"></div>
            </div>
            <span className="text-xs mt-1 block">Ellipse</span>
          </button>
          <button
            onClick={() => addElement('arc', null, 'Arc')}
            className="p-2 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
          >
            <div className="flex justify-center items-center h-6">
              <div className="relative w-6 h-6">
                <div className="absolute top-0 left-0 border-t-4 border-l-4 border-yellow-500 rounded-tl-full w-6 h-6"></div>
              </div>
            </div>
            <span className="text-xs mt-1 block">Arc</span>
          </button>
          <button
            onClick={() => addElement('arrow', null, 'Flèche')}
            className="p-2 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
          >
            <div className="flex justify-center items-center h-6">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-500">
                <path fillRule="evenodd" d="M12.97 3.97a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 11-1.06-1.06l6.22-6.22H3a.75.75 0 010-1.5h16.19l-6.22-6.22a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs mt-1 block">Flèche</span>
          </button>
          <button
            onClick={() => addElement('star', null, 'Étoile')}
            className="p-2 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
          >
            <div className="flex justify-center items-center h-6">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-amber-500">
                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs mt-1 block">Étoile</span>
          </button>
          <button
            onClick={() => addElement('ring', null, 'Anneau')}
            className="p-2 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
          >
            <div className="flex justify-center items-center h-6">
              <div className="bg-white border-2 border-teal-500 w-6 h-6 rounded-full"></div>
            </div>
            <span className="text-xs mt-1 block">Anneau</span>
          </button>
          <button
            onClick={() => addElement('regularPolygon', null, 'Polygone')}
            className="p-2 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
          >
            <div className="flex justify-center items-center h-6">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-indigo-500">
                <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198c.03-.028.061-.056.091-.086L12 5.43z" />
              </svg>
            </div>
            <span className="text-xs mt-1 block">Polygone</span>
          </button>
          <button
            onClick={() => addElement('line', null, 'Ligne')}
            className="p-2 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
          >
            <div className="flex justify-center items-center h-6">
              <div className="bg-gray-700 h-0.5 w-10"></div>
            </div>
            <span className="text-xs mt-1 block">Ligne</span>
          </button>
          <button
            onClick={() => addElement('wedge', null, 'Secteur')}
            className="p-2 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
          >
            <div className="flex justify-center items-center h-6">
              <div className="relative w-6 h-6">
                <div className="absolute w-0 h-0 border-t-[24px] border-t-transparent border-r-[24px] border-r-orange-500"></div>
              </div>
            </div>
            <span className="text-xs mt-1 block">Secteur</span>
          </button>
        </div>
      </div>
      
      {/* Show properties for selected element */}
      {selectedId && (
        <div className="mt-3 border-t pt-3 border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Propriétés de {elements.find(el => el.id === selectedId)?.type === 'text' ? 'texte' : 'forme'}
          </h4>
          
          {/* Propriétés communes pour les formes */}
          {elements.find(el => el.id === selectedId) && elements.find(el => el.id === selectedId).type !== 'text' && (
            <div className="space-y-3">
              {/* Fill Color */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Couleur de remplissage
                </label>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-8 h-8 rounded-md border border-gray-300 cursor-pointer" 
                    style={{ backgroundColor: elements.find(el => el.id === selectedId)?.fill || '#000000' }}
                    onClick={() => {
                      setColorPickerTarget('fill');
                      setSelectedColor(elements.find(el => el.id === selectedId)?.fill || '#000000');
                      setShowColorPicker(!showColorPicker);
                    }}
                  ></div>
                  <input
                    type="text"
                    value={elements.find(el => el.id === selectedId)?.fill || '#000000'}
                    onChange={(e) => handleShapePropertyChange('fill', e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                
                {showColorPicker && colorPickerTarget === 'fill' && (
                  <div className="mt-2 p-2 bg-white border border-gray-300 rounded-md shadow-lg">
                    <div className="grid grid-cols-5 gap-1">
                      {presetColors.map(color => (
                        <div
                          key={color}
                          className="w-6 h-6 rounded-md cursor-pointer border border-gray-300"
                          style={{ backgroundColor: color }}
                          onClick={() => handleColorSelect(color)}
                        ></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Stroke Color */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Couleur de bordure
                </label>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-8 h-8 rounded-md border border-gray-300 cursor-pointer" 
                    style={{ backgroundColor: elements.find(el => el.id === selectedId)?.stroke || 'transparent' }}
                    onClick={() => {
                      setColorPickerTarget('stroke');
                      setSelectedColor(elements.find(el => el.id === selectedId)?.stroke || 'transparent');
                      setShowColorPicker(!showColorPicker);
                    }}
                  ></div>
                  <input
                    type="text"
                    value={elements.find(el => el.id === selectedId)?.stroke || 'transparent'}
                    onChange={(e) => handleShapePropertyChange('stroke', e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                
                {showColorPicker && colorPickerTarget === 'stroke' && (
                  <div className="mt-2 p-2 bg-white border border-gray-300 rounded-md shadow-lg">
                    <div className="grid grid-cols-5 gap-1">
                      {presetColors.map(color => (
                        <div
                          key={color}
                          className="w-6 h-6 rounded-md cursor-pointer border border-gray-300"
                          style={{ backgroundColor: color }}
                          onClick={() => handleColorSelect(color)}
                        ></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Stroke Width */}
              <div>
                <label className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                  <span>Épaisseur de bordure</span>
                  <span>{elements.find(el => el.id === selectedId)?.strokeWidth || 0}px</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={elements.find(el => el.id === selectedId)?.strokeWidth || 0}
                  onChange={(e) => handleShapePropertyChange('strokeWidth', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              {/* Propriétés spécifiques pour chaque type de forme */}
              {elements.find(el => el.id === selectedId)?.type === 'rect' && (
                <div className="space-y-3">
                  <div>
                    <label className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                      <span>Largeur</span>
                      <span>{elements.find(el => el.id === selectedId)?.width || 100}px</span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="500"
                      value={elements.find(el => el.id === selectedId)?.width || 100}
                      onChange={(e) => handleShapePropertyChange('width', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                      <span>Hauteur</span>
                      <span>{elements.find(el => el.id === selectedId)?.height || 100}px</span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="500"
                      value={elements.find(el => el.id === selectedId)?.height || 100}
                      onChange={(e) => handleShapePropertyChange('height', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                      <span>Coins arrondis</span>
                      <span>{elements.find(el => el.id === selectedId)?.cornerRadius || 0}px</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={elements.find(el => el.id === selectedId)?.cornerRadius || 0}
                      onChange={(e) => handleShapePropertyChange('cornerRadius', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
              
              {elements.find(el => el.id === selectedId)?.type === 'circle' && (
                <div>
                  <label className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                    <span>Rayon</span>
                    <span>{elements.find(el => el.id === selectedId)?.radius || 50}px</span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="200"
                    value={elements.find(el => el.id === selectedId)?.radius || 50}
                    onChange={(e) => handleShapePropertyChange('radius', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
              
              {/* Ajouter des contrôles pour d'autres types de formes ici */}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ElementsTab;
