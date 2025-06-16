'use client';
import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const logout = async () => {
      try {
        console.log("Logging out user...");
        
        // Clear all session storage
        localStorage.removeItem('admin_session');
        sessionStorage.removeItem('admin_session');
        
        // Clear cookies
        document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        
        // Sign out from Supabase Auth (if being used)
        await supabase.auth.signOut();
        
        console.log("Logout complete, redirecting to login page...");
        
        // Give a small delay to ensure all cleanups are processed
        setTimeout(() => {
          // Use window.location for a full page refresh to ensure clean state
          window.location.href = '/photobooth-ia/admin/login';
        }, 500);
      } catch (error) {
        console.error("Error during logout:", error);
        // Still redirect to login even if there's an error
        router.push('/photobooth-ia/admin/login');
      }
    };

    logout();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="bg-white/10 backdrop-blur-md p-8 rounded-lg shadow-lg text-white text-center">
        <h1 className="text-2xl font-bold mb-4">Déconnexion en cours...</h1>
        <p>Vous allez être redirigé vers la page de connexion.</p>
        <div className="mt-4 animate-pulse">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto animate-spin"></div>
        </div>
      </div>
    </div>
  );
}
