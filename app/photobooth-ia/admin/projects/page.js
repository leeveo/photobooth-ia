'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { useQRCode } from 'next-qrcode'; // Import de la bibliothèque QR code
import StyleTemplates from '../components/StyleTemplates';
import WatermarkPreview from '../components/WatermarkPreview'; // Import de la prévisualisation du filigrane
// Initialisation du client S3
const s3Client = new S3Client({
  region: 'eu-west-3',
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  },
});

export default function Projects() {
  const supabase = createClientComponentClient();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [selectedQRProject, setSelectedQRProject] = useState(null); // État pour stocker le projet dont on affiche le QR code
  const { Canvas } = useQRCode(); // Utilisation du hook useQRCode
  const [showQRCode, setShowQRCode] = useState(null); // État pour afficher le QR code
  // En haut de votre fonction Projects, après les autres déclarations d'états
const [duplicateError, setDuplicateError] = useState(false);
const [currentOperation, setCurrentOperation] = useState(null);
  // État de l'onglet actif dans le formulaire de projet
  const [activeTab, setActiveTab] = useState('info');
  
  // États pour les données du projet
// Modifiez l'initialisation de formData (vers la ligne 30)
const [formData, setFormData] = useState({
  name: '',
  slug: '',
  description: '',
  primaryColor: '#811A53',
  secondaryColor: '#E5E40A',
  homeMessage: "C'est vous le mannequin !",
  photobooth_type: 'standard', // Ajoutez cette ligne avec 'standard' comme valeur par défaut
  clientName: '', // New field for client name
  eventDate: '', // New field for event date
  sharing_method: 'qr_code', // New field for sharing method: 'qr_code' or 'email'
  backgroundImage: '', // New field for storing selected background
  email_from: '',
  email_subject: 'Votre photo de la séance photobooth',
  email_body: 'Bonjour,\n\nVoici votre photo de la séance photobooth. Vous pouvez la télécharger en cliquant sur le lien ci-dessous.\n\nMerci et à bientôt !',
  // Add SMTP configuration fields
  email_smtp_host: '',
  email_smtp_port: '587',
  email_smtp_secure: 'false',
  email_smtp_user: '',
  email_smtp_password: '',
  watermark_enabled: false,
  watermark_text: '',
  watermark_logo_url: '',
  watermark_position: 'bottom-right', // This will be used for logo position
  watermark_text_position: 'bottom-right', // New field for text position
  watermark_text_color: '#FFFFFF',
  watermark_text_size: 24,
  watermark_opacity: 0.8,
});
  
  // États pour le logo du projet
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  
  // Add missing watermark logo states
  const [watermarkLogoFile, setWatermarkLogoFile] = useState(null);
  const [watermarkLogoPreview, setWatermarkLogoPreview] = useState(null);
  
  // États pour les styles
  const [styles, setStyles] = useState([]);
  const [newStyle, setNewStyle] = useState({
    name: '',
    gender: '',
    style_key: '',
    description: '',
    variations: 1
  });
  const [styleFile, setStyleFile] = useState(null);
  const [styleImagePreview, setStyleImagePreview] = useState(null);
  const [styleLoading, setStyleLoading] = useState(false);
  
  // États pour les arrière-plans
  const [backgrounds, setBackgrounds] = useState([]);
  const [newBackground, setNewBackground] = useState({
    name: ''
  });
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState(null);
  const [backgroundLoading, setBackgroundLoading] = useState(false);

  // Gestion temporaire de l'id du projet en création (pour associer styles et arrière-plans)
  const [tempProjectId, setTempProjectId] = useState(null);
  // Add state for photo counts
  const [projectsWithPhotoCount, setProjectsWithPhotoCount] = useState({});
  const [loadingPhotoCounts, setLoadingPhotoCounts] = useState(false);

  // State for available backgrounds
  const [availableBackgrounds, setAvailableBackgrounds] = useState([]);
  const [backgroundsLoading, setBackgroundsLoading] = useState(true);
  const backgroundSliderRef = useRef(null);

  // Fix missing dependency in useEffect
useEffect(() => {
  fetchProjects();
}, [fetchProjects]); // Add fetchProjects to dependency array

// Wrap fetchProjects in useCallback to prevent infinite loops
const fetchProjects = useCallback(async () => {
  setLoading(true);
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setProjects(data || []);
    
    // After fetching projects, get photo counts
    fetchPhotoCountsForProjects(data || []);
  } catch (error) {
    console.error('Error fetching projects:', error);
    setError('Erreur lors du chargement des projets');
  } finally {
    setLoading(false);
  }
}, [supabase, fetchPhotoCountsForProjects]); // Add appropriate dependencies

