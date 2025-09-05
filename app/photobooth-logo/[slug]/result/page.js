'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useQRCode } from 'next-qrcode';
import { notFound } from 'next/navigation';
import { motion } from 'framer-motion';

// Logging helper
const logWithTimestamp = (message, data) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data || '');
};

// S3 client for image uploads - Initialize when needed, not at module level
// This prevents issues with environment variables not being available during SSR
const getS3Client = () => {
  return new S3Client({
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-3',
    credentials: {
      accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
    },
  });
};

// Utility to convert dataURL or HTTP URL to File
const dataURLtoFile = async (dataurl, filename) => {
  // If already a data URL, convert directly
  if (dataurl && dataurl.startsWith('data:')) {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Invalid data URL");
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  }
  // If it's an HTTP(S) URL, fetch and convert to dataURL first
  if (dataurl && (dataurl.startsWith('http://') || dataurl.startsWith('https://'))) {
    const response = await fetch(dataurl);
    const blob = await response.blob();
    const mime = blob.type || 'image/jpeg';
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onloadend = () => {
        try {
          const base64data = reader.result;
          // Recursively call to handle as dataURL
          dataURLtoFile(base64data, filename).then(resolve).catch(reject);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  throw new Error("Unsupported image format for upload");
};

// Nouvelle fonction pour envoyer l'email via l'API Next.js
async function sendPhotoByEmail({ to, project, imageUrl }) {
  if (!to) return;
  const response = await fetch('/api/send-photo-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, project, imageUrl }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de l\'envoi de l\'email');
  }
  // Log de succès
  console.log(`[API] Email envoyé avec succès à ${to} pour le projet ${project?.name || project?.id}`);
}

export default function Result({ params }) {
  const slug = params.slug;
  const supabase = createClientComponentClient();
  const { Canvas } = useQRCode();
  
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [settings, setSettings] = useState(null);
  const [imageResultAI, setImageResultAI] = useState(null);
  const [generateQR, setGenerateQR] = useState(false);
  const [linkQR, setLinkQR] = useState(null);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [error, setError] = useState(null);
  
  // États pour la capture de données
  const [showDataCapture, setShowDataCapture] = useState(false);
  const [dataCapture, setDataCapture] = useState({
    name: '',
    email: '',
    phone: '',
    rgpdAccepted: false
  });
  const [savingDataCapture, setSavingDataCapture] = useState(false);
  
  const fetchProjectData = useCallback(async () => {
    try {
      // Fetch project data by slug
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (projectError || !projectData) {
        console.error('Project not found or inactive:', projectError);
        return notFound();
      }
      
      setProject(projectData);
      
      // Fetch project settings
      const { data: settingsData } = await supabase
        .from('project_settings')
        .select('*')
        .eq('project_id', projectData.id)
        .single();
      
      const projectSettings = settingsData || { enable_qr_codes: true };
      setSettings(projectSettings);
      
      // Store project info in localStorage
      localStorage.setItem('currentProjectId', projectData.id);
      localStorage.setItem('currentProjectSlug', slug);
      localStorage.setItem('projectData', JSON.stringify(projectData));
      localStorage.setItem('projectSettings', JSON.stringify(projectSettings));
      
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  }, [slug, supabase]);
  
  useEffect(() => {
    // Load project data and settings from localStorage
    const cachedProject = localStorage.getItem('projectData');
    const cachedSettings = localStorage.getItem('projectSettings');
    const resultImage = localStorage.getItem('faceURLResult');
    
    if (cachedProject) {
      try {
        setProject(JSON.parse(cachedProject));
        setLoading(false);
      } catch (e) {
        console.error("Error parsing cached project data:", e);
      }
    }
    
    if (cachedSettings) {
      try {
        setSettings(JSON.parse(cachedSettings));
      } catch (e) {
        console.error("Error parsing cached settings:", e);
      }
    }
    
    if (resultImage) {
      setImageResultAI(resultImage);
    }
    
    // Check URL params for direct sharing links
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const imageUrl = urlParams.get('imageUrl');
      if (imageUrl) {
        setLinkQR(imageUrl);
        setGenerateQR(true);
      }
    }
    
    // Always fetch fresh data
    fetchProjectData();
    
    // Log any available metadata
    const falMetadata = localStorage.getItem('falGenerationMetadata');
    if (falMetadata) {
      try {
        logWithTimestamp('fal.ai generation metadata:', JSON.parse(falMetadata));
      } catch (e) {
        console.error("Error parsing metadata:", e);
      }
    }
  }, [fetchProjectData]);
  
  const handleShare = async () => {
    if (!imageResultAI) {
      setError("Aucune image à partager");
      return;
    }
    
    // Vérifier si la capture de données est requise
    if (project?.datacapture && !showDataCapture) {
      setShowDataCapture(true);
      return;
    }
    
    setLoadingUpload(true);
    setError(null);
    
    try {
      // Upload to S3
      const s3Url = await uploadToS3(imageResultAI);

      if (s3Url) {
        // Générer le lien vers la page personnalisée
        const customPageUrl = `/photobooth-logo/${slug}/image?img=${encodeURIComponent(s3Url)}`;
        setLinkQR(customPageUrl);
        setGenerateQR(true);
      } else {
        throw new Error("Échec de l'upload de l'image");
      }
    } catch (error) {
      console.error("Error sharing image:", error);
      setError(error.message);
    } finally {
      setLoadingUpload(false);
    }
  };
  
  // Fonction pour enregistrer les données de capture
  const handleSaveDataCapture = async () => {
    if (!dataCapture.name.trim()) {
      setError("Le nom est obligatoire");
      return;
    }
    
    if (!dataCapture.rgpdAccepted) {
      setError("Vous devez accepter les conditions RGPD");
      return;
    }
    
    setSavingDataCapture(true);
    setError(null);
    
    try {
      // Enregistrer les données dans photobooth_datacapture
      const { error: insertError } = await supabase
        .from('photobooth_datacapture')
        .insert({
          id_projects: project.id,
          name: dataCapture.name.trim(),
          email: dataCapture.email.trim() || null,
          phone: dataCapture.phone.trim() || null,
          rgpd_text: dataCapture.rgpdAccepted // Enregistrer le statut boolean de l'acceptation RGPD
        });
      
      if (insertError) throw insertError;
      
      // Fermer le formulaire
      setShowDataCapture(false);
      setLoadingUpload(true);

      try {
        // Upload to S3
        const s3Url = await uploadToS3(imageResultAI);

        if (s3Url) {
          // Update session record with S3 URL
          try {
            await supabase.from('sessions')
              .update({ result_s3_url: s3Url })
              .eq('result_image_url', imageResultAI);
          } catch (dbError) {
            console.error("Error updating session:", dbError);
          }
          
          setLinkQR(`/photobooth-logo/${slug}/image?img=${encodeURIComponent(s3Url)}`);
          setGenerateQR(true);

          // ENVOI EMAIL SI ACTIVÉ ET EMAIL RENSEIGNÉ
          if (project?.email_enabled && dataCapture.email) {
            try {
              await sendPhotoByEmail({
                to: dataCapture.email,
                project,
                imageUrl: s3Url,
                participantData: {
                  name: dataCapture.name,
                  email: dataCapture.email,
                  phone: dataCapture.phone,
                  firstname: dataCapture.name.split(' ')[0] || '', // Extrait le prénom du nom complet
                  lastname: dataCapture.name.split(' ').slice(1).join(' ') || '' // Extrait le nom de famille
                }
              });
              // Log déjà fait dans sendPhotoByEmail
            } catch (mailErr) {
              setError("Erreur lors de l'envoi de l'email : " + mailErr.message);
            }
          }
        } else {
          throw new Error("Échec de l'upload de l'image");
        }
      } catch (uploadError) {
        console.error("Error uploading image:", uploadError);
        setError("Erreur lors de l'upload de l'image");
      } finally {
        setLoadingUpload(false);
      }
      
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement des données:', error);
      setError('Erreur lors de l\'enregistrement de vos données');
    } finally {
      setSavingDataCapture(false);
    }
  };
  
  // Vérifier si le formulaire de capture de données est valide
  const isDataCaptureValid = () => {
    return dataCapture.name.trim() && dataCapture.rgpdAccepted;
  };
  
  const uploadToS3 = async (imageUrl) => {
    logWithTimestamp('Starting S3 upload for:', (imageUrl || '').substring(0, 100) + '...');
    try {
      // Récupérer les données complètes du projet pour garantir l'ID complet
      let projectName = project?.name || 'unknown-project';
      let projectOwner = 'unknown-user';
      let fullProjectId = project?.id || 'unknown-project-id'; 
      
      // Sanitize project name for filename
      projectName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      
      // Structure du nom de fichier 
      const fileName = `photobooth-logo-${fullProjectId}-${projectName}-${projectOwner}-${Date.now()}.jpg`;
      logWithTimestamp('Uploading via server-side API...');

      // Always convert to File (handles both dataURL and HTTP URL)
      const imageFile = await dataURLtoFile(imageUrl, fileName);

      // Use FormData for uploading the file
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('projectId', fullProjectId);
      formData.append('fileName', fileName);
      formData.append('metadata', JSON.stringify({
        projectName: project?.name,
        projectSlug: params.slug
      }));
      
      // Use server-side API route for upload
      const serverUploadResponse = await fetch('/api/upload-to-s3', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header, let the browser set it with the boundary
      });
      
      if (!serverUploadResponse.ok) {
        const errorData = await serverUploadResponse.json();
        throw new Error(`Server upload failed: ${errorData.error || serverUploadResponse.statusText}`);
      }
      
      const { url } = await serverUploadResponse.json();
      logWithTimestamp('Upload successful, S3 URL:', url);
      
      // Enregistrer dans project_images
      try {
        const insertResult = await supabase.from('project_images').insert([{
          project_id: fullProjectId,
          image_url: url,
          created_at: new Date().toISOString(),
          metadata: {
            fileName: fileName,
            projectName: project?.name,
            projectSlug: params.slug
          }
        }]);
        
        logWithTimestamp('Résultat insertion project_images:', insertResult);
      } catch (dbError) {
        console.error("Error saving image reference to database:", dbError);
        // Continue even if DB insertion fails, as we still have the S3 URL
      }
      
      return url;
    } catch (error) {
      logWithTimestamp('Error uploading to S3:', error);
      throw error;
    }
  };
  
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);
  
  const handleStartOver = () => {
    // Clear result data
    localStorage.removeItem('faceURLResult');
    localStorage.removeItem('resulAIBase64');
  };
  
  if (loading) {
    return (
      <div className="flex fixed h-full w-full overflow-auto flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return notFound();
  }

  // Dynamic styles based on project colors
  const primaryColor = project.primary_color || '#811A53';
  const secondaryColor = project.secondary_color || '#E5E40A';

  return (
    <main 
      className="flex fixed h-full w-full overflow-auto flex-col items-center justify-center pt-2 pb-20 px-5"
    >
      {/* Formulaire de capture de données */}
      {showDataCapture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md">
          <div
            className={`
              flex flex-col md:flex-row
              bg-white rounded-2xl shadow-2xl w-full
              max-w-2xl md:max-w-6xl xl:max-w-[90vw]
              overflow-hidden
              transition-all
              ${project?.primary_color ? '' : ''}
            `}
            style={{
              border: `4px solid ${secondaryColor}`,
              boxShadow: `0 8px 32px 0 ${primaryColor}33`,
            }}
          >
            {/* Colonne gauche (infos et RGPD) */}
            <div
              className="basis-full md:basis-1/3 flex flex-col justify-center items-center p-8"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 60%, ${secondaryColor} 100%)`,
              }}
            >
              <h2 className="text-2xl md:text-3xl font-extrabold text-white text-center mb-2 drop-shadow-lg">
                Vos informations
              </h2>
              <p className="text-base md:text-lg text-white/90 text-center mb-6">
                Remplissez vos coordonnées pour recevoir votre photo
              </p>
              {/* Texte RGPD du projet */}
              {project?.rgpd_text && (
                <div className="bg-white/80 p-4 rounded-lg border border-white/60 mt-2 max-h-40 overflow-y-auto w-full">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h4 className="text-base font-semibold text-blue-900 mb-1">
                        Protection des données personnelles (RGPD)
                      </h4>
                      <div className="text-sm text-blue-800 leading-relaxed">
                        <p>{project.rgpd_text}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Colonne droite (formulaire) */}
            <div
              className="basis-full md:basis-2/3 flex flex-col justify-center p-8"
              style={{
                background: `linear-gradient(120deg, #fff 80%, ${secondaryColor}22 100%)`,
                backdropFilter: 'blur(2px)',
                boxShadow: `0 2px 24px 0 ${secondaryColor}22`,
              }}
            >
              {error && (
                <div className="mb-4 p-3 text-base text-red-700 bg-red-100 rounded-lg border border-red-200">
                  {error}
                </div>
              )}
              {/* Nom (obligatoire) */}
              <div className="mb-6">
                <label htmlFor="name" className="block text-lg font-semibold text-gray-700 mb-2">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={dataCapture.name}
                  onChange={(e) => setDataCapture({...dataCapture, name: e.target.value})}
                  className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl shadow focus:ring-2 focus:ring-primary focus:border-primary text-lg"
                  placeholder="Votre nom complet"
                  required
                  style={{ fontSize: '1.15rem' }}
                />
              </div>
              {/* Email (optionnel) */}
              <div className="mb-6">
                <label htmlFor="email" className="block text-lg font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={dataCapture.email}
                  onChange={(e) => setDataCapture({...dataCapture, email: e.target.value})}
                  className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl shadow focus:ring-2 focus:ring-primary focus:border-primary text-lg"
                  placeholder="votre@email.com"
                  style={{ fontSize: '1.15rem' }}
                />
              </div>
              {/* Téléphone (optionnel) */}
              <div className="mb-6">
                <label htmlFor="phone" className="block text-lg font-semibold text-gray-700 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={dataCapture.phone}
                  onChange={(e) => setDataCapture({...dataCapture, phone: e.target.value})}
                  className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl shadow focus:ring-2 focus:ring-primary focus:border-primary text-lg"
                  placeholder="06 12 34 56 78"
                  style={{ fontSize: '1.15rem' }}
                />
              </div>
              {/* Checkbox RGPD */}
              <div className="flex items-start mb-8">
                <input
                  type="checkbox"
                  id="rgpd"
                  checked={dataCapture.rgpdAccepted}
                  onChange={(e) => setDataCapture({...dataCapture, rgpdAccepted: e.target.checked})}
                  className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
                <label htmlFor="rgpd" className="ml-3 text-base text-gray-700 leading-relaxed">
                  J'accepte les conditions de traitement de mes données personnelles selon les conditions énoncées ci-dessus <span className="text-red-500">*</span>
                </label>
              </div>
              {/* Boutons */}
              <div className="flex flex-col md:flex-row gap-4">
                <button
                  onClick={() => setShowDataCapture(false)}
                  className="flex-1 py-3 px-4 border-2 border-gray-300 rounded-xl text-gray-700 bg-gray-50 hover:bg-gray-100 font-semibold text-lg transition-colors"
                  disabled={savingDataCapture}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveDataCapture}
                  disabled={!isDataCaptureValid() || savingDataCapture}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg"
                  style={{
                    background: isDataCaptureValid() && !savingDataCapture
                      ? `linear-gradient(90deg, ${secondaryColor} 0%, ${primaryColor} 100%)`
                      : '#e5e7eb',
                    color: isDataCaptureValid() && !savingDataCapture
                      ? '#fff'
                      : '#888',
                    cursor: isDataCaptureValid() && !savingDataCapture
                      ? 'pointer'
                      : 'not-allowed',
                    boxShadow: isDataCaptureValid() && !savingDataCapture
                      ? `0 4px 16px 0 ${secondaryColor}55`
                      : 'none'
                  }}
                >
                  {savingDataCapture ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Enregistrement...
                    </>
                  ) : (
                    'Enregistrer et envoyer'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Sharing Overlay */}
      {generateQR && (
        <div className="fixed inset-0 z-40 flex items-center justify-center flex-col bg-black/40 backdrop-blur-md">
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl p-0 overflow-hidden border-4"
            style={{
              background: `linear-gradient(135deg, ${primaryColor} 60%, ${secondaryColor} 100%)`,
              borderColor: secondaryColor,
              boxShadow: `0 8px 32px 0 ${primaryColor}33`,
            }}
          >
            <div className="flex flex-col items-center justify-center px-8 py-8">
              <h2
                className="text-2xl font-extrabold mb-4 text-center"
                style={{
                  color: secondaryColor,
                  textShadow: `0 2px 8px ${primaryColor}55`
                }}
              >
                Scannez le QR Code
              </h2>
              <div
                className="flex justify-center items-center mb-6 rounded-xl p-3"
                style={{
                  background: "#fff",
                  border: `3px solid ${secondaryColor}`,
                  boxShadow: `0 2px 16px 0 ${secondaryColor}33`
                }}
              >
                <Canvas
                  text={linkQR}
                  options={{
                    errorCorrectionLevel: 'M',
                    margin: 3,
                    scale: 4,
                    width: 220,
                    color: {
                      dark: primaryColor,
                      light: '#ffffff',
                    },
                  }}
                />
              </div>
              {/* Ajout du lien cliquable sous le QR code */}
              <a
                href={linkQR}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-4 text-indigo-600 underline break-all text-center font-semibold"
                style={{ wordBreak: 'break-all' }}
              >
                {linkQR}
              </a>
              <p className="text-base text-white/90 mb-6 text-center">
                Utilisez votre téléphone pour scanner ce code et récupérer votre photo
              </p>
              <div className="text-xs text-white/80 max-h-32 overflow-auto p-3 bg-white/10 mb-4 rounded">
                {project.privacy_notice || (
                  <>
                    <p className="font-bold">INFORMATION SUR LA PROTECTION DES DONNÉES (RGPD)</p>
                    <p>Photo générée via intelligence artificielle. Les images sont conservées 7 jours maximum.</p>
                  </>
                )}
              </div>
              <button
                onClick={() => setGenerateQR(false)}
                className="w-full py-8 text-center font-extrabold rounded-3xl mt-6 text-3xl tracking-wider uppercase transition-all"
                style={{
                  background: `linear-gradient(90deg, ${secondaryColor} 0%, ${primaryColor} 100%)`,
                  color: '#fff',
                  boxShadow: `0 8px 32px 0 ${secondaryColor}cc`,
                  letterSpacing: '0.1em'
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-full mx-auto mt-[15vh] mb-8">
        {error && !showDataCapture && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}
        
        {/* Result Image Display - Full Size Container */}
        {imageResultAI ? (
          <div className="relative mx-auto flex items-center justify-center" style={{ width: '100%' }}>
            {/^https?:\/\/(replicate\.delivery|leeveostockage\.s3|.*amazonaws\.com)/.test(imageResultAI) ? (
              <img
                src={imageResultAI}
                width={1200}
                height={1600}
                alt="Résultat"
                className="w-auto h-auto rounded-lg shadow-2xl"
                style={{
                  maxHeight: '75vh',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
                onError={(e) => {
                  console.error("Error loading image:", e);
                  setError("Impossible de charger l'image");
                }}
              />
            ) : (
              <Image
                src={imageResultAI}
                width={1200}
                height={1600}
                alt="Résultat"
                className="w-auto h-auto rounded-lg shadow-2xl"
                priority
                onError={(e) => {
                  console.error("Error loading image:", e);
                  setError("Impossible de charger l'image");
                }}
                style={{
                  maxHeight: '75vh',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            )}
            {/* Bouton de téléchargement visible uniquement sur mobile */}
            {linkQR && (
              <a
                href={linkQR}
                download
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full bg-indigo-600 text-white font-bold shadow-lg text-base flex items-center gap-2 md:hidden"
                style={{ maxWidth: '90vw' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                Télécharger ma photo
              </a>
            )}
          </div>
        ) : (
          <div className="p-8 bg-white bg-opacity-10 rounded-lg text-white text-center">
            Aucune image généré. Veuillez recommencer le processus.
          </div>
        )}
        
        {/* Action Buttons - Modern redesign with narrower width */}
        <div className="mt-8 flex flex-col items-center space-y-4">
          {settings?.enable_qr_codes && imageResultAI && (
            <motion.button 
              onClick={handleShare}
              disabled={loadingUpload}
              className={`py-5 px-10 rounded-2xl font-extrabold text-2xl text-center flex items-center justify-center gap-3 max-w-[340px] w-full shadow-lg ${loadingUpload ? 'opacity-70' : ''}`}
              style={{ 
                backgroundColor: secondaryColor, 
                color: primaryColor,
                letterSpacing: '0.05em',
                boxShadow: `0 4px 14px rgba(${parseInt(secondaryColor.slice(1, 3), 16)}, ${parseInt(secondaryColor.slice(3, 5), 16)}, ${parseInt(secondaryColor.slice(5, 7), 16)}, 0.3)`
              }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              {loadingUpload ? (
                <>
                  <svg className="animate-spin w-7 h-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>PRÉPARATION...</span>
                </>
              ) : project?.datacapture ? (
                <>
                  <svg className="w-7 h-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>ENVOYER MA PHOTO</span>
                </>
              ) : (
                <>
                  <svg className="w-7 h-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>PARTAGER MA PHOTO</span>
                </>
              )}
            </motion.button>
          )}
          
          <motion.div
            className="w-full max-w-[340px]" // largeur augmentée
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link 
              href={`/photobooth-logo/${slug}/how`}
              onClick={handleStartOver}
              className="py-5 px-10 rounded-2xl font-extrabold text-2xl text-center bg-white bg-opacity-30 hover:bg-opacity-40 text-white transition-all flex items-center justify-center gap-3 w-full backdrop-blur-sm shadow-lg"
              style={{
                letterSpacing: '0.05em'
              }}
            >
              <svg className="w-7 h-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>RECOMMENCER</span>
            </Link>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
