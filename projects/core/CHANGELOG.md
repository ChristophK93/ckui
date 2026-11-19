# @ckui/core

## 0.1.0-next.3

### Minor Changes

- Add `CkChip`, `CkChipIcon` and `CkChipGroup` (`@ckui/core/chip`): compact toggle chips on a native button with `aria-pressed`, a check mark when selected, four sizes and a wrapping group for multi-select filters.
- Add `CkDrawer` and `<ck-drawer>` (`@ckui/core/drawer`): a modal panel that slides in from the start or end edge as a full-height side panel, and becomes the dialog's bottom sheet on a narrow screen with a coarse pointer. It is built from the dialog building blocks (`CK_DRAWER_IMPORTS`), takes a component or a template, returns a `CkDrawerRef` with the result, and follows the writing direction. Tokens: `--ck-drawer-bg`, `--ck-drawer-width`, `--ck-drawer-padding` and `--ck-drawer-shadow`.
- Add `CkSwitch` and `CkSwitchHint` (`@ckui/core/switch`): an on/off switch with a label and an optional hint, four sizes, a native switch input underneath and the form APIs.
- Add `CkTabs`, `CkTabList`, `CkTab`, `CkTabPanel` and `CkTabContent` (`@ckui/core/tabs`): underline tabs with a shared or per-tab panels, lazy panel content, automatic or manual activation, four sizes, a row that scrolls sideways and keeps the selected tab in view, and the WAI-ARIA tabs keyboard pattern.

## 0.1.0-next.2

### Minor Changes

- Add `CkBadge` (`@ckui/core/badge`): a non-interactive status pill with four tones, an optional dot or `ckBadgeIcon`, two sizes and ellipsis truncation.
- Add `CkProgress` (`@ckui/core/progress`): a determinate or indeterminate progress bar with a clamped `value`, `max`, `valueText`, reduced-motion and forced-colors support and per-instance tokens.
- Add `CkStepper` (`@ckui/core/stepper`): a number field with minus and plus buttons that repeat while held, an editable spinbutton value, `min`, `max`, `step`, `unit`, locale formatting, four sizes and the form APIs.

### Patch Changes

- `ck-segmented`: labels are no longer cut at phone width. A segment is as wide as an equal share or its label, whichever is larger; only when the labels cannot fit together does the control fall back to equal columns with an ellipsis. The indicator now sits in the grid area of the selected segment and slides with the Web Animations API (not under reduced motion). New token `--ck-segmented-padding-inline` for a tighter control.
- The dialog's overlay code no longer lands in an app's initial bundle when only button, field or toast are used there.

## 0.1.0-next.1

### Minor Changes

- Add `CkDialog` and `ck-dialog` (`@ckui/core/dialog`): modal dialogs and alert dialogs that open from a component or a template, hand back a result, trap and restore focus, and become swipeable bottom sheets on phones.
- Add `ck-segmented` and `ck-segment` (`@ckui/core/segmented`): an accessible radio group of exclusive options with a sliding indicator, icons, sizes up to `xl`, and wiring for Reactive Forms, `ngModel` and Signal Forms.
- Add `CkToast` (`@ckui/core/toast`): announced, stackable toasts with four tones, an action, replace-by-id, timers that pause while the user reads, a queue and swipe to dismiss, configured with `provideCkToast`.

## 0.1.0-next.0

### Minor Changes

- 6fc6f67: Add `ckButton` (`@ckui/core/button`): primary, secondary, ghost and danger variants in three sizes, with loading, disabled and icon-only states for `<button>` and `<a>`. Add the `--ck-color-surface-hover` and `--ck-color-surface-active` theme tokens.
- Add `ck-field` and `ckInput` (`@ckui/core/field`): a floating-label field around a native input or textarea, with hint, error, prefix and suffix, textarea autosize, and wiring for Reactive Forms, `ngModel` and Signal Forms.
- Add the `xl` control size (60 px) to `CkSize`, `ckButton`, `ck-field` and `ckInput`, the `--ck-color-control` and `--ck-color-control-border` theme tokens used by the secondary button, and `--ck-font-variant-numeric` (tabular numerals on controls). `provideCkui` now rejects a `null` size or sheet breakpoint instead of silently using the default.
- 080fc7a: Add design tokens with light and dark themes (`@ckui/core/styles.css`) and `provideCkui` for size, sheet breakpoint and labels.
