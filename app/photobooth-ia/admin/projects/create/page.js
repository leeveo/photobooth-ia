'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { RiArrowLeftLine, RiSaveLine } from 'react-icons/ri';

export default function CreateProject() {
  const [project, setProject] = useState({
    name: '',
    slug: '',
    description: '',
    is_active: true,
    primary_color: '#6366F1',
    secondary_color: '#4F46E5',
    photobooth_type: 'standard'
  });
  const [currentAdminId, setCurrentAdminId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  // Récupérer l'ID de l'admin connecté
  useEffect(() => {
    const getAdminSession = () => {
      try {
        // Récupérer la session depuis localStorage ou sessionStorage
        const sessionStr = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
        
        if (!sessionStr) {
          console.warn("Aucune session admin trouvée, redirection vers login");
          router.push('/photobooth-ia/admin/login');
          return null;
        }
        
        const sessionData = JSON.parse(sessionStr);
        
        if (!sessionData.user_id) {
          console.warn("Session invalide (aucun user_id), redirection vers login");
          router.push('/photobooth-ia/admin/login');
          return null;
        }
        
        console.log("Session admin trouvée, ID:", sessionData.user_id);
        setCurrentAdminId(sessionData.user_id);
        return sessionData.user_id;
      } catch (err) {
        console.error("Erreur lors de la récupération de la session admin:", err);
        router.push('/photobooth-ia/admin/login');
        return null;
      }
    };
    
    getAdminSession();
  }, [router]);

  // Générer le slug automatiquement à partir du nom
  useEffect(() => {
    if (project.name) {
      const slug = project.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Enlever les caractères spéciaux
        .replace(/\s+/g, '-') // Remplacer les espaces par des tirets
        .replace(/--+/g, '-') // Enlever les tirets multiples
        .trim();
      
      setProject(prev => ({ ...prev, slug }));
    }
  }, [project.name]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProject(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (!currentAdminId) {
      setError("Vous n'êtes pas connecté. Veuillez vous reconnecter.");
      setLoading(false);
      return;
    }
    
    try {
      // Ajouter l'ID admin au projet
      const projectWithAdmin = {
        ...project,
        created_by: currentAdminId
      };
      
      const { data, error } = await supabase
        .from('projects')
        .insert(projectWithAdmin)
        .select()
        .single();
        
      if (error) throw error;
      
      setSuccess(true);
      
      // Rediriger vers la page du projet
      setTimeout(() => {
        router.push(`/photobooth-ia/admin/projects/${data.id}`);
      }, 1000);
      
    } catch (err) {
      console.error('Erreur lors de la création du projet:', err);
      setError(`Erreur lors de la création du projet: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Créer un nouveau projet</h1>
        <Link
          href="/photobooth-ia/admin/projects"
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition shadow-sm flex items-center gap-2"
        >
          <RiArrowLeftLine className="w-4 h-4" />
          Retour aux projets
        </Link>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          Projet créé avec succès! Redirection en cours...
        </div>
      )}
      
      <div className="bg-white shadow rounded-xl overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nom du projet *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={project.name}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Nom de votre projet"
              />
            </div>
            
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                Slug (URL) *
              </label>
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                  /
                </span>
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  required
                  value={project.slug}
                  onChange={handleChange}
                  className="block w-full rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="url-du-projet"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Utilisé pour l'URL d'accès au photobooth
              </p>
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={project.description}
                onChange={handleChange}
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Description du projet"
              />
            </div>
            
            <div>
              <label htmlFor="photobooth_type" className="block text-sm font-medium text-gray-700 mb-1">
                Type de photobooth *
              </label>
              <select
                id="photobooth_type"
                name="photobooth_type"
                required
                value={project.photobooth_type}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="standard">Standard (FaceSwapping)</option>
                <option value="premium">Premium</option>
                <option value="photobooth2">MiniMax</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={project.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Projet actif
                </label>
              </div>
            </div>
            
            <div>
              <label htmlFor="primary_color" className="block text-sm font-medium text-gray-700 mb-1">
                Couleur primaire
              </label>
              <div className="flex items-center">
                <input
                  type="color"
                  id="primary_color"
                  name="primary_color"
                  value={project.primary_color}
                  onChange={handleChange}
                  className="h-8 w-8 rounded-md border-gray-300"
                />
                <input
                  type="text"
                  name="primary_color"
                  value={project.primary_color}
                  onChange={handleChange}
                  className="ml-2 block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="secondary_color" className="block text-sm font-medium text-gray-700 mb-1">
                Couleur secondaire
              </label>
              <div className="flex items-center">
                <input
                  type="color"
                  id="secondary_color"
                  name="secondary_color"
                  value={project.secondary_color}
                  onChange={handleChange}
                  className="h-8 w-8 rounded-md border-gray-300"
                />
                <input
                  type="text"
                  name="secondary_color"
                  value={project.secondary_color}
                  onChange={handleChange}
                  className="ml-2 block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push('/photobooth-ia/admin/projects')}
              className="mr-3 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 flex items-center gap-2"
            >
              <RiSaveLine className="w-4 h-4" />
              {loading ? 'Création...' : 'Créer le projet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}