// Wrap fetchPhotoCountsForProjects in its own useCallback
const fetchPhotoCountsForProjects = useCallback(async (projectsData) => {
  if (!projectsData.length) return;
  
  setLoadingPhotoCounts(true);
  const photoCounts = {};
  
  try {
    for (const project of projectsData) {
      try {
        // Call API to count S3 images
        const response = await fetch(`/api/s3-project-images?projectId=${project.id}&countOnly=true`);
        if (response.ok) {
          const countData = await response.json();
          photoCounts[project.id] = countData.count || 0;
        }
      } catch (countError) {
        console.error(`Error fetching counts for project ${project.id}:`, countError);
        photoCounts[project.id] = 0;
      }
    }
    
    setProjectsWithPhotoCount(photoCounts);
  } catch (error) {
    console.error('Error fetching photo counts:', error);
  } finally {
    setLoadingPhotoCounts(false);
  }
}, [/* dependencies used inside */]);

  function handleChange(e) {
    const { name, value } = e.target;
    
    // Pour les slugs, on convertit automatiquement le nom en slug-friendly
    if (name === 'name' && !isEditing) {
      const slug = value
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Supprime les caractères spéciaux
        .replace(/\s+/g, '-')     // Remplace les espaces par des tirets
        .replace(/-+/g, '-');     // Supprime les tirets consécutifs
      
      setFormData({
        ...formData,
        [name]: value,
        slug: slug
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  }

  function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  }
  
  // Fonction pour prévisualiser l'image de style
  function handleStyleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    setStyleFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setStyleImagePreview(event.target.result);
    };
    reader.readAsDataURL(file);
  }
  
  // Fonction pour prévisualiser l'image d'arrière-plan
  function handleBackgroundImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    setBackgroundFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setBackgroundImagePreview(event.target.result);
    };
    reader.readAsDataURL(file);
  }

  function handleWatermarkLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setWatermarkLogoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setWatermarkLogoPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  }

  // Mise à jour de la fonction de création/mise à jour de projet
  async function handleCreateOrUpdate(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      let logoUrl = isEditing ? projects.find(p => p.id === isEditing)?.logo_url : null;
      let watermarkLogoUrl = isEditing ? projects.find(p => p.id === isEditing)?.watermark_logo_url : null;
      let projectId = isEditing ? isEditing : null;

      // Upload logo if provided
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const filePath = `${formData.slug}/logo-${Date.now()}.${fileExt}`;
        
        try {
          const { error: uploadError } = await supabase.storage
            .from('projects')
            .upload(filePath, logoFile, { upsert: true });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('projects')
            .getPublicUrl(filePath);

          logoUrl = urlData.publicUrl;
        } catch (storageError) {
          console.error('Storage error:', storageError);
          setError(`Erreur lors du téléchargement du logo: ${storageError.message}. Le projet sera créé sans logo.`);
        }
      }

      // Upload watermark logo if provided
      if (watermarkLogoFile) {
        const fileExt = watermarkLogoFile.name.split('.').pop();
        const filePath = `${formData.slug}/watermark-logo-${Date.now()}.${fileExt}`;
        
        try {
          const { error: uploadError } = await supabase.storage
            .from('projects')
            .upload(filePath, watermarkLogoFile, { upsert: true });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('projects')
            .getPublicUrl(filePath);

          watermarkLogoUrl = urlData.publicUrl;
        } catch (storageError) {
          console.error('Storage error:', storageError);
          setError(`Erreur lors du téléchargement du logo de filigrane: ${storageError.message}. Le projet sera créé sans ce logo.`);
        }
      }

      // Create or update project with watermark settings
     if (isEditing) {
    // Create update payload to debug what we're sending
    const updatePayload = {
      name: formData.name,
      description: formData.description,
      primary_color: formData.primaryColor,
      secondary_color: formData.secondaryColor,
      home_message: formData.homeMessage,
      photobooth_type: formData.photobooth_type,
      client_name: formData.clientName,
      event_date: formData.eventDate,
      sharing_method: formData.sharing_method,
      email_from: formData.email_from,
      email_subject: formData.email_subject,
      email_body: formData.email_body,
      email_smtp_host: formData.email_smtp_host,
      email_smtp_port: formData.email_smtp_port,
      email_smtp_secure: formData.email_smtp_secure,
      email_smtp_user: formData.email_smtp_user,
      email_smtp_password: formData.email_smtp_password,
      // Explicit handling of watermark fields
      watermark_enabled: formData.watermark_enabled === true, // Force boolean
      watermark_text: formData.watermark_text || '',
      watermark_position: formData.watermark_position || 'bottom-right',
      watermark_text_position: formData.watermark_text_position || formData.watermark_position || 'bottom-right',
      watermark_text_color: formData.watermark_text_color || '#FFFFFF',
      watermark_text_size: parseInt(formData.watermark_text_size) || 24,
      watermark_opacity: parseFloat(formData.watermark_opacity) || 0.8
    };

    // Handle logo URLs separately to avoid null values
    if (watermarkLogoUrl) {
      updatePayload.watermark_logo_url = watermarkLogoUrl;
    } else if (formData.watermark_logo_url) {
      updatePayload.watermark_logo_url = formData.watermark_logo_url;
    }
    
    if (logoUrl) {
      updatePayload.logo_url = logoUrl;
    }

    console.log("Updating project with data:", {
      id: isEditing,
      watermark_enabled: updatePayload.watermark_enabled,
      watermark_text: updatePayload.watermark_text,
      watermark_position: updatePayload.watermark_position
    });

    // Update the project with the constructed payload
    const { error } = await supabase
      .from('projects')
      .update(updatePayload)
      .eq('id', isEditing);
      
    if (error) {
      console.error("Supabase update error:", error);
      throw error;
    }
    
    setSuccess("Projet mis à jour avec succès ! Les paramètres de filigrane ont été sauvegardés.");
  } else {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        primary_color: formData.primaryColor,
        secondary_color: formData.secondaryColor,
        home_message: formData.homeMessage,
        logo_url: logoUrl,
        photobooth_type: formData.photobooth_type, // Ajoutez cette ligne
        client_name: formData.clientName, // Add client_name
        event_date: formData.eventDate, // Add event_date
        sharing_method: formData.sharing_method, // Add sharing method
        email_from: formData.email_from,
        email_subject: formData.email_subject,
        email_body: formData.email_body,
        email_smtp_host: formData.email_smtp_host,
        email_smtp_port: formData.email_smtp_port,
        email_smtp_secure: formData.email_smtp_secure,
        email_smtp_user: formData.email_smtp_user,
        email_smtp_password: formData.email_smtp_password,
        watermark_enabled: formData.watermark_enabled,
        watermark_text: formData.watermark_text,
        watermark_logo_url: watermarkLogoUrl,
        watermark_position: formData.watermark_position,
        watermark_text_color: formData.watermark_text_color,
        watermark_text_size: parseInt(formData.watermark_text_size),
        watermark_opacity: parseFloat(formData.watermark_opacity),
        background_image: formData.backgroundImage, // Add the background image to insert
      })
      .select();

        if (error) throw error;
        
        // Stocker l'ID du projet créé pour associer les styles/arrières-plans
        projectId = data[0].id;
        setTempProjectId(projectId);
        
        setSuccess('Projet créé avec succès ! Vous pouvez maintenant ajouter des styles et arrière-plans.');
      }
      
      // Si on est sur un onglet autre que "info", on ne réinitialise pas tout
     if (activeTab === 'info') {
    if (!isEditing) {
      setFormData({
        name: '',
        slug: '',
        description: '',
        primaryColor: '#811A53',
        secondaryColor: '#E5E40A',
        homeMessage: "C'est vous le mannequin !",
        photobooth_type: 'standard', // Ajoutez cette ligne
        clientName: '', // Reset client name
        eventDate: '' // Reset event date
      });
          setLogoFile(null);
          setLogoPreview(null);
          setIsCreating(false);
          setIsEditing(null);
        }
      }
      
      // On change d'onglet après création
      if (!isEditing && activeTab === 'info') {
        setActiveTab('styles');
      }
      
      fetchProjects();
    } catch (error) {
      console.error('Error creating/updating project:', error);
      setError(error.message);
    }
  }
  
  // Fonction pour ajouter un style
 async function handleAddStyle(e) {
  e.preventDefault();
  
  // 1. Validations au début
  if (!styleFile) {
    setError('Veuillez sélectionner une image de style (obligatoire)');
    return;
  }
  
  if (!newStyle.name || !newStyle.gender || !newStyle.style_key) {
    setError('Veuillez remplir tous les champs obligatoires du style');
    return;
  }
  
  setStyleLoading(true);
  setError(null);
  setSuccess(null);
  
  // Variables pour stocker les URLs
  let supabaseUrl = null;
  let s3Url = null;
  
  try {
    // L'ID du projet est soit celui en édition, soit le temporaire
    const projectId = isEditing || tempProjectId;
    if (!projectId) {
      throw new Error('Veuillez d\'abord créer le projet avant d\'ajouter un style');
    }
    
    // Récupérer les infos du projet pour le slug
    const { data: projectData } = await supabase
      .from('projects')
      .select('slug')
      .eq('id', projectId)
      .single();
      
    if (!projectData) throw new Error('Projet non trouvé');
    
    // 2. Upload vers S3 (première tentative)
    try {
      console.log("Début de l'upload vers S3");
      const arrayBuffer = await styleFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Nom de fichier avec timestamp pour éviter les conflits
      const fileExt = styleFile.name.split('.').pop();
      const timestamp = Date.now();
      const randomNumber = Math.floor(Math.random() * 5) + 1;
      const s3FileName = `style/${newStyle.gender}-${newStyle.style_key}-${randomNumber}-${timestamp}.${fileExt}`;
      
      console.log("S3 file path:", s3FileName);
      
      // Paramètres d'upload sans ACL
      const uploadParams = {
        Bucket: 'leeveostockage',
        Key: s3FileName,
        Body: buffer,
        ContentType: styleFile.type || 'image/jpeg',
        ContentLength: buffer.length
        // ACL: 'public-read' // Supprimé car votre bucket n'accepte pas les ACLs
      };
      
      console.log("Tentative d'upload S3 avec les paramètres:", {
        Bucket: uploadParams.Bucket,
        Key: uploadParams.Key,
        ContentType: uploadParams.ContentType,
        ContentLength: buffer.length
      });
      
      const command = new PutObjectCommand(uploadParams);
      const s3Response = await s3Client.send(command);
      
      console.log("Réponse S3:", s3Response);
      
      // Générer l'URL S3
      s3Url = `https://${uploadParams.Bucket}.s3.eu-west-3.amazonaws.com/${uploadParams.Key}`;
      console.log('Upload S3 réussi, URL:', s3Url);
    } catch (s3Error) {
      console.error('Erreur détaillée S3:', s3Error);
      console.error('Code S3:', s3Error.Code || s3Error.code);
      console.error('Message S3:', s3Error.Message || s3Error.message);
      
      // Ajouter plus d'informations de débogage
      if (s3Error.$metadata) {
        console.error('S3 metadata:', s3Error.$metadata);
      }
      
      // Continuer avec Supabase même si S3 échoue
    }
    
    // 3. Upload vers Supabase (seconde tentative)
try {
  // Créer le bucket s'il n'existe pas
  try {
    await supabase.storage.createBucket('styles', { public: true });
    console.log("Bucket 'styles' vérifié/créé avec succès");
  } catch (bucketError) {
    console.log("Note sur le bucket:", bucketError);
    // Si le bucket existe déjà, cette erreur est attendue
  }

  // Vérifier si le fichier existe déjà avant de tenter l'upload
  const fileExt = styleFile.name.split('.').pop();
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const fileName = `${newStyle.gender}-${newStyle.style_key}-${timestamp}-${uniqueId}.${fileExt}`;
  
  console.log("Tentative d'upload avec nom de fichier unique:", fileName);
  
  // Utiliser upsert: true pour remplacer le fichier s'il existe déjà
   const { data, error: uploadError } = await supabase.storage
    .from('styles')
    .upload(fileName, styleFile, { 
      contentType: styleFile.type || 'image/jpeg',
      cacheControl: '3600',
      upsert: true
    });
    
  if (uploadError) {
    console.error('Erreur Supabase Storage détaillée:', uploadError);
    
    // Si l'erreur est une erreur de duplication (409), afficher le popup
    if (uploadError.statusCode === '409') {
      console.log("Conflit de fichier détecté. Affichage du popup pour l'utilisateur");
      
      // Afficher le popup et interrompre l'opération
      setDuplicateError(true);
      setCurrentOperation('style');
      setStyleLoading(false);
      return; // Sortir de la fonction pour éviter de continuer avec une URL invalide
      
      // SUPPRIMER TOUT LE CODE CI-DESSOUS JUSQU'À LA FIN DE LA CONDITION IF
      // NE PAS FAIRE DE NOUVELLE TENTATIVE AUTOMATIQUE
      /*
      // Option 1: Nouvelle tentative avec un nom encore plus aléatoire
      const ultraRandomName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
      console.log("Nouvelle tentative avec un nom ultra-aléatoire:", ultraRandomName);
      
      const { data: retryData, error: retryError } = await supabase.storage
        .from('styles')
        .upload(ultraRandomName, styleFile, { 
          contentType: styleFile.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: true
        });
        
      if (retryError) {
        console.error("Échec de la seconde tentative:", retryError);
        
        // Si cette tentative échoue également, on informe l'utilisateur
        setDuplicateError(true);
        setCurrentOperation('style');
        setStyleLoading(false);
        return; // Sortir de la fonction pour éviter de continuer avec une URL invalide
      } else {
        // Génération de l'URL après la deuxième tentative réussie
        const { data: urlData } = supabase.storage
          .from('styles')
          .getPublicUrl(ultraRandomName);
          
        supabaseUrl = urlData.publicUrl;
        console.log('URL Supabase (retry réussi):', supabaseUrl);
      }
      */
    } else {
      // Pour les autres erreurs, lancer une exception
      throw new Error(`Erreur Supabase: ${uploadError.message}`);
    }
  } else {
    // Upload réussi du premier coup
    const { data: urlData } = supabase.storage
      .from('styles')
      .getPublicUrl(fileName);
      
    supabaseUrl = urlData.publicUrl;
    console.log('URL Supabase (premier essai):', supabaseUrl);
  }
} catch (supabaseError) {
  console.error('Exception Supabase Storage complète:', supabaseError);
  // Si S3 a fonctionné mais pas Supabase, on peut quand même continuer
  if (!s3Url) {
    // Si nous n'avons pas non plus d'URL S3, on ne peut pas continuer
    throw new Error(`Échec des uploads sur S3 et Supabase: ${supabaseError.message}`);
  }
  // Sinon, on continue avec l'URL S3 uniquement
}
    // 4. Utiliser l'URL disponible (S3 ou Supabase)
    const previewImageUrl = s3Url || supabaseUrl;
    if (!previewImageUrl) {
      throw new Error("Impossible d'obtenir une URL pour l'image du style après plusieurs tentatives");
    }
    
    console.log('URL finale utilisée:', previewImageUrl);
    
    // 5. Vérification supplémentaire pour éviter l'erreur de contrainte not-null
    if (!previewImageUrl) {
      throw new Error("L'URL de prévisualisation est obligatoire mais n'a pas pu être générée");
    }
    
    // 6. Insertion dans la base de données
    const styleData = {
      name: newStyle.name,
      gender: newStyle.gender,
      style_key: newStyle.style_key,
      description: newStyle.description || '',
      preview_image: previewImageUrl, // Cette valeur ne peut pas être null
      s3_url: s3Url || null,
      supabase_url: supabaseUrl || null,
      variations: parseInt(newStyle.variations) || 1,
      project_id: projectId,
      is_active: true
    };
    
    console.log('Données du style à insérer:', styleData);
    
    const { error: insertError } = await supabase
      .from('styles')
      .insert([styleData]); // Ajout des crochets pour s'assurer qu'on passe un tableau
    
    if (insertError) {
      console.error('Erreur d\'insertion:', insertError);
      throw new Error(`Erreur d'insertion dans la base de données: ${insertError.message}`);
    }
    
    setSuccess('Style ajouté avec succès !');
    
    // Réinitialiser le formulaire
    setNewStyle({
      name: '',
      gender: '',
      style_key: '',
      description: '',
      variations: 1
    });
    setStyleFile(null);
    setStyleImagePreview(null);
    
    // Rafraîchir la liste des styles
    fetchStylesForProject(projectId);
  } catch (error) {
    console.error('Error adding style:', error);
    setError(`Erreur lors de l'ajout du style: ${error.message}`);
  } finally {
    setStyleLoading(false);
  }
}
  
  // Fonction pour ajouter un arrière-plan
  async function handleAddBackground(e) {
    e.preventDefault();
    
    if (!backgroundFile) {
      setError('Veuillez sélectionner une image d\'arrière-plan');
      return;
    }
    
    if (!newBackground.name) {
      setError('Veuillez donner un nom à l\'arrière-plan');
      return;
    }
    
    setBackgroundLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // L'ID du projet est soit celui en édition, soit le temporaire
      const projectId = isEditing || tempProjectId;
      if (!projectId) {
        throw new Error('Veuillez d\'abord créer le projet avant d\'ajouter un arrière-plan');
      }
      
      // Récupérer les infos du projet pour le slug
      const { data: projectData } = await supabase
        .from('projects')
        .select('slug')
        .eq('id', projectId)
        .single();
        
      if (!projectData) throw new Error('Projet non trouvé');
      
      // Upload de l'image dans le bon dossier avec le slug du projet
      const fileExt = backgroundFile.name.split('.').pop();
      const filePath = `${projectData.slug}/backgrounds/${Date.now()}.${fileExt}`;
      
const { error: uploadError } = await supabase.storage
  .from('backgrounds')
  .upload(filePath, backgroundFile, { upsert: true });

if (uploadError) {
  console.error('Erreur Supabase Storage:', uploadError);
  
  if (uploadError.statusCode === '409') {
    console.log("Conflit de fichier détecté pour l'arrière-plan");
    
    // Afficher directement le popup et interrompre l'opération
    setDuplicateError(true);
    setCurrentOperation('background');
    setBackgroundLoading(false);
    return;
    
  } else {
    throw uploadError;
  }
}
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('backgrounds')
        .getPublicUrl(filePath);
      
      // Insert background in database
      const { error: insertError } = await supabase
        .from('backgrounds')
        .insert({
          name: newBackground.name,
          image_url: urlData.publicUrl,
          storage_path: filePath,
          project_id: projectId,
          is_active: true
        });
      
      if (insertError) throw insertError;
      
      setSuccess('Arrière-plan ajouté avec succès !');
      
      // Réinitialiser le formulaire d'arrière-plan
      setNewBackground({ name: '' });
      setBackgroundFile(null);
      setBackgroundImagePreview(null);
      
      // Charger les arrière-plans du projet
      fetchBackgroundsForProject(projectId);
    } catch (error) {
      console.error('Error adding background:', error);
      setError(error.message);
    } finally {
      setBackgroundLoading(false);
    }
  }
  
  // Fonction pour charger les styles d'un projet
  async function fetchStylesForProject(projectId) {
    try {
      const { data, error } = await supabase
        .from('styles')
        .select('*')
        .eq('project_id', projectId)
        .order('gender, style_key');
        
      if (error) throw error;
      setStyles(data || []);
    } catch (error) {
      console.error('Error fetching styles:', error);
    }
  }
  
  // Fonction pour charger les arrière-plans d'un projet
  async function fetchBackgroundsForProject(projectId) {
    try {
      const { data, error } = await supabase
        .from('backgrounds')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setBackgrounds(data || []);
    } catch (error) {
      console.error('Error fetching backgrounds:', error);
    }
  }

