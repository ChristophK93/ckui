---
'@ckui/core': patch
---

`ck-menu` reads its trigger's name in the order browsers use: `aria-labelledby` now wins over `aria-label`, and a `<label for>` that points at the trigger counts too. This name labels the menu and its phone sheet.
