## 2024-05-23 - Accessibility of Custom Dropdowns
**Learning:** Custom dropdowns (using divs) often lack basic accessibility (ARIA roles, keyboard support) and standard interaction patterns (click outside to close).
**Action:** When creating or modifying custom dropdowns, always implement `useOnClickOutside` (or equivalent), add `role="menu"`, `role="menuitem"`, `aria-haspopup`, and `aria-expanded`.

## 2024-05-23 - Click Outside Interaction Bug
**Learning:** A simple "click outside" handler on the document will fire when the trigger button is clicked, immediately closing the menu before the button's onClick toggles it back open.
**Action:** Always exclude the trigger element from the "click outside" check (e.g., using a ref for the trigger and checking `!triggerRef.current.contains(event.target)`).

## 2024-05-24 - Semantic Progress Steps
**Learning:** Visual-only progress indicators (using divs) leave screen reader users lost about where they are in a multi-step process.
**Action:** Always use `<nav aria-label="Progress">` and `<ol>` for steps, and use `aria-current="step"` on the active step. Hide decorative connecting lines with `aria-hidden="true"`.

## 2024-05-24 - Explain Industry Jargon
**Learning:** Industry-specific terms (like GWP, EPD) are barriers to entry. Assuming user knowledge hurts usability for new team members (e.g., procurement managers who aren't sustainability experts).
**Action:** Use simple, accessible tooltips (using `group-hover` CSS patterns or `title` attributes) to decode acronyms inline without cluttering the UI.

## 2026-01-17 - Accessible Tooltip Implementation
**Learning:** The previous "Explain Industry Jargon" action suggested `group-hover` tooltips, but these are inaccessible to keyboard users. Tooltips must be focusable.
**Action:** Wrap tooltip triggers in `<button type="button">` and add `group-focus:block` alongside `group-hover:block`. Add `aria-label` to the button describing the help action.

## 2024-05-22 - Auth Bypass for Visual Verification
**Learning:** Visual regression testing (Playwright) on authenticated routes requires injecting state directly into LocalStorage (`greenchainz-auth`) because the login UI might be broken or slow to interact with during dev cycles.
**Action:** Use the `verify_rfq_authed.py` pattern (injecting Zustand state) for future authenticated page verifications to bypass login forms.
