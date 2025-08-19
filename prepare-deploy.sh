#!/bin/bash

# Script de préparation pour le déploiement Vercel
echo "🚀 Préparation du déploiement Vercel..."

# Nettoyer le cache Next.js
echo "🧹 Nettoyage du cache..."
rm -rf .next/cache/
rm -rf node_modules/.cache/

# Optimiser les modules node
echo "📦 Optimisation des dépendances..."
npm prune --production

# Vérifier la taille des fichiers
echo "📊 Vérification de la taille des fichiers..."
find public -name "*.mp4" -o -name "*.webm" -o -name "*.psd" | wc -l
find public -name "*.mp4" -o -name "*.webm" -o -name "*.psd" -exec du -sh {} + | head -10

# Variables d'environnement pour optimiser le build
export NODE_OPTIONS="--max_old_space_size=4096"
export NEXT_TELEMETRY_DISABLED=1

echo "✅ Préparation terminée. Vous pouvez maintenant déployer sur Vercel."
echo "💡 Recommandations:"
echo "   - Activez Enhanced Builds dans Vercel pour plus de mémoire"
echo "   - Surveillez les logs de build pour les optimisations supplémentaires"
