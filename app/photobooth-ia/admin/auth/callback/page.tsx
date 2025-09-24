'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Traitement de la connexion...');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log("🔄 Callback OAuth simple démarré");
        
        // Récupérer le code
        const code = searchParams?.get('code');
        const error_param = searchParams?.get('error');

        console.log("📝 Code:", code ? 'PRÉSENT' : 'ABSENT');
        console.log("❌ Erreur:", error_param);

        if (error_param) {
          setError(`Erreur d'autorisation: ${error_param}`);
          return;
        }

        if (!code) {
          setError("Code d'autorisation manquant");
          setTimeout(() => router.push('/photobooth-ia/admin/login'), 3000);
          return;
        }

        setStatus('Échange du token...');
        console.log("🔄 Échange du token...");

        // Appel API ultra-simple avec logging détaillé
        console.log("📡 Calling API with code length:", code?.length);
        console.log("📡 Origin:", window.location.origin);
        console.log("📡 Full API URL:", `${window.location.origin}/api/auth/google-token-exchange`);
        
        let response;
        try {
          response = await fetch('/api/auth/google-token-exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              redirect_uri: `${window.location.origin}/photobooth-ia/admin/auth/callback`
            })
          });
        } catch (fetchError) {
          console.error("💥 Fetch Error:", fetchError);
          console.error("💥 Fetch Error Name:", fetchError instanceof Error ? fetchError.name : 'Unknown');
          console.error("💥 Fetch Error Message:", fetchError instanceof Error ? fetchError.message : String(fetchError));
          setError(`Erreur réseau: ${fetchError instanceof Error ? fetchError.message : 'Erreur de connexion'}`);
          return;
        }

        console.log("📡 Réponse API:", response.status);
        console.log("📡 Réponse OK:", response.ok);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Erreur API:", response.status, response.statusText);
          console.error("❌ Détail erreur:", errorText);
          setError("Erreur lors de l'échange du token");
          return;
        }

        const tokenResult = await response.json();
        console.log("✅ Token reçu:", tokenResult.success);

        if (!tokenResult.success) {
          setError("Échec de l'échange du token");
          return;
        }

        setStatus('Récupération des données utilisateur...');
        
        // Récupération des données utilisateur
        const userResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenResult.access_token}`);
        
        if (!userResponse.ok) {
          setError("Erreur lors de la récupération des données utilisateur");
          return;
        }

        const userData = await userResponse.json();
        console.log("👤 Utilisateur:", userData.email);

        setStatus('Création de la session...');

        // Création de la session simple
        const sessionData = {
          userId: userData.id,
          user_id: userData.id, // Compatibilité
          email: userData.email,
          company_name: userData.name || 'Google User',
          logged_in: true,
          login_method: 'google_simple',
          login_time: new Date().toISOString()
        };

        // Stockage simple
        const encodedSession = btoa(JSON.stringify(sessionData));
        
        localStorage.setItem('admin_session', encodedSession);
        sessionStorage.setItem('admin_session', encodedSession);
        document.cookie = `admin_session=${encodedSession}; path=/; max-age=86400`;

        console.log("✅ Session créée et stockée");

        setStatus('Connexion réussie ! Redirection...');
        
        // Redirection simple
        setTimeout(() => {
          router.push('/photobooth-ia/admin/dashboard');
        }, 1500);

      } catch (err) {
        console.error("💥 Erreur callback:", err);
        setError(`Erreur: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 to-indigo-600 text-white">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-8 text-center">
          {!error ? (
            <>
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
              
              <h2 className="text-xl font-bold mb-4">Connexion Google</h2>
              <p className="text-white/90">{status}</p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-6 w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-4 text-red-400">Erreur</h2>
              <p className="text-white/80 mb-6">{error}</p>
              <button
                onClick={() => router.push('/photobooth-ia/admin/login')}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded"
              >
                Retour
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}