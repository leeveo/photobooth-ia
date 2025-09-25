'use client';
import { useState, useEffect } from 'react';
import { createSupabaseClient } from '../../../lib/supabaseClient';

export default function OAuthDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const analyzeConfiguration = async () => {
      const supabase = createSupabaseClient();
      const currentUrl = window.location.origin;
      
      const config = {
        currentDomain: currentUrl,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        expectedCallbacks: [
          `${currentUrl}/photobooth-ia/admin/auth/callback`,
          `https://gyohqmahwntkmebayeej.supabase.co/auth/v1/callback`
        ],
        googleOAuthConfig: {
          clientId: '861872459075-0rddreeofg3us5falu78gpfp5qu5qr0q.apps.googleusercontent.com',
          requiredOrigins: [
            currentUrl,
            'https://gyohqmahwntkmebayeej.supabase.co'
          ],
          requiredRedirects: [
            `${currentUrl}/photobooth-ia/admin/auth/callback`,
            `https://gyohqmahwntkmebayeej.supabase.co/auth/v1/callback`
          ]
        },
        supabaseAuthFlow: {
          redirectTo: `${currentUrl}/photobooth-ia/admin/auth/callback`,
          provider: 'google'
        }
      };

      setDebugInfo(config);
    };

    analyzeConfiguration();
  }, []);

  const testGoogleAuth = async () => {
    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/photobooth-ia/admin/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        alert(`Erreur OAuth: ${error.message}`);
      } else {
        alert('Redirection vers Google...');
      }
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  if (!debugInfo) {
    return <div className="p-8">Chargement de la configuration...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Configuration OAuth Google + Supabase</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">🎯 Actions Requises Google Console</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-800">1. Origines JavaScript autorisées:</h3>
              <div className="bg-gray-100 p-3 rounded mt-2">
                {debugInfo.googleOAuthConfig.requiredOrigins.map((origin: string, index: number) => (
                  <div key={index} className="font-mono text-sm">{origin}</div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-800">2. URI de redirection autorisés:</h3>
              <div className="bg-gray-100 p-3 rounded mt-2">
                {debugInfo.googleOAuthConfig.requiredRedirects.map((redirect: string, index: number) => (
                  <div key={index} className="font-mono text-sm">{redirect}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">⚙️ Configuration Actuelle</h2>
          <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">🧪 Test OAuth</h2>
          <button 
            onClick={testGoogleAuth}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded"
          >
            Tester l'authentification Google
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <h3 className="font-medium text-yellow-800 mb-2">📋 Instructions</h3>
          <ol className="text-yellow-700 text-sm space-y-1 list-decimal list-inside">
            <li>Allez sur <a href="https://console.developers.google.com" target="_blank" className="underline">Google Console</a></li>
            <li>Sélectionnez votre projet OAuth</li>
            <li>Dans "Identifiants", cliquez sur votre Client ID OAuth 2.0</li>
            <li>Ajoutez les origines et redirections ci-dessus</li>
            <li>Sauvegardez et testez</li>
          </ol>
        </div>
      </div>
    </div>
  );
}