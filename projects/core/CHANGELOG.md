# @ckui/core

## 0.1.0-next.0

### Minor Changes

- 6fc6f67: Add `ckButton` (`@ckui/core/button`): primary, secondary, ghost and danger variants in three sizes, with loading, disabled and icon-only states for `<button>` and `<a>`. Add the `--ck-color-surface-hover` and `--ck-color-surface-active` theme tokens.
- Add `ck-field` and `ckInput` (`@ckui/core/field`): a floating-label field around a native input or textarea, with hint, error, prefix and suffix, textarea autosize, and wiring for Reactive Forms, `ngModel` and Signal Forms.
- Add the `xl` control size (60 px) to `CkSize`, `ckButton`, `ck-field` and `ckInput`, the `--ck-color-control` and `--ck-color-control-border` theme tokens used by the secondary button, and `--ck-font-variant-numeric` (tabular numerals on controls). `provideCkui` now rejects a `null` size or sheet breakpoint instead of silently using the default.
- 080fc7a: Add design tokens with light and dark themes (`@ckui/core/styles.css`) and `provideCkui` for size, sheet breakpoint and labels.
