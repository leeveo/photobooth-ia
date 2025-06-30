'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { RiAddLine, RiDeleteBin6Line, RiEdit2Line, RiArrowLeftLine, RiRefreshLine } from 'react-icons/ri';
import dynamic from 'next/dynamic';
import { uploadThumbnail, updateTemplateThumbnail, migrateExistingThumbnails } from '../utils/thumbnailUtils';

// IMPORTANT: Importer TemplateEditor au lieu de CanvasEditor
const TemplateEditor = dynamic(
  () => import('../layout-templates/components/TemplateEditor'),
  { ssr: false }
);

export default function LayoutTemplates() {
  const supabase = createClientComponentClient();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    category: '',
    is_public: true
  });
  const [canvasLayout, setCanvasLayout] = useState({
    elements: [],
    stageSize: { width: 970, height: 651, scale: 1 }
  });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false); // État pour indiquer que la sauvegarde est en cours
  const [thumbnailData, setThumbnailData] = useState(null); // État pour les données de l'aperçu
  const [imageTimestamp, setImageTimestamp] = useState(Date.now()); // Add state for image timestamp

  // Fonction améliorée pour récupérer les templates
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      console.log('Chargement des templates depuis la table layout_templates...');
      
      // Utiliser la table layout_templates
      const { data, error } = await supabase
        .from('layout_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement des templates:', error);
        throw error;
      }
      
      console.log(`Nombre de templates trouvés: ${data?.length || 0}`);
      if (data && data.length > 0) {
        console.log('Premier template:', data[0]);
      }
      
      setTemplates(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error);
      setError(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Charger les templates au montage du composant
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Fonction pour sauvegarder le template - RÉÉCRITE pour plus de fiabilité
  const handleCreateTemplate = async () => {
    if (!templateData.name) {
      setError('Le nom du template est requis');
      return;
    }

    if (canvasLayout.elements.length === 0) {
      setError('Veuillez ajouter au moins un élément au template');
      return;
    }

    setSaveLoading(true);
    setError(null);
    
    try {
      console.log('Début de la création du template...');
      
      // Récupérer l'ID de l'utilisateur connecté
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Erreur d\'authentification:', authError);
        throw new Error('Utilisateur non authentifié');
      }
      
      console.log('Utilisateur authentifié:', user.id);
      
      // Créer un ID temporaire pour le template
      const tempId = Date.now().toString();
      
      // Télécharger l'aperçu si disponible (using the utility function)
      let thumbnailUrl = null;
      if (thumbnailData) {
        thumbnailUrl = await uploadThumbnail(thumbnailData, tempId);
        console.log('Thumbnail uploaded with URL:', thumbnailUrl);
      }
      
      // Préparer les données pour l'insertion
      const templateToInsert = {
        name: templateData.name,
        layout_name: templateData.name,
        description: templateData.description || '',
        category: templateData.category || '',
        elements: canvasLayout.elements,
        stage_size: canvasLayout.stageSize,
        is_public: templateData.is_public,
        created_by: user.id,
        thumbnail_url: thumbnailUrl
      };
      
      // Insert the template
      const { data, error } = await supabase
        .from('layout_templates')
        .insert(templateToInsert)
        .select();
      
      if (error) {
        console.error('Erreur lors de l\'insertion:', error);
        throw new Error(`Erreur lors de la création du template: ${error.message}`);
      }
      
      console.log('Template créé avec succès:', data);
      
      // Rafraîchir la liste des templates
      await fetchTemplates();
      
      setSuccess('Template créé avec succès');
      resetForm();
      setShowCreateForm(false);
      setShowEditor(false);
      setThumbnailData(null);
      
    } catch (error) {
      console.error('Erreur lors de la création du template:', error);
      setError(`Erreur: ${error.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  // Éditer un template existant - AMÉLIORÉ
  const editTemplate = (template) => {
    console.log('Édition du template:', template);
    
    // Set the current template
    setCurrentTemplate(template);
    
    // Populate the form fields
    setTemplateData({
      name: template.name || '',
      description: template.description || '',
      category: template.category || '',
      is_public: template.is_public !== false // Default to true if undefined
    });
    
    // Handle the elements data
    let elementsToUse = [];
    
    // Ensure elements is properly parsed if it's a string
    if (typeof template.elements === 'string') {
      try {
        elementsToUse = JSON.parse(template.elements);
      } catch (e) {
        console.error('Error parsing elements string:', e);
        elementsToUse = [];
      }
    } else if (Array.isArray(template.elements)) {
      elementsToUse = template.elements;
    }
    
    console.log('Elements to use in editor:', elementsToUse);
    
    // Handle the stage size data
    let stageSizeToUse = { width: 970, height: 651, scale: 1 };
    
    // Ensure stage_size is properly parsed if it's a string
    if (typeof template.stage_size === 'string') {
      try {
        stageSizeToUse = JSON.parse(template.stage_size);
      } catch (e) {
        console.error('Error parsing stage_size string:', e);
        // Keep default
      }
    } else if (template.stage_size && typeof template.stage_size === 'object') {
      stageSizeToUse = template.stage_size;
    }
    
    console.log('Stage size to use in editor:', stageSizeToUse);
    
    // Set canvas layout with the processed data
    setCanvasLayout({
      elements: elementsToUse,
      stageSize: stageSizeToUse
    });
    
    // Show the edit form
    setShowEditForm(true);
    
    // Open the editor after a short delay to ensure state updates are processed
    setTimeout(() => {
      setShowEditor(true);
    }, 100);
  };
  
  // Fonction pour mettre à jour un template existant - AMÉLIORÉE
  const handleUpdateTemplate = async () => {
    if (!templateData.name) {
      setError('Le nom du template est requis');
      return;
    }

    if (!currentTemplate) {
      setError('Aucun template sélectionné pour la mise à jour');
      return;
    }

    setSaveLoading(true);
    setError(null);

    try {
      console.log('Mise à jour du template:', currentTemplate.id);
      
      // Upload thumbnail if available (using the utility function)
      let thumbnailUrl = currentTemplate.thumbnail_url;
      if (thumbnailData) {
        const newThumbnailUrl = await uploadThumbnail(thumbnailData, currentTemplate.id);
        if (newThumbnailUrl) {
          thumbnailUrl = newThumbnailUrl;
          console.log('New thumbnail URL:', thumbnailUrl);
        }
      }
      
      // Prepare update data
      const updateData = {
        name: templateData.name,
        layout_name: templateData.name,
        description: templateData.description,
        elements: canvasLayout.elements,
        stage_size: canvasLayout.stageSize,
        category: templateData.category,
        is_public: templateData.is_public,
        updated_at: new Date().toISOString(),
        thumbnail_url: thumbnailUrl
      };
      
      // Update the template
      const { data, error } = await supabase
        .from('layout_templates')
        .update(updateData)
        .eq('id', currentTemplate.id)
        .select();

      if (error) {
        console.error('Error updating template:', error);
        throw error;
      }

      console.log('Template updated successfully:', data);
      
      // Update local state
      setTemplates(templates.map(t => t.id === currentTemplate.id ? data[0] : t));
      
      setSuccess('Template mis à jour avec succès');
      resetForm();
      setShowEditForm(false);
      setShowEditor(false);
      setThumbnailData(null);
    } catch (error) {
      console.error('Error updating template:', error);
      setError(`Erreur lors de la mise à jour du template: ${error.message}`);
    } finally {
      setSaveLoading(false);
    }
  };
  
  // Fonction pour supprimer un template
  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      console.log('Suppression du template:', templateToDelete.id);
      
      const { error } = await supabase
        .from('layout_templates')
        .delete()
        .eq('id', templateToDelete.id);

      if (error) {
        console.error('Erreur lors de la suppression:', error);
        throw error;
      }

      console.log('Template supprimé avec succès');
      
      // Mettre à jour la liste locale des templates
      setTemplates(templates.filter(t => t.id !== templateToDelete.id));
      setSuccess(`Template "${templateToDelete.name}" supprimé avec succès`);
      setDeleteConfirm(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      setError(`Erreur lors de la suppression du template: ${error.message}`);
    }
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setTemplateData({
      name: '',
      description: '',
      category: '',
      is_public: true
    });
    setCanvasLayout({
      elements: [],
      stageSize: { width: 970, height: 651, scale: 1 }
    });
    setCurrentTemplate(null);
    setShowEditor(false);
    setThumbnailData(null);
  };

  // Fonction pour gérer la sauvegarde depuis l'éditeur de template - AMÉLIORÉE
  const handleEditorSave = (layoutData) => {
    console.log('Données reçues de l\'éditeur:', layoutData);
    
    if (!layoutData) {
      console.error('Invalid layout data received from editor');
      return;
    }
    
    // Ensure we have valid elements and stageSize
    const elementsToSave = Array.isArray(layoutData.elements) ? layoutData.elements : [];
    const stageSizeToSave = layoutData.stageSize && typeof layoutData.stageSize === 'object' 
      ? layoutData.stageSize 
      : { width: 970, height: 651, scale: 1 };
    
    // Save the thumbnail data if available
    if (layoutData.thumbnailUrl) {
      setThumbnailData(layoutData.thumbnailUrl);
    }
    
    setCanvasLayout({
      elements: elementsToSave,
      stageSize: stageSizeToSave
    });
    
    setSuccess('Éléments du template enregistrés dans l\'éditeur');
    setShowEditor(false);
  };

  // Function to force update a template's thumbnail - NEW FUNCTION
  const updateTemplateThumbnailById = async (templateId) => {
    if (!templateId) return;
    
    try {
      setLoading(true);
      const template = templates.find(t => t.id === templateId);
      
      if (!template || !template.thumbnail_url) {
        throw new Error('Template or thumbnail not found');
      }
      
      // Check if the thumbnail URL is a data URL
      if (template.thumbnail_url.startsWith('data:image/')) {
        // Upload the data URL to Supabase
        const newThumbnailUrl = await uploadThumbnail(template.thumbnail_url, templateId);
        
        if (newThumbnailUrl) {
          // Update the template in the database
          const success = await updateTemplateThumbnail(supabase, templateId, newThumbnailUrl);
          
          if (success) {
            // Update the local state
            setTemplates(templates.map(t => 
              t.id === templateId ? {...t, thumbnail_url: newThumbnailUrl} : t
            ));
            setSuccess('Miniature mise à jour avec succès');
          }
        }
      }
    } catch (error) {
      console.error('Error updating template thumbnail:', error);
      setError(`Erreur lors de la mise à jour de la miniature: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Categories options
  const categories = [
    { id: 'general', name: 'Général' },
    { id: 'corporate', name: 'Corporate' },
    { id: 'wedding', name: 'Mariage' },
    { id: 'birthday', name: 'Anniversaire' },
    { id: 'christmas', name: 'Noël' },
    { id: 'other', name: 'Autre' }
  ];

  // Add a utility function to check if a URL is valid
  const isValidHttpUrl = (string) => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  // Add function to force refresh images
  const forceRefreshImages = () => {
    setImageTimestamp(Date.now());
    setSuccess("Rafraîchissement des miniatures en cours...");
    setTimeout(() => {
      if (success === "Rafraîchissement des miniatures en cours...") {
        setSuccess(null);
      }
    }, 2000);
  };

  // Add a new function to handle migration
  const handleMigrateThumbnails = async () => {
    setLoading(true);
    setSuccess('Migration des miniatures en cours...');
    
    try {
      await migrateExistingThumbnails();
      setSuccess('Migration des miniatures terminée. Actualisation de la liste...');
      await fetchTemplates(); // Refresh the list after migration
    } catch (error) {
      console.error('Error during thumbnail migration:', error);
      setError(`Erreur lors de la migration: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour tester l'upload du bucket
  const testBucketUpload = async () => {
    setLoading(true);
    setSuccess("Test d'upload vers le bucket en cours...");
    
    try {
      const supabase = createClientComponentClient();
      
      // 1. Vérifier que le bucket existe
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        throw new Error(`Erreur lors de la liste des buckets: ${bucketsError.message}`);
      }
      
      const templatesBucket = buckets.find(b => b.name === 'templates-thumbnails');
      
      if (!templatesBucket) {
        throw new Error('Le bucket templates-thumbnails n\'existe pas. Veuillez exécuter le script SQL.');
      }
      
      console.log('Bucket templates-thumbnails trouvé:', templatesBucket);
      
      // 2. Créer une petite image PNG pour tester
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      
      // Dessiner un dégradé et du texte
      const gradient = ctx.createLinearGradient(0, 0, 200, 0);
      gradient.addColorStop(0, '#3498db');
      gradient.addColorStop(1, '#9b59b6');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 200, 100);
      
      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Test Upload PNG', 100, 50);
      
      // Convertir en PNG data URL
      const testImageDataUrl = canvas.toDataURL('image/png');
      
      // 3. Tester l'upload avec notre fonction
      const uploadResult = await uploadThumbnail(testImageDataUrl, 'test-upload');
      
      if (!uploadResult || uploadResult === testImageDataUrl) {
        throw new Error('L\'upload a échoué ou a retourné l\'URL de données d\'origine');
      }
      
      console.log('Upload réussi! URL:', uploadResult);
      setSuccess(`Test réussi! Image uploadée à: ${uploadResult}`);
      
      // 4. Afficher un aperçu de l'image uploadée
      const previewImage = document.createElement('img');
      previewImage.src = uploadResult;
      previewImage.style.maxWidth = '300px';
      previewImage.style.border = '1px solid #ccc';
      
      // Ajouter à la page pour visualisation temporaire
      const previewContainer = document.getElementById('upload-test-result');
      if (previewContainer) {
        previewContainer.innerHTML = '';
        previewContainer.appendChild(previewImage);
      }
      
    } catch (error) {
      console.error('Erreur lors du test d\'upload:', error);
      setError(`Test d'upload échoué: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour tester l'upload S3
  const testS3Upload = async () => {
    setLoading(true);
    setSuccess("Test d'upload vers AWS S3 en cours...");
    
    try {
      // 1. Créer une petite image PNG pour tester
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      
      // Dessiner un dégradé et du texte
      const gradient = ctx.createLinearGradient(0, 0, 200, 0);
      gradient.addColorStop(0, '#3498db');
      gradient.addColorStop(1, '#9b59b6');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 200, 100);
      
      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Test Upload S3', 100, 50);
      ctx.fillText(new Date().toLocaleTimeString(), 100, 70);
      
      // Convertir en PNG data URL
      const testImageDataUrl = canvas.toDataURL('image/png');
      
      // 2. Tester l'upload avec notre fonction
      const uploadResult = await uploadThumbnail(testImageDataUrl, 'test-s3-upload');
      
      if (!uploadResult || uploadResult === testImageDataUrl) {
        throw new Error('L\'upload S3 a échoué ou a retourné l\'URL de données d\'origine');
      }
      
      console.log('Upload S3 réussi! URL:', uploadResult);
      setSuccess(`Test S3 réussi! Image uploadée à: ${uploadResult}`);
      
      // 3. Afficher un aperçu de l'image uploadée
      const previewImage = document.createElement('img');
      previewImage.src = uploadResult;
      previewImage.style.maxWidth = '300px';
      previewImage.style.border = '1px solid #ccc';
      
      // Ajouter à la page pour visualisation temporaire
      const previewContainer = document.getElementById('upload-test-result');
      if (previewContainer) {
        previewContainer.innerHTML = '';
        previewContainer.appendChild(previewImage);
      }
      
    } catch (error) {
      console.error('Erreur lors du test d\'upload S3:', error);
      setError(`Test d'upload S3 échoué: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Templates de Layout</h1>
          <p className="text-gray-600 mt-1">Créez et gérez vos templates de layout pour vos projets</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/photobooth-ia/admin/dashboard"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
          >
            <RiArrowLeftLine className="mr-2 h-4 w-4" />
            Retour au Dashboard
          </Link>
          <button
            onClick={() => {
              resetForm();
              setShowCreateForm(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            <RiAddLine className="mr-2 h-4 w-4" />
            Créer un nouveau template
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg border border-red-200">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg border border-green-200">
          {success}
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreateForm || showEditForm) && (
        <div className="bg-white shadow-sm rounded-xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {showCreateForm ? 'Créer un nouveau template' : `Modifier le template: ${currentTemplate?.name}`}
            </h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="templateName" className="block text-sm font-medium text-gray-700">
                  Nom du template *
                </label>
                <input
                  type="text"
                  id="templateName"
                  value={templateData.name}
                  onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="templateCategory" className="block text-sm font-medium text-gray-700">
                  Catégorie
                </label>
                <select
                  id="templateCategory"
                  value={templateData.category}
                  onChange={(e) => setTemplateData({ ...templateData, category: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="templateDescription" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="templateDescription"
                rows={3}
                value={templateData.description}
                onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={templateData.is_public}
                  onChange={(e) => setTemplateData({ ...templateData, is_public: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Template public (visible par tous les utilisateurs)</span>
              </label>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Éditeur de template</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                {showEditor ? (
                  // IMPORTANT: Utiliser TemplateEditor, avec les données du template
                  <TemplateEditor
                    key={currentTemplate?.id || 'new-template'} // Add a key to force re-render when template changes
                    initialData={canvasLayout}
                    onSave={handleEditorSave}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="text-center mb-4">
                      {thumbnailData ? (
                        <div className="mb-3">
                          <p className="text-gray-500 mb-2">Aperçu du template:</p>
                          <div className="mx-auto w-40 h-28 overflow-hidden border border-gray-300 rounded">
                            {/* La miniature affichée ici fait 320x215 px (ratio 970/651) */}
                            <img 
                              src={thumbnailData} 
                              alt="Aperçu du template" 
                              className="w-full h-full object-cover"
                              width={320}
                              height={215}
                            />
                          </div>
                        </div>
                      ) : canvasLayout.elements.length > 0 ? (
                        <p className="text-gray-500 mb-2">
                          Ce template contient {canvasLayout.elements.length} éléments
                        </p>
                      ) : (
                        <p className="text-gray-500 mb-2">
                          Aucun élément dans ce template pour le moment
                        </p>
                      )}
                      
                      {canvasLayout.stageSize && (
                        <p className="text-xs text-gray-400">
                          Dimensions: {canvasLayout.stageSize.width}×{canvasLayout.stageSize.height} pixels
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowEditor(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <RiEdit2Line className="mr-2 h-4 w-4" />
                      {canvasLayout.elements.length > 0 ? 'Modifier les éléments' : 'Ajouter des éléments'}
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowCreateForm(false);
                  setShowEditForm(false);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                disabled={saveLoading}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={showCreateForm ? handleCreateTemplate : handleUpdateTemplate}
                disabled={saveLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-md shadow-sm hover:from-indigo-700 hover:to-purple-700 flex items-center"
              >
                {saveLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {showCreateForm ? 'Création en cours...' : 'Mise à jour en cours...'}
                  </>
                ) : (
                  <>
                    {showCreateForm ? 'Créer le template' : 'Mettre à jour le template'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates List - "Vos templates" */}
      <div className="bg-white shadow-sm rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Vos templates ({templates.length})
          </h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            <span className="ml-3 text-gray-600">Chargement...</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="mt-4 text-gray-500">
              Vous n&apos;avez pas encore créé de template.
            </p>
            <button
              onClick={() => {
                resetForm();
                setShowCreateForm(true);
              }}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <RiAddLine className="mr-2 h-4 w-4" />
              Créer votre premier template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {templates.map((template) => {
              // Log thumbnail URL for debugging
              console.log(`Template ${template.id} thumbnail:`, template.thumbnail_url);
              
              // Check if we have a valid URL or data URL
              const hasValidThumbnail = template.thumbnail_url && 
                (isValidHttpUrl(template.thumbnail_url) || template.thumbnail_url.startsWith('data:image/'));
              
              return (
                <div key={template.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-40 bg-gray-100 relative">
                    {hasValidThumbnail ? (
                      <div className="w-full h-full">
                        {/* Use standard img tag for better compatibility */}
                        <img
                          src={template.thumbnail_url}
                          alt={template.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error("Error loading image:", template.thumbnail_url);
                            e.target.onerror = null;
                            // Fallback to placeholder
                            e.target.style.display = 'none';
                            e.target.parentNode.classList.add('flex', 'items-center', 'justify-center');
                            e.target.parentNode.innerHTML = `
                              <div class="text-center text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p class="text-sm mt-1">Erreur de chargement</p>
                              </div>
                            `;
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
                        <div className="text-center text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                          </svg>
                          <p className="text-sm mt-1">Aperçu non disponible</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Category badge overlay */}
                    {template.category && (
                      <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white bg-opacity-90 text-gray-800 shadow-sm">
                          {categories.find(c => c.id === template.category)?.name || template.category}
                        </span>
                      </div>
                    )}
                    
                    {/* Public/Private badge overlay */}
                    <div className="absolute top-2 right-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                        template.is_public 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {template.is_public ? 'Public' : 'Privé'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 text-lg mb-1">{template.name}</h3>
                    {template.description && (
                      <p className="text-gray-500 text-sm mb-3 line-clamp-2">{template.description}</p>
                    )}
                    
                    <div className="flex flex-wrap text-xs text-gray-500 mb-4">
                      <span className="mr-2">
                        Créé le: {new Date(template.created_at).toLocaleDateString()}
                      </span>
                      <span>
                        Éléments: {(template.elements?.length || 0)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <button
                        onClick={() => editTemplate(template)}
                        className="inline-flex items-center px-3 py-1.5 border border-indigo-300 text-xs font-medium rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50"
                      >
                        <RiEdit2Line className="mr-1 h-3.5 w-3.5" />
                        Modifier
                      </button>
                      <button 
                        onClick={() => updateTemplateThumbnailById(template.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-green-300 text-xs font-medium rounded-md shadow-sm text-green-700 bg-white hover:bg-green-50"
                        title="Mettre à jour la miniature"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Actualiser
                      </button>
                      <button
                        onClick={() => {
                          setTemplateToDelete(template);
                          setDeleteConfirm(true);
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md shadow-sm text-red-700 bg-white hover:bg-red-50"
                      >
                        <RiDeleteBin6Line className="mr-1 h-3.5 w-3.5" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && templateToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center text-red-600 mb-4">
              <RiDeleteBin6Line className="w-6 h-6 mr-2" />
              <h3 className="text-lg font-medium">Confirmer la suppression</h3>
            </div>
            
            <p className="mb-4 text-gray-700">
              Êtes-vous sûr de vouloir supprimer le template <strong>"{templateToDelete.name}"</strong> ?
              <br /><br />
              Cette action est irréversible.
            </p>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setDeleteConfirm(false);
                  setTemplateToDelete(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteTemplate}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
              >
                <RiDeleteBin6Line className="w-4 h-4 mr-1" />
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}