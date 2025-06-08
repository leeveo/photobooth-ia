'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';

export default function Backgrounds() {
  const supabase = createClientComponentClient();
  const [backgrounds, setBackgrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newBackgroundName, setNewBackgroundName] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  // Convert fetchBackgrounds to useCallback
  const fetchBackgrounds = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('backgrounds')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBackgrounds(data || []);
    } catch (error) {
      console.error('Error fetching backgrounds:', error);
      setError('Erreur lors du chargement des arrière-plans');
    } finally {
      setLoading(false);
    }
  }, [supabase]); // Add appropriate dependencies

  useEffect(() => {
    fetchBackgrounds();
  }, [fetchBackgrounds]); // Add fetchBackgrounds to dependencies

  async function handleUpload(e) {
    e.preventDefault();
    
    if (!file || !newBackgroundName) {
      setError('Veuillez sélectionner un fichier et saisir un nom');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create FormData to send the file and metadata
      const formData = new FormData();
      formData.append('name', newBackgroundName);
      formData.append('isActive', 'true');
      formData.append('file', file);
      
      // Use the API endpoint instead of direct Supabase calls
      const response = await fetch('/api/admin/add-background', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'ajout de l'arrière-plan");
      }
      
      const { data } = await response.json();
      
      setSuccess('Arrière-plan ajouté avec succès !');
      setNewBackgroundName('');
      setFile(null);
      fetchBackgrounds();
    } catch (error) {
      console.error('Error uploading background:', error);
      setError(`Erreur lors du téléchargement: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id, storagePath) {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet arrière-plan ?')) {
      return;
    }

    try {
      // Delete from backgrounds table
      const { error: deleteError } = await supabase
        .from('backgrounds')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('backgrounds')
        .remove([storagePath]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
      }

      setSuccess('Arrière-plan supprimé avec succès !');
      fetchBackgrounds();
    } catch (error) {
      console.error('Error deleting background:', error);
      setError('Erreur lors de la suppression. Veuillez réessayer.');
    }
  }

  async function handleUpdate(id) {
    if (!editName) {
      setError('Le nom ne peut pas être vide');
      return;
    }

    try {
      const { error } = await supabase
        .from('backgrounds')
        .update({ name: editName })
        .eq('id', id);

      if (error) throw error;

      setSuccess('Nom mis à jour avec succès !');
      setEditingId(null);
      fetchBackgrounds();
    } catch (error) {
      console.error('Error updating background:', error);
      setError('Erreur lors de la mise à jour. Veuillez réessayer.');
    }
  }

  function startEditing(background) {
    setEditingId(background.id);
    setEditName(background.name);
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Ajouter un nouvel arrière-plan</h3>
        
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
        
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label htmlFor="backgroundName" className="block text-sm font-medium text-gray-700">
              Nom de l&apos;arrière-plan
            </label>
            <input
              type="text"
              id="backgroundName"
              value={newBackgroundName}
              onChange={(e) => setNewBackgroundName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Ex: Fond principal"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Image</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                {file ? (
                  <div className="text-sm text-gray-600">
                    Fichier sélectionné: {file.name}
                  </div>
                ) : (
                  <>
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                        <span>Télécharger un fichier</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={(e) => setFile(e.target.files[0])}
                          required
                        />
                      </label>
                      <p className="pl-1">ou glisser-déposer</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF jusqu&apos;à 10MB</p>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="pt-3">
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
            >
              {uploading ? 'Téléchargement...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>

      {/* Backgrounds List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Arrière-plans existants</h3>
        </div>
        
        {backgrounds.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Aucun arrière-plan trouvé. Commencez par en ajouter un !
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {backgrounds.map((background) => (
              <div key={background.id} className="p-6 flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 relative">
                    <Image
                      src={background.image_url}
                      alt={background.name}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-md"
                    />
                  </div>
                  
                  <div>
                    {editingId === background.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-2 py-1 text-sm border rounded-md"
                        />
                        <button
                          onClick={() => handleUpdate(background.id)}
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
                      <h4 className="font-medium text-gray-900">{background.name}</h4>
                    )}
                    
                    <p className="text-sm text-gray-500 mt-1">
                      Ajouté le {new Date(background.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {editingId !== background.id && (
                    <button
                      onClick={() => startEditing(background)}
                      className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md"
                    >
                      Modifier
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDelete(background.id, background.storage_path)}
                    className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-md"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
