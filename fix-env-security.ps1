# CRITICAL: Fix .env.local security issues (PowerShell version)
# Run this script to remove .env.local from git history

Write-Host "⚠️  CRITICAL SECURITY FIX" -ForegroundColor Red
Write-Host "=========================" -ForegroundColor Red
Write-Host ""
Write-Host "This script will:"
Write-Host "1. Remove .env.local from git tracking"
Write-Host "2. Ensure .gitignore includes .env.local"
Write-Host ""
Write-Host "⚠️  WARNING: You must manually rotate all exposed credentials!" -ForegroundColor Yellow
Write-Host "⚠️  WARNING: To remove from git history, you'll need to run additional commands" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "Aborted." -ForegroundColor Red
    exit 1
}

# Step 1: Remove from git index (but keep local file)
Write-Host ""
Write-Host "Step 1: Removing .env.local from git tracking..." -ForegroundColor Cyan
try {
    git rm --cached .env.local 2>$null
    Write-Host "✅ Removed .env.local from git tracking" -ForegroundColor Green
} catch {
    Write-Host "⚠️  File not in index (may already be removed)" -ForegroundColor Yellow
}

# Step 2: Verify .gitignore
Write-Host ""
Write-Host "Step 2: Verifying .gitignore..." -ForegroundColor Cyan
$gitignoreContent = Get-Content .gitignore -Raw
if ($gitignoreContent -match "\.env\.local") {
    Write-Host "✅ .env.local is in .gitignore" -ForegroundColor Green
} else {
    Write-Host "❌ .env.local is NOT in .gitignore - adding it..." -ForegroundColor Red
    Add-Content .gitignore "`n.env.local`n.env*.local"
    Write-Host "✅ Added .env.local to .gitignore" -ForegroundColor Green
}

# Step 3: Instructions
Write-Host ""
Write-Host "Step 3: To remove from git history (run manually):" -ForegroundColor Cyan
Write-Host "=================================================="
Write-Host "git filter-branch --force --index-filter \"
Write-Host "  `"git rm --cached --ignore-unmatch .env.local`" \"
Write-Host "  --prune-empty --tag-name-filter cat -- --all"
Write-Host ""
Write-Host "⚠️  WARNING: This rewrites git history!" -ForegroundColor Yellow
Write-Host "⚠️  Coordinate with your team before force pushing!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Step 4: Fix line 26 in .env.local manually:" -ForegroundColor Cyan
Write-Host "============================================"
Write-Host "Change: AZURE_PROJECT_REGION=eastus2AGENT_AUDITOR_URL=..."
Write-Host "To:     AZURE_PROJECT_REGION=eastus2"
Write-Host "        AGENT_AUDITOR_URL=..."
Write-Host ""
Write-Host "✅ Done! Remember to:" -ForegroundColor Green
Write-Host "   1. Rotate ALL exposed credentials" -ForegroundColor Yellow
Write-Host "   2. Fix line 26 in .env.local (add newline)" -ForegroundColor Yellow
Write-Host "   3. Remove from git history (if needed)" -ForegroundColor Yellow
Write-Host "   4. Force push (coordinate with team)" -ForegroundColor Yellow

