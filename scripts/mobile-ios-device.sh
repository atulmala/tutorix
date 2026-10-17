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

device_name=""
if [[ "$label" =~ ^(.+)\ \([0-9][0-9.]+\)\ \(([0-9A-Fa-f-]+)\)[[:space:]]*$ ]]; then
  device_name="${BASH_REMATCH[1]}"
fi

ios_dir="${repo_root}/apps/mobile/ios"
destinations="$(xcodebuild -workspace "${ios_dir}/Mobile.xcworkspace" -scheme Mobile -showdestinations 2>&1 || true)"
device_line="$(grep "${udid}" <<< "$destinations" || true)"

if [[ -z "$device_line" ]]; then
  echo "Xcode does not list this device yet. Unlock the phone, trust this Mac, and try again." >&2
  exit 1
fi

if [[ "$device_line" == *"error:"* ]]; then
  echo "Xcode cannot deploy to this device right now:" >&2
  echo "  ${device_line}" >&2
  echo "" >&2
  echo "Try:" >&2
  echo "  • Keep the iPhone unlocked and on the home screen during install" >&2
  echo "  • Settings → Privacy & Security → Developer Mode → On (restart if asked)" >&2
  echo "  • Unplug/replug USB; tap Trust on the phone" >&2
  echo "  • Xcode → Settings → Accounts: sign in (fixes missing Xcode-Token / signing)" >&2
  echo "  • Open ${ios_dir}/Mobile.xcworkspace and run once on this device" >&2
  exit 1
fi

if grep -q "missing Xcode-Token" <<< "$destinations"; then
  echo "Warning: Apple ID in Xcode needs to sign in again (Xcode → Settings → Accounts)." >&2
fi

lan_host="$(node -e "const {detectLanHost}=require('${repo_root}/apps/mobile/detect-lan-host.cjs'); process.stdout.write(detectLanHost()||'');")"
if [[ -n "$lan_host" ]]; then
  echo ""
  echo "Physical device dev checklist:"
  echo "  • Mac API: npm run serve:api  (GraphQL http://${lan_host}:3000/api/graphql)"
  echo "  • iPhone and Mac on the same Wi‑Fi"
  echo "  • Settings → Tutorix → Local Network: ON"
  echo "  • Metro must be running (port 8081); reload app after changing .env"
  echo "  • Keep the phone unlocked until the build finishes"
  echo ""
else
  echo "Warning: could not detect a LAN IPv4. Set DEV_LAN_HOST in .env and restart Metro." >&2
fi

cd "${repo_root}/apps/mobile"
# Physical devices: use --device (UDID or name). --udid is for simulators only.
device_arg="${device_name:-$udid}"
exec npx react-native run-ios --device "$device_arg" --extra-params "-allowProvisioningUpdates"
