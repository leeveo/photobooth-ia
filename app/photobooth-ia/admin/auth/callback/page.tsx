'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Traitement OAuth Google...');
  const [error, setError] = useState('');

  useEffect(() => {
    const processOAuth = async () => {
      console.log("🚀 CALLBACK OAUTH SIMPLIFIÉ - UTILISATION API GOOGLE-OAUTH");
      
      try {
        const code = searchParams?.get('code');
        const error_param = searchParams?.get('error');

        // Gestion des erreurs OAuth
        if (error_param) {
          console.error("❌ Erreur OAuth:", error_param);
          setError(`Erreur Google: ${error_param}`);
          setTimeout(() => router.push('/photobooth-ia/admin/login'), 3000);
          return;
        }

        if (!code) {
          console.error("❌ Code OAuth manquant");
          setError('Code d\'autorisation manquant');
          setTimeout(() => router.push('/photobooth-ia/admin/login'), 3000);
          return;
        }

        console.log("✅ Code OAuth reçu, longueur:", code.length);
        setStatus('Échange avec Google...');

        // 🎯 UTILISATION DE L'API GOOGLE-OAUTH EXISTANTE (plus robuste)
        const redirectUri = `${window.location.origin}/photobooth-ia/admin/auth/callback`;
        
        console.log("🔗 Appel API google-oauth...");
        console.log("📍 URL:", '/api/auth/google-oauth');
        console.log("📦 Payload:", { code: code.substring(0, 10) + '...', redirect_uri: redirectUri });
        
        const response = await fetch('/api/auth/google-oauth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: code,
            redirect_uri: redirectUri
          })
        });

        console.log("📡 Réponse API status:", response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error("❌ Erreur API:", errorData);
          setError(`Erreur serveur: ${errorData.error}`);
          setTimeout(() => router.push('/photobooth-ia/admin/login'), 3000);
          return;
        }

        const data = await response.json();
        console.log("✅ Réponse API reçue:", data);

        if (data.success && data.userData) {
          const userData = data.userData;
          const adminData = data.adminData;
          
          console.log("🎉 DONNÉES UTILISATEUR RÉELLES:", userData.email);
          console.log("👤 Données admin:", adminData);
          
          // Créer session avec vraies données
          const session = {
            userId: adminData?.id || userData.id,
            user_id: adminData?.id || userData.id,
            email: userData.email, // EMAIL RÉEL DE N'IMPORTE QUEL UTILISATEUR
            name: userData.name || 'Utilisateur Google',
            company_name: userData.name || 'Google User',
            logged_in: true,
            login_method: 'google_oauth_api',
            login_time: new Date().toISOString(),
            profile_picture: userData.picture,
            verified_email: true,
            admin_data: adminData,
            session_id: `oauth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          
          console.log("🚀 SESSION UNIVERSELLE CRÉÉE:", session.email);
          
          // Sauvegarder dans tous les stockages
          const sessionJson = JSON.stringify(session);
          localStorage.setItem('photoboothia_session', sessionJson);
          sessionStorage.setItem('photoboothia_session', sessionJson);
          document.cookie = `photoboothia_session=${sessionJson}; path=/; max-age=86400`;
          
          console.log("✅ Session sauvegardée:", session.email);
          console.log("🆔 Session ID:", session.session_id);
          
          setStatus(`Connexion réussie avec ${userData.email}!`);
          
          // Redirection vers dashboard
          setTimeout(() => {
            console.log("🔀 Redirection vers dashboard");
            router.push('/photobooth-ia/admin/dashboard');
          }, 1000);
          
        } else {
          console.error("❌ Réponse API invalide:", data);
          setError('Réponse serveur invalide');
          setTimeout(() => router.push('/photobooth-ia/admin/login'), 3000);
        }

      } catch (error: any) {
        console.error("💥 Erreur callback OAuth:", error);
        setError(`Erreur: ${error.message}`);
        setTimeout(() => router.push('/photobooth-ia/admin/login'), 3000);
      }
    };

    processOAuth();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Connexion Google
        </h2>
        
        <p className="text-gray-600 mb-4">{status}</p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="text-sm text-gray-500">
          Finalisation de l'authentification...
        </div>
      </div>
    </div>
  );
}