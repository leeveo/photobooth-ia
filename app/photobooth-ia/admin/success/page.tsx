'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface QuotaInfo {
  quotaUsed: number;
  quotaLimit: number;
  addonPhotos: number;
  totalAvailable: number;
}

interface PurchaseInfo {
  packName: string;
  recentPurchases: any[];
  success: boolean;
}

export default function AddonSuccessPage() {
  const [loading, setLoading] = useState(true);
  const [purchaseInfo, setPurchaseInfo] = useState<PurchaseInfo | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verifyPurchaseAndQuota = async () => {
      try {
        const packName = searchParams?.get('pack_name') || 'Pack de photos';
        
        // 1. Récupérer l'utilisateur admin actuel
        const adminData = JSON.parse(localStorage.getItem('currentAdminId') || 'null');
        if (!adminData) {
          setError('Utilisateur non identifié');
          setLoading(false);
          return;
        }

        // 2. Vérifier le quota actuel
        const { data: adminUser, error: adminError } = await supabase
          .from('admin_users')
          .select('quota_used, quota_limit, created_at')
          .eq('id', adminData)
          .single();

        if (adminError) {
          console.error('Erreur récupération admin:', adminError);
          setError('Erreur lors de la vérification du quota');
          setLoading(false);
          return;
        }

        // 3. Récupérer les achats d'addon récents (dernières 24h)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recentPurchases, error: purchaseError } = await supabase
          .from('addon_purchases')
          .select('*')
          .eq('admin_user_id', adminData)
          .gte('created_at', oneDayAgo)
          .order('created_at', { ascending: false });

        if (purchaseError) {
          console.error('Erreur récupération achats:', purchaseError);
        }

        // 4. Calculer le quota total avec les addons
        let totalAddonPhotos = 0;
        if (recentPurchases && recentPurchases.length > 0) {
          totalAddonPhotos = recentPurchases.reduce((sum, purchase) => {
            return sum + (purchase.addon_value || 0);
          }, 0);
        }

        setQuotaInfo({
          quotaUsed: adminUser.quota_used || 0,
          quotaLimit: adminUser.quota_limit || 100,
          addonPhotos: totalAddonPhotos,
          totalAvailable: (adminUser.quota_limit || 100) + totalAddonPhotos
        });

        setPurchaseInfo({
          packName,
          recentPurchases: recentPurchases || [],
          success: true
        });

      } catch (error) {
        console.error('Erreur:', error);
        setError('Erreur lors de la vérification');
      } finally {
        setLoading(false);
      }
    };

    verifyPurchaseAndQuota();

    // Redirection automatique après 10 secondes
    const redirectTimer = setTimeout(() => {
      router.push('/photobooth-ia/admin/dashboard');
    }, 10000);

    return () => clearTimeout(redirectTimer);
  }, [searchParams, supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de votre achat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Erreur</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link 
            href="/photobooth-ia/admin/dashboard"
            className="bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        {/* Icône de succès */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🎉 Transaction réussie !
          </h1>
          
          <p className="text-lg text-gray-600 mb-2">
            Votre <strong>{purchaseInfo?.packName}</strong> a été acheté avec succès !
          </p>
          
          <p className="text-sm text-gray-500">
            Votre quota de photos a été mis à jour automatiquement.
          </p>
        </div>

        {/* Informations sur le quota */}
        {quotaInfo && (
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              📊 État de votre quota
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {quotaInfo.quotaLimit}
                </div>
                <div className="text-sm text-gray-600">Quota de base</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  +{quotaInfo.addonPhotos}
                </div>
                <div className="text-sm text-gray-600">Photos addon</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {quotaInfo.totalAvailable}
                </div>
                <div className="text-sm text-gray-600">Total disponible</div>
              </div>
            </div>

            <div className="mt-4 bg-white rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Photos utilisées</span>
                <span className="text-sm font-semibold">
                  {quotaInfo.quotaUsed} / {quotaInfo.totalAvailable}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((quotaInfo.quotaUsed / quotaInfo.totalAvailable) * 100, 100)}%`
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Achats récents */}
        {purchaseInfo?.recentPurchases && purchaseInfo.recentPurchases.length > 0 && (
          <div className="bg-blue-50 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              🛒 Achats récents (24h)
            </h2>
            
            <div className="space-y-3">
              {purchaseInfo.recentPurchases.map((purchase, index) => (
                <div key={index} className="bg-white rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {purchase.addon_name || 'Pack de photos'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(purchase.created_at).toLocaleString('fr-FR')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      +{purchase.addon_value} photos
                    </div>
                    <div className="text-sm text-gray-600">
                      {purchase.price_paid}€
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/photobooth-ia/admin/dashboard"
            className="bg-blue-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
          >
            📊 Retour au tableau de bord
          </Link>
          
          <Link 
            href="/photobooth-ia/admin/choose-plan"
            className="bg-gray-100 text-gray-700 py-3 px-8 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-center"
          >
            🛒 Acheter d'autres packs
          </Link>
        </div>

        {/* Message de redirection automatique */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Vous serez automatiquement redirigé vers le tableau de bord dans 10 secondes...
        </p>
      </div>
    </div>
  );
}