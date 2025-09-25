// Configuration des plans Stripe par environnement
const STRIPE_CONFIG = {
  test: {
    prices: {
      start: 'price_1SA8gYRBtAFMZV17dLua6okj',
      essentiel: 'price_1SA8hHRBtAFMZV17URFPVdai',
      pro: 'price_1SA8hiRBtAFMZV17KoZsrsaR',
      premium: 'price_1SA8hvRBtAFMZV17K5BcWUaR'
    },
    addons: {
      pack100: 'price_1SA8joRBtAFMZV17iyiQb2lX',
      pack500: 'price_1SA8kMRBtAFMZV17ltt0C0Lk', 
      pack1000: 'price_1SA8kxRBtAFMZV172WkrMQEq'
    }
  },
  production: {
    prices: {
      start: 'price_1SAmwYID4l6EVOKLvQw9gLiq',      // Plan Start - Production
      essentiel: 'price_1SAmweID4l6EVOKLuA3U7asj',  // Plan Essentiel - Production
      pro: 'price_1SAmwgID4l6EVOKLMwuQPV7W',        // Plan Pro - Production
      premium: 'price_1SAmwhID4l6EVOKLz6kNDbw8'     // Plan Premium - Production
    },
    addons: {
      pack100: 'price_1SAmwkID4l6EVOKLqAHKSXIm',   // Pack +100 Photos - Production
      pack500: 'price_1SAmwmID4l6EVOKL1zA38P1p',   // Pack +500 Photos - Production
      pack1000: 'price_1SAmwoID4l6EVOKL2nLXSByp'   // Pack +1000 Photos - Production
    }
  }
};

// Fonction pour détecter l'environnement
function isProduction() {
  // Si on a une clé Stripe LIVE, on utilise les Price IDs de production
  const hasLiveKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live_');
  
  console.log('[STRIPE-CONFIG] Environment detection:', {
    hasLiveKey,
    NODE_ENV: process.env.NODE_ENV,
    domain: typeof window !== 'undefined' ? window.location.hostname : 'server-side'
  });
  
  // NOUVELLE LOGIQUE: Si on a une clé LIVE, on utilise la config de production
  // même en développement local
  return hasLiveKey;
}

// Fonction pour obtenir les bons Price IDs selon l'environnement
export function getStripePrices() {
  return isProduction() ? STRIPE_CONFIG.production.prices : STRIPE_CONFIG.test.prices;
}

// Fonction pour obtenir les Price IDs des addons
export function getStripeAddons() {
  return isProduction() ? STRIPE_CONFIG.production.addons : STRIPE_CONFIG.test.addons;
}