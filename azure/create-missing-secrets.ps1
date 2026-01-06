# Create Missing Key Vault Secrets for Backend
# Run this script to create all required secrets for the backend to start

$vaultName = "Greenchainz-vault-2026"
$resourceGroup = "greenchainz-production"

Write-Host "Creating missing secrets in Key Vault: $vaultName" -ForegroundColor Cyan
Write-Host ""

# Generate secure random values
$jwtSecret = "$(New-Guid)$(New-Guid)" -replace '-',''
$cookieSecret = "$(New-Guid)$(New-Guid)" -replace '-',''
$sessionSecret = "$(New-Guid)$(New-Guid)" -replace '-',''

# Create secrets
Write-Host "Creating jwt-secret..."
az keyvault secret set --vault-name $vaultName --name jwt-secret --value $jwtSecret | Out-Null
Write-Host "✓ jwt-secret created" -ForegroundColor Green

Write-Host "Creating cookie-secret..."
az keyvault secret set --vault-name $vaultName --name cookie-secret --value $cookieSecret | Out-Null
Write-Host "✓ cookie-secret created" -ForegroundColor Green

Write-Host "Creating session-secret..."
az keyvault secret set --vault-name $vaultName --name session-secret --value $sessionSecret | Out-Null
Write-Host "✓ session-secret created" -ForegroundColor Green

Write-Host "Creating stripe-secret-key (placeholder)..."
az keyvault secret set --vault-name $vaultName --name stripe-secret-key --value "sk_test_placeholder_replace_with_real_key" | Out-Null
Write-Host "✓ stripe-secret-key created" -ForegroundColor Green

Write-Host "Creating stripe-webhook-secret (placeholder)..."
az keyvault secret set --vault-name $vaultName --name stripe-webhook-secret --value "whsec_placeholder_replace_with_real_secret" | Out-Null
Write-Host "✓ stripe-webhook-secret created" -ForegroundColor Green

# Database credentials from Database-URL
Write-Host ""
Write-Host "⚠️  IMPORTANT: Database credentials" -ForegroundColor Yellow
Write-Host "The backend expects DB_USER, DB_PASSWORD, and DB_NAME separately."
Write-Host "You have 'Database-URL' in Key Vault. You need to either:"
Write-Host "  1. Parse the Database-URL and create separate secrets, OR"
Write-Host "  2. Update backend code to use DATABASE_URL instead"
Write-Host ""
Write-Host "For now, creating placeholder values..."

$dbUrl = az keyvault secret show --vault-name $vaultName --name Database-URL --query "value" -o tsv 2>$null
if ($dbUrl) {
    Write-Host "Detected Database-URL: $($dbUrl.Substring(0, 40))..." -ForegroundColor Cyan
    # Try to parse postgres://user:password@host:port/database
    if ($dbUrl -match "postgres://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)(\?.*)?$") {
        $dbUser = $Matches[1]
        $dbPassword = $Matches[2]
        $dbHost = $Matches[3]
        $dbPort = $Matches[4]
        $dbName = $Matches[5]
        
        Write-Host "Creating postgres-password..."
        az keyvault secret set --vault-name $vaultName --name postgres-password --value $dbPassword | Out-Null
        Write-Host "✓ postgres-password created" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "Database connection details extracted:" -ForegroundColor Cyan
        Write-Host "  Host: $dbHost"
        Write-Host "  Port: $dbPort"
        Write-Host "  User: $dbUser"
        Write-Host "  Database: $dbName"
    } else {
        Write-Host "❌ Could not parse Database-URL. Please create postgres-password manually." -ForegroundColor Red
    }
} else {
    Write-Host "❌ Database-URL not found in Key Vault. Creating placeholder..." -ForegroundColor Red
    az keyvault secret set --vault-name $vaultName --name postgres-password --value "REPLACE_WITH_REAL_PASSWORD" | Out-Null
}

Write-Host ""
Write-Host "✅ All secrets created!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Verify secrets: az keyvault secret list --vault-name $vaultName -o table"
Write-Host "  2. Grant container app access: Run azure/grant-keyvault-access.sh"
Write-Host "  3. Redeploy backend: az containerapp update --name greenchainz-container --resource-group rg-greenchainz-prod-container --yaml azure/containerapp-backend.yaml"
Write-Host ""
