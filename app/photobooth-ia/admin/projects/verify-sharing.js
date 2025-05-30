'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function VerifySharingMethods() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const supabase = createClientComponentClient();

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, slug, sharing_method')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  async function updateSharingMethod(projectId, method) {
    try {
      setUpdating(projectId);
      
      const { error } = await supabase
        .from('projects')
        .update({ sharing_method: method })
        .eq('id', projectId);
        
      if (error) throw error;
      
      fetchProjects();
    } catch (error) {
      console.error('Error updating sharing method:', error);
    } finally {
      setUpdating(null);
    }
  }

  if (loading) return <div>Chargement des projets...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Vérification des méthodes de partage</h1>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
        <p className="text-sm text-yellow-700">
          Cet outil vous permet de vérifier et de modifier rapidement les méthodes de partage de vos projets.
          Utilisez-le si vous rencontrez des problèmes avec les formulaires d&apos;email.
        </p>
      </div>
      s
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projet</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Méthode actuelle</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {projects.map(project => (
            <tr key={project.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{project.name}</div>
                <div className="text-sm text-gray-500">/{project.slug}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  project.sharing_method === 'email' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {project.sharing_method === 'email' ? 'Email' : 'QR Code'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={() => updateSharingMethod(project.id, 'email')}
                  disabled={updating === project.id || project.sharing_method === 'email'}
                  className={`mr-2 px-3 py-1 rounded ${
                    updating === project.id || project.sharing_method === 'email'
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {updating === project.id ? 'Mise à jour...' : 'Définir Email'}
                </button>
                <button
                  onClick={() => updateSharingMethod(project.id, 'qr_code')}
                  disabled={updating === project.id || project.sharing_method === 'qr_code'}
                  className={`px-3 py-1 rounded ${
                    updating === project.id || project.sharing_method === 'qr_code'
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {updating === project.id ? 'Mise à jour...' : 'Définir QR Code'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
