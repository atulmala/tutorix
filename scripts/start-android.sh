#!/bin/bash

# Script to start Android app with Metro bundler
# This ensures Metro bundler is running before launching the Android app

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🚀 Starting Android development environment..."
echo ""

# Check if Metro is already running
if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Metro bundler is already running on port 8081"
else
    echo "📦 Starting Metro bundler in its own terminal window..."

    if [[ "$OSTYPE" == "darwin"* ]] && [ -t 1 ]; then
        # Open Metro in a separate, persistent Terminal.app window so its
        # logs (JS errors, LogBox output, etc.) stay visible and don't get
        # swallowed by backgrounding it inside this script's shell.
        osascript -e "tell application \"Terminal\" to do script \"cd '$REPO_ROOT' && npx nx start mobile\"" >/dev/null
        osascript -e 'tell application "Terminal" to activate' >/dev/null
    else
        # Non-macOS or non-interactive fallback: background it in this shell.
        npx nx start mobile &
    fi

    echo "⏳ Waiting for Metro bundler to be ready..."
    # Wait for Metro to be ready (check if port 8081 is listening)
    for i in {1..30}; do
        if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null ; then
            echo "✅ Metro bundler is ready!"
            break
        fi
        sleep 1
    done

    if ! lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Metro bundler failed to start. Please start it manually with: npm run mobile:start"
        exit 1
    fi
fi

echo ""
echo "📱 Starting Android app..."
echo ""

# Run Android app (this will connect to the running Metro bundler)
npx nx run-android mobile

echo ""
echo "✅ Android app launched!"
echo ""
echo "💡 Tips:"
echo "   - Metro bundler is running in its own Terminal window (or backgrounded if one couldn't be opened)"
echo "   - To stop Metro, run: lsof -ti:8081 | xargs kill"
echo "   - To restart Metro, run: npm run mobile:start"
