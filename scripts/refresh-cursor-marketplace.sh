#!/usr/bin/env bash
# Force Cursor/Grok to re-pin the loxtep user marketplace to current origin/main.
#
# Why this exists: `agent plugin marketplace update loxtep` claims success but
# leaves the backend gitRef on the first SHA that was ever indexed (e.g.
# 319cd0a / plugin.json 1.0.1). Remove + add is the only reliable refresh.
#
# Usage (on a machine with `agent` logged into Cursor):
#   ./scripts/refresh-cursor-marketplace.sh
#   EXPECTED_VERSION=1.1.11 ./scripts/refresh-cursor-marketplace.sh
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/LoxtepInc/loxtep-plugins-skills}"
MARKETPLACE_NAME="${MARKETPLACE_NAME:-loxtep}"
EXPECTED_VERSION="${EXPECTED_VERSION:-}"

if ! command -v agent >/dev/null 2>&1; then
  echo "error: 'agent' (cursor-agent) not on PATH" >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "error: node not on PATH" >&2
  exit 1
fi

echo "Removing marketplace ${MARKETPLACE_NAME}..."
agent plugin marketplace remove "${MARKETPLACE_NAME}" || true

echo "Clearing local cache mirrors..."
rm -rf "${HOME}/.cursor/plugins/cache/${MARKETPLACE_NAME}"
rm -rf "${HOME}/.cursor/plugins/marketplaces/github.com/loxtepinc/loxtep-plugins-skills"
rm -rf "${HOME}/.cursor/plugins/marketplaces/github.com/LoxtepInc/loxtep-plugins-skills"

echo "Re-adding ${REPO_URL}..."
agent plugin marketplace add "${REPO_URL}"

MIRROR_SHA_DIR="$(
  find "${HOME}/.cursor/plugins/marketplaces/github.com" \
    -maxdepth 3 -type d -regex '.*/loxtep-plugins-skills/[0-9a-f]\{40\}$' \
    2>/dev/null | head -1 || true
)"
if [[ -z "${MIRROR_SHA_DIR}" ]]; then
  echo "error: could not locate sha-pinned marketplace checkout" >&2
  find "${HOME}/.cursor/plugins/marketplaces" -maxdepth 5 -type d -name 'loxtep*' -print 2>/dev/null || true
  exit 1
fi
SHA="$(basename "${MIRROR_SHA_DIR}")"

PLUGIN_JSON="$(
  find "${MIRROR_SHA_DIR}" \
    \( -path '*/.cursor-plugin/plugin.json' -o -path '*/.claude-plugin/plugin.json' \) \
    | head -1 || true
)"
if [[ -z "${PLUGIN_JSON}" ]]; then
  echo "error: plugin.json missing under ${MIRROR_SHA_DIR}" >&2
  exit 1
fi
VERSION="$(node -p "require('${PLUGIN_JSON}').version")"

echo "Catalog now points at:"
echo "  sha:      ${SHA}"
echo "  version:  ${VERSION}"
echo "  manifest: ${PLUGIN_JSON}"

if [[ -n "${EXPECTED_VERSION}" && "${VERSION}" != "${EXPECTED_VERSION}" ]]; then
  echo "error: expected plugin.json version ${EXPECTED_VERSION}, got ${VERSION}" >&2
  exit 1
fi

SKILL="$(find "${MIRROR_SHA_DIR}" -path '*/skills/data-workflows/SKILL.md' | head -1 || true)"
if [[ -n "${SKILL}" ]]; then
  if ! grep -q 'query_trigger' "${SKILL}"; then
    echo "error: data-workflows skill at pin lacks query_trigger" >&2
    exit 1
  fi
  echo "  skill:    data-workflows documents query_trigger"
fi

echo "OK"
