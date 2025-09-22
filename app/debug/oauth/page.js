'use client';

import { useState } from 'react';
import { getEnvironmentInfo, getStripePrices, getStripeAddons } from '../../../lib/stripe-config';

export default function OAuthDebugPage() {
  const [debugInfo, setDebugInfo] = useState(null);
  const [stripeInfo, setStripeInfo] = useState(null);

  const checkConfig = async () => {
    try {
      const response = await fetch('/api/debug/oauth-config');
      const data = await response.json();
      setDebugInfo(data);
    } catch (error) {
      setDebugInfo({ error: error.message });
    }
  };

  const checkStripeConfig = () => {
    const envInfo = getEnvironmentInfo();
    const prices = getStripePrices();
    const addons = getStripeAddons();
    
    setStripeInfo({
      environment: envInfo,
      prices,
      addons
    });
  };

  const testRedirectUri = () => {
    const hostname = window.location.hostname;
    const redirectUri = hostname === 'localhost' 
      ? 'http://localhost:3000/photobooth-ia/admin/auth/callback'
      : 'https://photobooth.waibooth.app/photobooth-ia/admin/auth/callback';
    
    setDebugInfo({
      hostname,
      redirectUri,
      currentUrl: window.location.href
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Configuration</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* OAuth Debug */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">OAuth Configuration</h2>
          
          <button 
            onClick={checkConfig}
            className="bg-blue-500 text-white px-4 py-2 rounded mr-4"
          >
            Vérifier Config Serveur
          </button>
          
          <button 
            onClick={testRedirectUri}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Tester URI Client
          </button>
          
          {debugInfo && (
            <div className="bg-gray-100 p-4 rounded">
              <h3 className="font-bold mb-2">OAuth Debug :</h3>
              <pre className="text-sm">{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
          
          <div className="bg-yellow-100 p-4 rounded">
            <h3 className="font-bold mb-2">URI à configurer dans Google Cloud Console :</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code>http://localhost:3000/photobooth-ia/admin/auth/callback</code></li>
              <li><code>https://photobooth.waibooth.app/photobooth-ia/admin/auth/callback</code></li>
            </ul>
          </div>
        </div>

        {/* Stripe Debug */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Stripe Configuration</h2>
          
          <button 
            onClick={checkStripeConfig}
            className="bg-purple-500 text-white px-4 py-2 rounded"
          >
            Vérifier Config Stripe
          </button>
          
          {stripeInfo && (
            <div className="bg-gray-100 p-4 rounded">
              <h3 className="font-bold mb-2">Stripe Config :</h3>
              <pre className="text-sm">{JSON.stringify(stripeInfo, null, 2)}</pre>
            </div>
          )}
          
          <div className="bg-blue-100 p-4 rounded">
            <h3 className="font-bold mb-2">Instructions :</h3>
            <p className="text-sm mb-2">
              <strong>Mode Test :</strong> Utilisé automatiquement en développement
            </p>
            <p className="text-sm">
              <strong>Mode Production :</strong> Activé quand :
            </p>
            <ul className="list-disc list-inside text-sm mt-1">
              <li>NODE_ENV = production</li>
              <li>Clé Stripe commence par pk_live_</li>
              <li>Domaine ≠ localhost</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}