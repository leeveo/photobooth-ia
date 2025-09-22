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
        console.log("🔄 Début du traitement callback OAuth");
        console.log("📍 URL actuelle:", window.location.href);
        console.log("🔍 SearchParams:", searchParams?.toString());
        
        // Récupérer le code d'autorisation depuis les paramètres URL
        const code = searchParams?.get('code');
        const error_param = searchParams?.get('error');

        console.log("📝 Code reçu:", code);
        console.log("❌ Erreur reçue:", error_param);

        if (error_param) {
          setError(`Erreur d'autorisation: ${error_param}`);
          return;
        }

        if (!code) {
          console.log("❌ Aucun code d'autorisation trouvé");
          setError("Code d'autorisation manquant. Veuillez réessayer.");
          setTimeout(() => {
            router.push('/photobooth-ia/admin/login');
          }, 3000);
          return;
        }

        console.log("✅ Code d'autorisation valide, échange en cours...");
        setStatus('Échange du code contre un token...');

        // Utiliser notre API custom pour échanger le code
        const response = await fetch('/api/auth/google-oauth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirect_uri: window.location.hostname === 'localhost' 
              ? 'http://localhost:3000/photobooth-ia/admin/auth/callback' // HTTP temporaire
              : 'https://photobooth.waibooth.app/photobooth-ia/admin/auth/callback'
          })
        });

        console.log("📡 Réponse API OAuth:", response.status, response.statusText);

        if (!response.ok) {
          const errorData = await response.json();
          console.error("❌ Erreur API OAuth:", errorData);
          setError(errorData.error || "Erreur lors de l'authentification");
          return;
        }

        const result = await response.json();
        console.log("✅ Résultat API OAuth:", result);

        if (!result.success) {
          console.error("❌ Échec OAuth:", result.error);
          setError(result.error || "Erreur lors de l'authentification");
          return;
        }

        console.log("🎯 Données admin reçues:", result.adminData);
        setStatus('Création de la session administrateur...');

        if (result.adminData?.success) {
          console.log("🎉 Création session admin pour:", result.adminData);
          
          // Créer la session admin comme pour la connexion classique
          const sessionData = {
            userId: result.adminData.user_id,
            email: result.adminData.email,
            company_name: result.adminData.company_name || '',
            logged_in: true,
            login_method: 'google_custom',
            login_time: new Date().toISOString(),
            google_id: result.userData.id
          };
          
          console.log("💾 Données session à créer:", sessionData);
          
          // Encodage en base64 pour être stocké dans un cookie
          const encodedSession = btoa(JSON.stringify(sessionData));
          
          // Stocker en localStorage, sessionStorage ET cookie
          localStorage.setItem('admin_session', encodedSession);
          sessionStorage.setItem('admin_session', encodedSession);
          
          // Définir un cookie avec une durée de 24 heures
          document.cookie = `admin_session=${encodedSession}; path=/; max-age=86400; SameSite=Lax`;
          
          console.log("✅ Session admin Google custom créée et stockée");
          console.log("🍪 Cookie défini:", document.cookie);
          
          // Vérifier que le stockage a fonctionné
          const storedSession = localStorage.getItem('admin_session');
          console.log("🔍 Vérification stockage:", storedSession ? 'SUCCESS' : 'FAILED');
          
          setStatus('Connexion réussie ! Redirection vers le tableau de bord...');
          
          // Forcer une redirection immédiate et complète
          console.log("🚀 Redirection immédiate vers dashboard...");
          
          // Utiliser replace au lieu de href pour éviter l'historique
          window.location.replace('/photobooth-ia/admin/dashboard');
          
        } else {
          console.error("❌ Échec création profil admin:", result.adminData);
          setError(result.adminData?.message || "Erreur lors de la création/connexion du compte admin");
        }

      } catch (err) {
        console.error("Erreur générale dans callback:", err);
        setError(`Une erreur inattendue s'est produite: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  // Fonction pour revenir à la page de connexion
  const handleBackToLogin = () => {
    router.push('/photobooth-ia/admin/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 to-indigo-600 text-white">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-8 text-center">
          {!error ? (
            <>
              {/* Spinner de chargement */}
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-6"></div>
              <h2 className="text-2xl font-bold mb-4">Connexion Google</h2>
              <p className="text-white/80">{status}</p>
            </>
          ) : (
            <>
              {/* Icône d'erreur */}
              <div className="mx-auto mb-6 w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4 text-red-400">Erreur de connexion</h2>
              <p className="text-white/80 mb-6">{error}</p>
              <button
                onClick={handleBackToLogin}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                Retour à la connexion
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}