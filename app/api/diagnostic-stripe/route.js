import { createClient } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Test de l'environnement Stripe
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    // Simuler la détection d'environnement côté serveur
    const hasLiveKey = stripePublishableKey?.startsWith('pk_live_');
    const isProdEnv = process.env.NODE_ENV === 'production';
    
    // Configuration des Price IDs (réplique du stripe-config.js)
    const STRIPE_CONFIG = {
      test: {
        prices: {
          start: 'price_1SA8gYRBtAFMZV17dLua6okj',
          essentiel: 'price_1SA8hHRBtAFMZV17URFPVdai',
          pro: 'price_1SA8hiRBtAFMZV17KoZsrsaR',
          premium: 'price_1SA8hvRBtAFMZV17K5BcWUaR'
        }
      },
      production: {
        prices: {
          start: 'price_LIVE_START_TO_REPLACE',
          essentiel: 'price_LIVE_ESSENTIEL_TO_REPLACE',
          pro: 'price_LIVE_PRO_TO_REPLACE', 
          premium: 'price_LIVE_PREMIUM_TO_REPLACE'
        }
      }
    };

    const isProduction = hasLiveKey && isProdEnv;
    const prices = isProduction ? STRIPE_CONFIG.production.prices : STRIPE_CONFIG.test.prices;

    // Test des prix et génération de plans
    const plans = [
      {
        name: 'Start',
        price: 19,
        priceId: prices.start,
        quota: 100
      },
      {
        name: 'Essentiel',
        price: 49,
        priceId: prices.essentiel,
        quota: 400
      },
      {
        name: 'Pro',
        price: 89,
        priceId: prices.pro,
        quota: 1000
      },
      {
        name: 'Premium',
        price: 119,
        priceId: prices.premium,
        quota: 1500
      }
    ];

    return Response.json({
      success: true,
      environment_detection: {
        stripe_publishable_key: stripePublishableKey ? `${stripePublishableKey.substring(0, 20)}...` : 'Non configuré',
        stripe_secret_key: stripeSecretKey ? `${stripeSecretKey.substring(0, 20)}...` : 'Non configuré',
        has_live_key: hasLiveKey,
        is_prod_env: isProdEnv,
        detected_env: isProduction ? 'production' : 'test'
      },
      stripe_config: {
        prices_used: prices,
        environment: isProduction ? 'production' : 'test'
      },
      generated_plans: plans,
      webhook_price_mapping: {
        'price_1SA8gYRBtAFMZV17dLua6okj': { plan: 'Start', quota: 100, price: 19 },
        'price_1SA8hHRBtAFMZV17URFPVdai': { plan: 'Essentiel', quota: 400, price: 49 },
        'price_1SA8hiRBtAFMZV17KoZsrsaR': { plan: 'Pro', quota: 1000, price: 89 },
        'price_1SA8hvRBtAFMZV17K5BcWUaR': { plan: 'Premium', quota: 1500, price: 119 }
      }
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur diagnostic stripe', 
      details: error.message 
    }, { status: 500 });
  }
}