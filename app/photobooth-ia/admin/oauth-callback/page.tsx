'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OAuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Vérifier si une session personnalisée existe
    const hasSession = sessionStorage.getItem('admin_session') || localStorage.getItem('admin_session');
    
    if (hasSession) {
      router.push('/photobooth-ia/admin/dashboard');
    } else {
      router.push('/photobooth-ia/admin/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-white bg-black">
      <p>Connexion en cours...</p>
    </div>
  );
}
