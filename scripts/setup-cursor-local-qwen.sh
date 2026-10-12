#!/usr/bin/env bash
# Configure local Qwen 2.5 Coder 7B (via Ollama) for Cursor IDE.
# - Ensures Ollama + gpt-4o-mini alias (Cursor allowlist workaround)
# - Starts or reuses a Cloudflare quick tunnel to Ollama
# - Writes Cursor state.vscdb (API key, base URL, default model)
set -euo pipefail

OLLAMA_MODEL_SOURCE="qwen2.5-coder:7b"
# Built-in id Cursor already shows by default (gpt-5-mini is defaultOn=false and stays hidden).
CURSOR_MODEL="gpt-5.6-sol"
API_KEY="ollama"
TUNNEL_URL_FILE="${HOME}/.cursor/ollama-cursor-tunnel.url"
CURSOR_DB="${HOME}/Library/Application Support/Cursor/User/globalStorage/state.vscdb"
APP_USER_KEY="src.vs.platform.reactivestorage.browser.reactiveStorageServiceImpl.persistentStorage.applicationUser"

log() { printf '%s\n' "$*"; }
die() { log "ERROR: $*"; exit 1; }

if pgrep -x Cursor >/dev/null 2>&1 || pgrep -f '/Cursor.app/' >/dev/null 2>&1; then
  die "Quit Cursor completely (Cmd+Q) before running this script, then run it from Terminal.app"
fi

command -v ollama >/dev/null || die "ollama not installed (brew install ollama)"
command -v cloudflared >/dev/null || die "cloudflared not installed (brew install cloudflared)"
command -v python3 >/dev/null || die "python3 required"

if ! curl -sf --max-time 3 http://127.0.0.1:11434/api/tags >/dev/null; then
  log "Starting Ollama..."
  brew services start ollama >/dev/null 2>&1 || true
  for _ in $(seq 1 30); do
    curl -sf --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null && break
    sleep 1
  done
  curl -sf --max-time 3 http://127.0.0.1:11434/api/tags >/dev/null \
    || die "Ollama did not start on :11434"
fi

if ! ollama list | awk '{print $1}' | grep -qx "${OLLAMA_MODEL_SOURCE}"; then
  log "Pulling ${OLLAMA_MODEL_SOURCE} (this can take several minutes)..."
  ollama pull "${OLLAMA_MODEL_SOURCE}"
fi

if ! ollama list | awk '{print $1}' | grep -qx "${CURSOR_MODEL}:latest"; then
  log "Creating Ollama alias ${CURSOR_MODEL} -> ${OLLAMA_MODEL_SOURCE}"
  tmp="$(mktemp)"
  printf 'FROM %s\n' "${OLLAMA_MODEL_SOURCE}" >"${tmp}"
  ollama create "${CURSOR_MODEL}" -f "${tmp}"
  rm -f "${tmp}"
fi

find_tunnel_in_logs() {
  local f url
  for f in "${HOME}/.cursor/ollama-cloudflared.log" "${TUNNEL_URL_FILE}"; do
    [[ -f "${f}" ]] || continue
    url="$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "${f}" 2>/dev/null | tail -1 || true)"
    if [[ -n "${url}" ]]; then
      printf '%s' "${url}"
      return 0
    fi
  done
  return 1
}

tunnel_works() {
  local base_v1="$1"
  curl -sf --max-time 25 "${base_v1}/chat/completions" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"${CURSOR_MODEL}\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}],\"max_tokens\":2}" \
    >/dev/null 2>&1
}

get_tunnel_url() {
  local u
  if [[ -f "${TUNNEL_URL_FILE}" ]]; then
    u="$(tr -d '[:space:]' <"${TUNNEL_URL_FILE}")"
    if [[ -n "${u}" ]] && tunnel_works "${u%/}/v1"; then
      printf '%s' "${u}"
      return 0
    fi
  fi
  u="$(find_tunnel_in_logs || true)"
  if [[ -n "${u}" ]] && tunnel_works "${u}/v1"; then
    printf '%s' "${u}" >"${TUNNEL_URL_FILE}"
    printf '%s' "${u}"
    return 0
  fi
  return 1
}

start_tunnel() {
  mkdir -p "${HOME}/.cursor"
  local log="${HOME}/.cursor/ollama-cloudflared.log"
  log "Starting Cloudflare tunnel (log: ${log})..."
  nohup cloudflared tunnel --url http://127.0.0.1:11434 --no-autoupdate >"${log}" 2>&1 &
  local i url
  for i in $(seq 1 60); do
    url="$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "${log}" 2>/dev/null | head -1 || true)"
    if [[ -n "${url}" ]]; then
      printf '%s' "${url}" >"${TUNNEL_URL_FILE}"
      if tunnel_works "${url}/v1"; then
        printf '%s' "${url}"
        return 0
      fi
    fi
    sleep 1
  done
  return 1
}

