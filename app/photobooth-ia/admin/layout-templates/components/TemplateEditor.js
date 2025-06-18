'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  Stage, Layer, Rect, Image as KonvaImage, Transformer, Text,
  Arc, Arrow, Circle, Ellipse, Line, Path, RegularPolygon, Ring, Star, Wedge
} from 'react-konva';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// List of fonts that are commonly available on most systems
const availableFonts = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Verdana',
  'Palatino',
  'Garamond',
  'Comic Sans MS',
  'Impact',
  'Tahoma',
  'Trebuchet MS'
];

// Define preset colors for the color picker
const presetColors = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', 
  '#FFFF00', '#FF00FF', '#00FFFF', '#FF9900', '#9900FF',
  '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6'
];

// New component for Templates tab
const TemplatesTab = ({ onSelectTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const supabase = createClientComponentClient();

  // Fetch templates on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('layout_templates')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTemplates(data || []);
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError('Impossible de charger les templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-sm text-gray-600">Chargement des templates...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
        {error}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="mt-4 text-gray-500">
          Aucun template disponible.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 mb-2">
        Sélectionnez un template pour l'utiliser comme base
      </p>
      <div className="grid grid-cols-2 gap-3">
        {templates.map(template => (
          <div 
            key={template.id}
            onClick={() => onSelectTemplate(template)}
            className="border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all bg-white"
          >
            <div className="h-24 bg-gray-50 flex items-center justify-center">
              {template.thumbnail_url ? (
                <img 
                  src={template.thumbnail_url} 
                  alt={template.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNjY2NjY2MiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIyIiByeT0iMiI+PC9yZWN0PjxjaXJjbGUgY3g9IjguNSIgY3k9IjguNSIgcj0iMS41Ij48L2NpcmNsZT48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIj48L3BvbHlsaW5lPjwvc3ZnPg==';
                  }}
                />
              ) : (
                <div className="text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="p-2">
              <h3 className="text-sm font-medium text-gray-900 truncate">{template.name}</h3>
              {template.category && (
                <p className="text-xs text-gray-500">{template.category}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Define the ElementsTab component
const ElementsTab = ({ 
  addElement, 
  selectedColor, 
  setSelectedColor, 
  showColorPicker, 
  setShowColorPicker, 
  colorPickerTarget, 
  setColorPickerTarget,
  handleColorSelect,
  presetColors = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00']
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => addElement('rect')}
          className="p-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center"
        >
          <div className="w-6 h-6 bg-blue-500 rounded-sm mr-2"></div>
          <span>Rectangle</span>
        </button>
        <button
          onClick={() => addElement('circle')}
          className="p-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center"
        >
          <div className="w-6 h-6 bg-green-500 rounded-full mr-2"></div>
          <span>Cercle</span>
        </button>
        <button
          onClick={() => addElement('text')}
          className="p-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center"
        >
          <span className="text-xl font-bold mr-2">T</span>
          <span>Texte</span>
        </button>
        <button
          onClick={() => addElement('ellipse')}
          className="p-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center"
        >
          <div className="w-6 h-4 bg-purple-500 rounded-full mr-2"></div>
          <span>Ellipse</span>
        </button>
        <button
          onClick={() => addElement('star')}
          className="p-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
          <span>Étoile</span>
        </button>
        <button
          onClick={() => addElement('regularPolygon')}
          className="p-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L4 8.44v7.12L12 22l8-6.44V8.44L12 2z" />
          </svg>
          <span>Polygone</span>
        </button>
      </div>
      
      {/* Simple color picker */}
      {showColorPicker && (
        <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg shadow-lg">
          <h5 className="text-sm font-medium mb-2">Choisir une couleur</h5>
          <div className="grid grid-cols-6 gap-2">
            {presetColors.map(color => (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                aria-label={`Couleur ${color}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Define the TextTab component
const TextTab = ({ 
  addElement, 
  handleTextPropertyChange, 
  showColorPicker, 
  setShowColorPicker, 
  selectedColor, 
  setSelectedColor, 
  colorPickerTarget, 
  setColorPickerTarget,
  handleColorSelect,
  availableFonts = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana']
}) => {
  const [textInput, setTextInput] = useState('Nouveau texte');
  const [fontSize, setFontSize] = useState(20);
  const [fontFamily, setFontFamily] = useState('Arial');
  
  const handleAddText = () => {
    addElement('text', null, 'Texte', {
      text: textInput,
      fontSize: fontSize,
      fontFamily: fontFamily,
      fill: selectedColor
    });
  };
  
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Texte
        </label>
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Taille de police
        </label>
        <input
          type="range"
          min="10"
          max="72"
          value={fontSize}
          onChange={(e) => setFontSize(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="text-right text-sm text-gray-500">{fontSize}px</div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Police
        </label>
        <select
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          {availableFonts.map(font => (
            <option key={font} value={font}>{font}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Couleur
        </label>
        <button
          onClick={() => {
            setColorPickerTarget('text');
            setShowColorPicker(!showColorPicker);
          }}
          className="w-full p-2 border border-gray-300 rounded-md flex items-center"
        >
          <div 
            className="w-6 h-6 mr-2 rounded-md border border-gray-200" 
            style={{ backgroundColor: selectedColor }}
          ></div>
          <span>{selectedColor}</span>
        </button>
      </div>
      
      {showColorPicker && colorPickerTarget === 'text' && (
        <div className="mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg">
          <h5 className="text-sm font-medium mb-2">Choisir une couleur</h5>
          <div className="grid grid-cols-6 gap-2">
            {presetColors.map(color => (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                aria-label={`Couleur ${color}`}
              />
            ))}
          </div>
        </div>
      )}
      
      <button
        onClick={handleAddText}
        className="w-full p-2 mt-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
      >
        Ajouter le texte
      </button>
    </div>
  );
};

// Define a simple UnsplashTab component
const UnsplashTab = ({ addElement }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const searchUnsplash = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/unsplash-search?query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Erreur lors de la recherche');
      
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Unsplash search error:', err);
      setError('Erreur lors de la recherche. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleImageSelect = (imageUrl) => {
    addElement('image', imageUrl, 'Image Unsplash');
  };
  
  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher des images..."
          className="flex-1 p-2 border border-gray-300 rounded-md"
          onKeyPress={(e) => e.key === 'Enter' && searchUnsplash()}
        />
        <button
          onClick={searchUnsplash}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Recherche...' : 'Rechercher'}
        </button>
      </div>
      
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}
      
      {searchResults.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {searchResults.map((image) => (
            <div 
              key={image.id} 
              onClick={() => handleImageSelect(image.urls.regular)}
              className="cursor-pointer border border-gray-200 rounded-md overflow-hidden hover:shadow-md transition-shadow"
            >
              <img 
                src={image.urls.thumb} 
                alt={image.alt_description || 'Unsplash image'} 
                className="w-full h-24 object-cover"
              />
              <div className="p-1 text-xs text-gray-500 truncate">
                Photo par {image.user.name}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          {loading ? (
            <div className="animate-pulse">Recherche en cours...</div>
          ) : (
            <p className="text-gray-500">
              Recherchez des images pour commencer.
            </p>
          )}
        </div>
      )}
      
      <div className="text-xs text-gray-400 text-center">
        Propulsé par Unsplash
      </div>
    </div>
  );
};

// Composant séparé pour les images Konva
const KonvaImageElement = ({ element, isSelected, onSelect, onDragEnd, onTransformEnd }) => {
  const [image, setImage] = useState(null);
  
  useEffect(() => {
    const img = new window.Image();
    img.src = element.src;
    img.onload = () => {
      setImage(img);
    };
  }, [element.src]);
  
  if (!image) return null;
  
  return (
    <KonvaImage
      key={element.id}
      id={element.id}
      image={image}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rotation={element.rotation}
      draggable
      onClick={() => onSelect(element.id)}
      onTap={() => onSelect(element.id)}
      onDragEnd={(e) => onDragEnd(e, element.id)}
      onTransformEnd={() => onTransformEnd(element.id)}
    />
  );
};

// Main TemplateEditor component with all CanvasEditor functionality except Layout tab
const TemplateEditor = ({ onSave, initialData = null }) => {
  const [elements, setElements] = useState(initialData?.elements || []);
  const [selectedId, setSelectedId] = useState(null);
  const [stageSize, setStageSize] = useState(initialData?.stageSize || { width: 970, height: 651, scale: 1 });
  const [activeTab, setActiveTab] = useState('templates'); // Set templates as default tab
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  
  // States for color picker
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [colorPickerTarget, setColorPickerTarget] = useState('fill');
  
  // States for library and uploads
  const [libraryImages, setLibraryImages] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const supabase = createClientComponentClient();
  const stageRef = useRef();
  const transformerRef = useRef();
  const containerRef = useRef();
  const fileInputRef = useRef();
  
  // Formats disponibles (ne change pas, donc mémorisé)
  const formats = useMemo(() => [
    { 
      id: '10x15', 
      name: '10x15 cm (Horizontal)', 
      width: 15, 
      height: 10, 
      ratio: 15/10,
      pixelWidth: 970,
      pixelHeight: 651
    }
  ], []);
  
  // Fonction pour ajuster la taille du stage en fonction du conteneur
  const checkSize = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = window.innerHeight * 0.6;
      const format = formats[0];
      
      const scaleByWidth = containerWidth / format.pixelWidth;
      const scaleByHeight = containerHeight / format.pixelHeight;
      const scale = Math.min(1, scaleByWidth, scaleByHeight);
      
      setStageSize(prevSize => ({
        ...prevSize,
        scale: scale
      }));
    }
  }, [formats]);
  
  // Appliquer checkSize au chargement et au redimensionnement
  useEffect(() => {
    if (containerRef.current) {
      checkSize();
      window.addEventListener('resize', checkSize);
      return () => {
        window.removeEventListener('resize', checkSize);
      };
    }
  }, [checkSize]);
  
  // Mise à jour du transformer quand la sélection change
  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const selectedNode = stageRef.current.findOne('#' + selectedId);
      
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [selectedId]);
  
  // Function to handle color selection
  const handleColorSelect = useCallback((color) => {
    if (!selectedId) return;
    
    if (colorPickerTarget === 'text') {
      // Update text properties
      setElements(prevElements => prevElements.map(el => {
        if (el.id === selectedId && el.type === 'text') {
          return {
            ...el,
            fill: color
          };
        }
        return el;
      }));
    } else if (colorPickerTarget === 'fill') {
      // Update fill color for shapes
      setElements(prevElements => prevElements.map(el => {
        if (el.id === selectedId) {
          return {
            ...el,
            fill: color
          };
        }
        return el;
      }));
    } else if (colorPickerTarget === 'stroke') {
      // Update stroke color for shapes
      setElements(prevElements => prevElements.map((el) => {
        if (el.id === selectedId) {
          return {
            ...el,
            stroke: color,
            strokeWidth: el.strokeWidth || 2 // Default stroke width if not set
          };
        }
        return el;
      }));
    }
    
    setSelectedColor(color);
    setShowColorPicker(false);
  }, [selectedId, colorPickerTarget]);
  
  // Function to handle text property changes
  const handleTextPropertyChange = useCallback((property, value) => {
    if (!selectedId) return;
    
    setElements(prevElements => prevElements.map(el => {
      if (el.id === selectedId && el.type === 'text') {
        return {
          ...el,
          [property]: value
        };
      }
      return el;
    }));
  }, [selectedId]);
  
  // Fonctions de gestion des éléments
  const handleSelectElement = (id) => {
    setSelectedId(id === selectedId ? null : id);
  };
  
  const handleDragEnd = (e, id) => {
    const updatedElements = elements.map(el => {
      if (el.id === id) {
        return {
          ...el,
          x: e.target.x(),
          y: e.target.y()
        };
      }
      return el;
    });
    
    setElements(updatedElements);
  };
  
  const handleTransformEnd = (id) => {
    const node = stageRef.current.findOne('#' + id);
    
    if (!node) return;
    
    const updatedElements = elements.map(el => {
      if (el.id === id) {
        return {
          ...el,
          x: node.x(),
          y: node.y(),
          width: node.width() * node.scaleX(),
          height: node.height() * node.scaleY(),
          rotation: node.rotation()
        };
      }
      return el;
    });
    
    setElements(updatedElements);
  };
  
  // Ajouter un élément au canvas
  const addElement = (type, src = null, name = 'New Element', customProps = null) => {
    if (type === 'image') {
      // Pour les images, créer un élément Image qui s'adapte au format du canvas
      const img = new window.Image();
      img.src = src;
      
      img.onload = () => {
        // Calcul des dimensions appropriées pour adapter l'image au format 10x15
        const canvasRatio = stageSize.width / stageSize.height; // ratio du canvas (15/10 = 1.5)
        const imgRatio = img.width / img.height; // ratio de l'image originale
        
        let newWidth, newHeight;
        
        // Adapter l'image au canvas tout en préservant son ratio
        if (imgRatio > canvasRatio) {
          // Image plus large que le canvas - adapter à la largeur
          newWidth = stageSize.width * 0.9; // 90% de la largeur du canvas
          newHeight = newWidth / imgRatio;
        } else {
          // Image plus haute que le canvas - adapter à la hauteur
          newHeight = stageSize.height * 0.9; // 90% de la hauteur du canvas
          newWidth = newHeight * imgRatio;
        }
        
        // Créer le nouvel élément avec les dimensions calculées
        const newElement = {
          id: `${type}-${Date.now()}`,
          type,
          // Centrer l'image dans le canvas
          x: (stageSize.width - newWidth) / 2,
          y: (stageSize.height - newHeight) / 2,
          width: newWidth,
          height: newHeight,
          rotation: 0,
          src,
          name
        };
        
        setElements(prevElements => [...prevElements, newElement]);
        setSelectedId(newElement.id);
      };
      
      // Pour éviter de bloquer le thread pendant le chargement de l'image
      img.onerror = () => {
        // Fallback en cas d'erreur de chargement
        const fallbackElement = {
          id: `${type}-${Date.now()}`,
          type,
          x: stageSize.width / 2 - 150,
          y: stageSize.height / 2 - 100,
          width: 300,
          height: 200,
          rotation: 0,
          src,
          name
        };
        
        setElements(prevElements => [...prevElements, fallbackElement]);
        setSelectedId(fallbackElement.id);
      };
    } else {
      // Create a new element based on type
      let newElement = {
        id: `${type}-${Date.now()}`,
        type,
        x: stageSize.width / 2,
        y: stageSize.height / 2,
        rotation: 0,
        name
      };

      // Add type-specific properties
      switch (type) {
        case 'rect':
          newElement = {
            ...newElement,
            width: 100,
            height: 100,
            fill: '#3498db'
          };
          break;
        case 'circle':
          newElement = {
            ...newElement,
            radius: 50,
            fill: '#2ecc71'
          };
          break;
        case 'ellipse':
          newElement = {
            ...newElement,
            radiusX: 70,
            radiusY: 40,
            fill: '#9b59b6'
          };
          break;
        case 'arc':
          newElement = {
            ...newElement,
            innerRadius: 40,
            outerRadius: 70,
            angle: 60,
            fill: '#f1c40f',
            stroke: '#f39c12',
            strokeWidth: 2
          };
          break;
        case 'arrow':
          newElement = {
            ...newElement,
            points: [0, 0, 100, 0],
            pointerLength: 10,
            pointerWidth: 10,
            fill: '#e74c3c',
            stroke: '#e74c3c',
            strokeWidth: 4
          };
          break;
        case 'star':
          newElement = {
            ...newElement,
            numPoints: 5,
            innerRadius: 30,
            outerRadius: 70,
            fill: '#f39c12'
          };
          break;
        case 'ring':
          newElement = {
            ...newElement,
            innerRadius: 40,
            outerRadius: 70,
            fill: '#1abc9c'
          };
          break;
        case 'regularPolygon':
          newElement = {
            ...newElement,
            sides: 6,
            radius: 70,
            fill: '#3498db'
          };
          break;
        case 'line':
          newElement = {
            ...newElement,
            points: [0, 0, 100, 0],
            stroke: '#2c3e50',
            strokeWidth: 4
          };
          break;
        case 'wedge':
          newElement = {
            ...newElement,
            radius: 70,
            angle: 60,
            fill: '#e67e22'
          };
          break;
        case 'text':
          if (customProps) {
            // Utiliser les propriétés personnalisées si fournies
            newElement = {
              ...newElement,
              text: customProps.text || 'Nouveau texte',
              fontSize: customProps.fontSize || 20,
              fontFamily: customProps.fontFamily || 'Arial',
              fill: customProps.fill || '#000000',
              width: customProps.width || 200,
              align: customProps.align || 'center',
              fontStyle: customProps.fontStyle || 'normal',
              letterSpacing: customProps.letterSpacing || 0,
              lineHeight: customProps.lineHeight || 1,
              textDecoration: customProps.textDecoration || '',
              textTransform: customProps.textTransform || 'none'
            };
          } else {
            newElement = {
              ...newElement,
              text: 'Nouveau texte',
              fontSize: 20,
              fontFamily: 'Arial',
              fill: '#000000',
              width: 200,
              align: 'center'
            };
          }
          break;
        default:
          break;
      }
    
      setElements([...elements, newElement]);
      setSelectedId(newElement.id);
    }
  };
  
  // Supprimer l'élément sélectionné
  const removeSelected = () => {
    if (!selectedId) return;
    
    setElements(elements.filter(el => el.id !== selectedId));
    setSelectedId(null);
  };
  
  // Fonction améliorée pour générer une miniature PNG haute qualité
  const generateThumbnail = useCallback(() => {
    if (!stageRef.current) return null;
    
    try {
      console.log('Génération de la miniature PNG pour S3...');
      
      // Mémoriser l'échelle actuelle
      const originalScale = stageSize.scale;
      
      // Réinitialiser l'échelle à 1 pour capturer en pleine résolution
      stageRef.current.scale({ x: 1, y: 1 });
      
      // Forcer un rendu avant la capture
      stageRef.current.batchDraw();
      
      // Créer une URL de données à partir du stage
      const dataURL = stageRef.current.toDataURL({
        pixelRatio: 2,       // Résolution x2 pour meilleure qualité
        mimeType: 'image/png', // Spécifier PNG pour S3
        quality: 1,          // Qualité maximale
        x: 0,
        y: 0,
        width: stageSize.width,
        height: stageSize.height
      });
      
      // Restaurer l'échelle d'origine
      stageRef.current.scale({ x: originalScale, y: originalScale });
      stageRef.current.batchDraw();
      
      console.log('Miniature PNG générée avec succès pour S3');
      setThumbnailUrl(dataURL);
      return dataURL;
    } catch (error) {
      console.error('Erreur lors de la génération de la miniature:', error);
      return null;
    }
  }, [stageSize]);
  
  // Effect pour générer automatiquement la miniature quand les éléments changent
  useEffect(() => {
    if (elements.length > 0) {
      // Délai pour s'assurer que tous les éléments sont correctement rendus
      const timer = setTimeout(() => {
        generateThumbnail();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [elements, generateThumbnail]);
  
  // Ajouter cette fonction dataURLtoFile qui était manquante
  const dataURLtoFile = (dataurl, filename) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  };
  
  // Fonction pour sauvegarder le template avec sa miniature
  const saveTemplate = async () => {
    if (onSave) {
      console.log('Sauvegarde du template avec miniature PNG...');
      
      try {
        // Générer une nouvelle miniature avant sauvegarde
        const thumbnail = generateThumbnail();
        let thumbnailPublicUrl = null;
        
        if (thumbnail) {
          try {
            // Convertir le dataURL en fichier
            const thumbnailFile = dataURLtoFile(thumbnail, `template_thumbnail_${Date.now()}.png`);
            
            // Upload via le bucket uploads de Supabase
            const filePath = `public/${Date.now()}.png`;
            
            const { data: uploadData, error: uploadError } = await supabase
              .storage
              .from('uploads')
              .upload(filePath, thumbnailFile);
              
            if (uploadError) {
              console.error('Erreur lors du téléchargement de la miniature:', uploadError);
            } else {
              // Obtenir l'URL publique de la miniature
              const { data: { publicUrl } } = supabase
                .storage
                .from('uploads')
                .getPublicUrl(filePath);
                
              thumbnailPublicUrl = publicUrl;
              console.log('URL de la miniature:', thumbnailPublicUrl);
            }
          } catch (thumbnailError) {
            console.error('Erreur lors du traitement de la miniature:', thumbnailError);
          }
        }
        
        // Inclure la miniature dans les données de retour
        onSave({
          elements,
          stageSize,
          thumbnailUrl: thumbnailPublicUrl || thumbnail // Utiliser l'URL publique si disponible
        });
        
        console.log('Template et miniature PNG sauvegardés avec succès');
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du template:', error);
        // Sauvegarder sans miniature en cas d'erreur
        onSave({
          elements,
          stageSize
        });
      }
    }
  };
  
  // Fonction pour gérer l'upload de fichiers
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    
    if (!files || files.length === 0) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const uploadedImagesList = [...uploadedImages];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        
        reader.onload = (event) => {
          const imageUrl = event.target.result;
          
          // Ajouter l'image à la liste des images téléchargées
          uploadedImagesList.push({
            id: Date.now().toString() + i,
            name: file.name,
            src: imageUrl
          });
          
          // Mettre à jour la progression
          setUploadProgress(Math.round((i + 1) / files.length * 100));
          
          // Mettre à jour la liste des images
          if (i === files.length - 1) {
            setUploadedImages(uploadedImagesList);
            setUploading(false);
            setUploadProgress(0);
          }
        };
        
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      setUploading(false);
      setUploadProgress(0);
    } finally {
      // Réinitialiser l'input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Handle template selection
  const handleSelectTemplate = (template) => {
    try {
      // Parse elements if they're stored as a string
      let templateElements = [];
      if (typeof template.elements === 'string') {
        templateElements = JSON.parse(template.elements);
      } else if (Array.isArray(template.elements)) {
        templateElements = template.elements;
      }

      // Parse stage size if it's stored as a string
      let templateStageSize = { width: 970, height: 651, scale: 1 };
      if (typeof template.stage_size === 'string') {
        templateStageSize = JSON.parse(template.stage_size);
      } else if (template.stage_size && typeof template.stage_size === 'object') {
        templateStageSize = template.stage_size;
      }

      // Update state with template data
      setElements(templateElements);
      setStageSize(prev => ({
        ...templateStageSize,
        scale: prev.scale // Keep current scale
      }));
      setSelectedId(null);
      
      // Switch to elements tab after loading template
      setActiveTab('elements');
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Erreur lors du chargement du template');
    }
  };
  
  return (
    <div className="bg-white shadow-sm rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 space-y-3 md:space-y-0">
          <h3 className="text-lg font-medium text-gray-900">Éditeur de Template</h3>
          <div className="flex space-x-2">
            {thumbnailUrl && (
              <div className="hidden md:block">
                <div className="text-xs text-gray-500 mb-1 text-center">Aperçu miniature</div>
                <img 
                  src={thumbnailUrl} 
                  alt="Aperçu" 
                  className="h-10 w-15 object-cover border border-gray-200 rounded"
                />
              </div>
            )}
            <button
              onClick={removeSelected}
              disabled={!selectedId}
              className={`px-3 py-1.5 text-sm rounded-md ${
                selectedId 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Supprimer la sélection
            </button>
            <button
              onClick={saveTemplate}
              className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700"
            >
              Enregistrer le template
            </button>
          </div>
        </div>
      </div>
      
      {/* Interface principale */}
      <div className="p-4 md:p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Panneau des outils */}
          <div className="w-full lg:w-16 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-lg flex lg:flex-col shadow-lg">
            {/* New Template tab button */}
            <button
              className={`flex flex-col items-center justify-center p-3 w-full transition-all duration-300 ${
                activeTab === 'templates' 
                  ? 'bg-white bg-opacity-20 text-white' 
                  : 'text-white text-opacity-70 hover:text-opacity-100 hover:bg-white hover:bg-opacity-10'
              }`}
              onClick={() => setActiveTab('templates')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <span className="text-xs font-medium">Templates</span>
            </button>

            <button
              className={`flex flex-col items-center justify-center p-3 w-full transition-all duration-300 ${
                activeTab === 'elements' 
                  ? 'bg-white bg-opacity-20 text-white' 
                  : 'text-white text-opacity-70 hover:text-opacity-100 hover:bg-white hover:bg-opacity-10'
              }`}
              onClick={() => setActiveTab('elements')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span className="text-xs font-medium">Éléments</span>
            </button>
            
            <button
              className={`flex flex-col items-center justify-center p-3 w-full transition-all duration-300 ${
                activeTab === 'text' 
                  ? 'bg-white bg-opacity-20 text-white' 
                  : 'text-white text-opacity-70 hover:text-opacity-100 hover:bg-white hover:bg-opacity-10'
              }`}
              onClick={() => setActiveTab('text')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
              <span className="text-xs font-medium">Texte</span>
            </button>
            
            <button
              className={`flex flex-col items-center justify-center p-3 w-full transition-all duration-300 ${
                activeTab === 'uploads' 
                  ? 'bg-white bg-opacity-20 text-white' 
                  : 'text-white text-opacity-70 hover:text-opacity-100 hover:bg-white hover:bg-opacity-10'
              }`}
              onClick={() => setActiveTab('uploads')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-xs font-medium">Uploads</span>
            </button>
            
            <button
              className={`flex flex-col items-center justify-center p-3 w-full transition-all duration-300 ${
                activeTab === 'unsplash' 
                  ? 'bg-white bg-opacity-20 text-white' 
                  : 'text-white text-opacity-70 hover:text-opacity-100 hover:bg-white hover:bg-opacity-10'
              }`}
              onClick={() => setActiveTab('unsplash')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium">Images</span>
            </button>
          </div>
          
          {/* Contenu des onglets */}
          <div className="w-full lg:w-64 border border-gray-300 rounded-lg p-4 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
              {activeTab === 'templates' && (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  Templates
                </>
              )}
              {activeTab === 'elements' && (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Éléments
                </>
              )}
              {activeTab === 'text' && (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                  Texte
                </>
              )}
              {activeTab === 'uploads' && (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Uploads
                </>
              )}
              {activeTab === 'unsplash' && (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Images
                </>
              )}
            </h4>
            
            <div className="flex-grow overflow-y-auto max-h-[60vh] lg:max-h-[calc(100vh-20rem)]">
              {activeTab === 'templates' && (
                <TemplatesTab onSelectTemplate={handleSelectTemplate} />
              )}
              
              {activeTab === 'elements' && (
                <ElementsTab 
                  addElement={addElement}
                  selectedColor={selectedColor}
                  setSelectedColor={setSelectedColor}
                  showColorPicker={showColorPicker}
                  setShowColorPicker={setShowColorPicker}
                  colorPickerTarget={colorPickerTarget}
                  setColorPickerTarget={setColorPickerTarget}
                  handleColorSelect={handleColorSelect}
                  presetColors={presetColors}
                />
              )}
              
              {activeTab === 'text' && (
                <TextTab 
                  addElement={addElement}
                  handleTextPropertyChange={handleTextPropertyChange}
                  showColorPicker={showColorPicker}
                  setShowColorPicker={setShowColorPicker}
                  selectedColor={selectedColor}
                  setSelectedColor={setSelectedColor}
                  colorPickerTarget={colorPickerTarget}
                  setColorPickerTarget={setColorPickerTarget}
                  handleColorSelect={handleColorSelect}
                  availableFonts={availableFonts}
                />
              )}
              
              {activeTab === 'uploads' && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Télécharger des images
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-gray-600 justify-center">
                          <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                            <span>Sélectionner des fichiers</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              multiple
                              accept="image/*"
                              ref={fileInputRef}
                              onChange={handleFileUpload}
                              disabled={uploading}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG jusqu'à 10Mo</p>
                        
                        {uploading && (
                          <div className="w-full mt-2">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-600 rounded-full" 
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 text-center">{uploadProgress}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {uploadedImages.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Images téléchargées</h5>
                      <div className="grid grid-cols-2 gap-2">
                        {uploadedImages.map(image => (
                          <div 
                            key={image.id}
                            className="border border-gray-200 rounded-md overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => addElement('image', image.src, image.name)}
                          >
                            <div className="h-24 bg-gray-100 relative">
                              <img 
                                src={image.src} 
                                alt={image.name} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="p-1 text-xs text-gray-500 truncate">
                              {image.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'unsplash' && (
                <UnsplashTab 
                  addElement={addElement}
                />
              )}
            </div>
          </div>
          
          {/* Canvas */}
          <div className="w-full lg:flex-grow">
            <div className="mb-2 text-sm text-gray-500">
              <span>Format: 10x15 cm (Horizontal) - {stageSize.width}×{stageSize.height} pixels ({Math.round(stageSize.scale * 100)}%)</span>
            </div>
            
            <div 
              ref={containerRef} 
              className="border border-gray-300 rounded-lg bg-gray-100 overflow-hidden flex justify-center items-center p-2 md:p-4"
              style={{
                minHeight: '300px',
                height: 'auto',
                maxHeight: 'calc(70vh - 100px)',
                aspectRatio: 15/10 // Format 10x15
              }}
            >
              {/* Stage container avec mise à l'échelle */}
              <div style={{ 
                transform: `scale(${stageSize.scale})`, 
                transformOrigin: 'center center',
                width: stageSize.width,
                height: stageSize.height
              }}>
                <Stage
                  width={stageSize.width}
                  height={stageSize.height}
                  ref={stageRef}
                  onMouseDown={(e) => {
                    // Désélectionner en cliquant sur une zone vide
                    const clickedOnEmpty = e.target === e.target.getStage();
                    if (clickedOnEmpty) {
                      setSelectedId(null);
                    }
                  }}
                  className="bg-white"
                  style={{ boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}
                >
                  <Layer>
                    {/* Cadre de délimitation */}
                    <Rect
                      x={0}
                      y={0}
                      width={stageSize.width}
                      height={stageSize.height}
                      stroke="#cccccc"
                      strokeWidth={2}
                      dash={[5, 5]}
                      fill="transparent"
                    />
                    
                    {/* Rendu des éléments */}
                    {elements.map((element) => {
                      if (element.type === 'rect') {
                        return (
                          <Rect
                            key={element.id}
                            id={element.id}
                            x={element.x}
                            y={element.y}
                            width={element.width}
                            height={element.height}
                            fill={element.fill}
                            stroke={element.stroke}
                            strokeWidth={element.strokeWidth}
                            rotation={element.rotation}
                            draggable
                            onClick={() => handleSelectElement(element.id)}
                            onTap={() => handleSelectElement(element.id)}
                            onDragEnd={(e) => handleDragEnd(e, element.id)}
                            onTransformEnd={() => handleTransformEnd(element.id)}
                          />
                        );
                      } else if (element.type === 'circle') {
                        return (
                          <Circle
                            key={element.id}
                            id={element.id}
                            x={element.x}
                            y={element.y}
                            radius={element.radius}
                            fill={element.fill}
                            stroke={element.stroke}
                            strokeWidth={element.strokeWidth}
                            rotation={element.rotation}
                            draggable
                            onClick={() => handleSelectElement(element.id)}
                            onTap={() => handleSelectElement(element.id)}
                            onDragEnd={(e) => handleDragEnd(e, element.id)}
                            onTransformEnd={() => handleTransformEnd(element.id)}
                          />
                        );
                      } else if (element.type === 'text') {
                        return (
                          <Text
                            key={element.id}
                            id={element.id}
                            text={element.text}
                            x={element.x}
                            y={element.y}
                            fontSize={element.fontSize || 20}
                            fontFamily={element.fontFamily || 'Arial'} 
                            fill={element.fill || '#000000'}
                            fontStyle={element.fontStyle || 'normal'} 
                            align={element.align || 'left'} 
                            width={element.width}
                            padding={element.padding}
                            letterSpacing={element.letterSpacing || 0}
                            lineHeight={element.lineHeight || 1}
                            textDecoration={element.textDecoration || ''}
                            draggable
                            onClick={() => handleSelectElement(element.id)}
                            onTap={() => handleSelectElement(element.id)}
                            onDragEnd={(e) => handleDragEnd(e, element.id)}
                            onTransformEnd={() => handleTransformEnd(element.id)}
                          />
                        );
                      } else if (element.type === 'ellipse') {
                        return (
                          <Ellipse
                            key={element.id}
                            id={element.id}
                            x={element.x}
                            y={element.y}
                            radiusX={element.radiusX}
                            radiusY={element.radiusY}
                            fill={element.fill}
                            stroke={element.stroke}
                            strokeWidth={element.strokeWidth}
                            rotation={element.rotation}
                            draggable
                            onClick={() => handleSelectElement(element.id)}
                            onTap={() => handleSelectElement(element.id)}
                            onDragEnd={(e) => handleDragEnd(e, element.id)}
                            onTransformEnd={() => handleTransformEnd(element.id)}
                          />
                        );
                      } else if (element.type === 'star') {
                        return (
                          <Star
                            key={element.id}
                            id={element.id}
                            x={element.x}
                            y={element.y}
                            numPoints={element.numPoints}
                            innerRadius={element.innerRadius}
                            outerRadius={element.outerRadius}
                            fill={element.fill}
                            stroke={element.stroke}
                            strokeWidth={element.strokeWidth}
                            rotation={element.rotation}
                            draggable
                            onClick={() => handleSelectElement(element.id)}
                            onTap={() => handleSelectElement(element.id)}
                            onDragEnd={(e) => handleDragEnd(e, element.id)}
                            onTransformEnd={() => handleTransformEnd(element.id)}
                          />
                        );
                      } else if (element.type === 'regularPolygon') {
                        return (
                          <RegularPolygon
                            key={element.id}
                            id={element.id}
                            x={element.x}
                            y={element.y}
                            sides={element.sides}
                            radius={element.radius}
                            fill={element.fill}
                            stroke={element.stroke}
                            strokeWidth={element.strokeWidth}
                            rotation={element.rotation}
                            draggable
                            onClick={() => handleSelectElement(element.id)}
                            onTap={() => handleSelectElement(element.id)}
                            onDragEnd={(e) => handleDragEnd(e, element.id)}
                            onTransformEnd={() => handleTransformEnd(element.id)}
                          />
                        );
                      } else if (element.type === 'image') {
                        return (
                          <KonvaImageElement
                            key={element.id}
                            element={element}
                            isSelected={selectedId === element.id}
                            onSelect={handleSelectElement}
                            onDragEnd={handleDragEnd}
                            onTransformEnd={handleTransformEnd}
                          />
                        );
                      }
                      return null;
                    })}
                    
                    <Transformer
                      ref={transformerRef}
                      boundBoxFunc={(oldBox, newBox) => {
                        // Limiter le redimensionnement
                        if (newBox.width < 10 || newBox.height < 10) {
                          return oldBox;
                        }
                        return newBox;
                      }}
                    />
                  </Layer>
                </Stage>
              </div>
            </div>
            
            <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-xs text-blue-700">
                Ce canvas représente un format d'impression de 10x15 cm (orientation horizontale).
                La taille est fixée à 970×651 pixels pour une meilleure qualité d'affichage.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;