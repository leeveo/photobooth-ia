# Script PowerShell simple pour tester le quota
param(
    [string]$AdminId = "01933c3d-a76a-7c7b-9bc1-1a00b37fa7fc"
)

Write-Host "VERIFICATION QUOTA SIMPLE" -ForegroundColor Green
Write-Host "Admin ID: $AdminId" -ForegroundColor Yellow

# Test API quota-manager
Write-Host "Test API quota-manager..." -ForegroundColor Blue

$body = @{
    adminId = $AdminId
    action = "check"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/quota-manager" -Method POST -Body $body -ContentType "application/json"
    
    Write-Host "SUCCESS - API fonctionne" -ForegroundColor Green
    Write-Host "Quota total: $($response.total.quota)" -ForegroundColor White
    Write-Host "Quota utilise: $($response.total.quota - $response.total.remaining)" -ForegroundColor White  
    Write-Host "Quota restant: $($response.total.remaining)" -ForegroundColor White
    Write-Host "Peut prendre photo: $($response.canTakePhoto)" -ForegroundColor White
    
} catch {
    Write-Host "ERREUR API: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Verifiez que le serveur Next.js fonctionne (npm run dev)" -ForegroundColor Yellow
}

# Test consommation
Write-Host "`nTest consommation quota..." -ForegroundColor Blue

$consumeBody = @{
    adminId = $AdminId
    action = "consume"  
    sessionId = "test-session-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    projectId = "test-project-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
} | ConvertTo-Json

try {
    $consumeResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/quota-manager" -Method POST -Body $consumeBody -ContentType "application/json"
    
    if ($consumeResponse.success) {
        Write-Host "SUCCESS - Photo simulee consommee" -ForegroundColor Green
        Write-Host "Type quota utilise: $($consumeResponse.consumed.type)" -ForegroundColor White
        Write-Host "Nouveau quota restant: $($consumeResponse.quotaStatus.total.remaining)" -ForegroundColor White
    } else {
        Write-Host "ECHEC consommation: $($consumeResponse.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "ERREUR consommation: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest termine." -ForegroundColor Green