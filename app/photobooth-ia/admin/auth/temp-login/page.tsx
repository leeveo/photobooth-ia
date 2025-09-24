'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TempLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const router = useRouter();

  // Solution temporaire : Bypass OAuth avec mot de passe simple
  const handleTempLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      alert('Veuillez saisir un email');
      return;
    }

    setIsLoading(true);
    
    try {
      // Créer une session temporaire locale
      const tempSession = {
        user: {
          id: 'temp-' + Date.now(),
          email: email,
          name: email.split('@')[0],
          picture: 'https://via.placeholder.com/150'
        },
        timestamp: Date.now(),
        source: 'temp-bypass'
      };

      // Sauvegarder dans localStorage
      localStorage.setItem('admin_session', btoa(JSON.stringify(tempSession)));
      sessionStorage.setItem('admin_session', btoa(JSON.stringify(tempSession)));

      console.log('✅ Session temporaire créée:', tempSession);
      
      // Rediriger vers le dashboard
      router.push('/photobooth-ia/admin/dashboard');
      
    } catch (error) {
      console.error('❌ Erreur session temporaire:', error);
      alert('Erreur lors de la création de la session');
    } finally {
      setIsLoading(false);
    }
  };

  // Essayer OAuth Google quand même
  const handleGoogleLogin = () => {
    const clientId = '861872459075-0rddreeofg3us5falu78gpfp5qu5qr0q.apps.googleusercontent.com';
    const redirectUri = window.location.origin + '/photobooth-ia/admin/auth/callback';
    const scope = 'openid email profile';
    
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    
    console.log('🔗 Tentative OAuth (peut échouer):', oauthUrl);
    window.location.href = oauthUrl;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          PhotoBooth IA - Admin
        </h2>
        
        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {/* Solution temporaire */}
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">
              🚧 Accès temporaire (OAuth en cours de configuration)
            </h3>
            <form onSubmit={handleTempLogin}>
              <input
                type="email"
                placeholder="Votre email d'administration"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
              <button
                type="submit"
                disabled={isLoading}
                className="mt-3 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
              >
                {isLoading ? 'Connexion...' : '🔑 Accès temporaire'}
              </button>
            </form>
          </div>

          {/* OAuth Google (peut échouer) */}
          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Se connecter avec Google (peut échouer)
            </button>
          </div>

          <div className="mt-6 text-xs text-gray-500 text-center">
            <p>
              ⚠️ OAuth Google en cours de configuration.<br/>
              Utilisez l'accès temporaire en attendant.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}