if [[ -n "${TUNNEL_URL:-}" ]]; then
  BASE_URL="${TUNNEL_URL%/}"
  printf '%s' "${BASE_URL}" >"${TUNNEL_URL_FILE}"
else
  BASE_URL="$(get_tunnel_url || true)"
  if [[ -z "${BASE_URL}" ]]; then
    BASE_URL="$(start_tunnel)" || die "Could not start Cloudflare tunnel; see ${HOME}/.cursor/ollama-cloudflared.log"
  fi
fi

# Cursor expects .../v1 without trailing slash on some builds; Ollama accepts both.
BASE_V1="${BASE_URL%/}/v1"
log "Tunnel base URL: ${BASE_V1}"

if [[ ! -f "${CURSOR_DB}" ]]; then
  die "Cursor database not found at ${CURSOR_DB} — open Cursor once, then re-run."
fi

BACKUP="${CURSOR_DB}.bak.$(date +%Y%m%d%H%M%S)"
cp "${CURSOR_DB}" "${BACKUP}"
log "Backed up Cursor DB to ${BACKUP}"

export CURSOR_DB APP_USER_KEY CURSOR_MODEL API_KEY BASE_V1
python3 <<'PY'
import json
import os
import sqlite3

db = os.environ["CURSOR_DB"]
app_key = os.environ["APP_USER_KEY"]
model = os.environ["CURSOR_MODEL"]
api_key = os.environ["API_KEY"]
base_v1 = os.environ["BASE_V1"]

conn = sqlite3.connect(db)
cur = conn.cursor()

row = cur.execute("SELECT value FROM ItemTable WHERE key = ?", (app_key,)).fetchone()
if not row:
    raise SystemExit(f"Missing {app_key} in Cursor DB")

blob = json.loads(row[0])
blob["openAIBaseUrl"] = base_v1
blob["useOpenAIKey"] = True

ai = blob.setdefault("aiSettings", {})
strip = {
    "qwen25coder7b",
    "qwen25coder7b:latest",
    "qwen2.5-coder:7b",
    "gpt-4o-mini",
    "gpt-4o-mini:latest",
    "gpt-5-mini",
}
for field in ("userAddedModels", "modelOverrideEnabled"):
    ai[field] = [m for m in ai.get(field, []) if m not in strip]
enabled = list(ai.get("modelOverrideEnabled") or [])
if model not in enabled:
    enabled.append(model)
ai["modelOverrideEnabled"] = enabled
disabled = list(ai.get("modelOverrideDisabled") or [])
for bad in strip:
    if bad not in disabled:
        disabled.append(bad)
ai["modelOverrideDisabled"] = [m for m in disabled if m != model]
ai["composerModel"] = model
ai["cmdKModel"] = model
ai["backgroundComposerModel"] = model

config = dict(ai.get("modelConfig") or {})
sel = [{"modelId": model, "parameters": []}]
for mode, prev in list(config.items()):
    config[mode] = {**prev, "modelName": model, "selectedModels": sel}
if not config:
    config["composer"] = {"modelName": model, "selectedModels": sel}
ai["modelConfig"] = config

compact = json.dumps(blob, separators=(",", ":"))
cur.execute("UPDATE ItemTable SET value = ? WHERE key = ?", (compact, app_key))

openai_key = "cursorAuth/openAIKey"
cur.execute(
    "INSERT INTO ItemTable(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    (openai_key, api_key),
)

cur.execute(
    "INSERT INTO ItemTable(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    ("cursor/lastSingleModelPreference", json.dumps({"composer": model}, separators=(",", ":"))),
)
cur.execute(
    "INSERT INTO ItemTable(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    (
        "cursor/applicationOpenModelAppliedConfig",
        json.dumps({"selectedModels": [{"modelId": model, "parameters": []}]}, separators=(",", ":")),
    ),
)

conn.commit()
conn.close()
print("Updated Cursor: useOpenAIKey, openAIBaseUrl, model", model)
PY

if tunnel_works "${BASE_V1}"; then
  curl -sf --max-time 120 "${BASE_V1}/chat/completions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${API_KEY}" \
    -d "{\"model\":\"${CURSOR_MODEL}\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply pong only.\"}],\"max_tokens\":8}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print('Ollama via tunnel:', d['choices'][0]['message']['content'][:80])"
else
  log "Note: could not verify tunnel from this shell (Cloudflare may still work from Cursor's servers)."
  log "Keep cloudflared running; URL saved to ${TUNNEL_URL_FILE}"
fi

log ""
log "Done. Quit Cursor completely (Cmd+Q), reopen, then check the model picker."
log "Settings → Models should list GPT-5 Mini as enabled; pick it in chat."
log "In chat, pick built-in model: GPT-5.6 Sol (routes to local Qwen)."
log "To restore cloud models: Settings → Models → turn OFF Override OpenAI Base URL."
