#!/bin/bash
# GreenChainz — Incremental repo backup to F: drive
# Copies only changed files (no rewrites). Run anytime.

SOURCE_BASE="/d/perplexitydownloads"
DEST_BASE="/f/greenchainz-backup"

REPOS=(
  "green-sourcing-b2b-app"
  "greenchainz-audit-api"
  "greenchainz-sda-connector"
  "greenchainz-mobile"
  "greenchainz-revit-plugin"
)

echo "================================================"
echo "  GreenChainz Repo Backup → F: Drive"
echo "  Started: $(date)"
echo "================================================"

# Make sure F: is mounted
if [ ! -d "/f" ]; then
  echo "❌ F: drive not found at /f — plug it in and retry"
  exit 1
fi

mkdir -p "$DEST_BASE"

for REPO in "${REPOS[@]}"; do
  SRC="$SOURCE_BASE/$REPO"
  DST="$DEST_BASE/$REPO"

  if [ ! -d "$SRC" ]; then
    echo "⚠️  Skipping $REPO — not found at $SRC"
    continue
  fi

  echo ""
  echo "📁 Syncing $REPO..."
  rsync -av --progress \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.next' \
    --exclude='*.log' \
    "$SRC/" "$DST/"

  echo "✅ $REPO done"
done

echo ""
echo "================================================"
echo "  Backup complete: $(date)"
echo "  Location: $DEST_BASE"
echo "================================================"
