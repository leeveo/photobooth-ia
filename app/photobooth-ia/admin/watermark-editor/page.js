"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { generateWatermarkPreview } from '../../../utils/watermarkUtils';

export default function WatermarkEditorPage() {
  // Hooks et références
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const editorCanvasRef = useRef(null);
  const supabase = createClientComponentClient();
  
  // États pour la gestion du projet et des éléments
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('/samples/sample-portrait-1.jpg');
  const [previewWithWatermark, setPreviewWithWatermark] = useState(null);
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [message, setMessage] = useState(null);
  
  // États pour le mode édition
  const [dragging, setDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [elementStartPos, setElementStartPos] = useState({ x: 0, y: 0 });
  
  // Dimensions de l'éditeur
  const EDITOR_WIDTH = 800;
  const EDITOR_HEIGHT = 1200;

  // Chargement initial du projet
  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      setMessage({ type: 'error', text: 'ID de projet manquant' });
      return;
    }

    async function loadProject() {
      try {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (projectError) {
          throw projectError;
        }

        setProject(projectData);

        // Charger les éléments de filigrane existants s'ils sont disponibles
        if (projectData.watermark_elements) {
          try {
            const parsedElements = JSON.parse(projectData.watermark_elements);
            console.log('Éléments de filigrane chargés:', parsedElements);
            setElements(parsedElements);
            // Mettre à jour l'historique avec les éléments initiaux
            setHistory([parsedElements]);
            setHistoryIndex(0);
          } catch (parseError) {
            console.error('Erreur lors de l\'analyse des éléments de filigrane:', parseError);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement du projet:', error);
        setMessage({ type: 'error', text: `Erreur: ${error.message}` });
        setLoading(false);
      }
    }

    loadProject();
  }, [projectId, supabase]);

  // Génération de l'aperçu avec filigrane lorsque les éléments changent
  const generatePreview = useCallback(async () => {
    try {
      const watermarkedPreview = await generateWatermarkPreview(
        elements, 
        previewUrl,
        { editorWidth: EDITOR_WIDTH, editorHeight: EDITOR_HEIGHT }
      );
      setPreviewWithWatermark(watermarkedPreview);
    } catch (error) {
      console.error('Erreur lors de la génération de l\'aperçu:', error);
    }
  }, [elements, previewUrl]);

  useEffect(() => {
    if (elements.length > 0) {
      generatePreview();
    } else {
      setPreviewWithWatermark(null);
    }
  }, [elements, generatePreview]);

  // Ajout d'un élément à l'historique des modifications
  const addToHistory = (newElements) => {
    // Si nous ne sommes pas à la fin de l'historique, supprimer les états suivants
    const newHistory = history.slice(0, historyIndex + 1);
    
    // Ajouter le nouvel état à l'historique
    const updatedHistory = [...newHistory, JSON.parse(JSON.stringify(newElements))];
    
    // Limiter l'historique à 30 états maximum pour éviter une consommation excessive de mémoire
    if (updatedHistory.length > 30) {
      updatedHistory.shift();
    }
    
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
  };

  // Gestion des fonctions Annuler/Rétablir
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setElements(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setElements(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  // Ajout d'un nouvel élément texte
  const handleAddText = () => {
    const newElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      text: 'Texte exemple',
      x: EDITOR_WIDTH / 2 - 100,
      y: EDITOR_HEIGHT / 2,
      fontSize: 48,
      fontFamily: 'Arial',
      color: '#FFFFFF',
      opacity: 0.8,
      rotation: 0,
      shadow: {
        enabled: true,
        color: 'rgba(0,0,0,0.5)',
        blur: 3,
        offsetX: 2,
        offsetY: 2
      }
    };
    
    const newElements = [...elements, newElement];
    setElements(newElements);
    setSelectedElement(newElement);
    addToHistory(newElements);
  };

  // Ajout d'un nouvel élément image/logo
  const handleAddImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result;
      if (!src) return;

      const newElement = {
        id: `image-${Date.now()}`,
        type: 'logo',
        src: src,
        x: EDITOR_WIDTH / 2 - 50,
        y: EDITOR_HEIGHT / 2 - 50,
        width: 150,
        height: 150,
        opacity: 0.8,
        rotation: 0
      };
      
      const newElements = [...elements, newElement];
      setElements(newElements);
      setSelectedElement(newElement);
      addToHistory(newElements);
    };
    
    reader.readAsDataURL(file);
  };

  // Fonctions pour la manipulation des éléments
  const handleElementDrag = (e) => {
    if (!dragging || !selectedElement) return;

    const canvas = editorCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * EDITOR_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * EDITOR_HEIGHT;
    
    const dx = x - dragStartPos.x;
    const dy = y - dragStartPos.y;
    
    setElements(elements.map(el => {
      if (el.id === selectedElement.id) {
        return {
          ...el,
          x: elementStartPos.x + dx,
          y: elementStartPos.y + dy
        };
      }
      return el;
    }));
  };

  const handleElementDown = (e, element) => {
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedElement(element);
    setDragging(true);
    
    const canvas = editorCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * EDITOR_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * EDITOR_HEIGHT;
    
    setDragStartPos({ x, y });
    setElementStartPos({ x: element.x, y: element.y });
  };

  const handleElementUp = () => {
    if (dragging) {
      addToHistory([...elements]);
    }
    setDragging(false);
  };

  const handleCanvasClick = (e) => {
    // Désélectionner l'élément si on clique sur le canvas mais pas sur un élément
    setSelectedElement(null);
  };

  // Fonction pour mettre à jour les propriétés d'un élément
  const updateElementProperty = (property, value) => {
    if (!selectedElement) return;

    const updatedElements = elements.map(el => {
      if (el.id === selectedElement.id) {
        if (property.includes('.')) {
          // Gestion des propriétés imbriquées (comme shadow.enabled)
          const [parent, child] = property.split('.');
          return {
            ...el,
            [parent]: {
              ...el[parent],
              [child]: value
            }
          };
        } else {
          // Propriété simple
          return { ...el, [property]: value };
        }
      }
      return el;
    });
    
    setElements(updatedElements);
    setSelectedElement(updatedElements.find(el => el.id === selectedElement.id));
  };

  // Fonction de sauvegarde des éléments dans Supabase
  const handleSaveElements = async () => {
    if (!projectId) {
      setMessage({ type: 'error', text: 'ID de projet manquant' });
      return;
    }
    
    setSaving(true);
    
    try {
      // Sauvegarder les éléments dans la base de données
      const { error } = await supabase
        .from('projects')
        .update({
          watermark_elements: JSON.stringify(elements),
          // Activer automatiquement le filigrane s'il y a des éléments
          watermark_enabled: elements.length > 0
        })
        .eq('id', projectId);
      
      if (error) throw error;
      
      setMessage({ 
        type: 'success', 
        text: 'Les éléments de filigrane ont été sauvegardés avec succès !'
      });
      
      // Effacer le message après 3 secondes
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des éléments:', error);
      setMessage({ 
        type: 'error', 
        text: `Erreur lors de la sauvegarde: ${error.message}`
      });
    } finally {
      setSaving(false);
    }
  };

  // Fonction pour supprimer un élément
  const handleDeleteElement = () => {
    if (!selectedElement) return;
    
    const updatedElements = elements.filter(el => el.id !== selectedElement.id);
    setElements(updatedElements);
    setSelectedElement(null);
    addToHistory(updatedElements);
  };

  // Fonction pour dupliquer un élément
  const handleDuplicateElement = () => {
    if (!selectedElement) return;
    
    const duplicate = {
      ...JSON.parse(JSON.stringify(selectedElement)),
      id: `${selectedElement.type}-${Date.now()}`,
      x: selectedElement.x + 20,
      y: selectedElement.y + 20
    };
    
    const newElements = [...elements, duplicate];
    setElements(newElements);
    setSelectedElement(duplicate);
    addToHistory(newElements);
  };

  // Fonction pour changer l'ordre des éléments
  const handleElementOrder = (direction) => {
    if (!selectedElement) return;

    const currentIndex = elements.findIndex(el => el.id === selectedElement.id);
    if (currentIndex === -1) return;
    
    const newElements = [...elements];
    
    if (direction === 'forward' && currentIndex < elements.length - 1) {
      // Avancer d'une position
      [newElements[currentIndex], newElements[currentIndex + 1]] = 
      [newElements[currentIndex + 1], newElements[currentIndex]];
      
    } else if (direction === 'backward' && currentIndex > 0) {
      // Reculer d'une position
      [newElements[currentIndex], newElements[currentIndex - 1]] = 
      [newElements[currentIndex - 1], newElements[currentIndex]];
      
    } else if (direction === 'front') {
      // Mettre au premier plan
      const element = newElements.splice(currentIndex, 1)[0];
      newElements.push(element);
      
    } else if (direction === 'back') {
      // Mettre en arrière-plan
      const element = newElements.splice(currentIndex, 1)[0];
      newElements.unshift(element);
    }
    
    setElements(newElements);
    addToHistory(newElements);
  };

  // Rendu de la page
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 mt-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Chargement de l&apos;éditeur...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* En-tête */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Éditeur de filigrane avancé</h1>
            {project && (
              <p className="text-gray-600">
                Projet: <span className="font-medium">{project.name}</span>
              </p>
            )}
          </div>
          
          {/* Boutons Actions */}
          <div className="flex space-x-3">
            <Link 
              href={`/photobooth-ia/admin/projects/${projectId}`}
              className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded text-sm"
            >
              Retour au projet
            </Link>
            
            <button
              onClick={handleSaveElements}
              disabled={saving}
              className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm flex items-center"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enregistrement...
                </>
              ) : 'Enregistrer'}
            </button>
          </div>
        </div>
        
        {/* Message */}
        {message && (
          <div className={`mt-4 p-3 rounded text-sm ${
            message.type === 'error' 
              ? 'bg-red-100 text-red-700' 
              : 'bg-green-100 text-green-700'
          }`}>
            {message.text}
          </div>
        )}
        
        {/* Guide rapide */}
        <div className="mt-4 bg-blue-50 border border-blue-100 p-3 rounded-md">
          <h2 className="text-sm font-medium text-blue-700 mb-1">Guide rapide</h2>
          <ul className="text-xs text-blue-600 list-disc list-inside">
            <li>Ajoutez du texte ou des images au filigrane</li>
            <li>Cliquez sur un élément pour le sélectionner et modifier ses propriétés</li>
            <li>Faites glisser les éléments pour les positionner</li>
            <li>Cliquez sur Enregistrer pour sauvegarder vos modifications</li>
          </ul>
        </div>
      </div>
      
      {/* Conteneur principal de l'éditeur */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Panneau de gauche - Outils et éléments */}
        <div className="lg:col-span-1 space-y-4">
          {/* Outils d'édition */}
          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-3">Outils</h3>
            
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleAddText}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v12m0 6l3-3m-3 3l-3-3m12-6v6m0 0l-3-3m3 3l3-3" />
                  </svg>
                  Ajouter du texte
                </button>
                
                <label className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm flex items-center justify-center cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4 4 4-4M4 8l4-4 4 4m6 0l4 4-4 4" />
                  </svg>
                  Ajouter une image
                  <input type="file" className="hidden" onChange={handleAddImage} accept="image/*" />
                </label>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="flex-1 px-2 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Annuler
                </button>
                
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="flex-1 px-2 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  Retablir
                </button>
              </div>
              
              {selectedElement && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleDuplicateElement}
                    className="flex-1 px-2 py-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-xs flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
                    </svg>
                    Dupliquer
                  </button>
                  
                  <button
                    onClick={handleDeleteElement}
                    className="flex-1 px-2 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Liste des éléments */}
          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-3">Éléments ({elements.length})</h3>
            
            {elements.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Aucun élément dans le filigrane.<br/>
                Ajoutez du texte ou une image pour commencer.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {elements.map((element, index) => (
                  <div 
                    key={element.id}
                    className={`p-2 rounded text-sm cursor-pointer flex items-center justify-between ${
                      selectedElement?.id === element.id 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                    onClick={() => setSelectedElement(element)}
                  >
                    <div className="flex items-center">
                      {element.type === 'text' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v12m0 6l3-3m-3 3l-3-3m12-6v6m0 0l-3-3m3 3l3-3" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4 4 4-4M4 8l4-4 4 4m6 0l4 4-4 4" />
                        </svg>
                      )}
                      <span className="truncate max-w-[150px]">
                        {element.type === 'text' ? (
                          element.text || 'Texte'
                        ) : (
                          `Image ${index + 1}`
                        )}
                      </span>
                    </div>
                    
                    <div className="flex space-x-1">
                      {/* Boutons d'ordre des éléments */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleElementOrder('forward');
                        }}
                        title="Mettre au premier plan"
                        className="p-0.5 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                        </svg>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleElementOrder('back');
                        }}
                        title="Mettre en arrière-plan"
                        className="p-0.5 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Aperçu du filigrane */}
          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-3">Aperçu final</h3>
            
            <div className="border border-gray-200 rounded overflow-hidden bg-gray-100">
              {previewWithWatermark ? (
                <Image
                  src={previewWithWatermark}
                  alt="Aperçu avec filigrane"
                  width={300}
                  height={450}
                  className="w-full h-auto"
                />
              ) : (
                <div className="aspect-[2/3] w-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
                  {elements.length === 0 ? 'Ajoutez des éléments pour voir l\'aperçu' : 'Génération de l\'aperçu...'}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Panneau central - Canvas d'édition */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="bg-white shadow rounded-lg p-4 flex-1 flex flex-col">
            <h3 className="font-medium text-gray-800 mb-3">Zone d&apos;édition</h3>
            
            <div className="relative flex-1 border border-gray-200 rounded overflow-hidden bg-gray-100">
              {/* Canvas d'édition */}
              <div 
                ref={editorCanvasRef}
                onClick={handleCanvasClick}
                onMouseMove={handleElementDrag}
                onMouseUp={handleElementUp}
                onMouseLeave={handleElementUp}
                className="relative w-full h-full overflow-hidden"
                style={{ 
                  aspectRatio: `${EDITOR_WIDTH}/${EDITOR_HEIGHT}`,
                  backgroundImage: `url(${previewUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {/* Affichage des éléments dans l'éditeur */}
                {elements.map((element) => (
                  <div
                    key={element.id}
                    onMouseDown={(e) => handleElementDown(e, element)}
                    className={`absolute cursor-move ${selectedElement?.id === element.id ? 'outline outline-2 outline-blue-500' : ''}`}
                    style={{
                      left: `${(element.x / EDITOR_WIDTH) * 100}%`,
                      top: `${(element.y / EDITOR_HEIGHT) * 100}%`,
                      transform: `translate(-50%, -50%) rotate(${element.rotation || 0}deg)`,
                      userSelect: 'none',
                      zIndex: selectedElement?.id === element.id ? 1000 : 1
                    }}
                  >
                    {element.type === 'text' ? (
                      <div 
                        style={{ 
                          color: element.color || '#FFFFFF',
                          fontFamily: element.fontFamily || 'Arial',
                          fontSize: `${(element.fontSize / EDITOR_HEIGHT) * 100}vh`,
                          opacity: element.opacity || 0.8,
                          textShadow: element.shadow?.enabled ? 
                            `${element.shadow.offsetX}px ${element.shadow.offsetY}px ${element.shadow.blur}px ${element.shadow.color}` : 'none',
                        }}
                      >
                        {element.text}
                      </div>
                    ) : (
                      <div 
                        style={{ 
                          width: `${(element.width / EDITOR_WIDTH) * 100}%`,
                          height: `${(element.height / EDITOR_HEIGHT) * 100}vh`,
                          opacity: element.opacity || 0.8,
                          minWidth: '20px',
                          minHeight: '20px'
                        }}
                        className="relative"
                      >
                        {element.src && (
                          <Image 
                            src={element.src}
                            alt="Logo élement"
                            fill
                            style={{ objectFit: 'contain' }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Panneau de droite - Propriétés */}
        <div className="lg:col-span-2">
          {selectedElement ? (
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-3">
                Propriétés de l&apos;élément
              </h3>
              
              <div className="space-y-4">
                {/* Propriétés communes */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position X
                    </label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.x)}
                      onChange={(e) => updateElementProperty('x', Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position Y
                    </label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.y)}
                      onChange={(e) => updateElementProperty('y', Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rotation
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={selectedElement.rotation || 0}
                      onChange={(e) => updateElementProperty('rotation', Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-gray-600 text-sm w-12 text-right">
                      {selectedElement.rotation || 0}°
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opacité
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedElement.opacity || 1}
                      onChange={(e) => updateElementProperty('opacity', Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-gray-600 text-sm w-12 text-right">
                      {Math.round((selectedElement.opacity || 1) * 100)}%
                    </span>
                  </div>
                </div>
                
                {/* Propriétés spécifiques au texte */}
                {selectedElement.type === 'text' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Texte
                      </label>
                      <input
                        type="text"
                        value={selectedElement.text || ''}
                        onChange={(e) => updateElementProperty('text', e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Police
                      </label>
                      <select
                        value={selectedElement.fontFamily || 'Arial'}
                        onChange={(e) => updateElementProperty('fontFamily', e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Arial">Arial</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Palatino">Palatino</option>
                        <option value="Garamond">Garamond</option>
                        <option value="Bookman">Bookman</option>
                        <option value="Trebuchet MS">Trebuchet MS</option>
                        <option value="Impact">Impact</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Taille de police
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="range"
                          min="10"
                          max="200"
                          value={selectedElement.fontSize || 48}
                          onChange={(e) => updateElementProperty('fontSize', Number(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-gray-600 text-sm w-12 text-right">
                          {selectedElement.fontSize || 48}px
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Couleur
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="color"
                          value={selectedElement.color || '#FFFFFF'}
                          onChange={(e) => updateElementProperty('color', e.target.value)}
                          className="h-8 w-10"
                        />
                        <input
                          type="text"
                          value={selectedElement.color || '#FFFFFF'}
                          onChange={(e) => updateElementProperty('color', e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center mb-2">
                        <input
                          id="shadow-toggle"
                          type="checkbox"
                          checked={selectedElement.shadow?.enabled || false}
                          onChange={(e) => updateElementProperty('shadow.enabled', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="shadow-toggle" className="ml-2 block text-sm font-medium text-gray-700">
                          Ombre portée
                        </label>
                      </div>
                      
                      {selectedElement.shadow?.enabled && (
                        <div className="pl-6 space-y-3 mt-2 border-l-2 border-gray-200">
                          <div>
                            <label className="block text-xs text-gray-700 mb-1">
                              Couleur de l&apos;ombre
                            </label>
                            <div className="flex space-x-2">
                              <input
                                type="color"
                                value={selectedElement.shadow.color || 'rgba(0,0,0,0.5)'}
                                onChange={(e) => updateElementProperty('shadow.color', e.target.value)}
                                className="h-6 w-8"
                              />
                              <input
                                type="text"
                                value={selectedElement.shadow.color || 'rgba(0,0,0,0.5)'}
                                onChange={(e) => updateElementProperty('shadow.color', e.target.value)}
                                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs text-gray-700 mb-1">
                              Flou
                            </label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="range"
                                min="0"
                                max="20"
                                value={selectedElement.shadow.blur || 3}
                                onChange={(e) => updateElementProperty('shadow.blur', Number(e.target.value))}
                                className="flex-1"
                              />
                              <span className="text-gray-600 text-xs w-8 text-right">
                                {selectedElement.shadow.blur || 3}px
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">
                                Décalage X
                              </label>
                              <input
                                type="number"
                                value={selectedElement.shadow.offsetX || 2}
                                onChange={(e) => updateElementProperty('shadow.offsetX', Number(e.target.value))}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">
                                Décalage Y
                              </label>
                              <input
                                type="number"
                                value={selectedElement.shadow.offsetY || 2}
                                onChange={(e) => updateElementProperty('shadow.offsetY', Number(e.target.value))}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                {/* Propriétés spécifiques à l'image */}
                {(selectedElement.type === 'image' || selectedElement.type === 'logo') && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Largeur
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={Math.round(selectedElement.width || 100)}
                            onChange={(e) => updateElementProperty('width', Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Hauteur
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={Math.round(selectedElement.height || 100)}
                            onChange={(e) => updateElementProperty('height', Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Remplacer l&apos;image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              updateElementProperty('src', evt.target?.result);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">Aucun élément sélectionné</h3>
              <p className="mt-1 text-sm text-gray-500">
                Cliquez sur un élément dans l&apos;éditeur pour modifier ses propriétés ou ajoutez un nouvel élément.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
