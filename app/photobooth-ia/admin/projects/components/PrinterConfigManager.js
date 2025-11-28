'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function PrinterConfigManager({ projectId, project, setProject }) {
  const supabase = createClientComponentClient();
  
  const [printerEnabled, setPrinterEnabled] = useState(false);
  const [printerIp, setPrinterIp] = useState('');
  const [printerEndpoint, setPrinterEndpoint] = useState('/print');
  const [printerCopies, setPrinterCopies] = useState(1);
  const [printerFormat, setPrinterFormat] = useState('10x15');
  const [printerLoading, setPrinterLoading] = useState(false);
  const [printerSuccess, setPrinterSuccess] = useState(null);
  const [printerError, setPrinterError] = useState(null);

  // Charger la configuration depuis le projet
  useEffect(() => {
    if (project) {
      setPrinterEnabled(project.printer_enabled ?? false);
      setPrinterIp(project.printer_ip || '');
      setPrinterEndpoint(project.printer_endpoint || '/print');
      setPrinterCopies(project.printer_copies || 1);
      setPrinterFormat(project.printer_format || '10x15');
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

  // Fonction pour sauvegarder la configuration imprimante
  const handleSavePrinterConfig = async () => {
    setPrinterLoading(true);
    setPrinterError(null);
    setPrinterSuccess(null);
    
    try {
      // Validation de l'IP
      if (printerEnabled && !printerIp) {
        throw new Error('L\'adresse IP de l\'imprimante est obligatoire');
      }
      
      // Validation du format d'IP
      if (printerIp && !printerIp.match(/^https?:\/\/.+/)) {
        throw new Error('L\'adresse IP doit commencer par http:// ou https://');
      }
      
      const { error } = await supabase
        .from('projects')
        .update({
          printer_enabled: printerEnabled,
          printer_ip: printerIp,
          printer_endpoint: printerEndpoint,
          printer_copies: printerCopies,
          printer_format: printerFormat
        })
        .eq('id', projectId);
      
      if (error) throw error;
      
      setProject(prev => ({
        ...prev,
        printer_enabled: printerEnabled,
        printer_ip: printerIp,
        printer_endpoint: printerEndpoint,
        printer_copies: printerCopies,
        printer_format: printerFormat
      }));
      
      setPrinterSuccess('Configuration imprimante enregistrée avec succès');
      setTimeout(() => setPrinterSuccess(null), 3000);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setPrinterError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setPrinterLoading(false);
    }
  };

  // Fonction pour tester la connexion à l'imprimante
  const handleTestPrinter = async () => {
    setPrinterLoading(true);
    setPrinterError(null);
    setPrinterSuccess(null);
    
    try {
      if (!printerIp) {
        throw new Error('Veuillez saisir une adresse IP');
      }
      
      // Test de connexion simple
      const testUrl = `${printerIp}${printerEndpoint || '/print'}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal
      }).catch(() => null);
      
      clearTimeout(timeoutId);
      
      if (response) {
        setPrinterSuccess('✅ Imprimante accessible ! Configuration correcte.');
      } else {
        setPrinterError('⚠️ Impossible de joindre l\'imprimante. Vérifiez l\'adresse IP et que le module WCM est allumé.');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setPrinterError('⏱️ Timeout: l\'imprimante ne répond pas. Vérifiez l\'adresse IP.');
      } else {
        setPrinterError(err.message || 'Erreur lors du test');
      }
    } finally {
      setPrinterLoading(false);
      setTimeout(() => {
        setPrinterSuccess(null);
        setPrinterError(null);
      }, 5000);
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
          Connectez une imprimante DNP 620 avec le module WCM pour permettre aux utilisateurs d'imprimer leurs photos directement depuis l'application.
        </p>
        
        {/* Switch d'activation */}
        <div className="flex items-center gap-4 mb-4">
          <PrinterSwitch checked={printerEnabled} onChange={handlePrinterEnabledChange} />
          <span className="text-sm text-gray-700 font-medium">
            {printerEnabled ? "Impression activée" : "Impression désactivée"}
          </span>
        </div>

        {/* Configuration détaillée (visible seulement si activé) */}
        {printerEnabled && (
          <div className="mt-4 space-y-4 bg-white p-4 rounded-lg border border-purple-100">
            {/* Adresse IP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse IP du module WCM <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={printerIp}
                onChange={(e) => setPrinterIp(e.target.value)}
                placeholder="http://192.168.1.100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: http://192.168.x.x (trouvez l'IP dans les paramètres réseau du module WCM)
              </p>
            </div>

            {/* Endpoint */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endpoint d'impression
              </label>
              <input
                type="text"
                value={printerEndpoint}
                onChange={(e) => setPrinterEndpoint(e.target.value)}
                placeholder="/print"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Endpoint API du module WCM (par défaut: /print)
              </p>
            </div>

            {/* Nombre de copies et Format */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de copies
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={printerCopies}
                  onChange={(e) => setPrinterCopies(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Format d'impression
                </label>
                <select
                  value={printerFormat}
                  onChange={(e) => setPrinterFormat(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="10x15">10x15 cm</option>
                  <option value="13x18">13x18 cm</option>
                  <option value="15x20">15x20 cm</option>
                </select>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleSavePrinterConfig}
                disabled={printerLoading}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md shadow-sm text-sm font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {printerLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Enregistrer la configuration
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleTestPrinter}
                disabled={printerLoading || !printerIp}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-md shadow-sm text-sm font-medium hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {printerLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Test...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Tester la connexion
                  </>
                )}
              </button>
            </div>

            {/* Messages de succès/erreur */}
            {printerSuccess && (
              <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm">
                {printerSuccess}
              </div>
            )}
            {printerError && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                {printerError}
              </div>
            )}

            {/* Aide contextuelle */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-blue-800">
                  <p className="font-medium mb-1">Comment trouver l'IP du module WCM ?</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Connectez-vous au réseau WiFi du module WCM</li>
                    <li>Accédez à l'interface web (généralement http://192.168.1.1)</li>
                    <li>L'adresse IP s'affiche dans les paramètres réseau</li>
                    <li>Utilisez cette IP dans le champ ci-dessus</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message si désactivé */}
        {!printerEnabled && (
          <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-600">
            💡 Activez l'impression automatique pour configurer une imprimante DNP 620 avec module WCM.
          </div>
        )}
      </div>
    </div>
  );
}