function editProject(project) {
  console.log("Loading project with settings:", {
    watermark_enabled: project.watermark_enabled,
    watermark_text: project.watermark_text,
    watermark_position: project.watermark_position,
    watermark_text_position: project.watermark_text_position || project.watermark_position, // Default to same as logo if not set
  });
  
  setFormData({
    name: project.name,
    slug: project.slug,
    description: project.description || '',
    primaryColor: project.primary_color || '#811A53',
    secondaryColor: project.secondary_color || '#E5E40A',
    homeMessage: project.home_message || "C'est vous le mannequin !",
    photobooth_type: project.photobooth_type || 'standard', // Ajoutez cette ligne
    clientName: project.client_name || '', // Load client name
    eventDate: project.event_date || '', // Load event date
    sharing_method: project.sharing_method || 'qr_code',
    email_from: project.email_from || '',
    email_subject: project.email_subject || 'Votre photo de la séance photobooth',
    email_body: project.email_body || 'Bonjour,\n\nVoici votre photo de la séance photobooth. Vous pouvez la télécharger en cliquant sur le lien ci-dessous.\n\nMerci et à bientôt !',
    email_smtp_host: project.email_smtp_host || '',
    email_smtp_port: project.email_smtp_port || '587',
    email_smtp_secure: project.email_smtp_secure || 'false',
    email_smtp_user: project.email_smtp_user || '',
    email_smtp_password: project.email_smtp_password || '',
    watermark_enabled: project.watermark_enabled || false,
    watermark_text: project.watermark_text || '',
    watermark_logo_url: project.watermark_logo_url || '',
    watermark_position: project.watermark_position || 'bottom-right',
    watermark_text_position: project.watermark_text_position || project.watermark_position || 'bottom-right', // Use logo position as fallback
    watermark_text_color: project.watermark_text_color || '#FFFFFF',
    watermark_text_size: project.watermark_text_size || 24,
    watermark_opacity: project.watermark_opacity || 0.8,
    backgroundImage: project.background_image || '', // Load the background image
  });
    
    if (project.logo_url) {
      setLogoPreview(project.logo_url);
    }
    
    if (project.watermark_logo_url) {
      setWatermarkLogoPreview(project.watermark_logo_url);
    }

    setIsEditing(project.id);
    setTempProjectId(project.id); // Pour associer de nouveaux styles/arrière-plans
    setIsCreating(true);
  }

  async function toggleProjectStatus(project) {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_active: !project.is_active })
        .eq('id', project.id);
        
      if (error) throw error;
      setSuccess(`Projet ${project.is_active ? 'désactivé' : 'activé'} !`);
      fetchProjects();
    } catch (error) {
      console.error('Error toggling project status:', error);
      setError(error.message);
    }
  }

  // Fonction pour supprimer un style
  async function handleDeleteStyle(styleId) {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce style ?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('styles')
        .delete()
        .eq('id', styleId);
        
      if (error) throw error;
      setSuccess('Style supprimé avec succès !');
      const projectId = isEditing || tempProjectId;
      fetchStylesForProject(projectId);
    } catch (error) {
      console.error('Error deleting style:', error);
      setError(error.message);
    }
  }

  // Fonction pour supprimer un arrière-plan
  async function handleDeleteBackground(backgroundId) {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet arrière-plan ?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('backgrounds')
        .delete()
        .eq('id', backgroundId);
        
      if (error) throw error;
      setSuccess('Arrière-plan supprimé avec succès !');
      const projectId = isEditing || tempProjectId;
      fetchBackgroundsForProject(projectId);
    } catch (error) {
      console.error('Error deleting background:', error);
      setError(error.message);
    }
  }

  // Fonction pour gérer le changement d'onglet
  const handleTabChange = (tab) => {
    console.log("Changing to tab:", tab);
    // Si on essaie d'aller sur un onglet de style/arrière-plan sans avoir créé le projet
    if ((tab === 'styles' || tab === 'backgrounds' || tab === 'watermark') && !isEditing && !tempProjectId) {
      setError("Veuillez d'abord créer le projet avant d'ajouter des styles, arrière-plans ou filigranes");
      return;
    }
    setActiveTab(tab);
  };

  // Fonction pour générer l'URL complète du photobooth
  const getPhotoboothUrl = (slug) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : '');
    return `${baseUrl}/photobooth/${slug}`;
  };

  // Add this function to dynamically get gender options based on photobooth type
