# Script de debogage pour la production
Write-Host "Debogage OAuth Production" -ForegroundColor Cyan

# Verifier les variables d'environnement locales
Write-Host "Variables d'environnement locales:" -ForegroundColor Yellow
$envFile = Get-Content ".env.local" -ErrorAction SilentlyContinue
if ($envFile) {
    $googleClientId = $envFile | Where-Object { $_ -match "^NEXT_PUBLIC_GOOGLE_CLIENT_ID=" }
    $googleClientSecret = $envFile | Where-Object { $_ -match "^GOOGLE_CLIENT_SECRET=" }
    
    if ($googleClientId) {
        Write-Host "GOOGLE_CLIENT_ID trouve" -ForegroundColor Green
    } else {
        Write-Host "GOOGLE_CLIENT_ID manquant" -ForegroundColor Red
    }
    
    if ($googleClientSecret) {
        Write-Host "GOOGLE_CLIENT_SECRET trouve" -ForegroundColor Green
    } else {
        Write-Host "GOOGLE_CLIENT_SECRET manquant" -ForegroundColor Red
    }
}

# Build et deploiement
Write-Host "Construction du projet..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build reussie" -ForegroundColor Green
    
    Write-Host "Deploiement vers Vercel..." -ForegroundColor Yellow
    vercel --prod
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Deploiement reussi" -ForegroundColor Green
        Write-Host "Testez maintenant: https://photobooth.waibooth.app/photobooth-ia/admin/login" -ForegroundColor Cyan
        Write-Host "Logs Vercel: vercel logs https://photobooth.waibooth.app" -ForegroundColor Cyan
    } else {
        Write-Host "Echec du deploiement" -ForegroundColor Red
    }
} else {
    Write-Host "Echec du build" -ForegroundColor Red
}