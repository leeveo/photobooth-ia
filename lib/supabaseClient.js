import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function createSupabaseClient() {
  // 🔧 Configuration forcée pour production
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gyohqmahwntkmebayeej.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Configuration d'options personnalisées
  const clientOptions = {
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
    clientOptions.auth.flowType = 'pkce';
    // Forcer l'URL de base pour éviter localhost
    if (typeof window !== 'undefined') {
      clientOptions.auth.redirectTo = `https://photobooth.waibooth.app/photobooth-ia/admin/auth/callback`;
      console.log("🔧 Supabase config forcée - redirectTo:", clientOptions.auth.redirectTo);
    }
  }

  // Correct usage of createClientComponentClient
  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey,
    options: clientOptions
  });
  
  console.log("✅ Supabase client créé avec URL:", supabaseUrl);
  
  return supabase;
}
