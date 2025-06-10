'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import { RiSearchLine, RiFilter2Line, RiCloseLine } from 'react-icons/ri';

export default function LayoutTemplateSelector({ onSelectTemplate, onClose }) {
  const supabase = createClientComponentClient();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);

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

  // Fonction pour générer une couleur basée sur la catégorie
  const getCategoryColor = (category) => {
    const categoryColors = {
      'portrait': '#3498db',
      'paysage': '#2ecc71',
      'événement': '#e74c3c',
      'business': '#f39c12',
      'créatif': '#9b59b6',
      'autre': '#34495e',
      'default': '#95a5a6'
    };
    
    return categoryColors[category] || categoryColors.default;
  };

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-auto overflow-hidden">
      <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-medium text-gray-900">Sélectionner un template</h2>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <RiCloseLine className="h-6 w-6" />
        </button>
      </div>

      {/* Filtres et recherche */}
      <div className="px-6 py-4 border-b border-gray-200">
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

      {/* Liste des templates */}
      <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <span className="ml-3 text-gray-600">Chargement des templates...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
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
        ) : filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredTemplates.map(template => (
              <div 
                key={template.id} 
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onSelectTemplate(template)}
              >
                <div className="aspect-w-16 aspect-h-9 bg-gray-100">
                  {template.thumbnail_url ? (
                    <Image
                      src={template.thumbnail_url}
                      alt={template.name}
                      width={300}
                      height={169}
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center" 
                      style={{ backgroundColor: getCategoryColor(template.category) }}
                    >
                      <span className="text-white font-bold text-xl">{template.name.substring(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-gray-900 truncate">{template.name}</h3>
                  {template.description && (
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">{template.description}</p>
                  )}
                  {template.category && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {template.category}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun template trouvé</h3>
            <p className="mt-1 text-sm text-gray-500">
              Essayez d'ajuster vos critères de recherche.
            </p>
          </div>
        )}
      </div>

      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
