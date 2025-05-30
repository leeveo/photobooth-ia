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
      // Call your email API
      const response = await fetch('/api/send-image-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          imageUrl: resultImage,
          projectName: project?.name || 'Photobooth Avatar'
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de l\'envoi de l\'email');
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
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {emailLoading ? 'Envoi en cours...' : 'Envoyer'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
