---
'@ckui/core': patch
---

Typing in a filterable `ck-select` stays fast with many options: a select with 1,200 options now mounts in about 0.2 s instead of 5 s or more (reading an option's value before it was bound threw an error for every option, over and over), and each keystroke in the search field settles in about 20 ms. Destroying a form control (a select that holds focus, or a dialog with an open select) no longer reports `NG0953` ("Unexpected emit for destroyed OutputRef"): the blur that removing a focused element fires is ignored once the control is gone.
