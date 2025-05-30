/**
 * Utilitaire pour vérifier si une fonctionnalité est disponible
 * Permet de désactiver facilement des fonctionnalités en production
 */

export function isFeatureEnabled(featureName) {
  // En production, vérifier les variables d'environnement
  if (process.env.NODE_ENV === 'production') {
    switch (featureName) {
      case 'ffmpeg':
        return process.env.DISABLE_FFMPEG !== 'true';
      case 'heavyProcessing':
        return process.env.DISABLE_HEAVY_PROCESSING !== 'true';
      default:
        return true;
    }
  }
  
  // En développement, tout est activé par défaut
  return true;
}

export function getFeatureConfig(featureName) {
  const configs = {
    'photoAnimation': {
      enabled: process.env.NODE_ENV !== 'production',
      fallbackMessage: "Cette fonctionnalité n'est pas disponible en production"
    },
    'videoProcessing': {
      enabled: process.env.DISABLE_FFMPEG !== 'true',
      fallbackMessage: "Le traitement vidéo n'est pas disponible en ce moment"
    }
  };
  
  return configs[featureName] || { enabled: true, fallbackMessage: "" };
}
