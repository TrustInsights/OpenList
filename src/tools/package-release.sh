#!/bin/sh
# Package the built extension (dist/) into a Chrome Web Store zip in output/artifacts/.
# Usage: sh src/tools/package-release.sh   (run "pnpm build" first; "pnpm package" does both)
# Env: DIST_DIR (default dist), OUT_DIR (default output/artifacts), PACKAGE_JSON (default package.json)
set -eu

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
DIST_DIR=${DIST_DIR:-$ROOT/dist}
OUT_DIR=${OUT_DIR:-$ROOT/output/artifacts}
PACKAGE_JSON=${PACKAGE_JSON:-$ROOT/package.json}

fail() {
  echo "error: $1" >&2
  exit 1
}

[ -f "$DIST_DIR/manifest.json" ] || fail "$DIST_DIR/manifest.json not found. Run pnpm build first."

VERSION=$(jq -r '.version' "$DIST_DIR/manifest.json")
[ "$VERSION" != "null" ] && [ -n "$VERSION" ] || fail "the manifest has no version."

if [ -f "$PACKAGE_JSON" ]; then
  PKG_VERSION=$(jq -r '.version' "$PACKAGE_JSON")
  [ "$PKG_VERSION" = "$VERSION" ] || fail "manifest version $VERSION differs from package.json version $PKG_VERSION."
fi

WORKER=$(jq -r '.background.service_worker' "$DIST_DIR/manifest.json")
[ -f "$DIST_DIR/$WORKER" ] || fail "the service worker file $WORKER is missing from $DIST_DIR."

mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/openlist-$VERSION.zip"
rm -f "$OUT"
(cd "$DIST_DIR" && zip -X -q -r "$OUT" . -x '*.DS_Store' -x '*.map')

unzip -p "$OUT" manifest.json | jq -e '.manifest_version == 3' >/dev/null || fail "manifest.json is not at the root of the zip."
unzip -Z1 "$OUT" | grep -q "^$WORKER\$" || fail "the service worker is not in the zip."

BYTES=$(wc -c <"$OUT" | tr -d ' ')
echo "package: $OUT"
echo "version: $VERSION"
echo "bytes:   $BYTES"
echo "sha256:  $(shasum -a 256 "$OUT" | cut -d' ' -f1)"
