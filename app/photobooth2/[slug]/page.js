'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';

export default function PhotoboothRedirect({ params }) {
  const slug = params.slug;
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    async function redirectBasedOnType() {
      try {
        // Récupérer le type de photobooth pour ce projet
        const { data: project, error } = await supabase
          .from('projects')
          .select('photobooth_type')
          .eq('slug', slug)
          .single();
        
        if (error || !project) {
          return notFound();
        }
        
        // Rediriger vers le bon type de photobooth
        if (project.photobooth_type === 'prompt') {
          router.replace(`/photobooth2/${slug}`);
        } else {
          // Continuer avec le photobooth standard
          router.push(`/photobooth/${slug}/how`);
        }
      } catch (error) {
        console.error('Erreur lors de la redirection:', error);
        return notFound();
      }
    }
    
    redirectBasedOnType();
  }, [slug, router, supabase]);
  
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}