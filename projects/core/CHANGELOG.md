# @ckui/core

## 0.1.0-next.7

### Patch Changes

- `ck-stepper` gets a `fullWidth` input: it fills its container with the minus button at the start, the plus button at the end and the value and unit centred between, and it can shrink inside a grid or flex cell. The new `--ck-stepper-button-width` token sets the width of both buttons; by default they stay squares of the control height. Inside a `ck-field` the stepper fills the field as before, and the token applies there too.
- Sheets, dialogs and side panels stay inside the visible part of the screen while a phone's soft keyboard is open: they follow the visual viewport instead of the layout viewport, so the search field of a filterable `ck-select` sheet no longer slides off the top when the keyboard appears, and the focused field is scrolled back into view. The highlighted `ck-option` no longer draws a bar at the inline start; it is a fill a step stronger than hover (`--ck-option-bg-active` now falls back to `--ck-color-surface-active`), and the selected option keeps its coloured fill and check mark.

## 0.1.0-next.6

### Patch Changes

- Typing in a filterable `ck-select` stays fast with many options: a select with 1,200 options now mounts in about 0.2 s instead of 5 s or more (reading an option's value before it was bound threw an error for every option, over and over), and each keystroke in the search field settles in about 20 ms. Destroying a form control (a select that holds focus, or a dialog with an open select) no longer reports `NG0953` ("Unexpected emit for destroyed OutputRef"): the blur that removing a focused element fires is ignored once the control is gone.

## 0.1.0-next.5

### Minor Changes

- Add `ck-menu` (`@ckui/core/menu`): the WAI-ARIA menu button. `[ckMenuTrigger]` on a native button opens a `ck-menu` of `button[ckMenuItem]` actions (`disabled`, `tone="danger"`, a `[ckMenuItemIcon]` slot) and `ck-menu-divider` as a popover under it, or as a bottom sheet with a Cancel row on a phone. It has the full keyboard map with wrapping and typeahead, closes before an item's `(click)` runs, and keeps the attributes you set on the button. New label `cancel`.
- Add `ck-select` (`@ckui/core/select`): a single-choice dropdown with `ck-option`, `ck-optgroup` and a `ckSelectValue` template for the button. It is the WAI-ARIA select-only combobox (a native button, the list as a popover under it, a bottom sheet on a phone), with typeahead, a `filter` search field (accent- and case-insensitive, `filterWith`, announced result count), `compareWith`, four sizes, the three form APIs, and it is a control of `ck-field`. New labels `search`, `resultCount` and `resultCountOne`.

## 0.1.0-next.4

### Minor Changes

- Add `CkCheckbox` and `CkCheckboxGroup` (`@ckui/core/checkbox`): a checkbox with a label, hint, mixed state and its own error, and a group that edits an array value in page order. Native checkbox input underneath, four sizes and the form APIs.
- Add `CkSlider` (`@ckui/core/slider`): a slider for one number in a range, with a custom thumb that has the slider role, a hit area of at least the target size, `valueCommit` for the end of a change, four sizes, an optional shown value and the form APIs.
- Add `@ckui/core/form` with `CkHint` and `CkError`, shared by the field and the switch (both are still exported from `@ckui/core/field`). `ck-hint` and `ck-error` now follow a bound or changed `id`.

  **Breaking:** `CkSwitchHint` and `<ck-switch-hint>` are removed; use `<ck-hint>` (it is part of `CK_SWITCH_IMPORTS`).
- `ck-stepper` can be the control of a `ck-field` (label, hint, error): the field draws the box and the always-floated label, names the input, merges its hint and error ids and sets `aria-invalid` and `aria-required`; the stepper takes the field's size and its buttons sit at the box edges. `(valueChange)` of the stepper also reports a write from a form (`setValue`, `reset`).
- Add the `tabStop` input to `CkTabPanel`: `[tabStop]="false"` takes the panel out of the tab order (no `tabindex`) for content that starts with a focusable element, so Tab goes from the selected tab straight to it. The default stays `tabindex="0"`.

### Patch Changes

- `ckButton` no longer mistakes a `disabled`, `aria-disabled` or `tabindex` it wrote during a server render for the consumer's own value, and gives the consumer's value back after hydration.

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
