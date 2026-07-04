# Autodesk Design & Make Marketplace – Final Submission Checklist

## Status Key
- [ ] Manual-final item pending
- [x] Completed in repository/package

---

## Completed Baseline (Repository + Package Audit)

### Email & Partner Program
- [ ] Send email to Becky (see `EMAIL-DRAFT.md`)
- [ ] Apply to AECO Technology Partner Program
- [ ] Confirm Becky + Tiffany received submission preview

### Technical Readiness
- [ ] Main app deployed with SDA endpoints live (`green-sourcing-b2b-app`)
- [ ] Forma extension built and deployable (Forma extension repo)
- [ ] Revit plugin packaged as `.bundle` or installer (Revit plugin repo)
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
- [x] Autodesk marketplace documentation set present in `docs/autodesk-marketplace/`
- [x] Release package structure present in `release/` (manifests, docs, security notes)
- [x] Demo access references standardized to `https://greenchainz.com`
- [x] Domain references aligned to `greenchainz.com` (no `docs.greenchainz.com` dependency)
- [x] Listing metadata/docs updated for Revit + Forma without stale SDA wording

---

## Manual-Final Items (Founder Execution Required)

### Assets
- [ ] Capture final submission screenshots and place in `release/screenshots/`
- [ ] Record final demo walkthrough video and place in `release/videos/`
- [ ] Finalize app icon and business asset pack for marketplace upload

### Compliance / Trust Verification
- [ ] Verify privacy policy URL: `https://greenchainz.com/privacy`
- [ ] Verify terms URL: `https://greenchainz.com/terms`
- [ ] Verify documentation URL: `https://greenchainz.com/docs`
- [ ] Confirm security claims in `release/security.md` match current production behavior

### Technical Review Confirmation
- [ ] Confirm production-ready Revit plugin package (current supported versions)
- [ ] Confirm production-ready Forma extension package
- [ ] Confirm end-to-end reviewer flow works with live domain `https://greenchainz.com`

| Item | Status | Notes |
|------|--------|-------|
| Demo URL readiness | ❓ | Confirm `greenchainz.com` is live |
| SDA endpoints in main app | ❓ | Confirm SDA routes are deployed in `green-sourcing-b2b-app` |
| Revit plugin build | ❓ | Is the `.bundle` packaged and signed? |
| Forma extension build | ❓ | Is it published to extension registry? |
| Screenshots captured | ❓ | Need actual product screenshots |
| Video walkthrough | ❓ | Record or confirm existing |
### Submission Assembly
- [ ] Perform final pass on `docs/autodesk-marketplace/LISTING-CONTENT.md`
- [ ] Assemble final submission zip from `release/` only after all manual-final checks pass
- [ ] Submit package and keep reviewer-response turnaround path ready

---

## File Map

| Area | Path |
|------|------|
| Submission checklist | `docs/autodesk-marketplace/SUBMISSION-CHECKLIST.md` |
| Listing copy | `docs/autodesk-marketplace/LISTING-CONTENT.md` |
| Release package entrypoint | `release/README.md` |
| Marketplace metadata | `release/manifest.json` |
| Security/trust statement | `release/security.md` |
| Manual screenshots drop | `release/screenshots/` |
| Manual video drop | `release/videos/` |
