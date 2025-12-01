'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';

export default function ResultPage({ params }) {
  const { slug } = params;
  const supabase = createClientComponentClient();
  
  const [project, setProject] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(15);
  const [isEmailFormVisible, setIsEmailFormVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [rgpdAccepted, setRgpdAccepted] = useState(false);
  
  useEffect(() => {
    // Load project data from localStorage
    const cachedProject = localStorage.getItem('projectData');
    const resultImg = localStorage.getItem('avatarImageUrl');
    const originalImg = localStorage.getItem('faceImage');
    
    if (cachedProject) {
      try {
        const parsedProject = JSON.parse(cachedProject);
        setProject(parsedProject);
      } catch (e) {
        console.error("Error parsing cached project data:", e);
      }
    } else {
      // If no cached data, fetch from API
      fetchProjectData();
    }
    
    if (resultImg) {
      setResultImage(resultImg);
    }
    
    if (originalImg) {
      setOriginalImage(originalImg);
    }
    
    setLoading(false);
    
    // Start countdown for auto-redirect
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [fetchProjectData]);
  
  // Convert fetchProjectData to useCallback
  const fetchProjectData = useCallback(async () => {
    try {
      // Fetch project data by slug
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();
        
      if (error || !data) {
        console.error('Project not found or inactive:', error);
        return notFound();
      }
      
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      setError('Impossible de charger le projet');
    }
  }, [slug, supabase]);
  
  const sendEmail = async (e) => {
    e.preventDefault();
    
    if (!email || !resultImage) {
      setError('Email et image requis');
      return;
    }
    
    setEmailLoading(true);
    
    try {
      // Call the send-photo-email API with participant data
      const response = await fetch('/api/send-photo-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          project: project,
          imageUrl: resultImage,
          participantData: {
            email: email,
            name: '', // Pas de nom fourni dans cette interface
            firstname: '',
            lastname: ''
          }
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'envoi de l\'email');
      }
      
      // Log email to database
      try {
        await supabase.from('emails').insert({
          user_email: email,
          project_id: project?.id,
          image_url: resultImage
        });
      } catch (dbError) {
        console.error('Failed to log email to database:', dbError);
      }
      
      setEmailSent(true);
    } catch (err) {
      console.error('Error sending email:', err);
      setError('Erreur lors de l&apos;envoi de l&apos;email');
    } finally {
      setEmailLoading(false);
    }
  };
  
  // Download image directly from the browser
  const downloadImage = () => {
    if (!resultImage) return;
    
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `avatar-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Fonction pour ouvrir le popup d'impression
  const handlePrint = () => {
    setPrintCopies(1);
    setPrintSuccess(false);
    setPrintError(false);
    setShowPrintPopup(true);
  };
  
  // Fonction pour lancer l'impression
  const handleConfirmPrint = async () => {
    if (!resultImage || !project?.printer_enabled) return;
    
    setPrinting(true);
    setPrintError(false);
    
    try {
      // 1. Récupérer l'image depuis S3
      const imageResponse = await fetch(resultImage);
      const imageBlob = await imageResponse.blob();
      
      // 2. Créer le FormData pour le WCM Plus
      const formData = new FormData();
      formData.append('file', imageBlob, 'photo.jpg');
      formData.append('copies', String(printCopies));
      
      // 3. Envoyer directement au WCM Plus depuis le navigateur
      const printerUrl = `${project.printer_ip}${project.printer_endpoint || '/cgi-bin/print.cgi'}`;
      console.log('🖨️ Impression directe vers:', printerUrl);
      
      const printResponse = await fetch(printerUrl, {
        method: 'POST',
        body: formData,
        mode: 'no-cors',
      });
      
      console.log('✅ Requête envoyée à l\'imprimante');
      
      setPrintSuccess(true);
      setTimeout(() => {
        setShowPrintPopup(false);
        setPrintSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Erreur impression:', error);
      setPrintError(true);
    } finally {
      setPrinting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-500">
        {error}
      </div>
    );
  }
  
  if (!resultImage) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col">
        <p className="text-red-500 mb-4">Aucun résultat trouvé</p>
        <Link 
          href={`/photobooth-avatar/${slug}`}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }
  
  // Dynamic styles based on project colors
  const primaryColor = project?.primary_color || '#811A53';
  const secondaryColor = project?.secondary_color || '#E5E40A';

  return (
    <main 
      className="min-h-screen py-12 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Logo or title */}
        <div className="flex justify-center mb-8">
          {project?.logo_url ? (
            <Image 
              src={project.logo_url} 
              width={300} 
              height={100} 
              alt={project.name} 
              className="max-w-xs w-full"
            />
          ) : (
            <h1 className="text-3xl font-bold text-white">{project?.name || 'Photobooth Avatar'}</h1>
          )}
        </div>
        
        <h2 
          className="text-2xl sm:text-4xl font-bold text-center mb-8"
          style={{ color: secondaryColor }}
        >
          Votre avatar est prêt !
        </h2>
        
        <div className="flex flex-col md:flex-row gap-6 items-center justify-center mb-8">
          {/* Before image (original) */}
          {originalImage && (
            <div className="w-full max-w-xs">
              <div className="aspect-square relative overflow-hidden rounded-lg">
                <Image
                  src={originalImage}
                  fill
                  style={{ objectFit: "cover" }}
                  alt="Original photo"
                  className="rounded-lg shadow-lg"
                  priority
                />
              </div>
              <p className="text-white text-center mt-2">Photo originale</p>
            </div>
          )}
          
          {/* Arrow or divider */}
          <div className="text-white text-3xl mx-4">➡️</div>
          
          {/* After image (AI result) */}
          <div className="w-full max-w-xs">
            <div className="aspect-square relative overflow-hidden rounded-lg">
              <Image
                src={resultImage}
                fill
                style={{ objectFit: "cover" }}
                alt="Your avatar"
                className="rounded-lg shadow-lg"
                priority
              />
            </div>
            <p className="text-white text-center mt-2">Votre avatar</p>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <button
            onClick={downloadImage}
            className="px-4 py-2 rounded font-medium"
            style={{ backgroundColor: secondaryColor, color: primaryColor }}
          >
            Télécharger
          </button>
          
          {project?.printer_enabled && (
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded font-medium flex items-center gap-2"
              style={{ backgroundColor: secondaryColor, color: primaryColor }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                <path d="M6 14h12v8H6z"/>
              </svg>
              Imprimer
            </button>
          )}
          
          <button
            onClick={() => setIsEmailFormVisible(!isEmailFormVisible)}
            className="px-4 py-2 rounded font-medium bg-white text-gray-800"
          >
            Recevoir par email
          </button>
          
          <Link
            href={`/photobooth-avatar/${slug}`}
            className="px-4 py-2 rounded font-medium bg-white bg-opacity-30 text-white"
          >
            Nouvelle photo ({countdown}s)
          </Link>
        </div>
        
        {/* Email form */}
        {isEmailFormVisible && (
          <div className="bg-white bg-opacity-90 p-6 rounded-lg max-w-md mx-auto">
            {emailSent ? (
              <div className="text-center text-green-600">
                <p>Email envoyé avec succès à {email}!</p>
              </div>
            ) : (
              <>
                {/* Affichage du texte RGPD du projet */}
                {project?.rgpd_text && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
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
                
                <form onSubmit={sendEmail} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Adresse email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="votre@email.com"
                      required
                    />
                  </div>
                  
                  {/* Checkbox RGPD */}
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="rgpd"
                      checked={rgpdAccepted}
                      onChange={(e) => setRgpdAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <label htmlFor="rgpd" className="ml-3 text-sm text-gray-700 leading-relaxed">
                      J'accepte les conditions de traitement de mes données personnelles selon les conditions énoncées ci-dessus <span className="text-red-500">*</span>
                    </label>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={emailLoading || !rgpdAccepted}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: rgpdAccepted ? primaryColor : '#d1d5db' }}
                  >
                    {emailLoading ? 'Envoi en cours...' : 'Envoyer'}
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Print Popup Modal */}
      {showPrintPopup && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => !printing && !printSuccess && setShowPrintPopup(false)}
        >
          <div 
            className="relative max-w-lg w-full p-12 rounded-3xl shadow-2xl"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            {!printing && !printSuccess && (
              <button
                onClick={() => setShowPrintPopup(false)}
                className="absolute top-6 right-6 p-3 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            {/* Icon Container */}
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(107, 114, 128, 0.1)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                  <path d="M6 14h12v8H6z"/>
                </svg>
              </div>
            </div>
            
            {/* Content */}
            {printSuccess ? (
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-3">Impression lancée !</h3>
                <p className="text-lg text-gray-600">Votre photo va sortir dans quelques instants</p>
              </div>
            ) : printError ? (
              <div className="text-center">
                <h3 className="text-3xl font-bold text-gray-800 mb-3">Oops !</h3>
                <p className="text-lg text-gray-600 mb-6">L'imprimante a un problème</p>
                <p className="text-lg text-gray-700 font-medium">Envoyez votre photo plutôt par email</p>
              </div>
            ) : printing ? (
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <div className="animate-spin rounded-full h-20 w-20 border-4 border-gray-300 border-t-gray-600"></div>
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-3">Impression en cours...</h3>
                <p className="text-lg text-gray-600">Veuillez patienter</p>
              </div>
            ) : (
              <>
                <h3 className="text-3xl font-bold text-center text-gray-800 mb-8">Nombre de copies</h3>
                
                <div className="flex items-center justify-center gap-8 mb-10">
                  <button
                    onClick={() => setPrintCopies(Math.max(1, printCopies - 1))}
                    disabled={printCopies <= 1}
                    className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: printCopies > 1 ? 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)' : '#e5e7eb',
                      color: 'white',
                      boxShadow: printCopies > 1 ? '0 4px 15px rgba(107, 114, 128, 0.3)' : 'none'
                    }}
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                    </svg>
                  </button>
                  
                  <div className="w-32 text-center">
                    <span className="text-7xl font-bold text-gray-800">{printCopies}</span>
                  </div>
                  
                  <button
                    onClick={() => setPrintCopies(Math.min(5, printCopies + 1))}
                    disabled={printCopies >= 5}
                    className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: printCopies < 5 ? 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)' : '#e5e7eb',
                      color: 'white',
                      boxShadow: printCopies < 5 ? '0 4px 15px rgba(107, 114, 128, 0.3)' : 'none'
                    }}
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                
                <button
                  onClick={handleConfirmPrint}
                  className="w-full py-6 px-8 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)',
                    color: 'white',
                    boxShadow: '0 6px 20px rgba(107, 114, 128, 0.4)'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                    <path d="M6 14h12v8H6z"/>
                  </svg>
                  Lancer l'impression
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
