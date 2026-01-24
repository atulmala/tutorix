#!/bin/bash

# Script to start Android app with Metro bundler
# This ensures Metro bundler is running before launching the Android app

set -e

echo "🚀 Starting Android development environment..."
echo ""

# Check if Metro is already running
if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Metro bundler is already running on port 8081"
else
    echo "📦 Starting Metro bundler..."
    # Start Metro in the background
    npx nx start mobile &
    METRO_PID=$!
    
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
        kill $METRO_PID 2>/dev/null || true
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
echo "   - Metro bundler is running in the background"
echo "   - To stop Metro, run: lsof -ti:8081 | xargs kill"
echo "   - To restart Metro, run: npm run mobile:start"
