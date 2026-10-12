#!/usr/bin/env bash
# One-shot: apply local Qwen to Cursor. MUST run from Terminal.app with Cursor quit (Cmd+Q).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "${ROOT}/scripts/setup-cursor-local-qwen.sh"
