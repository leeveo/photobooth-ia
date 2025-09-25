# Script PowerShell pour vérifier les données de quota dans Supabase
# Usage: .\check-quota-data.ps1

Write-Host "VERIFICATION DES DONNEES QUOTA SUPABASE" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Configuration
$supabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$supabaseKey = $env:SUPABASE_SERVICE_ROLE_KEY
$adminId = "01933c3d-a76a-7c7b-9bc1-1a00b37fa7fc"  # Remplacez par votre admin ID

if (-not $supabaseUrl -or -not $supabaseKey) {
    Write-Host "❌ Variables d'environnement Supabase manquantes" -ForegroundColor Red
    Write-Host "NEXT_PUBLIC_SUPABASE_URL: $($supabaseUrl -ne $null)" -ForegroundColor Yellow
    Write-Host "SUPABASE_SERVICE_ROLE_KEY: $($supabaseKey -ne $null)" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Configuration OK" -ForegroundColor Green
Write-Host "🆔 Admin ID: $adminId" -ForegroundColor Yellow
Write-Host ""

# Headers pour les requêtes
$headers = @{
    "apikey" = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
    "Content-Type" = "application/json"
}

function Invoke-SupabaseQuery {
    param(
        [string]$Table,
        [string]$Select = "*",
        [hashtable]$Filter = @{},
        [int]$Limit = 10
    )
    
    $url = "$supabaseUrl/rest/v1/$Table"
    $query = "select=$Select"
    
    foreach ($key in $Filter.Keys) {
        $query += "&$key=eq.$($Filter[$key])"
    }
    
    if ($Limit -gt 0) {
        $query += "&limit=$Limit"
    }
    
    $fullUrl = "$url?$query"
    
    try {
        $response = Invoke-RestMethod -Uri $fullUrl -Headers $headers -Method GET
        return $response
    } catch {
        Write-Host "❌ Erreur requête $Table : $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# 1. Vérifier admin_users
Write-Host "1️⃣ VÉRIFICATION ADMIN_USERS" -ForegroundColor Blue
$adminUser = Invoke-SupabaseQuery -Table "admin_users" -Filter @{id = $adminId} -Limit 1
if ($adminUser -and $adminUser.Count -gt 0) {
    Write-Host "✅ Admin trouvé: $($adminUser[0].email)" -ForegroundColor Green
    Write-Host "📅 Créé le: $($adminUser[0].created_at)" -ForegroundColor Yellow
} else {
    Write-Host "❌ Admin non trouvé" -ForegroundColor Red
}
Write-Host ""

# 2. Vérifier admin_payments
Write-Host "2️⃣ VÉRIFICATION ADMIN_PAYMENTS" -ForegroundColor Blue
$payments = Invoke-SupabaseQuery -Table "admin_payments" -Filter @{admin_user_id = $adminId} -Limit 5
if ($payments) {
    Write-Host "💳 Paiements trouvés: $($payments.Count)" -ForegroundColor Green
    foreach ($payment in $payments) {
        $status = if ($payment.stripe_subscription_status -eq "active") { "🟢" } else { "🔴" }
        Write-Host "$status Plan: $($payment.plan) | Quota: $($payment.photo_quota) | Status: $($payment.stripe_subscription_status)" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Aucun paiement trouvé" -ForegroundColor Red
}
Write-Host ""

# 3. Vérifier projects
Write-Host "3️⃣ VÉRIFICATION PROJECTS" -ForegroundColor Blue
$projects = Invoke-SupabaseQuery -Table "projects" -Select "id,name,photobooth_type" -Filter @{created_by = $adminId} -Limit 5
if ($projects) {
    Write-Host "📁 Projets trouvés: $($projects.Count)" -ForegroundColor Green
    $projectIds = @()
    foreach ($project in $projects) {
        Write-Host "  📂 $($project.name) ($($project.photobooth_type)) - ID: $($project.id)" -ForegroundColor Yellow
        $projectIds += $project.id
    }
} else {
    Write-Host "❌ Aucun projet trouvé" -ForegroundColor Red
    $projectIds = @()
}
Write-Host ""

# 4. Vérifier sessions (dashboard compte ici)
Write-Host "4️⃣ VÉRIFICATION SESSIONS (Dashboard)" -ForegroundColor Blue
if ($projectIds.Count -gt 0) {
    $projectIdList = ($projectIds | ForEach-Object { "'$_'" }) -join ","
    $url = "$supabaseUrl/rest/v1/sessions?project_id=in.($projectIdList)&select=id,created_at,project_id&limit=10"
    
    try {
        $sessions = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
        Write-Host "📊 Sessions trouvées: $($sessions.Count)" -ForegroundColor Green
        
        # Compter par projet
        $sessionsByProject = $sessions | Group-Object -Property project_id
        foreach ($group in $sessionsByProject) {
            Write-Host "  📂 Project $($group.Name): $($group.Count) photos" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Erreur sessions: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ Pas de projets donc pas de sessions" -ForegroundColor Yellow
}
Write-Host ""

# 5. Vérifier quota_usage (API quota-manager compte ici)
Write-Host "5️⃣ VÉRIFICATION QUOTA_USAGE (API)" -ForegroundColor Blue
$quotaUsage = Invoke-SupabaseQuery -Table "quota_usage" -Filter @{admin_user_id = $adminId} -Limit 10
if ($quotaUsage) {
    Write-Host "📈 Enregistrements quota_usage: $($quotaUsage.Count)" -ForegroundColor Green
    foreach ($usage in $quotaUsage) {
        Write-Host "  🎯 $($usage.quota_type) | Session: $($usage.session_id) | Date: $($usage.consumed_at)" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Aucun enregistrement quota_usage trouvé" -ForegroundColor Red
}
Write-Host ""

# 6. Test direct API quota-manager
Write-Host "6️⃣ TEST API QUOTA-MANAGER" -ForegroundColor Blue
try {
    $apiBody = @{
        adminId = $adminId
        action = "check"
    } | ConvertTo-Json

    $apiResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/quota-manager" -Method POST -Body $apiBody -ContentType "application/json"
    
    Write-Host "✅ API Response OK" -ForegroundColor Green
    Write-Host "📊 Total quota: $($apiResponse.total.quota)" -ForegroundColor Yellow
    Write-Host "📊 Total utilisé: $($apiResponse.total.quota - $apiResponse.total.remaining)" -ForegroundColor Yellow
    Write-Host "📊 Total restant: $($apiResponse.total.remaining)" -ForegroundColor Yellow
    Write-Host "🎯 Peut prendre photo: $($apiResponse.canTakePhoto)" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Erreur API: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "⚠️ Assurez-vous que le serveur Next.js fonctionne (npm run dev)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🏁 VÉRIFICATION TERMINÉE" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Résumé des problèmes potentiels
Write-Host "🔧 DIAGNOSTIC:" -ForegroundColor Magenta
if ($sessions -and $quotaUsage) {
    $sessionsCount = $sessions.Count
    $quotaUsageCount = $quotaUsage.Count
    
    Write-Host "📊 Sessions (Dashboard): $sessionsCount" -ForegroundColor White
    Write-Host "📈 Quota Usage (API): $quotaUsageCount" -ForegroundColor White
    
    if ($sessionsCount -ne $quotaUsageCount) {
        Write-Host "⚠️  DÉSYNCHRONISATION DÉTECTÉE!" -ForegroundColor Red
        Write-Host "   Le dashboard et l'API ne comptent pas la même chose" -ForegroundColor Red
    } else {
        Write-Host "✅ Synchronisation OK" -ForegroundColor Green
    }
}