'use client';

import { useState } from 'react';

export default function FixPaymentsPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFix = async () => {
    if (!email) {
      alert('Veuillez entrer votre email');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/fix-my-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail: email })
      });

      const data = await response.json();
      setResult(data);

    } catch (error) {
      setResult({ error: 'Erreur de connexion', details: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🔧 Réparation des Paiements
          </h1>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              Problème : Paiements non liés à votre compte Google
            </h2>
            <p className="text-blue-700 text-sm">
              Si vous avez effectué un paiement mais que votre plan n'apparaît pas dans vos paramètres, 
              cet outil va lier automatiquement vos paiements à votre compte.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Votre email Google (utilisé pour vous connecter)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemple@gmail.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleFix}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? '🔄 Recherche et liaison...' : '🔧 Réparer mes paiements'}
            </button>
          </div>

          {result && (
            <div className={`mt-6 p-4 rounded-lg ${
              result.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {result.success ? (
                <div className="text-green-800">
                  <h3 className="font-semibold text-lg mb-2">{result.message}</h3>
                  
                  {result.paiements_lies?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Paiements liés :</h4>
                      <ul className="space-y-1 text-sm">
                        {result.paiements_lies.map((payment, i) => (
                          <li key={i} className="flex justify-between">
                            <span>Plan: {payment.plan}</span>
                            <span>{payment.quota} photos - {payment.amount/100}€</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.next_steps && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Prochaines étapes :</h4>
                      <ul className="text-sm space-y-1">
                        {result.next_steps.map((step, i) => (
                          <li key={i}>• {step}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-green-200">
                    <a 
                      href="/photobooth-ia/admin/parametre" 
                      className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      → Voir mes paramètres
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-red-800">
                  <h3 className="font-semibold">❌ {result.error}</h3>
                  {result.details && (
                    <p className="text-sm mt-1">{result.details}</p>
                  )}
                  {result.suggestion && (
                    <p className="text-sm mt-2 font-medium">{result.suggestion}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-8 text-sm text-gray-600">
            <h3 className="font-medium mb-2">Emails disponibles dans le système :</h3>
            <ul className="text-xs space-y-1 bg-gray-50 p-3 rounded">
              <li>• waibooth.app@gmail.com</li>
              <li>• waibooth.app2@gmail.com</li>
              <li>• bpcmetavers@gmail.com</li>
              <li>• leeveo.tv@gmail.com</li>
              <li>• admin@photoboothia.com</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}