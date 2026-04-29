#!/usr/bin/env bash
# scripts/cleanup-root.sh
#
# Run once to reorganize root-level clutter into docs/.
# Safe to run multiple times (checks before moving).
# After running: git add -A && git commit -m "chore: move root docs to docs/ and remove temp files"
#
# IMPORTANT: Also run the CRLF re-normalization below to clear the 300+ fake diffs.

set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== GreenChainz root cleanup ==="

# ─────────────────────────────────────────────────────
# 1. Remove debug/temp files from root (tracked by git)
# ─────────────────────────────────────────────────────
for f in auth-current.json auth-fixed.json tscheck-client-temp.json tscheck-server-temp.json .gitkeep; do
  if git ls-files --error-unmatch "$f" 2>/dev/null; then
    git rm -f "$f" && echo "  ✓ removed $f"
  fi
done

# ─────────────────────────────────────────────────────
# 2. Move one-off scripts from root to scripts/
# ─────────────────────────────────────────────────────
for f in check-epd.js check-images.js create-spec-tables.js; do
  if git ls-files --error-unmatch "$f" 2>/dev/null; then
    git mv "$f" "scripts/$f" && echo "  ✓ moved $f → scripts/$f"
  fi
done

# ─────────────────────────────────────────────────────
# 3. Move root-level docs to docs/
# ─────────────────────────────────────────────────────
move_to_docs() {
  local src="$1"
  local dest="${2:-docs/$1}"
  if git ls-files --error-unmatch "$src" 2>/dev/null; then
    # If a stale copy exists in docs/, remove it first
    if git ls-files --error-unmatch "$dest" 2>/dev/null; then
      git rm "$dest" && echo "  ✓ removed stale docs/$dest"
    fi
    git mv "$src" "$dest" && echo "  ✓ moved $src → $dest"
  fi
}

move_to_docs "AGENT_ARCHITECTURE.md"
move_to_docs "ARCHITECT_UPLOAD_READY.md"
move_to_docs "ARCHITECT_UPLOAD_UI_NOTES.md"
move_to_docs "AUTH_GUARDRAILS.md"         # newer version; stale docs/AUTH_GUARDRAILS.md auto-removed
move_to_docs "CCPS_DATABASE_SCHEMA.md"
move_to_docs "CSI_FORM_13_1A_STRUCTURE.md"
move_to_docs "GITHUB_ACTIONS_SETUP.md"
move_to_docs "MANAGED_IDENTITY_README.md"
move_to_docs "MATCH_SCORE_ALGORITHM.md"
move_to_docs "MICROSOFT_MARKETPLACE_SETUP.md"
move_to_docs "MIGRATION_0030_0031_NOTES.md" "docs/archive/MIGRATION_0030_0031_NOTES.md"
move_to_docs "MVP_IMPLEMENTATION_PLAN.md"
move_to_docs "PROMPTS_FOR_OTHER_AIS.md"
move_to_docs "SWAP_DASHBOARD_DEPLOYMENT.md"
move_to_docs "SWAP_ENGINE_ROADMAP.md"
move_to_docs "BRAND_VOICE.md"              "docs/brand/BRAND_VOICE.md"
move_to_docs "AuthMethod-Route-HowItWorks.csv" "docs/AuthMethod-Route-HowItWorks.csv"

# ─────────────────────────────────────────────────────
# 4. Fix CRLF line endings (clears the 300+ fake diffs)
#    This renormalizes all tracked files using .gitattributes
# ─────────────────────────────────────────────────────
echo ""
echo "=== Re-normalizing line endings (clears CRLF noise) ==="
git add --renormalize . && echo "  ✓ re-normalized all line endings"

echo ""
echo "=== Done! Review with: git status ==="
echo "    Then commit: git commit -m 'chore: cleanup root, normalize line endings'"
