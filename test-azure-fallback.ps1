# Script PowerShell pour tester le système de fallback Azure
# Ce script vérifie que tout est correctement configuré

Write-Host "🚀 Test du système de fallback Azure AI" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Vérifier que les fichiers nécessaires existent
Write-Host "📁 Vérification des fichiers..." -ForegroundColor Yellow

$requiredFiles = @(
    "app\api\azure-ai\route.js",
    "app\photobooth-coiffure\[slug]\cam\page.js.backup001",
    "supabase\migrations\add_ai_source_to_sessions.sql",
    "app\utils\test-ai-fallback.js",
    "AZURE_FALLBACK_README.md"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file - MANQUANT!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🔧 Configuration Azure AI:" -ForegroundColor Yellow
Write-Host "- Endpoint: https://photoboothia-resource.services.ai.azure.com/openai/deployments/FLUX.1-Kontext-pro/images/generations?api-version=2025-04-01-preview"
Write-Host "- Modèle: FLUX.1-Kontext-pro"
Write-Host "- Timeout Replicate: 5 secondes"

Write-Host ""
Write-Host "📊 Migration de base de données:" -ForegroundColor Yellow
Write-Host "- Nouvelle colonne: sessions.ai_source"
Write-Host "- Valeurs possibles: replicate, azure, error"

Write-Host ""
Write-Host "🧪 Pour tester le système:" -ForegroundColor Cyan
Write-Host "1. Ouvrez la console du navigateur sur la page cam"
Write-Host "2. Tapez: await window.testAI.testFallbackSystem()"
Write-Host "3. Surveillez les logs pour voir quel service répond"

Write-Host ""
Write-Host "📝 Logs à surveiller:" -ForegroundColor Magenta
Write-Host "- '[AI] ✅ Replicate successful' = Replicate a fonctionné"
Write-Host "- '[AI] ❌ Replicate failed' = Fallback vers Azure"
Write-Host "- '[AI] ✅ Azure AI successful' = Azure a pris le relais"

Write-Host ""
Write-Host "🎯 Le système est prêt!" -ForegroundColor Green
Write-Host "En cas d'échec de Replicate (timeout 5s), Azure AI prendra automatiquement le relais." -ForegroundColor White
