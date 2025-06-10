'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RiArrowLeftLine, RiSaveLine } from 'react-icons/ri';
import dynamic from 'next/dynamic';

// Import du composant TemplateEditor
const TemplateEditor = dynamic(
  () => import('../components/TemplateEditor'),
  { ssr: false }
);

const categories = [
  'portrait', 'paysage', 'événement', 'business', 'créatif', 'autre'
];

export default function NewLayoutTemplate() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    category: '',
    is_public: true
  });
  const [canvasLayout, setCanvasLayout] = useState({
    elements: [],
    stageSize: { width: 970, height: 651, scale: 1 }
  });

  // Fonction pour sauvegarder le template
  const saveTemplate = async () => {
    if (!templateData.name) {
      setError('Le nom du template est requis');
      return;
    }

    if (canvasLayout.elements.length === 0) {
      setError('Vous devez ajouter au moins un élément au canvas');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Préparation des données pour la sauvegarde...');
      
      // Créer un objet avec uniquement les données nécessaires (sans project_id)
      const dataToSend = {
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
        is_public: templateData.is_public,
        elements: canvasLayout.elements,
        stage_size: canvasLayout.stageSize
      };
      
      console.log('Tentative de sauvegarde via API standard...');
      
      // Première tentative avec la route API standard
      let success = false;
      try {
        const response = await fetch('/api/admin/save-template', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSend),
        });

        const result = await response.json();
        
        if (response.ok) {
          success = true;
          console.log('Sauvegarde réussie via API standard');
          setSuccess('Template créé avec succès!');
        } else {
          console.warn('Échec API standard, erreur:', result.error);
          // On continue pour essayer la méthode alternative
        }
      } catch (apiError) {
        console.error('Erreur API standard:', apiError);
        // On continue pour essayer la méthode alternative
      }
      
      // Si la première méthode a échoué, essayer la méthode directe
      if (!success) {
        console.log('Tentative de sauvegarde via méthode directe SQL...');
        
        try {
          const directResponse = await fetch('/api/admin/direct-save-template', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend),
          });

          const directResult = await directResponse.json();
          
          if (directResponse.ok) {
            success = true;
            console.log('Sauvegarde réussie via méthode SQL directe');
            setSuccess('Template créé avec succès (méthode alternative)!');
          } else {
            throw new Error(directResult.error || 'Échec de la méthode alternative');
          }
        } catch (directError) {
          console.error('Erreur méthode directe:', directError);
          throw new Error('Échec des deux méthodes de sauvegarde');
        }
      }
      
      // Si aucune méthode n'a fonctionné, on sera déjà sortis avec une erreur
      
      // Redirection vers la liste des templates après un court délai
      setTimeout(() => {
        router.push('/photobooth-ia/admin/layout-templates');
      }, 1500);
    } catch (error) {
      console.error('Error saving template:', error);
      setError(`Erreur lors de la sauvegarde du template: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Nouveau Template de Layout</h1>
        <Link href="/photobooth-ia/admin/layout-templates"
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
        >
          <RiArrowLeftLine className="mr-2 h-4 w-4" />
          Retour à la liste
        </Link>
      </div>

      {error && (
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
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Informations du template</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nom du template *
            </label>
            <input
              type="text"
              id="name"
              value={templateData.name}
              onChange={(e) => setTemplateData({...templateData, name: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Catégorie
            </label>
            <select
              id="category"
              value={templateData.category}
              onChange={(e) => setTemplateData({...templateData, category: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={templateData.description}
              onChange={(e) => setTemplateData({...templateData, description: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <div className="flex items-center">
              <input
                id="is_public"
                type="checkbox"
                checked={templateData.is_public}
                onChange={(e) => setTemplateData({...templateData, is_public: e.target.checked})}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="is_public" className="ml-2 block text-sm text-gray-700">
                Rendre ce template public
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Les templates publics seront visibles et utilisables par tous les utilisateurs.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Éditeur de Canvas</h2>
          <p className="mt-1 text-sm text-gray-500">
            Créez votre template en ajoutant et positionnant des éléments sur le canvas.
          </p>
        </div>
        <TemplateEditor 
          onSave={(layoutData) => {
            console.log('Mise à jour du layout dans l\'éditeur', layoutData);
            setCanvasLayout(layoutData);
            setSuccess("Layout mis à jour dans l'éditeur");
          }}
          initialData={canvasLayout}
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={saveTemplate}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sauvegarde en cours...
            </>
          ) : (
            <>
              <RiSaveLine className="mr-2 h-4 w-4" />
              Sauvegarder le template
            </>
          )}
        </button>
      </div>
    </div>
  );
}
