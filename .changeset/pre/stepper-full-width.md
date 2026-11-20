---
'@ckui/core': patch
---

`ck-stepper` gets a `fullWidth` input: it fills its container with the minus button at the start, the plus button at the end and the value and unit centred between, and it can shrink inside a grid or flex cell. The new `--ck-stepper-button-width` token sets the width of both buttons; by default they stay squares of the control height. Inside a `ck-field` the stepper fills the field as before, and the token applies there too.
