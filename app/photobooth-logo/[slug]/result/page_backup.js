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

// Helper to ensure absolute URL for QR code
const makeAbsoluteUrl = (pathOrUrl) => {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  
  // Remove any leading slash to avoid double slash
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  
  // Use current domain for local development, production domain otherwise
  if (typeof window !== 'undefined') {
    const currentDomain = window.location.origin;
    // Si on est en local (localhost ou 127.0.0.1), utiliser le domaine local
    if (currentDomain.includes('localhost') || currentDomain.includes('127.0.0.1')) {
      return `${currentDomain}${path}`;
    }
  }
  
  // En cas de SSR ou autres cas, essayer de détecter l'environnement
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Utiliser HTTPS localhost par défaut pour le développement
    return `https://localhost:3000${path}`;
  }
  
  // Fallback to production domain
  return `https://photobooth.waibooth.app${path}`;
};

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
  const [isMobile, setIsMobile] = useState(false);

  // Validation function for data capture
  const isDataCaptureValid = () => {
    return dataCapture.name.trim().length > 0 && dataCapture.rgpdAccepted;
  };

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
  }, [slug]); // Only depends on slug

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
    
    // Load result image from different localStorage keys
    const possibleKeys = ['faceURLResult', 'resulAIBase64'];
    for (const key of possibleKeys) {
      const stored = localStorage.getItem(key);
      if (stored && stored.trim() !== '') {
        logWithTimestamp(`Loading image from localStorage key: ${key}`);
        setImageResultAI(stored);
        break;
      }
    }
    
    // Always fetch fresh data to ensure consistency
    fetchProjectData();
  }, [fetchProjectData]);

  const handleShare = async () => {
    if (!imageResultAI) return;

    if (project?.datacapture) {
      setShowDataCapture(true);
      return;
    }

    try {
      setLoadingUpload(true);
      setError(null);
      
      const s3Url = await uploadToS3(imageResultAI);
      const absoluteUrl = makeAbsoluteUrl(s3Url);
      setLinkQR(absoluteUrl);
      setGenerateQR(true);
    } catch (error) {
      console.error('Error during upload:', error);
      setError('Erreur lors du téléchargement de l\'image: ' + error.message);
    } finally {
      setLoadingUpload(false);
    }
  };

  const handleSaveDataCapture = async () => {
    if (!isDataCaptureValid()) {
      setError('Veuillez remplir tous les champs obligatoires et accepter les conditions RGPD');
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
              .update({ 
                faceURL: s3Url,
                updated_at: new Date().toISOString()
              })
              .eq('id_project', project.id)
              .order('created_at', { ascending: false })
              .limit(1);
            
            logWithTimestamp('Session record updated with S3 URL');
          } catch (sessionError) {
            console.warn("Could not update session record:", sessionError);
          }

          const absoluteUrl = makeAbsoluteUrl(s3Url);
          setLinkQR(absoluteUrl);

          // Si email fourni, envoyer l'email automatiquement
          if (dataCapture.email.trim()) {
            try {
              await sendPhotoByEmail({
                to: dataCapture.email.trim(),
                project: project,
                imageUrl: absoluteUrl
              });
              console.log('Email sent successfully to:', dataCapture.email);
            } catch (emailError) {
              console.error('Error sending email:', emailError);
              // Continuer même si l'email échoue
            }
          }

          setGenerateQR(true);
        }
      } catch (uploadError) {
        console.error('Error uploading to S3:', uploadError);
        setError('Erreur lors du téléchargement: ' + uploadError.message);
      }
    } catch (error) {
      console.error('Error saving data capture:', error);
      setError('Erreur lors de l\'enregistrement des données: ' + error.message);
    } finally {
      setLoadingUpload(false);
      setSavingDataCapture(false);
    }
  };
  
  const uploadToS3 = async (imageUrl) => {
    logWithTimestamp('Starting S3 upload for:', (imageUrl || '').substring(0, 100) + '...');
    
    try {
      if (!imageUrl) {
        throw new Error("Aucune image à télécharger");
      }

      // Convert to file
      const fileName = `photobooth-logo-${Date.now()}.jpeg`;
      const file = await dataURLtoFile(imageUrl, fileName);
      
      // Get project ID for folder structure
      const projectId = project?.id || 'unknown';
      const fullProjectId = `photobooth-logo-${projectId}`;
      const s3Key = `${fullProjectId}/${fileName}`;
      
      logWithTimestamp('Uploading to S3 with key:', s3Key);
      
      // Upload via server API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('key', s3Key);
      
      const serverUploadResponse = await fetch('/api/upload-s3', {
        method: 'POST',
        body: formData,
      });
      
      if (!serverUploadResponse.ok) {
        const errorData = await serverUploadResponse.json();
        logWithTimestamp('Server upload failed:', errorData);
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
  
  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Main data loading effect
  useEffect(() => {
    
    // Check URL params for direct sharing links
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const imageUrl = urlParams.get('imageUrl');
      if (imageUrl) {
        setLinkQR(imageUrl);
        setGenerateQR(true);
      }
    }
    
    // Log any available metadata
    const falMetadata = localStorage.getItem('falGenerationMetadata');
    if (falMetadata) {
      try {
        logWithTimestamp('fal.ai generation metadata:', JSON.parse(falMetadata));
      } catch (e) {
        console.error("Error parsing metadata:", e);
      }
    }
    
    // Fetch fresh data on mount
    fetchProjectData();
  }, [slug]); // Seulement dépend de slug
  
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
      <div className="fixed top-0 right-0 w-[30%] mt-4 mr-4">
        {project.logo_url ? (
          <Image
            src={project.logo_url}
            alt="Logo"
            width={180}
            height={120}
            className="object-contain w-auto h-auto max-h-[120px] max-w-full"
          />
        ) : (
          <div className="w-full h-[120px] flex items-center justify-center">
          </div>
        )}
      </div>

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
              className="md:w-1/2 p-8 flex flex-col justify-between text-white relative"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
              }}
            >
              <div>
                <h2 className="text-3xl font-extrabold mb-6">Récupérer ma photo</h2>
                <div className="space-y-4 text-lg leading-relaxed">
                  <p>
                    <strong>📸 Pour recevoir votre photo :</strong><br />
                    Remplissez le formulaire ci-contre avec votre nom (obligatoire).
                  </p>
                  <p>
                    <strong>📧 Email optionnel :</strong><br />
                    Si vous saisissez votre email, votre photo vous sera envoyée automatiquement.
                  </p>
                  <p>
                    <strong>📱 QR Code :</strong><br />
                    Un QR Code sera généré pour récupérer votre photo sur votre téléphone.
                  </p>
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                <h3 className="font-bold text-lg mb-2">🔒 Vos données personnelles</h3>
                <div className="text-sm leading-relaxed space-y-2">
                  <p>• <strong>Utilisation :</strong> Vos données ne servent qu'à vous envoyer votre photo</p>
                  <p>• <strong>Durée :</strong> Elles sont automatiquement supprimées après 7 jours</p>
                  <p>• <strong>Partage :</strong> Elles ne sont jamais communiquées à des tiers</p>
                  <p>• <strong>Droits RGPD :</strong> Vous pouvez demander leur suppression à tout moment</p>
                </div>
              </div>
            </div>

            {/* Colonne droite (formulaire) */}
            <div className="md:w-1/2 p-8 bg-gradient-to-br from-gray-50 to-white">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">Vos informations</h3>
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

      {/* QR Code Sharing Overlay - Enhanced Version */}
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
              
              {/* Action Buttons for QR Code */}
              <div className="flex flex-col gap-3 w-full mb-4">
                {/* Download Button */}
                <motion.a
                  href={linkQR}
                  download
                  className="py-3 px-6 rounded-xl font-bold text-center flex items-center justify-center gap-3 transition-all"
                  style={{
                    backgroundColor: secondaryColor,
                    color: primaryColor,
                    boxShadow: `0 4px 14px rgba(${parseInt(secondaryColor.slice(1, 3), 16)}, ${parseInt(secondaryColor.slice(3, 5), 16)}, ${parseInt(secondaryColor.slice(5, 7), 16)}, 0.3)`
                  }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  <span>TÉLÉCHARGER</span>
                </motion.a>
                
                {/* Share Button (Web Share API) */}
                {typeof navigator !== 'undefined' && navigator.share && (
                  <motion.button
                    onClick={async () => {
                      try {
                        await navigator.share({
                          title: 'Mon PhotoBooth IA Logo',
                          text: 'Découvrez ma création PhotoBooth IA Logo !',
                          url: linkQR
                        });
                      } catch (err) {
                        console.log('Sharing cancelled or failed:', err);
                      }
                    }}
                    className="py-3 px-6 rounded-xl font-bold text-center flex items-center justify-center gap-3 bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-sm"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span>PARTAGER</span>
                  </motion.button>
                )}
              </div>
              
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
              <motion.button
                onClick={() => setGenerateQR(false)}
                className="w-full py-8 text-center font-extrabold rounded-3xl mt-6 text-3xl tracking-wider uppercase transition-all"
                style={{
                  background: `linear-gradient(90deg, ${secondaryColor} 0%, ${primaryColor} 100%)`,
                  color: '#fff',
                  boxShadow: `0 8px 32px 0 ${secondaryColor}cc`,
                  letterSpacing: '0.1em'
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Fermer
              </motion.button>
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
              className={`py-3 px-8 rounded-xl font-bold text-center flex items-center justify-center gap-2 max-w-[240px] w-full shadow-lg ${loadingUpload ? 'opacity-70' : ''}`}
              style={{ 
                backgroundColor: secondaryColor, 
                color: primaryColor,
                boxShadow: `0 4px 14px rgba(${parseInt(secondaryColor.slice(1, 3), 16)}, ${parseInt(secondaryColor.slice(3, 5), 16)}, ${parseInt(secondaryColor.slice(5, 7), 16)}, 0.3)`
              }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              {loadingUpload ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>PRÉPARATION...</span>
                </>
              ) : project?.datacapture ? (
                <>
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>ENVOYER MA PHOTO</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>PARTAGER MA PHOTO</span>
                </>
              )}
            </motion.button>
          )}
          
          <motion.div
            className="w-full max-w-[240px]"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link 
              href={`/photobooth-logo/${slug}/how`}
              onClick={handleStartOver}
              className="py-3 px-8 rounded-xl font-medium text-center bg-white bg-opacity-20 hover:bg-opacity-30 text-white transition-all flex items-center justify-center gap-2 w-full backdrop-blur-sm"
            >
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>RECOMMENCER</span>
            </Link>
          </motion.div>
        </div>

        {/* Fixed Mobile Action Buttons */}
        {isMobile && imageResultAI && !generateQR && !showDataCapture && (
          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex gap-3 z-50">
            {/* Download Button */}
            {linkQR && (
              <motion.a
                href={linkQR}
                download
                className="flex-1 py-4 rounded-2xl font-bold text-center flex items-center justify-center gap-2 shadow-lg"
                style={{
                  backgroundColor: secondaryColor,
                  color: primaryColor,
                  boxShadow: `0 4px 14px rgba(${parseInt(secondaryColor.slice(1, 3), 16)}, ${parseInt(secondaryColor.slice(3, 5), 16)}, ${parseInt(secondaryColor.slice(5, 7), 16)}, 0.3)`
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                <span className="font-bold">TÉLÉCHARGER</span>
              </motion.a>
            )}

            {/* Share/Email Button */}
            {settings?.enable_qr_codes && (
              <motion.button
                onClick={handleShare}
                disabled={loadingUpload}
                className={`flex-1 py-4 rounded-2xl font-bold text-center flex items-center justify-center gap-2 shadow-lg ${loadingUpload ? 'opacity-70' : ''}`}
                style={{
                  background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor})`,
                  color: '#fff',
                  boxShadow: `0 4px 14px rgba(${parseInt(primaryColor.slice(1, 3), 16)}, ${parseInt(primaryColor.slice(3, 5), 16)}, ${parseInt(primaryColor.slice(5, 7), 16)}, 0.3)`
                }}
                whileHover={{ scale: loadingUpload ? 1 : 1.02 }}
                whileTap={{ scale: loadingUpload ? 1 : 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                {loadingUpload ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="font-bold">ENVOI...</span>
                  </>
                ) : project?.datacapture ? (
                  <>
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-bold">ENVOYER</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span className="font-bold">PARTAGER</span>
                  </>
                )}
              </motion.button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
