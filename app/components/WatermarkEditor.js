"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';

// Simple canvas-based watermark editor without external dependencies
const WatermarkEditor = forwardRef(({ 
  initialElements = [],
  backgroundImage = '/samples/sample-portrait-1.jpg',
  canvasWidth = 800,
  canvasHeight = 1200,
  onUpdate,
  debug = false
}, ref) => {
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [dragMode, setDragMode] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef(null);
  const bgImageRef = useRef(null);
  const elementsRendered = useRef(false);
  const initialElementsRef = useRef(initialElements);
  
  // Expose functions through ref
  useImperativeHandle(ref, () => ({
    addTextElement: () => handleAddText(),
    addImageElement: (src) => handleAddImage(src),
    resetElements: () => setElements([]),
    getCurrentElements: () => elements,
    setElements: (newElements) => setElements(newElements)
  }));
  
  // Initialize with elements - FIXED to prevent infinite updates
  useEffect(() => {
    if (initialElements && initialElements.length > 0 && 
        JSON.stringify(initialElementsRef.current) !== JSON.stringify(initialElements)) {
      console.log('Initializing editor with elements:', initialElements);
      setElements(initialElements);
      initialElementsRef.current = initialElements;
    }
  }, [initialElements]);
  
  // Memoize renderCanvas with drawText and drawImage inside it
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bgImageRef.current) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background image
    ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
    
    // Inner function definitions to avoid dependency issues
    const drawText = (ctx, element, isSelected) => {
      ctx.save();
      
      // Apply transformations
      ctx.translate(element.x, element.y);
      if (element.rotation) {
        ctx.rotate((element.rotation * Math.PI) / 180);
      }
      
      // Set font properties
      const fontSize = element.fontSize || 24;
      const fontFamily = element.fontFamily || 'Arial';
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.fillStyle = element.color || '#FFFFFF';
      
      // Draw text
      ctx.fillText(element.text || 'Text', 0, 0);
      
      // Draw selection indicator if selected
      if (isSelected) {
        ctx.strokeStyle = '#00A0FF';
        ctx.lineWidth = 2;
        
        // Get approximate text width and height
        const metrics = ctx.measureText(element.text || 'Text');
        const width = metrics.width;
        const height = fontSize;
        
        ctx.strokeRect(-10, -height - 10, width + 20, height + 20);
      }
      
      ctx.restore();
    };
    
    const drawImage = (ctx, element, isSelected) => {
      // Skip if no image source
      if (!element.src) return;
      
      // Check if we need to load the image
      if (!element._imgCache) {
        // Create image and load it
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          element._imgCache = img;
          renderCanvas();
        };
        img.onerror = () => {
          console.error("Failed to load image element:", element.src);
        };
        img.src = element.src;
        return; // Wait for next render cycle
      }
      
      ctx.save();
      
      // Set opacity
      ctx.globalAlpha = element.opacity !== undefined ? element.opacity : 0.8;
      
      // Apply transformations
      ctx.translate(element.x, element.y);
      if (element.rotation) {
        ctx.rotate((element.rotation * Math.PI) / 180);
      }
      
      // Draw image
      const width = element.width || 100;
      const height = element.height || 100;
      ctx.drawImage(element._imgCache, -width/2, -height/2, width, height);
      
      // Draw selection indicator if selected
      if (isSelected) {
        ctx.strokeStyle = '#00A0FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(-width/2 - 5, -height/2 - 5, width + 10, height + 10);
      }
      
      ctx.restore();
    };
    
    // Draw elements
    elements.forEach((element, index) => {
      try {
        if (element.type === 'text') {
          drawText(ctx, element, index === elements.findIndex(el => el.id === selectedElement?.id));
        } else if (element.type === 'image') {
          drawImage(ctx, element, index === elements.findIndex(el => el.id === selectedElement?.id));
        }
      } catch (error) {
        console.error("Error rendering element:", error);
      }
    });
    
    elementsRendered.current = true;
  }, [elements, selectedElement]);

  // Load background image - Only rerun if backgroundImage URL changes
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      bgImageRef.current = img;
      renderCanvas();
    };
    img.onerror = () => {
      console.error("Failed to load background image:", backgroundImage);
    };
    img.src = backgroundImage;
  }, [backgroundImage, renderCanvas]);

  // Render canvas when elements change - Add all relevant dependencies
  useEffect(() => {
    if (elements.length > 0) {
      elementsRendered.current = false;
      renderCanvas();
      if (onUpdate) onUpdate(elements);
    }
  }, [elements, onUpdate, renderCanvas]);

  // Add a new text element
  const handleAddText = () => {
    const newElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      text: 'Double-click to edit',
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      fontSize: 24,
      fontFamily: 'Arial',
      color: '#FFFFFF',
    };
    
    setElements(prevElements => [...prevElements, newElement]);
    setSelectedElement(newElement);
  };

  // Add a new image element
  const handleAddImage = (src) => {
    if (!src) return;
    
    const newElement = {
      id: `image-${Date.now()}`,
      type: 'image',
      src: src,
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      width: 100,
      height: 100,
      opacity: 0.8,
    };
    
    setElements(prevElements => [...prevElements, newElement]);
    setSelectedElement(newElement);
  };

  // Handle mouse down for element selection and dragging
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    // Check if we clicked on an element (check in reverse to handle z-index)
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      if (isPointInElement(x, y, element)) {
        setSelectedElement(element);
        setDragMode(true);
        setDragOffset({ 
          x: x - element.x, 
          y: y - element.y 
        });
        return;
      }
    }
    
    // If click was not on any element, deselect
    setSelectedElement(null);
  };

  // Handle mouse move for dragging
  const handleMouseMove = (e) => {
    if (!dragMode || !selectedElement) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    // Update element position using functional state update to avoid stale closures
    setElements(prevElements => prevElements.map(el => {
      if (el.id === selectedElement.id) {
        return {
          ...el,
          x: x - dragOffset.x,
          y: y - dragOffset.y
        };
      }
      return el;
    }));
  };

  // Handle mouse up to end dragging
  const handleMouseUp = () => {
    setDragMode(false);
  };

  // Handle double click for text editing
  const handleDoubleClick = (e) => {
    if (!selectedElement || selectedElement.type !== 'text') return;
    
    const newText = prompt("Edit text:", selectedElement.text);
    if (newText !== null) {
      setElements(prevElements => prevElements.map(el => {
        if (el.id === selectedElement.id) {
          return { ...el, text: newText };
        }
        return el;
      }));
    }
  };

  // Handle key press for element deletion - Move event handlers to useEffect
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' && selectedElement) {
        setElements(prevElements => prevElements.filter(el => el.id !== selectedElement.id));
        setSelectedElement(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElement]); // Only depend on selectedElement

  return (
    <div className="watermark-editor relative">
      {/* Element controls */}
      <div className="mb-4 flex gap-2 justify-center">
        <button
          onClick={handleAddText}
          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
        >
          Ajouter du texte
        </button>
        {/* Fix unescaped apostrophe in the file input label */}
        <label className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm cursor-pointer">
          Ajouter une image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (event) => {
                  handleAddImage(event.target.result);
                };
                reader.readAsDataURL(file);
              }
            }}
          />
        </label>
      </div>
      
      {/* Canvas */}
      <div className="relative border border-gray-300 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="w-full object-contain"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          style={{ maxHeight: 'calc(100vh - 250px)' }}
        />
      </div>
      
      {/* Element properties panel */}
      {selectedElement && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Propriétés de l&apos;élément</h4>
          
          {selectedElement.type === 'text' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500">Texte</label>
                <input
                  type="text"
                  value={selectedElement.text || ''}
                  onChange={(e) => {
                    setElements(elements.map(el => 
                      el.id === selectedElement.id ? { ...el, text: e.target.value } : el
                    ));
                  }}
                  className="w-full px-3 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Couleur</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={selectedElement.color || '#FFFFFF'}
                    onChange={(e) => {
                      setElements(elements.map(el => 
                        el.id === selectedElement.id ? { ...el, color: e.target.value } : el
                      ));
                    }}
                    className="w-10 h-8"
                  />
                  <input
                    type="text"
                    value={selectedElement.color || '#FFFFFF'}
                    onChange={(e) => {
                      setElements(elements.map(el => 
                        el.id === selectedElement.id ? { ...el, color: e.target.value } : el
                      ));
                    }}
                    className="w-full px-3 py-1 border rounded text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500">Taille du texte</label>
                <input
                  type="range"
                  min="10"
                  max="72"
                  value={selectedElement.fontSize || 24}
                  onChange={(e) => {
                    setElements(elements.map(el => 
                      el.id === selectedElement.id ? { ...el, fontSize: parseInt(e.target.value) } : el
                    ));
                  }}
                  className="w-full"
                />
                <div className="text-xs text-right">{selectedElement.fontSize || 24}px</div>
              </div>
            </div>
          )}
          
          {selectedElement.type === 'image' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500">Opacité</label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={selectedElement.opacity || 0.8}
                  onChange={(e) => {
                    setElements(elements.map(el => 
                      el.id === selectedElement.id ? { ...el, opacity: parseFloat(e.target.value) } : el
                    ));
                  }}
                  className="w-full"
                />
                <div className="text-xs text-right">{(selectedElement.opacity || 0.8) * 100}%</div>
              </div>
              <div>
                <label className="block text-xs text-gray-500">Taille</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400">Largeur</label>
                    <input
                      type="number"
                      value={selectedElement.width || 100}
                      onChange={(e) => {
                        setElements(elements.map(el => 
                          el.id === selectedElement.id ? { ...el, width: parseInt(e.target.value) } : el
                        ));
                      }}
                      className="w-full px-3 py-1 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400">Hauteur</label>
                    <input
                      type="number"
                      value={selectedElement.height || 100}
                      onChange={(e) => {
                        setElements(elements.map(el => 
                          el.id === selectedElement.id ? { ...el, height: parseInt(e.target.value) } : el
                        ));
                      }}
                      className="w-full px-3 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={() => {
              setElements(elements.filter(el => el.id !== selectedElement.id));
              setSelectedElement(null);
            }}
            className="mt-3 px-2 py-1 bg-red-100 text-red-700 text-xs rounded"
          >
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
});

WatermarkEditor.displayName = 'WatermarkEditor';

export default WatermarkEditor;
