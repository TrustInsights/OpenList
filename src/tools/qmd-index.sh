#!/bin/sh
# Rebuild the OpenList-only qmd index in temp/qmd-home. Run from any folder: sh src/tools/qmd-index.sh
# Why: the shared default index holds thousands of pending documents of other projects, and
# "qmd embed" cannot finish there. This index holds only the OpenList collections.
# Query it with: HOME=$PWD/temp/qmd-home QMD_CONFIG_DIR=$PWD/temp/qmd-home/config qmd query "<concept>"
set -eu

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
QHOME="$ROOT/temp/qmd-home"
CACHE="$QHOME/Library/Caches/qmd"
SHARED_MODELS="${SHARED_QMD_MODELS:-$HOME/Library/Caches/qmd/models}"

mkdir -p "$QHOME/config" "$CACHE"

# Reuse the model files of the default install. A link avoids a second download.
if [ ! -e "$CACHE/models" ]; then
  if [ ! -d "$SHARED_MODELS" ]; then
    echo "ERROR: qmd model folder not found: $SHARED_MODELS" >&2
    exit 1
  fi
  ln -s "$SHARED_MODELS" "$CACHE/models"
fi

cat > "$QHOME/config/index.yml" <<EOF
collections:
  OpenList-docs:
    path: $ROOT/docs
    pattern: '**/*.md'
  OpenList-docs-yaml:
    path: $ROOT/docs
    pattern: '**/*.yaml'
  OpenList-output:
    path: $ROOT/output
    pattern: '**/*.md'
EOF

export HOME="$QHOME"
export QMD_CONFIG_DIR="$QHOME/config"

qmd update
qmd embed
qmd status
