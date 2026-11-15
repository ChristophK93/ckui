---
'@ckui/core': minor
---

Add the `xl` control size (60 px) to `CkSize`, `ckButton`, `ck-field` and `ckInput`, the `--ck-color-control` and `--ck-color-control-border` theme tokens used by the secondary button, and `--ck-font-variant-numeric` (tabular numerals on controls). `provideCkui` now rejects a `null` size or sheet breakpoint instead of silently using the default.
