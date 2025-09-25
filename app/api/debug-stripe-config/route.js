import { NextResponse } from 'next/server';
import { getStripePrices, getStripeAddons } from '../../photobooth-ia/admin/choose-plan/stripe-config.js';

export async function GET(req) {
  try {
    const prices = getStripePrices();
    const addons = getStripeAddons();
    
    const config = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        hasLiveKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live_'),
        hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
        domain: typeof globalThis.location !== 'undefined' ? globalThis.location.hostname : 'server-side'
      },
      prices,
      addons,
      validation: {
        pricesValid: Object.values(prices).every(p => p && !p.includes('TO_REPLACE')),
        addonsValid: Object.values(addons).every(p => p && !p.includes('TO_REPLACE'))
      }
    };

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}