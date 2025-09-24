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
        console.log("🌐 Environment détecté:", process.env.NODE_ENV);
        console.log("🔗 Origin:", window.location.origin);
        console.log("🏠 Hostname:", window.location.hostname);
        
        setStatus('Échange du code contre un token...');

        const redirectUri = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE 
          ? `${process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE}/photobooth-ia/admin/auth/callback`
          : `${window.location.origin}/photobooth-ia/admin/auth/callback`;
          
        console.log("🔗 Redirect URI utilisé:", redirectUri);
        
        // Utiliser la nouvelle API simplifiée
        console.log("� Appel API token-exchange...");
        const tokenResponse = await fetch('/api/auth/google-token-exchange', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirect_uri: redirectUri
          })
        });

        console.log("📡 Réponse API token-exchange:", tokenResponse.status, tokenResponse.statusText);

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error("❌ Erreur API token-exchange:", errorText);
          
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { error: errorText };
          }
          
          setError(errorData.error || "Erreur lors de l'échange du token");
          return;
        }

        const tokenData = await tokenResponse.json();
        console.log("✅ Token exchange réussi:", tokenData.access_token ? 'TOKEN PRÉSENT' : 'TOKEN MANQUANT');

        if (!tokenData.success || !tokenData.access_token) {
          console.error("❌ Token manquant dans la réponse");
          setError("Token d'accès manquant");
          return;
        }

        // Récupérer les données utilisateur avec le token
        console.log("👤 Récupération données utilisateur...");
        const userResponse = await fetch(
          `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`,
          {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`
            }
          }
        );

        console.log("� Réponse user Google:", userResponse.status, userResponse.statusText);

        if (!userResponse.ok) {
          const userErrorText = await userResponse.text();
          console.error("❌ Erreur données utilisateur:", userErrorText);
          setError(`Erreur lors de la récupération des données utilisateur: ${userErrorText}`);
          return;
        }

        const userData = await userResponse.json();
        console.log("✅ Données utilisateur récupérées:", userData.email);

        // Créer l'objet résultat
        const result = {
          success: true,
          adminData: {
            success: true,
            user_id: userData.id,
            email: userData.email,
            company_name: userData.name || 'Google User',
            message: 'OAuth direct réussi'
          },
          userData: {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            picture: userData.picture
          }
        };

        if (!result.success) {
          console.error("❌ Échec OAuth: structure inattendue");
          setError("Erreur lors de l'authentification");
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
          
          // Vérifier les permissions de stockage
          console.log("🔒 Test permissions stockage:");
          try {
            localStorage.setItem('test_storage', 'test');
            localStorage.removeItem('test_storage');
            console.log("  - localStorage: ✅ AUTORISÉ");
          } catch (e) {
            console.error("  - localStorage: ❌ BLOQUÉ", e);
          }
          
          try {
            sessionStorage.setItem('test_storage', 'test');
            sessionStorage.removeItem('test_storage');
            console.log("  - sessionStorage: ✅ AUTORISÉ");
          } catch (e) {
            console.error("  - sessionStorage: ❌ BLOQUÉ", e);
          }
          
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
          const storedSessionStorage = sessionStorage.getItem('admin_session');
          const cookieSession = document.cookie.includes('admin_session=');
          
          console.log("🔍 Vérification stockage:");
          console.log("  - localStorage:", storedSession ? 'PRÉSENT' : 'ABSENT');
          console.log("  - sessionStorage:", storedSessionStorage ? 'PRÉSENT' : 'ABSENT');
          console.log("  - cookie:", cookieSession ? 'PRÉSENT' : 'ABSENT');
          
          if (!storedSession && !storedSessionStorage && !cookieSession) {
            console.error("❌ AUCUNE SESSION STOCKÉE - PROBLÈME CRITIQUE");
            setError("Erreur de stockage de session. Veuillez réessayer.");
            return;
          }
          
          setStatus('Connexion réussie ! Redirection vers le tableau de bord...');
          
          // Redirection avec loader fluide
          console.log("🚀 Redirection vers dashboard...");
          
          // Attendre un délai réduit mais suffisant pour que le stockage soit effectif
          setTimeout(() => {
            console.log("🚀 Redirection vers dashboard maintenant...");
            
            // Vérifier une dernière fois que la session est bien stockée avant la redirection
            const finalSessionCheck = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
            if (finalSessionCheck) {
              console.log("✅ Session confirmée avant redirection");
              // Utiliser le router Next.js au lieu de window.location pour une redirection plus fluide
              router.push('/photobooth-ia/admin/dashboard');
            } else {
              console.error("❌ Session non trouvée avant redirection - retry stockage");
              // Réessayer le stockage
              localStorage.setItem('admin_session', encodedSession);
              sessionStorage.setItem('admin_session', encodedSession);
              // Redirection de secours
              setTimeout(() => {
                router.push('/photobooth-ia/admin/dashboard');
              }, 1000);
            }
          }, 1500); // Délai réduit à 1.5 secondes
          
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
              {/* Logo et animation de chargement améliorée */}
              <div className="mb-6">
                <div className="relative">
                  {/* Cercles animés */}
                  <div className="absolute inset-0 animate-spin">
                    <div className="w-20 h-20 border-4 border-transparent border-t-white border-r-white rounded-full mx-auto"></div>
                  </div>
                  <div className="absolute inset-2 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}>
                    <div className="w-16 h-16 border-3 border-transparent border-b-purple-300 border-l-purple-300 rounded-full mx-auto"></div>
                  </div>
                  {/* Icône Google au centre */}
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold mb-4">Connexion avec Google</h2>
              
              {/* Barre de progression */}
              <div className="w-full bg-white/20 rounded-full h-2 mb-4 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-400 to-indigo-400 h-full rounded-full animate-pulse"></div>
              </div>
              
              <p className="text-white/90 font-medium">{status}</p>
              
              {/* Étapes de progression */}
              <div className="mt-6 text-sm text-white/70">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Vérification Google ✓</span>
                </div>
                <div className="flex items-center justify-center space-x-2 mt-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span>Création de session...</span>
                </div>
              </div>
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