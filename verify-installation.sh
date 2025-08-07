#!/bin/bash

# Comprehensive verification script for CC with Responses API

echo "========================================="
echo "CR Installation Verification"
echo "========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check status
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2"
        return 1
    fi
}

echo ""
echo "1. Checking Repository Structure"
echo "---------------------------------"

# Check CR directory
if [ -d "/Users/jerry/ccr" ]; then
    check_status 0 "CR directory exists"
else
    check_status 1 "CR directory missing"
fi

# Check llms directory
if [ -d "/Users/jerry/llms" ]; then
    check_status 0 "LLMS directory exists"
else
    check_status 1 "LLMS directory missing"
fi

echo ""
echo "2. Checking Critical Files"
echo "---------------------------------"

# CC files
[ -f "/Users/jerry/ccr/package.json" ] && check_status 0 "CR package.json" || check_status 1 "CR package.json"
[ -f "/Users/jerry/ccr/dist/cli.js" ] && check_status 0 "CR CLI built" || check_status 1 "CR CLI not built"
[ -f "/Users/jerry/ccr/docs/OPENAI_RESPONSES_API_IMPLEMENTATION.md" ] && check_status 0 "Documentation exists" || check_status 1 "Documentation missing"

# LLMS files
[ -f "/Users/jerry/llms/src/transformer/responses-api-v2.transformer.ts" ] && check_status 0 "Responses API v2 transformer" || check_status 1 "Responses API v2 transformer"
[ -f "/Users/jerry/llms/src/types/responses-api.types.ts" ] && check_status 0 "Responses API types" || check_status 1 "Responses API types"
[ -f "/Users/jerry/llms/dist/cjs/server.cjs" ] && check_status 0 "LLMS built (CJS)" || check_status 1 "LLMS not built"

echo ""
echo "3. Checking Package Configuration"
echo "---------------------------------"

# Check package name
PKG_NAME=$(grep '"name"' /Users/jerry/ccr/package.json | head -1 | cut -d'"' -f4)
if [ "$PKG_NAME" = "@jerryzhao173985/cr" ]; then
    check_status 0 "Package name: $PKG_NAME"
else
    check_status 1 "Package name incorrect: $PKG_NAME"
fi

# Check version
PKG_VERSION=$(grep '"version"' /Users/jerry/ccr/package.json | head -1 | cut -d'"' -f4)
if [ "$PKG_VERSION" = "2.0.0" ]; then
    check_status 0 "Version: $PKG_VERSION"
else
    check_status 1 "Version incorrect: $PKG_VERSION"
fi

# Check llms dependency
LLMS_DEP=$(grep '@musistudio/llms' /Users/jerry/ccr/package.json | cut -d'"' -f4)
if [[ "$LLMS_DEP" == *"jerryzhao173985/llms"* ]]; then
    check_status 0 "LLMS dependency: GitHub fork"
else
    check_status 1 "LLMS dependency incorrect: $LLMS_DEP"
fi

echo ""
echo "4. Checking Git Status"
echo "---------------------------------"

# Check CR git
cd /Users/jerry/ccr
REMOTE=$(git remote get-url origin 2>/dev/null)
if [[ "$REMOTE" == *"jerryzhao173985/ccr"* ]]; then
    check_status 0 "CR remote: jerryzhao173985/ccr"
else
    check_status 1 "CR remote incorrect: $REMOTE"
fi

# Check llms git
cd /Users/jerry/llms
REMOTE=$(git remote get-url origin 2>/dev/null)
if [[ "$REMOTE" == *"jerryzhao173985/llms"* ]]; then
    check_status 0 "LLMS remote: jerryzhao173985/llms"
else
    check_status 1 "LLMS remote incorrect: $REMOTE"
fi

echo ""
echo "5. Checking Service"
echo "---------------------------------"

# Check if service is running
if cr status 2>/dev/null | grep -q "Running"; then
    check_status 0 "CR service is running"
else
    check_status 1 "CR service not running"
fi

echo ""
echo "6. Checking Configuration"
echo "---------------------------------"

# Check config file
if [ -f "/Users/jerry/.cr-router/config.json" ]; then
    # Check for responses-api-v2
    if grep -q "responses-api-v2" /Users/jerry/.cr-router/config.json; then
        check_status 0 "Config uses responses-api-v2"
    else
        check_status 1 "Config not using responses-api-v2"
    fi
    
    # Check for openai-responses provider
    if grep -q "openai-responses" /Users/jerry/.cr-router/config.json; then
        check_status 0 "OpenAI Responses provider configured"
    else
        check_status 1 "OpenAI Responses provider not configured"
    fi
else
    check_status 1 "Config file missing"
fi

echo ""
echo "7. Key Features Check"
echo "---------------------------------"

# Check for continuous execution
if grep -q "continuousExecution: true" /Users/jerry/llms/src/transformer/responses-api-v2.transformer.ts 2>/dev/null; then
    check_status 0 "Continuous execution enabled by default"
else
    check_status 1 "Continuous execution not enabled"
fi

# Check for tool transformation
if grep -q "Tool Result" /Users/jerry/llms/src/transformer/responses-api-v2.transformer.ts 2>/dev/null; then
    check_status 0 "Tool result transformation implemented"
else
    check_status 1 "Tool result transformation missing"
fi

echo ""
echo "========================================="
echo "Verification Complete"
echo "========================================="
echo ""
echo "Installation Summary:"
echo "- Fork: github.com/jerryzhao173985/ccr"
echo "- Version: 2.0.0"
echo "- Transformer: responses-api-v2"
echo "- Features: Continuous execution, full tool support"
echo ""
echo "To use:"
echo "  cr code --model gpt-4o \"your prompt\""
echo ""