'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RiAddLine } from 'react-icons/ri';
import BackgroundTemplates from '../../components/BackgroundTemplates';

const BackgroundManager = ({ 
  projectId, 
  backgrounds, 
  setBackgrounds, 
  setError, 
  setSuccess 
}) => {
  const supabase = createClientComponentClient();
  const [addingBackground, setAddingBackground] = useState(false);
  const [newBackground, setNewBackground] = useState({
    name: '',
  });
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState(null);
  const [addingBackgroundLoading, setAddingBackgroundLoading] = useState(false);
  const [showBackgroundTemplates, setShowBackgroundTemplates] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAnimationModal, setShowAnimationModal] = useState(false);
  const [selectedBackground, setSelectedBackground] = useState(null);
  const [animationPrompt, setAnimationPrompt] = useState('');
  const [animationLoading, setAnimationLoading] = useState(false);
  const [animationVideoUrl, setAnimationVideoUrl] = useState(null);
  const [showMainVideo, setShowMainVideo] = useState(false);
  const [mainVideoUrl, setMainVideoUrl] = useState(null);
  const [timer, setTimer] = useState(0);
  const [maxArea, setMaxArea] = useState("832x480"); // Default horizontal
  const [outputFormat, setOutputFormat] = useState("landscape"); // "landscape" (horizontal) par défaut
  const [animationName, setAnimationName] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showAnimated, setShowAnimated] = useState(false);
  const timerRef = useRef();

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

  async function handleAddBackground(e) {
    e.preventDefault();
    setAddingBackgroundLoading(true);
    setError(null);

    try {
      if (!backgroundFile) {
        setError("Veuillez sélectionner une image");
        setAddingBackgroundLoading(false);
        return;
      }
      
      // Get the current session to ensure we have authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Session expirée, veuillez vous reconnecter");
        setAddingBackgroundLoading(false);
        return;
      }
      
      // Create FormData to send the file and metadata
      const formData = new FormData();
      formData.append('projectId', projectId);
      formData.append('name', newBackground.name || 'Arrière-plan sans nom');
      formData.append('isActive', 'true');
      formData.append('file', backgroundFile);
      // Ajoute le champ show_animated (FALSE par défaut à la création d'une image)
      formData.append('show_animated', 'false');
      
      // Use the API endpoint with proper headers
      const response = await fetch('/api/admin/add-background', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'ajout de l'arrière-plan");
      }
      
      const { data } = await response.json();
      
      // Update local state with the backgrounds
      setBackgrounds(data);
      
      // Reset form
      setAddingBackground(false);
      setNewBackground({ name: '' });
      setBackgroundFile(null);
      setBackgroundImagePreview(null);
      
      setSuccess("Arrière-plan ajouté avec succès");
    } catch (error) {
      console.error("Error adding background:", error);
      setError(error.message);
    } finally {
      setAddingBackgroundLoading(false);
    }
  }

  async function handleDeleteBackground(backgroundId) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet arrière-plan ?")) {
      return;
    }
    
    try {
      setError(null);
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Session expirée, veuillez vous reconnecter");
        return;
      }
      
      // Delete the background from the database with proper auth context
      const { error } = await supabase
        .from('backgrounds')
        .delete()
        .eq('id', backgroundId);
        
      if (error) throw error;
      
      // Update the local state
      setBackgrounds(backgrounds.filter(bg => bg.id !== backgroundId));
      setSuccess("Arrière-plan supprimé avec succès");
    } catch (error) {
      console.error('Error deleting background:', error);
      setError(`Erreur lors de la suppression de l'arrière-plan: ${error.message}`);
    }
  }

  // Updated function to handle backgrounds added from templates via API
  const handleBackgroundTemplatesAdded = async (templateData) => {
    console.log(`✅ Background template selected:`, templateData);
    
    try {
      setIsRefreshing(true);
      setError(null);
      
      // Close the template popup immediately
      setShowBackgroundTemplates(false);
      
      // Use API endpoint to add template as background
      const response = await fetch('/api/admin/add-background-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId: projectId,
          templateData: templateData
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'ajout du template");
      }
      
      const { data } = await response.json();
      
      // Update backgrounds with the new data
      setBackgrounds(data);
      
      // Set success message
      setSuccess(`Template "${templateData.name}" ajouté avec succès !`);
      
    } catch (error) {
      console.error("Error adding template:", error);
      setError(error.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Add this new function to refresh backgrounds directly from the database
  const refreshBackgroundsFromDatabase = async () => {
    try {
      console.log("Refreshing backgrounds from database...");
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Session expirée, veuillez vous reconnecter");
        return;
      }
      
      // Get fresh data from the database
      const { data, error } = await supabase
        .from('backgrounds')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true);
      
      if (error) {
        console.error("Error fetching backgrounds:", error);
        setError("Failed to refresh backgrounds");
        return;
      }
      
      console.log("Fresh background data:", data);
      
      // Update the state with the fresh data
      setBackgrounds(data || []);
      
    } catch (err) {
      console.error("Error in refresh:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Function to handle template errors
  const handleBackgroundTemplatesError = (errorMessage) => {
    setError(errorMessage);
    setShowBackgroundTemplates(false);
  };

  // Helper function to ensure we have a full URL
  const getFullImageUrl = (url) => {
    if (!url) return null;
    
    // Check if it's already a full URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it's just a storage path, convert to public URL
    const publicUrlResponse = supabase.storage.from('backgrounds').getPublicUrl(url);
    
    // Handle different versions of Supabase client
    const publicUrl = publicUrlResponse.data?.publicUrl || // newer versions
                      publicUrlResponse.publicURL || // older versions
                      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/backgrounds/${url}`;
    
    console.log('Original URL:', url);
    console.log('Public URL:', publicUrl);
    
    return publicUrl;
  };

  // Debug backgrounds data
  useEffect(() => {
    console.log('Backgrounds data updated:', backgrounds);
    // Check for duplicate IDs
    const ids = backgrounds.map(bg => bg.id);
    const uniqueIds = [...new Set(ids)];
    if (ids.length !== uniqueIds.length) {
      console.warn('Duplicate background IDs detected!', ids);
    }
  }, [backgrounds]);

  // Ouvre la fenêtre/modal d'animation
  const handleOpenAnimationModal = (background) => {
    setSelectedBackground(background);
    setAnimationPrompt('');
    setAnimationVideoUrl(null);
    setShowAnimationModal(true);
  };

  // Ferme la fenêtre/modal d'animation
  const handleCloseAnimationModal = () => {
    setShowAnimationModal(false);
    setSelectedBackground(null);
    setAnimationPrompt('');
    setAnimationVideoUrl(null);
  };

  // Envoie l'image et le prompt à l'API backend
  const handleGenerateAnimation = async (e) => {
    e.preventDefault();
    setAnimationLoading(true);
    setError(null);
    setAnimationVideoUrl(null);

    try {
      const imageUrl = getFullImageUrl(selectedBackground.image_url);

      const response = await fetch('/api/admin/generate-animation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageUrl,
          prompt: animationPrompt,
          output_format: outputFormat
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la génération de l'animation");
      }

      const { videoUrl } = await response.json();
      setAnimationVideoUrl(videoUrl);
      setMainVideoUrl(videoUrl);
      setShowMainVideo(true);
      setSuccess("Animation générée avec succès !");
      setShowAnimationModal(false); // ferme le popup
      setShowSuccessPopup(true); // affiche le popup de succès
      setTimeout(() => setShowSuccessPopup(false), 3000); // auto-hide après 3s
    } catch (error) {
      setError(error.message);
    } finally {
      setAnimationLoading(false);
    }
  };

  // Start/stop timer for animation generation
  useEffect(() => {
    if (animationLoading) {
      setTimer(0);
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [animationLoading]);

  /*
  Procédure d'enregistrement lors de la validation d'une animation :

  1. L'utilisateur génère une animation et voit la vidéo dans la page.
  2. Il saisit un nom et clique sur "Valider et enregistrer comme background".
  3. La fonction handleValidateAnimation est appelée :
     - Un objet FormData est créé avec :
       - projectId
       - name (nom de l'animation)
       - isActive
       - video_url (lien direct de la vidéo générée)
     - Un
     - Le champ video_url est extrait du FormData.e requête POST est envoyée à /api/admin/add-background avec le FormData et le token d'auth.
  4. Côté backend (API /api/admin/add-background, non montré ici) :
     - (Optionnel : tu peux télécharger la vidéo et la stocker dans Supabase Storage, ou juste enregistrer l'URL fournie par Replicate)
     - Une entrée est créée dans la table backgrounds avec le champ video_url, le nom, le projet, etc.
  5. La réponse de l'API renvoie la liste mise à jour des backgrounds, qui est affichée dans la page.

  Emplacement du stockage :
  - Si tu télécharges la vidéo, elle est stockée dans Supabase Storage, bucket "backgrounds" ou "videos".
  - Sinon, l'URL publique de la vidéo Replicate est enregistrée dans le champ video_url de la table backgrounds.
  

 Processus d'enregistrement du lien vidéo S3 lors du clic sur "Valider et enregistrer comme background" :

  1. **L'utilisateur clique sur le bouton "Valider et enregistrer comme background"** après avoir généré une animation vidéo.

  2. **La fonction `handleValidateAnimation` est appelée** :
     - Elle télécharge la vidéo générée (depuis Replicate) via son URL (`mainVideoUrl`).
     - Elle convertit la vidéo en blob et prépare un FormData pour l'upload vers S3.
     - Elle envoie ce FormData à l'API `/api/upload-to-s3` pour uploader la vidéo sur S3.
     - Quand l'upload est terminé, elle récupère l'URL S3 (`s3VideoUrl`) de la vidéo.

  3. **Une fois l'URL S3 obtenue** :
     - Un nouveau FormData est créé avec :
       - `projectId`
       - `name` (nom de l'animation)
       - `isActive`
       - `video_url` (lien S3)
     - Ce FormData est envoyé à l'API `/api/admin/add-background` (POST).

  4. **Côté backend (`add-background.js`)** :
     - Le backend parse le FormData (avec multiparty).
     - Il récupère les champs, notamment `projectId`, `name`, et `video_url`.
     - Il fait un UPDATE sur la table `backgrounds` pour le background correspondant (par id ou par projet+nom) et met à jour le champ `video_url` avec le lien S3.

  5. **Retour côté frontend** :
     - Si l'API répond avec succès, le background est mis à jour dans la liste et le lien S3 est désormais enregistré dans le champ `video_url` de la table `backgrounds`.

  **Résumé :**
  - Le bouton lance l'upload S3, puis l'enregistrement du lien dans la base.
  - Le champ `video_url` de la table `backgrounds` contient alors le lien S3 de la vidéo générée.*/

  // Fonction pour uploader la vidéo sur S3 et enregistrer le lien dans la table backgrounds
  const handleValidateAnimation = async () => {
    setAddingBackgroundLoading(true);
    setError(null);

    try {
      // 1. Récupère le token de session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[ANIMATION] Session récupérée:', session);
      if (!session) {
        setError("Session expirée, veuillez vous reconnecter");
        setAddingBackgroundLoading(false);
        return;
      }

      // 2. Télécharge la vidéo générée et convertit en blob
      console.log('[ANIMATION] Téléchargement de la vidéo depuis:', mainVideoUrl);
      const videoRes = await fetch(mainVideoUrl);
      if (!videoRes.ok) throw new Error("Erreur téléchargement vidéo");
      const videoBlob = await videoRes.blob();
      console.log('[ANIMATION] Blob vidéo obtenu:', videoBlob);

      // 3. Upload sur S3
      const fileName = `animation_${Date.now()}.mp4`;
      const s3FormData = new FormData();
      s3FormData.append('file', videoBlob, fileName);
      s3FormData.append('projectId', projectId);

      console.log('[ANIMATION] Envoi du blob à /api/upload-to-s3...');
      const uploadResponse = await fetch('/api/upload-to-s3', {
        method: 'POST',
        body: s3FormData
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.text();
        console.error('[ANIMATION] Erreur upload S3:', errorData);
        throw new Error(errorData || "Erreur upload S3");
      }
      const uploadData = await uploadResponse.json();
      const s3VideoUrl = uploadData.url;
      console.log('[ANIMATION] URL S3 récupérée:', s3VideoUrl);
      if (!s3VideoUrl) throw new Error("URL S3 non reçue");

      // 4. Insert direct dans la table backgrounds via Supabase JS client
      // Pour une animation, conserve l'image_url existante si tu veux garder l'image associée au background.
      // Si tu veux mettre à jour un background existant (et non en créer un nouveau), il faut faire un UPDATE et non un INSERT.
      // Exemple pour UPDATE (conserve image_url, ajoute video_url, met show_animated à true) :
      /*
      const { data, error } = await supabase
        .from('backgrounds')
        .update({
          video_url: s3VideoUrl,
          show_animated: true
        })
        .eq('id', selectedBackground.id)
        .select();
      */
      // Si tu crées un nouveau background, tu peux copier l'image_url de selectedBackground :
      const { data, error } = await supabase
        .from('backgrounds')
        .insert([{
          project_id: projectId,
          name: animationName || 'Animation sans nom',
          is_active: true,
          video_url: s3VideoUrl,
          image_url: selectedBackground?.image_url || '', // conserve l'image associée
          show_animated: true
        }])
        .select();

      if (error) {
        console.error('[ANIMATION] Erreur insert backgrounds:', error);
        throw new Error("Erreur lors de l'enregistrement de la vidéo dans la base");
      }

      console.log('[ANIMATION] Insert backgrounds OK:', data);

      setBackgrounds([...backgrounds, ...data]);
      setSuccess("Animation enregistrée comme arrière-plan !");
      setShowMainVideo(false);
      setMainVideoUrl(null);
      setAnimationName('');
    } catch (error) {
      setError(error.message);
      console.error('[ANIMATION] Exception:', error);
    } finally {
      setAddingBackgroundLoading(false);
    }
  };

  const handleToggleShowAnimated = async (backgroundId, currentValue) => {
    try {
      setError(null);
      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Session expirée, veuillez vous reconnecter");
        return;
      }
      // Update show_animated in backgrounds table
      const { data, error } = await supabase
        .from('backgrounds')
        .update({ show_animated: !currentValue })
        .eq('id', backgroundId)
        .select();

      if (error) {
        setError("Erreur lors de la mise à jour du champ animé: " + error.message);
        return;
      }
      // Update local state
      setBackgrounds(backgrounds.map(bg =>
        bg.id === backgroundId ? { ...bg, show_animated: !currentValue } : bg
      ));
      setSuccess("Champ animé mis à jour !");
    } catch (err) {
      setError("Erreur: " + err.message);
    }
  };

  return (
    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Colonne gauche : gestion des backgrounds */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-medium text-gray-500">Arrière-plans du projet ({backgrounds.length})</h4>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowBackgroundTemplates(true)}
                className="inline-flex items-center px-4 py-2 border border-indigo-300 text-sm font-medium rounded-lg shadow-sm text-indigo-700 bg-white hover:bg-indigo-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5m0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Ajouter depuis templates
              </button>
              <button
                onClick={() => setAddingBackground(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <RiAddLine className="mr-2 h-4 w-4" />
                Ajouter un arrière-plan
              </button>
            </div>
          </div>
          {isRefreshing ? (
            <div className="text-center py-6 bg-white bg-opacity-50 rounded-lg border border-dashed border-gray-300">
              <div className="flex justify-center items-center">
                <svg className="animate-spin h-5 w-5 text-indigo-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-gray-500">Actualisation des arrière-plans...</span>
              </div>
            </div>
          ) : backgrounds.length === 0 ? (
            <div className="text-center py-6 bg-white bg-opacity-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500">
                Aucun arrière-plan n'a été ajouté à ce projet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-10 justify-center place-items-center">
              {backgrounds.map((background) => (
                <div
                  key={background.id}
                  className="w-full max-w-6xl border border-gray-200 rounded-3xl overflow-hidden bg-white shadow-xl flex flex-col mx-auto"
                >
                  {/* Background preview section (image or video) */}
                  <div className="relative" style={{ width: '100%', height: '700px' }}>
                    {background.image_url ? (
                      <>
                        <Image
                          src={getFullImageUrl(background.image_url)}
                          alt={background.name}
                          fill
                          style={{ objectFit: "contain" }}
                          unoptimized={true}
                          onError={(e) => {
                            console.error('Image failed to load:', getFullImageUrl(background.image_url));
                            e.target.src = "/images/fallback.png";
                            e.target.onerror = null;
                          }}
                        />
                        <div className="absolute bottom-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 max-w-full truncate">
                          ID: {background.id?.substring(0, 4)}...
                        </div>
                      </>
                    ) : background.video_url ? (
                      <div className="flex items-center justify-center w-full h-full bg-white">
                        <video
                          src={background.video_url}
                          autoPlay
                          loop
                          muted
                          playsInline
                          controls={false}
                          className="bg-black"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '700px',
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain',
                            background: '#000'
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ height: '700px' }}>
                        <span className="text-gray-400">Aucune image ou vidéo</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Background info and controls section */}
                  <div className="p-4">
                    <h4 className="font-medium text-gray-900 text-sm truncate">{background.name}</h4>
                    
                    {background.video_url && (
                      <div className="mt-2 text-xs text-indigo-700 break-all">
                        <span className="font-semibold">Vidéo :</span> <a href={background.video_url} target="_blank" rel="noopener noreferrer">{background.video_url}</a>
                      </div>
                    )}
                    
                    {/* Controls row - only one checkbox */}
                    <div className="mt-3 flex flex-col space-y-2">
                      {/* Checkbox row */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`animated-${background.id}`}
                          checked={!!background.show_animated}
                          onChange={() => handleToggleShowAnimated(background.id, !!background.show_animated)}
                          className="form-checkbox h-4 w-4 text-indigo-600"
                          disabled={!background.video_url}
                        />
                        <label 
                          htmlFor={`animated-${background.id}`}
                          className="ml-2 text-xs text-gray-700"
                        >
                          {background.video_url ? 
                            "Afficher ce background comme animé" : 
                            "Afficher ce background comme animé (nécessite une vidéo)"}
                        </label>
                      </div>
                      
                      {/* Buttons row */}
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleDeleteBackground(background.id)}
                          className="inline-flex items-center px-2 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                        <button
                          onClick={() => handleOpenAnimationModal(background)}
                          className="inline-flex items-center px-2 py-1 border border-indigo-300 text-xs font-medium rounded text-indigo-700 bg-white hover:bg-indigo-50"
                        >
                          Ajouter une animation
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Background form */}
          {addingBackground && (
            <div className="mt-6 bg-white p-6 rounded-lg border border-gray-200">
              <h4 className="text-md font-medium mb-3">Nouvel arrière-plan</h4>
              <form onSubmit={handleAddBackground} className="space-y-4">
                <div>
                  <label htmlFor="backgroundName" className="block text-sm font-medium text-gray-700">
                    Nom de l'arrière-plan *
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
                  <label className="block text-sm font-medium text-gray-700">Image de l'arrière-plan *</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      {backgroundImagePreview ? (
                        <div className="flex flex-col items-center">
                          <div className="w-40 h-40 mb-3 relative">
                            <Image
                              src={backgroundImagePreview}
                              alt="Aperçu"
                              fill
                              style={{ objectFit: "cover" }}
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
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-md shadow-sm hover:from-indigo-700 hover:to-purple-700"
                    disabled={addingBackgroundLoading}
                  >
                    {addingBackgroundLoading ? 'Ajout en cours...' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {/* Background templates popup */}
          {showBackgroundTemplates && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <BackgroundTemplates
                projectId={projectId}
                onBackgroundsAdded={handleBackgroundTemplatesAdded}
                onError={handleBackgroundTemplatesError}
                onClose={() => setShowBackgroundTemplates(false)}
                disableDirectSave={true}
              />
            </div>
          )}

          {/* Fenêtre/modal d'animation */}
          {showAnimationModal && selectedBackground && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative">
                <button
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                  onClick={handleCloseAnimationModal}
                >
                  &times;
                </button>
                <h4 className="text-lg font-semibold mb-3 text-indigo-700">Générer une animation</h4>
                <div className="mb-4 flex flex-col items-center">
                  <div className="w-40 h-40 relative mb-2">
                    <Image
                      src={getFullImageUrl(selectedBackground.image_url)}
                      alt={selectedBackground.name}
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {selectedBackground.name}
                  </div>
                </div>
                <form onSubmit={handleGenerateAnimation} className="space-y-4">
                  <div>
                    <label htmlFor="animationPrompt" className="block text-sm font-medium text-gray-700">
                      Prompt pour l'animation *
                    </label>
                    <textarea
                      id="animationPrompt"
                      value={animationPrompt}
                      onChange={e => setAnimationPrompt(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black resize-vertical"
                      required
                      placeholder="Décrivez l'animation (ex: A woman is talking)"
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Format de la vidéo *
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="outputFormat"
                          value="landscape"
                          checked={outputFormat === "landscape"}
                          onChange={() => setOutputFormat("landscape")}
                          className="mr-2"
                        />
                        <span>Horizontal (832x480)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="outputFormat"
                          value="portrait"
                          checked={outputFormat === "portrait"}
                          onChange={() => setOutputFormat("portrait")}
                          className="mr-2"
                        />
                        <span>Vertical (480x832)</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-md shadow-sm hover:from-indigo-700 hover:to-purple-700"
                      disabled={animationLoading}
                    >
                      {animationLoading ? 'Génération...' : 'Générer animation'}
                    </button>
                  </div>
                </form>
                {animationLoading && (
                  <div className="mt-6 flex flex-col items-center justify-center">
                    {/* Spinner circulaire animé */}
                    <div className="relative w-16 h-16 mb-2">
                      <svg className="animate-spin absolute inset-0 w-full h-full text-indigo-500" viewBox="0 0 50 50">
                        <circle
                          className="opacity-20"
                          cx="25"
                          cy="25"
                          r="20"
                          stroke="currentColor"
                          strokeWidth="6"
                          fill="none"
                        />
                        <path
                          className="opacity-80"
                          fill="currentColor"
                          d="M25 5a20 20 0 0 1 20 20"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-indigo-700 font-bold text-lg">
                        {/* Animation dots */}
                        <span>
                          {Array.from({ length: ((Date.now() / 500) % 4) }, (_, i) => '.').join('')}
                        </span>
                      </span>
                    </div>
                    {/* Timer affichage */}
                    <div className="text-indigo-700 font-medium text-sm text-center">
                      Création de l'animation en cours<br />
                      <span className="text-xs text-gray-400">
                        Temps écoulé : {String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}
                      </span>
                      <br />
                      <span className="text-xs text-gray-400">Cela peut prendre quelques secondes...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Affichage vidéo principale après génération */}
          {showMainVideo && mainVideoUrl && (
            <div className="my-8 flex flex-col items-center">
              <h4 className="text-md font-semibold mb-2 text-indigo-700">Animation générée</h4>
              <video
                src={mainVideoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full max-w-xl rounded-lg"
                style={{ outline: 'none' }}
              />
              <div className="mt-4 w-full max-w-xl">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'animation à enregistrer
                </label>
                <input
                  type="text"
                  value={animationName}
                  onChange={e => setAnimationName(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black mb-2"
                  placeholder="Nom de l'animation"
                />
                <button
                  onClick={handleValidateAnimation}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-md shadow-sm hover:from-indigo-700 hover:to-purple-700 w-full"
                  disabled={addingBackgroundLoading}
                >
                  {addingBackgroundLoading ? 'Enregistrement...' : 'Valider et enregistrer comme background'}
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Colonne droite : encart tutoriel */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="bg-white border border-indigo-100 rounded-lg shadow-md p-5 sticky top-8">
            <h3 className="text-lg font-semibold text-indigo-700 mb-2">Tutoriel : Gestion des arrière-plans</h3>
            <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2">
              <li>
                <span className="font-medium">Ajouter un arrière-plan :</span> Cliquez sur <span className="font-semibold text-indigo-600">"Ajouter un arrière-plan"</span> et téléchargez une image.
              </li>
              <li>
                <span className="font-medium">Utiliser un template :</span> Cliquez sur <span className="font-semibold text-indigo-600">"Ajouter depuis templates"</span> pour choisir un modèle prédéfini.
              </li>
              <li>
                <span className="font-medium">Supprimer :</span> Utilisez le bouton <span className="text-red-600 font-semibold">Supprimer</span> sur chaque arrière-plan.
              </li>
              <li>
                <span className="font-medium">Astuces :</span> Les images doivent être au format <span className="font-mono">PNG/JPG/GIF</span> et ne pas dépasser 10MB.
              </li>
            </ol>
            <div className="mt-4 text-xs text-gray-500">
              Besoin d'aide ? Contactez le support ou consultez la documentation.
            </div>
          </div>
        </div>
      </div>

      {/* Popup de succès après génération */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl px-8 py-6 flex flex-col items-center animate-fade-in">
            <svg className="h-12 w-12 text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="#d1fae5"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4" />
            </svg>
            <h3 className="text-lg font-bold text-green-700 mb-1">Succès !</h3>
            <p className="text-gray-700 text-center">L'animation a été générée avec succès.</p>
          </div>
        </div>
      )}
    </div>
  );
};


export default BackgroundManager;
