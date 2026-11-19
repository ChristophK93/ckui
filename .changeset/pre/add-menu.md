---
'@ckui/core': minor
---

Add `ck-menu` (`@ckui/core/menu`): the WAI-ARIA menu button. `[ckMenuTrigger]` on a native button opens a `ck-menu` of `button[ckMenuItem]` actions (`disabled`, `tone="danger"`, a `[ckMenuItemIcon]` slot) and `ck-menu-divider` as a popover under it, or as a bottom sheet with a Cancel row on a phone. It has the full keyboard map with wrapping and typeahead, closes before an item's `(click)` runs, and keeps the attributes you set on the button. New label `cancel`.
