---
'@ckui/core': minor
---

Add `ckTooltip` (`@ckui/core/tooltip`): a short text that describes a control, shown on hover after a delay, at once on keyboard focus and on long-press, hidden on Escape. It stays open while the pointer is over it, sits above the control by default and flips when out of room, and uses the browser's top layer, so it shows above dialogs without adding overlay code to the bundle. It needs the browser's Popover API; where that is missing the tooltip stays off and the control works as before.
