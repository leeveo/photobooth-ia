'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  Stage, Layer, Rect, Image as KonvaImage, Transformer, Text,
  Arc, Arrow, Circle, Ellipse, Line, Path, RegularPolygon, Ring, Star, Wedge
} from 'react-konva';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import TabComponentWrapper from './TabComponentWrapper';

// Import tab components - handle safely in case they have issues
let ElementsTab, TextTab, UnsplashTab, LayoutTab;
try {
  ElementsTab = require('./ElementsTab').default;
  TextTab = require('./TextTab').default;
  UnsplashTab = require('./UnsplashTab').default;
  LayoutTab = require('./LayoutTab').default;
} catch (error) {
  console.error("Error importing tab components:", error);
  // We'll handle the missing components in the TabComponentWrapper
}

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

const CanvasEditor = ({ projectId, onSave, initialData = null, isTemplateMode = false }) => {
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
        // Skip loading assets from project if in template mode
        if (isTemplateMode) {
          console.log('Mode template activé, chargement des assets génériques');
          // Initialisation avec des données initiales si fournies
          if (initialData && initialData.elements) {
            console.log('Initialisation avec les données sauvegardées');
            setElements(initialData.elements);
            if (initialData.stageSize) {
              setStageSize(initialData.stageSize);
            }
          }
          setLoading(false);
          return;
        }
        
        console.log('Chargement des assets pour le projet:', projectId);
        
        // Vérifier que le client Supabase est correctement initialisé
        if (!supabase) {
          console.error('Client Supabase non initialisé');
          throw new Error('Client Supabase non initialisé');
        }
        
        // Tester la connexion Supabase avant de faire des requêtes
        try {
          const { data: testData, error: testError } = await supabase.from('projects').select('id').limit(1);
          if (testError) {
            console.error('Erreur de connexion Supabase:', testError);
            throw testError;
          }
          console.log('Connexion Supabase OK');
        } catch (testErr) {
          console.error('Erreur lors du test de connexion Supabase:', testErr);
          throw testErr;
        }

        // Load backgrounds with improved error handling
        console.log('Chargement des arrière-plans...');
        const { data: bgData, error: bgError } = await supabase
          .from('backgrounds')
          .select('*')
          .eq('project_id', projectId)
          .eq('is_active', true);
          
        if (bgError) {
          console.error('Erreur lors du chargement des arrière-plans:', bgError);
          throw bgError;
        }
        console.log(`${bgData?.length || 0} arrière-plans chargés`);
        setBackgrounds(bgData || []);
        
        // Load styles/images with improved error handling
        console.log('Chargement des styles...');
        const { data: styleData, error: styleError } = await supabase
          .from('styles')
          .select('*')
          .eq('project_id', projectId);
          
        if (styleError) {
          console.error('Erreur lors du chargement des styles:', styleError);
          throw styleError;
        }
        console.log(`${styleData?.length || 0} styles chargés`);
        
        const processedImages = styleData?.map(style => ({
          id: style.id,
          src: style.preview_image,
          name: style.name
        })) || [];
        
        setImages(processedImages);
        
        // Load saved layouts with improved error handling
        console.log('Chargement des layouts...');
        const { data: layoutData, error: layoutError } = await supabase
          .from('canvas_layouts')
          .select('*')
          .eq('project_id', projectId);
          
        if (layoutError) {
          console.error('Erreur lors du chargement des layouts:', layoutError);
          // Don't throw here, just log the error since layouts are optional
        } else {
          console.log(`${layoutData?.length || 0} layouts chargés`);
          setSavedLayouts(layoutData || []);
        }
        
        // Initialize with saved data if provided
        if (initialData && initialData.elements) {
          console.log('Initialisation avec les données sauvegardées');
          setElements(initialData.elements);
          if (initialData.stageSize) {
            setStageSize(initialData.stageSize);
          }
        }
        
      } catch (error) {
        console.error('Error loading canvas assets:', error);
        // Si nous sommes en mode template, ne pas afficher d'erreur pour l'ID du projet
        if (isTemplateMode && error.message.includes('projet')) {
          console.log('Erreur ignorée en mode template:', error.message);
        } else {
          // Afficher un message d'erreur ou logger pour debug
          console.log('Details:', {
            message: error.message,
            hint: error.hint,
            details: error.details,
            stack: error.stack
          });
        }
      } finally {
        setLoading(false);
      }
    }
    
    // En mode template, on charge toujours les assets, même sans projectId
    if (projectId || isTemplateMode) {
      loadAssets();
    }
  }, [projectId, supabase, initialData, isTemplateMode]);
  
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
      // Ne pas charger les images si nous sommes en mode template et qu'il n'y a pas d'ID de projet valide
      if (isTemplateMode && (!projectId || projectId === 'template-editor')) {
        console.log('Mode template: chargement d\'images génériques');
        // Charger des images génériques pour le mode template
        const genericImages = [
          { id: 'generic-1', name: 'Image 1', src: '/images/templates/placeholder-1.jpg' },
          { id: 'generic-2', name: 'Image 2', src: '/images/templates/placeholder-2.jpg' },
          { id: 'generic-3', name: 'Image 3', src: '/images/templates/placeholder-3.jpg' }
        ];
        setLibraryImages(genericImages);
        return;
      }
      
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
  }, [isTemplateMode, projectId]);

  // Fonction pour charger les images téléchargées par l'utilisateur
  const loadUploadedImages = useCallback(async () => {
    try {
      // Ne pas charger les images uploadées si nous sommes en mode template
      if (isTemplateMode) {
        console.log('Mode template: pas de chargement d\'images téléchargées');
        setUploadedImages([]);
        return;
      }
      
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
  }, [projectId, supabase, isTemplateMode]); // Ajout des dépendances
  
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
      const containerHeight = window.innerHeight * 0.6; // Use 60% of viewport height as max height
      const format = formats.find(f => f.id === selectedFormat) || formats[0];
      
      // Calculate the scale that fits both width and height constraints while maintaining aspect ratio
      const scaleByWidth = containerWidth / format.pixelWidth;
      const scaleByHeight = containerHeight / format.pixelHeight;
      const scale = Math.min(1, scaleByWidth, scaleByHeight); // Never scale up beyond 1
      
      setStageSize(prevSize => {
        // If the size hasn't changed, don't trigger a re-render
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
  }, [formats, selectedFormat]);
  
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
  
  // Mise à jour de la fonction addElement pour supporter les propriétés personnalisées
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
  
  const removeSelected = () => {
    if (!selectedId) return;
    
    setElements(elements.filter(el => el.id !== selectedId));
    setSelectedId(null);
  };
  
  // Fonction pour sauvegarder le layout
  const saveLayout = async () => {
    // En mode template, on ne sauvegarde pas dans la base de données
    // mais on appelle directement la fonction onSave
    if (isTemplateMode) {
      if (onSave) {
        onSave({
          elements,
          stageSize
        });
      }
      return;
    }
    
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
  
  // Modifiez la fonction loadLayout pour accepter directement les éléments et la taille du stage
  const loadLayout = useCallback(async (layoutId, customElements, customStageSize) => {
    console.log('🔍 loadLayout appelé avec:', { layoutId, hasCustomElements: !!customElements, hasCustomStageSize: !!customStageSize });
    
    try {
      if (layoutId && !customElements) {
        // Cas 1: On a un ID mais pas d'éléments personnalisés -> Charger depuis la BD
        console.log('📋 Chargement du layout depuis la BD:', layoutId);
        const layout = savedLayouts.find(l => l.id === layoutId);
        
        if (layout) {
          console.log('📥 Layout trouvé dans les layouts sauvegardés');
          
          // Correction: Vérifier et extraire les éléments et la taille du stage
          let parsedElements, parsedStageSize;
          
          if (typeof layout.elements === 'string') {
            parsedElements = JSON.parse(layout.elements || '[]');
          } else if (layout.elements) {
            parsedElements = layout.elements;
          } else {
            parsedElements = [];
          }
          
          if (typeof layout.stage_size === 'string') {
            parsedStageSize = JSON.parse(layout.stage_size || '{}');
          } else if (layout.stage_size) {
            parsedStageSize = layout.stage_size;
          } else {
            parsedStageSize = {};
          }
          
          // Appliquer les éléments et la taille du stage
          setElements(parsedElements);
          setStageSize(parsedStageSize);
          // Désélectionner tout élément
          setSelectedId(null);
          
          console.log(`✅ Layout "${layout.name}" chargé avec ${parsedElements.length} éléments`);
        } else {
          console.error('❌ Layout non trouvé avec ID:', layoutId);
        }
      } else if (customElements) {
        // Cas 2: On a des éléments personnalisés -> Les utiliser directement
        console.log('📥 Chargement des éléments personnalisés:', customElements.length);
        
        // Appliquer les éléments
        setElements(customElements);
        
        // Si une taille de stage personnalisée est fournie, l'appliquer aussi
        if (customStageSize) {
          console.log('📐 Application de la taille personnalisée:', customStageSize);
          setStageSize(customStageSize);
        }
        
        // Désélectionner tout élément
        setSelectedId(null);
        
        console.log('✅ Éléments personnalisés chargés');
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement du layout:', error);
    }
  }, [savedLayouts]);
  
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

// Add a function to handle text property changes
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
  
  // Also update textProps state to keep UI in sync
  setTextProps(prev => ({
    ...prev,
    [property]: value
  }));
}, [selectedId]);

  // Attention: ne pas appeler des fonctions qui modifient l'état directement dans le rendu
  // Assurez-vous que toutes les fonctions appelées dans le JSX sont des gestionnaires d'événements
  
  // Modifier le bouton de test URL directe pour utiliser la fonction définie
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 space-y-3 md:space-y-0">
        <h3 className="text-lg font-medium text-gray-900">Éditeur de Canvas</h3>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
          {/* Format selection dropdown */}
          <div className="w-full sm:w-auto">
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
          
          <div className="flex space-x-2 w-full sm:w-auto">
            <button
              onClick={removeSelected}
              disabled={!selectedId}
              className={`px-3 py-1.5 text-sm rounded-md flex-1 sm:flex-none ${
                selectedId 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Supprimer la sélection
            </button>
            
            <div className="flex items-center border border-gray-300 rounded-md flex-1 sm:flex-none">
              <input
                type="text"
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                placeholder="Nom du layout"
                className="px-3 py-1.5 text-sm border-none focus:ring-0 w-full"
              />
              <button
                onClick={saveLayout}
                disabled={!layoutName.trim()}
                className={`px-3 py-1.5 text-sm rounded-r-md whitespace-nowrap ${
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
      </div>
      
      {/* New 3-column layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Column 1: Vertical tabs */}
        <div className="w-full lg:w-16 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-lg flex lg:flex-col shadow-lg">
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
          
          {/* New Text Tab Button */}
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
              activeTab === 'library' 
                ? 'bg-white bg-opacity-20 text-white' 
                : 'text-white text-opacity-70 hover:text-opacity-100 hover:bg-white hover:bg-opacity-10'
            }`}
            onClick={() => setActiveTab('library')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">Bibliothèque</span>
          </button>
          <button
            className={`flex flex-col items-center justify-center p-3 w-full transition-all duration-300 ${
              activeTab === 'layouts' 
                ? 'bg-white bg-opacity-20 text-white' 
                : 'text-white text-opacity-70 hover:text-opacity-100 hover:bg-white hover:bg-opacity-10'
            }`}
            onClick={() => setActiveTab('layouts')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs font-medium">Layouts</span>
          </button>
          {/* Nouvel onglet Unsplash */}
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
        
        {/* Column 2: Tab content */}
        <div className="w-full lg:w-68 border border-gray-300 rounded-lg p-4 bg-gray-50 flex flex-col">
          <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
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
            {activeTab === 'library' && (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Bibliothèque
              </>
            )}
            {activeTab === 'layouts' && (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Layouts
              </>
            )}
            {activeTab === 'unsplash' && (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Images Unsplash
              </>
            )}
          </h4>
          
          <div className="flex-grow overflow-y-auto max-h-[60vh] lg:max-h-[calc(100vh-20rem)]">
            {activeTab === 'elements' && (
              <TabComponentWrapper
                component={ElementsTab}
                componentName="ElementsTab" 
                addElement={addElement}
                elements={elements}
                selectedId={selectedId}
                handleColorSelect={handleColorSelect}
                showColorPicker={showColorPicker}
                setShowColorPicker={setShowColorPicker}
                selectedColor={selectedColor}
                setSelectedColor={setSelectedColor}
                colorPickerTarget={colorPickerTarget}
                setColorPickerTarget={setColorPickerTarget}
                presetColors={presetColors}
              />
            )}
            
            {activeTab === 'text' && (
              <TabComponentWrapper
                component={TextTab}
                componentName="TextTab"
                addElement={addElement}
                elements={elements}
                selectedId={selectedId}
                handleTextPropertyChange={handleTextPropertyChange}
                showColorPicker={showColorPicker}
                setShowColorPicker={setShowColorPicker}
                selectedColor={selectedColor}
                setSelectedColor={setSelectedColor}
                colorPickerTarget={colorPickerTarget}
                setColorPickerTarget={setColorPickerTarget}
                handleColorSelect={handleColorSelect}
                presetColors={presetColors}
                availableFonts={availableFonts}
              />
            )}
            
            {/* Uploads tab content */}
            {activeTab === 'uploads' && (
              <div className="space-y-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Télécharger des fichiers
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    {/* ...existing uploads content... */}
                    <div>Uploads content</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Images téléchargées</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {/* ...existing uploaded images grid... */}
                    <div>Uploaded images grid</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Library tab content */}
            {activeTab === 'library' && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Bibliothèque d'images</h4>
                
                <div className="grid grid-cols-2 gap-2">
                  {/* ...existing library images grid... */}
                  <div>Library images grid</div>
                </div>
              </div>
            )}
            
            {/* Layouts tab content */}
            {activeTab === 'layouts' && (
              <TabComponentWrapper
                component={LayoutTab}
                componentName="LayoutTab"
                projectId={projectId}
                savedLayouts={savedLayouts}
                loadLayout={(layoutId, customElements, customStageSize) => {
                  console.log('Loading layout from LayoutTab:', layoutId, customElements);
                  if (layoutId) {
                    // Call the function with just the ID
                    loadLayout(layoutId);
                  } else if (customElements) {
                    // Handle direct elements application
                    setElements(customElements);
                    if (customStageSize) {
                      setStageSize(customStageSize);
                    }
                    setSelectedId(null);
                  }
                }}
                saveLayout={saveLayout}
                setLayoutName={setLayoutName}
                layoutName={layoutName}
                elements={elements}
                stageSize={stageSize}
                setSavedLayouts={setSavedLayouts}
              />
            )}
            
            {/* Unsplash tab content */}
            {activeTab === 'unsplash' && (
              <TabComponentWrapper
                component={UnsplashTab}
                componentName="UnsplashTab"
                addElement={addElement}
              />
            )}
          </div>
        </div>
        
        {/* Column 3: Canvas */}
        <div className="w-full lg:flex-grow">
          <div className="mb-2 text-sm text-gray-500 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-1 sm:space-y-0">
            <span>
              Format: {formats.find(f => f.id === selectedFormat)?.name}
            </span>
            <span>
              Dimensions: {stageSize.width}×{stageSize.height} pixels ({Math.round(stageSize.scale * 100)}%)
            </span>
          </div>
          
          <div 
            ref={containerRef} 
            className="border border-gray-300 rounded-lg bg-gray-100 overflow-hidden flex justify-center items-center p-2 md:p-4"
            style={{
              minHeight: '300px',
              height: 'auto',
              maxHeight: 'calc(70vh - 100px)',
              aspectRatio: formats.find(f => f.id === selectedFormat)?.ratio || 1.5
            }}
          >
            {/* Conteneur pour le stage avec mise à l'échelle */}
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
                  
                  {/* Rendu des éléments du canvas */}
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
                    } else if (element.type === 'arc') {
                      return (
                        <Arc
                          key={element.id}
                          id={element.id}
                          x={element.x}
                          y={element.y}
                          innerRadius={element.innerRadius}
                          outerRadius={element.outerRadius}
                          angle={element.angle}
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
                    } else if (element.type === 'arrow') {
                      const points = element.points || [0, 0, 100, 0];
                      return (
                        <Arrow
                          key={element.id}
                          id={element.id}
                          x={element.x}
                          y={element.y}
                          points={points}
                          pointerLength={element.pointerLength}
                          pointerWidth={element.pointerWidth}
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
                    } else if (element.type === 'ring') {
                      return (
                        <Ring
                          key={element.id}
                          id={element.id}
                          x={element.x}
                          y={element.y}
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
                    } else if (element.type === 'line') {
                      return (
                        <Line
                          key={element.id}
                          id={element.id}
                          x={element.x}
                          y={element.y}
                          points={element.points}
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
                    } else if (element.type === 'wedge') {
                      return (
                        <Wedge
                          key={element.id}
                          id={element.id}
                          x={element.x}
                          y={element.y}
                          radius={element.radius}
                          angle={element.angle}
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
      </div>
    </div>
  );
};

export default CanvasEditor;