'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '../../../../lib/supabaseClient';
import Image from 'next/image';

export default function AdminRegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseClient();

const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();
  setErrorMessage('');
  setIsLoading(true);
  
  if (password.length < 6) {
    setErrorMessage("Le mot de passe doit contenir au moins 6 caractères");
    setIsLoading(false);
    return;
  }

  try {
    console.log("Tentative d'inscription avec:", { 
      email, 
      password: password.length + " caractères",
      company 
    });
    
    // Utiliser uniquement la fonction RPC personnalisée
    const { data: adminData, error: adminError } = await supabase.rpc(
      'register_admin',
      { 
        admin_email: email, 
        admin_password: password, 
        admin_company: company || '' 
      }
    );

    console.log("Réponse register_admin:", { adminData, adminError });

    if (adminError) {
      setErrorMessage(`Erreur d'inscription: ${adminError.message}`);
      console.error("Erreur complète:", adminError);
      setIsLoading(false);
      return;
    }

    if (adminData?.success) {
      alert(`Compte administrateur créé avec succès! ID: ${adminData.user_id}`);
      
      // Stocker temporairement l'ID pour faciliter la connexion
      sessionStorage.setItem('last_registered_email', email);
      
      router.push('/photobooth-ia/admin/login');
      return;
    } else {
      setErrorMessage(adminData?.message || "Erreur lors de la création du compte");
    }
  } catch (err) {
    console.error("Erreur générale:", err);
    setErrorMessage(`Une erreur inattendue s'est produite: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
  } finally {
    setIsLoading(false);
  }
};

const handleGoogleSignup = async () => {
  setErrorMessage('');
  setIsLoading(true);

  try {
    console.log("Tentative d'inscription avec Google");
    
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
      console.error("Erreur OAuth Google:", error);
      setErrorMessage(`Erreur de connexion Google: ${error.message}`);
      setIsLoading(false);
      return;
    }

    // La redirection se fait automatiquement
    console.log("Redirection vers Google OAuth...");
    
  } catch (err) {
    console.error("Erreur générale Google OAuth:", err);
    setErrorMessage(`Une erreur inattendue s'est produite: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    setIsLoading(false);
  }
};
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* LEFT SIDE */}
      <div className="w-full md:w-1/3 bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center p-10">
        <div className="max-w-md text-center">
          {/* Replace static image with Next.js Image or use a relative path to an existing image */}
          <div className="mx-auto mb-8 h-16 w-auto">
            {/* You can replace this with your actual logo */}
            <div className="text-3xl font-bold">PhotoBooth IA</div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Rejoignez la plateforme Evenementielle!</h1>
          <p className="text-lg">Créez votre compte en quelques secondes et profitez de nombreuses animations pour vos événéments.</p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div
        className="w-full md:w-2/3 relative bg-cover bg-center flex items-center justify-center p-10"
        style={{ backgroundImage: "url('/images/login-bg.jpg')" }}
      >
        <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-8 text-white">
          <h2 className="text-2xl font-bold mb-6 text-center">Créer un compte</h2>

          {errorMessage && (
            <div className="bg-red-500/50 border border-red-700 text-white p-3 rounded-lg mb-4">
              <p>{errorMessage}</p>
              {errorMessage.includes("base de données") && (
                <div className="mt-2 text-sm">
                  <p>Problèmes possibles:</p>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Configuration Supabase incorrecte</li>
                    <li>Tables manquantes dans la base de données</li>
                    <li>Problèmes de permissions</li>
                  </ul>
                  <p className="mt-2">
                    <a 
                      href="mailto:support@photoboothia.com" 
                      className="underline hover:text-white"
                    >
                      Contacter le support technique
                    </a>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Google OAuth Button */}
          <div className="mb-6">
            <button
              onClick={handleGoogleSignup}
              disabled={isLoading}
              className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white font-semibold py-3 rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{isLoading ? 'Connexion...' : 'S\'inscrire avec Google'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 h-px bg-white/30"></div>
            <span className="text-white/70 text-sm">ou</span>
            <div className="flex-1 h-px bg-white/30"></div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <input
              type="text"
              placeholder="Nom de l'entreprise (optionnel)"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              autoComplete="organization"
              className="w-full px-4 py-3 rounded-lg bg-white/20 placeholder-white text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
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
              placeholder="Mot de passe (min. 6 caractères)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              className="w-full px-4 py-3 rounded-lg bg-white/20 placeholder-white text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Création en cours...' : 'Créer un compte'}
            </button>
          </form>

          <p className="text-center text-sm text-white mt-6">
            Vous avez déjà un compte ?{' '}
            <a
              href="/photobooth-ia/admin/login"
              className="text-white font-semibold underline hover:text-purple-200"
            >
              Se connecter
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
