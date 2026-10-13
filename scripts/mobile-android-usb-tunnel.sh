#!/bin/bash
# Forward Metro (:8081) and the local API (:3000) to the phone over USB.
# Dev Android builds call http://127.0.0.1:3000/api/graphql; without these
# tunnels login shows "Network request failed".

set -e

wait_seconds="${MOBILE_ADB_WAIT_SECONDS:-45}"
retry_count="${MOBILE_ADB_REVERSE_RETRIES:-5}"

adb_authorized_devices() {
  adb devices 2>/dev/null | awk 'NR>1 && $2=="device" { print $1 }'
}

echo "Waiting for an authorized Android device (up to ${wait_seconds}s)..."
devices=()
for ((i = 1; i <= wait_seconds; i++)); do
  devices=()
  while IFS= read -r serial; do
    [[ -n "$serial" ]] && devices+=("$serial")
  done <<< "$(adb_authorized_devices)"
  if ((${#devices[@]} > 0)); then
    break
  fi
  if adb devices 2>/dev/null | grep -q 'unauthorized'; then
    echo "  Phone connected but USB debugging not authorized — unlock the phone and tap Allow."
  fi
  sleep 1
done

if ((${#devices[@]} == 0)); then
  echo "❌ No authorized device found. Plug in the phone, enable USB debugging, and accept the RSA prompt."
  adb devices 2>/dev/null || true
  exit 1
fi

echo "Using device(s): ${devices[*]}"

reverse_ports_for_device() {
  local serial="$1"
  adb -s "$serial" reverse tcp:8081 tcp:8081 && adb -s "$serial" reverse tcp:3000 tcp:3000
}

for ((attempt = 1; attempt <= retry_count; attempt++)); do
  ok=true
  for serial in "${devices[@]}"; do
    if ! reverse_ports_for_device "$serial"; then
      ok=false
      echo "  adb reverse failed for $serial (attempt $attempt/$retry_count)"
    fi
  done
  if [[ "$ok" == true ]]; then
    echo "✅ USB tunnels ready on all devices (Metro :8081, API :3000)"
    adb reverse --list 2>/dev/null || true
    exit 0
  fi
  sleep 2
done

echo "❌ Could not set up adb reverse. Login and API calls will fail until this works."
exit 1
