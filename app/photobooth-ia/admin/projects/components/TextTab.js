'use client';

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
  const currentTextElement = elements.find(el => el.id === selectedId) || {};

  const initRichTextEditor = () => {
    // Logique pour initialiser l'éditeur de texte enrichi
    console.log('Initialiser l\'éditeur de texte enrichi');
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Ajouter du texte</h4>
        
        {/* Text buttons with icons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Simple Text Button */}
          <button
            onClick={() => addElement('text', null, 'Nouveau texte')}
            className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors bg-white"
          >
            <div className="text-gray-800 mb-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 7V4H20V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 20H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 4V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-medium">Texte simple</span>
          </button>
          
          {/* Rich Text Button */}
          <button
            onClick={initRichTextEditor}
            className="flex flex-col items-center justify-center p-4 border border-indigo-200 rounded-md bg-indigo-50 hover:bg-indigo-100 transition-colors text-indigo-700"
          >
            <div className="text-indigo-600 mb-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 7H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M4 17H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-sm font-medium">Texte formaté</span>
          </button>
        </div>

        {/* Text Presets - Nouvelle section */}
        <div className="mb-4">
          <h5 className="text-xs font-medium text-gray-600 mb-2">Styles de texte prédéfinis</h5>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => addElement('text', null, 'Titre')}
              className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="text-lg font-bold text-center">Titre</div>
            </button>
            <button
              onClick={() => {
                const newElement = {
                  type: 'text',
                  text: 'Sous-titre',
                  fontSize: 16,
                  fontFamily: 'Georgia',
                  fontStyle: 'italic',
                  fill: '#555555'
                };
                addElement('text', null, 'Sous-titre', newElement);
              }}
              className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="text-base italic font-medium text-center" style={{ fontFamily: 'Georgia' }}>Sous-titre</div>
            </button>
            <button
              onClick={() => {
                const newElement = {
                  type: 'text',
                  text: 'Citation',
                  fontSize: 14,
                  fontFamily: 'Times New Roman',
                  fontStyle: 'italic',
                  fill: '#666666'
                };
                addElement('text', null, 'Citation', newElement);
              }}
              className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="text-sm italic text-center" style={{ fontFamily: 'Times New Roman' }}>Citation</div>
            </button>
          </div>
        </div>
        
        {selectedId && currentTextElement ? (
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Propriétés du texte</h4>
            
            {/* Text Content */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Contenu du texte
              </label>
              <textarea
                value={currentTextElement.text || ''}
                onChange={(e) => handleTextPropertyChange('text', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                rows={3}
              />
            </div>
            
            {/* Font Family - Amélioré avec des styles visuels */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Police
              </label>
              <div className="relative">
                <select
                  value={currentTextElement.fontFamily || 'Arial'}
                  onChange={(e) => handleTextPropertyChange('fontFamily', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm appearance-none pr-10"
                  style={{ fontFamily: currentTextElement.fontFamily || 'Arial' }}
                >
                  {availableFonts.map(font => (
                    <option key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              {/* Prévisualisation de la police */}
              <div 
                className="mt-2 p-2 border border-gray-200 rounded text-center bg-white"
                style={{ fontFamily: currentTextElement.fontFamily || 'Arial' }}
              >
                <span className="text-sm">Prévisualisation de {currentTextElement.fontFamily || 'Arial'}</span>
              </div>
            </div>
            
            {/* Font Size - Avec des préréglages rapides */}
            <div>
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-gray-700">
                  Taille
                </label>
                <div className="flex space-x-1">
                  <button 
                    onClick={() => handleTextPropertyChange('fontSize', 12)}
                    className={`px-2 py-0.5 text-xs border rounded ${
                      (currentTextElement.fontSize || 20) === 12 
                        ? 'bg-indigo-100 border-indigo-300 text-indigo-700' 
                        : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    S
                  </button>
                  <button 
                    onClick={() => handleTextPropertyChange('fontSize', 20)}
                    className={`px-2 py-0.5 text-xs border rounded ${
                      (currentTextElement.fontSize || 20) === 20 
                        ? 'bg-indigo-100 border-indigo-300 text-indigo-700' 
                        : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    M
                  </button>
                  <button 
                    onClick={() => handleTextPropertyChange('fontSize', 32)}
                    className={`px-2 py-0.5 text-xs border rounded ${
                      (currentTextElement.fontSize || 20) === 32 
                        ? 'bg-indigo-100 border-indigo-300 text-indigo-700' 
                        : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    L
                  </button>
                  <button 
                    onClick={() => handleTextPropertyChange('fontSize', 48)}
                    className={`px-2 py-0.5 text-xs border rounded ${
                      (currentTextElement.fontSize || 20) === 48 
                        ? 'bg-indigo-100 border-indigo-300 text-indigo-700' 
                        : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    XL
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <input
                  type="range"
                  min="8"
                  max="100"
                  value={currentTextElement.fontSize || 20}
                  onChange={(e) => handleTextPropertyChange('fontSize', parseInt(e.target.value))}
                  className="flex-grow"
                />
                <div className="w-12 px-2 py-1 bg-gray-100 rounded-md text-center text-sm font-medium">
                  {currentTextElement.fontSize || 20}px
                </div>
              </div>
              {/* Prévisualisation de la taille */}
              <div className="mt-1 h-10 border border-gray-200 rounded bg-white flex items-center justify-center overflow-hidden">
                <span style={{ 
                  fontSize: `${Math.min((currentTextElement.fontSize || 20), 48)}px`,
                  fontFamily: currentTextElement.fontFamily || 'Arial',
                  fontStyle: currentTextElement.fontStyle?.includes('italic') ? 'italic' : 'normal',
                  fontWeight: currentTextElement.fontStyle?.includes('bold') ? 'bold' : 'normal'
                }}>
                  Aa
                </span>
              </div>
            </div>
            
            {/* Letter Spacing - Nouveau contrôle */}
            <div>
              <label className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                <span>Espacement des lettres</span>
                <span>{currentTextElement.letterSpacing || 0}px</span>
              </label>
              <input
                type="range"
                min="-5"
                max="10"
                value={currentTextElement.letterSpacing || 0}
                onChange={(e) => handleTextPropertyChange('letterSpacing', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            
            {/* Line Height - Nouveau contrôle */}
            <div>
              <label className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                <span>Hauteur de ligne</span>
                <span>{currentTextElement.lineHeight || 1}×</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={currentTextElement.lineHeight || 1}
                onChange={(e) => handleTextPropertyChange('lineHeight', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            
            {/* Text Alignment */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Alignement
              </label>
              <div className="flex border border-gray-300 rounded-md overflow-hidden">
                <button
                  onClick={() => handleTextPropertyChange('align', 'left')}
                  className={`flex-1 py-2 px-3 ${currentTextElement.align === 'left' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-700'}`}
                >
                  <div className="flex justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 6H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M4 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                </button>
                <button
                  onClick={() => handleTextPropertyChange('align', 'center')}
                  className={`flex-1 py-2 px-3 ${currentTextElement.align === 'center' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-700'}`}
                >
                  <div className="flex justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 6H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                </button>
                <button
                  onClick={() => handleTextPropertyChange('align', 'right')}
                  className={`flex-1 py-2 px-3 ${currentTextElement.align === 'right' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-700'}`}
                >
                  <div className="flex justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 6H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M10 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                </button>
              </div>
            </div>
            
            {/* Text Style - Amélioré avec plus d'options */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Style
              </label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    const currentStyle = currentTextElement.fontStyle || 'normal';
                    const newStyle = currentStyle.includes('bold') 
                      ? currentStyle.replace('bold', '').trim() || 'normal'
                      : (currentStyle === 'normal' ? 'bold' : `${currentStyle} bold`);
                    handleTextPropertyChange('fontStyle', newStyle);
                  }}
                  className={`py-2 px-3 border border-gray-300 rounded-md ${
                    currentTextElement.fontStyle?.includes('bold') 
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-300' 
                      : 'bg-white text-gray-700'
                  }`}
                >
                  <div className="flex justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 12H14C16.2091 12 18 10.2091 18 8C18 5.79086 16.2091 4 14 4H6V12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 12H15C17.2091 12 19 13.7909 19 16C19 18.2091 17.2091 20 15 20H6V12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>
                <button
                  onClick={() => {
                    const currentStyle = currentTextElement.fontStyle || 'normal';
                    const newStyle = currentStyle.includes('italic') 
                      ? currentStyle.replace('italic', '').trim() || 'normal'
                      : (currentStyle === 'normal' ? 'italic' : `${currentStyle} italic`);
                    handleTextPropertyChange('fontStyle', newStyle);
                  }}
                  className={`py-2 px-3 border border-gray-300 rounded-md ${
                    currentTextElement.fontStyle?.includes('italic') 
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-300' 
                      : 'bg-white text-gray-700'
                  }`}
                >
                  <div className="flex justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 4H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 20H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M15 4L9 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>
                <button
                  onClick={() => {
                    const currentStyle = currentTextElement.fontStyle || 'normal';
                    const newStyle = currentStyle.includes('underline') 
                      ? currentStyle.replace('underline', '').trim() || 'normal'
                      : (currentStyle === 'normal' ? 'underline' : `${currentStyle} underline`);
                    handleTextPropertyChange('fontStyle', newStyle);
                    // Ajouter aussi la propriété textDecoration
                    handleTextPropertyChange('textDecoration', currentTextElement.textDecoration === 'underline' ? '' : 'underline');
                  }}
                  className={`py-2 px-3 border border-gray-300 rounded-md ${
                    currentTextElement.fontStyle?.includes('underline') || currentTextElement.textDecoration === 'underline'
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-300' 
                      : 'bg-white text-gray-700'
                  }`}
                >
                  <div className="flex justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 10V4H18V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 21H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 4V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>
                <button
                  onClick={() => {
                    // Toggle de la propriété uppercase/lowercase
                    if (!currentTextElement.textTransform || currentTextElement.textTransform === 'none') {
                      handleTextPropertyChange('textTransform', 'uppercase');
                    } else if (currentTextElement.textTransform === 'uppercase') {
                      handleTextPropertyChange('textTransform', 'lowercase');
                    } else {
                      handleTextPropertyChange('textTransform', 'none');
                    }
                  }}
                  className={`py-2 px-3 border border-gray-300 rounded-md ${
                    currentTextElement.textTransform && currentTextElement.textTransform !== 'none'
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-300' 
                      : 'bg-white text-gray-700'
                  }`}
                >
                  <div className="flex justify-center">
                    {!currentTextElement.textTransform || currentTextElement.textTransform === 'none' ? (
                      <span className="font-bold">Aa</span>
                    ) : currentTextElement.textTransform === 'uppercase' ? (
                      <span className="font-bold">AA</span>
                    ) : (
                      <span className="font-bold">aa</span>
                    )}
                  </div>
                </button>
              </div>
            </div>
            
            {/* Text Color */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Couleur
              </label>
              <div className="flex items-center space-x-2">
                <div 
                  className="w-8 h-8 rounded-md border border-gray-300 cursor-pointer" 
                  style={{ backgroundColor: currentTextElement.fill || '#000000' }}
                  onClick={() => {
                    setColorPickerTarget('text');
                    setSelectedColor(currentTextElement.fill || '#000000');
                    setShowColorPicker(!showColorPicker);
                  }}
                ></div>
                <input
                  type="text"
                  value={currentTextElement.fill || '#000000'}
                  onChange={(e) => handleTextPropertyChange('fill', e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              {showColorPicker && colorPickerTarget === 'text' && (
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
            
            {/* Width for text wrapping */}
            <div>
              <label className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                <span>Largeur</span>
                <span>{currentTextElement.width || 200}px</span>
              </label>
              <input
                type="range"
                min="50"
                max="500"
                value={currentTextElement.width || 200}
                onChange={(e) => handleTextPropertyChange('width', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500">
            Sélectionnez un texte ou ajoutez-en un nouveau pour le modifier
          </p>
        )}
      </div>
      
      {/* Rich Text Editor Modal */}
      {/* ...existing code... */}
    </div>
  );
};

export default TextTab;
