#!/bin/bash
# Bash script for creating and pushing version tags

set -e

VERSION=$1
MESSAGE=${2:-"Release version"}
PUSH=${3:-false}

if [ -z "$VERSION" ]; then
    echo "❌ Error: Version is required"
    echo "Usage: ./scripts/tag-version.sh <version> [message] [push]"
    echo "Example: ./scripts/tag-version.sh 1.0.0 'Initial release' true"
    exit 1
fi

# Validate version format
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "❌ Error: Invalid version format. Use semantic versioning (e.g., 1.0.0)"
    exit 1
fi

TAG="v$VERSION"

echo "🏷️  Creating Git tag: $TAG"

# Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
    echo "❌ Tag $TAG already exists!"
    echo "   Use 'git tag -d $TAG' to delete it first if you want to recreate it."
    exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo "⚠️  Warning: You have uncommitted changes:"
    git status --short
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted"
        exit 1
    fi
fi

# Create annotated tag
echo "📝 Creating annotated tag..."
git tag -a "$TAG" -m "$MESSAGE $TAG"

echo "✅ Tag created successfully!"

# Show tag info
echo ""
echo "📋 Tag information:"
git show "$TAG" --quiet

if [ "$PUSH" = "true" ]; then
    echo ""
    echo "🚀 Pushing tag to remote..."
    git push origin "$TAG"
    
    echo "✅ Tag pushed to remote!"
    echo ""
    echo "🐳 Docker images will be built with tags:"
    echo "   - $TAG"
    echo "   - v${VERSION%.*}"
    echo "   - v${VERSION%%.*}"
    echo "   - latest (if on main branch)"
else
    echo ""
    echo "💡 To push this tag, run:"
    echo "   git push origin $TAG"
    echo ""
    echo "Or run this script with push argument:"
    echo "   ./scripts/tag-version.sh $VERSION '$MESSAGE' true"
fi

echo ""
echo "📦 Current tags:"
git tag -l "v*" | sort -V -r | head -5
