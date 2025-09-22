'use client';

import { useState, useEffect } from 'react';

export default function QuotaAuditPage() {
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(new Set());

  const runAudit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/audit-quotas');
      const data = await response.json();
      
      if (response.ok) {
        setAuditData(data);
      } else {
        alert(`Erreur audit: ${data.error}`);
      }
    } catch (error) {
      alert(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fixIssue = async (result, action) => {
    const key = `${result.admin_user_id}-${result.subscription_id}`;
    setFixing(prev => new Set([...prev, key]));

    try {
      const response = await fetch('/api/admin/audit-quotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          admin_user_id: result.admin_user_id,
          subscription_id: result.subscription_id
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`✅ ${data.message}`);
        // Relancer l'audit pour voir les changements
        runAudit();
      } else {
        alert(`❌ Erreur: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Erreur: ${error.message}`);
    } finally {
      setFixing(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  const getSeverityColor = (result) => {
    if (result.error) return 'bg-red-100 border-red-300';
    if (!result.is_active_in_stripe) return 'bg-red-100 border-red-300';
    if (result.is_expired) return 'bg-orange-100 border-orange-300';
    if (result.status_mismatch) return 'bg-yellow-100 border-yellow-300';
    return 'bg-green-100 border-green-300';
  };

  useEffect(() => {
    runAudit();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">🔍 Audit des Quotas</h1>
          <button
            onClick={runAudit}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '🔄 Audit en cours...' : '🔍 Relancer Audit'}
          </button>
        </div>

        {auditData && (
          <>
            {/* Résumé */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-700">Total Utilisateurs</h3>
                <p className="text-3xl font-bold text-blue-600">{auditData.summary.total_users}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-700">Avec Problèmes</h3>
                <p className="text-3xl font-bold text-red-600">{auditData.summary.users_with_issues}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-700">Abonnements Actifs</h3>
                <p className="text-3xl font-bold text-green-600">{auditData.summary.active_subscriptions}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-700">Taux de Problèmes</h3>
                <p className="text-3xl font-bold text-orange-600">
                  {auditData.summary.total_users > 0 
                    ? Math.round((auditData.summary.users_with_issues / auditData.summary.total_users) * 100) 
                    : 0}%
                </p>
              </div>
            </div>

            {/* Actions nécessaires */}
            {auditData.actions_needed.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-bold text-red-800 mb-4">
                  ⚠️ {auditData.actions_needed.length} Problème(s) Détecté(s)
                </h2>
                
                <div className="space-y-4">
                  {auditData.actions_needed.map((result, index) => {
                    const fixKey = `${result.admin_user_id}-${result.subscription_id}`;
                    const isFixing = fixing.has(fixKey);
                    
                    return (
                      <div key={index} className={`border rounded-lg p-4 ${getSeverityColor(result)}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800">
                              {result.email} (ID: {result.admin_user_id})
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Subscription: {result.subscription_id}
                            </p>
                            
                            <div className="mt-2 space-y-1 text-sm">
                              {result.error && (
                                <p className="text-red-600">❌ Erreur: {result.error}</p>
                              )}
                              {!result.is_active_in_stripe && (
                                <p className="text-red-600">❌ Abonnement inactif dans Stripe</p>
                              )}
                              {result.is_expired && (
                                <p className="text-orange-600">⏰ Quota expiré: {result.expires_at}</p>
                              )}
                              {result.status_mismatch && (
                                <p className="text-yellow-600">
                                  ⚠️ Désynchronisation: DB={result.db_status} ≠ Stripe={result.real_stripe_status}
                                </p>
                              )}
                              <p className="text-gray-600">
                                📊 Quota actuel: {result.photo_quota} photos
                              </p>
                            </div>
                            
                            <p className="mt-2 text-sm font-medium text-gray-800">
                              Action recommandée: {result.recommended_action}
                            </p>
                          </div>
                          
                          <div className="ml-4 space-x-2">
                            {result.recommended_action.startsWith('RESET_QUOTA') && (
                              <button
                                onClick={() => fixIssue(result, 'RESET_QUOTA')}
                                disabled={isFixing}
                                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                              >
                                {isFixing ? '⏳' : '🔄 Reset Quota'}
                              </button>
                            )}
                            {result.recommended_action.startsWith('UPDATE_STATUS') && (
                              <button
                                onClick={() => fixIssue(result, 'UPDATE_STATUS')}
                                disabled={isFixing}
                                className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
                              >
                                {isFixing ? '⏳' : '🔄 Sync Status'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Détails complets */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Détails Complets</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utilisateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut DB
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut Stripe
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quota
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expiration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        État
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {auditData.results.map((result, index) => (
                      <tr key={index} className={result.has_issue ? 'bg-red-50' : 'bg-white'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{result.email}</div>
                            <div className="text-sm text-gray-500">ID: {result.admin_user_id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{result.db_status || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{result.real_stripe_status || 'Erreur'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{result.photo_quota || 0}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {result.expires_at ? new Date(result.expires_at).toLocaleDateString() : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {result.has_issue ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Problème
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!auditData && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Cliquez sur "Relancer Audit" pour commencer l'analyse</p>
          </div>
        )}
      </div>
    </div>
  );
}