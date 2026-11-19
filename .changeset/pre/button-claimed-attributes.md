---
'@ckui/core': patch
---

`ckButton` no longer mistakes a `disabled`, `aria-disabled` or `tabindex` it wrote during a server render for the consumer's own value, and gives the consumer's value back after hydration.
