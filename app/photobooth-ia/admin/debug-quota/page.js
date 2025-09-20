'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function DebugQuotaPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState(null);
  const [debugData, setDebugData] = useState({
    adminPayments: [],
    addonPurchases: [],
    quotaCalculation: null
  });

  useEffect(() => {
    async function fetchDebugData() {
      try {
        // Récupérer l'ID admin
        const sessionStr = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
        if (!sessionStr) {
          alert('Session non trouvée');
          return;
        }
        
        let decodedSession = sessionStr;
        try { decodedSession = atob(sessionStr); } catch {}
        const sessionData = JSON.parse(decodedSession);
        const userId = sessionData.user_id || sessionData.userId;
        
        if (!userId) {
          alert('User ID non trouvé');
          return;
        }

        setAdminId(userId);
        console.log('DEBUG: Admin ID =', userId);

        // 1. Récupérer admin_payments
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('admin_payments')
          .select('*')
          .eq('admin_user_id', userId)
          .order('created_at', { ascending: false });

        if (paymentsError) {
          console.error('Erreur admin_payments:', paymentsError);
        } else {
          console.log('DEBUG: admin_payments =', paymentsData);
        }

        // 2. Récupérer addon_purchases
        const { data: addonData, error: addonError } = await supabase
          .from('addon_purchases')
          .select('*')
          .eq('admin_user_id', userId)
          .order('created_at', { ascending: false });

        if (addonError) {
          console.error('Erreur addon_purchases:', addonError);
        } else {
          console.log('DEBUG: addon_purchases =', addonData);
        }

        // 3. Calculer quota total
        const baseQuota = paymentsData?.[0]?.photo_quota || 3;
        const totalAddonPhotos = addonData?.reduce((total, addon) => {
          return total + (addon.addon_value || 0);
        }, 0) || 0;
        const totalQuota = baseQuota + totalAddonPhotos;

        const calculation = {
          baseQuota,
          totalAddonPhotos,
          totalQuota,
          addonCount: addonData?.length || 0
        };

        console.log('DEBUG: Quota calculation =', calculation);

        setDebugData({
          adminPayments: paymentsData || [],
          addonPurchases: addonData || [],
          quotaCalculation: calculation
        });

      } catch (error) {
        console.error('Erreur debug:', error);
        alert('Erreur: ' + error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDebugData();
  }, [supabase]);

  if (loading) {
    return <div className="p-6">Chargement debug...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <h1 className="text-xl font-bold text-yellow-800">🔍 Debug Quota - Admin ID: {adminId}</h1>
        <p className="text-yellow-700">Cette page affiche les données brutes pour diagnostiquer le quota</p>
      </div>

      {/* Calcul du quota */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h2 className="text-lg font-bold text-blue-800 mb-3">📊 Calcul du Quota</h2>
        {debugData.quotaCalculation ? (
          <div className="space-y-2 text-sm">
            <div><strong>Quota de base:</strong> {debugData.quotaCalculation.baseQuota} photos</div>
            <div><strong>Photos addon:</strong> +{debugData.quotaCalculation.totalAddonPhotos} photos</div>
            <div><strong>Nombre d'achats addon:</strong> {debugData.quotaCalculation.addonCount}</div>
            <div className="text-lg font-bold text-blue-700">
              <strong>QUOTA TOTAL:</strong> {debugData.quotaCalculation.totalQuota} photos
            </div>
          </div>
        ) : (
          <p className="text-red-600">Erreur de calcul</p>
        )}
      </div>

      {/* Admin Payments */}
      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
        <h2 className="text-lg font-bold text-green-800 mb-3">💳 Admin Payments ({debugData.adminPayments.length})</h2>
        {debugData.adminPayments.length === 0 ? (
          <p className="text-gray-600">Aucun paiement trouvé (utilisateur gratuit)</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border">
              <thead>
                <tr className="bg-green-100">
                  <th className="border p-2">Date</th>
                  <th className="border p-2">Plan</th>
                  <th className="border p-2">Photo Quota</th>
                  <th className="border p-2">Amount</th>
                  <th className="border p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {debugData.adminPayments.map(payment => (
                  <tr key={payment.id}>
                    <td className="border p-2">{new Date(payment.created_at).toLocaleString()}</td>
                    <td className="border p-2">{payment.plan || '-'}</td>
                    <td className="border p-2">{payment.photo_quota || '-'}</td>
                    <td className="border p-2">{payment.amount ? (payment.amount / 100) + '€' : '-'}</td>
                    <td className="border p-2">{payment.status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Addon Purchases */}
      <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
        <h2 className="text-lg font-bold text-purple-800 mb-3">🎁 Addon Purchases ({debugData.addonPurchases.length})</h2>
        {debugData.addonPurchases.length === 0 ? (
          <p className="text-red-600">❌ Aucun achat d'addon trouvé !</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border">
              <thead>
                <tr className="bg-purple-100">
                  <th className="border p-2">Date</th>
                  <th className="border p-2">Pack</th>
                  <th className="border p-2">Photos</th>
                  <th className="border p-2">Prix</th>
                  <th className="border p-2">Status</th>
                  <th className="border p-2">Stripe Session</th>
                </tr>
              </thead>
              <tbody>
                {debugData.addonPurchases.map(addon => (
                  <tr key={addon.id}>
                    <td className="border p-2">{new Date(addon.created_at).toLocaleString()}</td>
                    <td className="border p-2">{addon.addon_name || '-'}</td>
                    <td className="border p-2 font-bold text-green-600">+{addon.addon_value}</td>
                    <td className="border p-2">{addon.price_paid}€</td>
                    <td className="border p-2">{addon.status}</td>
                    <td className="border p-2">{addon.stripe_session_id?.slice(0, 20)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
        <h2 className="text-lg font-bold text-gray-800 mb-3">🛠️ Actions</h2>
        <div className="space-x-4">
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Rafraîchir
          </button>
          <a 
            href="/photobooth-ia/admin/dashboard" 
            className="bg-green-600 text-white px-4 py-2 rounded inline-block"
          >
            Aller au Dashboard
          </a>
          <a 
            href="/photobooth-ia/admin/parametre" 
            className="bg-purple-600 text-white px-4 py-2 rounded inline-block"
          >
            Aller aux Paramètres
          </a>
        </div>
      </div>
    </div>
  );
}