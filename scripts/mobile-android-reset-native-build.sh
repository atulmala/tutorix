#!/usr/bin/env bash
# Removes Android native (CMake) caches without running Gradle's externalNativeBuildClean,
# which can fail when .cxx still points at an old GRADLE_USER_HOME (e.g. Cursor sandbox).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID="$REPO_ROOT/apps/mobile/android"

rm -rf "$ANDROID/app/.cxx"
rm -rf "$ANDROID/app/build"
rm -rf "$ANDROID/build"
rm -rf "$ANDROID/build/generated/autolinking"
rm -rf "$ANDROID/app/build/generated/autolinking"

echo "Cleared apps/mobile/android native build folders (.cxx, build)."
echo "Next: from repo root run npm run mobile:android"
echo "  (runs link-native-deps + installDebug)"
echo "Or: cd apps/mobile/android && ./gradlew :app:installDebug"
