'use client';
import { useEffect } from 'react';
import { createSupabaseClient } from '/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      await supabase.auth.signOut();
      router.push('/photobooth-ia/admin/login');
    };

    logout();
  }, []);

  return <p>Déconnexion...</p>;
}
