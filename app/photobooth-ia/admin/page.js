"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function checkSession() {
      try {
        setLoading(true);
        // Vérifier si l'utilisateur est connecté
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
          setIsAuthenticated(true);
          // Si l'utilisateur est authentifié, ne pas rediriger car nous sommes déjà sur la page admin
        } else {
          // Rediriger vers login si non authentifié
          router.push('/photobooth-ia/admin/login');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de session:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-center">Chargement...</h1>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-center text-red-600">Erreur</h1>
          <p className="text-center">{error}</p>
          <div className="mt-4 flex justify-center">
            <button 
              onClick={() => router.push('/photobooth-ia/admin/login')}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-center">Administration</h1>
          <p className="text-center mb-4">Vous êtes connecté.</p>
          <div className="grid grid-cols-1 gap-4 mt-6">
            <button 
              onClick={() => router.push('/photobooth-ia/admin/dashboard')}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Dashboard
            </button>
            <button 
              onClick={() => router.push('/photobooth-ia/admin/projects')}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Projets
            </button>
            <button 
              onClick={() => router.push('/photobooth-ia/admin/styles')}
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            >
              Styles
            </button>
            <button 
              onClick={() => router.push('/photobooth-ia/admin/backgrounds')}
              className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
            >
              Arrière-plans
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
