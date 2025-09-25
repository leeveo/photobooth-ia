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
      start: 'price_1SA8gYRBtAFMZV17dLua6okj',      // TEMPORAIRE: Use test prices in prod
      essentiel: 'price_1SA8hHRBtAFMZV17URFPVdai',  // TEMPORAIRE: Use test prices in prod
      pro: 'price_1SA8hiRBtAFMZV17KoZsrsaR',        // TEMPORAIRE: Use test prices in prod
      premium: 'price_1SA8hvRBtAFMZV17K5BcWUaR'     // TEMPORAIRE: Use test prices in prod
    },
    addons: {
      pack100: 'price_1SA8joRBtAFMZV17iyiQb2lX',   // TEMPORAIRE: Use test prices in prod
      pack500: 'price_1SA8kMRBtAFMZV17ltt0C0Lk',   // TEMPORAIRE: Use test prices in prod
      pack1000: 'price_1SA8kxRBtAFMZV172WkrMQEq'   // TEMPORAIRE: Use test prices in prod
    }
  }
};

// Fonction pour détecter l'environnement
function isProduction() {
  const hasLiveKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live_');
  const isProdEnv = process.env.NODE_ENV === 'production';
  const isProdDomain = typeof window !== 'undefined' && 
                      !window.location.hostname.includes('localhost') &&
                      !window.location.hostname.includes('127.0.0.1');
  
  return hasLiveKey && isProdEnv && isProdDomain;
}

// Fonction pour obtenir les bons Price IDs selon l'environnement
export function getStripePrices() {
  return isProduction() ? STRIPE_CONFIG.production.prices : STRIPE_CONFIG.test.prices;
}

// Fonction pour obtenir les Price IDs des addons
export function getStripeAddons() {
  return isProduction() ? STRIPE_CONFIG.production.addons : STRIPE_CONFIG.test.addons;
}