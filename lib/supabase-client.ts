import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/auth-helpers-nextjs';

// This variable holds the client instance once it's created
let supabaseClient: SupabaseClient | null = null;

// Function to safely get the Supabase client only on the client side
export const getSupabaseClient = () => {
  // Only create the client if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Create a new client if one doesn't exist yet
    if (!supabaseClient) {
      supabaseClient = createClientComponentClient();
    }
    return supabaseClient;
  }
  
  // Return a mock client for server-side rendering that won't cause serialization issues
  return {
    auth: {
      signUp: () => Promise.resolve({ data: null, error: new Error('Cannot use Supabase on the server') }),
      signIn: () => Promise.resolve({ data: null, error: new Error('Cannot use Supabase on the server') }),
      signOut: () => Promise.resolve({ error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    },
    from: () => ({
      select: () => ({ data: null, error: new Error('Cannot use Supabase on the server') }),
      insert: () => ({ data: null, error: new Error('Cannot use Supabase on the server') }),
      update: () => ({ data: null, error: new Error('Cannot use Supabase on the server') }),
      delete: () => ({ data: null, error: new Error('Cannot use Supabase on the server') }),
    }),
    rpc: () => Promise.resolve({ data: null, error: new Error('Cannot use Supabase on the server') }),
  } as unknown as SupabaseClient;
};
