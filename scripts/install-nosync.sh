#!/usr/bin/env bash
#
# This project lives under ~/Documents, which iCloud Drive syncs. iCloud races
# pnpm's atomic renames during install, producing "<pkg> 2" collision dirs
# inside node_modules/.pnpm and corrupt installs.
#
# Fix: install in a temp dir OUTSIDE iCloud, then move the finished
# node_modules into place as a single atomic rename. node_modules stays a
# normal directory (no symlink to get clobbered by iCloud mid-session); the
# only thing excluded from sync is the Vite cache (see .vite.nosync in
# wxt.config.ts), which is what actually churns during dev.
#
# Usage:
#   pnpm run reinstall            # clean install from pnpm-lock.yaml
#   pnpm run reinstall <pkg>...   # add/update packages (forwarded to pnpm install)
#
set -euo pipefail
cd "$(dirname "$0")/.."

TMP="$(mktemp -d "${TMPDIR:-/tmp}/unhook-linkedin-install.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

cp package.json "$TMP"/
[ -f pnpm-lock.yaml ] && cp pnpm-lock.yaml "$TMP"/
[ -f pnpm-workspace.yaml ] && cp pnpm-workspace.yaml "$TMP"/
[ -f .npmrc ] && cp .npmrc "$TMP"/

echo "[install-nosync] installing in $TMP (outside iCloud)..."
# --ignore-scripts: postinstall (wxt prepare) needs the real entrypoints/
# directory, which isn't copied into the temp dir. Run scripts for real below,
# once node_modules is back in the project.
( cd "$TMP" && pnpm install --ignore-scripts "$@" )

# Bring back any lockfile/manifest changes pnpm made (e.g. when adding packages).
cp "$TMP/package.json" ./package.json
[ -f "$TMP/pnpm-lock.yaml" ] && cp "$TMP/pnpm-lock.yaml" ./pnpm-lock.yaml

echo "[install-nosync] moving finished node_modules into place..."
rm -rf node_modules
mv "$TMP/node_modules" node_modules

echo "[install-nosync] running deferred install scripts (native builds, wxt prepare)..."
pnpm rebuild
pnpm exec wxt prepare

echo "[install-nosync] done. node_modules has $(ls node_modules | wc -l | tr -d ' ') top-level entries"
