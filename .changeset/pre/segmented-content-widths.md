---
'@ckui/core': patch
---

`ck-segmented`: labels are no longer cut at phone width. A segment is as wide as an equal share or its label, whichever is larger; only when the labels cannot fit together does the control fall back to equal columns with an ellipsis. The indicator now sits in the grid area of the selected segment and slides with the Web Animations API (not under reduced motion). New token `--ck-segmented-padding-inline` for a tighter control.
