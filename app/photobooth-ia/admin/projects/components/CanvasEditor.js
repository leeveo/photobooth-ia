'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage, Transformer, Text } from 'react-konva';
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

// Composant séparé pour les images Konva pour respecter les règles des hooks
const KonvaImageElement = ({ element, isSelected, onSelect, onDragEnd, onTransformEnd }) => {
  const [image, setImage] = useState(null);
  
  useEffect(() => {
    const img = new window.Image();
    img.src = element.src;
    img.onload = () => {
      setImage(img);
    };
  }, [element.src]);
  
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

const CanvasEditor = ({ projectId, onSave, initialData = null }) => {
  // Formats ne devrait pas changer, donc on le déplace hors du composant ou on le mémorise
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
  
  // État pour stocker les dimensions du canvas en pixels
  const [stageSize, setStageSize] = useState(() => {
    const defaultFormat = formats[0];
    return {
      width: defaultFormat.pixelWidth,
      height: defaultFormat.pixelHeight,
      scale: 1
    };
  });
  
  // Nouvel état pour le format sélectionné
  const [selectedFormat, setSelectedFormat] = useState('10x15');
  // Liste des formats disponibles
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [images, setImages] = useState([]);
  const [backgrounds, setBackgrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('backgrounds');
  const [savedLayouts, setSavedLayouts] = useState([]);
  const [layoutName, setLayoutName] = useState('');
  // Nouvelles variables d'état pour les fonctionnalités ajoutées
  const [libraryImages, setLibraryImages] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  // Nouveaux états pour la gestion des couleurs et des polices
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [colorPickerTarget, setColorPickerTarget] = useState('fill');
  const [textProps, setTextProps] = useState({
    text: 'Nouveau texte',
    fontFamily: 'Arial',
    fontSize: 24,
    fill: '#000000',
    align: 'center',
    fontStyle: 'normal'
  });
  
  const supabase = createClientComponentClient();
  const transformerRef = useRef();
  const stageRef = useRef();
  const containerRef = useRef();
  const fileInputRef = useRef();
  
  // Load project backgrounds and images
  useEffect(() => {
    async function loadAssets() {
      setLoading(true);
      try {
        // Load backgrounds
        const { data: bgData, error: bgError } = await supabase
          .from('backgrounds')
          .select('*')
          .eq('project_id', projectId)
          .eq('is_active', true);
          
        if (bgError) throw bgError;
        setBackgrounds(bgData || []);
        
        // Load styles/images
        const { data: styleData, error: styleError } = await supabase
          .from('styles')
          .select('*')
          .eq('project_id', projectId);
          
        if (styleError) throw styleError;
        
        const processedImages = styleData.map(style => ({
          id: style.id,
          src: style.preview_image,
          name: style.name
        }));
        
        setImages(processedImages);
        
        // Load saved layouts
        const { data: layoutData, error: layoutError } = await supabase
          .from('canvas_layouts')
          .select('*')
          .eq('project_id', projectId);
          
        if (!layoutError) {
          setSavedLayouts(layoutData || []);
        }
        
        // Ces appels de fonctions peuvent causer des problèmes
        // Les déplacer hors de cette fonction d'effet
        
        // Initialize with saved data if provided
        if (initialData && initialData.elements) {
          setElements(initialData.elements);
          if (initialData.stageSize) {
            setStageSize(initialData.stageSize);
          }
        }
        
      } catch (error) {
        console.error('Error loading canvas assets:', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (projectId) {
      loadAssets();
    }
  }, [projectId, supabase, initialData]);
  
  // Ajoutons une fonction de diagnostic pour le bucket
const checkBucketExists = useCallback(async (bucketName) => {
  try {
    console.log(`Vérification de l'existence du bucket ${bucketName}...`);
    const { data, error } = await supabase.storage.getBucket(bucketName);
    
    if (error) {
      console.error(`Erreur lors de la vérification du bucket ${bucketName}:`, error);
      return false;
    }
    
    console.log(`Bucket ${bucketName} trouvé:`, data);
    return true;
  } catch (error) {
    console.error(`Exception lors de la vérification du bucket ${bucketName}:`, error);
    return false;
  }
}, [supabase]);

  // Fonction améliorée pour charger les images du bucket 'assets'
  const loadLibraryImages = useCallback(async () => {
    try {
      console.log('Tentative de chargement des images depuis le bucket assets...');
      
      // URL de base confirmée fonctionnelle
      const baseUrl = "https://gyohqmahwntkmebayeej.supabase.co/storage/v1/object/public/assets//";
      
      // Images confirmées par l'utilisateur
      const knownWorkingFiles = ['001.png', '002.png', '003.png'];
      
      // Créer les objets image directement à partir des fichiers qui fonctionnent
      const images = knownWorkingFiles.map((filename, index) => {
        const directUrl = `${baseUrl}${filename}`;
        return {
          id: `asset-${index}`,
          name: filename,
          src: directUrl,
          src_nocache: `${directUrl}?t=${Date.now()}`
        };
      });
      
      console.log('Images connues chargées:', images);
      setLibraryImages(images);
      
    } catch (error) {
      console.error('Erreur lors du chargement des images:', error);
      setLibraryImages([]);
    }
  }, []);

  // Fonction pour charger les images téléchargées par l'utilisateur
  const loadUploadedImages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .storage
        .from('uploads')
        .list(`${projectId}/`);
        
      if (error) throw error;
      
      // Filtrer pour ne garder que les fichiers PNG et JPG
      const imageFiles = (data || []).filter(file => 
        file.name.toLowerCase().endsWith('.png') || 
        file.name.toLowerCase().endsWith('.jpg') || 
        file.name.toLowerCase().endsWith('.jpeg')
      );
      
      // Créer les URLs pour chaque image
      const images = imageFiles.map(file => ({
        id: file.id,
        name: file.name,
        src: supabase.storage.from('uploads').getPublicUrl(`${projectId}/${file.name}`).data.publicUrl
      }));
      
      setUploadedImages(images);
    } catch (error) {
      console.error('Error loading uploaded images:', error);
    }
  }, [projectId, supabase]); // Ajout des dépendances
  
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
        const fileName = `${Date.now()}_${file.name}`;
        
        // Upload du fichier vers Supabase
        const { data, error } = await supabase
          .storage
          .from('uploads')
          .upload(`${projectId}/${fileName}`, file);
          
        if (error) throw error;
        
        // Créer l'URL de l'image
        const imageUrl = supabase
          .storage
          .from('uploads')
          .getPublicUrl(`${projectId}/${fileName}`).data.publicUrl;
        
        // Ajouter l'image à la liste des images téléchargées
        uploadedImagesList.push({
          id: data.id || Date.now().toString(),
          name: fileName,
          src: imageUrl
        });
        
        // Mettre à jour la progression
        setUploadProgress(Math.round((i + 1) / files.length * 100));
      }
      
      setUploadedImages(uploadedImagesList);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Erreur lors du téléchargement des fichiers');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      
      // Réinitialiser l'input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Fonction checkSize corrigée
  const checkSize = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const format = formats.find(f => f.id === selectedFormat) || formats[0];
      
      // Calculer l'échelle pour ajuster le canvas au conteneur
      const scale = Math.min(1, containerWidth / format.pixelWidth);
      
      // Utilisez une fonction pour éviter les boucles infinies
      setStageSize(prevSize => {
        // Si la taille n'a pas changé, ne pas déclencher de mise à jour
        if (prevSize.width === format.pixelWidth && 
            prevSize.height === format.pixelHeight && 
            prevSize.scale === scale) {
          return prevSize;
        }
        
        return {
          width: format.pixelWidth,
          height: format.pixelHeight,
          scale: scale
        };
      });
    }
  }, [formats, selectedFormat]); // Formats devrait être stable maintenant
  
  // Resize handler for responsive canvas
  useEffect(() => {
    // Appliquer checkSize uniquement si le conteneur est monté
    if (containerRef.current) {
      checkSize();
      
      // Ajouter l'écouteur d'événement
      window.addEventListener('resize', checkSize);
      
      // Nettoyage
      return () => {
        window.removeEventListener('resize', checkSize);
      };
    }
  }, [checkSize]);
  
  // Supprimer cet effet qui cause une boucle infinie
  // useEffect(() => {
  //   checkSize();
  // }, [selectedFormat, checkSize]);
  
  // Remplacer par cet effet qui ne s'exécute que si selectedFormat change
  useEffect(() => {
    // Appliquer checkSize uniquement quand le format change
    if (containerRef.current) {
      checkSize();
    }
  }, [selectedFormat, checkSize]); // checkSize est stable et ne devrait pas causer de boucle
  
  // Update transformer when selection changes
  useEffect(() => {
    if (selectedId && transformerRef.current) {
      // Find the node by id
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
  
  const addElement = (type, src = null, name = 'New Element') => {
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
      // Pour les autres types d'éléments (rectangle, texte, etc.)
      const newElement = {
        id: `${type}-${Date.now()}`,
        type,
        x: stageSize.width / 2 - 50,
        y: stageSize.height / 2 - 50,
        width: 100,
        height: 100,
        rotation: 0,
        text: type === 'text' ? 'Text Element' : '',
        fill: type === 'rect' ? '#3498db' : undefined,
        fontSize: type === 'text' ? 20 : undefined,
      };
      
      setElements([...elements, newElement]);
      setSelectedId(newElement.id);
    }
  };
  
  const removeSelected = () => {
    if (!selectedId) return;
    
    setElements(elements.filter(el => el.id !== selectedId));
    setSelectedId(null);
  };
  
  const saveLayout = async () => {
    if (!layoutName.trim()) return;
    
    try {
      const layoutData = {
        project_id: projectId,
        name: layoutName,
        elements: JSON.stringify(elements),
        stage_size: JSON.stringify(stageSize),
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('canvas_layouts')
        .insert(layoutData)
        .select();
        
      if (error) throw error;
      
      setSavedLayouts([...savedLayouts, data[0]]);
      setLayoutName('');
      
      if (onSave) {
        onSave({
          elements,
          stageSize
        });
      }
      
    } catch (error) {
      console.error('Error saving layout:', error);
    }
  };
  
  const loadLayout = async (layoutId) => {
    try {
      const layout = savedLayouts.find(l => l.id === layoutId);
      
      if (layout) {
        setElements(JSON.parse(layout.elements));
        setStageSize(JSON.parse(layout.stage_size));
      }
    } catch (error) {
      console.error('Error loading layout:', error);
    }
  };
  
  // Ajouter cette fonction qui était référencée mais pas implémentée
  const testDirectUrl = useCallback(() => {
    // URL directe fournie par l'utilisateur
    const baseUrl = "https://gyohqmahwntkmebayeej.supabase.co/storage/v1/object/public/assets//";
    
    // Ajouter quelques images de test à essayer
    const testImages = [
      { name: "Image 1", path: "image1.jpg" },
      { name: "Image 2", path: "image2.png" },
      { name: "Racine", path: "" }
    ];
    
    const images = testImages.map(img => ({
      id: `direct-${img.path || 'root'}`,
      name: img.name,
      src: `${baseUrl}${img.path}`,
      src_nocache: `${baseUrl}${img.path}?t=${Date.now()}`
    }));
    
    setLibraryImages(images);
  }, []); // No dependencies needed for this function
  
  // Effectuer le chargement des images lorsque le composant est monté
  // Déplacer ce code ici pour éviter les problèmes de timing
  useEffect(() => {
    if (!loading) {
      // Use a setTimeout to ensure these run after render is complete
      const timer = setTimeout(() => {
        loadLibraryImages().catch(error => {
          console.error("Erreur lors du chargement initial des images:", error);
        });
        
        loadUploadedImages().catch(error => {
          console.error("Erreur lors du chargement initial des uploads:", error);
        });
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, [loading, loadLibraryImages, loadUploadedImages]);
  
  // Add the missing handleFormatChange function with useCallback
const handleFormatChange = useCallback((e) => {
  const newFormat = e.target.value;
  setSelectedFormat(newFormat);
}, []);

// Add the missing handleColorSelect function inside the component
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
    
    // Also update textProps state to keep UI in sync
    setTextProps(prev => ({
      ...prev,
      fill: color
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
    setElements(prevElements => prevElements.map(el => {
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

  // Attention: ne pas appeler des fonctions qui modifient l'état directement dans le rendu
  // Assurez-vous que toutes les fonctions appelées dans le JSX sont des gestionnaires d'événements
  
  // Modifier le bouton de test URL directe pour utiliser la fonction définie
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Éditeur de Canvas</h3>
        <div className="flex space-x-2">
          {/* Ajout de la liste déroulante des formats */}
          <div className="mr-4">
            <label htmlFor="format-select" className="block text-sm font-medium text-gray-700 mb-1">
              Format
            </label>
            <select
              id="format-select"
              value={selectedFormat}
              onChange={handleFormatChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              {formats.map(format => (
                <option key={format.id} value={format.id}>
                  {format.name}
                </option>
              ))}
            </select>
          </div>
          
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
          
          <div className="flex items-center border border-gray-300 rounded-md">
            <input
              type="text"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              placeholder="Nom du layout"
              className="px-3 py-1.5 text-sm border-none focus:ring-0 w-40"
            />
            <button
              onClick={saveLayout}
              disabled={!layoutName.trim()}
              className={`px-3 py-1.5 text-sm rounded-r-md ${
                layoutName.trim() 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
      
      {/* Canvas and Toolbar */}
      <div className="flex space-x-4">
        {/* Canvas avec cadre d'impression */}
        <div className="flex-grow">
          <div className="mb-2 text-sm text-gray-500 flex justify-between items-center">
            <span>
              Format: {formats.find(f => f.id === selectedFormat)?.name}
            </span>
            <span>
              Dimensions: {stageSize.width}×{stageSize.height} pixels ({Math.round(stageSize.scale * 100)}%)
            </span>
          </div>
          
          <div 
            ref={containerRef} 
            className="border border-gray-300 rounded-lg bg-gray-100 overflow-hidden flex justify-center p-4"
          >
            {/* Conteneur pour le stage avec mise à l'échelle */}
            <div style={{ 
              transform: `scale(${stageSize.scale})`, 
              transformOrigin: 'top left',
              width: stageSize.width,
              height: stageSize.height
            }}>
              <Stage
                width={stageSize.width}
                height={stageSize.height}
                ref={stageRef}
                onMouseDown={(e) => {
                  // Deselect when clicking on empty area
                  const clickedOnEmpty = e.target === e.target.getStage();
                  if (clickedOnEmpty) {
                    setSelectedId(null);
                  }
                }}
                className="bg-white"
                style={{ boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}
              >
                <Layer>
                  {/* Cadre de délimitation du format d'impression */}
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
                          rotation={element.rotation}
                          draggable
                          onClick={() => handleSelectElement(element.id)}
                          onTap={() => handleSelectElement(element.id)}
                          onDragEnd={(e) => handleDragEnd(e, element.id)}
                          onTransformEnd={() => handleTransformEnd(element.id)}
                        />
                      );
                    } else if (element.type === 'image') {
                      // Utilisation du composant séparé pour les images
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
                    } else if (element.type === 'text') {
                      return (
                        <Text
                          key={element.id}
                          id={element.id}
                          text={element.text}
                          x={element.x}
                          y={element.y}
                          fontSize={element.fontSize || 20}
                          fontFamily={element.fontFamily || 'Arial'} // Support font family
                          fill={element.fill || '#000000'}
                          fontStyle={element.fontStyle || 'normal'} // Support font style
                          align={element.align || 'left'} // Support text alignment
                          width={element.width}
                          padding={element.padding}
                          rotation={element.rotation}
                          draggable
                          onClick={() => handleSelectElement(element.id)}
                          onTap={() => handleSelectElement(element.id)}
                          onDragEnd={(e) => handleDragEnd(e, element.id)}
                          onTransformEnd={() => handleTransformEnd(element.id)}
                        />
                      );
                    }
                    return null;
                  })}
                  
                  <Transformer
                    ref={transformerRef}
                    boundBoxFunc={(oldBox, newBox) => {
                      // Limit resize
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
          
          {/* Information sur le format d'impression - mise à jour */}
          <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-100">
            <p className="text-xs text-blue-700">
              Ce canvas représente un format d'impression de 10x15 cm (orientation horizontale).
              La taille est fixée à 970×651 pixels pour une meilleure qualité d'affichage.
            </p>
          </div>
        </div>
        
        {/* Toolbar avec hauteur adaptative */}
        <div className="w-64 border border-gray-300 rounded-lg p-4 bg-gray-50 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
          
            <button
              className={`py-2 text-xs font-medium ${
                activeTab === 'elements' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('elements')}
            >
              Éléments
            </button>
            <button
              className={`py-2 text-xs font-medium ${
                activeTab === 'uploads' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('uploads')}
            >
              Uploads
            </button>
            <button
              className={`py-2 text-xs font-medium ${
                activeTab === 'library' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('library')}
            >
              Bibliothèque
            </button>
            <button
              className={`py-2 text-xs font-medium ${
                activeTab === 'layouts' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('layouts')}
            >
              Layouts
            </button>
          </div>
          
          {/* Tab Content - Remplacer h-96 par flex-grow pour une hauteur adapative */}
          <div className="flex-grow overflow-y-auto">
            {activeTab === 'backgrounds' && (
              <div className="grid grid-cols-2 gap-2">
                {backgrounds.map(bg => (
                  <div 
                    key={bg.id}
                    className="aspect-square border border-gray-200 rounded-md overflow-hidden cursor-pointer hover:border-indigo-500"
                    onClick={() => addElement('image', bg.image_url, bg.name)}
                  >
                    <img 
                      src={bg.image_url} 
                      alt={bg.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {backgrounds.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    Aucun arrière-plan disponible
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'elements' && (
              <div className="space-y-3"> {/* Réduire l'espace vertical de 4 à 3 */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Formes</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => addElement('rect', null, 'Rectangle')}
                      className="p-3 border border-gray-200 rounded-md hover:bg-gray-100"
                    >
                      <div className="bg-blue-500 w-full h-6 rounded"></div>
                      <span className="text-xs mt-1 block">Rectangle</span>
                    </button>
                    <button
                      onClick={() => addElement('text', null, 'Texte')}
                      className="p-3 border border-gray-200 rounded-md hover:bg-gray-100"
                    >
                      <div className="w-full h-6 flex items-center justify-center">
                        <span className="text-sm">ABC</span>
                      </div>
                      <span className="text-xs mt-1 block">Texte</span>
                    </button>
                  </div>
                </div>
                
                {/* Show properties for selected element - version plus compacte */}
                {selectedId && (
                  <div className="mt-3 border-t pt-3 border-gray-200"> {/* Réduire les marges */}
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Propriétés de {elements.find(el => el.id === selectedId)?.type === 'text' ? 'texte' : 'forme'}
                    </h4>
                    
                    {/* Text properties - version plus compacte */}
                    {elements.find(el => el.id === selectedId)?.type === 'text' && (
                      <div className="space-y-2"> {/* Réduire l'espace vertical */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">Texte</label> {/* Réduire la marge */}
                          <input
                            type="text"
                            value={elements.find(el => el.id === selectedId)?.text || ''}
                            onChange={(e) => {
                              setElements(prevElements => prevElements.map(el => {
                                if (el.id === selectedId) {
                                  return {
                                    ...el,
                                    text: e.target.value
                                  };
                                }
                                return el;
                              }));
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>
                        
                        {/* Regrouper police et taille sur la même ligne */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Police</label>
                            <select
                              value={elements.find(el => el.id === selectedId)?.fontFamily || 'Arial'}
                              onChange={(e) => {
                                setElements(prevElements => prevElements.map(el => {
                                  if (el.id === selectedId) {
                                    return {
                                      ...el,
                                      fontFamily: e.target.value
                                    };
                                  }
                                  return el;
                                }));
                              }}
                              className="w-full px-1 py-0.5 text-sm border border-gray-300 rounded"
                            >
                              {availableFonts.map(font => (
                                <option key={font} value={font} style={{ fontFamily: font }}>
                                  {font}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Taille</label>
                            <input
                              type="number"
                              min="8"
                              max="120"
                              value={elements.find(el => el.id === selectedId)?.fontSize || 20}
                              onChange={(e) => {
                                setElements(prevElements => prevElements.map(el => {
                                  if (el.id === selectedId) {
                                    return {
                                      ...el,
                                      fontSize: Number(e.target.value)
                                    };
                                  }
                                  return el;
                                }));
                              }}
                              className="w-full px-1 py-0.5 text-sm border border-gray-300 rounded"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Couleur</label>
                            <div 
                              className="w-8 h-8 rounded-full border border-gray-300 cursor-pointer"
                              style={{ backgroundColor: elements.find(el => el.id === selectedId)?.fill || '#000000' }}
                              onClick={() => {
                                setColorPickerTarget('text');
                                setSelectedColor(elements.find(el => el.id === selectedId)?.fill || '#000000');
                                setShowColorPicker(true);
                              }}
                            ></div>
                          </div>
                          
                          <div className="flex-grow">
                            <label className="block text-xs text-gray-500 mb-0.5">Style</label>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => {
                                  setElements(prevElements => prevElements.map(el => {
                                    if (el.id === selectedId) {
                                      return {
                                        ...el,
                                        fontStyle: el.fontStyle === 'bold' ? 'normal' : 'bold'
                                      };
                                    }
                                    return el;
                                  }));
                                }}
                                className={`px-2 py-0.5 text-xs rounded ${
                                  elements.find(el => el.id === selectedId)?.fontStyle === 'bold' 
                                    ? 'bg-indigo-500 text-white' 
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                B
                              </button>
                              <button
                                onClick={() => {
                                  setElements(prevElements => prevElements.map(el => {
                                    if (el.id === selectedId) {
                                      return {
                                        ...el,
                                        fontStyle: el.fontStyle === 'italic' ? 'normal' : 'italic'
                                      };
                                    }
                                    return el;
                                  }));
                                }}
                                className={`px-2 py-0.5 text-xs rounded italic ${
                                  elements.find(el => el.id === selectedId)?.fontStyle === 'italic' 
                                    ? 'bg-indigo-500 text-white' 
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                I
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">Alignement</label>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => {
                                setElements(prevElements => prevElements.map(el => {
                                  if (el.id === selectedId) {
                                    return {
                                      ...el,
                                      align: 'left'
                                    };
                                  }
                                  return el;
                                }));
                              }}
                              className={`flex-1 px-2 py-0.5 text-xs rounded ${
                                elements.find(el => el.id === selectedId)?.align === 'left' 
                                  ? 'bg-indigo-500 text-white' 
                                  : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              ←
                            </button>
                            <button
                              onClick={() => {
                                setElements(prevElements => prevElements.map(el => {
                                  if (el.id === selectedId) {
                                    return {
                                      ...el,
                                      align: 'center'
                                    };
                                  }
                                  return el;
                                }));
                              }}
                              className={`flex-1 px-2 py-0.5 text-xs rounded ${
                                elements.find(el => el.id === selectedId)?.align === 'center' 
                                  ? 'bg-indigo-500 text-white' 
                                  : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              ↔
                            </button>
                            <button
                              onClick={() => {
                                setElements(prevElements => prevElements.map(el => {
                                  if (el.id === selectedId) {
                                    return {
                                      ...el,
                                      align: 'right'
                                    };
                                  }
                                  return el;
                                }));
                              }}
                              className={`flex-1 px-2 py-0.5 text-xs rounded ${
                                elements.find(el => el.id === selectedId)?.align === 'right' 
                                  ? 'bg-indigo-500 text-white' 
                                  : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              →
                            </button>
                          </div>
                        </div>
                        
                        {/* Color Picker - plus compact */}
                        {showColorPicker && colorPickerTarget === 'text' && (
                          <div className="mt-2 p-2 border border-gray-200 rounded-lg bg-white shadow-md">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium">Couleur du texte</span>
                              <button 
                                onClick={() => setShowColorPicker(false)}
                                className="text-gray-500 hover:text-gray-700 text-xs"
                              >
                                ×
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-5 gap-1 mb-1">
                              {presetColors.map((color) => (
                                <div
                                  key={color}
                                  className="w-5 h-5 rounded-full cursor-pointer border border-gray-300 flex items-center justify-center"
                                  style={{ backgroundColor: color }}
                                  onClick={() => handleColorSelect(color)}
                                >
                                  {color === selectedColor && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                  )}
                                </div>
                              ))}
                            </div>
                            
                            <div className="mt-1">
                              <input
                                type="color"
                                value={selectedColor}
                                onChange={(e) => setSelectedColor(e.target.value)}
                                className="w-full h-5"
                              />
                              <button
                                onClick={() => handleColorSelect(selectedColor)}
                                className="w-full mt-1 px-2 py-0.5 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600"
                              >
                                Appliquer
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Shape properties - version plus compacte */}
                    {elements.find(el => el.id === selectedId)?.type === 'rect' && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-8 h-8 rounded-full border border-gray-300 cursor-pointer"
                            style={{ backgroundColor: elements.find(el => el.id === selectedId)?.fill || '#3498db' }}
                            onClick={() => {
                              setColorPickerTarget('fill');
                              setSelectedColor(elements.find(el => el.id === selectedId)?.fill || '#3498db');
                              setShowColorPicker(true);
                            }}
                          ></div>
                          <span className="text-xs text-gray-500">Couleur de remplissage</span>
                        </div>
                        
                        {/* Color Picker for shape fill - version compacte */}
                        {showColorPicker && colorPickerTarget === 'fill' && (
                          <div className="mt-2 p-2 border border-gray-200 rounded-lg bg-white shadow-md">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium">Couleur de remplissage</span>
                              <button 
                                onClick={() => setShowColorPicker(false)}
                                className="text-gray-500 hover:text-gray-700 text-xs"
                              >
                                ×
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-5 gap-1 mb-1">
                              {presetColors.map((color) => (
                                <div
                                  key={color}
                                  className="w-5 h-5 rounded-full cursor-pointer border border-gray-300 flex items-center justify-center"
                                  style={{ backgroundColor: color }}
                                  onClick={() => handleColorSelect(color)}
                                >
                                  {color === selectedColor && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                  )}
                                </div>
                              ))}
                            </div>
                            
                            <div className="mt-1">
                              <input
                                type="color"
                                value={selectedColor}
                                onChange={(e) => setSelectedColor(e.target.value)}
                                className="w-full h-5"
                              />
                              <button
                                onClick={() => handleColorSelect(selectedColor)}
                                className="w-full mt-1 px-2 py-0.5 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600"
                              >
                                Appliquer
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Nouvel onglet Uploads */}
            {activeTab === 'uploads' && (
              <div className="space-y-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Télécharger des fichiers
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                        >
                          <span>Sélectionner des fichiers</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            multiple
                            className="sr-only"
                            onChange={handleFileUpload}
                            accept=".png,.jpg,.jpeg"
                            ref={fileInputRef}
                            disabled={uploading}
                          />
                        </label>
                        <p className="pl-1">ou glisser-déposer</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG jusqu'à 10MB</p>
                      
                      {uploading && (
                        <div className="mt-2">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{uploadProgress}% téléchargé</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Images téléchargées</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {uploadedImages.map(img => (
                      <div 
                        key={img.id}
                        className="aspect-square border border-gray-200 rounded-md overflow-hidden cursor-pointer hover:border-indigo-500"
                        onClick={() => addElement('image', img.src, img.name)}
                      >
                        <img 
                          src={img.src} 
                          alt={img.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {uploadedImages.length === 0 && (
                      <div className="col-span-2 text-center py-8 text-gray-500">
                        Aucune image téléchargée
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Nouvel onglet Bibliothèque avec info sur le chemin d'accès */}
            {activeTab === 'library' && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Bibliothèque d'images</h4>
                
                {/* Grille d'images simplifiée */}
                <div className="grid grid-cols-2 gap-2">
                  {libraryImages.map(img => (
                    <div 
                      key={img.id}
                      className="border border-gray-200 rounded-md overflow-hidden hover:border-indigo-500 cursor-pointer"
                      onClick={() => addElement('image', img.src_nocache || img.src, img.name)}
                    >
                      <div className="aspect-square">
                        <img 
                          src={img.src_nocache || img.src} 
                          alt={img.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="px-2 py-1 bg-gray-50 text-xs">
                        <span className="font-medium">{img.name}</span>
                      </div>
                    </div>
                  ))}
                  {libraryImages.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                      <p>Aucune image dans la bibliothèque</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'layouts' && (
              <div className="space-y-2">
                {savedLayouts.map(layout => (
                  <div 
                    key={layout.id}
                    className="p-3 border border-gray-200 rounded-md hover:bg-gray-100 cursor-pointer"
                    onClick={() => loadLayout(layout.id)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{layout.name}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(layout.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {savedLayouts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Aucun layout enregistré
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Supprimer la section Propriétés en double et le sélecteur de couleur ici */}
    </div>
  );
};

export default CanvasEditor;
