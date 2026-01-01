#!/bin/bash
# CRITICAL: Fix .env.local security issues
# Run this script to remove .env.local from git history

echo "⚠️  CRITICAL SECURITY FIX"
echo "========================="
echo ""
echo "This script will:"
echo "1. Remove .env.local from git tracking"
echo "2. Ensure .gitignore includes .env.local"
echo ""
echo "⚠️  WARNING: You must manually rotate all exposed credentials!"
echo "⚠️  WARNING: To remove from git history, you'll need to run additional commands"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

# Step 1: Remove from git index (but keep local file)
echo ""
echo "Step 1: Removing .env.local from git tracking..."
git rm --cached .env.local 2>/dev/null || echo "File not in index (may already be removed)"

# Step 2: Verify .gitignore
echo ""
echo "Step 2: Verifying .gitignore..."
if grep -q "\.env\.local" .gitignore; then
    echo "✅ .env.local is in .gitignore"
else
    echo "❌ .env.local is NOT in .gitignore - adding it..."
    echo ".env.local" >> .gitignore
    echo ".env*.local" >> .gitignore
fi

# Step 3: Instructions for history removal
echo ""
echo "Step 3: To remove from git history (run manually):"
echo "=================================================="
echo "git filter-branch --force --index-filter \\"
echo "  \"git rm --cached --ignore-unmatch .env.local\" \\"
echo "  --prune-empty --tag-name-filter cat -- --all"
echo ""
echo "⚠️  WARNING: This rewrites git history!"
echo "⚠️  Coordinate with your team before force pushing!"
echo ""
echo "Step 4: Fix line 26 in .env.local manually:"
echo "============================================"
echo "Change: AZURE_PROJECT_REGION=eastus2AGENT_AUDITOR_URL=..."
echo "To:     AZURE_PROJECT_REGION=eastus2"
echo "        AGENT_AUDITOR_URL=..."
echo ""
echo "✅ Done! Remember to:"
echo "   1. Rotate ALL exposed credentials"
echo "   2. Fix line 26 in .env.local (add newline)"
echo "   3. Remove from git history (if needed)"
echo "   4. Force push (coordinate with team)"

