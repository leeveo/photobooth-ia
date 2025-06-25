'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const PLANS = [
  {
    name: 'Starter',
    price: 10,
    priceId: 'price_xxx1',
    quota: 100,
    description: '100 photos / mois',
  },
  {
    name: 'Pro',
    price: 30,
    priceId: 'price_xxx2',
    quota: 500,
    description: '500 photos / mois',
  },
  {
    name: 'Entreprise',
    price: 99,
    priceId: 'price_xxx3',
    quota: 5000,
    description: '5000 photos / mois',
  },
];

export default function ChoosePlanPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubscribe = async (priceId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la création de la session Stripe');
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      await stripe.redirectToCheckout({ sessionId: data.sessionId });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Choisissez votre plan</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div key={plan.priceId} className="border rounded-lg p-6 flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-2">{plan.name}</h2>
            <div className="text-3xl font-bold mb-2">{plan.price}€</div>
            <div className="mb-4 text-gray-500">{plan.description}</div>
            <button
              onClick={() => handleSubscribe(plan.priceId)}
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              {loading ? 'Redirection...' : 'Choisir'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
