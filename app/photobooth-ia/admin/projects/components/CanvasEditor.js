'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  Stage, Layer, Rect, Image as KonvaImage, Transformer, Text,
  Arc, Arrow, Circle, Ellipse, Line, Path, RegularPolygon, Ring, Star, Wedge
} from 'react-konva';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import TabComponentWrapper from './TabComponentWrapper';

// Import tab components - handle safely in case they have issues
let ElementsTab, TextTab, UnsplashTab, LayoutTab, TemplatesTab;
try {
  ElementsTab = require('./ElementsTab').default;
  TextTab = require('./TextTab').default;
  UnsplashTab = require('./UnsplashTab').default;
  LayoutTab = require('./LayoutTab').default;
  TemplatesTab = require('./TemplatesTab').default;
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
  const [loadError, setLoadError] = useState(false);
  
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous'; // Critical for CORS
    
    // Add timestamp to bust cache for S3 URLs
    const imageUrl = element.src.includes('leeveostockage.s3') 
      ? `${element.src}?t=${Date.now()}` 
      : element.src;
      
    img.src = imageUrl;
    
    img.onload = () => {
      setLoadError(false);
      setImage(img);
      console.log(`Image loaded successfully: ${imageUrl}`);
    };
    
    img.onerror = (e) => {
      console.error(`Failed to load image: ${imageUrl}`, e);
      setLoadError(true);
      
      // Try without crossOrigin as fallback
      if (img.crossOrigin) {
        console.log('Retrying without crossOrigin...');
        const fallbackImg = new window.Image();
        fallbackImg.src = imageUrl;
        fallbackImg.onload = () => {
          setLoadError(false);
          setImage(fallbackImg);
          console.log(`Fallback image loaded: ${imageUrl}`);
        };
      }
    };
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [element.src]);
  
  if (loadError) {
    return null; // Or render a placeholder/error image
  }

  if (!image) {
    return null; // Loading
  }

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
  // --- NOUVEAU : États pour les orientations depuis Supabase ---
  const [orientations, setOrientations] = useState([]);
  const [selectedOrientationId, setSelectedOrientationId] = useState(null);

  const supabase = createClientComponentClient();

  // Charger les orientations depuis la table photobooth_orientation
  useEffect(() => {
    async function fetchOrientations() {
      try {
        const { data, error } = await supabase
          .from('photobooth_orientation')
          .select('*')
          .order('id_orientation', { ascending: true });
        if (error) throw error;
        setOrientations(data || []);
        // Sélectionner la première orientation par défaut
        if (data && data.length > 0) {
          setSelectedOrientationId(data[0].id_orientation);
        }
      } catch (err) {
        console.error('Erreur chargement orientations:', err);
      }
    }
    fetchOrientations();
  }, [supabase]);

  // Ajout pour l'encart photo de l'orientation sélectionnée
  const [photoFrame, setPhotoFrame] = useState(null);

  // Met à jour la taille du canvas selon l'orientation sélectionnée
  useEffect(() => {
    if (!orientations.length || !selectedOrientationId) return;
    const orientation = orientations.find(o => o.id_orientation === selectedOrientationId);
    if (orientation) {
      setStageSize({
        width: orientation.width,
        height: orientation.height,
        scale: 1
      });
      // Ajout : met à jour l'encart photo si les champs sont présents
      if (
        orientation.position_x !== undefined &&
        orientation.position_y !== undefined &&
        orientation.width_encart_photo !== undefined &&
        orientation.height_encart_photo !== undefined &&
        orientation.width_encart_photo !== null &&
        orientation.height_encart_photo !== null
      ) {
        setPhotoFrame({
          x: orientation.position_x,
          y: orientation.position_y,
          width: orientation.width_encart_photo,
          height: orientation.height_encart_photo
        });
      } else {
        setPhotoFrame(null);
      }
    }
  }, [orientations, selectedOrientationId]);

  // État pour stocker les dimensions du canvas en pixels
  const [stageSize, setStageSize] = useState({
    width: 970,    // valeur par défaut (ex: 10x15cm en pixels)
    height: 651,   // valeur par défaut
    scale: 1
  });
  
  // Liste des formats disponibles
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [images, setImages] = useState([]);
  const [backgrounds, setBackgrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('backgrounds');
  const [savedLayouts, setSavedLayouts] = useState([]);
  // Supprimer l'état layoutName qui n'est plus nécessaire
  // const [layoutName, setLayoutName] = useState('');
  const [projectName, setProjectName] = useState(''); // Ajouter un état pour le nom du projet
  // Nouvelles variables d'état pour les fonctionnalités ajoutées
  const [libraryImages, setLibraryImages] = useState([]);
    const [frameImages, setFrameImages] = useState([]);
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
  
  // Add templates to the list of states
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState(null);
  
  // Ajouter un état pour stocker l'URL de la miniature
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  
  // Ajouter un état pour le statut RLS
  const [rlsStatus, setRlsStatus] = useState({ checked: false, ok: false });
  

  useEffect(() => {
  const loadTemplates = async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const { data, error } = await supabase
        .from('layout_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setTemplates(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des templates :', error);
      setTemplatesError("Impossible de charger les templates.");
    } finally {
      setTemplatesLoading(false);
    }
  };

  if (activeTab === 'templates') {
    loadTemplates();
  }
}, [activeTab, supabase]);




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

  // Fonction améliorée pour charger dynamiquement toutes les images du dossier stickers sur AWS S3 (leeveostockage)
  const loadLibraryImages = useCallback(async () => {
    try {
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

      // --- AWS S3 LEEVEOSTOCKAGE: Génération d'URL directe ---
      // On ne peut pas lister le contenu d'un bucket S3 public côté client sans API ou index.
      // Donc, il faut soit :
      // 1. Connaitre la liste des fichiers (ex: stickers-001.png à stickers-5000.png)
      // 2. OU avoir un index JSON généré côté serveur
      // Ici, on génère une liste d'URL basée sur un pattern connu

      const s3BaseUrl = "https://leeveostockage.s3.eu-west-3.amazonaws.com/stickers/";
      const stickersCount = 100; // <-- Mettez ici le nombre réel de stickers ou un nombre raisonnable

      // Génère stickers-001.png à stickers-100.png
      const stickerFiles = Array.from({ length: stickersCount }, (_, i) => {
        const num = String(i + 1).padStart(3, '0');
        return `stickers-${num}.png`;
      });

      const images = stickerFiles.map((filename, index) => ({
        id: `sticker-${index}`,
        name: filename,
        src: `${s3BaseUrl}${filename}`,
        src_nocache: `${s3BaseUrl}${filename}?t=${Date.now()}`
      }));

      setLibraryImages(images);

    } catch (error) {
      console.error('Erreur lors du chargement des images:', error);
      setLibraryImages([]);
    }
  }, [isTemplateMode, projectId]);


