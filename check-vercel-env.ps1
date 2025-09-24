# Script pour vérifier les variables d'environnement Vercel
# Assurez-vous d'avoir installé Vercel CLI: npm i -g vercel

Write-Host "🔍 Vérification des variables d'environnement Vercel..." -ForegroundColor Cyan

# Vérifier si Vercel CLI est installé
if (-not (Get-Command "vercel" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI n'est pas installé. Installation..." -ForegroundColor Red
    npm install -g vercel
}

# Se connecter à Vercel (si pas déjà connecté)
Write-Host "🔐 Vérification de la connexion Vercel..." -ForegroundColor Yellow
vercel whoami

# Lister les variables d'environnement
Write-Host "📋 Variables d'environnement de production:" -ForegroundColor Green
vercel env ls --environment=production

Write-Host "📋 Variables d'environnement de preview:" -ForegroundColor Green  
vercel env ls --environment=preview

Write-Host "📋 Variables d'environnement de development:" -ForegroundColor Green
vercel env ls --environment=development

Write-Host "✨ Vérification terminée!" -ForegroundColor Green