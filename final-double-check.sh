#!/bin/bash

echo "========================================="
echo "FINAL DOUBLE-CHECK FOR CR"
echo "========================================="

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

echo -e "\n${BLUE}1. CHECKING CONFIG PATHS${NC}"
echo "--------------------------------"

# Check source code for correct path
if grep -r "\.claude-router" /Users/jerry/ccr/src > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Source uses .claude-router${NC}"
else
    echo -e "${RED}✗ Source doesn't use .claude-router${NC}"
    ((ERRORS++))
fi

# Check for old paths
if grep -r "\.cr-router\|\.cc-router\|\.ccr-router" /Users/jerry/ccr/src 2>/dev/null | grep -v "settings.local.json"; then
    echo -e "${RED}✗ Found old path references in source${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✓ No old path references in source${NC}"
fi

echo -e "\n${BLUE}2. CHECKING PACKAGE REFERENCES${NC}"
echo "--------------------------------"

# Check for our package
if grep -r "@jerryzhao173985/llms" /Users/jerry/ccr/src > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Using @jerryzhao173985/llms${NC}"
else
    echo -e "${RED}✗ Not using our llms package${NC}"
    ((ERRORS++))
fi

# Check for old package
if grep -r "@musistudio/llms" /Users/jerry/ccr/src 2>/dev/null; then
    echo -e "${RED}✗ Still using @musistudio/llms${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✓ Not using @musistudio/llms${NC}"
fi

echo -e "\n${BLUE}3. CHECKING ACTUAL FILES${NC}"
echo "--------------------------------"

# Check if config directory exists
if [ -d ~/.claude-router ]; then
    echo -e "${GREEN}✓ Config directory exists: ~/.claude-router${NC}"
    
    # Check files in directory
    if [ -f ~/.claude-router/config.json ]; then
        echo -e "${GREEN}✓ Config file exists${NC}"
    else
        echo -e "${YELLOW}⚠ Config file not found${NC}"
        ((WARNINGS++))
    fi
    
    if [ -f ~/.claude-router/.claude-router.pid ]; then
        echo -e "${GREEN}✓ PID file exists${NC}"
    else
        echo -e "${YELLOW}⚠ PID file not found (service may not be running)${NC}"
    fi
    
    if [ -f ~/.claude-router/claude-router.log ]; then
        echo -e "${GREEN}✓ Log file exists${NC}"
    else
        echo -e "${YELLOW}⚠ Log file not created yet${NC}"
    fi
else
    echo -e "${RED}✗ Config directory doesn't exist${NC}"
    ((ERRORS++))
fi

# Check for old directories that shouldn't exist
for dir in ~/.cr-router ~/.cc-router ~/.ccr-router; do
    if [ -d "$dir" ]; then
        echo -e "${YELLOW}⚠ Old directory still exists: $dir${NC}"
        ((WARNINGS++))
    fi
done

echo -e "\n${BLUE}4. CHECKING RUNNING SERVICE${NC}"
echo "--------------------------------"

# Check service status
if cr status 2>&1 | grep -q "Status: Running"; then
    echo -e "${GREEN}✓ Service is running${NC}"
    
    # Check PID file path in output
    if cr status 2>&1 | grep -q "/.claude-router/.claude-router.pid"; then
        echo -e "${GREEN}✓ Service using correct PID path${NC}"
    else
        echo -e "${RED}✗ Service using wrong PID path${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠ Service not running${NC}"
    ((WARNINGS++))
fi

echo -e "\n${BLUE}5. CHECKING PACKAGE.JSON${NC}"
echo "--------------------------------"

# Check package name
PKG_NAME=$(grep '"name"' /Users/jerry/ccr/package.json | head -1 | cut -d'"' -f4)
if [ "$PKG_NAME" = "@jerryzhao173985/claude-router" ]; then
    echo -e "${GREEN}✓ Package name correct: $PKG_NAME${NC}"
else
    echo -e "${RED}✗ Package name wrong: $PKG_NAME${NC}"
    ((ERRORS++))
fi

# Check dependency
if grep -q '"@jerryzhao173985/llms"' /Users/jerry/ccr/package.json; then
    echo -e "${GREEN}✓ Using correct llms dependency${NC}"
else
    echo -e "${RED}✗ Not using correct llms dependency${NC}"
    ((ERRORS++))
fi

echo -e "\n${BLUE}6. CHECKING BUILD OUTPUT${NC}"
echo "--------------------------------"

# Check CLI file
if [ -f /Users/jerry/ccr/dist/cli.js ]; then
    # Check if it references correct paths
    if strings /Users/jerry/ccr/dist/cli.js 2>/dev/null | grep -q "\.claude-router"; then
        echo -e "${GREEN}✓ Built CLI uses .claude-router${NC}"
    else
        echo -e "${YELLOW}⚠ Built CLI may not have latest paths${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗ CLI not built${NC}"
    ((ERRORS++))
fi

echo -e "\n${BLUE}7. API TEST${NC}"
echo "--------------------------------"

# Test API endpoint
if curl -s http://127.0.0.1:3456/api/config > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API responding${NC}"
else
    echo -e "${YELLOW}⚠ API not responding${NC}"
    ((WARNINGS++))
fi

echo -e "\n========================================="
if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✅ PERFECT! All checks passed!${NC}"
    else
        echo -e "${GREEN}✅ All critical checks passed!${NC}"
        echo -e "${YELLOW}   ($WARNINGS warnings - non-critical)${NC}"
    fi
    echo "========================================="
    echo ""
    echo "CR is using:"
    echo "• Config: ~/.claude-router/ ✓"
    echo "• Package: @jerryzhao173985/claude-router ✓"
    echo "• Dependency: @jerryzhao173985/llms ✓"
    echo "• No conflicts with original packages ✓"
    echo ""
    echo "The system is correctly configured!"
else
    echo -e "${RED}❌ FOUND $ERRORS CRITICAL ERRORS${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}   Also $WARNINGS warnings${NC}"
    fi
    echo "========================================="
    echo "Please fix the errors above."
fi
echo ""