'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Page minimaliste pour la création de projet
export default function NewProject() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);

  // Initialiser Supabase uniquement quand le composant est monté
  const [supabase, setSupabase] = useState(null);
  
  useEffect(() => {
    // Initialiser Supabase seulement côté client
    if (typeof window !== 'undefined') {
      setSupabase(createClientComponentClient());
    }
  }, []);

  useEffect(() => {
    // Vérifier la session uniquement côté client
    if (typeof window !== 'undefined') {
      const checkSession = () => {
        try {
          let sessionData = sessionStorage.getItem('admin_session');
          if (!sessionData) {
            sessionData = localStorage.getItem('admin_session');
          }
          
          if (sessionData) {
            const parsedSession = JSON.parse(sessionData);
            if (parsedSession && parsedSession.logged_in) {
              setSession(parsedSession);
              return;
            }
          }
          
          router.push('/photobooth-ia/admin/login');
        } catch (err) {
          console.error("Erreur de session:", err);
          router.push('/photobooth-ia/admin/login');
        }
      };
      
      checkSession();
    }
  }, [router]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSlugChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      slug: value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (!session || !session.user_id) {
        throw new Error("Session utilisateur non trouvée. Veuillez vous reconnecter.");
      }
      
      // Create project with user ID from session
      const { data, error } = await supabase
        .from('projects')
        .insert([
          { 
            ...formData,
            created_by: session.user_id 
          }
        ])
        .select()
        .single();
        
      if (error) throw error;
      
      // Redirect to the project detail page
      router.push(`/photobooth-ia/admin/projects/${data.id}`);
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (typeof window === 'undefined') {
    return null; // Ne rien rendre côté serveur
  }

  return (
    <div className="bg-white shadow-sm rounded-xl p-6">
      <h1 className="text-2xl font-bold mb-6">Nouveau projet</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom du projet</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={(e) => {
              handleChange(e);
              handleSlugChange(e);
            }}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        
        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700">Slug (URL)</label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
              /photobooth/
            </span>
            <input
              type="text"
              id="slug"
              name="slug"
              required
              value={formData.slug}
              onChange={handleChange}
              className="flex-1 block w-full border border-gray-300 rounded-none rounded-r-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        
        <div className="flex items-center">
          <input
            id="is_active"
            name="is_active"
            type="checkbox"
            checked={formData.is_active}
            onChange={handleChange}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
            Activer le projet
          </label>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Link
            href="/photobooth-ia/admin/projects"
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer le projet'}
          </button>
        </div>
      </form>
    </div>
  );
}
