# Script de vérification avant déploiement Vercel - OAuth Google
# Vérifiez que ces variables d'environnement sont configurées sur Vercel

Write-Host "🔍 Vérification des variables d'environnement pour OAuth Google..." -ForegroundColor Blue
Write-Host ""

# Variables d'environnement requises pour OAuth
$requiredVars = @(
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "NEXT_PUBLIC_BASE_URL"
)

Write-Host "Variables requises pour OAuth:" -ForegroundColor Yellow
foreach ($var in $requiredVars) {
    Write-Host "  - $var" -ForegroundColor White
}

Write-Host ""
Write-Host "📋 Instructions pour configurer sur Vercel:" -ForegroundColor Green
Write-Host "1. Aller sur https://vercel.com/dashboard" -ForegroundColor White
Write-Host "2. Sélectionner votre projet" -ForegroundColor White
Write-Host "3. Aller dans Settings > Environment Variables" -ForegroundColor White
Write-Host "4. Ajouter les variables suivantes:" -ForegroundColor White
Write-Host ""

Write-Host "NEXT_PUBLIC_GOOGLE_CLIENT_ID" -ForegroundColor Cyan
Write-Host "  Valeur: 861872459075-0rddreeofg3us5falu78gpfp5qu5qr0q.apps.googleusercontent.com" -ForegroundColor White
Write-Host ""

Write-Host "GOOGLE_CLIENT_SECRET" -ForegroundColor Cyan
Write-Host "  Valeur: [Votre client secret Google - ne pas partager]" -ForegroundColor White
Write-Host ""

Write-Host "NEXT_PUBLIC_BASE_URL" -ForegroundColor Cyan
Write-Host "  Valeur: https://photobooth.waibooth.app" -ForegroundColor White
Write-Host ""

Write-Host "🚀 Après configuration, redéployez avec:" -ForegroundColor Green
Write-Host "vercel --prod" -ForegroundColor White
Write-Host ""

Write-Host "🔬 Pour tester la configuration après déploiement:" -ForegroundColor Blue
Write-Host "1. Visitez: https://photobooth.waibooth.app/api/health" -ForegroundColor White
Write-Host "2. Visitez: https://photobooth.waibooth.app/api/auth/google" -ForegroundColor White
Write-Host "3. Visitez: https://photobooth.waibooth.app/photobooth-ia/admin/auth/diagnostics" -ForegroundColor White

Write-Host ""
Write-Host "🆘 Si le problème persiste:" -ForegroundColor Red
Write-Host "- Vérifiez les logs Vercel: vercel logs" -ForegroundColor White
Write-Host "- Consultez les diagnostics intégrés dans l'app" -ForegroundColor White

# Vérifier si Vercel CLI est disponible pour lister les variables existantes
if (Get-Command "vercel" -ErrorAction SilentlyContinue) {
    Write-Host ""
    Write-Host "📋 Variables actuellement configurées:" -ForegroundColor Green
    vercel env ls --environment=production 2>$null
}