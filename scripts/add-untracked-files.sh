#!/bin/bash

# Script to find and add untracked files to git (excluding .gitignore)
# Usage: ./scripts/add-untracked-files.sh

set -e

echo "🔍 Finding untracked files (excluding .gitignore)..."
echo ""

# Find untracked files (excluding .gitignore patterns)
untracked_files=$(git ls-files --others --exclude-standard)

if [ -z "$untracked_files" ]; then
  echo "✅ No untracked files found. All files are tracked or ignored."
  exit 0
fi

echo "📋 Untracked files found:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$untracked_files" | while IFS= read -r file; do
  echo "  • $file"
done
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Count files
file_count=$(echo "$untracked_files" | wc -l | tr -d ' ')
echo "📊 Total: $file_count file(s)"
echo ""

# Ask for confirmation
read -p "❓ Add these files to git? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "➕ Adding files to git..."
  echo "$untracked_files" | xargs git add
  echo ""
  echo "✅ Files added successfully!"
  echo ""
  echo "📝 Status:"
  git status --short
else
  echo "❌ Cancelled. No files were added."
  exit 0
fi

