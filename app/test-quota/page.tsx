'use client';

import { useState } from 'react';

interface TestResult {
  success: boolean;
  data?: any;
  error?: any;
}

export default function TestQuotaPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [adminUserId, setAdminUserId] = useState('');

  const addTestQuota = async () => {
    if (!adminUserId) {
      alert('Veuillez entrer votre Admin User ID');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/test-add-quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminUserId,
          addonValue: 100,
          packName: 'Pack +100 Photos (Test Local)'
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        setResult({ success: true, data });
      } else {
        setResult({ success: false, error: data });
      }
    } catch (error) {
      setResult({ success: false, error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">🧪 Test d'ajout de quota</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin User ID
            </label>
            <input
              type="text"
              value={adminUserId}
              onChange={(e) => setAdminUserId(e.target.value)}
              placeholder="Entrez votre admin_user_id"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Trouvez votre ID dans le localStorage du navigateur ou la table admin_users
            </p>
          </div>

          <button
            onClick={addTestQuota}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Ajout en cours...' : '+ Ajouter 100 photos de test'}
          </button>
        </div>

        {result && (
          <div className={`mt-6 p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {result.success ? (
              <div>
                <h3 className="text-green-800 font-semibold mb-2">✅ Succès!</h3>
                <pre className="text-sm text-green-700 whitespace-pre-wrap">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            ) : (
              <div>
                <h3 className="text-red-800 font-semibold mb-2">❌ Erreur</h3>
                <pre className="text-sm text-red-700 whitespace-pre-wrap">
                  {JSON.stringify(result.error, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">💡 Instructions:</h3>
          <ol className="text-sm text-gray-600 space-y-1">
            <li>1. Ouvrez les outils de développement (F12)</li>
            <li>2. Allez dans l'onglet "Application" → "Local Storage"</li>
            <li>3. Cherchez la clé "currentAdminId" et copiez sa valeur</li>
            <li>4. Collez cette valeur dans le champ ci-dessus</li>
            <li>5. Cliquez sur "Ajouter 100 photos de test"</li>
            <li>6. Allez vérifier votre dashboard pour voir le quota mis à jour</li>
          </ol>
        </div>
      </div>
    </div>
  );
}