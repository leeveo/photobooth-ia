'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RiRefreshLine, RiMoneyEuroCircleLine, RiCheckLine, RiCloseLine } from 'react-icons/ri';

export default function ParametrePage() {
  const supabase = createClientComponentClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [addonPurchases, setAddonPurchases] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);

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
        setAddonPurchases([]);
        setPaymentsLoading(false);
        return;
      }
      setPaymentsLoading(true);
      // Debug log
      console.log('[ParametrePage] Fetching payments for admin_user_id:', user.id);
      
      // Récupérer les abonnements
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('admin_payments')
        .select('*')
        .eq('admin_user_id', user.id)
        .order('created_at', { ascending: false });
      
      // Récupérer les achats d'addon
      const { data: addonData, error: addonError } = await supabase
        .from('addon_purchases')
        .select('*')
        .eq('admin_user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (paymentsError) {
        setError("Erreur lors du chargement des paiements : " + paymentsError.message);
        setPayments([]);
        console.error("Erreur Supabase admin_payments:", paymentsError);
      } else {
        setPayments(paymentsData || []);
        console.log('[ParametrePage] Payments loaded:', paymentsData);
      }
      
      if (addonError) {
        setError("Erreur lors du chargement des achats addon : " + addonError.message);
        setAddonPurchases([]);
        console.error("Erreur Supabase addon_purchases:", addonError);
      } else {
        setAddonPurchases(addonData || []);
        console.log('[ParametrePage] Addon purchases loaded:', addonData);
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
            <div><strong>Plan :</strong> {payments[0]?.plan || 'Gratuit (3 photos)'}</div>
            
            {/* Calcul du quota total */}
            {(() => {
              const baseQuota = payments[0]?.photo_quota || 3;
              const addonPhotos = addonPurchases.reduce((total, addon) => {
                return total + (addon.addon_value || 0);
              }, 0);
              const totalQuota = baseQuota + addonPhotos;
              
              return (
                <div className="space-y-1">
                  <div><strong>Quota photos total :</strong> {totalQuota}</div>
                  {addonPhotos > 0 && (
                    <div className="text-sm text-gray-600 ml-4">
                      → Quota de base : {baseQuota}
                      <br />
                      → Photos addon : +{addonPhotos}
                    </div>
                  )}
                </div>
              );
            })()}
            
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
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Facture</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(payment => (
                    <tr
                      key={payment.id}
                      className={`border-b last:border-0 hover:bg-gray-50 cursor-pointer ${selectedPaymentId === payment.id ? 'bg-indigo-50' : ''}`}
                      onClick={() => setSelectedPaymentId(payment.id)}
                    >
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
                      <td className="px-4 py-2">
                        {payment.invoice_url ? (
                          <a
                            href={payment.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            Voir la facture
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                        {payment.invoice_pdf && (
                          <>
                            <span className="mx-1 text-gray-400">|</span>
                            <a
                              href={payment.invoice_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 underline hover:text-green-800"
                            >
                              PDF
                            </a>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Détails de la commande sélectionnée */}
            <div className="mt-8">
              {selectedPaymentId && (
                <>
                  <button
                    className="mb-4 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                    onClick={() => setSelectedPaymentId(null)}
                  >
                    ← Retour à la liste
                  </button>
                  {(() => {
                    const payment = payments.find(p => p.id === selectedPaymentId);
                    if (!payment) return null;
                    return (
                      <div className="p-4 border rounded-xl bg-gray-50">
                        <h4 className="font-semibold text-indigo-700 mb-2">
                          Détails de la commande Stripe du {new Date(payment.created_at).toLocaleString()}
                        </h4>
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
                          <div>
                            <strong>Facture :</strong>{" "}
                            {payment.invoice_url ? (
                              <a
                                href={payment.invoice_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline hover:text-blue-800"
                              >
                                Voir la facture
                              </a>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                            {payment.invoice_pdf && (
                              <>
                                <span className="mx-1 text-gray-400">|</span>
                                <a
                                  href={payment.invoice_pdf}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600 underline hover:text-green-800"
                                >
                                  PDF
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </>
        )}
        {error && <div className="p-4 text-red-600">{error}</div>}
      </div>

      {/* Achats de packs addon */}
      <div className="bg-white shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RiMoneyEuroCircleLine className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-medium text-gray-900">Achats de packs photo</h3>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg shadow hover:from-purple-600 hover:to-purple-700 transition-all text-xs"
            title="Rafraîchir"
          >
            <RiRefreshLine className="w-4 h-4" />
            Actualiser
          </button>
        </div>
        {paymentsLoading ? (
          <div className="p-6 text-center text-gray-500">Chargement des achats...</div>
        ) : addonPurchases.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>Aucun pack photo acheté.</p>
            <a 
              href="/photobooth-ia/admin/choose-plan"
              className="mt-2 inline-block text-sm font-medium px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"
            >
              Acheter des packs photo
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Pack</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Photos</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Prix</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Statut</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">ID Stripe</th>
                </tr>
              </thead>
              <tbody>
                {addonPurchases.map(addon => (
                  <tr key={addon.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2">{new Date(addon.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{addon.addon_name || 'Pack photos'}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                        +{addon.addon_value} photos
                      </span>
                    </td>
                    <td className="px-4 py-2">{addon.price_paid}€</td>
                    <td className="px-4 py-2">
                      {addon.status === 'completed' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                          <RiCheckLine className="w-4 h-4 mr-1" /> Confirmé
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                          {addon.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600">{addon.stripe_session_id?.slice(0, 20)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
