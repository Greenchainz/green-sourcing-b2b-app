# Autodesk Design & Make Marketplace – Submission Checklist

## Status Key
- [ ] Not started
- [x] Complete

---

## Phase 1: Pre-Submission (Do These First)

### Email & Partner Program
- [ ] Send email to Becky (see `EMAIL-DRAFT.md`)
- [ ] Apply to AECO Technology Partner Program
- [ ] Confirm Becky + Tiffany received submission preview

### Technical Readiness
- [ ] Main app deployed with SDA endpoints live (`green-sourcing-b2b-app`)
- [ ] Forma extension built and deployable (Forma extension repo)
- [ ] Revit plugin packaged as `.bundle` or installer (Revit plugin repo)
- [ ] Demo environment live at `https://greenchainz.com`
- [ ] Demo environment live at `https://greenchainz.com`
- [ ] Demo credentials working (`demo@greenchainz.com` / `GreenchainzDemo123!`)
- [ ] All SDA API endpoints returning valid responses
- [ ] End-to-end flow tested: Revit/Forma → main app API → material data

### Assets Required
- [ ] App icon (512x512 PNG, transparent background)
- [ ] Screenshots – Revit plugin panel (min 3)
- [ ] Screenshots – Forma extension (min 3)
- [ ] Screenshots – Sustainability data view
- [ ] Screenshots – RFQ workflow
- [ ] Walkthrough video (2-5 min recommended)
- [ ] PDF or hosted documentation (install guide + user guide)

---

## Phase 2: Marketplace Submission

### Listing Content (see `LISTING-CONTENT.md`)
- [ ] App name finalized
- [ ] Short description (< 150 chars)
- [ ] Full description
- [ ] Supported products + versions listed
- [ ] Key features (6 bullets)
- [ ] Categories / tags selected
- [ ] Pricing model selected (Free / Freemium / Paid)

### Security & Trust (Form #2)
- [ ] Confirm: no Autodesk credential storage
- [ ] Confirm: HTTPS everywhere
- [ ] Confirm: role-based access control documented
- [ ] Confirm: data handling policy available
- [ ] Privacy policy URL
- [ ] Terms of service URL

### Demo Access (They Will Test This)
- [ ] Demo URL accessible from external network
- [ ] Demo account functional
- [ ] Step-by-step demo script included
- [ ] Edge cases handled gracefully (no crashes on bad data)

---

## Phase 3: Post-Submission

- [ ] Share preview link with Becky
- [ ] Share preview link with Tiffany
- [ ] Monitor for review feedback (respond within 24h)
- [ ] Address any requested changes
- [ ] Prepare social/launch post (see `LAUNCH-POST.md`)
- [ ] Coordinate launch timing with Autodesk contacts

---

## Blockers / Open Questions

| Item | Status | Notes |
|------|--------|-------|
| Demo URL readiness | ❓ | Confirm `greenchainz.com` is live |
| Demo URL readiness | ❓ | Confirm `greenchainz.com` is live |
| SDA endpoints in main app | ❓ | Confirm SDA routes are deployed in `green-sourcing-b2b-app` |
| Revit plugin build | ❓ | Is the `.bundle` packaged and signed? |
| Forma extension build | ❓ | Is it published to extension registry? |
| Screenshots captured | ❓ | Need actual product screenshots |
| Video walkthrough | ❓ | Record or confirm existing |

---

## Repository Map

The Autodesk submission spans 3 repos:

| Repo | Role | Submission Relevance |
|------|------|---------------------|
| `green-sourcing-b2b-app` | Main platform (SDA API + suppliers/RFQ/EPD) | Backend, demo, everything |
| Forma extension repo | Autodesk Forma integration | Marketplace listing (Forma) |
| Revit plugin repo | Autodesk Revit plugin | Marketplace listing (Revit) |

> **Note:** SDA connector logic lives here in `green-sourcing-b2b-app`. The `greenchainz-sda-connector` repo is archived/legacy.

### What reviewers will test:
1. **Revit plugin** → calls `green-sourcing-b2b-app` API → returns material data
2. **Forma extension** → calls `green-sourcing-b2b-app` API → returns material data
3. **Demo app** (`green-sourcing-b2b-app`) → supplier workflows, RFQ, EPD browsing

---

## File Structure (This Folder)

```
docs/autodesk-marketplace/
├── SUBMISSION-CHECKLIST.md    ← You are here
├── LISTING-CONTENT.md         ← Full marketplace listing copy
├── EMAIL-DRAFT.md             ← Email to send to Becky
├── LAUNCH-POST.md             ← Social media / announcement
└── AECO-PARTNER-BRIEF.md     ← Partner program positioning
```
