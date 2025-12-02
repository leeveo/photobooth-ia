import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Suppress specific Supabase cookie parsing errors (legacy cookies)
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Filtrer l'erreur spécifique de parsing de cookie Supabase
    const isCookieError = args.some(arg => {
      if (typeof arg === 'string') return arg.includes('Failed to parse cookie string');
      if (arg instanceof Error) return arg.message && arg.message.includes('Failed to parse cookie string');
      return false;
    });

    if (isCookieError) return;
    
    originalConsoleError.apply(console, args);
  };
}

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
        // 'Accept': 'application/json', // Retiré pour éviter l'erreur 406
      },
    },
  };

  // 🌍 Forcer le site_url correct en production
  if (process.env.NODE_ENV === 'production') {
    clientOptions.auth.flowType = 'pkce';
    // Forcer l'URL de base pour éviter localhost
    if (typeof window !== 'undefined') {
      clientOptions.auth.redirectTo = `https://photobooth.waibooth.app/photobooth-ia/admin/auth/callback`;
    }
  }

  // Correct usage of createClientComponentClient
  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey,
    options: clientOptions
  });
  
  return supabase;
}
