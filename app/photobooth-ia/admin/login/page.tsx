'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '/lib/supabaseClient';
import Image from 'next/image';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
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
      console.log("Tentative de connexion avec système personnalisé:", { email, passwordLength: password.length });
      
      const { data: adminData, error: adminError } = await supabase.rpc(
        'login_admin',
        {
          admin_email: email,
          admin_password: password
        }
      );

      console.log("Réponse RPC login_admin:", adminData);

      if (adminError) {
        console.error("Erreur RPC:", adminError);
        setErrorMessage(`Échec de connexion: ${adminError.message}`);
        setIsLoading(false);
        return;
      } 
      
      if (adminData?.success) {
        // Stocker les informations de session
        const sessionData = {
          userId: adminData.user_id, // Utiliser userId au lieu de user_id pour cohérence
          email: adminData.email,
          company_name: adminData.company_name,
          logged_in: true,
          login_method: 'custom',
          login_time: new Date().toISOString()
        };
        
        // Encodage en base64 pour être stocké dans un cookie
        const encodedSession = btoa(JSON.stringify(sessionData));
        
        // Stocker en localStorage, sessionStorage ET cookie pour assurer la disponibilité dans tous les contextes
        localStorage.setItem('admin_session', encodedSession);
        sessionStorage.setItem('admin_session', encodedSession);
        
        // Définir un cookie HTTP-only avec une durée de 24 heures
        document.cookie = `admin_session=${encodedSession}; path=/; max-age=86400; SameSite=Lax`;
        
        console.log("Session stockée:", sessionData);
        
        // Afficher le toast de succès au lieu de l'alerte
        setShowSuccessToast(true);
        
        // Rediriger après un court délai
        setTimeout(() => {
          router.push('/photobooth-ia/admin/dashboard');
        }, 2000);
        
        return;
      } else {
        // Message d'erreur spécifique retourné par la fonction
        setErrorMessage(adminData?.message || "Échec de connexion: Identifiants incorrects.");
        if (adminData?.debug) {
          setDebugInfo(adminData.debug);
        }
      }
    } catch (err) {
      console.error("Erreur générale:", err);
      setErrorMessage(`Une erreur inattendue s'est produite: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Testimonials data
  const testimonials = [
    {
      id: 1,
      name: "Marie Dubois",
      role: "Organisatrice d'événements",
      avatar: "/images/avatars/avatar1.jpg",
      text: "WaiBooth a complètement transformé nos événements. Les clients adorent l'expérience IA !"
    },
    {
      id: 2,
      name: "Thomas Martin",
      role: "Directeur marketing",
      avatar: "/images/avatars/avatar3.jpg",
      text: "Une solution impressionnante qui engage vraiment notre audience lors des salons professionnels."
    },
    {
      id: 3,
      name: "Sophie Leroy",
      role: "Wedding planner",
      avatar: "/images/avatars/avatar2.jpg",
      text: "Mes mariés sont toujours enchantés par les créations uniques que génère WaiBooth."
    },
    {
      id: 4,
      name: "Jessica Petit",
      role: "Gérante d'agence événementielle",
      avatar: "/images/avatars/avatar4.jpg",
      text: "La photomosaic wall est un véritable succès à chaque événement corporate que nous organisons."
    },
    
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative">
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="font-medium">Connexion réussie!</p>
              <p className="text-sm opacity-90">Redirection vers le tableau de bord...</p>
            </div>
          </div>
        </div>
      )}

      {/* LEFT SIDE */}
      <div className="w-full md:w-1/3 bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center p-10">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-8 h-16 w-auto flex justify-center">
            <Image 
              src="/images/logo_white.png" 
              alt="WaiBooth Logo" 
              width={350} 
              height={119} 
              className="object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold mb-4">Automatisez la magie. Laissez Waibooth gérer le show</h1>
          <p className="text-lg mb-8">Connectez-vous à votre compte et commencez à créer vos animations photobooth IA, Karaoke, photomosaic wall ...pour tous vos événements</p>
          
          {/* Testimonials Slider with Tailwind */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Ce que disent nos clients</h3>
            <div className="relative overflow-hidden">
              <div className="flex animate-marquee">
                {[...testimonials, ...testimonials].map((testimonial, index) => (
                  <div 
                    key={`${testimonial.id}-${index}`} 
                    className="flex-shrink-0 w-72 mx-2 p-4 bg-white/10 backdrop-blur-sm rounded-lg shadow-lg"
                  >
                    <div className="flex justify-center mb-3">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/30">
                        <Image 
                          src={testimonial.avatar} 
                          alt={testimonial.name}
                          width={64}
                          height={64}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </div>
                    <p className="text-sm italic mb-2">"{testimonial.text}"</p>
                    <p className="font-semibold text-sm">{testimonial.name}</p>
                    <p className="text-xs text-white/80">{testimonial.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full px-4 py-3 rounded-lg bg-white/20 placeholder-white text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            
            <div>
              <input
                type="password"
                required
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-lg bg-white/20 placeholder-white text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </button>
            </div>
          </form>

          {debugInfo && (
            <div className="mt-4">
              <p className="font-bold mb-1">Informations de débogage:</p>
              <div className="bg-blue-500/50 border border-blue-700 text-white p-3 rounded-lg mb-4 text-xs">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
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
      
      {/* Add global styles for animation */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
          min-width: max-content;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
