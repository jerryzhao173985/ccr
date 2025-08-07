#\!/bin/bash

# Update all documentation and references from cc to cr

echo "Updating documentation from cc to cr..."

# Update CLAUDE.md
sed -i '' 's/cc start/cr start/g' CLAUDE.md
sed -i '' 's/cc stop/cr stop/g' CLAUDE.md
sed -i '' 's/cc restart/cr restart/g' CLAUDE.md
sed -i '' 's/cc status/cr status/g' CLAUDE.md
sed -i '' 's/cc ui/cr ui/g' CLAUDE.md
sed -i '' 's/cc code/cr code/g' CLAUDE.md
sed -i '' 's/cc version/cr version/g' CLAUDE.md
sed -i '' 's/cc help/cr help/g' CLAUDE.md
sed -i '' 's/CC service/CR service/g' CLAUDE.md
sed -i '' 's/\.cc-router/\.cr-router/g' CLAUDE.md
sed -i '' 's/cc-router\.pid/cr-router\.pid/g' CLAUDE.md
sed -i '' 's/cc-reference-count/cr-reference-count/g' CLAUDE.md

# Update README.md if it exists
if [ -f README.md ]; then
    sed -i '' 's/cc start/cr start/g' README.md
    sed -i '' 's/cc stop/cr stop/g' README.md
    sed -i '' 's/cc restart/cr restart/g' README.md
    sed -i '' 's/cc status/cr status/g' README.md
    sed -i '' 's/cc ui/cr ui/g' README.md
    sed -i '' 's/cc code/cr code/g' README.md
    sed -i '' 's/cc version/cr version/g' README.md
    sed -i '' 's/cc help/cr help/g' README.md
    sed -i '' 's/CC service/CR service/g' README.md
    sed -i '' 's/\.cc-router/\.cr-router/g' README.md
fi

# Update all documentation files in docs/
if [ -d docs ]; then
    find docs -name "*.md" -type f -exec sed -i '' 's/cc start/cr start/g' {} \;
    find docs -name "*.md" -type f -exec sed -i '' 's/cc stop/cr stop/g' {} \;
    find docs -name "*.md" -type f -exec sed -i '' 's/cc restart/cr restart/g' {} \;
    find docs -name "*.md" -type f -exec sed -i '' 's/cc status/cr status/g' {} \;
    find docs -name "*.md" -type f -exec sed -i '' 's/cc ui/cr ui/g' {} \;
    find docs -name "*.md" -type f -exec sed -i '' 's/cc code/cr code/g' {} \;
    find docs -name "*.md" -type f -exec sed -i '' 's/cc version/cr version/g' {} \;
    find docs -name "*.md" -type f -exec sed -i '' 's/CC service/CR service/g' {} \;
    find docs -name "*.md" -type f -exec sed -i '' 's/\.cc-router/\.cr-router/g' {} \;
    find docs -name "*.md" -type f -exec sed -i '' 's/CC Installation/CR Installation/g' {} \;
    find docs -name "*.md" -type f -exec sed -i '' 's/CC directory/CR directory/g' {} \;
    find docs -name "*.md" -type f -exec sed -i '' 's/CC package/CR package/g' {} \;
    find docs -name "*.md" -type f -exec sed -i '' 's/CC CLI/CR CLI/g' {} \;
    find docs -name "*.md" -type f -exec sed -i '' 's/CC remote/CR remote/g' {} \;
    find docs -name "*.md" -type f -exec sed -i '' 's/CC git/CR git/g' {} \;
fi

# Update RESPONSES_API_GUIDE.md
if [ -f RESPONSES_API_GUIDE.md ]; then
    sed -i '' 's/cc code/cr code/g' RESPONSES_API_GUIDE.md
    sed -i '' 's/\.cc-router/\.cr-router/g' RESPONSES_API_GUIDE.md
fi

# Update verify-installation.sh
if [ -f verify-installation.sh ]; then
    sed -i '' 's/CC Installation/CR Installation/g' verify-installation.sh
    sed -i '' 's/CC directory/CR directory/g' verify-installation.sh
    sed -i '' 's/CC package/CR package/g' verify-installation.sh
    sed -i '' 's/CC CLI/CR CLI/g' verify-installation.sh
    sed -i '' 's/CC remote/CR remote/g' verify-installation.sh
    sed -i '' 's/CC git/CR git/g' verify-installation.sh
    sed -i '' 's/CC service/CR service/g' verify-installation.sh
    sed -i '' 's/cc status/cr status/g' verify-installation.sh
    sed -i '' 's/cc code/cr code/g' verify-installation.sh
    sed -i '' 's/\.cc-router/\.cr-router/g' verify-installation.sh
fi

echo "Documentation updated to use 'cr' instead of 'cc'"
