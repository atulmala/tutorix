#!/usr/bin/env bash
# Build a store binary with production GraphQL / legal URLs inlined.
# Usage: bash scripts/mobile-store-build.sh android|ios

set -euo pipefail

PLATFORM="${1:-}"
if [[ "$PLATFORM" != "android" && "$PLATFORM" != "ios" ]]; then
  echo "Usage: bash scripts/mobile-store-build.sh android|ios" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

export TUTORIX_STORE_BUILD=1

echo "TUTORIX_STORE_BUILD=1"
echo "GraphQL will be inlined from apps/mobile/.env.store"

if [[ "$PLATFORM" == "android" ]]; then
  cd apps/mobile/android
  ./gradlew bundleRelease
  echo "AAB: apps/mobile/android/app/build/outputs/bundle/release/app-release.aab"
else
  cd apps/mobile
  npx react-native build-ios --mode Release
  echo "For App Store upload, archive in Xcode with TUTORIX_STORE_BUILD=1 in the scheme environment, or run this script first so the Release bundle is production."
fi
