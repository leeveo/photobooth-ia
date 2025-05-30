'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';

export default function Styles() {
  const supabase = createClientComponentClient();
  const [styles, setStyles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    variations: 1
  });

  // Updated gender options to include "Groupe"
  const genderOptions = [
    { value: 'm', label: 'Homme' },
    { value: 'f', label: 'Femme' },
    { value: 'ag', label: 'Ado Garçon' },
    { value: 'af', label: 'Ado Fille' },
    { value: 'g', label: 'Groupe' } // Added new gender option for groups
  ];

  // First wrap fetchStyles in useCallback if not already done
  const fetchStyles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('styles')
        .select('*')
        .order('gender, style_key', { ascending: true });

      if (error) throw error;
      setStyles(data || []);
    } catch (error) {
      console.error('Error fetching styles:', error);
      setError('Erreur lors du chargement des styles');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchStyles();
  }, [fetchStyles]);

  function handleEditFormChange(e) {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleDelete(id) {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce style ?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Attempting to delete style ID:', id);
      
      // Optimistically remove from UI
      const styleToDelete = styles.find(s => s.id === id);
      setStyles(currentStyles => currentStyles.filter(style => style.id !== id));
      
      // Call the improved API endpoint for style deletion
      const response = await fetch('/api/admin/delete-style', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ styleId: id })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }
      
      console.log('Delete result:', result);
      setSuccess(`Style "${styleToDelete?.name || 'Inconnu'}" supprimé avec succès !`);
      
      // Refresh the list
      await fetchStyles();
      
    } catch (error) {
      console.error('Error deleting style:', error);
      setError(`Erreur lors de la suppression: ${error.message}`);
      
      // If there was an error, refresh the list to restore accurate state
      fetchStyles();
    } finally {
      setLoading(false);
    }
  }

  function startEditing(style) {
    setEditingId(style.id);
    setEditForm({
      name: style.name,
      description: style.description || '',
      variations: style.variations || 1
    });
  }

  async function handleUpdate(id) {
    try {
      const { error } = await supabase
        .from('styles')
        .update({
          name: editForm.name,
          description: editForm.description,
          variations: parseInt(editForm.variations)
        })
        .eq('id', id);

      if (error) throw error;

      setSuccess('Style mis à jour avec succès !');
      setEditingId(null);
      fetchStyles();
    } catch (error) {
      console.error('Error updating style:', error);
      setError('Erreur lors de la mise à jour. Veuillez réessayer.');
    }
  }

  function getGenderLabel(code) {
    const gender = genderOptions.find(g => g.value === code);
    return gender ? gender.label : code;
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Messages d'erreur et de succès */}
      {error && (
        <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 text-sm text-green-600 bg-green-50 rounded-md">
          {success}
        </div>
      )}

      {/* Styles List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Styles existants</h3>
        </div>
        
        {styles.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Aucun style trouvé.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aperçu
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom du projet
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variations
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {styles.map((style) => (
                  <tr key={style.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-12 h-16 relative bg-gray-100 rounded-sm">
                        {style.preview_image ? (
                          <Image
                            src={style.preview_image}
                            alt={style.name || 'Style preview'}
                            fill
                            sizes="48px"
                            style={{ objectFit: "cover" }}
                            className="rounded-sm"
                            onError={(e) => {
                              // En cas d'erreur de chargement, remplacer par une image par défaut
                              e.target.onerror = null;
                              e.target.src = "/placeholder-style.png";
                            }}
                          />
                        ) : (
                          // Afficher un placeholder si pas d'image
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === style.id ? (
                        <input
                          type="text"
                          name="name"
                          value={editForm.name}
                          onChange={handleEditFormChange}
                          className="px-2 py-1 text-sm border rounded-md w-full"
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900">{style.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{getGenderLabel(style.gender)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{style.style_key}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === style.id ? (
                        <input
                          type="number"
                          name="variations"
                          min="1"
                          max="10"
                          value={editForm.variations}
                          onChange={handleEditFormChange}
                          className="px-2 py-1 text-sm border rounded-md w-20"
                        />
                      ) : (
                        <div className="text-sm text-gray-500">{style.variations}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingId === style.id ? (
                        <div className="flex space-x-2 justify-end">
                          <button
                            onClick={() => handleUpdate(style.id)}
                            className="text-xs px-2 py-1 bg-green-500 text-white rounded-md"
                          >
                            Enregistrer
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-md"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-2 justify-end">
                          <button
                            onClick={() => startEditing(style)}
                            className="text-xs px-2 py-1 border border-transparent text-white bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow hover:from-blue-600 hover:to-purple-700"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(style.id)}
                            className="text-xs px-2 py-1 border border-transparent text-white bg-gradient-to-br from-red-500 to-pink-600 rounded-lg shadow hover:from-red-600 hover:to-pink-700"
                          >
                            Supprimer
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}