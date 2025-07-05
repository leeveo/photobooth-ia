'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RiUserLine, RiMailLine, RiPhoneLine, RiCheckboxCircleLine, RiInformationLine, RiShieldLine } from 'react-icons/ri';

export default function DataCaptureManager({ 
  projectId, 
  project, 
  setProject, 
  setError, 
  setSuccess 
}) {
  const [loading, setLoading] = useState(false);
  const [rgpdText, setRgpdText] = useState(project?.rgpd_text || '');
  const [savingRgpd, setSavingRgpd] = useState(false);
  const supabase = createClientComponentClient();

  // Synchroniser l'état local quand le projet change
  useEffect(() => {
    if (project?.rgpd_text !== undefined) {
      setRgpdText(project.rgpd_text || '');
    }
  }, [project?.rgpd_text]);

  const handleDataCaptureToggle = async (enabled) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Mettre à jour le champ datacapture dans la table projects
      const { error } = await supabase
        .from('projects')
        .update({ datacapture: enabled })
        .eq('id', projectId);

      if (error) throw error;

      // Mettre à jour l'état local du projet
      setProject({ ...project, datacapture: enabled });
      
      // Afficher un message de succès
      setSuccess(enabled 
        ? 'Capture de données activée avec succès !' 
        : 'Capture de données désactivée avec succès !'
      );

    } catch (error) {
      console.error('Erreur lors de la mise à jour de la capture de données:', error);
      setError('Erreur lors de la mise à jour de la capture de données');
    } finally {
      setLoading(false);
    }
  };

  const handleRgpdTextSave = async () => {
    setSavingRgpd(true);
    setError(null);
    setSuccess(null);

    try {
      // Mettre à jour le texte RGPD dans la table projects
      const { error } = await supabase
        .from('projects')
        .update({ rgpd_text: rgpdText })
        .eq('id', projectId);

      if (error) throw error;

      // Mettre à jour l'état local du projet
      setProject({ ...project, rgpd_text: rgpdText });
      
      setSuccess('Texte RGPD enregistré avec succès !');

    } catch (error) {
      console.error('Erreur lors de la mise à jour du texte RGPD:', error);
      setError('Erreur lors de la mise à jour du texte RGPD');
    } finally {
      setSavingRgpd(false);
    }
  };

  const defaultRgpdText = `En utilisant ce photobooth, j'accepte que mes données personnelles (nom, email, téléphone) soient collectées et traitées dans le cadre de cet événement. Ces données seront utilisées uniquement pour l'envoi de ma photo et ne seront pas transmises à des tiers. Conformément au RGPD, je dispose d'un droit d'accès, de rectification et de suppression de mes données en contactant l'organisateur.`;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md mr-3">
            <span className="text-white font-semibold">3</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <RiUserLine className="mr-2 h-5 w-5 text-blue-600" />
              Capture de données utilisateur
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Collectez les informations des utilisateurs avant la prise de photo
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Information sur la fonctionnalité */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <RiInformationLine className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">À propos de la capture de données</h4>
              <div className="mt-2 text-sm text-blue-700">
                <p className="mb-2">
                  Lorsque cette option est activée, les utilisateurs devront remplir un formulaire avant de pouvoir prendre leur photo.
                </p>
                <p className="font-medium">Informations collectées :</p>
                <ul className="mt-1 space-y-1">
                  <li className="flex items-center">
                    <RiUserLine className="h-4 w-4 mr-2 text-blue-500" />
                    <span>Nom complet (obligatoire)</span>
                  </li>
                  <li className="flex items-center">
                    <RiMailLine className="h-4 w-4 mr-2 text-blue-500" />
                    <span>Adresse email (optionnel)</span>
                  </li>
                  <li className="flex items-center">
                    <RiPhoneLine className="h-4 w-4 mr-2 text-blue-500" />
                    <span>Numéro de téléphone (optionnel)</span>
                  </li>
                  <li className="flex items-center">
                    <RiShieldLine className="h-4 w-4 mr-2 text-blue-500" />
                    <span>Acceptation des conditions RGPD (obligatoire)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle pour activer/désactiver la capture de données */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 mb-6">
          <div className="flex items-center">
            <RiCheckboxCircleLine className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h4 className="text-lg font-medium text-gray-900">
                Activer la capture de données
              </h4>
              <p className="text-sm text-gray-600">
                Les utilisateurs devront saisir leurs informations avant la photo
              </p>
            </div>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={project?.datacapture || false}
              onChange={(e) => handleDataCaptureToggle(e.target.checked)}
              disabled={loading}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Configuration du texte RGPD */}
        {project?.datacapture && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex items-center mb-4">
              <RiShieldLine className="h-5 w-5 text-blue-600 mr-2" />
              <h4 className="text-lg font-medium text-gray-900">
                Texte de consentement RGPD
              </h4>
            </div>
            
            <div className="mb-4">
              <label htmlFor="rgpd_text" className="block text-sm font-medium text-gray-700 mb-2">
                Message de consentement pour les utilisateurs
              </label>
              <textarea
                id="rgpd_text"
                rows={6}
                value={rgpdText}
                onChange={(e) => setRgpdText(e.target.value)}
                placeholder={defaultRgpdText}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-gray-400"
              />
              <p className="mt-2 text-xs text-gray-500">
                Ce texte sera affiché aux utilisateurs qui devront l'accepter pour continuer.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleRgpdTextSave}
                disabled={savingRgpd}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingRgpd ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <RiShieldLine className="h-4 w-4 mr-1" />
                    Enregistrer le texte RGPD
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Statut actuel */}
        <div className="p-3 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className={`h-2 w-2 rounded-full mr-2 ${
              project?.datacapture ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
            <span className="text-sm font-medium text-gray-900">
              Statut actuel : 
            </span>
            <span className={`ml-2 text-sm font-semibold ${
              project?.datacapture ? 'text-green-600' : 'text-gray-600'
            }`}>
              {project?.datacapture ? 'Activé' : 'Désactivé'}
            </span>
          </div>
          
          {project?.datacapture && (
            <div className="mt-2 text-xs text-gray-500">
              Les données collectées seront stockées et accessibles dans l'interface d'administration.
              {project?.rgpd_text && (
                <div className="mt-1 font-medium text-green-600">
                  ✓ Texte RGPD configuré
                </div>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="mt-4 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Mise à jour en cours...</span>
          </div>
        )}
      </div>
    </div>
  );
}
