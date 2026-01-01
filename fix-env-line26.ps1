# Fix .env.local line 26 - Add missing newline between AZURE_PROJECT_REGION and AGENT_AUDITOR_URL

$envFile = ".env.local"

if (-not (Test-Path $envFile)) {
    Write-Host "Error: $envFile not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Fixing line 26 in $envFile..." -ForegroundColor Cyan

# Read the file
$content = Get-Content $envFile -Raw

# Pattern to match: AZURE_PROJECT_REGION=eastus2AGENT_AUDITOR_URL=...
# Replace with: AZURE_PROJECT_REGION=eastus2\nAGENT_AUDITOR_URL=...
$pattern = 'AZURE_PROJECT_REGION=eastus2AGENT_AUDITOR_URL='
$replacement = "AZURE_PROJECT_REGION=eastus2`r`nAGENT_AUDITOR_URL="

if ($content -match $pattern) {
    $newContent = $content -replace [regex]::Escape($pattern), $replacement
    
    # Write back to file
    [System.IO.File]::WriteAllText((Resolve-Path $envFile), $newContent)
    
    Write-Host "Fixed! Line 26 now has proper newline separator." -ForegroundColor Green
    Write-Host ""
    Write-Host "Verification:" -ForegroundColor Cyan
    Get-Content $envFile | Select-Object -Index 24,25 | ForEach-Object { 
        Write-Host "  Line: $_" -ForegroundColor Gray
    }
} else {
    Write-Host "Pattern not found. The file may already be fixed or have a different format." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Current line 25-26:" -ForegroundColor Cyan
    Get-Content $envFile | Select-Object -Index 24,25 | ForEach-Object { 
        Write-Host "  Line: $_" -ForegroundColor Gray
    }
}
