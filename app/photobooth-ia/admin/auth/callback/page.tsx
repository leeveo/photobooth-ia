'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseClient } from '../../../../../lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Traitement de l\'authentification...');
  const [error, setError] = useState('');

  useEffect(() => {
    const processSupabaseCallback = async () => {
      try {
        const supabase = createSupabaseClient();
        
        const error_param = searchParams?.get('error');
        if (error_param) {
          setError(`Erreur: ${error_param}`);
          setTimeout(() => router.push('/photobooth-ia/admin/login'), 3000);
          return;
        }

        setStatus('Récupération de la session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          setError(`Erreur de session: ${sessionError.message}`);
          setTimeout(() => router.push('/photobooth-ia/admin/login'), 3000);
          return;
        }

        if (!session) {
          setError('Session non établie');
          setTimeout(() => router.push('/photobooth-ia/admin/login'), 3000);
          return;
        }

        const adminSession = {
          userId: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email,
          logged_in: true,
          login_method: 'supabase_google',
          access_token: session.access_token,
        };

        localStorage.setItem('admin_session', btoa(JSON.stringify(adminSession)));
        
        setStatus('Connexion réussie !');
        setTimeout(() => router.push('/photobooth-ia/admin/dashboard'), 1500);

      } catch (error: any) {
        setError(`Erreur: ${error.message}`);
        setTimeout(() => router.push('/photobooth-ia/admin/login'), 3000);
      }
    };

    if (searchParams) {
      processSupabaseCallback();
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Authentification Google
        </h2>
        <p className="text-gray-600 mb-4">{status}</p>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
