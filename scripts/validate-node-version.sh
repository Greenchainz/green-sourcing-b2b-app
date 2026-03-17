#!/bin/bash

# Node.js Version Validation Script for GreenChainz
# This script validates that all Node.js version configurations are consistent
# and meet the minimum requirements for Azure Container Apps deployment.

set -e

echo "=================================================="
echo "🔍 Node.js Version Validation for Azure Build"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Minimum required Node.js version for Azure SDKs
MIN_NODE_VERSION="20.0.0"

echo "📋 Checking Node.js version configurations..."
echo ""

# 1. Check .oryx-node-version
echo "1️⃣  Checking .oryx-node-version..."
if [ ! -f ".oryx-node-version" ]; then
    echo -e "${RED}❌ .oryx-node-version file not found${NC}"
    ERRORS=$((ERRORS + 1))
else
    ORYX_VERSION=$(cat .oryx-node-version)
    echo "   Found: ${ORYX_VERSION}"
    
    # Extract major version
    ORYX_MAJOR=$(echo $ORYX_VERSION | cut -d'.' -f1)
    
    if [ "$ORYX_MAJOR" -ge 20 ]; then
        echo -e "   ${GREEN}✅ .oryx-node-version is compliant (>= 20)${NC}"
    else
        echo -e "   ${RED}❌ .oryx-node-version must be >= 20.0.0 (found: ${ORYX_VERSION})${NC}"
        ERRORS=$((ERRORS + 1))
    fi
fi
echo ""

# 2. Check package.json engines
echo "2️⃣  Checking package.json engines..."
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found${NC}"
    ERRORS=$((ERRORS + 1))
else
    # Extract node version from package.json
    NODE_ENGINE=$(grep -A1 '"engines"' package.json | grep '"node"' | sed 's/.*"node": "\(.*\)".*/\1/')
    NPM_ENGINE=$(grep -A2 '"engines"' package.json | grep '"npm"' | sed 's/.*"npm": "\(.*\)".*/\1/')
    
    if [ -z "$NODE_ENGINE" ]; then
        echo -e "   ${RED}❌ No Node.js engines field in package.json${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo "   Node: ${NODE_ENGINE}"
        echo "   NPM:  ${NPM_ENGINE}"
        
        # Check if it includes >=20
        if echo "$NODE_ENGINE" | grep -q ">=20\|>=21\|>=22"; then
            echo -e "   ${GREEN}✅ package.json engines is compliant${NC}"
        else
            echo -e "   ${RED}❌ package.json engines.node must be >= 20.0.0${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    fi
fi
echo ""

# 3. Check Dockerfiles
echo "3️⃣  Checking Dockerfiles..."

