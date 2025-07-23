'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import { RiUpload2Line, RiSave3Line, RiImageAddLine, RiAlertLine } from 'react-icons/ri';

export default function LogoManager({ projectId, setError, setSuccess }) {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [logoData, setLogoData] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exampleList, setExampleList] = useState([]);
  const [exampleIndex, setExampleIndex] = useState(0);

  // Charger les données existantes
  useEffect(() => {
    async function fetchLogoData() {
      if (!projectId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('photobooth_logo')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle();
          
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        if (data) {
          setLogoData(data);
          setPrompt(data.prompt || '');
          setPreviewUrl(data.input_image_2 || null);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des données de logo:', err);
        setError('Impossible de charger les données du logo');
      } finally {
        setLoading(false);
      }
    }
    
    fetchLogoData();
  }, [projectId, supabase, setError]);
  
  // Charger les exemples depuis le fichier JSON
  useEffect(() => {
    async function fetchExamples() {
      try {
        // Utilisez le chemin public pour Next.js (le fichier doit être dans /public/logo-examples.json)
        const res = await fetch('/logo-examples.json');
        if (!res.ok) {
          console.error('Erreur HTTP:', res.status);
          return;
        }
        const data = await res.json();
        setExampleList(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Erreur chargement exemples:', err);
      }
    }
    fetchExamples();
  }, []);

  // Gérer la sélection du fichier
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image valide');
      return;
    }
    
    // Limiter la taille (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('L\'image est trop volumineuse (max: 5MB)');
      return;
    }
    
    setLogoFile(file);
    
    // Créer un aperçu
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  // Télécharger le logo sur S3 et enregistrer les données
  const handleSave = async (e) => {
    e.preventDefault();

    if (!prompt.trim()) {
      setError('Veuillez saisir un prompt pour la fusion d\'image');
      return;
    }

    // Si aucun logo n'est sélectionné et qu'il n'y a pas de logo existant
    if (!logoFile && !previewUrl) {
      setError('Veuillez sélectionner une image pour le logo');
      return;
    }

    setLogoUploading(true);

    try {
      let logoUrl = previewUrl;

      // Si un nouveau fichier est sélectionné, le télécharger sur S3
      if (logoFile) {
        // Créer un nom de fichier unique
        const timestamp = new Date().getTime();
        const fileName = `photobooth-logo/${projectId}/${timestamp}_${logoFile.name.replace(/\s+/g, '_')}`;
        
        // Télécharger vers le bucket S3 via l'API
        const formData = new FormData();
        formData.append('file', logoFile);
        formData.append('path', fileName);
        
        const uploadResponse = await fetch('/api/upload-to-s3', {
          method: 'POST',
          body: formData
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Erreur lors du téléchargement du logo');
        }
        
        const uploadResult = await uploadResponse.json();
        logoUrl = uploadResult.url;
        
        console.log("Image téléchargée sur S3:", logoUrl);
      }
      
      // Préparation des données
      const logoDataToSave = {
        project_id: projectId,
        input_image_2: logoUrl,
        prompt: prompt,
        updated_at: new Date().toISOString()
      };

      let result;

      // Correction ici : si logoData existe mais input_image_2 est null, on fait une insertion
      if (logoData?.id && logoData?.input_image_2) {
        // update
        console.log("Mise à jour d'un enregistrement existant:", logoData.id);
        const { data, error } = await supabase
          .from('photobooth_logo')
          .update(logoDataToSave)
          .eq('id', logoData.id)
          .select()
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error("Erreur détaillée de mise à jour:", error);
          throw new Error(`Erreur de mise à jour: ${error.message}`);
        }

        result = data;
      } else {
        // insert
        console.log("Création d'un nouvel enregistrement");
        const { data, error } = await supabase
          .from('photobooth_logo')
          .insert({
            ...logoDataToSave,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error("Erreur détaillée d'insertion:", error);
          throw new Error(`Erreur d'insertion: ${error.message}`);
        }

        result = data;
      }

      console.log("Opération réussie:", result);
      setLogoData(result);
      setSuccess('Configuration du logo enregistrée avec succès!');

    } catch (err) {
      console.error('Erreur complète:', err);
      setError(`Impossible d'enregistrer la configuration du logo: ${err.message}`);
    } finally {
      setLogoUploading(false);
    }
  };
  
  // Supprimer le logo du S3 et de la base de données
  const handleDeleteLogo = async () => {
    if (!logoData?.input_image_2) return;
    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      console.log("Tentative de suppression du logo pour l'ID:", logoData.id);
      
      // Utiliser l'API dédiée pour éviter les problèmes de permissions/erreurs Supabase
      const response = await fetch('/api/photobooth-logo-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: logoData.id })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error("Erreur de l'API:", result);
        throw new Error(result.error || "Erreur lors de la suppression");
      }
      
      console.log("Réponse de l'API:", result);
      
      // Mise à jour réussie, mettre à jour l'état local
      setLogoData(null); // <-- fix: reset logoData to null after delete
      setLogoFile(null);
      setPreviewUrl(null);
      setSuccess(result.message || 'Référence du logo supprimée avec succès.');
      
    } catch (err) {
      console.error("Erreur complète:", err);
      setError('Impossible de supprimer la référence du logo: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Fonction pour insérer le prompt d'un exemple
  const handleExamplePrompt = (promptText) => {
    setPrompt(promptText);
    setTimeout(() => {
      const textarea = document.getElementById('prompt');
      if (textarea) textarea.focus();
    }, 0);
  };

  // Liste des exemples de prompts (plus courts et variés, avec variantes d'expression faciale)
  const promptExamples = [
    "Sur un t-shirt blanc.",
    "Produit dans la main.",
    "Logo en haut à gauche.",
    "Style cartoon.",
    "Ambiance sportive.",
    "Effet semi-transparent.",
    "Sur la casquette.",
    "Même expression faciale.",
    "Fond neutre.",
    "Produit devant moi.",
    "Objet sur la tête.",
    "Logo centré.",
    "Style photo studio.",
    "Ambiance fun.",
    "Produit à droite.",
    "Logo discret.",
    "T-shirt noir.",
    "Effet réaliste.",
    "place le Logo sur le tshirt.",
    "met le Produit posé à côté.",
    "Mets moi avec la même expression faciale et traits du visage.",
    "Garde la même expression faciale et les mêmes traits du visage."

  ];

  // Fonction pour insérer du texte à la position du curseur dans le textarea
  const insertPromptAtCursor = (text) => {
    const textarea = document.getElementById('prompt');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = prompt.substring(0, start);
    const after = prompt.substring(end, prompt.length);
    setPrompt(before + text + after);
    // Remettre le focus et le curseur après le texte inséré
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
    }, 0);
  };

  return (
    <div className="space-y-6">
    
      
      {/* ...existing code... */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <RiAlertLine className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Cette configuration est nécessaire pour le fonctionnement du mode Logo Fusion.
              L'image téléchargée sera utilisée pour la fusion avec les photos prises par les utilisateurs.
            </p>
          </div>
        </div>
      </div>
      
      {/* Tutoriel/explication IA multi-image et prompt (version générique) */}
      <div className="bg-gradient-to-r from-indigo-100 via-purple-50 to-pink-50 border-l-4 border-indigo-400 rounded-xl shadow-md p-6 mb-6 flex items-start gap-4">
        <div className="flex-shrink-0">
          <svg className="h-10 w-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div>
          <h4 className="text-lg font-bold text-indigo-700 mb-1">Comment rédiger un prompt efficace&nbsp;?</h4>
          <p className="text-gray-700 mb-2">
            Le <span className="font-semibold text-indigo-600">prompt</span> guide l’IA pour fusionner l’image importée (produit, t-shirt, logo, objet, etc.) avec la photo de l’utilisateur. Plus votre prompt est précis, plus le résultat sera fidèle à vos attentes.
          </p>
          <ul className="list-disc pl-5 text-sm text-gray-700 mb-2">
            <li>Décrivez où et comment l’image doit apparaître (ex: "sur un t-shirt blanc, centré sur la poitrine", "le produit tenu dans la main").</li>
            <li>Précisez le style ou l’ambiance souhaitée (ex: "style cartoon, fond neutre", "ambiance sportive").</li>
            <li>Ajoutez des instructions sur la taille, la couleur ou la transparence si besoin.</li>
          </ul>
          <div className="bg-white border border-indigo-200 rounded-lg p-3 mt-2 shadow-sm">
            <span className="block text-xs text-gray-500 mb-1 font-semibold">Exemples de prompts&nbsp;:</span>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>• Placez le t-shirt sur la personne, couleur blanche, style photo studio.</li>
              <li>• Ajoutez le produit dans la main droite de l’utilisateur, effet réaliste.</li>
              <li>• Fusionnez l’objet sur la tête comme un chapeau, ambiance fun.</li>
              <li>• Affichez le logo en haut à gauche de la photo, effet semi-transparent.</li>
              <li>• Mets moi avec exactement la même expression faciale et les mêmes traits du visage, mais avec le produit fusionné.</li>
            </ul>
          </div>
          <div className="mt-3 text-xs text-indigo-600 font-medium">
            <span className="font-bold">Astuce IA multi-image&nbsp;:</span> L’IA combine la photo prise et l'image importée pour générer une nouvelle image personnalisée selon votre prompt.
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSave} className="space-y-6">
        {/* Zone de téléchargement du logo */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50">
          {previewUrl ? (
            <div className="mb-4 relative">
              <div className="relative w-64 h-64 overflow-hidden rounded-lg border border-gray-200 shadow-md">
                <Image 
                  src={previewUrl} 
                  alt="Logo preview" 
                  fill 
                  style={{ objectFit: 'contain' }} 
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setLogoFile(null);
                  setPreviewUrl(null);
                }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-sm hover:bg-red-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {/* Bouton supprimer logo */}
              {logoData?.input_image_2 && (
                <button
                  type="button"
                  onClick={handleDeleteLogo}
                  disabled={deleting}
                  className="absolute bottom-2 right-2 bg-white border border-red-500 text-red-600 rounded px-3 py-1 text-xs font-semibold shadow hover:bg-red-50 transition-colors"
                >
                  {deleting ? 'Suppression...' : 'Supprimer'}
                </button>
              )}
            </div>
          ) : (
            <div className="text-center">
              <RiUpload2Line className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-2 text-sm text-gray-600">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                  <span>Télécharger un logo</span>
                  <input 
                    id="file-upload" 
                    name="file-upload" 
                    type="file" 
                    className="sr-only"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF jusqu'à 5MB</p>
            </div>
          )}
          
          <div className="mt-4 flex items-center justify-center">
            <label htmlFor="file-change" className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center">
              <RiUpload2Line className="mr-2 h-4 w-4" />
              {previewUrl ? 'Changer l\'image' : 'Parcourir...'}
              <input
                id="file-change"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </label>
          </div>
        </div>
        
        {/* Champ prompt très design */}
        <div className="relative">
          <div className="absolute -top-5 left-4 bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1 rounded-t-lg shadow text-white text-xs font-bold z-10 flex items-center gap-2">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m9-6a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Prompt IA Fusion
          </div>
          <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 border-2 border-indigo-300 rounded-xl shadow-lg p-5 pt-8">
            <label htmlFor="prompt" className="block text-sm font-bold text-indigo-700 mb-2">
              Décrivez la fusion souhaitée
            </label>
            <textarea
              id="prompt"
              name="prompt"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="shadow-inner focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-indigo-200 rounded-lg p-3 bg-white text-gray-900 font-mono transition"
              placeholder="Exemple : Placez le produit dans la main de la personne, style réaliste"
              required
            />
            {/* Boutons d'insertion d'exemples */}
            <div className="flex flex-wrap gap-2 mt-3">
              {promptExamples.map((ex, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs px-3 py-1 rounded-lg border border-indigo-200 shadow-sm transition"
                  onClick={() => insertPromptAtCursor(ex)}
                  tabIndex={-1}
                >
                  {ex}
                </button>
              ))}
            </div>
            {/* Slider d'exemples avant/après (juste après les boutons d'aide au prompt) */}
            {exampleList.length > 0 && (
              <div className="my-6 bg-white rounded-xl shadow border border-gray-200 p-4">
                {/* Ajout du titre et de la description générale */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-indigo-700">Exemples</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Sélectionnez un exemple pour visualiser le résultat avant/après. Cliquez sur le bouton "Utiliser ce Prompt" pour l'appliquer, télécharger une image de votre choix pour le prompt séléctionné.
                  </p>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold text-indigo-700">{exampleList[exampleIndex].title}</span>
                    <span className="ml-2 text-gray-500 text-sm">{exampleList[exampleIndex].description}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-2 py-1 rounded bg-indigo-100 text-indigo-700"
                      disabled={exampleIndex === 0}
                      onClick={() => setExampleIndex(i => Math.max(0, i - 1))}
                    >Précédent</button>
                    <button
                      type="button"
                      className="px-2 py-1 rounded bg-indigo-100 text-indigo-700"
                      disabled={exampleIndex === exampleList.length - 1}
                      onClick={() => setExampleIndex(i => Math.min(exampleList.length - 1, i + 1))}
                    >Suivant</button>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
                  {/* Image avant */}
                  <div
                    className="cursor-pointer group"
                    onClick={() => handleExamplePrompt(exampleList[exampleIndex].prompt)}
                    title="Insérer ce prompt"
                  >
                    <div className="relative w-40 h-40 border rounded-lg overflow-hidden shadow">
                      <Image
                        src={exampleList[exampleIndex].image1}
                        alt="Avant"
                        fill
                        style={{ objectFit: 'cover' }}
                        className="transition group-hover:scale-105"
                      />
                    </div>
                    <div className="text-xs text-center mt-2 text-gray-600">Avant</div>
                  </div>
                  {/* Signe + */}
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold text-indigo-600 mb-2">+</span>
                  </div>
                  {/* Image après */}
                  <div
                    className="cursor-pointer group"
                    onClick={() => handleExamplePrompt(exampleList[exampleIndex].prompt)}
                    title="Insérer ce prompt"
                  >
                    <div className="relative w-40 h-40 border rounded-lg overflow-hidden shadow">
                      <Image
                        src={exampleList[exampleIndex].image2}
                        alt="Après"
                        fill
                        style={{ objectFit: 'cover' }}
                        className="transition group-hover:scale-105"
                      />
                    </div>
                    <div className="text-xs text-center mt-2 text-gray-600">Après</div>
                  </div>
                  {/* Signe = */}
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold text-indigo-600 mb-2">=</span>
                  </div>
                  {/* Image résultat */}
                  <div className="group">
                    <div className="relative w-40 h-40 border rounded-lg overflow-hidden shadow">
                      <Image
                        src={exampleList[exampleIndex].result}
                        alt="Résultat"
                        fill
                        style={{ objectFit: 'cover' }}
                        className="transition group-hover:scale-105"
                      />
                    </div>
                    <div className="text-xs text-center mt-2 text-gray-600">Résultat</div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-indigo-700 text-center">
                  <span className="font-semibold">Prompt :</span>
                  <span className="ml-2">{exampleList[exampleIndex].prompt}</span>
                  <button
                    type="button"
                    className="ml-3 px-2 py-1 rounded bg-indigo-600 text-white text-xs"
                    onClick={() => handleExamplePrompt(exampleList[exampleIndex].prompt)}
                  >
                    Utiliser ce prompt
                  </button>
                </div>
              </div>
            )}
            {/* FAQ Multi-image en encarts 3 colonnes */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* 1 */}
              <div className="bg-white/90 border-l-4 border-indigo-400 rounded-xl shadow p-5">
                <div className="font-bold text-indigo-700 mb-2">Qu'est-ce que Logo fusion Multi-image&nbsp;?</div>
                <ul className="list-disc pl-5 text-indigo-900 text-sm space-y-1">
                  <li><b>Éditeur IA Multi-image :</b> Modifiez plusieurs images simultanément.</li>
                  <li><b>Flux de travail révolutionnaire :</b> Transforme votre façon de travailler avec plusieurs images.</li>
                  <li><b>Instructions simples :</b> Dites-lui quels changements apporter à vos images.</li>
                  <li><b>Résultats cohérents :</b> Maintient la cohérence lors de la modification de plusieurs images à la fois.</li>
                </ul>
              </div>
              {/* 2 */}
              <div className="bg-white/90 border-l-4 border-indigo-400 rounded-xl shadow p-5">
                <div className="font-bold text-indigo-700 mb-2">Comment fonctionne Logo fusion Multi-image&nbsp;?</div>
                <ul className="list-disc pl-5 text-indigo-900 text-sm space-y-1">
                  <li><b>Traitement Multi-image avancé :</b> Traite plusieurs images simultanément.</li>
                  <li><b>Commandes unifiées :</b> Téléchargez plusieurs images et fournissez une seule commande pour toutes.</li>
                  <li><b>Modifications cohérentes :</b> Applique les changements de manière homogène.</li>
                  <li><b>Traitement  :</b> Gagnez du temps en modifiant plusieurs images en une seule fois.</li>
                </ul>
              </div>
              {/* 3 */}
              <div className="bg-white/90 border-l-4 border-indigo-400 rounded-xl shadow p-5">
                <div className="font-bold text-indigo-700 mb-2">Quels types de modifications multi-images puis-je effectuer&nbsp;?</div>
                <ul className="list-disc pl-5 text-indigo-900 text-sm space-y-1">
                  <li><b>Édition  :</b> Appliquez la même modification à plusieurs images.</li>
                  <li><b>Transfert de style :</b> Appliquez des changements de style cohérents.</li>
                  <li><b>Correction des couleurs :</b> Ajustez les couleurs de façon uniforme.</li>
                  <li><b>Édition d'objets :</b> Modifiez des objets de façon cohérente sur plusieurs images.</li>
                </ul>
              </div>
              {/* 4 - L'utilisation de logo fusion Multi-image est-elle gratuite ? (SUPPRIMÉ) */}
              {/* 5 */}
              <div className="bg-white/90 border-l-4 border-indigo-400 rounded-xl shadow p-5">
                <div className="font-bold text-indigo-700 mb-2">Comment rédiger des instructions efficaces pour plusieurs images&nbsp;?</div>
                <ul className="list-disc pl-5 text-indigo-900 text-sm space-y-1">
                  <li><b>Commandes  claires :</b> Utilisez des instructions adaptées à plusieurs images.</li>
                  <li><b>Instructions cohérentes :</b> Les modifications doivent avoir du sens pour toutes les images.</li>
                  <li><b>Changements spécifiques :</b> Indiquez clairement ce qui doit changer.</li>
                  <li><b>Commencez simplement :</b> Privilégiez des modifications de base avant d'aller plus loin.</li>
                </ul>
              </div>
              {/* 6 - Comment logo fusion Multi se compare-t-il aux autres outils ? (SUPPRIMÉ) */}
              {/* 7 */}
              <div className="bg-white/90 border-l-4 border-indigo-400 rounded-xl shadow p-5">
                <div className="font-bold text-indigo-700 mb-2">Quels sont les cas d'utilisation courants&nbsp;?</div>
                <ul className="list-disc pl-5 text-indigo-900 text-sm space-y-1">
                  <li><b>Essayage virtuel :</b> Modèles et vêtements générés par IA.</li>
                  <li><b>Commerce électronique :</b> Produits et arrière-plans personnalisés.</li>
                  <li><b>Référence Multi-image :</b> Style cohérent à partir de plusieurs références.</li>
                  <li><b>Composition virtuelle :</b> Plusieurs personnages dans la même scène.</li>
                  <li><b>Composition d'images :</b> Mélangez deux images pour en générer une nouvelle.</li>
                  <li><b>Transfert de style :</b> Appliquez des styles cohérents à plusieurs images.</li>
                </ul>
              </div>
              {/* 8 */}
              <div className="bg-white/90 border-l-4 border-indigo-400 rounded-xl shadow p-5">
                <div className="font-bold text-indigo-700 mb-2">Comment obtenir les meilleurs résultats&nbsp;?</div>
                <ul className="list-disc pl-5 text-indigo-900 text-sm space-y-1">
                  <li><b>Sélectionnez des images similaires :</b> Pour plus de cohérence.</li>
                  <li><b>Planifiez vos changements :</b> Réfléchissez à l'impact sur toutes les images.</li>
                  <li><b>Testez d'abord :</b> Essayez sur un petit lot avant de traiter beaucoup d'images.</li>
                  <li><b>Examinez tous les résultats :</b> Vérifiez chaque image après traitement.</li>
                  <li><b>Maintenez la cohérence :</b> Les changements doivent rester naturels.</li>
                  <li><b>Approche itérative :</b> Faites plusieurs passes pour les modifications complexes.</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-indigo-500 mt-2">
              Ce texte indique à l'IA comment fusionner l'image importée (produit, t-shirt, logo, etc.) avec la photo de l'utilisateur.
            </p>
          </div>
        </div>
        
        {/* Bouton de sauvegarde */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={logoUploading}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              logoUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {logoUploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enregistrement...
              </>
            ) : (
              <>
                <RiSave3Line className="mr-2 h-4 w-4" />
                Enregistrer la configuration
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
