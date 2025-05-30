"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Image, Transformer } from 'react-konva';
import { useImage } from 'react-konva-utils';

// Create separate component for image elements to properly use the useImage hook
const ImageElement = ({ element, isSelected, onSelect, onDragEnd, onTransformEnd }) => {
  const [image, status] = useImage(element.src);
  
  return (
    <Image
      id={element.id}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      image={image}
      draggable
      onClick={() => onSelect(element.id)}
      onTap={() => onSelect(element.id)}
      onDragEnd={(e) => onDragEnd(e, element.id)}
      onTransformEnd={() => onTransformEnd(element.id)}
      opacity={element.opacity}
      rotation={element.rotation || 0}
      perfectDrawEnabled={false}
      alt={element.alt || "Watermark image"}
    />
  );
};

const WatermarkEditorKonva = forwardRef(({ 
  initialElements = [],
  backgroundImage = '/samples/sample-portrait-1.jpg',
  canvasWidth = 800,
  canvasHeight = 1200,
  onUpdate,
  debug = false
}, ref) => {
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [newElementType, setNewElementType] = useState(null);
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  
  const stageRef = useRef();
  const transformerRef = useRef();
  const layerRef = useRef();
  const [bgImage, bgStatus] = useImage(backgroundImage);
  
  // Expose functions through ref
  useImperativeHandle(ref, () => ({
    addTextElement: () => handleAddElement('text'),
    addImageElement: (src) => handleAddElement('image', { src }),
    resetElements: () => setElements([]),
    getCurrentElements: () => elements,
    setElements: (newElements) => setElements(newElements)
  }));
  
  // Initialize with initial elements
  useEffect(() => {
    if (initialElements && initialElements.length > 0) {
      console.log('Initializing editor with elements:', initialElements);
      setElements(initialElements);
    }
  }, [initialElements]);
  
  // Update background image when it changes
  useEffect(() => {
    if (bgStatus === 'loaded') {
      setBackgroundLoaded(true);
      // When background loads, adjust stage if needed
      const container = stageRef.current?.container();
      if (container) {
        const containerWidth = container.offsetWidth;
        if (containerWidth < canvasWidth) {
          const scale = containerWidth / canvasWidth;
          setStageScale(scale);
        }
      }
    }
  }, [bgStatus, backgroundImage, canvasWidth]);
  
  // When selection changes, update transformer
  useEffect(() => {
    if (selectedId === null) {
      transformerRef.current?.nodes([]);
      return;
    }
    
    // Find the selected node
    const selectedNode = layerRef.current?.findOne('#' + selectedId);
    if (selectedNode) {
      transformerRef.current?.nodes([selectedNode]);
    }
  }, [selectedId]);
  
  // Call onUpdate when elements change
  useEffect(() => {
    if (onUpdate && elements) {
      onUpdate(elements);
    }
  }, [elements, onUpdate]);
  
  // Add element handler
  const handleAddElement = (type, props = {}) => {
    const id = type + '-' + Date.now();
    
    // Default properties based on element type
    let newElement = {
      id,
      type,
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      ...props
    };
    
    // Add type-specific default properties
    if (type === 'text') {
      newElement = {
        ...newElement,
        text: props.text || 'Double-cliquez pour éditer',
        fontSize: props.fontSize || 24,
        fontFamily: props.fontFamily || 'Arial',
        fill: props.color || '#FFFFFF',
        color: props.color || '#FFFFFF', // For compatibility
        draggable: true,
        width: props.width || 200,
      };
    } else if (type === 'image') {
      const logoWidth = props.width || 100;
      const logoHeight = props.height || 100;
      
      newElement = {
        ...newElement,
        width: logoWidth,
        height: logoHeight,
        opacity: props.opacity !== undefined ? props.opacity : 0.8,
        src: props.src || '/placeholder.png',
        x: props.x !== undefined ? props.x : (canvasWidth / 2) - (logoWidth / 2),
        y: props.y !== undefined ? props.y : (canvasHeight / 2) - (logoHeight / 2),
        draggable: true,
      };
    }
    
    setElements(prev => [...prev, newElement]);
    setSelectedId(id);
    setNewElementType(null);
  };
  
  // Handle element selection
  const checkDeselect = (e) => {
    const clickedOnEmpty = e.target === e.target.getStage() || e.target === layerRef.current;
    if (clickedOnEmpty) {
      setSelectedId(null);
    }
  };
  
  // Handle element deletion with Delete key
  const handleKeyDown = useCallback((e) => {
    if (e.keyCode === 46 && selectedId) {
      setElements(prev => prev.filter(el => el.id !== selectedId));
      setSelectedId(null);
    }
  }, [selectedId]);
  
  // Set up keyboard listeners with proper dependency
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]); // Now includes handleKeyDown
  
  // Handle text editing
  const handleTextDblClick = (e, element) => {
    const textNode = e.target;
    
    // Create textarea over the text element
    const textPosition = textNode.absolutePosition();
    const stageBox = stageRef.current.container().getBoundingClientRect();
    
    const areaPosition = {
      x: stageBox.left + textPosition.x * stageScale + stagePosition.x,
      y: stageBox.top + textPosition.y * stageScale + stagePosition.y
    };
    
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    
    // Style the textarea
    textarea.value = element.text;
    textarea.style.position = 'absolute';
    textarea.style.top = `${areaPosition.y}px`;
    textarea.style.left = `${areaPosition.x}px`;
    textarea.style.width = `${textNode.width() * stageScale}px`;
    textarea.style.height = `${textNode.height() * stageScale}px`;
    textarea.style.fontSize = `${element.fontSize * stageScale}px`;
    textarea.style.fontFamily = element.fontFamily;
    textarea.style.border = '1px solid #333';
    textarea.style.padding = '5px';
    textarea.style.overflow = 'hidden';
    textarea.style.resize = 'none';
    textarea.style.outline = 'none';
    textarea.style.background = 'rgba(255,255,255,0.9)';
    textarea.style.color = '#333';
    textarea.style.zIndex = 1000;
    
    // Focus the textarea
    textarea.focus();
    
    // Handle text update
    const handleTextChange = () => {
      setElements(prev => prev.map(el => 
        el.id === element.id ? { ...el, text: textarea.value } : el
      ));
      document.body.removeChild(textarea);
    };
    
    textarea.addEventListener('blur', handleTextChange);
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        textarea.blur();
      }
    });
  };
  
  // Handle element dragging
  const handleDragEnd = (e, id) => {
    const update = elements.map(el => 
      el.id === id ? { ...el, x: e.target.x(), y: e.target.y() } : el
    );
    setElements(update);
  };
  
  // Handle transform (resize/rotate)
  const handleTransformEnd = (id) => {
    const node = layerRef.current.findOne('#' + id);
    if (!node) return;
    
    const update = elements.map(el => {
      if (el.id !== id) return el;
      
      let updatedEl = { 
        ...el,
        x: node.x(), 
        y: node.y(),
        rotation: node.rotation()
      };
      
      if (el.type === 'text') {
        updatedEl = {
          ...updatedEl,
          width: node.width() * node.scaleX(),
          fontSize: el.fontSize * node.scaleX(),
        };
      } else if (el.type === 'image') {
        updatedEl = {
          ...updatedEl,
          width: Math.max(5, el.width * node.scaleX()),
          height: Math.max(5, el.height * node.scaleY()),
        };
      }
      
      return updatedEl;
    });
    
    setElements(update);
    
    // Reset scale for the node itself, since we applied it to the element properties
    if (node) {
      node.scaleX(1);
      node.scaleY(1);
    }
  };
  
  // Handle mouse wheel for zooming
  const handleWheel = (e) => {
    e.evt.preventDefault();
    
    const scaleBy = 1.1;
    const stage = stageRef.current;
    const oldScale = stageScale;
    
    const pointerPos = stage.getPointerPosition();
    
    // Calculate new scale
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    
    setStageScale(newScale);
    
    // Calculate new position
    const newPos = {
      x: pointerPos.x - (pointerPos.x - stagePosition.x) * newScale / oldScale,
      y: pointerPos.y - (pointerPos.y - stagePosition.y) * newScale / oldScale,
    };
    
    setStagePosition(newPos);
  };
  
  // Log elements for debugging
  useEffect(() => {
    if (debug) {
      console.log('Current watermark elements:', elements);
    }
  }, [elements, debug]);
  
  return (
    <div className="watermark-editor" style={{ position: 'relative' }}>
      {/* Hover to top to show the element adding toolbar */}
      <div className="fixed top-0 left-0 w-full bg-black bg-opacity-50 text-white p-2 z-10">
        <div className="flex justify-center space-x-4">
          <button 
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded text-sm font-medium"
            onClick={() => handleAddElement('text')}
          >
            Ajouter du texte
          </button>
          <label className="px-3 py-1 bg-green-500 hover:bg-green-600 rounded text-sm font-medium cursor-pointer">
            Ajouter une image
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  const reader = new FileReader();
                  reader.onload = (fileEvent) => {
                    handleAddElement('image', { src: fileEvent.target.result });
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>
        </div>
      </div>
    
      {/* Canvas */}
      <div 
        style={{ 
          width: '100%', 
          height: 'auto', 
          overflow: 'hidden',
          border: '1px solid #ddd',
          backgroundColor: '#f0f0f0',
          position: 'relative'
        }}
      >
        <Stage 
          ref={stageRef}
          width={canvasWidth}
          height={canvasHeight}
          onMouseDown={checkDeselect}
          onTouchStart={checkDeselect}
          onWheel={handleWheel}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePosition.x}
          y={stagePosition.y}
          style={{ 
            display: 'block',
            maxWidth: '100%',
            maxHeight: 'calc(100vh - 200px)'
          }}
        >
          <Layer ref={layerRef}>
            {/* Background image */}
            {bgImage && (
              <Image
                image={bgImage}
                width={canvasWidth}
                height={canvasHeight}
                listening={false}
                alt="Background"
              />
            )}
            
            {/* Element rendering */}
            {elements.map((element) => {
              if (element.type === 'text') {
                return (
                  <Text
                    key={element.id}
                    id={element.id}
                    x={element.x}
                    y={element.y}
                    text={element.text}
                    fontSize={element.fontSize}
                    fontFamily={element.fontFamily}
                    fill={element.color || element.fill}
                    draggable
                    perfectDrawEnabled={false}
                    onDblClick={(e) => handleTextDblClick(e, element)}
                    onClick={() => setSelectedId(element.id)}
                    onTap={() => setSelectedId(element.id)}
                    onDragEnd={(e) => handleDragEnd(e, element.id)}
                    onTransformEnd={() => handleTransformEnd(element.id)}
                    rotation={element.rotation || 0}
                  />
                );
              } else if (element.type === 'image') {
                return (
                  <ImageElement
                    key={element.id}
                    element={element}
                    isSelected={selectedId === element.id}
                    onSelect={setSelectedId}
                    onDragEnd={handleDragEnd}
                    onTransformEnd={handleTransformEnd}
                  />
                );
              }
              return null;
            })}
            
            {/* Transformer for selected elements */}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                // Limit minimum size
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox;
                }
                return newBox;
              }}
              rotateEnabled={true}
              keepRatio={false}
            />
          </Layer>
        </Stage>
        
        {/* Background loading indicator */}
        {!backgroundLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-80">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
              <span className="mt-2 text-sm text-gray-700">Chargement de l&apos;image...</span>
            </div>
          </div>
        )}
      </div>

      {/* Element properties panel */}
      {selectedId && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Propriétés de l&apos;élément</h4>
          
          {elements.find(el => el.id === selectedId)?.type === 'text' && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-500">Couleur</label>
                <input 
                  type="color"
                  value={elements.find(el => el.id === selectedId)?.color || '#FFFFFF'}
                  onChange={(e) => {
                    setElements(prev => 
                      prev.map(el => 
                        el.id === selectedId ? { ...el, color: e.target.value } : el
                      )
                    );
                  }}
                  className="w-full h-8 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Taille du texte</label>
                <input 
                  type="range"
                  min="8"
                  max="72"
                  value={elements.find(el => el.id === selectedId)?.fontSize || 24}
                  onChange={(e) => {
                    setElements(prev => 
                      prev.map(el => 
                        el.id === selectedId ? { ...el, fontSize: parseInt(e.target.value) } : el
                      )
                    );
                  }}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-right">
                  {elements.find(el => el.id === selectedId)?.fontSize || 24}px
                </div>
              </div>
            </div>
          )}
          
          {elements.find(el => el.id === selectedId)?.type === 'image' && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-500">Opacité</label>
                <input 
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={elements.find(el => el.id === selectedId)?.opacity || 0.8}
                  onChange={(e) => {
                    setElements(prev => 
                      prev.map(el => 
                        el.id === selectedId ? { ...el, opacity: parseFloat(e.target.value) } : el
                      )
                    );
                  }}
                  className="w-full"
                />
              </div>
            </div>
          )}
          
          <button
            onClick={() => {
              setElements(prev => prev.filter(el => el.id !== selectedId));
              setSelectedId(null);
            }}
            className="mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded"
          >
            Supprimer
          </button>
        </div>
      )}
      
      {/* Helpful instructions with fixed apostrophes */}
      <div className="mt-4 text-xs text-gray-500">
        <p>
          ℹ️ Double-cliquez sur un texte pour le modifier. Utilisez la molette pour zoomer.
          Sélectionnez un élément pour afficher ses propriétés.
        </p>
      </div>
    </div>
  );
});

WatermarkEditorKonva.displayName = 'WatermarkEditorKonva';

export default WatermarkEditorKonva;
