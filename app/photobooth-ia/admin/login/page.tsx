'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '/lib/supabaseClient';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseClient();

  // Récupérer l'email du dernier utilisateur inscrit (si disponible)
  useEffect(() => {
    const lastEmail = sessionStorage.getItem('last_registered_email');
    if (lastEmail) {
      setEmail(lastEmail);
      sessionStorage.removeItem('last_registered_email'); // Nettoyer après utilisation
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setDebugInfo(null);
    setIsLoading(true);

    try {
      // Vérifier les identifiants avec Supabase
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, email, company_name, is_active')
        .eq('email', email)
        .single();
        
      if (error || !data || !data.is_active) {
        throw new Error('Identifiants invalides ou compte inactif');
      }
      
      // Vérifier le mot de passe (à implémenter avec bcrypt ou similaire)
      // ...
      
      // Mettre à jour la date de dernière connexion
      await supabase
        .from('admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id);
      
      // Créer la session
      const sessionData = {
        user_id: data.id,
        email: data.email,
        company_name: data.company_name,
        logged_in: true,
        login_method: 'email',
        login_time: new Date().toISOString()
      };
      
      // Stocker la session
      sessionStorage.setItem('admin_session', JSON.stringify(sessionData));
      localStorage.setItem('admin_session', JSON.stringify(sessionData));
      document.cookie = `admin_session=${data.id}; path=/; max-age=86400;`;
      
      // Rediriger vers le dashboard
      router.push('/photobooth-ia/admin/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* LEFT SIDE */}
      <div className="w-full md:w-1/3 bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center p-10">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-8 h-16 w-auto">
            <div className="text-3xl font-bold">PhotoBooth IA</div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Bienvenue !</h1>
          <p className="text-lg">Connectez-vous à votre compte administrateur.</p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div
        className="w-full md:w-2/3 relative bg-cover bg-center flex items-center justify-center p-10"
        style={{ backgroundImage: "url('/images/login-bg.png')" }}
      >
        <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-8 text-white">
          <h2 className="text-2xl font-bold mb-6 text-center">Connexion</h2>

          {errorMessage && (
            <div className="bg-red-500/50 border border-red-700 text-white p-3 rounded-lg mb-4">
              {errorMessage}
            </div>
          )}

          {debugInfo && (
            <div className="bg-blue-500/50 border border-blue-700 text-white p-3 rounded-lg mb-4 text-xs">
              <p className="font-bold mb-1">Informations de débogage:</p>
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full px-4 py-3 rounded-lg bg-white/20 placeholder-white text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <input
              type="password"
              required
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-lg bg-white/20 placeholder-white text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-sm text-white mt-6">
            Vous n'avez pas de compte ?{' '}
            <a
              href="/photobooth-ia/admin/register"
              className="text-white font-semibold underline hover:text-purple-200"
            >
              Créer un compte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
