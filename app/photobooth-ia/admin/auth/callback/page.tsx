'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseClient } from '../../../../../lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Traitement de l\'authentification...');
  const [error, setError] = useState('');

  useEffect(() => {
    const processSupabaseCallback = async () => {
      console.log("🔄 Callback Supabase démarré");
      console.log("📍 URL actuelle:", window.location.href);
      console.log("📋 Tous les params URL:", Object.fromEntries(searchParams?.entries() || []));
      
      try {
        const supabase = createSupabaseClient();
        
        const error_param = searchParams?.get('error');
        const error_code = searchParams?.get('error_code');
        const error_description = searchParams?.get('error_description');
        
        if (error_param) {
          const decodedDescription = error_description ? decodeURIComponent(error_description) : 'N/A';
          console.error("❌ Erreur OAuth reçue:", {
            error: error_param,
            code: error_code,
            description: decodedDescription
          });
          
          // 🔍 Diagnostic spécifique pour "Database error saving new user"
          if (decodedDescription.includes('Database error saving new user')) {
            console.error("🚨 DIAGNOSTIC ERREUR DATABASE:");
            console.error("  - Cette erreur vient de Supabase, pas de votre code");
            console.error("  - Problème probable: Configuration Auth dans Supabase Dashboard");
            console.error("  - Solutions: Vérifier Site URL, Redirect URLs, et politiques RLS");
            console.error("  - Dashboard: https://supabase.com/dashboard/project/gyohqmahwntkmebayeej");
            
            setError(`🚨 Erreur de configuration Supabase: ${decodedDescription}`);
            setStatus(`Configuration Supabase requise - Consultez SUPABASE_AUTH_FIX.md`);
          } else {
            setError(`Erreur OAuth: ${error_param} - ${decodedDescription}`);
          }
          
          setTimeout(() => router.push('/photobooth-ia/admin/login'), 5000);
          return;
        }

        console.log("🔍 Recherche de session Supabase...");
        setStatus('Récupération de la session...');
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();

        console.log("📊 Résultat session:", {
          hasSession: !!session,
          sessionError: sessionError?.message,
          userId: session?.user?.id,
          userEmail: session?.user?.email
        });

        if (sessionError) {
          console.error("❌ Erreur session Supabase:", sessionError);
          setError(`Erreur de session: ${sessionError.message}`);
          setTimeout(() => router.push('/photobooth-ia/admin/login'), 5000);
          return;
        }

        if (!session) {
          console.error("❌ Aucune session Supabase trouvée");
          console.log("🔍 Essai de récupération des hash fragments...");
          
          // Vérifier les hash fragments (fallback)
          if (typeof window !== 'undefined') {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            console.log("📋 Hash fragments:", Object.fromEntries(hashParams.entries()));
            
            const access_token = hashParams.get('access_token');
            if (access_token) {
              console.log("✅ Token trouvé dans hash, attente traitement Supabase...");
              setStatus('Token détecté, finalisation...');
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (retrySession) {
                console.log("✅ Session récupérée après retry");
                session = retrySession;
              }
            }
          }
          
          if (!session) {
            setError('Session non établie - Problème de configuration Supabase');
            setTimeout(() => router.push('/photobooth-ia/admin/login'), 5000);
            return;
          }
        }

        console.log("✅ Session Supabase trouvée !");
        console.log("👤 Utilisateur:", {
          id: session.user.id,
          email: session.user.email,
          metadata: session.user.user_metadata
        });

        // 🔍 Vérifier que l'utilisateur existe dans admin_users (après sync trigger)
        console.log("🔍 Vérification utilisateur dans admin_users...");
        setStatus('Vérification du profil utilisateur...');
        
        const { data: adminUser, error: adminError } = await supabase
          .from('admin_users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (adminError) {
          console.error("❌ Erreur récupération admin_user:", adminError);
          if (adminError.code === 'PGRST116') {
            console.log("⏳ Utilisateur pas encore synchronisé, attente...");
            setStatus('Finalisation du profil...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Retry
            const { data: retryAdminUser, error: retryError } = await supabase
              .from('admin_users')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (retryError) {
              console.error("❌ Utilisateur toujours pas synchronisé:", retryError);
              setError('Erreur de synchronisation utilisateur - Contactez le support');
              setTimeout(() => router.push('/photobooth-ia/admin/login'), 5000);
              return;
            }
            
            console.log("✅ Utilisateur synchronisé:", retryAdminUser);
          } else {
            setError(`Erreur profil utilisateur: ${adminError.message}`);
            setTimeout(() => router.push('/photobooth-ia/admin/login'), 5000);
            return;
          }
        } else {
          console.log("✅ Utilisateur admin trouvé:", adminUser);
        }

        const adminSession = {
          userId: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email,
          company_name: adminUser?.company_name,
          logged_in: true,
          login_method: 'supabase_google',
          access_token: session.access_token,
        };

        console.log("💾 Sauvegarde session admin:", adminSession);
        localStorage.setItem('admin_session', btoa(JSON.stringify(adminSession)));
        
        console.log("✅ Session sauvegardée, redirection vers dashboard");
        setStatus('Connexion réussie !');
        setTimeout(() => router.push('/photobooth-ia/admin/dashboard'), 1500);

      } catch (error: any) {
        console.error("💥 Erreur callback Supabase:", error);
        setError(`Erreur: ${error.message}`);
        setTimeout(() => router.push('/photobooth-ia/admin/login'), 5000);
      }
    };

    if (searchParams) {
      processSupabaseCallback();
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Authentification Google
        </h2>
        <p className="text-gray-600 mb-4">{status}</p>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
