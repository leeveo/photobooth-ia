'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Affiche les templates de la table layout_templates avec logs détaillés
const TemplatesTab = ({ onSelectTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const supabase = createClientComponentClient();

  // Fetch templates depuis Supabase avec logs détaillés
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('[TemplatesTab] Tentative de connexion à layout_templates...');
        const { data, error } = await supabase
          .from('layout_templates')
          .select('id,name,category,thumbnail_url,elements,stage_size,created_at')
          .order('created_at', { ascending: false });
        console.log('[TemplatesTab] Résultat Supabase:', { data, error });
        if (data && data.length > 0) {
          data.forEach((tpl, idx) => {
            console.log(`[TemplatesTab] Template #${idx}:`, tpl);
          });
        }
        if (error) throw error;
        setTemplates(data || []);
      } catch (err) {
        console.error('[TemplatesTab] Erreur lors du fetch:', err);
        setError('Impossible de charger les templates');
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, [supabase]);

  // Filtrage par recherche
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTemplates(templates);
      return;
    }
    const query = searchQuery.toLowerCase().trim();
    const filtered = templates.filter(template =>
      template.name?.toLowerCase().includes(query) ||
      template.category?.toLowerCase().includes(query)
    );
    setFilteredTemplates(filtered);
  }, [searchQuery, templates]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-sm text-gray-600">Chargement des templates...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
        {error}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="mt-4 text-gray-500">
          Aucun template disponible.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search box */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher un template..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
        />
      </div>
      
      <p className="text-sm text-gray-600 mb-2">
        Sélectionnez un template pour l'utiliser comme base
      </p>
      
      <div className="grid grid-cols-2 gap-3">
        {filteredTemplates.map(template => (
          <div 
            key={template.id}
            onClick={() => onSelectTemplate(template)}
            className="border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all bg-white"
          >
            <div className="h-24 bg-gray-50 flex items-center justify-center">
              {template.thumbnail_url ? (
                <img 
                  src={template.thumbnail_url} 
                  alt={template.name}
                  className="w-full h-full object-cover"
                  style={{ maxWidth: 120, maxHeight: 96 }}
                  onError={e => {
                    console.warn('[TemplatesTab] Erreur chargement thumbnail_url:', template.thumbnail_url);
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/120x96?text=No+Image';
                  }}
                />
              ) : (
                <div className="text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="p-2">
              <h3 className="text-sm font-medium text-gray-900 truncate">{template.name}</h3>
              {template.category && (
                <p className="text-xs text-gray-500">{template.category}</p>
              )}
              <p className="text-xs text-gray-400">
                {template.created_at ? new Date(template.created_at).toLocaleDateString() : ''}
              </p>
              {/* Affiche l'URL brute pour debug */}
              {template.thumbnail_url && (
                <div className="text-xs text-gray-400 break-all mt-1">
                  <span>URL: </span>
                  <span>{template.thumbnail_url}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplatesTab;
