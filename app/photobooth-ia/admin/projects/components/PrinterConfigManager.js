'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function PrinterConfigManager({ projectId, project, setProject }) {
  const supabase = createClientComponentClient();
  
  const [printerEnabled, setPrinterEnabled] = useState(false);

  // Charger la configuration depuis le projet
  useEffect(() => {
    if (project) {
      setPrinterEnabled(project.printer_enabled ?? false);
    }
  }, [project]);

  // Switch pour l'activation de l'imprimante
  function PrinterSwitch({ checked, onChange }) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-purple-600' : 'bg-gray-300'}`}
      >
        <span className="sr-only">Activer l'impression automatique</span>
        <span
          className={`inline-block h-4 w-4 transform bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    );
  }

  // Fonction pour gérer le changement du switch imprimante
  const handlePrinterEnabledChange = async (newValue) => {
    setPrinterEnabled(newValue);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ printer_enabled: newValue })
        .eq('id', projectId);
      if (error) throw error;
      setProject(prev => ({ ...prev, printer_enabled: newValue }));
    } catch (err) {
      console.error('Erreur lors de la mise à jour du statut imprimante:', err);
      setPrinterEnabled(!newValue);
    }
  };

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 my-6">
      <div className="w-full">
        <h3 className="text-lg font-semibold mb-1 flex items-center">
          <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Configuration de l'impression automatique
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          Activez l'impression pour permettre aux utilisateurs d'imprimer leurs photos directement depuis l'application.
        </p>
        
        {/* Switch d'activation */}
        <div className="flex items-center gap-4 mb-6">
          <PrinterSwitch checked={printerEnabled} onChange={handlePrinterEnabledChange} />
          <span className="text-sm text-gray-700 font-medium">
            {printerEnabled ? "Impression activée" : "Impression désactivée"}
          </span>
        </div>

        {/* Encart explicatif du système de monitoring d'impression */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-100 border-2 border-indigo-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-base font-bold text-indigo-900 mb-2">
                🖨️ Système de Monitoring d'Impression Automatique
              </h4>
              <p className="text-sm text-indigo-800 mb-3 leading-relaxed">
                Un système de <strong>spool d'impression intelligent</strong> a été mis en place pour gérer l'impression automatique de toutes les photos générées par votre projet.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 mb-4 border border-indigo-100">
            <h5 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Comment ça fonctionne ?
            </h5>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold mt-0.5">1.</span>
                <span>Le système surveille en temps réel les nouvelles photos générées</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold mt-0.5">2.</span>
                <span>Chaque nouvelle image est automatiquement détectée et ajoutée à la file d'attente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold mt-0.5">3.</span>
                <span>Vous pouvez imprimer manuellement ou activer l'impression automatique</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold mt-0.5">4.</span>
                <span>L'historique complet des impressions est conservé pour un suivi optimal</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200">
            <h5 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Guide d'utilisation rapide
            </h5>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">
                    <strong>Activez l'impression</strong> avec le switch ci-dessus pour afficher le bouton d'impression sur le frontend
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800 mb-2">
                    <strong>Accédez à l'interface de monitoring</strong> depuis la sidebar :
                  </p>
                  <a 
                    href="/photobooth-ia/admin/print-monitor"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Ouvrir Impression Serveur
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">
                    <strong>Sélectionnez votre projet</strong> et démarrez le monitoring pour surveiller les nouvelles photos en temps réel
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  4
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">
                    <strong>Activez l'impression automatique</strong> ou imprimez manuellement chaque photo depuis l'interface
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 text-xs text-indigo-700 bg-indigo-100 rounded-lg p-3 border border-indigo-200">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="leading-relaxed">
              <strong>💡 Astuce :</strong> Le système peut être utilisé depuis n'importe quel PC connecté à votre imprimante. 
              Idéal pour gérer l'impression depuis un poste dédié pendant vos événements !
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
