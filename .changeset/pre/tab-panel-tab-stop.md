---
'@ckui/core': minor
---

Add the `tabStop` input to `CkTabPanel`: `[tabStop]="false"` takes the panel out of the tab order (no `tabindex`) for content that starts with a focusable element, so Tab goes from the selected tab straight to it. The default stays `tabindex="0"`.
