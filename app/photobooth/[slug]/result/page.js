'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useQRCode } from 'next-qrcode';
import { notFound } from 'next/navigation';
import { motion } from 'framer-motion';
import { applyWatermarkWithCanvas } from '../../../utils/watermarkUtils';

// Logging helper
const logWithTimestamp = (message, data) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data || '');
};

// S3 client for image uploads
const s3Client = new S3Client({
  region: 'eu-west-3',
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  },
});

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
  const [success, setSuccess] = useState(null);
  
  // Email form states
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailFormData, setEmailFormData] = useState({ name: '', email: '' });
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState(null);
  
  // Combined sharing state
  const [combinedSharingOpen, setCombinedSharingOpen] = useState(false);
  
  // États pour la capture de données
  const [showDataCapture, setShowDataCapture] = useState(false);
  const [dataCapture, setDataCapture] = useState({
    name: '',
    email: '',
    phone: '',
    rgpdAccepted: false
  });
  const [savingDataCapture, setSavingDataCapture] = useState(false);
  
  // Ajout d'un état pour suivre la méthode de filigrane
  const [useCanvasWatermark, setUseCanvasWatermark] = useState(true);
  
  // Wrap fetchProjectData in useCallback to avoid recreation on every render
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
      
      console.log('Project data loaded:', projectData); // Debug: log project data including sharing_method
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
  }, [slug, supabase]); // Add dependencies here
  
  useEffect(() => {
    // Always fetch fresh data first
    fetchProjectData().then(() => {
      // Only use localStorage as fallback after trying to fetch
      const cachedProject = localStorage.getItem('projectData');
      const cachedSettings = localStorage.getItem('projectSettings');
      const resultImage = localStorage.getItem('faceURLResult');
      
      if (!project && cachedProject) {
        try {
          const parsedProject = JSON.parse(cachedProject);
          console.log('Using cached project data:', parsedProject);
          setProject(parsedProject);
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
    });
    
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
  }, [fetchProjectData, project]);
  
  // Update the handleShare function to prioritize advanced watermark elements
  const handleShare = async () => {
    if (!imageResultAI) {
      setError("Aucune image à partager");
      return;
    }
    
    setLoadingUpload(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log("Starting share process...");
      
      // 1. Upload original image to S3 as a backup
      console.log("1. Uploading original image to S3 for backup storage");
      
      // Generate a unique file name
      const fileName = `photobooth-${project.photobooth_type || 'faceswapping'}-${project.id}-${Date.now()}.jpg`;
      
      // Fetch the image
      const imageResponse = await fetch(imageResultAI);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }
      
      const imageBlob = await imageResponse.blob();
      const buffer = Buffer.from(await imageBlob.arrayBuffer());
      
      // Upload to S3
      const uploadParams = {
        Bucket: 'leeveostockage',
        Key: `projects/${project.id}/${fileName}`,
        Body: buffer,
        ContentType: 'image/jpeg'
      };
      
      await s3Client.send(new PutObjectCommand(uploadParams));
      
      // Generate S3 URL
      const s3Url = `https://${uploadParams.Bucket}.s3.eu-west-3.amazonaws.com/${uploadParams.Key}`;
      console.log("S3 backup image URL:", s3Url);
      
      // 2. Apply watermark - Prioritize advanced watermark elements
      let watermarkedUrl = '';
      let watermarkedBlob = null;
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      
      if (useCanvasWatermark) {
        try {
          console.log("2a. Applying watermark with Canvas");
          
          // Parse advanced watermark elements if available
          let watermarkElements = null;
          if (project.hasOwnProperty('watermark_elements') && project.watermark_elements) {
            try {
              watermarkElements = JSON.parse(project.watermark_elements);
              console.log(`Using advanced watermark with ${watermarkElements.length} elements`);
            } catch (parseError) {
              console.error("Error parsing watermark elements:", parseError);
            }
          }
          
          // Apply watermark directly with Canvas
          watermarkedBlob = await applyWatermarkWithCanvas(
            s3Url, 
            { enabled: project.watermark_enabled || false }, 
            watermarkElements
          );
          
          // Upload watermarked image to S3
          const watermarkedBuffer = Buffer.from(await watermarkedBlob.arrayBuffer());
          
          const watermarkedParams = {
            Bucket: 'leeveostockage',
            Key: `projects/${project.id}/watermarked-${fileName}`,
            Body: watermarkedBuffer,
            ContentType: 'image/jpeg'
          };
          
          await s3Client.send(new PutObjectCommand(watermarkedParams));
          
          // Generate S3 URL for watermarked image
          watermarkedUrl = `https://${watermarkedParams.Bucket}.s3.eu-west-3.amazonaws.com/${watermarkedParams.Key}`;
          console.log("Watermarked image URL:", watermarkedUrl);
          
        } catch (canvasError) {
          console.error("Error with Canvas watermark, falling back to API:", canvasError);
          // Fall back to API watermarking
          setUseCanvasWatermark(false);
          watermarkedUrl = `${baseUrl}/api/watermark?imageUrl=${encodeURIComponent(s3Url)}&projectId=${project.id}`;
        }
      } else {
        console.log("2b. Using API watermark URL");
        // Use API watermarking
        watermarkedUrl = `${baseUrl}/api/watermark?imageUrl=${encodeURIComponent(s3Url)}&projectId=${project.id}`;
      }
      
      // 3. Store image record in database
      console.log("3. Recording image in database via API with both URLs");
      const recordResponse = await fetch('/api/save-shared-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId: project.id,
          imageUrl: s3Url,         // Original non-watermarked image for gallery
          watermarkedUrl: watermarkedUrl, // Watermarked image for sharing
          fileName: fileName,
          projectSlug: slug,
          originalUrl: imageResultAI,
          watermarked: true
        })
      });
      
      if (!recordResponse.ok) {
        const errorData = await recordResponse.json();
        throw new Error(`Failed to record image: ${errorData.message || recordResponse.statusText}`);
      }
      
      const recordData = await recordResponse.json();
      console.log("Image record created:", recordData);
      
      // 4. Update any session information
      try {
        await supabase.from('sessions')
          .update({ 
            result_s3_url: s3Url,
            watermarked_url: watermarkedUrl 
          })
          .eq('result_image_url', imageResultAI);
      } catch (sessionError) {
        console.error("Error updating session:", sessionError);
        // Continue even if session update fails
      }
      
      // 5. Set QR code to point to the watermarked image
      setLinkQR(watermarkedUrl);
      setCombinedSharingOpen(true);
      setSuccess("Image prête à être partagée !");
      
    } catch (error) {
      console.error("Error in share process:", error);
      setError(`Erreur lors du partage: ${error.message}`);
    } finally {
      setLoadingUpload(false);
    }
  };
  
  const handleStartOver = () => {
    // Clear result data
    localStorage.removeItem('faceURLResult');
    localStorage.removeItem('resulAIBase64');
  };
  
  // Handle email form submission
  const handleEmailFormSubmit = async (e) => {
    e.preventDefault();
    setEmailSubmitting(true);
    setEmailError(null);
    
    if (!linkQR) {
      setEmailError("Erreur: Image non disponible");
      setEmailSubmitting(false);
      return;
    }
    
    try {
      const response = await fetch('/api/email-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: emailFormData.name,
          email: emailFormData.email,
          projectId: project.id,
          imageUrl: linkQR
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de l\'envoi de l\'email');
      }
      
      setEmailSuccess(true);
      
      // Trigger email sending
      await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: data.data.id
        }),
      });
      
    } catch (err) {
      console.error('Error submitting email form:', err);
      setEmailError(err.message || 'Une erreur est survenue lors de l\'envoi de l\'email');
    } finally {
      setEmailSubmitting(false);
    }
  };

  // Nouvelle fonction pour envoyer l'email via l'API Next.js
  async function sendPhotoByEmail({ to, project, imageUrl }) {
    if (!to) throw new Error("Email destinataire requis");
    
    const response = await fetch('/api/send-photo-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, project, imageUrl }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de l\'envoi de l\'email');
    }
    
    // Log de succès
    console.log(`[API] Email envoyé avec succès à ${to} pour le projet ${project?.name || project?.id}`);
  }

  // Fonction pour gérer le partage avec capture de données
  const handleShareWithDataCapture = async () => {
    if (!imageResultAI) {
      setError("Aucune image à partager");
      return;
    }

    // Si datacapture est activé, afficher le popup
    if (project?.datacapture) {
      setShowDataCapture(true);
      return;
    }

    // Sinon, procéder avec le partage normal
    handleShare();
  };

  // Fonction pour enregistrer les données de capture
  const handleSaveDataCapture = async () => {
    if (!isDataCaptureValid()) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setSavingDataCapture(true);
    setError(null);

    try {
      // D'abord, traiter l'image
      await handleShare();

      // Attendre que linkQR soit disponible
      if (!linkQR) {
        throw new Error("Erreur lors de la préparation de l'image");
      }

      // Enregistrer les données de capture
      const { data, error } = await supabase.from('project_captures').insert([
        {
          project_id: project.id,
          name: dataCapture.name,
          email: dataCapture.email || null,
          phone: dataCapture.phone || null,
          rgpd_text: dataCapture.rgpdAccepted // Enregistrer le statut boolean de l'acceptation RGPD
        }
      ]);

      if (error) throw error;

      // Envoyer l'email si une adresse email est fournie
      if (dataCapture.email) {
        try {
          await sendPhotoByEmail({
            to: dataCapture.email,
            project: project,
            imageUrl: linkQR,
            participantData: {
              name: dataCapture.name,
              email: dataCapture.email,
              phone: dataCapture.phone,
              firstname: dataCapture.name.split(' ')[0] || '', // Extrait le prénom du nom complet
              lastname: dataCapture.name.split(' ').slice(1).join(' ') || '' // Extrait le nom de famille
            }
          });
        } catch (emailError) {
          console.error("Erreur envoi email:", emailError);
          // Ne pas faire échouer tout le processus pour une erreur d'email
        }
      }

      // Fermer le popup et afficher le QR code
      setShowDataCapture(false);
      setGenerateQR(true);

    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      setError(error.message || "Une erreur est survenue");
    } finally {
      setSavingDataCapture(false);
    }
  };

  // Vérifier si le formulaire de capture de données est valide
  const isDataCaptureValid = () => {
    return dataCapture.name.trim() && dataCapture.rgpdAccepted;
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
    <div className="relative z-10 w-full h-full">
      <main 
        className="flex fixed h-full w-full overflow-auto flex-col items-center justify-center pt-2 pb-20 px-5"
      >
        <motion.div 
          className="fixed top-0 left-0 right-0 flex justify-center mt-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {project.logo_url ? (
            <div className="w-[250px] h-[250px] relative">
              <Image 
                src={project.logo_url} 
                alt={project.name} 
                fill
                style={{ objectFit: "contain" }}
                priority 
                className="drop-shadow-xl"
              />
            </div>
          ) : (
            <h1 
              className="text-xl font-bold text-center" 
              style={{ color: secondaryColor }}
            >
              {project.name}
            </h1>
          )}
        </motion.div>

        {/* Popup de capture de données */}
        {showDataCapture && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md">
            <div
              className={`
                flex flex-col md:flex-row
                bg-white rounded-2xl shadow-2xl w-full
                max-w-2xl md:max-w-6xl xl:max-w-[90vw]
                overflow-hidden
                transition-all
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

        {/* Combined Sharing Popup with QR Code and Email Form */}
        {combinedSharingOpen && (
          <motion.div 
            className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-xl font-bold">Partagez votre création photo</h3>
                <button 
                  onClick={() => setCombinedSharingOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              <div className="flex flex-col md:flex-row">
                {/* Left Side - Email Form */}
                <div className="w-full md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-gray-200">
                  <h4 className="font-bold text-lg mb-2">Recevez par email</h4>
                  <p className="text-gray-600 text-sm mb-4">
                    Remplissez ce formulaire pour recevoir votre photo directement dans votre boîte mail. 
                    Vous pourrez ainsi la conserver et la partager facilement avec vos proches.
                  </p>
                  
                  {emailError && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                      {emailError}
                    </div>
                  )}
                  
                  {emailSuccess ? (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                      <h5 className="text-lg font-medium mb-2">Email envoyé avec succès</h5>
                      <p className="text-gray-600 mb-6">
                        Votre photo a été envoyée à {emailFormData.email}.<br/>
                        Vérifiez votre boîte de réception !
                      </p>
                      <div className="flex flex-col space-y-3">
                        <button 
                          onClick={() => setEmailSuccess(false)} 
                          className="px-4 py-2 bg-blue-600 text-white rounded-md"
                        >
                          Envoyer un autre email
                        </button>
                        <Link 
                          href={`/photobooth/${slug}`}
                          onClick={() => {
                            setCombinedSharingOpen(false);
                            handleStartOver();
                          }}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-center"
                        >
                          Recommencer
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleEmailFormSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          Votre nom
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          required
                          value={emailFormData.name}
                          onChange={(e) => setEmailFormData({...emailFormData, name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Entrez votre nom"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={emailFormData.email}
                          onChange={(e) => setEmailFormData({...emailFormData, email: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="votre@email.com"
                        />
                      </div>
                      
                      <div className="pt-2 flex flex-col space-y-3">
                        <button
                          type="submit"
                          disabled={emailSubmitting}
                          className="w-full px-4 py-2 rounded-md font-medium disabled:opacity-50"
                          style={{ backgroundColor: primaryColor, color: 'white' }}
                        >
                          {emailSubmitting ? (
                            <div className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Envoi en cours...
                            </div>
                          ) : 'Envoyer par email'}
                        </button>
                        <Link 
                          href={`/photobooth/${slug}`}
                          onClick={() => {
                            setCombinedSharingOpen(false);
                            handleStartOver();
                          }}
                          className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-center"
                        >
                          Recommencer
                        </Link>
                      </div>
                    </form>
                  )}
                </div>
                
                {/* Right Side - QR Code */}
                <div className="w-full md:w-1/2 p-6">
                  <h4 className="font-bold text-lg mb-2">Scannez le QR Code</h4>
                  <p className="text-gray-600 text-sm mb-4">
                    Utilisez l&apos;appareil photo de votre téléphone pour scanner ce code QR. 
                    Vous pourrez ainsi accéder à votre photo et la télécharger directement sur votre appareil.
                  </p>
                  
                  <div className="flex flex-col items-center">
                    <div className="border-4 border-black p-2 bg-white mb-4">
                      <Canvas
                        text={linkQR || ''}
                        options={{
                          errorCorrectionLevel: 'M',
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
                    <p className="text-sm text-gray-600 text-center mb-4">
                      Pointez l&apos;appareil photo de votre smartphone vers ce code pour récupérer votre création
                    </p>
                    
                    {/* New section for direct image link */}
                    <div className="w-full mb-4 text-center">
                      <p className="text-sm font-medium text-gray-700 mb-2">Lien direct vers l&apos;image:</p>
                      <div className="bg-gray-100 p-2 rounded flex items-center space-x-2">
                        <div className="truncate flex-1 text-xs text-gray-600">
                          {linkQR || 'Lien non disponible'}
                        </div>
                        <button
                          onClick={() => {
                            if (linkQR) {
                              navigator.clipboard.writeText(linkQR);
                              setSuccess("Lien copié!");
                              setTimeout(() => setSuccess(null), 2000);
                            }
                          }}
                          className="flex-shrink-0 p-1 text-gray-500 hover:text-gray-700 bg-white rounded-md"
                          title="Copier le lien"
                          disabled={!linkQR}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        </button>
                      </div>
                      <div className="mt-2">
                        <a 
                          href={linkQR} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Voir l&apos;image
                        </a>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 max-h-32 overflow-auto p-2 bg-gray-50 rounded w-full">
                      {project.privacy_notice || (
                        <>
                          <p className="font-bold">INFORMATION SUR LA PROTECTION DES DONNÉES (RGPD)</p>
                          <p>Photo générée via intelligence artificielle. Les images sont conservées 7 jours maximum.</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        <motion.div 
          className="w-full max-w-2xl mx-auto mt-[15vh] mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          {error && (
            <motion.div 
              className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {error}
            </motion.div>
          )}
          
          {success && (
            <motion.div 
              className="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {success}
            </motion.div>
          )}
          
          {/* Result Image Display */}
          {imageResultAI ? (
            <motion.div 
              className="relative mx-auto max-w-sm"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              <Image 
                src={imageResultAI}
                width={500} 
                height={750} 
                alt="Résultat"
                className="w-full rounded-lg shadow-lg" 
              />
            </motion.div>
          ) : (
            <motion.div 
              className="p-8 bg-white bg-opacity-10 rounded-lg text-white text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              Aucune image généré. Veuillez recommencer le processus.
            </motion.div>
          )}
          
          {/* Action Buttons */}
          <motion.div 
            className="mt-8 flex flex-col space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.1 }}
          >
            {imageResultAI && (
              <motion.button 
                onClick={handleShareWithDataCapture}
                disabled={loadingUpload}
                className={`py-3 rounded-lg font-bold text-center ${loadingUpload ? 'opacity-70' : ''}`}
                style={{ backgroundColor: secondaryColor, color: primaryColor }}
                whileHover={loadingUpload ? {} : { scale: 1.03 }}
                whileTap={loadingUpload ? {} : { scale: 0.97 }}
              >
                {loadingUpload ? 'PRÉPARATION...' : project?.datacapture ? 'ENVOYER MA PHOTO' : 'PARTAGER MA PHOTO'}
              </motion.button>
            )}
            
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Link 
                href={`/photobooth/${slug}`}
                onClick={handleStartOver}
                className="py-3 rounded-lg font-medium text-center bg-white bg-opacity-20 text-white w-full block"
              >
                RECOMMENCER
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
