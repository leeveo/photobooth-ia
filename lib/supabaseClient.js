import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function createSupabaseClient() {
  // 🔧 Configuration forcée pour production
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gyohqmahwntkmebayeej.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Configuration d'options personnalisées
  const options = {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    },
  };

  // 🌍 Forcer le site_url correct en production
  if (process.env.NODE_ENV === 'production') {
    options.auth.flowType = 'pkce';
    // Forcer l'URL de base pour éviter localhost
    if (typeof window !== 'undefined') {
      options.auth.redirectTo = `https://photobooth.waibooth.app/photobooth-ia/admin/auth/callback`;
      console.log("🔧 Supabase config forcée - redirectTo:", options.auth.redirectTo);
    }
  }

  const supabase = createClientComponentClient(options);
  
  // Capture la requête originale
  const originalFetch = global.fetch;
  
  // Remplacer fetch globalement pour déboguer et corriger les erreurs 406
  global.fetch = async (url, options = {}) => {
    // Vérification de sécurité : s'assurer que url est une chaîne
    if (typeof url === 'string' && url.includes('supabase.co')) {
      console.log('🔍 Intercepting Supabase request:', url);
      
      // Assurer que les en-têtes sont correctement définis
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'apikey': supabaseKey,
      };
      
      // Forcer l'origine en production
      if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
        options.headers['Origin'] = 'https://photobooth.waibooth.app';
        options.headers['Referer'] = 'https://photobooth.waibooth.app';
      }
      
      // Si l'URL contient project_settings, on ajoute un log spécifique
      if (url.includes('project_settings')) {
        console.log('Project settings request detected, headers:', options.headers);
      }
    }
    
    // Passer la requête modifiée à fetch original
    return originalFetch(url, options);
  };
  
  console.log("✅ Supabase client créé avec URL:", supabaseUrl);
  console.log("🔑 Clé API configurée:", supabaseKey ? 'OUI' : 'NON');
  
  return supabase;
}
