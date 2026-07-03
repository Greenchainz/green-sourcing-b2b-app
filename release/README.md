# GreenChainz – Autodesk Marketplace Release Package

## Contents

```
release/
├── manifest.json              ← Marketplace metadata
├── revit-plugin/              ← Revit plugin build output
│   ├── GreenChainz.addin      ← Revit add-in manifest
│   ├── GreenChainz.dll        ← Plugin assembly (YOUR BUILD)
│   └── lib/                   ← Dependencies (if needed)
├── forma-extension/           ← Forma extension build
│   ├── manifest.json          ← Extension manifest
│   └── main.js               ← Build output (YOUR BUILD)
├── docs/
│   ├── installation.md        ← Install guide
│   ├── quickstart.md          ← User quickstart
│   └── architecture.md        ← System overview
├── screenshots/               ← Product screenshots (PNG)
├── videos/                    ← Demo walkthrough (MP4)
├── security.md                ← Security & trust documentation
└── README.md                  ← You are here
```

## Before Submitting

1. Build Revit plugin → place `GreenChainz.dll` in `revit-plugin/`
2. Build Forma extension → place output in `forma-extension/`
3. Capture screenshots → drop PNGs in `screenshots/`
4. Record demo video → place MP4 in `videos/`
5. Verify demo login works at https://greenchainz.com
6. Run the QA checklist below
7. Zip this folder and submit

## Submission Readiness Snapshot

### Completed in this package
- [x] Revit and Forma release scaffolding present in `release/`
- [x] Installation, quickstart, and architecture docs included in `release/docs/`
- [x] Security and trust statement included (`release/security.md`)
- [x] Marketplace metadata normalized to `greenchainz.com` domain only

### Manual-final items before upload
- [ ] Capture and place final screenshots in `release/screenshots/`
- [ ] Record and place final demo video in `release/videos/`
- [ ] Complete compliance/trust verification against final deployed behavior
- [ ] Complete technical review confirmation for Revit + Forma production builds
- [ ] Finalize business asset pack (icon, listing copy sign-off, partner-ready materials)
- [ ] Assemble final zip from this `release/` package after all manual items are complete

## Demo Access

| Field | Value |
|-------|-------|
| URL | https://greenchainz.com |
| Email | demo@greenchainz.com |
| Password | GreenchainzDemo123! |

## QA Checklist

### Functional
- [ ] Revit plugin installs clean
- [ ] Forma extension loads clean
- [ ] No runtime errors in either

### Integration
- [ ] API reachable externally (HTTPS)
- [ ] Auth working (no MFA blocking reviewers)
- [ ] Data loads (EPD, carbon, suppliers)

### UX
- [ ] No broken buttons
- [ ] No placeholder text
- [ ] No test/debug data visible

## Common Rejection Reasons

- ❌ Login broken or requires internal account
- ❌ No demo credentials provided
- ❌ Missing documentation
- ❌ Plugin crashes on load
- ❌ API not accessible externally
- ❌ Hardcoded localhost URLs
