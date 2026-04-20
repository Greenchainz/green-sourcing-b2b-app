param (
    [string]$RegistryName = "<your-registry>",
    [string]$VaultName = "greenchainz-kv",
    [string]$ResourceGroup = "greenchainz-rg",
    [string]$ContainerAppName = "greenchainz-app",
    [string]$DbUrl = "<postgres-connection-string>",
    [string]$DocIntelEndpoint = "https://<region>.cognitiveservices.azure.com/",
    [string]$DocIntelKey = "<key>",
    [string]$ForgeApiUrl = "<url>",
    [string]$ForgeApiKey = "<key>",
    [string]$ClientSecret = "<secret>"
)

Write-Host "=== Setting Azure Key Vault Secrets ==="
az keyvault secret set --vault-name $VaultName --name AZURE-DOCUMENT-INTELLIGENCE-ENDPOINT --value $DocIntelEndpoint
az keyvault secret set --vault-name $VaultName --name AZURE-DOCUMENT-INTELLIGENCE-KEY --value $DocIntelKey
az keyvault secret set --vault-name $VaultName --name BUILT-IN-FORGE-API-URL --value $ForgeApiUrl
az keyvault secret set --vault-name $VaultName --name BUILT-IN-FORGE-API-KEY --value $ForgeApiKey
az keyvault secret set --vault-name $VaultName --name DATABASE-URL --value $DbUrl
az keyvault secret set --vault-name $VaultName --name OAUTH-SERVER-URL --value "https://login.microsoftonline.com/1d04bf50-8175-40af-a9d5-f8e441460b06"
az keyvault secret set --vault-name $VaultName --name MICROSOFT-CLIENT-ID --value "8b597068-9347-4e99-8860-8c4e9a9bc112"
az keyvault secret set --vault-name $VaultName --name MICROSOFT-CLIENT-SECRET --value $ClientSecret

Write-Host "`n=== Running Database Migrations ==="
$env:DATABASE_URL = $DbUrl
npm run db:migrate

Write-Host "`n=== Building Docker Image ==="
docker build -t greenchainz:latest .
docker tag greenchainz:latest "$RegistryName.azurecr.io/greenchainz:latest"

Write-Host "`n=== Pushing Docker Image ==="
# Note: Ensure you have run 'az acr login --name $RegistryName' beforehand
docker push "$RegistryName.azurecr.io/greenchainz:latest"

Write-Host "`n=== Deploying to Azure Container Apps ==="
az containerapp update `
  --resource-group $ResourceGroup `
  --name $ContainerAppName `
  --image "$RegistryName.azurecr.io/greenchainz:latest"

Write-Host "`n=== Deployment execution finished ==="
Write-Host "Wait about 2 minutes for the new revision to spin up."
Write-Host "Run the following smoke tests to verify:"
Write-Host "curl https://greenchainz.com/api/health"
Write-Host "curl -X GET https://greenchainz.com/.auth/me"
