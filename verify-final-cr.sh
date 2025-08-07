#!/bin/bash

echo "========================================="
echo "FINAL CR VERIFICATION"
echo "========================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        exit 1
    fi
}

echo ""
echo -e "${BLUE}1. REPOSITORY CONFIGURATION${NC}"
echo "---------------------------------"

# Check Git repository
REMOTE=$(git remote get-url origin 2>/dev/null)
if [[ "$REMOTE" == *"jerryzhao173985/ccr"* ]]; then
    check 0 "Git remote: jerryzhao173985/ccr (correct)"
else
    check 1 "Git remote incorrect: $REMOTE"
fi

# Check package.json repository
REPO_URL=$(grep '"url"' package.json | grep git | cut -d'"' -f4)
if [[ "$REPO_URL" == *"jerryzhao173985/ccr"* ]]; then
    check 0 "package.json repo: jerryzhao173985/ccr"
else
    check 1 "package.json repo incorrect: $REPO_URL"
fi

echo ""
echo -e "${BLUE}2. PACKAGE CONFIGURATION${NC}"
echo "---------------------------------"

# Check package name
PKG_NAME=$(grep '"name"' package.json | head -1 | cut -d'"' -f4)
if [ "$PKG_NAME" = "@jerryzhao173985/claude-router" ]; then
    check 0 "Package name: @jerryzhao173985/claude-router"
else
    check 1 "Package name incorrect: $PKG_NAME"
fi

# Check binary
BIN=$(grep -A1 '"bin"' package.json | tail -1 | cut -d'"' -f2)
if [ "$BIN" = "cr" ]; then
    check 0 "Binary command: cr"
else
    check 1 "Binary incorrect: $BIN"
fi

# Check version
VERSION=$(grep '"version"' package.json | head -1 | cut -d'"' -f4)
check 0 "Version: $VERSION"

echo ""
echo -e "${BLUE}3. DEPENDENCIES${NC}"
echo "---------------------------------"

# Check llms dependency
LLMS_DEP=$(grep '@musistudio/llms' package.json | cut -d'"' -f4)
if [[ "$LLMS_DEP" == "github:jerryzhao173985/llms#main" ]]; then
    check 0 "LLMS dependency: jerryzhao173985/llms#main ✅"
else
    check 1 "LLMS dependency incorrect: $LLMS_DEP"
fi

echo ""
echo -e "${BLUE}4. DIRECTORY STRUCTURE${NC}"
echo "---------------------------------"

# Check config directory
if [ -d ~/.cr-router ]; then
    check 0 "Config directory: ~/.cr-router"
else
    mkdir -p ~/.cr-router
    check 0 "Config directory created: ~/.cr-router"
fi

# Check for old directories
OLD_DIRS=""
for dir in ~/.cc-router ~/.ccr-router ~/.claude-code-router; do
    if [ -d "$dir" ]; then
        OLD_DIRS="$OLD_DIRS $dir"
    fi
done
if [ -z "$OLD_DIRS" ]; then
    check 0 "No old config directories"
else
    echo -e "${YELLOW}⚠${NC} Old directories exist:$OLD_DIRS"
fi

echo ""
echo -e "${BLUE}5. CODE REFERENCES${NC}"
echo "---------------------------------"

# Check subagent tags
if grep -q "<CR-SUBAGENT-MODEL>" src/utils/router.ts 2>/dev/null; then
    check 0 "CR-SUBAGENT-MODEL tags correct"
else
    check 1 "Subagent tags not updated"
fi

# Check for old CCR references (excluding CR-SUBAGENT)
CCR_COUNT=$(grep -r "CCR" src 2>/dev/null | grep -v "CR-SUBAGENT" | wc -l | tr -d ' ')
if [ "$CCR_COUNT" -eq "0" ]; then
    check 0 "No old CCR references in source"
else
    check 1 "Found $CCR_COUNT CCR references"
fi

echo ""
echo -e "${BLUE}6. BUILD TEST${NC}"
echo "---------------------------------"

# Check if built
if [ -f dist/cli.js ]; then
    check 0 "Build output exists: dist/cli.js"
else
    check 1 "Build output missing"
fi

echo ""
echo -e "${BLUE}7. COMMAND TEST${NC}"
echo "---------------------------------"

# Test cr command
if command -v cr &> /dev/null; then
    check 0 "cr command available"
    
    # Test version
    if cr version 2>&1 | grep -q "CR (Claude Router)"; then
        check 0 "cr version works"
    else
        check 1 "cr version failed"
    fi
else
    check 1 "cr command not found"
fi

echo ""
echo "========================================="
echo -e "${GREEN}CONFIGURATION SUMMARY${NC}"
echo "========================================="
echo ""
echo "GitHub Repository: jerryzhao173985/ccr ✅"
echo "NPM Package: @jerryzhao173985/claude-router ✅"
echo "Command: cr ✅"
echo "Config: ~/.cr-router/ ✅"
echo "LLMS Dependency: jerryzhao173985/llms#main ✅"
echo ""
echo -e "${BLUE}Key Points:${NC}"
echo "• GitHub repo stays as 'ccr' (not renamed)"
echo "• Package name uses 'claude-router' for npm"
echo "• Command uses 'cr' to avoid conflicts"
echo "• Uses our fork of llms for development"
echo "• Completely independent from original ccr"
echo ""
echo -e "${GREEN}Ready for development and deployment!${NC}"
echo ""