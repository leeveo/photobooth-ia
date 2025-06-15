'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '/lib/supabaseClient';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        router.push('/photobooth-ia/admin/dashboard');
      } else {
        router.push('/photobooth-ia/admin/login');
      }
    };

    checkAuth();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center text-white bg-black">
      <p>Connexion en cours...</p>
    </div>
  );
}
