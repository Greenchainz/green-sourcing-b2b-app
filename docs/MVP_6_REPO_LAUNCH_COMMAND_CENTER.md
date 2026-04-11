# GreenChainz MVP Launch Command Center (6 Repos)

**Last Updated:** 2026-04-11
**Scope:** `green-sourcing-b2b-app`, `greenchainz-sda-connector`, `greenchainz-intelligence`, `greenchainz-revit-plugin`, `greenchainz-mobile`, `greenchainz-audit-api`

## 1) Current Status Snapshot

| Repo | Status | Signal | Remaining to Launch |
|---|---|---|---|
| `green-sourcing-b2b-app` | 🟡 | Active commits; open website-audit issues; deploy workflow was failing due to broken lockfile (now fixed in branch) | Merge lockfile fix to `main`; confirm deploy run passes end-to-end |
| `greenchainz-sda-connector` | 🟡 | Active recently; limited visibility here | Confirm CI green, tag MVP release, verify connector handshake with core app |
| `greenchainz-intelligence` | 🟡 | Active recently; limited visibility here | Confirm CI green, tag MVP release, verify scoring/recommendation API contracts |
| `greenchainz-revit-plugin` | 🟡 | Active recently; limited visibility here | Confirm CI green, installer smoke test, auth + API compatibility with core app |
| `greenchainz-mobile` | 🟠 | Less recent activity; limited visibility here | Confirm feature freeze, CI green, login + key flows smoke tested |
| `greenchainz-audit-api` | 🟠 | Less recent activity; limited visibility here | Confirm CI green, endpoint contract lock, production env/secrets audit |

> **Note:** Internal repo PR/workflow/log-level blockers must be confirmed by maintainers with internal access.

## 2) Hard MVP Release Gates (Must Pass For Every Repo)

- [ ] Default branch CI green on latest commit
- [ ] No P0/P1 launch-blocking bugs open
- [ ] Production secrets/config validated in target environment
- [ ] Version/tag cut for MVP candidate
- [ ] Smoke tests pass for launch-critical paths
- [ ] Owner assigned for launch day + rollback

## 3) Cross-Repo Integration Gates

- [ ] Auth compatibility verified across clients/plugins/services
- [ ] API contract compatibility verified against `green-sourcing-b2b-app`
- [ ] SDA connector integration checks pass
- [ ] Intelligence scoring/recommendation calls pass with production-like payloads
- [ ] Revit plugin end-to-end create/read action against production API passes
- [ ] Mobile login + key workflow calls pass against production API

## 4) Cutover Plan

### Pre-Cutover (T-48h to T-1h)
- [ ] Freeze scope to launch-critical changes only
- [ ] Run final CI + smoke tests in all 6 repos
- [ ] Confirm infra readiness (Azure Container Apps, DB, secrets, monitoring)
- [ ] Prepare rollback commands/steps for each repo/service

### Cutover (T0)
- [ ] Deploy in dependency order (core backend before downstream clients)
- [ ] Validate health endpoints + auth + one critical user journey per surface
- [ ] Announce launch status in command channel

### Post-Cutover (T+1h to T+24h)
- [ ] Monitor errors, latency, and failed auth/API requests
- [ ] Triage hotfixes by severity with single incident owner
- [ ] Publish launch report and unresolved follow-up list

## 5) Command Board (Owner + Due Date)

| Workstream | Repo(s) | Owner | Due | Status | Blocker |
|---|---|---|---|---|---|
| Deploy reliability | `green-sourcing-b2b-app` | TBD | TBD | In progress | Await merge + successful deploy run |
| CI/release gate verification | all 6 | TBD | TBD | Not started | Internal visibility needed |
| Integration validation | all 6 | TBD | TBD | Not started | Cross-team scheduling |
| Cutover + rollback runbook | all 6 | TBD | TBD | Not started | Owner assignment pending |
| Launch-day command | all 6 | TBD | TBD | Not started | Communication plan pending |

## 6) Immediate Next Actions

1. Merge lockfile repair PR and re-run `Deploy to Azure Container Apps` on `main`.
2. Assign owners and due dates in the command board table.
3. Run gate checklist repo-by-repo and mark pass/fail with links to evidence.
4. Block launch until every release gate is checked.
