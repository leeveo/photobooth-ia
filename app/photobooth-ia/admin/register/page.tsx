'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '/lib/supabaseClient';
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
    // MÉTHODE 1: Essayer d'utiliser l'authentification Supabase standard
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/photobooth-ia/admin/login`,
          data: {
            company_name: company || ''
          }
        }
      });

      if (!error) {
        // Si pas d'erreur, tout va bien
        alert('Compte créé ! Vérifiez votre email pour confirmer votre inscription.');
        router.push('/photobooth-ia/admin/login');
        return;
      }
      
      // Si erreur Supabase Auth, ne pas afficher d'erreur tout de suite, essayer l'alternative
      console.log("Méthode 1 (Auth standard) échouée:", error.message);
    } catch (err) {
      console.log("Erreur avec l'authentification standard:", err);
    }

    // MÉTHODE 2: Utiliser la fonction RPC personnalisée
    try {
      console.log("Tentative d'inscription avec:", { 
        email, 
        password: password.length + " caractères",
        company 
      });
      
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
      console.log("Erreur avec la fonction RPC:", err);
      setErrorMessage(
        "Votre Supabase n'est pas correctement configuré. Un administrateur doit exécuter " +
        "le script SQL 'setup_complete.sql' en tant qu'utilisateur postgres."
      );
    }
  } catch (err) {
    console.error("Erreur générale:", err);
    setErrorMessage(`Une erreur inattendue s'est produite: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
  } finally {
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
          <h1 className="text-4xl font-bold mb-4">Rejoignez la plateforme !</h1>
          <p className="text-lg">Créez votre compte administrateur SaaS en quelques secondes.</p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div
        className="w-full md:w-2/3 relative bg-cover bg-center flex items-center justify-center p-10"
        style={{ backgroundImage: "url('/images/login-bg.png')" }}
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
