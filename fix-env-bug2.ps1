# Fix .env.local Bug 2 - Remove trailing single quote from AZURE_FUNCTION_APP_DEFAULT_KEY

$envFile = ".env.local"

if (-not (Test-Path $envFile)) {
    Write-Host "Error: $envFile not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Fixing AZURE_FUNCTION_APP_DEFAULT_KEY trailing quote..." -ForegroundColor Cyan

# Read the file
$content = Get-Content $envFile -Raw

# Pattern to match: AZURE_FUNCTION_APP_DEFAULT_KEY=...=='
# Replace with: AZURE_FUNCTION_APP_DEFAULT_KEY=...==
$pattern = "AZURE_FUNCTION_APP_DEFAULT_KEY=([^`r`n]+)=='"
$replacement = "AZURE_FUNCTION_APP_DEFAULT_KEY=`$1=="

if ($content -match $pattern) {
    $newContent = $content -replace $pattern, $replacement
    
    # Write back to file
    [System.IO.File]::WriteAllText((Resolve-Path $envFile), $newContent)
    
    Write-Host "Fixed! Removed trailing single quote from AZURE_FUNCTION_APP_DEFAULT_KEY." -ForegroundColor Green
    Write-Host ""
    Write-Host "Verification:" -ForegroundColor Cyan
    Select-String -Path $envFile -Pattern "AZURE_FUNCTION_APP_DEFAULT_KEY" | ForEach-Object { 
        Write-Host "  $($_.Line)" -ForegroundColor Gray
    }
} else {
    Write-Host "Pattern not found. The file may already be fixed or have a different format." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Current AZURE_FUNCTION_APP_DEFAULT_KEY:" -ForegroundColor Cyan
    Select-String -Path $envFile -Pattern "AZURE_FUNCTION_APP_DEFAULT_KEY" | ForEach-Object { 
        Write-Host "  $($_.Line)" -ForegroundColor Gray
    }
}

