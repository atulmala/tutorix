#!/usr/bin/env bash
# Autolinking scans apps/mobile/node_modules only. Hoisted native modules must be
# linked here so Android PackageList and Gradle include Agora, WebView, etc.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_NM="$REPO_ROOT/apps/mobile/node_modules"
ROOT_NM="$REPO_ROOT/node_modules"

PACKAGES=(
  react-native-agora
  agora-react-native-rtm
  react-native-webview
  @netless/react-native-whiteboard
)

link_package() {
  local name="$1"
  local source="$ROOT_NM/$name"
  local target="$MOBILE_NM/$name"

  if [[ ! -d "$source" ]]; then
    echo "error: expected hoisted package at $source (run npm install at repo root)" >&2
    exit 1
  fi

  if [[ "$name" == @*/* ]]; then
    mkdir -p "$MOBILE_NM/$(dirname "$name")"
  fi

  if [[ -L "$target" ]]; then
    if [[ "$(readlink "$target")" == "$source" ]]; then
      return 0
    fi
    rm "$target"
  elif [[ -e "$target" ]]; then
    rm -rf "$target"
  fi

  ln -s "$source" "$target"
}

for name in "${PACKAGES[@]}"; do
  link_package "$name"
done

# Force Gradle to regenerate PackageList.java on the next Android build.
rm -rf "$REPO_ROOT/apps/mobile/android/build/generated/autolinking"
rm -rf "$REPO_ROOT/apps/mobile/android/app/build/generated/autolinking"

echo "Mobile native deps linked under apps/mobile/node_modules"
