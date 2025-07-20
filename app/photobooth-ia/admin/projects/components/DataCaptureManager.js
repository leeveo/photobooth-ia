'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [useDefaultRgpd, setUseDefaultRgpd] = useState(false);
  const [showRgpdConfirm, setShowRgpdConfirm] = useState(false);
  const supabase = createClientComponentClient();

  // Deux textes RGPD prédéfinis
  const rgpdOptions = [
    {
      key: 'default',
      label: "RGPD standard (pas de transmission à des tiers)",
      text: `En utilisant ce photobooth, j'accepte que mes données personnelles (nom, email, téléphone) soient collectées et traitées dans le cadre de cet événement. Ces données seront utilisées uniquement pour l'envoi de ma photo et ne seront pas transmises à des tiers. Conformément au RGPD, je dispose d'un droit d'accès, de rectification et de suppression de mes données en contactant l'organisateur.`
    },
    {
      key: 'partner',
      label: "RGPD avec transmission à un partenaire commercial",
      text: `En utilisant ce photobooth, j’accepte que mes données personnelles (nom, email, téléphone) soient collectées et traitées dans le cadre de cet événement. Ces données seront utilisées pour l’envoi de ma photo et pourront également être transmises à un partenaire commercial de l’événement à des fins de prospection ou d’information.
Conformément au RGPD, je dispose d’un droit d’accès, de rectification et de suppression de mes données en contactant l’organisateur.`
    },
    {
      key: 'custom',
      label: "Texte personnalisé",
      text: ''
    }
  ];

  // État pour la sélection RGPD
  const [rgpdChoice, setRgpdChoice] = useState('custom');

  // Synchroniser le choix RGPD selon le texte du projet
  useEffect(() => {
    if (project?.rgpd_text !== undefined) {
      // Vérifier si le texte correspond à l'un des textes prédéfinis
      if (project.rgpd_text === rgpdOptions[0].text) {
        setRgpdChoice('default');
        setRgpdText(rgpdOptions[0].text);
      } else if (project.rgpd_text === rgpdOptions[1].text) {
        setRgpdChoice('partner');
        setRgpdText(rgpdOptions[1].text);
      } else {
        setRgpdChoice('custom');
        setRgpdText(project.rgpd_text || '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.rgpd_text]);

  // Quand l'utilisateur change de choix RGPD
  const handleRgpdChoiceChange = (key) => {
    setRgpdChoice(key);
    if (key === 'default' || key === 'partner') {
      const selected = rgpdOptions.find(opt => opt.key === key);
      setRgpdText(selected.text);
    }
    // Si custom, garder le texte actuel (déjà dans rgpdText)
  };

  // Synchroniser l'état local quand le projet change
  useEffect(() => {
    if (project?.rgpd_text !== undefined) {
      setRgpdText(project.rgpd_text || '');
    }
  }, [project?.rgpd_text]);

  // Synchroniser le texte RGPD si la case par défaut est cochée/décochée
  useEffect(() => {
    if (useDefaultRgpd) {
      setRgpdText(defaultRgpdText);
    } else if (project?.rgpd_text !== undefined) {
      setRgpdText(project.rgpd_text || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDefaultRgpd]);

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

  // Popup de confirmation RGPD
  const rgpdPopupAnimations = `
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes checkmark {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.animate-success-popup {
  animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}
.animate-success-icon {
  animation: checkmark 0.5s cubic-bezier(0.65, 0, 0.35, 1) forwards;
}
.animate-success-text {
  opacity: 0;
  animation: fadeInUp 0.5s ease forwards;
  animation-delay: 0.3s;
}
  `;
  const styleInjected = useRef(false);
  useEffect(() => {
    if (!styleInjected.current && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.innerHTML = rgpdPopupAnimations;
      document.head.appendChild(style);
      styleInjected.current = true;
    }
  }, []);

  // Handler pour le bouton d'enregistrement RGPD (ouvre le popup)
  const handleRgpdTextSaveClick = () => {
    setShowRgpdConfirm(true);
  };

  // Handler pour la confirmation dans le popup
  const handleRgpdTextSaveConfirmed = async () => {
    setShowRgpdConfirm(false);
    await handleRgpdTextSave();
  };

  const defaultRgpdText = `En utilisant ce photobooth, j'accepte que mes données personnelles (nom, email, téléphone) soient collectées et traitées dans le cadre de cet événement. Ces données seront utilisées uniquement pour l'envoi de ma photo et ne seront pas transmises à des tiers. Conformément au RGPD, je dispose d'un droit d'accès, de rectification et de suppression de mes données en contactant l'organisateur.`;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md mr-3">
            <span className="text-white font-semibold">3</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              
              Capture de données utilisateur
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Collectez les informations des utilisateurs avant la prise de photo
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Colonne gauche : activation, texte RGPD, statut */}
          <div className="space-y-6">
            {/* Toggle pour activer/désactiver la capture de données */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
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
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <div className="flex items-center mb-4">
                  <RiShieldLine className="h-5 w-5 text-blue-600 mr-2" />
                  <h4 className="text-lg font-medium text-gray-900">
                    Texte de consentement RGPD
                  </h4>
                </div>
                {/* Liste à puce pour choisir le texte RGPD */}
                <div className="mb-4">
                  <span className="block text-sm font-medium text-gray-700 mb-2">
                    Choisissez un texte RGPD :
                  </span>
                  <ul className="space-y-2">
                    {rgpdOptions.map(option => (
                      <li key={option.key} className="flex items-start">
                        <input
                          type="radio"
                          id={`rgpd_${option.key}`}
                          name="rgpd_choice"
                          value={option.key}
                          checked={rgpdChoice === option.key}
                          onChange={() => handleRgpdChoiceChange(option.key)}
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-1"
                        />
                        <label htmlFor={`rgpd_${option.key}`} className="ml-2 block text-sm text-gray-700 cursor-pointer">
                          {option.label}
                          {option.text && (
                            <div className="text-xs text-gray-500 mt-1 italic">{option.text}</div>
                          )}
                        </label>
                      </li>
                    ))}
                  </ul>
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
                    placeholder={rgpdOptions[0].text}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-gray-400"
                    disabled={rgpdChoice !== 'custom'}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Ce texte sera affiché aux utilisateurs qui devront l'accepter pour continuer.
                  </p>
                </div>
                {/* Nouveau style de bouton d'enregistrement RGPD */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end">
                  <button
                    type="button"
                    onClick={handleRgpdTextSaveClick}
                    disabled={savingRgpd}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-md text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all transform hover:-translate-y-0.5"
                  >
                    {savingRgpd ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span className="ml-2">Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <RiShieldLine className="mr-2 h-4 w-4" />
                        Enregistrer le texte RGPD
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Popup de confirmation RGPD */}
            {showRgpdConfirm && (
              <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center p-4" role="dialog" aria-modal="true">
                <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl shadow-2xl overflow-hidden w-full max-w-md transform transition-all animate-success-popup"
                  onClick={e => e.stopPropagation()}>
                  {/* Header avec effet de gradient */}
                  <div className="h-28 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
                    <div className="z-10 rounded-full bg-white bg-opacity-20 p-4 animate-success-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  {/* Content */}
                  <div className="p-6 text-center">
                    <h3 className="text-2xl font-bold text-white mb-3 animate-success-text">Confirmer l'enregistrement</h3>
                    <p className="text-gray-300 mb-4 animate-success-text" style={{ animationDelay: "0.1s" }}>
                      Voulez-vous enregistrer ce texte RGPD pour votre projet ?
                    </p>
                    <div className="mt-6 text-sm text-gray-400 animate-success-text" style={{ animationDelay: "0.2s" }}>
                      Ce texte sera affiché aux utilisateurs avant la prise de photo.
                    </div>
                  </div>
                  {/* Footer */}
                  <div className="bg-gray-900 px-6 py-4 flex justify-center space-x-4 animate-success-text" style={{ animationDelay: "0.3s" }}>
                    <button
                      type="button"
                      onClick={() => setShowRgpdConfirm(false)}
                      className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                      disabled={savingRgpd}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleRgpdTextSaveConfirmed}
                      className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg flex items-center"
                      disabled={savingRgpd}
                    >
                      {savingRgpd ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <RiShieldLine className="mr-2 h-4 w-4" />
                          Confirmer
                        </>
                      )}
                    </button>
                  </div>
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

          {/* Colonne droite : explications et tutoriel RGPD */}
          <div className="space-y-6">
            {/* À propos de la capture de données */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
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
            {/* Tutoriel RGPD */}
            <div className="bg-purple-50 border-l-4 border-purple-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <RiShieldLine className="h-5 w-5 text-purple-500" />
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-bold text-purple-800 mb-1">Comment rédiger un bon texte RGPD ?</h4>
                  <ol className="list-decimal ml-5 text-sm text-purple-700 space-y-1">
                    <li>
                      <span className="font-semibold">Soyez clair et concis</span> : expliquez quelles données sont collectées et pourquoi.
                    </li>
                    <li>
                      <span className="font-semibold">Indiquez la finalité</span> : précisez l'usage (ex : envoi de la photo, statistiques...).
                    </li>
                    <li>
                      <span className="font-semibold">Mentionnez la durée de conservation</span> : combien de temps les données sont gardées.
                    </li>
                    <li>
                      <span className="font-semibold">Droits des utilisateurs</span> : informez sur le droit d'accès, de rectification et de suppression.
                    </li>
                    <li>
                      <span className="font-semibold">Contact</span> : indiquez comment exercer ces droits (email de l'organisateur).
                    </li>
                  </ol>
                  <div className="mt-3 text-xs text-purple-600 italic">
                    Exemple : "En utilisant ce photobooth, j'accepte que mes données personnelles soient collectées pour l'envoi de ma photo. Elles seront conservées 30 jours maximum et ne seront pas partagées. Pour toute demande, contactez : monemail@domaine.com"
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
