#!/bin/bash
# Version Bump Automation Script
# Usage: npm run bump-version [patch|minor|major]
# Example: npm run bump-version minor

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if version type is provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: Version type required${NC}"
  echo "Usage: npm run bump-version [patch|minor|major]"
  echo "  patch: Bug fixes (1.0.0 -> 1.0.1)"
  echo "  minor: New features (1.0.0 -> 1.1.0)"
  echo "  major: Breaking changes (1.0.0 -> 2.0.0)"
  exit 1
fi

VERSION_TYPE=$1

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo -e "${RED}Error: Invalid version type '$VERSION_TYPE'${NC}"
  echo "Must be one of: patch, minor, major"
  exit 1
fi

echo -e "${YELLOW}🔄 Bumping $VERSION_TYPE version...${NC}"

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "Current version: ${GREEN}$CURRENT_VERSION${NC}"

# Bump version in package.json (without git tag)
npm version $VERSION_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "New version: ${GREEN}$NEW_VERSION${NC}"

# Update documentation files
echo -e "${YELLOW}📝 Updating documentation files...${NC}"

# Array of files to update
DOC_FILES=(
  "README.md"
  "ARCHITECTURE.md"
  "TASKLIST.md"
  "LEARNINGS.md"
  "AUTH_CURRENT.md"
  "DOCUMENTATION_REMEDIATION_SUMMARY.md"
)

# Update version in each file
for file in "${DOC_FILES[@]}"; do
  if [ -f "$file" ]; then
    # macOS sed syntax (use -i '' for in-place edit without backup)
    sed -i '' "s/v[0-9]\+\.[0-9]\+\.[0-9]\+/v$NEW_VERSION/g" "$file"
    sed -i '' "s/[0-9]\+\.[0-9]\+\.[0-9]\+/$NEW_VERSION/g" "$file"
    echo -e "  ✓ Updated $file"
  else
    echo -e "  ${YELLOW}⚠ Skipped $file (not found)${NC}"
  fi
done

echo ""
echo -e "${GREEN}✅ Version bump complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Add entry to RELEASE_NOTES.md for v$NEW_VERSION"
echo "2. Review changes: git diff"
echo "3. Stage changes: git add -A"
echo "4. Commit: git commit -m \"chore: bump version to v$NEW_VERSION\""
echo "5. Push: git push origin main"
echo ""
echo -e "${YELLOW}📝 RELEASE_NOTES.md template:${NC}"
echo ""
echo "## [v$NEW_VERSION] — $(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"
echo ""
echo "### Added"
echo "- Feature description"
echo ""
echo "### Changed"
echo "- Change description"
echo ""
echo "### Fixed"
echo "- Bug fix description"
echo ""
