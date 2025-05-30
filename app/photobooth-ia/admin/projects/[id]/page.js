'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function ProjectDetails({ params }) {
  const projectId = params.id;
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [settings, setSettings] = useState(null);
  const [styles, setStyles] = useState([]);
  const [backgrounds, setBackgrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [addingStyle, setAddingStyle] = useState(false);
  const [newStyle, setNewStyle] = useState({
    name: '',
    gender: '',
    style_key: '',
    variations: 1,
    description: '',
  });
  const [styleFile, setStyleFile] = useState(null);
  const [styleImagePreview, setStyleImagePreview] = useState(null);
  const [addingStyleLoading, setAddingStyleLoading] = useState(false);
  const [addingBackground, setAddingBackground] = useState(false);
  const [newBackground, setNewBackground] = useState({
    name: '',
  });
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState(null);
  const [addingBackgroundLoading, setAddingBackgroundLoading] = useState(false);

  const fetchProjectData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch project data
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch project settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('project_settings')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') { // Not found is OK
        throw settingsError;
      }
      setSettings(settingsData || {
        project_id: projectId,
        default_gender: 'm',
        enable_qr_codes: true,
        enable_fullscreen: true,
        show_countdown: true,
        max_processing_time: 60
      });

      // Fetch project styles
      const { data: stylesData, error: stylesError } = await supabase
        .from('styles')
        .select('*')
        .eq('project_id', projectId);

      if (stylesError) throw stylesError;
      setStyles(stylesData || []);

      // Fetch project backgrounds
      const { data: backgroundsData, error: backgroundsError } = await supabase
        .from('backgrounds')
        .select('*')
        .eq('project_id', projectId);

      if (backgroundsError) throw backgroundsError;
      setBackgrounds(backgroundsData || []);

    } catch (error) {
      console.error('Error fetching project data:', error);
      setError('Erreur lors du chargement des données du projet');
    } finally {
      setLoading(false);
    }
  }, [id, supabase, projectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  async function saveSettings(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('project_settings')
          .update({
            default_gender: settings.default_gender,
            enable_qr_codes: settings.enable_qr_codes,
            enable_fullscreen: settings.enable_fullscreen,
            show_countdown: settings.show_countdown,
            max_processing_time: settings.max_processing_time
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from('project_settings')
          .insert({
            project_id: projectId,
            default_gender: settings.default_gender,
            enable_qr_codes: settings.enable_qr_codes,
            enable_fullscreen: settings.enable_fullscreen,
            show_countdown: settings.show_countdown,
            max_processing_time: settings.max_processing_time
          });

        if (error) throw error;
      }

      setSuccess('Paramètres enregistrés avec succès !');
      fetchProjectData(); // Refresh data
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Erreur lors de l\'enregistrement des paramètres');
    }
  }

  function handleSettingChange(e) {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  }

  function handleStyleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      setStyleFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setStyleImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleBackgroundImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      setBackgroundFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleAddStyle(e) {
    e.preventDefault();
    setAddingStyleLoading(true);
    try {
      // Upload style image
      const { data: styleImageData, error: styleImageError } = await supabase
        .storage
        .from('styles')
        .upload(`public/${styleFile.name}`, styleFile);

      if (styleImageError) throw styleImageError;

      // Add new style
      const { error: addStyleError } = await supabase
        .from('styles')
        .insert({
          project_id: projectId,
          name: newStyle.name,
          gender: newStyle.gender,
          style_key: newStyle.style_key,
          variations: newStyle.variations,
          description: newStyle.description,
          preview_image: styleImageData.Key
        });

      if (addStyleError) throw addStyleError;

      setAddingStyle(false);
      setNewStyle({
        name: '',
        gender: '',
        style_key: '',
        variations: 1,
        description: '',
      });
      setStyleFile(null);
      setStyleImagePreview(null);
      fetchProjectData(); // Refresh data
    } catch (error) {
      console.error('Error adding style:', error);
      setError('Erreur lors de l\'ajout du style');
    } finally {
      setAddingStyleLoading(false);
    }
  }

  async function handleAddBackground(e) {
    e.preventDefault();
    setAddingBackgroundLoading(true);
    try {
      // Upload background image
      const { data: backgroundImageData, error: backgroundImageError } = await supabase
        .storage
        .from('backgrounds')
        .upload(`public/${backgroundFile.name}`, backgroundFile);

      if (backgroundImageError) throw backgroundImageError;

      // Add new background
      const { error: addBackgroundError } = await supabase
        .from('backgrounds')
        .insert({
          project_id: projectId,
          name: newBackground.name,
          image_url: backgroundImageData.Key
        });

      if (addBackgroundError) throw addBackgroundError;

      setAddingBackground(false);
      setNewBackground({
        name: '',
      });
      setBackgroundFile(null);
      setBackgroundImagePreview(null);
      fetchProjectData(); // Refresh data
    } catch (error) {
      console.error('Error adding background:', error);
      setError('Erreur lors de l\'ajout de l\'arrière-plan');
    } finally {
      setAddingBackgroundLoading(false);
    }
  }

  async function handleEditStyle(style) {
    // Implement edit style logic
  }

  async function handleDeleteStyle(styleId) {
    // Implement delete style logic
  }

  async function handleEditBackground(background) {
    // Implement edit background logic
  }

  async function handleDeleteBackground(backgroundId) {
    // Implement delete background logic
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Projet non trouvé</h3>
        <p className="text-gray-500 mb-6">Le projet que vous recherchez n&apos;existe pas ou a été supprimé.</p>
        <Link href="/photobooth-ia/admin/projects" className="text-indigo-600 hover:text-indigo-500">
          Retour à la liste des projets
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with project info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {project.logo_url && (
            <div className="w-12 h-12 relative">
              <Image
                src={project.logo_url}
                alt={project.name}
                fill
                style={{ objectFit: "contain" }}
                className="rounded-md"
              />
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{project.name}</h2>
            <div className="text-sm text-gray-500">Slug: /{project.slug}</div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Link
            href={`/photobooth/${project.slug}`}
            target="_blank"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Voir le projet
          </Link>
          <Link
            href="/photobooth-ia/admin/projects"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Retour à la liste
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg">
          {success}
        </div>
      )}

      {/* Tabs for different sections */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('info')}
            className={`border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'info' ? 'border-indigo-500 text-indigo-600' : ''
            }`}
          >
            Informations
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings' ? 'border-indigo-500 text-indigo-600' : ''
            }`}
          >
            Paramètres
          </button>
          <button
            onClick={() => setActiveTab('styles')}
            className={`border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'styles' ? 'border-indigo-500 text-indigo-600' : ''
            }`}
          >
            Styles ({styles.length})
          </button>
          <button
            onClick={() => setActiveTab('backgrounds')}
            className={`border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'backgrounds' ? 'border-indigo-500 text-indigo-600' : ''
            }`}
          >
            Arrière-plans ({backgrounds.length})
          </button>
        </nav>
      </div>

      {/* Tab content */}
      <div className="bg-white shadow rounded-lg p-6">
        {activeTab === 'info' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informations du projet</h3>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Nom</h4>
                <div className="mt-1 text-sm text-gray-900">{project.name}</div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">URL du projet</h4>
                <div className="mt-1 text-sm text-gray-900">/photobooth/{project.slug}</div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Description</h4>
                <div className="mt-1 text-sm text-gray-900">{project.description || '-'}</div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Statut</h4>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    project.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {project.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Couleur principale</h4>
                <div className="mt-1 flex items-center">
                  <div 
                    className="w-5 h-5 mr-2 rounded-full" 
                    style={{ backgroundColor: project.primary_color }}
                  ></div>
                  <span className="text-sm text-gray-900">{project.primary_color}</span>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Couleur secondaire</h4>
                <div className="mt-1 flex items-center">
                  <div 
                    className="w-5 h-5 mr-2 rounded-full" 
                    style={{ backgroundColor: project.secondary_color }}
                  ></div>
                  <span className="text-sm text-gray-900">{project.secondary_color}</span>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Message d&apos;accueil</h4>
                <div className="mt-1 text-sm text-gray-900">{project.home_message || '-'}</div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Date de création</h4>
                <div className="mt-1 text-sm text-gray-900">
                  {new Date(project.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => router.push(`/photobooth-ia/admin/projects`)}
                className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Retour
              </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <form onSubmit={saveSettings} className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Paramètres du photobooth</h3>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="default_gender" className="block text-sm font-medium text-gray-700">
                  Genre par défaut
                </label>
                <select
                  id="default_gender"
                  name="default_gender"
                  value={settings.default_gender || 'm'}
                  onChange={handleSettingChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="m">Homme</option>
                  <option value="f">Femme</option>
                  <option value="ag">Ado Garçon</option>
                  <option value="af">Ado Fille</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="max_processing_time" className="block text-sm font-medium text-gray-700">
                  Temps max de traitement (secondes)
                </label>
                <input
                  type="number"
                  name="max_processing_time"
                  id="max_processing_time"
                  value={settings.max_processing_time || 60}
                  onChange={handleSettingChange}
                  min="30"
                  max="300"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                />
              </div>
            </div>
            
            <div className="space-y-4 mt-4">
              <div className="flex items-center">
                <input
                  id="enable_qr_codes"
                  name="enable_qr_codes"
                  type="checkbox"
                  checked={settings.enable_qr_codes}
                  onChange={handleSettingChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="enable_qr_codes" className="ml-2 block text-sm text-gray-900">
                  Activer les QR codes pour le partage
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="enable_fullscreen"
                  name="enable_fullscreen"
                  type="checkbox"
                  checked={settings.enable_fullscreen}
                  onChange={handleSettingChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="enable_fullscreen" className="ml-2 block text-sm text-gray-900">
                  Activer le mode plein écran automatique
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="show_countdown"
                  name="show_countdown"
                  type="checkbox"
                  checked={settings.show_countdown}
                  onChange={handleSettingChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="show_countdown" className="ml-2 block text-sm text-gray-900">
                  Afficher le compte à rebours avant la capture
                </label>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Enregistrer les paramètres
              </button>
            </div>
          </form>
        )}

        {activeTab === 'styles' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Styles du projet</h3>
              <button
                onClick={() => setAddingStyle(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Ajouter un style
              </button>
            </div>
            
            {/* Formulaire d'ajout de style */}
            {addingStyle && (
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-medium mb-3">Nouveau style</h4>
                <form onSubmit={handleAddStyle} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="styleName" className="block text-sm font-medium text-gray-700">
                        Nom du style *
                      </label>
                      <input
                        type="text"
                        id="styleName"
                        value={newStyle.name}
                        onChange={(e) => setNewStyle({...newStyle, name: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="styleGender" className="block text-sm font-medium text-gray-700">
                        Catégorie *
                      </label>
                      <select
                        id="styleGender"
                        value={newStyle.gender}
                        onChange={(e) => setNewStyle({...newStyle, gender: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black"
                        required
                      >
                        <option value="">Sélectionner...</option>
                        <option value="m">Homme</option>
                        <option value="f">Femme</option>
                        <option value="ag">Ado Garçon</option>
                        <option value="af">Ado Fille</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="styleKey" className="block text-sm font-medium text-gray-700">
                        Clé de style (s1, s2, etc.) *
                      </label>
                      <input
                        type="text"
                        id="styleKey"
                        value={newStyle.style_key}
                        onChange={(e) => setNewStyle({...newStyle, style_key: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="styleVariations" className="block text-sm font-medium text-gray-700">
                        Nombre de variations
                      </label>
                      <input
                        type="number"
                        id="styleVariations"
                        min="1"
                        max="10"
                        value={newStyle.variations}
                        onChange={(e) => setNewStyle({...newStyle, variations: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="styleDescription" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="styleDescription"
                      rows={2}
                      value={newStyle.description}
                      onChange={(e) => setNewStyle({...newStyle, description: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Image de prévisualisation *</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        {styleImagePreview ? (
                          <div className="flex flex-col items-center">
                            <div className="w-40 h-40 mb-3 relative">
                              <Image
                                src={styleImagePreview}
                                alt="Aperçu"
                                fill
                                style={{ objectFit: "contain" }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setStyleFile(null);
                                setStyleImagePreview(null);
                              }}
                              className="text-xs px-2 py-1 bg-gray-200 rounded-md hover:bg-gray-300"
                            >
                              Supprimer
                            </button>
                          </div>
                        ) : (
                          <>
                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div className="flex text-sm text-gray-600">
                              <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                                <span>Télécharger un fichier</span>
                                <input
                                  type="file"
                                  className="sr-only"
                                  accept="image/*"
                                  onChange={handleStyleImageChange}
                                />
                              </label>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF jusqu&apos;à 10MB</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setAddingStyle(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
                      disabled={addingStyleLoading}
                    >
                      {addingStyleLoading ? 'Ajout en cours...' : 'Ajouter'}
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {styles.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                Aucun style n&apos;a été ajouté à ce projet. Commencez par en ajouter un !
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {styles.map((style) => (
                  <div key={style.id} className="border border-gray-200 rounded-md overflow-hidden text-black">
                    <div className="h-40 bg-gray-100 relative">
                      {style.preview_image ? (
                        <Image
                          src={style.preview_image}
                          alt={style.name}
                          fill
                          style={{ objectFit: "contain" }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-gray-400">Aucune image</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <h4 className="font-medium text-gray-900">{style.name}</h4>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <span>{style.gender === 'm' ? 'Homme' : 
                              style.gender === 'f' ? 'Femme' : 
                              style.gender === 'ag' ? 'Ado Garçon' : 'Ado Fille'}</span>
                        <span className="mx-2">•</span>
                        <span>Style {style.style_key}</span>
                      </div>
                      
                      <div className="mt-4 flex space-x-2">
                        <button
                          onClick={() => handleEditStyle(style)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteStyle(style.id)}
                          className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'backgrounds' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Arrière-plans du projet</h3>
              <button
                onClick={() => setAddingBackground(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Ajouter un arrière-plan
              </button>
            </div>
            
            {/* Formulaire d'ajout d'arrière-plan */}
            {addingBackground && (
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-medium mb-3">Nouvel arrière-plan</h4>
                <form onSubmit={handleAddBackground} className="space-y-4">
                  <div>
                    <label htmlFor="backgroundName" className="block text-sm font-medium text-gray-700">
                      Nom de l&apos;arrière-plan *
                    </label>
                    <input
                      type="text"
                      id="backgroundName"
                      value={newBackground.name}
                      onChange={(e) => setNewBackground({...newBackground, name: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Image d&apos;arrière-plan *</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        {backgroundImagePreview ? (
                          <div className="flex flex-col items-center">
                            <div className="w-40 h-40 mb-3 relative">
                              <Image
                                src={backgroundImagePreview}
                                alt="Aperçu"
                                fill
                                style={{ objectFit: "contain" }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setBackgroundFile(null);
                                setBackgroundImagePreview(null);
                              }}
                              className="text-xs px-2 py-1 bg-gray-200 rounded-md hover:bg-gray-300"
                            >
                              Supprimer
                            </button>
                          </div>
                        ) : (
                          <>
                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div className="flex text-sm text-gray-600">
                              <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                                <span>Télécharger un fichier</span>
                                <input
                                  type="file"
                                  className="sr-only"
                                  accept="image/*"
                                  onChange={handleBackgroundImageChange}
                                />
                              </label>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF jusqu&apos;à 10MB</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setAddingBackground(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
                      disabled={addingBackgroundLoading}
                    >
                      {addingBackgroundLoading ? 'Ajout en cours...' : 'Ajouter'}
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {backgrounds.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                Aucun arrière-plan n&apos;a été ajouté à ce projet. Commencez par en ajouter un !
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {backgrounds.map((background) => (
                  <div key={background.id} className="border border-gray-200 rounded-md overflow-hidden text-black">
                    <div className="h-40 bg-gray-100 relative">
                      <Image
                        src={background.image_url}
                        alt={background.name}
                        fill
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                    
                    <div className="p-4">
                      <h4 className="font-medium text-gray-900">{background.name}</h4>
                      
                      <div className="mt-4 flex space-x-2">
                        <button
                          onClick={() => handleEditBackground(background)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteBackground(background.id)}
                          className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
