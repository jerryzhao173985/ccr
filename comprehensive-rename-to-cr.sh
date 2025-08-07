#!/bin/bash

echo "==================================="
echo "Comprehensive Rename to CR (Claude Router)"
echo "==================================="

# Update package.json
echo "1. Updating package.json..."
sed -i '' 's/jerryzhao173985\/ccr/jerryzhao173985\/claude-router/g' package.json

# Update all CCR references to CR in code
echo "2. Updating CCR references to CR..."
find . -name "*.ts" -o -name "*.js" -o -name "*.md" | grep -v node_modules | grep -v dist | while read file; do
    # Update CCR-SUBAGENT-MODEL tags to CR-SUBAGENT-MODEL
    sed -i '' 's/<CCR-SUBAGENT-MODEL>/<CR-SUBAGENT-MODEL>/g' "$file"
    sed -i '' 's/<\/CCR-SUBAGENT-MODEL>/<\/CR-SUBAGENT-MODEL>/g' "$file"
    
    # Update CCR references in comments and strings to CR
    sed -i '' 's/CCR is routing/CR is routing/g' "$file"
    sed -i '' 's/CCR endpoint/CR endpoint/g' "$file"
    sed -i '' 's/CCR node_modules/CR node_modules/g' "$file"
    sed -i '' 's/via CCR/via CR/g' "$file"
    sed -i '' 's/with CCR/with CR/g' "$file"
    sed -i '' 's/Test CCR/Test CR/g' "$file"
    sed -i '' 's/Configure CCR/Configure CR/g' "$file"
    sed -i '' 's/CCR configuration/CR configuration/g' "$file"
    sed -i '' 's/Start CCR/Start CR/g' "$file"
    sed -i '' 's/Usage with CCR/Usage with CR/g' "$file"
    sed -i '' 's/callCCR/callCR/g' "$file"
    sed -i '' 's/Sending to CCR/Sending to CR/g' "$file"
    sed -i '' 's/request via CCR/request via CR/g' "$file"
    sed -i '' 's/Testing CCR/Testing CR/g' "$file"
    
    # Don't change the fork reference as it's the actual repo name
    # sed -i '' 's/jerryzhao173985\/ccr/jerryzhao173985\/claude-router/g' "$file"
done

# Update CLI references
echo "3. Updating CLI file..."
sed -i '' 's/~\/.cc-router/~\/.cr-router/g' src/cli.ts

# Update CLAUDE.md specifically
echo "4. Updating CLAUDE.md..."
sed -i '' 's/ccr start/cr start/g' CLAUDE.md
sed -i '' 's/ccr stop/cr stop/g' CLAUDE.md
sed -i '' 's/ccr restart/cr restart/g' CLAUDE.md
sed -i '' 's/ccr status/cr status/g' CLAUDE.md
sed -i '' 's/ccr ui/cr ui/g' CLAUDE.md
sed -i '' 's/ccr code/cr code/g' CLAUDE.md
sed -i '' 's/ccr version/cr version/g' CLAUDE.md
sed -i '' 's/ccr help/cr help/g' CLAUDE.md

# Update README.md
echo "5. Updating README.md..."
sed -i '' 's/@musistudio\/claude-code-router/@jerryzhao173985\/claude-router/g' README.md
sed -i '' 's/~\/.claude-code-router/~\/.cr-router/g' README.md
sed -i '' 's/claude-code-router.log/cr-router.log/g' README.md

# Update RESPONSES_API_GUIDE.md
echo "6. Updating RESPONSES_API_GUIDE.md..."
sed -i '' 's/Claude Code Router (CCR)/Claude Router (CR)/g' RESPONSES_API_GUIDE.md
sed -i '' 's/ccr stop/cr stop/g' RESPONSES_API_GUIDE.md
sed -i '' 's/ccr start/cr start/g' RESPONSES_API_GUIDE.md
sed -i '' 's/test-ccr-json/test-cr-json/g' RESPONSES_API_GUIDE.md

# Update test files
echo "7. Updating test files..."
for file in test-*.js; do
    if [ -f "$file" ]; then
        sed -i '' 's/callCCR/callCR/g' "$file"
        sed -i '' 's/CCR endpoint/CR endpoint/g' "$file"
        sed -i '' 's/Sending to CCR/Sending to CR/g' "$file"
        sed -i '' 's/via CCR/via CR/g' "$file"
        sed -i '' 's/Test CCR/Test CR/g' "$file"
        sed -i '' 's/Testing CCR/Testing CR/g' "$file"
        sed -i '' 's/with CCR/with CR/g' "$file"
    fi
done

# Rename test files
echo "8. Renaming test files..."
[ -f "test-ccr-o3.js" ] && mv test-ccr-o3.js test-cr-o3.js
[ -f "test-ccr-json.js" ] && mv test-ccr-json.js test-cr-json.js

echo "==================================="
echo "Comprehensive rename complete!"
echo "==================================="