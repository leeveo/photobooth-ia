'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { RiAddLine, RiEditLine, RiDeleteBin6Line, RiDownload2Line, RiEyeLine, RiSearchLine, RiFilter2Line } from 'react-icons/ri';

export default function LayoutTemplates() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Charger les templates
  useEffect(() => {
    async function loadTemplates() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('layout_templates')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        setTemplates(data || []);

        // Extraire les catégories uniques
        if (data && data.length > 0) {
          const uniqueCategories = [...new Set(data.map(template => template.category).filter(Boolean))];
          setCategories(uniqueCategories);
        }
      } catch (error) {
        console.error('Error loading templates:', error);
        setError('Une erreur est survenue lors du chargement des templates');
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, [supabase]);

  // Filtrer les templates en fonction de la recherche et de la catégorie
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchQuery === '' || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Supprimer un template
  const handleDeleteTemplate = async (id) => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('layout_templates')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Mettre à jour la liste des templates
      setTemplates(templates.filter(template => template.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      setError('Une erreur est survenue lors de la suppression du template');
    } finally {
      setIsDeleting(false);
    }
  };

  // Générer une miniature pour le template
  const generateThumbnail = (elements, stageSize) => {
    // Cette fonction pourrait être plus sophistiquée pour générer une vraie miniature
    // Pour l'instant, on retourne simplement une couleur basée sur la catégorie
    const categoryColors = {
      'portrait': '#3498db',
      'paysage': '#2ecc71',
      'événement': '#e74c3c',
      'business': '#f39c12',
      'créatif': '#9b59b6',
      'default': '#34495e'
    };
    
    const category = template.category || 'default';
    return categoryColors[category] || categoryColors.default;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Templates de Layout</h1>
        <Link href="/photobooth-ia/admin/layout-templates/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <RiAddLine className="mr-2 h-4 w-4" />
          Créer un nouveau template
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtres et recherche */}
      <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <RiSearchLine className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher un template..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="flex-shrink-0">
            <div className="relative inline-block text-left">
              <div className="flex items-center">
                <RiFilter2Line className="h-5 w-5 text-gray-400 mr-2" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="all">Toutes les catégories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Affichage des templates */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <span className="ml-3 text-gray-600">Chargement des templates...</span>
        </div>
      ) : filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.map(template => (
            <div key={template.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
              <div className="aspect-w-16 aspect-h-9 bg-gray-100 relative">
                {template.thumbnail_url ? (
                  <Image
                    src={template.thumbnail_url}
                    alt={template.name}
                    fill
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center" 
                    style={{ backgroundColor: generateThumbnail(template.elements, template.stage_size) }}
                  >
                    <span className="text-white font-bold text-xl">{template.name.substring(0, 2).toUpperCase()}</span>
                  </div>
                )}
                {template.category && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {template.category}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900 truncate">{template.name}</h3>
                {template.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{template.description}</p>
                )}
                <div className="mt-4 flex justify-between">
                  <div className="text-xs text-gray-500">
                    Créé le {new Date(template.created_at).toLocaleDateString('fr-FR')}
                  </div>
                  <div className="flex space-x-2">
                    <Link href={`/photobooth-ia/admin/layout-templates/${template.id}`} className="text-indigo-600 hover:text-indigo-900">
                      <RiEditLine className="h-5 w-5" />
                    </Link>
                    <Link href={`/photobooth-ia/admin/layout-templates/${template.id}/preview`} className="text-green-600 hover:text-green-900">
                      <RiEyeLine className="h-5 w-5" />
                    </Link>
                    <button 
                      onClick={() => setDeleteConfirm(template.id)} 
                      className="text-red-600 hover:text-red-900"
                    >
                      <RiDeleteBin6Line className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun template trouvé</h3>
          <p className="mt-1 text-sm text-gray-500">
            Commencez par créer un nouveau template ou ajustez vos filtres de recherche.
          </p>
          <div className="mt-6">
            <Link href="/photobooth-ia/admin/layout-templates/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <RiAddLine className="mr-2 h-4 w-4" />
              Créer un nouveau template
            </Link>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirmer la suppression</h3>
            <p className="text-sm text-gray-500 mb-4">
              Êtes-vous sûr de vouloir supprimer ce template ? Cette action est irréversible.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                disabled={isDeleting}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteTemplate(deleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
