# LOCKED FILE CHANGE REQUEST

**File:** `app/globals.css`  
**Requested by:** Frontend Catalog Lane  
**Date:** 2026-01-04

---

## Summary

Request to add catalog-specific CSS styles to the shared globals.css file for the new Material Catalog feature.

---

## Proposed Additions

Please add the following CSS after the existing styles (around line 1162):

```css
/* ============================================================
   CATALOG PAGE STYLES
   Material Catalog, Filters, and Compare Features
   ============================================================ */

/* ---------- Catalog Layout ---------- */
.gc-catalog-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2rem;
  align-items: start;
}

@media (max-width: 1024px) {
  .gc-catalog-layout {
    grid-template-columns: 1fr;
  }
  
  .gc-sidebar-wrapper {
    display: none;
  }
  
  .gc-mobile-filter-btn {
    display: inline-flex !important;
  }
}

/* ---------- Filter Sidebar Mobile ---------- */
.gc-filter-overlay {
  display: none;
}

@media (max-width: 1024px) {
  .gc-filter-overlay {
    display: block;
  }
  
  .gc-filter-sidebar {
    position: fixed !important;
    top: 0 !important;
    left: 0;
    bottom: 0;
    z-index: 50;
    width: 320px !important;
    max-width: 85vw;
    max-height: 100vh !important;
    border-radius: 0 var(--gc-radius-xl) var(--gc-radius-xl) 0 !important;
    transform: translateX(0);
    animation: gc-slide-in-left 0.3s var(--gc-ease);
  }
}

@keyframes gc-slide-in-left {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* ---------- Material Card Styles ---------- */
.gc-material-card {
  height: 100%;
}

.gc-material-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 50px rgba(2, 44, 34, 0.15);
}

/* ---------- Compare Tray ---------- */
.gc-compare-tray {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid var(--gc-glass-border);
  box-shadow: 0 -8px 30px rgba(2, 44, 34, 0.12);
  padding: 1rem 0;
}

/* Hide scrollbar for compare tray items */
.gc-compare-tray > div > div:nth-child(2) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.gc-compare-tray > div > div:nth-child(2)::-webkit-scrollbar {
  display: none;
}

/* ---------- Certification Badge Hover ---------- */
.gc-cert-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* ---------- Score Ring Animation ---------- */
.gc-sustainability-score circle:last-of-type {
  transition: stroke-dashoffset 0.8s var(--gc-ease);
}

/* ---------- Range Slider Custom Styling ---------- */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--gc-emerald-500), var(--gc-teal-500));
  cursor: pointer;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
  transition: transform var(--gc-duration) var(--gc-ease),
              box-shadow var(--gc-duration) var(--gc-ease);
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.45);
}

input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--gc-emerald-500), var(--gc-teal-500));
  cursor: pointer;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
}

/* ---------- Material Detail Page ---------- */
.gc-material-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

@media (max-width: 768px) {
  .gc-material-hero {
    grid-template-columns: 1fr;
  }
}

.gc-material-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
}

@media (max-width: 1024px) {
  .gc-material-content {
    grid-template-columns: 1fr;
  }
}

/* ---------- Supplier Cards ---------- */
.gc-supplier-card {
  transition: transform var(--gc-duration) var(--gc-ease),
              border-color var(--gc-duration) var(--gc-ease);
}

.gc-supplier-card:hover {
  transform: translateY(-2px);
  border-color: var(--gc-emerald-300);
}

/* ---------- Environmental Metric Cards ---------- */
.gc-metric-card {
  transition: transform var(--gc-duration) var(--gc-ease);
}

.gc-metric-card:hover {
  transform: translateY(-1px);
}
```

---

## Justification

These styles are needed for:

1. **Responsive Catalog Layout** - Grid layout for sidebar and main content with mobile breakpoints
2. **Mobile Filter Experience** - Slide-in sidebar overlay for mobile users
3. **Material Cards** - Enhanced hover effects for product cards
4. **Compare Tray** - Fixed bottom tray for material comparison feature
5. **Custom Range Slider** - Branded sustainability score filter slider
6. **Material Detail Page** - Responsive layouts for product detail views
7. **Interactive Elements** - Hover states for badges, cards, and metrics

All styles follow the existing `gc-*` naming convention and use the established CSS custom properties (--gc-emerald-*, --gc-teal-*, --gc-slate-*, etc.).

---

## Dependencies

None - these are pure CSS additions that don't modify existing styles.

---

## Testing Notes

- Test on mobile viewport (< 768px) for responsive behavior
- Test filter sidebar toggle on tablet (< 1024px)
- Verify compare tray doesn't overlap footer
- Check range slider appearance across browsers
