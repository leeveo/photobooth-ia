'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GoogleOAuthService } from '../../../../../lib/googleOAuthService';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Traitement de l\'authentification...');
  const [error, setError] = useState('');

  useEffect(() => {
    const processOAuthCallback = async () => {
      console.log("🔄 Traitement du callback Google OAuth");
      
      try {
        const code = searchParams?.get('code');
        const error_param = searchParams?.get('error');
        const state = searchParams?.get('state');

        // Vérification des erreurs OAuth
        if (error_param) {
          console.error("❌ Erreur Google OAuth:", error_param);
          setError(`Erreur d'authentification: ${error_param}`);
          setTimeout(() => router.push('/photobooth-ia/admin/login'), 3000);
          return;
        }

        if (!code) {
          console.error("❌ Code d'autorisation manquant");
          setError('Code d\'autorisation manquant');
          setTimeout(() => router.push('/photobooth-ia/admin/login'), 3000);
          return;
        }

        console.log("✅ Code OAuth reçu");
        setStatus('Échange des informations avec Google...');

        // Échange du code pour les données utilisateur
        const result = await GoogleOAuthService.exchangeCodeForToken(code, state || undefined);

        if (result.success && result.user) {
          console.log("✅ Authentification réussie:", result.user.email);
          setStatus('Connexion réussie ! Redirection...');

          // Création de la session admin
          const adminSession = {
            userId: result.user.id,
            user_id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            picture: result.user.picture,
            company_name: result.user.email.split('@')[1] || 'Google',
            logged_in: true,
            login_method: 'google_oauth',
            login_time: new Date().toISOString(),
            access_token: result.token.access_token,
            verified_email: result.user.verified_email,
            session_id: `google_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };

          // Sauvegarde de la session (encodée en Base64 pour compatibilité)
          const sessionJson = JSON.stringify(adminSession);
          const encodedSession = btoa(sessionJson);
          
          localStorage.setItem('admin_session', encodedSession);
          sessionStorage.setItem('admin_session', encodedSession);
          
          console.log("✅ Session admin créée et sauvegardée (Base64)");

          // Redirection vers le dashboard
          setTimeout(() => {
            router.push('/photobooth-ia/admin/dashboard');
          }, 1500);

        } else {
          console.error("❌ Échec de l'authentification:", result);
          setError(result.error || 'Erreur lors de l\'authentification');
          setTimeout(() => router.push('/photobooth-ia/admin/login'), 3000);
        }

      } catch (error: any) {
        console.error("💥 Erreur callback OAuth:", error);
        setError(`Erreur technique: ${error.message}`);
        setTimeout(() => router.push('/photobooth-ia/admin/login'), 3000);
      }
    };

    if (searchParams) {
      processOAuthCallback();
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        {/* Logo ou icône */}
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-500 rounded-full flex items-center justify-center">
            {error ? (
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
          </div>
        </div>
        
        {/* Titre */}
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Authentification Google
        </h2>
        
        {/* Message de statut */}
        <p className="text-gray-600 mb-4">{status}</p>
        
        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}
        
        {/* Message informatif */}
        <div className="text-sm text-gray-500">
          {error ? 'Redirection vers la page de connexion...' : 'Veuillez patienter...'}
        </div>
      </div>
    </div>
  );
}