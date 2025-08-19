# Script de préparation pour le déploiement Vercel (PowerShell)
Write-Host "🚀 Préparation du déploiement Vercel..." -ForegroundColor Green

# Nettoyer le cache Next.js
Write-Host "🧹 Nettoyage du cache..." -ForegroundColor Yellow
if (Test-Path ".next/cache/") { Remove-Item -Recurse -Force ".next/cache/" }
if (Test-Path "node_modules/.cache/") { Remove-Item -Recurse -Force "node_modules/.cache/" }

# Optimiser les modules node
Write-Host "📦 Optimisation des dépendances..." -ForegroundColor Yellow
npm prune --production

# Vérifier la taille des fichiers
Write-Host "📊 Vérification de la taille des fichiers..." -ForegroundColor Yellow
$largeFiles = Get-ChildItem -Path "public" -Recurse -Include "*.mp4", "*.webm", "*.psd" | Select-Object Name, Length
$largeFiles | Format-Table -AutoSize

# Variables d'environnement pour optimiser le build
$env:NODE_OPTIONS = "--max_old_space_size=4096"
$env:NEXT_TELEMETRY_DISABLED = "1"

Write-Host "✅ Préparation terminée. Vous pouvez maintenant déployer sur Vercel." -ForegroundColor Green
Write-Host "💡 Recommandations:" -ForegroundColor Cyan
Write-Host "   - Activez Enhanced Builds dans Vercel pour plus de mémoire" -ForegroundColor White
Write-Host "   - Surveillez les logs de build pour les optimisations supplémentaires" -ForegroundColor White
