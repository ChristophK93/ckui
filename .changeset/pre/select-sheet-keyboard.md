---
'@ckui/core': patch
---

Sheets, dialogs and side panels stay inside the visible part of the screen while a phone's soft keyboard is open: they follow the visual viewport instead of the layout viewport, so the search field of a filterable `ck-select` sheet no longer slides off the top when the keyboard appears, and the focused field is scrolled back into view. The highlighted `ck-option` no longer draws a bar at the inline start; it is a fill a step stronger than hover (`--ck-option-bg-active` now falls back to `--ck-color-surface-active`), and the selected option keeps its coloured fill and check mark.
