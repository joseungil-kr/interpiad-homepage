#!/usr/bin/env bash
# Run as a dedicated NON-ROOT user after provisioning a Linux VM and installing git + Node >= 20.
set -euo pipefail

UPSTREAM_REPO="https://github.com/basriayaz/pixel-office.git"
UPSTREAM_SHA="4ebfdc7e4538eb68ea987f57ccf2810bc488a39c"
BASE_DIR="${AI_OFFICE_BASE:-$HOME/interpiad-ai-office}"
UPSTREAM_DIR="$BASE_DIR/pixel-office"
WORKSPACE_DIR="$BASE_DIR/workspace"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if [ "$(id -u)" -eq 0 ]; then echo "ERROR: do not run as root" >&2; exit 1; fi
command -v git >/dev/null || { echo "ERROR: git required" >&2; exit 1; }
command -v npm >/dev/null || { echo "ERROR: npm required" >&2; exit 1; }
command -v node >/dev/null || { echo "ERROR: Node.js 20+ required" >&2; exit 1; }
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 20 ]; then echo "ERROR: Node.js 20+ required" >&2; exit 1; fi

mkdir -p "$BASE_DIR" "$WORKSPACE_DIR"
chmod 700 "$BASE_DIR" "$WORKSPACE_DIR"
if [ ! -d "$UPSTREAM_DIR/.git" ]; then
  if [ -e "$UPSTREAM_DIR" ]; then echo "ERROR: existing non-git upstream directory" >&2; exit 1; fi
  git clone --no-checkout "$UPSTREAM_REPO" "$UPSTREAM_DIR"
fi
CURRENT_REMOTE="$(git -C "$UPSTREAM_DIR" remote get-url origin)"
if [ "$CURRENT_REMOTE" != "$UPSTREAM_REPO" ]; then
  echo "ERROR: unexpected upstream remote. Aborting." >&2; exit 1
fi
git -C "$UPSTREAM_DIR" fetch --depth=1 origin "$UPSTREAM_SHA"
git -C "$UPSTREAM_DIR" checkout --detach "$UPSTREAM_SHA"
if [ "$(git -C "$UPSTREAM_DIR" rev-parse HEAD)" != "$UPSTREAM_SHA" ]; then echo "ERROR: SHA mismatch" >&2; exit 1; fi
(
  cd "$UPSTREAM_DIR"
  npm ci
  npm run typecheck
)
node "$SCRIPT_DIR/seed-team.mjs" "$WORKSPACE_DIR"

echo "Prepared pinned Pixel Office in $UPSTREAM_DIR"
echo "Office workspace: $WORKSPACE_DIR"
echo "NEXT: sign in via Codex CLI using this user, then start:"
echo "  cd '$UPSTREAM_DIR' && node bin/pixel-office.js start --global --no-open"
echo "SECURITY: binds loopback only. DO NOT expose port 4747 to the internet."
