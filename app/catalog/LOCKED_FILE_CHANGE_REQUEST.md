# 🔒 LOCKED FILE CHANGE REQUEST

## Target File: `app/globals.css`

### Requesting Agent: UI-CATALOG (Agent 5)
### Date: January 4, 2026

---

## Summary

Request to add catalog layout, grid, card, and compare tray styles to `app/globals.css` following the established `gc-*` class naming pattern.

---

## Proposed CSS Additions

Add the following styles to `app/globals.css` after the existing styles (before the Reduced Motion section):

```css
/* ---------- Catalog Layout ---------- */
.gc-catalog-layout {
  display: flex;
  min-height: calc(100vh - 200px);
}

.gc-catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

@media (min-width: 640px) {
  .gc-catalog-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

/* ---------- Filter Sidebar ---------- */
.gc-filter-sidebar {
  width: 280px;
  min-width: 280px;
  background: var(--gc-glass);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-right: 1px solid var(--gc-glass-border);
  height: 100%;
  overflow: auto;
  flex-shrink: 0;
  transition: all var(--gc-duration-slow) var(--gc-ease);
}

.gc-filter-sidebar--collapsed {
  width: 0;
  min-width: 0;
  overflow: hidden;
  border-right: none;
}

@media (max-width: 1023px) {
  .gc-filter-sidebar {
    display: none;
  }
}

/* Range Slider Styling */
.gc-range-slider {
  -webkit-appearance: none;
  appearance: none;
  pointer-events: auto;
}

.gc-range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, var(--gc-emerald-500), var(--gc-teal-500));
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
  border: 2px solid white;
  pointer-events: auto;
}

.gc-range-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, var(--gc-emerald-500), var(--gc-teal-500));
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
  border: 2px solid white;
}

/* ---------- Material Card ---------- */
.gc-material-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.gc-material-card:hover .gc-material-image {
  transform: scale(1.05);
}

.gc-material-image {
  transition: transform var(--gc-duration-slow) var(--gc-ease);
}

/* ---------- Compare Tray ---------- */
.gc-compare-tray {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  background: var(--gc-glass);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid var(--gc-glass-border);
  box-shadow: 0 -8px 32px rgba(2, 44, 34, 0.12);
  transition: transform var(--gc-duration-slow) var(--gc-ease);
}

.gc-compare-tray--collapsed {
  transform: translateY(calc(100% - 48px));
}

/* Compare item styles */
.gc-compare-item {
  min-width: 140px;
  width: 140px;
  background: white;
  border-radius: var(--gc-radius);
  border: 1px solid var(--gc-slate-200);
  overflow: hidden;
  position: relative;
  transition: all var(--gc-duration) var(--gc-ease);
}

.gc-compare-item:hover {
  border-color: var(--gc-emerald-300);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.12);
}

.gc-compare-slot-empty {
  min-width: 140px;
  width: 140px;
  height: 100px;
  border-radius: var(--gc-radius);
  border: 2px dashed var(--gc-slate-200);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.35rem;
  color: var(--gc-slate-400);
  transition: all var(--gc-duration) var(--gc-ease);
}

.gc-compare-slot-empty:hover {
  border-color: var(--gc-emerald-300);
  color: var(--gc-emerald-500);
}

/* ---------- Sustainability Score ---------- */
.gc-sustainability-score {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.gc-score-ring {
  position: relative;
  flex-shrink: 0;
}

.gc-score-ring svg circle {
  transition: stroke-dashoffset 0.6s var(--gc-ease);
}

/* Score bar component */
.gc-score-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.gc-score-bar-track {
  flex: 1;
  height: 6px;
  background: var(--gc-slate-100);
  border-radius: 3px;
  overflow: hidden;
}

.gc-score-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s var(--gc-ease);
}

/* ---------- Certification Badge ---------- */
.gc-cert-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.65rem;
  border-radius: var(--gc-radius-sm);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  transition: all var(--gc-duration) var(--gc-ease);
}

.gc-cert-badge:hover {
  transform: translateY(-1px);
}

.gc-cert-badge--leed {
  background: var(--gc-emerald-50);
  color: var(--gc-emerald-700);
  border: 1px solid rgba(5, 150, 105, 0.2);
}

.gc-cert-badge--fsc {
  background: var(--gc-emerald-50);
  color: var(--gc-emerald-700);
  border: 1px solid rgba(5, 150, 105, 0.2);
}

.gc-cert-badge--epd {
  background: rgba(20, 184, 166, 0.1);
  color: var(--gc-teal-700);
  border: 1px solid rgba(20, 184, 166, 0.2);
}

.gc-cert-badge--breeam {
  background: var(--gc-emerald-50);
  color: var(--gc-emerald-700);
  border: 1px solid rgba(5, 150, 105, 0.2);
}

/* ---------- Document Link Hover ---------- */
.gc-document-link:hover {
  background: var(--gc-emerald-50);
  transform: translateX(4px);
}

/* ---------- Mobile Utilities ---------- */
@media (max-width: 1023px) {
  .gc-desktop-only {
    display: none !important;
  }
}

@media (min-width: 1024px) {
  .gc-mobile-only {
    display: none !important;
  }
}

/* ---------- Catalog Page Header ---------- */
.gc-catalog-header {
  border-bottom: 1px solid var(--gc-glass-border);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.gc-catalog-header-inner {
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ---------- Empty State ---------- */
.gc-empty-state {
  padding: 3rem 2rem;
  text-align: center;
}

.gc-empty-state-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 1rem auto;
  color: var(--gc-slate-400);
}

/* ---------- Pagination ---------- */
.gc-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 2rem;
}

.gc-pagination-btn {
  min-width: 40px;
  padding: 0.5rem 0.85rem;
}
```

---

## Rationale

1. **Consistency**: All new styles follow the established `gc-*` naming convention
2. **Brand Alignment**: Uses existing brand colors (emerald/teal) and design tokens
3. **Mobile-First**: Responsive breakpoints match existing patterns
4. **Glass Effects**: Continues the glassmorphic design language
5. **Accessibility**: Maintains focus states and reduced motion support
6. **Performance**: Uses CSS custom properties and efficient selectors

---

## Dependencies

- All styles depend on existing CSS custom properties defined in `:root`
- No new dependencies required
- Compatible with existing Tailwind integration

---

## Testing Notes

1. Test filter sidebar collapse/expand on desktop and mobile
2. Verify compare tray animations work smoothly
3. Check range slider appearance across browsers
4. Confirm hover states on cards and badges
5. Test dark mode compatibility (if implemented)

---

## Approval

- [ ] Approved by layout owner
- [ ] CSS linting passed
- [ ] Responsive testing completed
- [ ] Cross-browser testing completed
