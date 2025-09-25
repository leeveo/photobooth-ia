'use client';
import { useState, useEffect } from 'react';
import { createSupabaseClient } from '../../../lib/supabaseClient'

export default function SupabaseDiagnosticPage() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    const runDiagnostics = async () => {
      const supabase = createSupabaseClient();
      const currentUrl = window.location.origin;
      
      const config = {
        environment: process.env.NODE_ENV,
        currentDomain: currentUrl,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configuré' : 'MANQUANT',
        redirectUri: `${currentUrl}/photobooth-ia/admin/auth/callback`,
        expectedProdDomain: 'https://photobooth.waibooth.app',
        supabaseCallbackUrl: 'https://gyohqmahwntkmebayeej.supabase.co/auth/v1/callback',
        
        // Test de configuration
        configurationIssues: [] as string[],
        
        // Test de session actuelle
        currentSession: null as any
      };

      // Vérifier les problèmes de configuration
      if (currentUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
        config.configurationIssues.push("🚨 PROBLÈME: URL localhost détectée en production");
      }
      
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        config.configurationIssues.push("🚨 PROBLÈME: NEXT_PUBLIC_SUPABASE_URL manquant");
      }
      
      if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        config.configurationIssues.push("🚨 PROBLÈME: NEXT_PUBLIC_SUPABASE_ANON_KEY manquant");
      }

      // Test session actuelle
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        config.currentSession = {
          hasSession: !!session,
          error: error?.message,
          userId: session?.user?.id,
          email: session?.user?.email
        };
      } catch (err: any) {
        config.currentSession = {
          hasSession: false,
          error: err.message
        };
      }

      setDiagnostics(config);
    };

    runDiagnostics();
  }, []);

  const testGoogleOAuth = async () => {
    setTestResult({ status: 'testing', message: 'Test en cours...' });
    
    try {
      const supabase = createSupabaseClient();
      console.log("🧪 Test OAuth Google Supabase");
      
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
        setTestResult({
          status: 'error',
          message: `Erreur OAuth: ${error.message}`,
          details: error
        });
      } else {
        setTestResult({
          status: 'success',
          message: 'Redirection vers Google OAuth initiée...',
          details: data
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'error', 
        message: `Erreur: ${err.message}`,
        details: err
      });
    }
  };

  if (!diagnostics) {
    return <div className="p-8">Diagnostic en cours...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🔧 Diagnostic Supabase Auth</h1>
        
        {/* Problèmes critiques */}
        {diagnostics.configurationIssues.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-red-800 mb-4">🚨 Problèmes détectés</h2>
            <ul className="space-y-2">
              {diagnostics.configurationIssues.map((issue: string, index: number) => (
                <li key={index} className="text-red-700">{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Configuration actuelle */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">⚙️ Configuration actuelle</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Environnement:</strong> {diagnostics.environment}</div>
            <div><strong>Domaine actuel:</strong> {diagnostics.currentDomain}</div>
            <div><strong>Supabase URL:</strong> {diagnostics.supabaseUrl}</div>
            <div><strong>Supabase Key:</strong> {diagnostics.supabaseKey}</div>
            <div><strong>Redirect URI:</strong> {diagnostics.redirectUri}</div>
            <div><strong>Session active:</strong> {diagnostics.currentSession?.hasSession ? '✅ Oui' : '❌ Non'}</div>
          </div>
        </div>

        {/* Test OAuth */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">🧪 Test OAuth Google</h2>
          <button 
            onClick={testGoogleOAuth}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded mb-4"
          >
            Tester Google OAuth
          </button>
          
          {testResult && (
            <div className={`p-4 rounded ${
              testResult.status === 'error' ? 'bg-red-50 text-red-700' : 
              testResult.status === 'success' ? 'bg-green-50 text-green-700' : 
              'bg-blue-50 text-blue-700'
            }`}>
              <div className="font-medium">{testResult.message}</div>
              {testResult.details && (
                <pre className="mt-2 text-xs overflow-x-auto">
                  {JSON.stringify(testResult.details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Configuration complète */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">📋 Configuration complète</h2>
          <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
        </div>

        {/* Instructions de correction */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <h3 className="font-medium text-yellow-800 mb-2">🔧 Actions correctives</h3>
          <ol className="text-yellow-700 text-sm space-y-1 list-decimal list-inside">
            <li>Vérifiez que l'erreur "Database error saving new user" indique un problème de configuration Supabase</li>
            <li>Dans Supabase Dashboard → Authentication → URL Configuration, ajoutez votre domaine de production</li>
            <li>Vérifiez que vos variables d'environnement Vercel correspondent à votre configuration Supabase</li>
            <li>Testez en mode incognito pour éviter les problèmes de cache</li>
          </ol>
        </div>
      </div>
    </div>
  );
}