import { createClient } from '@supabase/supabase-js';

// Initialiser Supabase avec les clés publiques et l'URL du projet
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Les variables d\'environnement SUPABASE_URL et SUPABASE_ANON_KEY doivent être définies');
}

// Créer le client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);