'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RiRefreshLine, RiMoneyEuroCircleLine, RiCheckLine, RiCloseLine } from 'react-icons/ri';

export default function ParametrePage() {
  const supabase = createClientComponentClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Récupère l'utilisateur connecté
  useEffect(() => {
    async function fetchUser() {
      // Récupère l'ID de l'admin connecté depuis la session (comme dans tes autres pages)
      const sessionStr = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
      if (!sessionStr) {
        setLoading(false);
        return;
      }
      let decodedSession = sessionStr;
      try { decodedSession = atob(sessionStr); } catch {}
      const sessionData = JSON.parse(decodedSession);
      const userId = sessionData.user_id || sessionData.userId;
      if (!userId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        setUser(data);
      } else {
        setUser(null);
      }
      setLoading(false);
    }
    fetchUser();
  }, [supabase]);

  // Récupère les paiements liés à l'utilisateur
  useEffect(() => {
    async function fetchPayments() {
      if (!user?.id) {
        setPayments([]);
        setPaymentsLoading(false);
        return;
      }
      setPaymentsLoading(true);
      // Debug log
      console.log('[ParametrePage] Fetching payments for admin_user_id:', user.id);
      const { data, error } = await supabase
        .from('admin_payments')
        .select('*')
        .eq('admin_user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        setError("Erreur lors du chargement des paiements : " + error.message);
        setPayments([]);
        console.error("Erreur Supabase admin_payments:", error);
      } else {
        setPayments(data || []);
        console.log('[ParametrePage] Payments loaded:', data);
      }
      setPaymentsLoading(false);
    }
    if (user && user.id) {
      fetchPayments();
    }
  }, [user, supabase]);

  if (loading) return <div className="flex justify-center items-center min-h-[40vh]">Chargement...</div>;
  if (!user) return <div>Utilisateur non trouvé.</div>;

  return (
    <div className="max-w-8xl mx-auto py-10 space-y-8">
      {/* Header */}
      <div className="p-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-xl shadow-lg text-white mb-6">
        <h1 className="text-2xl font-bold mb-2">Paramètres de l'abonnement</h1>
        <p className="text-white text-opacity-80 text-sm">Gérez votre abonnement, consultez vos paiements et votre quota d’images.</p>
      </div>

      {/* Infos utilisateur/abonnement */}
      <div className="bg-white shadow-md rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div><strong>Email :</strong> {user.email}</div>
            {/* Affiche le dernier plan payé */}
            <div><strong>Plan :</strong> {payments[0]?.plan || 'Aucun'}</div>
            <div><strong>Quota photos :</strong> {payments[0]?.photo_quota || 0}</div>
            <div><strong>Prochain reset quota :</strong> {payments[0]?.photo_quota_reset_at ? new Date(payments[0].photo_quota_reset_at).toLocaleDateString() : '-'}</div>
          </div>
          <div className="flex flex-col gap-2 text-xs">
            <div><strong>Stripe customer ID :</strong> {payments[0]?.stripe_customer_id || '-'}</div>
            <div><strong>Stripe subscription ID :</strong> {payments[0]?.stripe_subscription_id || '-'}</div>
          </div>
        </div>
      </div>

      {/* Paiements Stripe */}
      <div className="bg-white shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RiMoneyEuroCircleLine className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-medium text-gray-900">Historique des paiements</h3>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow hover:from-green-600 hover:to-emerald-700 transition-all text-xs"
            title="Rafraîchir"
          >
            <RiRefreshLine className="w-4 h-4" />
            Actualiser
          </button>
        </div>
        {paymentsLoading ? (
          <div className="p-6 text-center text-gray-500">Chargement des paiements...</div>
        ) : payments.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Aucun paiement trouvé pour cet utilisateur.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Montant</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Plan</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Images incluses</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Statut</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">ID Stripe</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(payment => (
                    <tr key={payment.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-2">{new Date(payment.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2">{(payment.amount / 100).toFixed(2)} €</td>
                      <td className="px-4 py-2">{payment.plan || payment.plan_name || '-'}</td>
                      <td className="px-4 py-2">{payment.images_included || '-'}</td>
                      <td className="px-4 py-2">
                        {payment.status === 'succeeded' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                            <RiCheckLine className="w-4 h-4 mr-1" /> Payé
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                            <RiCloseLine className="w-4 h-4 mr-1" /> {payment.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">{payment.stripe_payment_id || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Détails de chaque commande Stripe */}
            <div className="divide-y divide-gray-100 mt-8">
              {payments.map(payment => (
                <div key={payment.id} className="p-4">
                  <h4 className="font-semibold text-indigo-700 mb-2">Détails de la commande Stripe du {new Date(payment.created_at).toLocaleString()}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><strong>Montant :</strong> {(payment.amount / 100).toFixed(2)} €</div>
                    <div><strong>Statut :</strong> {payment.status}</div>
                    <div><strong>Plan :</strong> {payment.plan || payment.plan_name || '-'}</div>
                    <div><strong>Images incluses :</strong> {payment.images_included || '-'}</div>
                    <div><strong>Stripe customer ID :</strong> {payment.stripe_customer_id}</div>
                    <div><strong>Stripe subscription ID :</strong> {payment.stripe_subscription_id}</div>
                    <div><strong>Stripe payment ID :</strong> {payment.stripe_payment_id}</div>
                    <div><strong>Quota photos :</strong> {payment.photo_quota || '-'}</div>
                    <div><strong>Prochain reset quota :</strong> {payment.photo_quota_reset_at ? new Date(payment.photo_quota_reset_at).toLocaleString() : '-'}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {error && <div className="p-4 text-red-600">{error}</div>}
      </div>
    </div>
  );
}
