## 2024-05-23 - Accessibility of Custom Dropdowns
**Learning:** Custom dropdowns (using divs) often lack basic accessibility (ARIA roles, keyboard support) and standard interaction patterns (click outside to close).
**Action:** When creating or modifying custom dropdowns, always implement `useOnClickOutside` (or equivalent), add `role="menu"`, `role="menuitem"`, `aria-haspopup`, and `aria-expanded`.

## 2024-05-23 - Click Outside Interaction Bug
**Learning:** A simple "click outside" handler on the document will fire when the trigger button is clicked, immediately closing the menu before the button's onClick toggles it back open.
**Action:** Always exclude the trigger element from the "click outside" check (e.g., using a ref for the trigger and checking `!triggerRef.current.contains(event.target)`).

## 2024-05-24 - Semantic Progress Steps
**Learning:** Visual-only progress indicators (using divs) leave screen reader users lost about where they are in a multi-step process.
**Action:** Always use `<nav aria-label="Progress">` and `<ol>` for steps, and use `aria-current="step"` on the active step. Hide decorative connecting lines with `aria-hidden="true"`.
