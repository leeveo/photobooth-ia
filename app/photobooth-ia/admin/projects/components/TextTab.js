'use client';

import { useState } from 'react';

const TextTab = ({
  addElement,
  elements,
  selectedId,
  handleTextPropertyChange,
  showColorPicker,
  setShowColorPicker,
  selectedColor,
  setSelectedColor,
  colorPickerTarget,
  setColorPickerTarget,
  handleColorSelect,
  presetColors,
  availableFonts
}) => {
  const [textInput, setTextInput] = useState('Nouveau texte');
  
  // Get the currently selected text element if any
  const selectedTextElement = elements.find(
    el => el.id === selectedId && el.type === 'text'
  );

  const handleAddText = () => {
    addElement('text', null, 'Text Element', {
      text: textInput || 'Nouveau texte',
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#000000',
      width: 300,
      align: 'center'
    });
  };
  
  return (
    <div className="space-y-4">
      {/* Add new text section */}
      <div className="p-3 border border-gray-300 rounded-md bg-white">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Ajouter un texte</h4>
        <div className="space-y-3">
          <div>
            <label htmlFor="text-input" className="block text-xs text-gray-500 mb-1">
              Texte
            </label>
            <input
              id="text-input"
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Entrez votre texte ici"
            />
          </div>
          <button
            onClick={handleAddText}
            className="w-full px-3 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition-colors"
          >
            Ajouter un texte
          </button>
        </div>
      </div>
      
      {/* Text editing section - only show if a text element is selected */}
      {selectedTextElement && (
        <div className="p-3 border border-gray-300 rounded-md bg-white">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Éditer le texte</h4>
          <div className="space-y-3">
            <div>
              <label htmlFor="edit-text" className="block text-xs text-gray-500 mb-1">
                Texte
              </label>
              <input
                id="edit-text"
                type="text"
                value={selectedTextElement.text}
                onChange={(e) => handleTextPropertyChange('text', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="font-family" className="block text-xs text-gray-500 mb-1">
                Police
              </label>
              <select
                id="font-family"
                value={selectedTextElement.fontFamily || 'Arial'}
                onChange={(e) => handleTextPropertyChange('fontFamily', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {availableFonts.map((font) => (
                  <option key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="font-size" className="block text-xs text-gray-500 mb-1">
                Taille
              </label>
              <input
                id="font-size"
                type="number"
                min="8"
                max="120"
                value={selectedTextElement.fontSize || 20}
                onChange={(e) => handleTextPropertyChange('fontSize', parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="font-style" className="block text-xs text-gray-500 mb-1">
                Style
              </label>
              <select
                id="font-style"
                value={selectedTextElement.fontStyle || 'normal'}
                onChange={(e) => handleTextPropertyChange('fontStyle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="normal">Normal</option>
                <option value="bold">Gras</option>
                <option value="italic">Italique</option>
                <option value="bold italic">Gras Italique</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="text-align" className="block text-xs text-gray-500 mb-1">
                Alignement
              </label>
              <select
                id="text-align"
                value={selectedTextElement.align || 'center'}
                onChange={(e) => handleTextPropertyChange('align', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="left">Gauche</option>
                <option value="center">Centre</option>
                <option value="right">Droite</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Couleur
              </label>
              <button
                onClick={() => {
                  setColorPickerTarget('text');
                  setShowColorPicker(!showColorPicker);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm flex items-center justify-between"
              >
                <span>Sélectionner une couleur</span>
                <div
                  className="w-6 h-6 rounded-full border border-gray-400"
                  style={{ backgroundColor: selectedTextElement.fill }}
                />
              </button>
              
              {showColorPicker && colorPickerTarget === 'text' && (
                <div className="mt-2 p-3 border border-gray-300 rounded-md bg-white">
                  <div className="flex flex-wrap gap-2 mb-2">
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
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Couleur personnalisée</label>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default TextTab;
