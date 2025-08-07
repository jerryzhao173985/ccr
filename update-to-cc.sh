#!/bin/bash

echo "Updating all references from ccr to cc..."

# Update README.md
if [ -f "README.md" ]; then
    sed -i '' 's/ccr code/cc code/g' README.md
    sed -i '' 's/ccr restart/cc restart/g' README.md
    sed -i '' 's/ccr ui/cc ui/g' README.md
    sed -i '' 's/ccr start/cc start/g' README.md
    sed -i '' 's/ccr stop/cc stop/g' README.md
    sed -i '' 's/ccr status/cc status/g' README.md
    sed -i '' 's/ccr +/cc +/g' README.md
    echo "Updated README.md"
fi

# Update RESPONSES_API_GUIDE.md
if [ -f "RESPONSES_API_GUIDE.md" ]; then
    sed -i '' 's/ccr code/cc code/g' RESPONSES_API_GUIDE.md
    sed -i '' 's/~\/.claude-code-router/~\/.cc-router/g' RESPONSES_API_GUIDE.md
    echo "Updated RESPONSES_API_GUIDE.md"
fi

# Update documentation in docs/
if [ -d "docs" ]; then
    for file in docs/*.md; do
        if [ -f "$file" ]; then
            sed -i '' 's/ccr code/cc code/g' "$file"
            sed -i '' 's/ccr start/cc start/g' "$file"
            sed -i '' 's/ccr stop/cc stop/g' "$file"
            sed -i '' 's/ccr ui/cc ui/g' "$file"
            sed -i '' 's/ccr status/cc status/g' "$file"
            sed -i '' 's/~\/.claude-code-router/~\/.cc-router/g' "$file"
            echo "Updated $file"
        fi
    done
fi

# Update verify-installation.sh if it exists
if [ -f "verify-installation.sh" ]; then
    sed -i '' 's/ccr code/cc code/g' verify-installation.sh
    sed -i '' 's/ccr status/cc status/g' verify-installation.sh
    sed -i '' 's/CCR /CC /g' verify-installation.sh
    sed -i '' 's/\.claude-code-router/\.cc-router/g' verify-installation.sh
    echo "Updated verify-installation.sh"
fi

echo "All documentation updated!"