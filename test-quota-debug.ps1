# Script PowerShell pour déboguer le système de quota
Write-Host "🔍 Débogage système de quota PhotoboothIA" -ForegroundColor Cyan

# Vérifier si le serveur Next.js est en marche
Write-Host "`n🌐 Vérification serveur local..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ Serveur local accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Serveur local inaccessible. Assurez-vous que Next.js tourne sur localhost:3000" -ForegroundColor Red
    Write-Host "   Lancez: npm run dev" -ForegroundColor Yellow
}

# Test de l'API quota-manager
Write-Host "`n🧪 Test API quota-manager..." -ForegroundColor Yellow

# Demander l'admin ID à l'utilisateur
$adminId = Read-Host "Entrez votre Admin ID (trouvable dans votre session admin_session)"

if ($adminId) {
    $body = @{
        adminId = $adminId
        action = "check"
    } | ConvertTo-Json
    
    try {
        $headers = @{ "Content-Type" = "application/json" }
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/quota-manager" -Method POST -Body $body -Headers $headers
        
        Write-Host "✅ Réponse API quota-manager:" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor White
        
        # Analyser les résultats
        if ($response.monthly) {
            Write-Host "`n📊 Analyse quota:" -ForegroundColor Cyan
            Write-Host "  • Quota mensuel: $($response.monthly.quota)" -ForegroundColor White
            Write-Host "  • Consommé: $($response.monthly.consumed)" -ForegroundColor White
            Write-Host "  • Restant: $($response.monthly.remaining)" -ForegroundColor White
            Write-Host "  • Plan gratuit: $($response.monthly.isFreePlan)" -ForegroundColor White
            Write-Host "  • Peut prendre photo: $($response.canTakePhoto)" -ForegroundColor White
        }
        
    } catch {
        Write-Host "❌ Erreur API quota-manager:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  Admin ID requis pour tester l'API" -ForegroundColor Yellow
}

# Instructions pour trouver l'admin ID
Write-Host "`n💡 Comment trouver votre Admin ID:" -ForegroundColor Cyan
Write-Host "1. Ouvrez votre dashboard admin" -ForegroundColor White
Write-Host "2. Ouvrez les DevTools (F12)" -ForegroundColor White
Write-Host "3. Onglet Console, tapez:" -ForegroundColor White
Write-Host "   localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session')" -ForegroundColor Yellow
Write-Host "4. Copiez le 'user_id' de la réponse" -ForegroundColor White

# Vérifications supplémentaires
Write-Host "`n🔧 Vérifications recommandées:" -ForegroundColor Cyan
Write-Host "1. Vérifiez les logs du serveur Next.js pour [QUOTA_MANAGER]" -ForegroundColor White
Write-Host "2. Testez en prenant une photo via photobooth-coiffure" -ForegroundColor White
Write-Host "3. Vérifiez si le quota diminue dans le dashboard" -ForegroundColor White

Write-Host "`nTerminé ! 🎉" -ForegroundColor Green