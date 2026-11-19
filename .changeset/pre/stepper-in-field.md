---
'@ckui/core': minor
---

`ck-stepper` can be the control of a `ck-field` (label, hint, error): the field draws the box and the always-floated label, names the input, merges its hint and error ids and sets `aria-invalid` and `aria-required`; the stepper takes the field's size and its buttons sit at the box edges. `(valueChange)` of the stepper also reports a write from a form (`setValue`, `reset`).
