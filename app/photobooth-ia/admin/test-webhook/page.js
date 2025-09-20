'use client';

import { useState, useEffect } from 'react';

export default function TestWebhookPage() {
  const [logs, setLogs] = useState([]);
  const [adminId, setAdminId] = useState('');
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    // Récupérer l'admin ID au chargement
    let adminUserId = localStorage.getItem('currentAdminId') 
      || localStorage.getItem('adminUserId')
      || localStorage.getItem('admin_user_id')
      || localStorage.getItem('userId')
      || localStorage.getItem('user_id');

    if (!adminUserId) {
      const adminSession = localStorage.getItem('admin_session');
      if (adminSession) {
        try {
          const decodedSession = JSON.parse(atob(adminSession));
          adminUserId = decodedSession.userId || decodedSession.user_id || decodedSession.id;
        } catch (e) {
          console.log('Erreur décodage admin_session:', e);
        }
      }
    }

    setAdminId(adminUserId || 'NON TROUVÉ');
  }, []);

  const addLog = (message) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  const testWebhookConnectivity = async () => {
    addLog('🧪 Test de connectivité webhook...');
    setTestResult('');

    try {
      // Test 1: Vérifier que l'endpoint webhook existe
      addLog('📡 Test 1: Vérification endpoint webhook...');
      const testResponse = await fetch('/api/stripe-webhook', {
        method: 'GET'
      });
      addLog(`📊 Réponse GET webhook: ${testResponse.status}`);

      // Test 2: Simuler un appel POST (sans signature)
      addLog('📡 Test 2: Simulation appel POST...');
      const mockEvent = {
        type: 'test.event',
        data: {
          object: {
            id: 'test_session_' + Date.now(),
            metadata: {
              purchase_type: 'addon',
              admin_user_id: adminId,
              addon_type: 'photo_pack',
              addon_value: '100',
              addon_name: 'Pack Test'
            },
            amount_total: 990
          }
        }
      };

      const postResponse = await fetch('/api/stripe-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockEvent)
      });

      const postResult = await postResponse.text();
      addLog(`📊 Réponse POST webhook: ${postResponse.status}`);
      addLog(`📄 Corps de réponse: ${postResult}`);

      if (postResponse.ok) {
        setTestResult('✅ Webhook accessible et répond correctement');
      } else {
        setTestResult(`❌ Webhook accessible mais erreur: ${postResult}`);
      }

    } catch (error) {
      addLog(`❌ Erreur test webhook: ${error.message}`);
      setTestResult(`❌ Erreur de connectivité: ${error.message}`);
    }
  };

  const checkAddonPurchases = async () => {
    addLog('🔍 Vérification des achats d\'addon...');
    
    try {
      const response = await fetch('/api/admin/check-addon-purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ adminId })
      });

      if (response.ok) {
        const data = await response.json();
        addLog(`📊 Achats d'addon trouvés: ${data.purchases?.length || 0}`);
        if (data.purchases?.length > 0) {
          data.purchases.forEach((purchase, index) => {
            addLog(`📦 Achat ${index + 1}: ${purchase.addon_name} (${purchase.addon_value} photos) - ${purchase.created_at}`);
          });
        }
      } else {
        addLog(`❌ Erreur vérification achats: ${response.status}`);
      }
    } catch (error) {
      addLog(`❌ Erreur: ${error.message}`);
    }
  };

  const testAddonPurchaseMinimal = async () => {
    addLog('🛒 Test achat addon minimal (€0.01)...');
    
    try {
      const response = await fetch('/api/create-addon-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          priceId: 'price_1QOXcsGwNhHyAZ3lCCktFEwv', // Pack 100 photos
          addonType: 'photo_pack',
          addonValue: 100,
          addonName: 'Pack Test 100',
          adminId: adminId
        })
      });

      if (response.ok) {
        const data = await response.json();
        addLog(`✅ Session créée: ${data.sessionId}`);
        addLog(`🔗 Vous pouvez tester le paiement avec cette session`);
      } else {
        const error = await response.text();
        addLog(`❌ Erreur création session: ${error}`);
      }
    } catch (error) {
      addLog(`❌ Erreur: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">🧪 Test Webhook Stripe</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">ℹ️ Informations</h2>
          <div className="space-y-2">
            <p><strong>Admin ID:</strong> <span className="font-mono bg-gray-100 px-2 py-1 rounded">{adminId}</span></p>
            <p><strong>Environment:</strong> <span className="font-mono bg-gray-100 px-2 py-1 rounded">{process.env.NODE_ENV || 'unknown'}</span></p>
            <p><strong>URL actuelle:</strong> <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">{typeof window !== 'undefined' ? window.location.origin : 'server'}</span></p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🚀 Actions de test</h2>
          <div className="space-y-4">
            <button
              onClick={testWebhookConnectivity}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mr-4"
            >
              📡 Tester Connectivité Webhook
            </button>
            
            <button
              onClick={checkAddonPurchases}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 mr-4"
            >
              🔍 Vérifier Achats Addon
            </button>
            
            <button
              onClick={testAddonPurchaseMinimal}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
            >
              🛒 Créer Session Test
            </button>
          </div>

          {testResult && (
            <div className={`mt-4 p-4 rounded-lg ${testResult.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {testResult}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📋 Logs de debug</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p>Aucun log pour le moment...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>
          <button
            onClick={() => setLogs([])}
            className="mt-4 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            🗑️ Vider les logs
          </button>
        </div>
      </div>
    </div>
  );
}