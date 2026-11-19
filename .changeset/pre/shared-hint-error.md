---
'@ckui/core': minor
---

Add `@ckui/core/form` with `CkHint` and `CkError`, shared by the field and the switch (both are still exported from `@ckui/core/field`). `ck-hint` and `ck-error` now follow a bound or changed `id`.

**Breaking:** `CkSwitchHint` and `<ck-switch-hint>` are removed; use `<ck-hint>` (it is part of `CK_SWITCH_IMPORTS`).
