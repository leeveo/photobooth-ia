'use client';

import { useState, useEffect, useCallback } from 'react';
import { RiRefreshLine, RiCameraLine, RiGiftLine, RiCalendarLine, RiTrophyLine, RiLightbulbLine } from 'react-icons/ri';

export default function QuotaDisplay({ adminId, onQuotaChange, className = '' }) {
  const [quotaStatus, setQuotaStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQuotaStatus = useCallback(async () => {
    if (!adminId) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/quota-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, action: 'check' })
      });

      if (response.ok) {
        const data = await response.json();
        setQuotaStatus(data);
        setError(null);
        
        // Notifier le parent du changement de quota
        if (onQuotaChange) {
          onQuotaChange(data);
        }
      } else {
        throw new Error('Erreur récupération quota');
      }
    } catch (err) {
      setError(err.message);
      console.error('[QuotaDisplay] Erreur:', err);
    } finally {
      setLoading(false);
    }
  }, [adminId, onQuotaChange]);

  useEffect(() => {
    fetchQuotaStatus();
  }, [fetchQuotaStatus]);

  // Composant pour les graphiques circulaires
  const CircularProgress = ({ percentage, size = 60, strokeWidth = 6, color = '#3B82F6' }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-gray-700">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg p-4 shadow-sm ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center text-red-600">
          <RiLightbulbLine className="w-5 h-5 mr-2" />
          <span className="text-sm font-medium">Erreur quota: {error}</span>
        </div>
      </div>
    );
  }

  if (!quotaStatus) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="text-gray-500 text-sm text-center">
          Quota non disponible
        </div>
      </div>
    );
  }

  const totalPercentage = quotaStatus.total.quota > 0 
    ? (quotaStatus.total.remaining / quotaStatus.total.quota) * 100 
    : 0;

  const monthlyPercentage = quotaStatus.monthly.quota > 0 
    ? (quotaStatus.monthly.remaining / quotaStatus.monthly.quota) * 100 
    : 0;

  const addonPercentage = quotaStatus.addons.total > 0 
    ? (quotaStatus.addons.remaining / quotaStatus.addons.total) * 100 
    : 0;

  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header avec total */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-full p-2">
              <RiCameraLine className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {quotaStatus.total.remaining.toLocaleString()}
              </div>
              <div className="text-sm text-white/80">
                photos restantes sur {quotaStatus.total.quota.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="text-right">
            <CircularProgress 
              percentage={totalPercentage} 
              size={50} 
              strokeWidth={4}
              color="#ffffff"
            />
          </div>
        </div>
        
        {/* Barre de progression globale */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-white/80 mb-1">
            <span>Utilisation globale</span>
            <span>{Math.round(100 - totalPercentage)}% utilisé</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${totalPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Détail des quotas */}
      <div className="p-4 space-y-4">
        
        {/* Plan mensuel */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 rounded-full p-2">
                {quotaStatus.monthly.isFreePlan ? (
                  <RiLightbulbLine className="w-4 h-4 text-blue-600" />
                ) : (
                  <RiTrophyLine className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <div>
                <div className="font-semibold text-blue-900">
                  Plan {quotaStatus.monthly.isFreePlan ? 'Gratuit' : 'Payant'}
                </div>
                <div className="text-sm text-blue-700">
                  {quotaStatus.monthly.remaining} / {quotaStatus.monthly.quota} photos
                </div>
              </div>
            </div>
            <div className="text-right">
              <CircularProgress 
                percentage={monthlyPercentage} 
                size={40} 
                strokeWidth={3}
                color="#3B82F6"
              />
            </div>
          </div>
          
          {quotaStatus.monthly.resetAt && (
            <div className="mt-3 flex items-center text-xs text-blue-600">
              <RiCalendarLine className="w-3 h-3 mr-1" />
              <span>
                Renouvellement le {new Date(quotaStatus.monthly.resetAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
          )}
        </div>

        {/* Packs addon */}
        {quotaStatus.addons.total > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 rounded-full p-2">
                  <RiGiftLine className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="font-semibold text-purple-900">
                    Packs Achetés
                  </div>
                  <div className="text-sm text-purple-700">
                    {quotaStatus.addons.remaining} / {quotaStatus.addons.total} photos
                  </div>
                </div>
              </div>
              <div className="text-right">
                <CircularProgress 
                  percentage={addonPercentage} 
                  size={40} 
                  strokeWidth={3}
                  color="#9333EA"
                />
              </div>
            </div>
            
            {/* Détail des packs si on en a plusieurs */}
            {quotaStatus.addons.packs.length > 1 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-purple-600 hover:text-purple-800 font-medium">
                  Voir le détail des {quotaStatus.addons.packs.length} packs
                </summary>
                <div className="mt-2 space-y-2">
                  {quotaStatus.addons.packs.map((pack, index) => (
                    <div key={pack.id} className="flex justify-between items-center bg-white/60 rounded p-2">
                      <div className="text-xs">
                        <div className="font-medium text-gray-800">{pack.name}</div>
                        <div className="text-gray-500">
                          {new Date(pack.purchasedAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div className="text-xs font-medium text-purple-700">
                        {pack.remaining} / {pack.total}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <button
            onClick={fetchQuotaStatus}
            className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <RiRefreshLine className="w-4 h-4" />
            <span className="text-sm">Actualiser</span>
          </button>

          {!quotaStatus.canTakePhoto && (
            <div className="flex-1 ml-4">
              {quotaStatus.monthly.isFreePlan ? (
                <button
                  onClick={() => window.location.href = '/photobooth-ia/admin/choose-plan'}
                  className="w-full py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:shadow-lg transition-all text-sm"
                >
                  🚀 Choisir un plan
                </button>
              ) : (
                <button
                  onClick={() => window.location.href = '/photobooth-ia/admin/choose-plan'}
                  className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium rounded-lg hover:shadow-lg transition-all text-sm"
                >
                  📦 Acheter des packs
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}