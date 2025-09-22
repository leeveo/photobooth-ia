// Configuration des plans Stripe par environnement
export const STRIPE_CONFIG = {
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
      start: 'price_LIVE_START_TO_REPLACE',      // À remplacer par vos vrais Price IDs Live
      essentiel: 'price_LIVE_ESSENTIEL_TO_REPLACE',
      pro: 'price_LIVE_PRO_TO_REPLACE', 
      premium: 'price_LIVE_PREMIUM_TO_REPLACE'
    },
    addons: {
      pack100: 'price_LIVE_ADDON_100_TO_REPLACE',
      pack500: 'price_LIVE_ADDON_500_TO_REPLACE',
      pack1000: 'price_LIVE_ADDON_1000_TO_REPLACE'
    }
  }
};

// Fonction pour détecter l'environnement
export function isProduction() {
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

// Fonction pour obtenir la configuration complète
export function getStripeConfig() {
  return isProduction() ? STRIPE_CONFIG.production : STRIPE_CONFIG.test;
}

// Fonction de debug pour afficher l'environnement actuel
export function getEnvironmentInfo() {
  return {
    isProduction: isProduction(),
    nodeEnv: process.env.NODE_ENV,
    hasLiveKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live_'),
    domain: typeof window !== 'undefined' ? window.location.hostname : 'server-side',
    currentConfig: isProduction() ? 'production' : 'test'
  };
}