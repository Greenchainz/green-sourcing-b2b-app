# GreenChainz Full Repo Cleanup Script
**Generated: 2026-06-02 | Run this ONCE per repo locally after pulling latest.**

> The `.gitignore` files have already been updated in all repos.  
> `.gitignore` only prevents *new* files from being tracked.  
> Files already committed must be explicitly untracked with `git rm --cached`.

---

## ⚠️ STEP 0 — CRITICAL FIRST: Rotate credentials in greenchainz-coder

A `.env` file was committed to `greenchainz-coder`. Rotate ALL secrets immediately, then purge:

```bash
cd greenchainz-coder
pip install git-filter-repo
git filter-repo --path .env --invert-paths --force
git push origin --force --all
git push origin --force --tags
```

---

## REPO 1: green-sourcing-b2b-app

```bash
cd green-sourcing-b2b-app

git rm --cached "h origin main" 2>/dev/null || true
git rm --cached "about_mod.txt" 2>/dev/null || true
git rm --cached "build-output.txt" 2>/dev/null || true
git rm --cached "__azurite_db_blob__.json" 2>/dev/null || true
git rm --cached "__azurite_db_blob_extent__.json" 2>/dev/null || true
git rm --cached "Claude-by-Anthropic-for-Excel.xlsx" 2>/dev/null || true
git rm --cached "GreenChainz_Launch_Checklist.xlsx" 2>/dev/null || true
git rm --cached "microcert^.xlsx" 2>/dev/null || true
git rm --cached "greenchainz-target-firms (2).csv" 2>/dev/null || true
git rm --cached ".replit" 2>/dev/null || true
git rm --cached "sync-repos-to-f-drive.sh" 2>/dev/null || true
git rm --cached -r "cache/" 2>/dev/null || true
git rm --cached -r "out/" 2>/dev/null || true

# Verify nothing sensitive is still tracked
echo "=== Remaining tracked files to review ==="
git ls-files | grep -E "\.(xlsx|xls|csv|pdf|env)$" || echo "None ✅"
git ls-files | grep -E "(__azurite|build-output|about_mod)" || echo "None ✅"

git commit -m "chore: untrack junk files, emulator state, data files, build artifacts"
git push
```

---

## REPO 2: greenchainz-intelligence

```bash
cd greenchainz-intelligence

git rm --cached "supplier_research_results.csv" 2>/dev/null || true
git rm --cached "architect_firm_targets.csv" 2>/dev/null || true
git rm --cached "supplier_targets.json" 2>/dev/null || true
git rm --cached "USG_Durock_13_1_Substitution_Request.pdf" 2>/dev/null || true
git rm --cached "FETCH_HEAD" 2>/dev/null || true
git rm --cached -r "debug/" 2>/dev/null || true

echo "=== Remaining tracked files to review ==="
git ls-files | grep -E "\.(csv|pdf)$" || echo "None ✅"
git ls-files | grep "^FETCH_HEAD$" || echo "None ✅"

git commit -m "chore: untrack raw data outputs, PDFs, and git internals"
git push
```

---

## REPO 3: greenchainz-revit-plugin

```bash
cd greenchainz-revit-plugin

git rm --cached -r ".vs/" 2>/dev/null || true
git rm --cached -r ".Jules/" 2>/dev/null || true
git rm --cached -r ".jules/" 2>/dev/null || true

echo "=== Remaining tracked IDE/tool dirs ==="
git ls-files | grep -E "^\.vs/|^\.Jules/|^\.jules/" || echo "None ✅"

git commit -m "chore: untrack .vs IDE folder and AI tool directories"
git push
```

---

## REPO 4: greenchainz-coder

```bash
# Run AFTER Step 0 above (after purging .env from history)
cd greenchainz-coder

git rm --cached -r "memory/" 2>/dev/null || true
git rm --cached -r "workflow_outputs/" 2>/dev/null || true
git rm --cached -r "artifacts/" 2>/dev/null || true
git rm --cached -r "attached_assets/" 2>/dev/null || true
git rm --cached -r ".agents/" 2>/dev/null || true

echo "=== Secret file check ==="
git ls-files | grep "^\.env$" || echo ".env not tracked ✅"

git commit -m "chore: untrack agent runtime state, memory, and output directories"
git push
```

---

## Final Verification (run across all repos)

```bash
for repo in green-sourcing-b2b-app greenchainz-intelligence greenchainz-revit-plugin greenchainz-coder greenchainz-audit-api greenchainz-sda-connector greenchainz-mobile greenchainz-forma-extension; do
  echo ""
  echo "=== $repo ==="
  cd "$repo" 2>/dev/null || { echo "  (not found — skip)"; continue; }

  echo -n "  Secrets (.env/.key/.pem):  "
  git ls-files | grep -E "^\.env$|\.(secret|key|pem)$" || echo "none ✅"

  echo -n "  Data files (.xlsx/.csv/.pdf): "
  git ls-files | grep -E "\.(xlsx|xls|csv|pdf)$" || echo "none ✅"

  echo -n "  Emulator state:            "
  git ls-files | grep "__azurite" || echo "none ✅"

  echo -n "  IDE folders (.vs/.idea):   "
  git ls-files | grep -E "^\.vs/|^\.idea/" || echo "none ✅"

  echo -n "  AI tool dirs:              "
  git ls-files | grep -E "^\.Jules/|^\.jules/|^\.cursor/" || echo "none ✅"

  cd ..
done
echo ""
echo "Done. Review any findings above before deploying."
```

---

## What Was Done (already applied)

| Repo | .gitignore Updated | GitHub Issue |
|---|---|---|
| green-sourcing-b2b-app | ✅ commit 34d5a07 | #896 |
| greenchainz-intelligence | ✅ commit ad8c553 | #16 |
| greenchainz-revit-plugin | ✅ commit 2561d22 | #116 |
| greenchainz-coder | ✅ commit 3445f76 | **#13 CRITICAL** |
| greenchainz-audit-api | — | #15 (arch decision) |
| greenchainz-sda-connector | — | #12 (restructure) |