const getGenderOptions = (photoboothType) => {
  const baseOptions = [
    { value: 'm', label: 'Homme' },
    { value: 'f', label: 'Femme' },
    { value: 'ag', label: 'Ado Garçon' },
    { value: 'af', label: 'Ado Fille' }
  ];
  
  // Add Groupe option for photobooth2, premium, and avatar types
  if (photoboothType === 'photobooth2' || photoboothType === 'premium' || photoboothType === 'avatar') {
    baseOptions.push({ value: 'g', label: 'Groupe' });
  }
  
  return baseOptions;
};

  // Function to scroll the background image slider
  const scrollSlider = (direction) => {
    if (backgroundSliderRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      backgroundSliderRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    // Function to fetch backgrounds from API
    const fetchBackgrounds = async () => {
      try {
        setBackgroundsLoading(true);
        const response = await fetch('/api/backgrounds');
        
        if (response.ok) {
          const data = await response.json();
          if (data.backgrounds && Array.isArray(data.backgrounds)) {
            console.log(`Loaded ${data.backgrounds.length} backgrounds from directory`);
            setAvailableBackgrounds(data.backgrounds);
          } else {
            console.error('Invalid backgrounds data format:', data);
            // Set some default backgrounds as fallback
            setAvailableBackgrounds([
              { id: 'bg1', name: 'Fond Bleu', path: '/fond/background-blue.jpg' },
              { id: 'bg2', name: 'Fond Rouge', path: '/fond/background-red.jpg' },
            ]);
          }
        } else {
          console.error('Failed to load backgrounds:', response.statusText);
          // Set fallback backgrounds
          setAvailableBackgrounds([
            { id: 'bg1', name: 'Fond Bleu', path: '/fond/background-blue.jpg' },
            { id: 'bg2', name: 'Fond Rouge', path: '/fond/background-red.jpg' },
          ]);
        }
      } catch (error) {
        console.error('Error loading backgrounds:', error);
        setAvailableBackgrounds([]);
      } finally {
        setBackgroundsLoading(false);
      }
    };
    
    // Call the fetch function
    fetchBackgrounds();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
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

      {/* Modal QR Code */}
      {selectedQRProject && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="qr-code-modal" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"
                onClick={() => setSelectedQRProject(null)}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="qr-code-modal-title">
                      QR Code pour {selectedQRProject.name}
                    </h3>
                    <div className="flex justify-center">
                      <div className="p-4 bg-white rounded-xl border">
                        <Canvas
                          text={getPhotoboothUrl(selectedQRProject.slug)}
                          options={{
                            type: 'image/jpeg',
                            quality: 0.3,
                            level: 'H',
                            margin: 3,
                            scale: 4,
                            width: 200,
                            color: {
                              dark: '#000000',
                              light: '#ffffff',
                            },
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 break-all text-center">
                        {getPhotoboothUrl(selectedQRProject.slug)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(getPhotoboothUrl(selectedQRProject.slug));
                    setSuccess("URL copiée dans le presse-papiers");
                    setTimeout(() => setSuccess(null), 2000);
                  }}
                >
                  Copier le lien
                </button>
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setSelectedQRProject(null)}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isCreating ? (
        // Formulaire d'ajout/modification
        <div className="bg-white shadow rounded-lg">
          {/* Onglets de navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                type="button"
                onClick={() => handleTabChange('info')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm transition-colors duration-200 ease-in-out ${
                  activeTab === 'info' 
                    ? 'border-blue-500 font-bold text-blue-600' 
                    : 'border-transparent text-blue-500 hover:text-blue-700 hover:border-gray-300'
                }`}
              >
                <span className="font-bold">Étape 1 : <span className="text-blue-600">Informations générales</span></span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('backgrounds')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm transition-colors duration-200 ease-in-out ${
                  activeTab === 'backgrounds' 
                    ? 'border-blue-500 font-bold text-blue-600' 
                    : (isEditing || tempProjectId)
                      ? 'border-transparent text-blue-500 hover:text-blue-700 hover:border-gray-300'
                      : 'border-transparent text-gray-400 cursor-not-allowed'
                }`}
              >
                <span className="font-bold">Étape 2 : <span className="text-blue-600">Personnalisation du Photobooth</span></span> {backgrounds.length > 0 && `(${backgrounds.length})`}
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('styles')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm transition-colors duration-200 ease-in-out ${
                  activeTab === 'styles' 
                    ? 'border-blue-500 font-bold text-blue-600' 
                    : (isEditing || tempProjectId)
                      ? 'border-transparent text-blue-500 hover:text-blue-700 hover:border-gray-300'
                      : 'border-transparent text-gray-400 cursor-not-allowed'
                }`}
              >
                <span className="font-bold">Étape 3 : <span className="text-blue-600">Styles</span></span> {styles.length > 0 && `(${styles.length})`}
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('watermark')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm transition-colors duration-200 ease-in-out ${
                  activeTab === 'watermark' 
                    ? 'border-blue-500 font-bold text-blue-600' 
                    : 'border-transparent text-blue-500 hover:text-blue-700 hover:border-gray-300'
                }`}
              >
                <span className="font-bold">Étape 4 : <span className="text-blue-600">Filigrane</span></span>
              </button>
            </nav>
          </div>
          
          {/* Messages d'information avant le contenu */}
          {(activeTab === 'styles' || activeTab === 'backgrounds' || activeTab === 'watermark') && !isEditing && !tempProjectId && (
            <div className="p-4 m-6 text-sm text-yellow-700 bg-yellow-100 rounded-lg">
              Veuillez d&apos;abord créer le projet avant d&apos;ajouter des styles, arrière-plans ou filigranes. Remplissez les informations générales et cliquez sur Créer.
            </div>
          )}
          
          {/* Contenu selon l'onglet actif */}
          <div className="p-6">
            {/* Onglet Informations */}
            {activeTab === 'info' && (
              <form onSubmit={handleCreateOrUpdate} className="space-y-8">
                {/* STEP 1: Basic Setup - Blue Theme */}
                <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-medium text-blue-800 mb-4 flex items-center">
                    <span className="bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center mr-2 shadow-sm">1</span>
                    Paramétrage
                  </h3>
                  
                  {/* Project name and slug fields */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-blue-700">
                        Nom du projet *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="slug" className="block text-sm font-medium text-blue-700">
                        Slug URL *
                      </label>
                      <input
                        type="text"
                        id="slug"
                        name="slug"
                        value={formData.slug}
                        onChange={handleChange}
                        className={`mt-1 block w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black ${isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        required
                        disabled={isEditing} // Le slug ne peut pas être modifié une fois créé
                      />
                      <p className="mt-1 text-xs text-blue-600">
                        Identifiant unique utilisé dans l&apos;URL: /photobooth/{formData.slug}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <label htmlFor="description" className="block text-sm font-medium text-blue-700">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      className="mt-1 block w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
                    />
                  </div>

                  {/* Photobooth Type */}
                  <div className="mb-4">
                    <label htmlFor="photobooth_type" className="block text-sm font-medium text-blue-700">
                      Type de Photobooth
                    </label>
                    <select
                      id="photobooth_type"
                      name="photobooth_type"
                      value={formData.photobooth_type}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
                    >
                      <option value="standard">Standard (fal.ai)</option>
                      <option value="premium">Premium (Replicate)</option>
                      <option value="photobooth2">Photobooth2 (MiniMax)</option>
                      <option value="avatar">Avatar (easel-avatar)</option>
                    </select>
                    <p className="mt-1 text-xs text-blue-600">
                      Standard utilise fal.ai pour les transformations. Premium utilise Replicate avec le modèle become-image. Photobooth2 utilise fal.ai avec MiniMax. Avatar crée des personnages complets avec easel-avatar.
                    </p>
                  </div>

                  {/* Client Name and Event Date fields */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="clientName" className="block text-sm font-medium text-blue-700">
                        Nom du client
                      </label>
                      <input
                        type="text"
                        id="clientName"
                        name="clientName"
                        value={formData.clientName}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
                      />
                    </div>
                    <div>
                      <label htmlFor="eventDate" className="block text-sm font-medium text-blue-700">
                        Date de l&apos;événement
                      </label>
                      <input
                        type="date"
                        id="eventDate"
                        name="eventDate"
                        value={formData.eventDate}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
                      />
                    </div>
                  </div>
                </div>

                {/* STEP 2: Now renamed to Sharing Method - Green Theme (was step 3) */}
                <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-medium text-green-800 mb-4 flex items-center">
                    <span className="bg-green-500 text-white rounded-full w-7 h-7 flex items-center justify-center mr-2 shadow-sm">2</span>
                    Méthode de partage
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="sharing_qr"
                          name="sharing_method"
                          type="radio"
                          checked={formData.sharing_method === 'qr_code'}
                          onChange={() => setFormData({...formData, sharing_method: 'qr_code'})}
                          className="focus:ring-green-500 h-4 w-4 text-green-600 border-green-300"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="sharing_qr" className="font-medium text-green-700">QR Code</label>
                        <p className="text-green-600">Les utilisateurs pourront accéder aux photos via un QR Code.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="sharing_email"
                          name="sharing_method"
                          type="radio"
                          checked={formData.sharing_method === 'email'}
                          onChange={() => setFormData({...formData, sharing_method: 'email'})}
                          className="focus:ring-green-500 h-4 w-4 text-green-600 border-green-300"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="sharing_email" className="font-medium text-green-700">Email</label>
                        <p className="text-green-600">Les utilisateurs pourront recevoir leur photo par email.</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Email settings section - only visible when email is selected */}
                  {formData.sharing_method === 'email' && (
                    <div className="mt-4 space-y-4 pl-4 border-l-2 border-green-300">
                      <div>
                        <label htmlFor="email_from" className="block text-sm font-medium text-green-700">Email expéditeur</label>
                        <input
                          type="email"
                          id="email_from"
                          name="email_from"
                          value={formData.email_from}
                          onChange={handleChange}
                          className="mt-1 block w-full px-3 py-2 border border-green-200 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-black"
                          placeholder="photobooth@votredomaine.com"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="email_subject" className="block text-sm font-medium text-green-700">Sujet de l&apos;email</label>
                        <input
                          type="text"
                          id="email_subject"
                          name="email_subject"
                          value={formData.email_subject}
                          onChange={handleChange}
                          className="mt-1 block w-full px-3 py-2 border border-green-200 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-black"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="email_body" className="block text-sm font-medium text-green-700">Contenu de l&apos;email</label>
                        <textarea
                          id="email_body"
                          name="email_body"
                          value={formData.email_body}
                          onChange={handleChange}
                          rows={4}
                          className="mt-1 block w-full px-3 py-2 border border-green-200 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-black"
                        />
                        <p className="mt-1 text-xs text-green-600">
                          Le lien vers la photo sera automatiquement ajouté à la fin du message.
                        </p>
                      </div>
                      
                      {/* Add SMTP Configuration Section */}
                      <div className="border-t border-green-200 pt-4 mt-4">
                        <h5 className="font-medium text-green-700 mb-3">Configuration SMTP</h5>
                        
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="email_smtp_host" className="block text-sm font-medium text-green-700">Serveur SMTP</label>
                            <input
                              type="text"
                              id="email_smtp_host"
                              name="email_smtp_host"
                              value={formData.email_smtp_host}
                              onChange={handleChange}
                              className="mt-1 block w-full px-3 py-2 border border-green-200 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-black"
                              placeholder="smtp.votredomaine.com"
                            />
                            <p className="mt-1 text-xs text-green-600">ex: smtp.gmail.com</p>
                          </div>
                          
                          <div>
                            <label htmlFor="email_smtp_port" className="block text-sm font-medium text-green-700">Port SMTP</label>
                            <input
                              type="text"
                              id="email_smtp_port"
                              name="email_smtp_port"
                              value={formData.email_smtp_port}
                              onChange={handleChange}
                              className="mt-1 block w-full px-3 py-2 border border-green-200 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-black"
                              placeholder="587"
                            />
                            <p className="mt-1 text-xs text-green-600">généralement 587 (TLS) ou 465 (SSL)</p>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <div className="flex items-center">
                            <input
                              id="email_smtp_secure"
                              name="email_smtp_secure"
                              type="checkbox"
                              className="h-4 w-4 text-green-600 focus:ring-green-500 border-green-300 rounded"
                              checked={formData.email_smtp_secure === 'true'}
                              onChange={(e) => setFormData({...formData, email_smtp_secure: e.target.checked ? 'true' : 'false'})}
                            />
                            <label htmlFor="email_smtp_secure" className="ml-2 block text-sm text-green-700">
                              Connexion sécurisée (SSL/TLS)
                            </label>
                          </div>
                          <p className="mt-1 text-xs text-green-600">Activer pour le port 465 (SSL), désactiver pour le port 587 (STARTTLS)</p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                          <div>
                            <label htmlFor="email_smtp_user" className="block text-sm font-medium text-green-700">Nom d&apos;utilisateur SMTP</label>
                            <input
                              type="text"
                              id="email_smtp_user"
                              name="email_smtp_user"
                              value={formData.email_smtp_user}
                              onChange={handleChange}
                              className="mt-1 block w-full px-3 py-2 border border-green-200 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-black"
                              placeholder="utilisateur@votredomaine.com"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="email_smtp_password" className="block text-sm font-medium text-green-700">Mot de passe SMTP</label>
                            <input
                              type="password"
                              id="email_smtp_password"
                              name="email_smtp_password"
                              value={formData.email_smtp_password}
                              onChange={handleChange}
                              className="mt-1 block w-full px-3 py-2 border border-green-200 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-black"
                              placeholder="••••••••"
                            />
                            <p className="mt-1 text-xs text-green-600">
                              Pour Gmail, utilisez un mot de passe d&apos;application
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit buttons */}
                <div className="flex justify-end space-x-3 pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(null);
                      setTempProjectId(null);
                      setActiveTab('info');
                      setFormData({
                        name: '',
                        slug: '',
                        description: '',
                        primaryColor: '#811A53',
                        secondaryColor: '#E5E40A',
                        homeMessage: "C'est vous le mannequin !"
                      });
                      setLogoFile(null);
                      setLogoPreview(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-br from-blue-500 via-purple-500 to-green-500 hover:from-blue-600 hover:via-purple-600 hover:to-green-600 shadow"
                  >
                    {isEditing ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </form>
            )}

            {/* Onglet Styles */}
            {activeTab === 'styles' && (isEditing || tempProjectId) && (
              <div>
                <h3 className="text-lg font-medium text-purple-800 mb-4">Styles du projet</h3>
                
                <form onSubmit={handleAddStyle} className="mb-8 border-b pb-8 space-y-4 bg-purple-50 p-6 rounded-lg border-l-4 border-purple-400 shadow-md">
                  <h4 className="font-medium text-purple-700">Ajouter un nouveau style</h4>
                  
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
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
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
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                        required
                      >
                        <option value="">Sélectionner...</option>
                        {getGenderOptions(formData.photobooth_type).map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
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
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                        placeholder="s1"
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
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="styleDescription" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="styleDescription"
                      value={newStyle.description}
                      onChange={(e) => setNewStyle({...newStyle, description: e.target.value})}
                      rows={2}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Image de prévisualisation *</label>
                    <div className="mt-1 flex items-center space-x-6">
                      {styleImagePreview && (
                        <div className="w-32 h-32 relative border border-gray-200">
                          <Image
                            src={styleImagePreview}
                            alt="Style preview"
                            fill
                            style={{ objectFit: "contain" }}
                          />
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          id="styleImage"
                          accept="image/*"
                          onChange={handleStyleImageChange}
                          className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          PNG, JPG ou GIF recommandé.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={styleLoading || (!isEditing && !tempProjectId)}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {styleLoading ? 'Ajout en cours...' : 'Ajouter un style'}
                    </button>
                  </div>
                </form>

                <div className="mb-8 border-b pb-8 bg-blue-50 p-6 rounded-lg border-l-4 border-blue-400 shadow-md">
                  <h4 className="text-md font-medium text-blue-800 mb-4">Templates de styles prédéfinis</h4>
                  <StyleTemplates 
                    projectId={isEditing || tempProjectId}
                    photoboothType={formData.photobooth_type}
                    onStylesAdded={(styles) => {
                      setSuccess(`${styles.length} style(s) ajouté(s) avec succès !`);
                      fetchStylesForProject(isEditing || tempProjectId);
                    }}
                    onError={(errorMsg) => setError(errorMsg)}
                  />
                </div>

                <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-400 shadow-md">
                  <h4 className="text-md font-medium text-green-800 mb-4">Styles existants</h4>
                  {styles.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">
                      Aucun style n&apos;a été ajouté à ce projet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {styles.map(style => (
                        <div key={style.id} className="border rounded-md overflow-hidden">
                          <div className="h-40 bg-gray-100 relative">
                            {style.preview_image && (
                              <Image
                                src={style.preview_image}
                                alt={style.name}
                                fill
                                style={{ objectFit: "contain" }}
                                onError={(e) => {
                                  // En cas d'erreur de chargement, remplacer par une image par défaut
                                  e.target.onerror = null;
                                  e.target.src = "/placeholder-style.png";
                                }}
                              />
                            )}
                          </div>
                          <div className="p-4">
                            <h5 className="font-medium text-black">{style.name}</h5>
                            <div className="text-sm text-gray-500 mt-1">
                              {style.gender === 'm' ? 'Homme' : 
                              style.gender === 'f' ? 'Femme' : 
                              style.gender === 'ag' ? 'Ado Garçon' : 
                              style.gender === 'af' ? 'Ado Fille' : 
                              style.gender === 'g' ? 'Groupe' : style.gender} - {style.style_key}
                            </div>
                            <div className="mt-3 flex justify-end">
                              <button
                                onClick={() => handleDeleteStyle(style.id)}
                                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-md"
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
              </div>
            )}
            
            {/* Onglet Arrière-plans renamed to Personnalisation du Photobooth */}
            {activeTab === 'backgrounds' && (isEditing || tempProjectId) && (
              <div>
                <h3 className="text-lg font-medium text-blue-800 mb-4">Personnalisation du Photobooth</h3>
                
                {/* Add the Customization section here as the first item */}
                <div className="bg-purple-50 border-l-4 border-purple-400 p-6 rounded-lg shadow-md mb-8">
                  <h3 className="text-lg font-medium text-purple-800 mb-4 flex items-center">
                    <span className="bg-purple-500 text-white rounded-full w-7 h-7 flex items-center justify-center mr-2 shadow-sm">1</span>
                    Personnalisation
                  </h3>
                  
                  {/* Colors section */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
                    <div>
                      <label htmlFor="primaryColor" className="block text-sm font-medium text-purple-700">
                        Couleur principale
                      </label>
                      <div className="mt-1 flex rounded-md">
                        <input
                          type="color"
                          id="primaryColor"
                          name="primaryColor"
                          value={formData.primaryColor}
                          onChange={handleChange}
                          className="h-10 w-10"
                        />
                        <input
                          type="text"
                          name="primaryColor"
                          value={formData.primaryColor}
                          onChange={handleChange}
                          className="ml-2 flex-1 rounded-md border border-purple-200 px-3 py-2 text-sm text-black focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="secondaryColor" className="block text-sm font-medium text-purple-700">
                        Couleur secondaire
                      </label>
                      <div className="mt-1 flex rounded-md">
                        <input
                          type="color"
                          id="secondaryColor"
                          name="secondaryColor"
                          value={formData.secondaryColor}
                          onChange={handleChange}
                          className="h-10 w-10"
                        />
                        <input
                          type="text"
                          name="secondaryColor"
                          value={formData.secondaryColor}
                          onChange={handleChange}
                          className="ml-2 flex-1 rounded-md border border-purple-200 px-3 py-2 text-sm text-black focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Welcome message */}
                  <div className="mb-4">
                    <label htmlFor="homeMessage" className="block text-sm font-medium text-purple-700">
                      Message d&apos;accueil
                    </label>
                    <input
                      type="text"
                      id="homeMessage"
                      name="homeMessage"
                      value={formData.homeMessage}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-purple-200 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-black"
                    />
                  </div>

                  {/* Project logo */}
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-1">
                      Logo du projet 
                    </label>
                    <div className="mt-1 flex items-center space-x-6">
                      {logoPreview && (
                        <div className="w-32 h-32 relative border border-purple-200 rounded-md overflow-hidden">
                          <Image
                            src={logoPreview}
                            alt="Logo preview"
                            fill
                            style={{ objectFit: "contain" }}
                          />
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          id="logo"
                          name="logo"
                          accept="image/*"
                          onChange={handleLogoChange}
                                                   className="text-sm text-purple-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700"
                        />
                        <p className="mt-1 text-sm text-purple-600">
                          PNG, JPG ou GIF recommandé.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Save Button for this section */}
                  <div className="flex justify-end pt-4 mt-4">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const { error } = await supabase
                            .from('projects')
                            .update({ 
                              primary_color: formData.primaryColor,
                              secondary_color: formData.secondaryColor,
                              home_message: formData.homeMessage
                            })
                            .eq('id', isEditing || tempProjectId);
                            
                          if (error) throw error;
                          setSuccess('Paramètres de personnalisation mis à jour avec succès !');
                        } catch (error) {
                          console.error('Error updating customization settings:', error);
                          setError(error.message);
                        }
                      }}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800"
                    >
                      Sauvegarder la personnalisation
                    </button>
                  </div>
                </div>
                
                {/* Background Image Slider - Now the second section */}
                <div className="mb-8 border-b pb-8 space-y-4 bg-blue-50 p-6 rounded-lg border-l-4 border-blue-400 shadow-md">
                  <h4 className="font-medium text-blue-700">Fond d&apos;écran principal</h4>
                  <p className="text-sm text-blue-600 mb-4">
                    Sélectionnez un fond d&apos;écran prédéfini pour votre photobooth. Ce fond sera affiché derrière l&apos;interface utilisateur.
                  </p>
                  
                  <div className="relative">
                    <button 
                      onClick={() => scrollSlider('left')} 
                      className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white p-2 rounded-full shadow-md hover:bg-gray-100"
                      aria-label="Défiler vers la gauche"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div 
                      ref={backgroundSliderRef} 
                      className="flex overflow-x-auto scrollbar-hide space-x-4 py-2 px-8 pb-4"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {/* Option for no background */}
                      <div 
                        className={`flex-shrink-0 cursor-pointer transition-all ${formData.backgroundImage === '' ? 'ring-4 ring-blue-500' : ''}`} 
                        onClick={() => setFormData({...formData, backgroundImage: ''})}
                      >
                        <div className="w-36 h-24 bg-gray-100 rounded flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <p className="text-xs mt-1 text-center text-blue-700">Aucun fond</p>
                      </div>
                      
                      {/* Loading indicator */}
                      {backgroundsLoading && (
                        <div className="flex-shrink-0 w-36 h-24 bg-gray-100 rounded flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                      )}
                      
                      {/* Available backgrounds */}
                      {!backgroundsLoading && availableBackgrounds.map((bg) => (
                        <div 
                          key={bg.id}
                          className={`flex-shrink-0 cursor-pointer transition-all ${formData.backgroundImage === bg.path ? 'ring-4 ring-blue-500' : ''}`} 
                          onClick={() => setFormData({...formData, backgroundImage: bg.path})}
                        >
                          <div className="w-36 h-24 rounded overflow-hidden relative">
                            <Image 
                              src={bg.path}
                              alt={bg.name}
                              fill
                              sizes="144px"
                              className="object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder-background.png";
                              }}
                            />
                          </div>
                          <p className="text-xs mt-1 text-center text-blue-700">{bg.name}</p>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => scrollSlider('right')} 
                      className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white p-2 rounded-full shadow-md hover:bg-gray-100"
                      aria-label="Défiler vers la droite"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  {formData.backgroundImage && (
                    <p className="mt-2 text-xs text-blue-600">
                      Fond sélectionné: {formData.backgroundImage.split('/').pop()}
                    </p>
                  )}
                  
                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={async () => {
                        // Update just the background image
                        try {
                          const { error } = await supabase
                            .from('projects')
                            .update({ background_image: formData.backgroundImage })
                            .eq('id', isEditing || tempProjectId);
                            
                          if (error) throw error;
                          setSuccess('Fond d\'écran principal mis à jour avec succès !');
                        } catch (error) {
                          console.error('Error updating background image:', error);
                          setError(error.message);
                        }
                      }}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sauvegarder le fond d&apos;écran
                    </button>
                  </div>
                </div>

                <form onSubmit={handleAddBackground} className="mb-8 border-b pb-8 space-y-4 bg-blue-50 p-6 rounded-lg border-l-4 border-blue-400 shadow-md">
                  <h4 className="font-medium text-blue-700">Ou Ajouter un nouvel arrière-plan</h4>
                  
                  <div>
                    <label htmlFor="backgroundName" className="block text-sm font-medium text-gray-700">
                      Nom de l&apos;arrière-plan *
                    </label>
                    <input
                      type="text"
                      id="backgroundName"
                      value={newBackground.name}
                      onChange={(e) => setNewBackground({...newBackground, name: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Image d&apos;arrière-plan *</label>
                    <div className="mt-1 flex items-center space-x-6">
                      {backgroundImagePreview && (
                        <div className="w-32 h-32 relative border border-gray-200">
                          <Image
                            src={backgroundImagePreview}
                            alt="Background preview"
                            fill
                            style={{ objectFit: "contain" }}
                          />
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          id="backgroundImage"
                          accept="image/*"
                          onChange={handleBackgroundImageChange}
                          className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          PNG, JPG ou GIF recommandé. Préférez des images de dimensions 1920x1080 ou supérieures.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={backgroundLoading || (!isEditing && !tempProjectId)}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {backgroundLoading ? 'Ajout en cours...' : 'Ajouter un arrière-plan'}
                    </button>
                  </div>
                </form>
                
                <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-400 shadow-md">
                  <h4 className="text-md font-medium text-green-800 mb-4">Arrière-plans existants</h4>
                  {backgrounds.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">
                      Aucun arrière-plan n&apos;a été ajouté à ce projet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {backgrounds.map(background => (
                        <div key={background.id} className="border rounded-md overflow-hidden">
                          <div className="h-40 bg-gray-100 relative">
                            {background.image_url && (
                              <Image
                                src={background.image_url}
                                alt={background.name}
                                fill
                                style={{ objectFit: "cover" }}
                              />
                            )}
                          </div>
                          <div className="p-4">
                            <h5 className="font-medium text-black">{background.name}</h5>
                            <div className="mt-3 flex justify-end">
                              <button
                                onClick={() => handleDeleteBackground(background.id)}
                                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-md"
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
              </div>
            )}
            
            {/* Onglet Filigrane - Simplifié */}
            {activeTab === 'watermark' && (
              <div className="space-y-6">
                {/* En-tête avec gradient */}
                <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-6 rounded-lg shadow-md text-white">
                  <h3 className="text-xl font-bold mb-2">Configuration du filigrane</h3>
                  <p className="text-white opacity-90">
                    Activez le filigrane et utilisez l&apos;éditeur avancé pour personnaliser l&apos;apparence de vos photos.
                  </p>
                </div>

                {/* Section d'activation avec toggle switch */}
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Activation du filigrane</h3>
                      <p className="text-sm text-gray-600 mt-1">Activez cette option pour ajouter un filigrane personnalisé à vos photos</p>
                    </div>
                    <div className="ml-4 flex items-center">
                      <div className="relative inline-block w-12 mr-2 align-middle select-none">
                        <input
                          id="watermark_enabled"
                          name="watermark_enabled"
                          type="checkbox"
                          checked={formData.watermark_enabled}
                          onChange={(e) => setFormData({...formData, watermark_enabled: e.target.checked})}
                          className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer focus:outline-none"
                          style={{
                            top: '0',
                            right: formData.watermark_enabled ? '0' : 'auto',
                            left: formData.watermark_enabled ? 'auto' : '0',
                            borderColor: formData.watermark_enabled ? '#3B82F6' : '#D1D5DB',
                            transition: 'all 0.3s ease'
                          }}
                        />
                        <label
                          htmlFor="watermark_enabled"
                          className={`block overflow-hidden h-6 rounded-full cursor-pointer ${
                            formData.watermark_enabled ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                          style={{ transition: 'background-color 0.3s ease' }}
                        ></label>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {formData.watermark_enabled ? 'Activé' : 'Désactivé'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message d'avertissement pour projet non créé */}
                {!(isEditing || tempProjectId) && (
                  <div className="bg-gray-100 p-6 rounded-lg shadow-sm border border-gray-200 text-center">
                    <p className="text-gray-600 mb-4">
                      Veuillez d&apos;abord créer le projet ou sélectionner un projet existant.
                    </p>
                    <button 
                      type="button"
                      disabled={true}
                      className="px-6 py-3 bg-gray-300 text-gray-600 rounded-lg font-medium shadow cursor-not-allowed"
                    >
                      Configuration non disponible
                    </button>
                  </div>
                )}
                
                {/* Section de l'éditeur avancé - Mise en avant */}
                {(isEditing || tempProjectId) && (
                  <div className="bg-white p-8 rounded-lg shadow-md border-l-4 border-green-500 text-center">
                    <div className="flex flex-col items-center">
                      <div className="bg-green-100 rounded-full p-4 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <h4 className="text-xl font-medium text-gray-800 mb-4">Éditeur de filigrane avancé</h4>
                      <p className="text-base text-gray-600 mb-6 max-w-lg">
                        L&apos;éditeur avancé vous permet de créer des filigranes sophistiqués avec du texte et des logos positionnés librement sur vos photos.
                      </p>
                      
                      <Link 
                        href={`/photobooth-ia/admin/watermark-editor?projectId=${isEditing || tempProjectId}`}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 transition-all duration-150"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Ouvrir l&apos;éditeur avancé
                      </Link>
                    </div>
                  </div>
                )}

                {/* Save button */}
                {(isEditing || tempProjectId) && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const { error } = await supabase
                            .from('projects')
                            .update({
                              watermark_enabled: formData.watermark_enabled
                            })
                            .eq('id', isEditing || tempProjectId);
                            
                          if (error) throw error;
                          setSuccess('État du filigrane mis à jour avec succès !');
                        } catch (error) {
                          setError(error.message);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors shadow"
                    >
                      Sauvegarder
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Bouton pour ajouter un projet et liste des projets
        <div>
          <div className="flex justify-between">
            <h3 className="text-lg font-medium text-gray-900">Projets Photobooth</h3>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg shadow"
            >
              Ajouter un projet
            </button>
          </div>
          
          <div className="bg-white shadow overflow-hidden rounded-md mt-4">
            {projects.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Aucun projet trouvé. Commencez par en créer un !
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {projects.map((project) => (
                  <li key={project.id} className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center space-x-4">
                        {project.logo_url ? (
                          <div className="w-16 h-16 relative">
                            <Image
                              src={project.logo_url}
                              alt={project.name}
                              fill
                              style={{ objectFit: "contain" }}
                              className="rounded-md"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded-md">
                            <span className="text-gray-400 text-xl">Logo</span>
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium text-lg text-gray-900">{project.name}</h4>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <span>/{project.slug}</span>
                            <span className="mx-2">•</span>
                            <span className={`${project.is_active ? 'text-green-600' : 'text-red-600'}`}>
                              {project.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <span>Type: {
                              project.photobooth_type === 'premium' 
                                ? 'Premium (Replicate)' 
                                : project.photobooth_type === 'photobooth2' 
                                  ? 'Photobooth2 (MiniMax)' 
                                  : project.photobooth_type === 'avatar'
                                    ? 'Avatar (easel-avatar)'
                                    : 'Standard (fal.ai)'
                            }</span>
                          </div>

                          <div className="mt-1">
                            <a 
                              href={getPhotoboothUrl(project.slug)} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 hover:underline text-sm"
                            >
                              {getPhotoboothUrl(project.slug)}
                            </a>
                          </div>
                          
                          {project.description && (
                            <p className="mt-1 text-sm text-gray-500">{project.description}</p>
                          )}

                          {project.client_name && (
                            <div className="mt-1 text-sm text-gray-700">
                              Client: <span className="font-medium">{project.client_name}</span>
                            </div>
                          )}
                          
                          {project.event_date && (
                            <div className="mt-1 text-sm text-gray-700">
                              Date: <span className="font-medium">{new Date(project.event_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap mt-4 sm:mt-0 gap-2">
                        <button
                          onClick={() => setSelectedQRProject(project)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium text-white bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4h-1m1-4v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                          QR Code
                        </button>
                        <Link 
                          href={`/photobooth/${project.slug}`} 
                          target="_blank"
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium text-white bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow"
                        >
                          Accès au photobooth
                        </Link>
                        <Link 
                          href={`/photobooth-ia/admin/project-gallery?id=${project.id}`}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium text-white bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow"
                        >
                          Voir la Galerie d&apos;images
                        </Link>
                        <button
                          onClick={() => editProject(project)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium text-white bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => toggleProjectStatus(project)}
                          className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium text-white rounded-lg shadow ${
                            project.is_active
                              ? 'bg-gradient-to-br from-red-500 to-pink-600'
                              : 'bg-gradient-to-br from-green-500 to-teal-600'
                          }`}
                        >
                          {project.is_active ? 'Désactiver' : 'Activer'}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}

                {/* Pagination controls - Blue Theme */}
                <div className="flex items-center justify-between p-4 bg-blue-50 border-t border-gray-200 rounded-b-lg">
                  <div className="flex-1 flex gap-2">
                    <button
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                      onClick={() => {
                        // Handle previous page logic
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Précédent
                    </button>
                    <button
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                      onClick={() => {
                        // Handle next page logic
                      }}
                    >
                      Suivant
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  <div className="text-sm text-gray-500">
                    Page 1 sur 10
                  </div>
                </div>
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}