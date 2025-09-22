# Script pour mettre à jour les identifiants OAuth Google
# UTILISATION: .\update-oauth-credentials.ps1 "NOUVEAU_CLIENT_ID" "NOUVEAU_CLIENT_SECRET"

param(
    [Parameter(Mandatory=$true)]
    [string]$NewClientId,
    
    [Parameter(Mandatory=$true)]
    [string]$NewClientSecret
)

$envFile = ".\.env.local"

Write-Host "🔄 Mise à jour des identifiants OAuth Google..." -ForegroundColor Yellow

# Backup du fichier .env.local
Copy-Item $envFile "$envFile.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "✅ Backup créé" -ForegroundColor Green

# Lecture du fichier
$content = Get-Content $envFile

# Remplacement des valeurs
$content = $content -replace "NEXT_PUBLIC_GOOGLE_CLIENT_ID=.*", "NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NewClientId"
$content = $content -replace "GOOGLE_CLIENT_SECRET=.*", "GOOGLE_CLIENT_SECRET=$NewClientSecret"

# Écriture du fichier mis à jour
$content | Set-Content $envFile

Write-Host "✅ Identifiants OAuth mis à jour dans .env.local" -ForegroundColor Green
Write-Host ""
Write-Host "📋 NOUVELLES VALEURS :" -ForegroundColor Cyan
Write-Host "NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NewClientId" -ForegroundColor White
Write-Host "GOOGLE_CLIENT_SECRET=$NewClientSecret" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Redémarrez votre serveur de développement avec 'npm run dev'" -ForegroundColor Yellow

# Test de validation
Write-Host ""
Write-Host "🔍 Test de validation..." -ForegroundColor Yellow
if ($NewClientId -match "^[0-9]+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$") {
    Write-Host "✅ Format Client ID valide" -ForegroundColor Green
} else {
    Write-Host "❌ Format Client ID invalide" -ForegroundColor Red
}

if ($NewClientSecret -match "^GOCSPX-[a-zA-Z0-9_-]+$") {
    Write-Host "✅ Format Client Secret valide" -ForegroundColor Green
} else {
    Write-Host "❌ Format Client Secret invalide" -ForegroundColor Red
}