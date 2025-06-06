import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function createSupabaseClient() {
  const supabase = createClientComponentClient();
  
  // Capture la requête originale
  const originalFetch = global.fetch;
  
  // Remplacer fetch globalement pour déboguer et corriger les erreurs 406
  global.fetch = async (url, options = {}) => {
    // Ne modifie que les requêtes vers Supabase
    if (url.includes('supabase.co')) {
      console.log('Intercepting Supabase request:', url);
      
      // Assurer que les en-têtes sont correctement définis
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      };
      
      // Si l'URL contient project_settings, on ajoute un log spécifique
      if (url.includes('project_settings')) {
        console.log('Project settings request detected, headers:', options.headers);
      }
    }
    
    // Passer la requête modifiée à fetch original
    return originalFetch(url, options);
  };
  
  return supabase;
}