for dockerfile in Dockerfile Dockerfile.azure; do
    if [ -f "$dockerfile" ]; then
        NODE_VERSION=$(grep "FROM node:" "$dockerfile" | head -1 | sed 's/FROM node:\([0-9]*\).*/\1/')
        echo "   ${dockerfile}: node:${NODE_VERSION}"
        
        if [ "$NODE_VERSION" -ge 20 ]; then
            echo -e "   ${GREEN}✅ ${dockerfile} uses Node.js >= 20${NC}"
        else
            echo -e "   ${RED}❌ ${dockerfile} uses Node.js < 20 (found: ${NODE_VERSION})${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo -e "   ${YELLOW}⚠️  ${dockerfile} not found${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
done
echo ""

# 4. Check GitHub Workflows
echo "4️⃣  Checking GitHub Workflows..."

WORKFLOW_DIR=".github/workflows"
if [ -d "$WORKFLOW_DIR" ]; then
    # Find all workflow files that mention NODE_VERSION
    WORKFLOW_FILES=$(grep -l "NODE_VERSION" $WORKFLOW_DIR/*.yml 2>/dev/null || true)
    
    if [ -z "$WORKFLOW_FILES" ]; then
        echo -e "   ${YELLOW}⚠️  No workflows with NODE_VERSION found${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        for workflow in $WORKFLOW_FILES; do
            NODE_VER=$(grep "NODE_VERSION:" "$workflow" | sed "s/.*NODE_VERSION: '\(.*\)'.*/\1/")
            echo "   $(basename $workflow): ${NODE_VER}"
            
            # Extract major version (e.g., "20.x" -> 20)
            MAJOR_VER=$(echo $NODE_VER | grep -o '[0-9]*' | head -1)
            
            if [ "$MAJOR_VER" -ge 20 ]; then
                echo -e "   ${GREEN}✅ Workflow uses Node.js >= 20${NC}"
            else
                echo -e "   ${RED}❌ Workflow uses Node.js < 20 (found: ${NODE_VER})${NC}"
                ERRORS=$((ERRORS + 1))
            fi
        done
    fi
else
    echo -e "   ${YELLOW}⚠️  No .github/workflows directory found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 5. Check critical dependencies
echo "5️⃣  Checking critical dependencies..."

if [ -f "package.json" ]; then
    # Check Azure SDK
    AZURE_IDENTITY=$(grep '"@azure/identity"' package.json | sed 's/.*"\^*\([0-9.]*\)".*/\1/')
    if [ ! -z "$AZURE_IDENTITY" ]; then
        echo "   @azure/identity: ${AZURE_IDENTITY}"
        echo -e "   ${GREEN}✅ Requires Node.js >= 20.0.0${NC}"
    fi
    
    # Check react-email
    REACT_EMAIL=$(grep '"@react-email/components"' package.json | sed 's/.*"\^*\([0-9.]*\)".*/\1/')
    if [ ! -z "$REACT_EMAIL" ]; then
        echo "   @react-email/components: ${REACT_EMAIL}"
        echo -e "   ${YELLOW}⚠️  Requires Node.js >= 22.0.0 (currently using 20)${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    # Check Playwright
    PLAYWRIGHT=$(grep '"@playwright/test"' package.json | sed 's/.*"\^*\([0-9.]*\)".*/\1/')
    if [ ! -z "$PLAYWRIGHT" ]; then
        echo "   @playwright/test: ${PLAYWRIGHT}"
        echo -e "   ${GREEN}✅ Requires Node.js >= 18${NC}"
    fi
else
    echo -e "   ${RED}❌ Cannot check dependencies (package.json not found)${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 6. Check current Node.js version
echo "6️⃣  Checking current Node.js version..."
if command -v node &> /dev/null; then
    CURRENT_NODE=$(node --version | sed 's/v//')
    echo "   Current: ${CURRENT_NODE}"
    
    CURRENT_MAJOR=$(echo $CURRENT_NODE | cut -d'.' -f1)
    if [ "$CURRENT_MAJOR" -ge 20 ]; then
        echo -e "   ${GREEN}✅ Current Node.js version is compliant${NC}"
    else
        echo -e "   ${RED}❌ Current Node.js version is < 20 (found: ${CURRENT_NODE})${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "   ${YELLOW}⚠️  Node.js not installed or not in PATH${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Summary
echo "=================================================="
echo "📊 Validation Summary"
echo "=================================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Configuration is compliant.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  ${WARNINGS} warning(s) found, but no errors.${NC}"
    echo ""
    echo "Recommendations:"
    echo "  - Consider upgrading to Node.js 22 for react-email support"
    exit 0
else
    echo -e "${RED}❌ ${ERRORS} error(s) and ${WARNINGS} warning(s) found.${NC}"
    echo ""
    echo "Required actions:"
    echo "  1. Update .oryx-node-version to 20.18.0 or higher"
    echo "  2. Update package.json engines to >=20.0.0"
    echo "  3. Update Dockerfiles to use node:20-alpine or higher"
    echo "  4. Update GitHub workflows to use Node.js 20.x"
    echo ""
    echo "See NODEJS_VERSION_REQUIREMENTS.md for detailed instructions."
    exit 1
fi
