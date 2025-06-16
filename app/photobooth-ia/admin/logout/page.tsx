'use client';

import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();
  
  useEffect(() => {
    const logout = async () => {
      try {
        // Use the same client initialization approach as other pages
        const supabase = createClientComponentClient();
        
        // Sign out from Supabase if needed
        await supabase.auth.signOut();
        
        // Clear session data from storage
        if (typeof window !== 'undefined') {
          // Remove from sessionStorage
          sessionStorage.removeItem('admin_session');
          
          // Remove from localStorage 
          localStorage.removeItem('admin_session');
          
          // Clear the cookie
          document.cookie = 'admin_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
        
        console.log('User logged out successfully');
        
        // Redirect to login page
        router.push('/photobooth-ia/admin/login');
      } catch (error) {
        console.error('Error during logout:', error);
        router.push('/photobooth-ia/admin/login');
      }
    };

    logout();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-xl font-semibold text-gray-800 mb-4">Déconnexion en cours...</h1>
        <p className="text-gray-600">Vous allez être redirigé vers la page de connexion.</p>
      </div>
    </div>
  );
}
