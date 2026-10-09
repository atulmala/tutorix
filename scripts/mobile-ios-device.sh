#!/bin/bash

# Install the iOS app on one connected device: iphone or ipad.

set -euo pipefail

kind="${1:-}"
if [[ "$kind" != "iphone" && "$kind" != "ipad" ]]; then
  echo "Usage: mobile-ios-device.sh iphone|ipad" >&2
  exit 1
fi

if [[ "$kind" == "iphone" ]]; then
  pattern="iPhone"
else
  pattern="iPad"
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
devices="$(xcrun xctrace list devices)"
udid=""
label=""
in_devices=0

while IFS= read -r line; do
  if [[ "$line" == "== Devices ==" ]]; then
    in_devices=1
    continue
  fi
  if [[ "$in_devices" == 1 && "$line" == ==* ]]; then
    break
  fi
  if [[ "$in_devices" != 1 || "$line" != *"$pattern"* ]]; then
    continue
  fi
  if [[ "$line" =~ \(([0-9A-Fa-f-]{20,})\)[[:space:]]*$ ]]; then
    udid="${BASH_REMATCH[1]}"
    label="$line"
    break
  fi
done <<< "$devices"

if [[ -z "$udid" ]]; then
  echo "No connected ${pattern} found. Plug it in and unlock it." >&2
  exit 1
fi

echo "Installing on ${label}"
cd "${repo_root}/apps/mobile"
exec npx react-native run-ios --udid "$udid" --extra-params "-allowProvisioningUpdates"
