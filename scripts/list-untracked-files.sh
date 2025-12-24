#!/bin/bash

# Script to list untracked files (excluding .gitignore)
# Usage: ./scripts/list-untracked-files.sh

set -e

echo "🔍 Finding untracked files (excluding .gitignore)..."
echo ""

# Find untracked files (excluding .gitignore patterns)
untracked_files=$(git ls-files --others --exclude-standard)

if [ -z "$untracked_files" ]; then
  echo "✅ No untracked files found. All files are tracked or ignored."
  exit 0
fi

echo "📋 Untracked files:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$untracked_files" | while IFS= read -r file; do
  echo "  • $file"
done
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Count files
file_count=$(echo "$untracked_files" | wc -l | tr -d ' ')
echo "📊 Total: $file_count file(s)"