const loadFrameImages = useCallback(async () => {
  try {
    const s3BaseUrl = "https://leeveostockage.s3.eu-west-3.amazonaws.com/photobooth_encadrement/";
    const framesCount = 100; // Adapte à ton nombre réel d'encadrements

    const frameFiles = Array.from({ length: framesCount }, (_, i) => {
      const num = String(i + 1).padStart(3, '0');
      return `frame${num}.png`; // adapte au nom réel des fichiers
    });

    const frames = frameFiles.map((filename, index) => ({
      id: `frame${index}`,
      
      src: `${s3BaseUrl}${filename}`,
      src_nocache: `${s3BaseUrl}${filename}?t=${Date.now()}`
    }));

    setFrameImages(frames);
  } catch (error) {
    console.error("Erreur chargement encadrements:", error);
    setFrameImages([]);
  }
}, []);





  // Fonction pour charger les images téléchargées par l'utilisateur
  const loadUploadedImages = useCallback(async () => {
    try {
      // Ne pas charger les images uploadées si nous sommes en mode template
      if (isTemplateMode) {
        console.log('Mode template: pas de chargement d\'images téléchargées');
        setUploadedImages([]);
        return;
      }
      
      // Option 1: Si vous stockez les URLs des images dans une table Supabase
      // Remplacez 'uploaded_images' par le nom de votre table
      const { data, error } = await supabase
        .from('uploaded_images')
        .select('id, name, url')
        .eq('project_id', projectId);
        
      if (error) {
        console.log('Aucune image trouvée en base de données, utilisation des images locales');
        // Continuer avec des images locales ou vide
      } else if (data && data.length > 0) {
        // Si des images sont trouvées en base de données, les utiliser
        const images = data.map(img => ({
          id: img.id,
          name: img.name,
          src: img.url
        }));
        
        setUploadedImages(images);
        return;
      }
      
      // Option 2: Si vous n'avez pas de table spécifique, initialisez avec un tableau vide
      // ou des images de test pour le développement
      setUploadedImages([]);
      
    } catch (error) {
      console.error('Error loading uploaded images:', error);
      setUploadedImages([]);
    }
  }, [projectId, supabase, isTemplateMode]); // Ajout des dépendances
  
  // Fonction pour gérer l'upload de fichiers - modifiée pour utiliser AWS S3
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
        const s3Path = `photobooth_uploads/${projectId}/${fileName}`;
        
        // Créer FormData pour l'upload vers S3 via l'API
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'leeveostockage');
        formData.append('path', s3Path);
        
        // Upload du fichier vers AWS S3 via l'API existante
        const uploadResponse = await fetch('/api/upload-s3', {
          method: 'POST',
          body: formData
        });
        
        if (!uploadResponse.ok) {
          throw new Error(`S3 upload failed: ${uploadResponse.statusText}`);
        }
        
        const uploadResult = await uploadResponse.json();
        const imageUrl = uploadResult.url;
        
        // Enregistrer l'URL dans la base de données si nécessaire
        // Vous pouvez ajouter ici un appel à l'API pour stocker l'URL dans votre base de données
        
        // Ajouter l'image à la liste des images téléchargées
        uploadedImagesList.push({
          id: `s3-${Date.now()}-${i}`,
          name: fileName,
          src: imageUrl
        });
        
        // Mettre à jour la progression
        setUploadProgress(Math.round((i + 1) / files.length * 100));
      }
      
      setUploadedImages(uploadedImagesList);
      
      // Afficher une notification de succès
      showNotification('Images téléchargées avec succès', 'success');
      
    } catch (error) {
      console.error('Error uploading files:', error);
      showNotification(`Erreur lors du téléchargement: ${error.message}`, 'error');
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
    if (containerRef.current && orientations.length && selectedOrientationId) {
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = window.innerHeight * 0.6; // Use 60% of viewport height as max height
      const orientation = orientations.find(o => o.id_orientation === selectedOrientationId);
      if (!orientation) return;
      // Calculate the scale that fits both width and height constraints while maintaining aspect ratio
      const scaleByWidth = containerWidth / orientation.width;
      const scaleByHeight = containerHeight / orientation.height;
      const scale = Math.min(1, scaleByWidth, scaleByHeight); // Never scale up beyond 1
      
      setStageSize(prevSize => {
        // If the size hasn't changed, don't trigger a re-render
        if (
          prevSize.width === orientation.width &&
          prevSize.height === orientation.height &&
          prevSize.scale === scale
        ) {
          return prevSize;
        }
        
        return {
          width: orientation.width,
          height: orientation.height,
          scale: scale
        };
      });
    }
  }, [orientations, selectedOrientationId]);
  
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
  }, [selectedOrientationId, checkSize]); // checkSize est stable et ne devrait pas causer de boucle
  
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
  
  // Ensure unique keys for elements
  const addElement = (type, src = null, name = 'New Element', customProps = null) => {
    const uniqueId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
          id: uniqueId,
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
          id: uniqueId,
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
        id: uniqueId,
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
    if (!selectedId) {
      console.log('No element selected to remove');
      return;
    }
    
    console.log('Removing element with ID:', selectedId);
    
    // Create a new array without the selected element
    const updatedElements = elements.filter(el => el.id !== selectedId);
    
    // Check if element was actually removed
    if (updatedElements.length === elements.length) {
      console.warn('Element with ID', selectedId, 'not found in elements array');
    } else {
      console.log('Element removed successfully');
    }
    
    // Update the state with the new array
    setElements(updatedElements);
    
    // Clear the selection
    setSelectedId(null);
    
    // Force Konva layer to update if transformer is active
    if (transformerRef.current) {
      transformerRef.current.nodes([]);
      if (transformerRef.current.getLayer()) {
        transformerRef.current.getLayer().batchDraw();
      }
    }
  };
  
  // États pour la notification de sauvegarde
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success' // success ou error
  });
  
  // Add state for the custom popup
  const [savePopup, setSavePopup] = useState({
    visible: false,
    message: '',
    type: 'success' // or 'error'
  });
  
  // Fonction pour afficher une notification
  const showNotification = (message, type = 'success') => {
    setNotification({
      show: true,
      message,
      type
    });
    
    // Masquer la notification après 3 secondes
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };
  
  // Remplacer la fonction generateTransparentThumbnail par une version qui conserve la transparence
  const generateTransparentThumbnail = useCallback(() => {
    if (!stageRef.current) return null;

    try {
      // Sauvegarder l'échelle actuelle
      const originalScale = stageSize.scale;
      // Mettre l'échelle à 1 pour l'export
      stageRef.current.scale({ x: 1, y: 1 });
      stageRef.current.batchDraw();

      // Exporter le PNG avec transparence (pas de fond noir !)
      const dataURL = stageRef.current.toDataURL({
        pixelRatio: 1,
        mimeType: 'image/png',
        quality: 1
      });

      // Restaurer l'échelle d'origine
      stageRef.current.scale({ x: originalScale, y: originalScale });
      stageRef.current.batchDraw();

      setThumbnailUrl(dataURL);
      return Promise.resolve(dataURL);
    } catch (error) {
      console.error('Erreur lors de la génération de la miniature:', error);
      return null;
    }
  }, [stageSize]);
  
  // Fonction de secours : ne pas remplir de fond noir, garder la transparence
  const generateFallbackTransparentThumbnail = useCallback(() => {
    if (!stageRef.current) return null;

    try {
      // Même logique que la principale, mais sans fond noir
      const originalScale = stageSize.scale;
      stageRef.current.scale({ x: 1, y: 1 });
      stageRef.current.batchDraw();

      const dataURL = stageRef.current.toDataURL({
        pixelRatio: 1,
        mimeType: 'image/png',
        quality: 1
      });

      stageRef.current.scale({ x: originalScale, y: originalScale });
      stageRef.current.batchDraw();

      setThumbnailUrl(dataURL);
      return Promise.resolve(dataURL);
    } catch (error) {
      console.error('Erreur lors de la génération de la miniature de secours:', error);
      return null;
    }
  }, [stageSize]);

  // Modifiez également la fonction saveLayout pour améliorer la gestion des erreurs
  const saveLayout = async () => {
    try {
      // 1. Generate the thumbnail
      const thumbnail = await generateTransparentThumbnail();
      if (!thumbnail) {
        console.error('Thumbnail generation failed.');
        setSavePopup({
          visible: true,
          message: 'Erreur lors de la génération de la miniature.',
          type: 'error'
        });
        return;
      }

      console.log('Thumbnail generated successfully');
      
      // 2. Create a unique filename and layout data
      const timestamp = Date.now();
      const filename = `layout_${timestamp}.png`;
      const layoutName = `Layout_${new Date().toISOString().slice(0, 10)}`;
      
      // 3. Convert the thumbnail to a file
      const thumbnailFile = dataURLtoFile(thumbnail, filename);
      
      // 4. Create FormData for uploading to S3
      const formData = new FormData();
      formData.append('file', thumbnailFile);
      formData.append('bucket', 'leeveostockage');
      formData.append('path', `layouts/${filename}`);
      
      console.log('Uploading thumbnail to S3...');
      
      // 5. Upload thumbnail to S3 via API
      const uploadResponse = await fetch('/api/upload-s3', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`S3 upload failed: ${uploadResponse.statusText}`);
      }
      
      const uploadResult = await uploadResponse.json();
      const thumbnailUrl = uploadResult.url;
      
      console.log('Thumbnail uploaded successfully to S3:', thumbnailUrl);
      console.log('Saving layout with orientation ID:', selectedOrientationId);
      
      // 6. Prepare layout data with the thumbnail URL
      const layoutData = {
        project_id: projectId,
        name: layoutName,
        elements: JSON.stringify(elements),
        stage_size: JSON.stringify(stageSize),
        thumbnail_url: thumbnailUrl,
        orientation_id: selectedOrientationId, // Ajout de l'ID d'orientation sélectionné
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('Checking for existing layouts...');
      
      // 7. Check if a layout already exists for this project
      const { data: existingLayouts, error: fetchError } = await supabase
        .from('canvas_layouts')
        .select('id')
        .eq('project_id', projectId);
    
      if (fetchError) {
        console.error('Error checking existing layouts:', fetchError);
        throw fetchError;
      }
    
      let result;
    
      if (existingLayouts && existingLayouts.length > 0) {
        // Layout exists - UPDATE it
        console.log('Updating existing layout with ID:', existingLayouts[0].id);
        
        const { data, error } = await supabase
          .from('canvas_layouts')
          .update(layoutData)
          .eq('id', existingLayouts[0].id)
          .select();
        
        if (error) throw error;
        result = data;
        
        // If there are multiple layouts (shouldn't happen but just in case),
        // delete the extras
        if (existingLayouts.length > 1) {
          console.log('Cleaning up extra layouts...');
          const extraLayoutIds = existingLayouts.slice(1).map(l => l.id);
          
          const { error: deleteError } = await supabase
            .from('canvas_layouts')
            .delete()
            .in('id', extraLayoutIds);
            
          if (deleteError) {
            console.error('Error deleting extra layouts:', deleteError);
            // Continue anyway since the main layout was updated
          }
        }
      } else {
        // No layout exists - INSERT new one
        console.log('Creating new layout for project:', projectId);
        
        const { data, error } = await supabase
          .from('canvas_layouts')
          .insert(layoutData)
          .select();
        
        if (error) throw error;
        result = data;
      }
      
      // 8. Update local state with the layout
      const newLayout = result[0];
      setSavedLayouts([newLayout]); // Set to an array with only this layout
      
      // 9. Show success message with custom popup instead of alert
      setSavePopup({
        visible: true,
        message: 'Layout sauvegardé avec succès!',
        type: 'success'
      });
      
      // 10. If onSave callback exists, call it (for template mode)
      if (onSave) {
        onSave({
          elements,
          stageSize,
          thumbnailUrl
        });
      }
    } catch (error) {
      console.error('Error saving layout:', error);
      setSavePopup({
        visible: true,
        message: `Erreur lors de la sauvegarde: ${error.message}`,
        type: 'error'
      });
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
          } else if (layout.stage_size && typeof layout.stage_size === 'object') {
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

        loadFrameImages().catch(error => {
  console.error("Erreur chargement initial encadrements:", error);
});
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, [loading, loadLibraryImages, loadUploadedImages]);
  
  // Add the missing handleFormatChange function with useCallback
const handleOrientationChange = useCallback((e) => {
  setSelectedOrientationId(Number(e.target.value));
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

// Ajoute cette fonction AVANT le return du composant CanvasEditor
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

  // Attention: ne pas appeler des fonctions qui modifient l'état directement dans le rendu
  // Assurez-vous que toutes les fonctions appelées dans le JSX sont des gestionnaires d'événements
  
  // Modifier le bouton de test URL directe pour utiliser la fonction définie
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
      {/* Custom Save Popup */}
      {savePopup.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop with blur effect */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={() => setSavePopup(prev => ({ ...prev, visible: false }))}
          ></div>
          
          {/* Popup content */}
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4 relative z-10 transform transition-all">
            <div className="flex items-center mb-4">
              {savePopup.type === 'success' ? (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              ) : (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
              )}
              <h3 className="text-lg font-medium text-gray-900">
                {savePopup.type === 'success' ? 'Sauvegarde réussie' : 'Erreur'}
              </h3>
            </div>
            
            <p className="text-gray-700 mb-5">{savePopup.message}</p>
            
            <div className="flex justify-end">
              <button
                onClick={() => setSavePopup(prev => ({ ...prev, visible: false }))}
                className={`px-4 py-2 rounded-md text-white font-medium ${
                  savePopup.type === 'success' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Notification popup */}
      {notification.show && (
        <div 
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-3 transition-all duration-300 ease-out transform ${
            notification.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            notification.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          }`}>
            {notification.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            )}
          </div>
          <div>
            <p className={`text-sm font-medium ${notification.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {notification.message}
            </p>
          </div>
          <button 
            onClick={() => setNotification(prev => ({ ...prev, show: false }))}
            className="ml-auto text-gray-400 hover:text-gray-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          </button>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 space-y-3 md:space-y-0">
        <h3 className="text-lg font-medium text-gray-900">Éditeur de Canvas</h3>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
          {/* --- NOUVEAU : Sélection d'orientation dynamique --- */}
          <div className="w-full sm:w-auto">
            <label htmlFor="orientation-select" className="block text-sm font-medium text-gray-700 mb-1">
              Orientation
            </label>
            <select
              id="orientation-select"
              value={selectedOrientationId || ''}
              onChange={handleOrientationChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              {orientations.map(o => (
                <option key={o.id_orientation} value={o.id_orientation}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex space-x-2 w-full sm:w-auto">
            {thumbnailUrl && (
              <div className="hidden md:block">
                <img 
                  src={thumbnailUrl} 
                  alt="Aperçu" 
                  className="h-8 w-12 object-cover border border-gray-200 rounded"
                  style={{ background: 'repeating-centric-circles pink yellow 5px' }} // Ajouter un fond de motif pour mieux voir la transparence
                />
                <button 
      onClick={() => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          // Vérifier les données alpha
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let hasTransparentPixels = false;
          
          for (let i = 3; i < imgData.data.length; i += 4) {
            if (imgData.data[i] < 255) {
              hasTransparentPixels = true;
              break;
            }
          }
          
          alert(`Format: ${img.width}x${img.height}\nPNG transparent: ${hasTransparentPixels ? 'Oui' : 'Non'}`);
        };
        img.src = thumbnailUrl;
      }}
      className="text-xs text-indigo-600 hover:underline mt-1"
    >
      Vérifier
    </button>
              </div>
            )}
            <button
              onClick={(e) => {
    e.preventDefault(); // Prevent any event bubbling
    e.stopPropagation(); // Stop propagation
    removeSelected();
  }}
              disabled={!selectedId}
              className={`px-3 py-1.5 text-sm rounded-md flex-1 sm:flex-none ${
                selectedId 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Supprimer la sélection
            </button>
            
            <button
              onClick={saveLayout}
              className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 flex-1 sm:flex-none"
            >
              Sauvegarder Le Layout
            </button>
          </div>
        </div>
      </div>
      
      {/* New 3-column layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Column 1: Vertical tabs */}
        <div className="w-full lg:w-16 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-lg flex lg:flex-col shadow-lg">
          {/* Onglet Templates en premier */}
           {/* Nouvel onglet Encadrement */}
          <button
            className={`flex flex-col items-center justify-center p-3 w-full transition-all duration-300 ${
              activeTab === 'frames' 
                ? 'bg-white bg-opacity-20 text-white' 
                : 'text-white text-opacity-70 hover:text-opacity-100 hover:bg-white hover:bg-opacity-10'
            }`}
            onClick={() => setActiveTab('frames')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
              <rect x="7" y="7" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" fill="none"/>
            </svg>
            <span className="text-xs font-medium">Encart</span>
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
            <span className="text-xs font-medium">Stickers</span>
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
          
         
        </div>
        {/* Column 2: Tab content */}
        <div className="w-full lg:w-68 border border-gray-300 rounded-lg p-4 bg-gray-50 flex flex-col">
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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
            {activeTab === 'frames' && (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <rect x="7" y="7" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" fill="none"/>
                </svg>
                Images d'encadrement
              </>
            )}
          </h4>
          
          <div className="flex-grow overflow-y-auto max-h-[60vh] lg:max-h-[calc(100vh-20rem)]">
            {/* Add Templates tab content */}
            {activeTab === 'templates' && (
              <div className="space-y-4">
                {templatesLoading && (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Chargement des templates...</span>
                  </div>
                )}
                
               
                {templatesError && (
                  <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
                    {templatesError}
                  </div>
                )}
                
                {!templatesLoading && !templatesError && templates.length === 0 && (
                  <div className="text-center py-8">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="mt-4 text-gray-500">
Aucun template disponible.
                                       </p>
                  </div>
                )}
                
                {!templatesLoading && !templatesError && templates.length > 0 && (
                  <>
                    <p className="text-sm text-gray-600 mb-2">
                      Sélectionnez un template pour l'utiliser comme base
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {templates.map(template => (
                        <div
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className="border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all bg-white"
                        >
                          <div className="h-24 bg-gray-50 flex items-center justify-center">
                            {template.thumbnail_url ? (
                              <img 
                                src={template.thumbnail_url} 
                                alt={template.name}
                                className="w-full h-full object-cover"
                                style={{ maxWidth: 120, maxHeight: 96 }}
                                onError={e => {

                                  console.warn('[CanvasEditor] Erreur chargement thumbnail_url:', template.thumbnail_url);
                                  e.target.onerror = null;
                                  e.target.src = 'https://via.placeholder.com/120x96?text=No+Image';
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
                            <p className="text-xs text-gray-400">
                              {template.created_at ? new Date(template.created_at).toLocaleDateString() : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            
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
                    <div className="space-y-1 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                          <span>Télécharger un fichier</span>
                          <input 
                            id="file-upload" 
                            name="file-upload" 
                            type="file" 
                            className="sr-only"
                            onChange={handleFileUpload}
                            ref={fileInputRef}
                            accept="image/*"
                            multiple
                          />
                        </label>
                        <p className="pl-1">ou glisser-déposer</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG jusqu'à 10MB</p>
                      {uploading && (
                        <div className="w-full mt-2">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600"
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
                    {uploadedImages.map(image => (
                      <div
                        key={image.id}
                        className="border border-gray-200 rounded-md overflow-hidden cursor-pointer hover:shadow-md transition-all"
                        onClick={() => addElement('image', image.src, image.name)}
                      >
                        <div className="h-20 bg-gray-100 flex items-center justify-center">
                          <img
                            src={image.src}
                            alt={image.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="p-2">
                          <p className="text-xs text-gray-700 truncate">{image.name}</p>
                        </div>
                      </div>
                    ))}

                    {uploadedImages.length === 0 && (
                      <div className="col-span-2 text-center py-4 text-sm text-gray-500">
                        Aucune image téléchargée
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Library tab content */}
            {activeTab === 'library' && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Bibliothèque d'images</h4>
                {/* 
                  Les images affichées dans cette section proviennent désormais du bucket AWS S3 'leeveostockage',
                  dossier 'stickers' : https://leeveostockage.s3.eu-west-3.amazonaws.com/stickers/...
                  (voir la fonction loadLibraryImages ci-dessus).
                */}
                <div className="grid grid-cols-2 gap-2">
                  {libraryImages.map(image => (
                    <div
                      key={image.id}
                      className="border border-gray-200 rounded-md overflow-hidden cursor-pointer hover:shadow-md transition-all"
                      onClick={() => addElement('image', image.src, image.name)}
                    >
                      <div className="h-20 bg-gray-100 flex items-center justify-center">
                        <img
                          src={image.src}
                          alt={image.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-700 truncate">{image.name}</p>
                      </div>
                    </div>
                  ))}

                  {libraryImages.length === 0 && (
                    <div className="col-span-2 text-center py-4 text-sm text-gray-500">
                      <p>Aucune image dans la bibliothèque</p>
                      <button
                        onClick={testDirectUrl}
                        className="mt-2 text-indigo-600 hover:text-indigo-800 text-xs"
                      >
                        Tester URL directe
                      </button>
                    </div>
                  )}
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
                loadLayout={loadLayout}
                saveLayout={saveLayout}
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
            
            {/* Encadrement tab content */}
            {activeTab === 'frames' && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Images d'encadrement</h4>
                <div className="grid grid-cols-2 gap-2">
                  {frameImages.map(image => (
                    <div
                      key={image.id}
                      className="border border-gray-200 rounded-md overflow-hidden cursor-pointer hover:shadow-md transition-all"
                      onClick={() => addElement('image', image.src, image.name)}
                    >
                      <div className="h-20 bg-gray-100 flex items-center justify-center">
                        <img
                          src={image.src}
                          alt={image.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-700 truncate">{image.name}</p>
                      </div>
                    </div>
                  ))}
                  {frameImages.length === 0 && (
                    <div className="col-span-2 text-center py-4 text-sm text-gray-500">
                      <p>Aucune image d'encadrement trouvée</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Column 3: Canvas */}
        <div className="w-full lg:flex-grow">
          <div className="mb-2 text-sm text-gray-500 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-1 sm:space-y-0">
            <span>
              Orientation: {orientations.find(o => o.id_orientation === selectedOrientationId)?.label || ''}
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
              aspectRatio: (() => {
                const o = orientations.find(o => o.id_orientation === selectedOrientationId);
                return o ? o.width / o.height : 1.5;
              })()
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
                className="bg-transparent"
                style={{ boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}
                backgroundColor="transparent"
              >
                <Layer>
                  {/* Rectangle d'arrière-plan transparent */}
                  <Rect
                    x={0}
                    y={0}
                    width={stageSize.width}
                    height={stageSize.height}
                    fill="transparent"
                    name="background-rect"
                    id="background-rect"
                    className="background-rect"
                    listening={false}
                  />
                  {/* Affichage de l'encart photo si défini */}
                  {photoFrame && (
                    <Rect
                      x={photoFrame.x}
                      y={photoFrame.y}
                      width={photoFrame.width}
                      height={photoFrame.height}
                      stroke="#e11d48"
                      strokeWidth={4}
                      dash={[12, 8]}
                      listening={false}
                      fillEnabled={false}
                      perfectDrawEnabled={false}
                      cornerRadius={8}
                    />
                  )}
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
              Ce canvas correspond exactement au format d'impression sélectionné. Tout ce qui dépasse sera coupé à l'impression.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasEditor;

// Add the missing dataURLtoFile function definition if you're using it in this file
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

// Fonction pour décoder un token base64 JSON
const decodeBase64Session = (encodedToken) => {
  try {
    // Vérifier si c'est du Base64 (commence typiquement par "eyJ")
    if (encodedToken && encodedToken.startsWith('eyJ')) {
      // Décoder le Base64 en chaîne
      const decodedString = atob(encodedToken);
      return JSON.parse(decodedString);
    }
    // Sinon essayer de parser directement
    return JSON.parse(encodedToken);
  } catch (error) {
    console.error('Erreur de décodage token:', error);
    return encodedToken; // retourner tel quel en cas d'erreur
  }
};