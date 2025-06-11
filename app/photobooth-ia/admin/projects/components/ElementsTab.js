'use client';

import { useState } from 'react';

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
  // Define shapes that can be added
  const shapes = [
    { type: 'rect', name: 'Rectangle' },
    { type: 'circle', name: 'Cercle' },
    { type: 'ellipse', name: 'Ellipse' },
    { type: 'star', name: 'Étoile' },
    { type: 'regularPolygon', name: 'Polygone' },
    { type: 'arrow', name: 'Flèche' },
    { type: 'line', name: 'Ligne' },
    { type: 'arc', name: 'Arc' },
    { type: 'ring', name: 'Anneau' },
    { type: 'wedge', name: 'Secteur' }
  ];

  return (
    <div className="space-y-4">
      {/* Shapes section */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Formes</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {shapes.map((shape) => (
            <button
              key={shape.type}
              onClick={() => addElement(shape.type)}
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
            >
              <div className="h-12 w-full flex items-center justify-center">
                {/* Simple shape preview */}
                {shape.type === 'rect' && <div className="w-8 h-8 bg-blue-500 rounded-sm" />}
                {shape.type === 'circle' && <div className="w-8 h-8 bg-green-500 rounded-full" />}
                {shape.type === 'ellipse' && <div className="w-10 h-6 bg-purple-500 rounded-full" />}
                {shape.type === 'star' && <div className="text-yellow-500 text-2xl">★</div>}
                {shape.type === 'regularPolygon' && <div className="text-blue-500 text-2xl">⬡</div>}
                {shape.type === 'arrow' && <div className="text-red-500 text-2xl">→</div>}
                {shape.type === 'line' && <div className="w-10 h-0.5 bg-gray-800" />}
                {shape.type === 'arc' && <div className="text-yellow-600 text-2xl">◠</div>}
                {shape.type === 'ring' && <div className="text-teal-500 text-2xl">◯</div>}
                {shape.type === 'wedge' && <div className="text-orange-500 text-2xl">◔</div>}
              </div>
              <p className="text-xs mt-1 text-center">{shape.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Color picker for selected element */}
      {selectedId && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Couleurs</h4>
          
          <div className="flex flex-wrap gap-2 mb-3">
            <button 
              onClick={() => {
                setColorPickerTarget('fill');
                setShowColorPicker(!showColorPicker);
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md flex items-center"
            >
              <span className="mr-2">Remplissage</span>
              <div 
                className="w-5 h-5 rounded-full border border-gray-400" 
                style={{ backgroundColor: selectedColor }}
              />
            </button>
            
            <button 
              onClick={() => {
                setColorPickerTarget('stroke');
                setShowColorPicker(!showColorPicker);
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md flex items-center"
            >
              <span className="mr-2">Contour</span>
              <div 
                className="w-5 h-5 rounded-full border border-gray-400" 
                style={{ backgroundColor: selectedColor }}
              />
            </button>
          </div>
          
          {/* Color presets */}
          {showColorPicker && (
            <div className="p-3 border border-gray-300 rounded-md bg-white shadow-sm">
              <div className="flex flex-wrap gap-2">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorSelect(color)}
                    className="w-6 h-6 rounded-full border border-gray-400 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <div className="mt-2">
                <label className="block text-xs text-gray-700 mb-1">Couleur personnalisée</label>
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => handleColorSelect(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ElementsTab;
