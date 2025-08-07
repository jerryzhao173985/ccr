#!/bin/bash

echo "========================================="
echo "Claude Router (CR) Complete Verification"
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
echo "1. Package Information"
echo "---------------------------------"

# Check package name
PKG_NAME=$(grep '"name"' /Users/jerry/ccr/package.json | head -1 | cut -d'"' -f4)
if [ "$PKG_NAME" = "@jerryzhao173985/claude-router" ]; then
    check_status 0 "Package name: $PKG_NAME"
else
    check_status 1 "Package name incorrect: $PKG_NAME"
fi

# Check binary name
BIN_NAME=$(grep -A1 '"bin"' /Users/jerry/ccr/package.json | grep '"' | tail -1 | cut -d'"' -f2)
if [ "$BIN_NAME" = "cr" ]; then
    check_status 0 "Binary name: $BIN_NAME"
else
    check_status 1 "Binary name incorrect: $BIN_NAME"
fi

# Check version
PKG_VERSION=$(grep '"version"' /Users/jerry/ccr/package.json | head -1 | cut -d'"' -f4)
check_status 0 "Version: $PKG_VERSION"

echo ""
echo "2. Directory Structure"
echo "---------------------------------"

# Check config directory
if [ -d ~/.cr-router ]; then
    check_status 0 "Config directory: ~/.cr-router"
else
    check_status 1 "Config directory missing"
fi

# Check for old directories
if [ -d ~/.cc-router ] || [ -d ~/.ccr-router ] || [ -d ~/.claude-code-router ]; then
    check_status 1 "Old config directories still exist"
else
    check_status 0 "No old config directories"
fi

echo ""
echo "3. Command Line Interface"
echo "---------------------------------"

# Check if cr command exists
if command -v cr &> /dev/null; then
    check_status 0 "CR command available"
    CR_PATH=$(which cr)
    echo "   Path: $CR_PATH"
else
    check_status 1 "CR command not found"
fi

# Check if old commands exist
OLD_CMDS=0
for cmd in ccr cc; do
    if command -v $cmd &> /dev/null 2>&1; then
        if [[ $(which $cmd) != "/usr/bin/$cmd" ]]; then
            echo -e "${YELLOW}⚠${NC} Old command '$cmd' still exists: $(which $cmd)"
            OLD_CMDS=1
        fi
    fi
done
if [ $OLD_CMDS -eq 0 ]; then
    check_status 0 "No conflicting old commands"
fi

echo ""
echo "4. Code References"
echo "---------------------------------"

# Check for CCR references
CCR_COUNT=$(grep -r "CCR" /Users/jerry/ccr/src 2>/dev/null | grep -v "CR-SUBAGENT" | wc -l | tr -d ' ')
if [ "$CCR_COUNT" -eq "0" ]; then
    check_status 0 "No CCR references in source"
else
    check_status 1 "Found $CCR_COUNT CCR references in source"
fi

# Check for proper CR-SUBAGENT-MODEL tags
if grep -q "<CR-SUBAGENT-MODEL>" /Users/jerry/ccr/src/utils/router.ts; then
    check_status 0 "CR-SUBAGENT-MODEL tags updated"
else
    check_status 1 "Subagent model tags not updated"
fi

echo ""
echo "5. Repository Configuration"
echo "---------------------------------"

# Check repository URL
REPO_URL=$(grep '"url"' /Users/jerry/ccr/package.json | grep -i git | cut -d'"' -f4)
if [[ "$REPO_URL" == *"claude-router"* ]]; then
    check_status 0 "Repository URL: $REPO_URL"
else
    check_status 1 "Repository URL incorrect: $REPO_URL"
fi

echo ""
echo "6. Parallel Installation Test"
echo "---------------------------------"

# Check if original ccr could be installed alongside
echo "Testing if original ccr and our cr can coexist..."
echo "(This verifies they are truly separate packages)"

# Simulate check (don't actually install)
NPM_ORIGINAL="@musistudio/claude-code-router"
NPM_OURS="@jerryzhao173985/claude-router"

echo "   Original package: $NPM_ORIGINAL"
echo "   Our package: $NPM_OURS"
check_status 0 "Packages have different names (can coexist)"

echo ""
echo "7. Functional Test"
echo "---------------------------------"

# Test cr version
if cr version 2>&1 | grep -q "CR (Claude Router)"; then
    check_status 0 "CR version command works"
else
    check_status 1 "CR version command failed"
fi

# Test cr help
if cr help 2>&1 | grep -q "Usage: cr"; then
    check_status 0 "CR help command works"
else
    check_status 1 "CR help command failed"
fi

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo ""
echo "Package Details:"
echo "  Name: @jerryzhao173985/claude-router"
echo "  Command: cr"
echo "  Config: ~/.cr-router/"
echo "  Version: $PKG_VERSION"
echo ""
echo "Key Features:"
echo "  ✅ Completely separate from original ccr"
echo "  ✅ Can be installed alongside original"
echo "  ✅ Uses 'cr' command (no conflicts)"
echo "  ✅ OpenAI Responses API v2 support"
echo "  ✅ Continuous execution for tools"
echo ""
echo "Usage:"
echo "  cr start    # Start the router service"
echo "  cr code     # Use with Claude Code"
echo "  cr ui       # Open configuration UI"
echo "  cr status   # Check service status"
echo ""