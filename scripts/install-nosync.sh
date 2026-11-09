#!/usr/bin/env bash
# Install outside iCloud, retaining the previous generation until preparation
# succeeds. SIGINT/SIGTERM and errors roll back; after SIGKILL use --recover.
# Usage: pnpm reinstall [pnpm install arguments] | pnpm reinstall --recover
set -euo pipefail
cd "$(dirname "$0")/.."

BACKUP='.reinstall-backup'
OWNER='unhook-linkedin-reinstall-v1'
INSTALL_TMP=''

fail() { echo "[install-nosync] $*" >&2; exit 1; }

# Writes are confined to these generated directories and manifests. Refuse
# symlinks at promotion and recovery; no paths are read from the journal.
check_paths() {
  local path
  for path in package.json pnpm-lock.yaml node_modules .wxt "$BACKUP"; do
    [[ ! -L "$path" ]] || fail "refusing symlink: $path"
  done
}

restore() {
  local path
  [[ -f "$BACKUP/ready" ]] || return 0 # Checkout has not been changed.
  for path in node_modules .wxt; do
    if [[ -d "$BACKUP/$path" ]]; then
      rm -rf "$path" || return 1
      mv "$BACKUP/$path" "$path" || return 1
    elif [[ ! -f "$BACKUP/had-$path" ]]; then
      rm -rf "$path" || return 1
    fi
  done
  for path in package.json pnpm-lock.yaml; do
    if [[ -f "$BACKUP/$path" ]]; then
      # Keep snapshots until ALL restoration finishes so recovery can itself
      # be interrupted. Replace manifests atomically on this filesystem.
      cp "$BACKUP/$path" "$BACKUP/restore-$path" || return 1
      mv "$BACKUP/restore-$path" "$path" || return 1
    elif [[ ! -f "$BACKUP/had-$path" ]]; then
      rm -f "$path" || return 1
    fi
  done
}

check_paths
if [[ "${1:-}" == '--recover' ]]; then
  [[ $# == 1 ]] || fail '--recover takes no additional arguments'
  [[ -d "$BACKUP" && ! -L "$BACKUP/owner" && -f "$BACKUP/owner" ]] || fail 'no recognized recovery data'
  [[ "$(cat "$BACKUP/owner")" == "$OWNER" ]] || fail 'unrecognized recovery data; left untouched'
  [[ ! -L "$BACKUP/pid" && -f "$BACKUP/pid" ]] || fail 'invalid recovery owner'
  INSTALL_PID="$(cat "$BACKUP/pid")"
  [[ "$INSTALL_PID" =~ ^[0-9]+$ ]] || fail 'invalid recovery owner'
  if kill -0 "$INSTALL_PID" 2>/dev/null; then
    fail "reinstall process $INSTALL_PID is still active"
  fi
  for path in node_modules .wxt package.json pnpm-lock.yaml ready committed; do
    [[ ! -L "$BACKUP/$path" ]] || fail "refusing recovery symlink: $path"
  done
  if [[ ! -f "$BACKUP/committed" ]]; then
    restore || fail 'recovery failed; backup retained'
  fi
  rm -rf "$BACKUP"
  echo '[install-nosync] recovery complete; run pnpm reinstall to try again'
  exit 0
fi

mkdir "$BACKUP" 2>/dev/null || fail 'reinstall active or interrupted; use pnpm reinstall --recover if interrupted'
printf '%s\n' "$OWNER" > "$BACKUP/owner"
printf '%s\n' "$$" > "$BACKUP/pid"

finish() {
  local status=$?
  trap - EXIT INT TERM
  if [[ ! -f "$BACKUP/committed" ]]; then
    if ! restore; then
      echo '[install-nosync] rollback failed; backup retained for --recover' >&2
      status=1
    else
      rm -rf "$BACKUP"
    fi
  else
    rm -rf "$BACKUP"
  fi
  [[ -z "$INSTALL_TMP" ]] || rm -rf "$INSTALL_TMP"
  exit "$status"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

INSTALL_TMP="$(mktemp -d "${TMPDIR:-/tmp}/unhook-linkedin-install.XXXXXX")"
for path in package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc; do
  if [[ -f "$path" ]]; then cp "$path" "$INSTALL_TMP/"; fi
done
echo "[install-nosync] installing in $INSTALL_TMP (outside iCloud)..."
# WXT needs the real entrypoints, so defer scripts until after promotion.
( cd "$INSTALL_TMP" && pnpm install --ignore-scripts "$@" )

# Record existence before any mutation. Snapshot manifests, then move generated
# directories by atomic rename within the checkout.
for path in package.json pnpm-lock.yaml node_modules .wxt; do
  if [[ -e "$path" ]]; then
    touch "$BACKUP/had-$path"
    if [[ -f "$path" ]]; then cp "$path" "$BACKUP/$path"; fi
  fi
done
touch "$BACKUP/ready"
for path in node_modules .wxt; do
  if [[ -d "$path" ]]; then mv "$path" "$BACKUP/$path"; fi
done
mv "$INSTALL_TMP/node_modules" node_modules
for path in package.json pnpm-lock.yaml; do
  if [[ -f "$INSTALL_TMP/$path" ]]; then
    cp "$INSTALL_TMP/$path" "$BACKUP/new-$path"
    mv "$BACKUP/new-$path" "$path"
  fi
done

echo '[install-nosync] preparing the candidate; previous generation retained...'
pnpm rebuild
pnpm exec wxt prepare
touch "$BACKUP/committed"
echo '[install-nosync] done'
