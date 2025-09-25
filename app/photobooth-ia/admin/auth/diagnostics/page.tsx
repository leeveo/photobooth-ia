'use client';
import { useState } from 'react';
import { ProductionDiagnostic } from '../../../../../lib/productionDiagnostic';

export default function DiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const results = await ProductionDiagnostic.runDiagnostics();
      setDiagnostics(results);
    } catch (error) {
      console.error("Erreur diagnostics:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            🔬 Diagnostics de Production OAuth
          </h1>
          
          <div className="mb-6">
            <button
              onClick={runDiagnostics}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Diagnostic en cours...' : 'Lancer les diagnostics'}
            </button>
          </div>
          
          {diagnostics && (
            <div className="space-y-6">
              {/* Résumé */}
              <div className="bg-gray-50 p-4 rounded">
                <h2 className="text-lg font-semibold mb-2">📊 Résumé</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Environment:</span> {diagnostics.environment?.origin || 'Non disponible'}
                  </div>
                  <div>
                    <span className="font-medium">Timestamp:</span> {diagnostics.timestamp}
                  </div>
                  <div>
                    <span className="font-medium">API Health:</span>
                    <span className={diagnostics.apiHealthCheck?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}>
                      {diagnostics.apiHealthCheck?.status || 'Erreur'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">OAuth Config:</span>
                    <span className={diagnostics.googleOAuthConfig?.status === 'active' ? 'text-green-600' : 'text-red-600'}>
                      {diagnostics.googleOAuthConfig?.status || 'Erreur'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Environnement */}
              <div className="bg-blue-50 p-4 rounded">
                <h2 className="text-lg font-semibold mb-2">🌍 Environnement</h2>
                <pre className="text-xs bg-white p-2 rounded overflow-auto">
                  {JSON.stringify(diagnostics.environment, null, 2)}
                </pre>
              </div>

              {/* API Health */}
              <div className="bg-green-50 p-4 rounded">
                <h2 className="text-lg font-semibold mb-2">🏥 Santé API</h2>
                <pre className="text-xs bg-white p-2 rounded overflow-auto">
                  {JSON.stringify(diagnostics.apiHealthCheck, null, 2)}
                </pre>
              </div>

              {/* Configuration OAuth */}
              <div className="bg-yellow-50 p-4 rounded">
                <h2 className="text-lg font-semibold mb-2">🔐 Configuration OAuth</h2>
                <pre className="text-xs bg-white p-2 rounded overflow-auto">
                  {JSON.stringify(diagnostics.googleOAuthConfig, null, 2)}
                </pre>
              </div>

              {/* Connectivité réseau */}
              <div className="bg-purple-50 p-4 rounded">
                <h2 className="text-lg font-semibold mb-2">🌐 Connectivité Réseau</h2>
                <pre className="text-xs bg-white p-2 rounded overflow-auto">
                  {JSON.stringify(diagnostics.networkConnectivity, null, 2)}
                </pre>
              </div>

              {/* Erreurs */}
              {diagnostics.errors && diagnostics.errors.length > 0 && (
                <div className="bg-red-50 p-4 rounded">
                  <h2 className="text-lg font-semibold mb-2">❌ Erreurs</h2>
                  <pre className="text-xs bg-white p-2 rounded overflow-auto">
                    {JSON.stringify(diagnostics.errors, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}