# @ckui/core

Accessible, themeable Angular components that work equally well on phone and desktop.

## Install

```bash
npm install @ckui/core@next @angular/cdk
```

0.1 is in prerelease (`next`). Pin an exact version (`npm install --save-exact @ckui/core@next`),
because prereleases can change between builds.

Peer dependencies: `@angular/common`, `@angular/core`, `@angular/forms` and `@angular/cdk`, all
`^22.2.0`.

## Styles

Import the stylesheet once, for example in `angular.json`:

```json
"styles": ["node_modules/@ckui/core/styles/styles.css"]
```

or in your global CSS: `@import '@ckui/core/styles.css';`

It only declares `--ck-*` custom properties and `.ck-*` classes, all inside `@layer ckui`, and
styles no element. Add the class `ck-root` to `<html>` to apply the font, text colour, background
and `color-scheme` (on `<body>`, `color-scheme` would not reach the viewport and scrollbars).

The light theme is the default and the dark theme follows `prefers-color-scheme`. Force a theme for
the whole page or any subtree with `data-ck-theme="light"` or `data-ck-theme="dark"`. Themes nest.
A nested theme switches only the tokens and `color-scheme`; to repaint the section, give it
`ck-root` as well (or your own `color` and `background` from the tokens).

A whole app look (colours, radii, font, focus ring) is one block of tokens in your own stylesheet, outside any layer, so it beats the library without `!important`. A theme with low-contrast lines must keep control and field boundaries at 3:1 itself (WCAG 1.4.11). The docs site has a copyable near-black example under Theming, Custom theme. Controls also read `--ck-color-control` and `--ck-color-control-border` (the secondary button) and `--ck-font-variant-numeric` (tabular numerals by default).

## Configuration

```ts
import { provideCkui } from '@ckui/core';

bootstrapApplication(App, {
  providers: [
    provideCkui({
      size: 'md', // 'sm' | 'md' | 'lg' | 'xl', default 'md'
      sheetBreakpoint: 640, // px; coarse pointer below this width uses sheets
      labels: { close: 'Schließen' }, // or a Signal / () => Signal<Partial<CkLabels>>
    }),
  ],
});
```

Built-in strings are a signal that resolves to the English defaults plus your overrides. Blank
values fall back to the default. To override them for one part of the app, provide `CK_LABELS`
yourself, as a `Signal<CkLabels>`, on that subtree's injector.

## Button

```ts
import { CkButton } from '@ckui/core/button';
```

```html
<button ckButton variant="primary">Save</button>
<button ckButton variant="ghost" [loading]="saving()">Send</button>
<button ckButton iconOnly aria-label="Close"><svg>...</svg></button>
<a ckButton routerLink="/settings">Settings</a>
```

`ckButton` styles a native `<button>` or `<a>`; there is no `<ck-button>` element, so `type`, `form`,
`aria-*` and `routerLink` stay on the real element. Inputs: `variant` (`'primary' | 'secondary' |
'ghost' | 'danger'`, default `secondary`), `size` (default from `provideCkui`), `iconOnly`,
`loading` and `disabled`. A button without a `type` gets `type="button"`. A loading button stays
focusable, ignores clicks and announces the `loading` label once; a disabled link gets
`aria-disabled` and leaves the tab order. An icon-only button needs an accessible name (development
builds warn). Component token: `--ck-button-radius`.

Global element styles: your own unlayered rules such as `a { color: … }` or
`a:hover { text-decoration: … }` beat the layered button, by design. Scope them with
`a:not(.ck-button)`, or put resets in a layer declared before ckui: `@layer reset, ckui;`.

## Checkbox

```ts
import { CK_CHECKBOX_IMPORTS } from '@ckui/core/checkbox';
```

```html
<ck-checkbox [(value)]="saveAsTemplate">
  Save as template
  <ck-hint>Shows up under "Mine".</ck-hint>
</ck-checkbox>

<ck-checkbox-group [(value)]="zones" required>
  <label>Zones</label>
  <ck-checkbox option="endurance">Endurance</ck-checkbox>
  <ck-checkbox option="vo2">VO2max</ck-checkbox>
  <ck-hint>Pick at least one.</ck-hint>
  <ck-error>Pick at least one zone.</ck-error>
</ck-checkbox-group>
```

`ck-checkbox` is one yes or no choice (`CkCheckbox`, a form control for Reactive Forms, `ngModel` and Signal Forms);
`ck-checkbox-group` (`CkCheckboxGroup`) holds the array of the options that are checked. `CK_CHECKBOX_IMPORTS` is
`[CkCheckbox, CkCheckboxGroup, CkHint, CkError]`. The value of a checkbox is a `boolean`, unchecked by default; `null`
from a form counts as unchecked. Inputs of `ck-checkbox`: `size` (`sm`, `md`, `lg`, `xl`, default the group's size, else
from `provideCkui`), `disabled`, `labelPosition` (`end`, the default, puts the box first; `start` puts the text first),
`indeterminate` (a model: the mixed state, shown as a dash and set on the native input; a click clears it and checks the
box), `option` (inside a group) and `aria-label` / `aria-labelledby` / `aria-describedby` (inputs that move onto the
input element; bind them as `[aria-label]`). `(valueChange)` reports every write to the value: a user
change, and a write from a form (`setValue`, `reset`) too; a `[value]` binding from the parent does not emit. The
control is touched when focus leaves it.

The row is a `<label>` around one native `<input type="checkbox">`, so the checked state, Space and a click on the text,
the hint or the box all work natively. The projected text names the checkbox; a `<ck-hint>` describes it. A checkbox
without visible text needs an `aria-label` or `aria-labelledby`; development builds warn otherwise. The state is shown
by a tick or a dash, never by colour alone. A standalone checkbox can hold a `<ck-error>` (for
`Validators.requiredTrue`): it stays hidden until the control is invalid and touched, or its form was submitted; while
it shows, the input is `aria-invalid` and the error is part of `aria-describedby`.

In a group, each checkbox takes an `option` instead of a value, compared with `Object.is`. A user change writes a new
array in the order of the checkboxes in the page, whatever order they were clicked in; values no checkbox has as its
option stay at the end (development builds warn). `null`, `undefined` or a non-array from a form counts as an empty
array. The group is `role="group"`, named by its first `<label>` child (or `aria-label` / `aria-labelledby`), and its
direct `ck-hint` and `ck-error` children describe it. The group is touched when focus leaves the whole group, not when
it moves between checkboxes; while its error shows, every checkbox is `aria-invalid` (a group cannot carry it).
`disabled` and `size` on the group are the defaults for its checkboxes. `required` only draws the marker on the label:
validation comes from your form, and `Validators.required` fails an empty array while `Validators.minLength(1)` skips it
(in Signal Forms use `required()` or `minLength(path, 1)`).

The row is at least the control height of its size (44px or more on a coarse pointer, 60px at `xl`); the box is
1.125rem at `sm` and `md`, 1.25rem at `lg` and 1.5rem at `xl`. Component tokens: `--ck-checkbox-bg` (unchecked fill,
default `--ck-color-control`), `--ck-checkbox-border-color` (default `--ck-color-border`; keep it 3:1 from the surface),
`--ck-checkbox-checked-bg` (default `--ck-color-primary`), `--ck-checkbox-checked-fg` (the tick, default
`--ck-color-on-primary`), `--ck-checkbox-radius` (default `--ck-radius-sm`) and `--ck-checkbox-group-gap` (default
`--ck-space-1`). In forced colors the box border is `CanvasText`, a checked or mixed box is `Highlight` with a
`HighlightText` mark and a disabled one `GrayText`; motion stops under `prefers-reduced-motion`.
`<fieldset disabled>` blocks and styles checkboxes like `disabled`.

Linting: angular-eslint's `label-has-associated-control` flags the `<label>` that names a group. Turn the rule off for
templates that use `ck-checkbox-group`, or name the group with `aria-label`.

Global element styles: an unlayered `input { … }` or `label { … }` beats the layered parts. Keep them off the checkbox
(`input:not(.ck-checkbox__input)`) or put resets in a layer declared before ckui: `@layer reset, ckui;`.

## Chip

```ts
import { CK_CHIP_IMPORTS } from '@ckui/core/chip';
```

```html
<ck-chip-group aria-label="Category">
  <button ckChip [(selected)]="endurance">Endurance</button>
  <button ckChip [(selected)]="vo2">
    <svg
      ckChipIcon
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M8 13.5L3.4 8.9a3 3 0 014.6-3.8 3 3 0 014.6 3.8L8 13.5z" />
    </svg>
    VO2max
  </button>
</ck-chip-group>
```

`ckChip` turns a native `<button>` into a compact toggle for filters (`CkChip`, `CkChipIcon`, `CkChipGroup`;
`CK_CHIP_IMPORTS` is all three). Inputs: `selected` (a `model<boolean>`, `false`; use `[(selected)]`; a click toggles it
and emits, a programmatic change never emits), `size` (`sm`, the default, `md`, `lg`, `xl`; an unknown value falls back
to `sm`) and `disabled` (the native attribute; `<fieldset disabled>` blocks and styles the chip the same). The button
keeps its own `type` (default `button`), `tabindex`, `aria-*` and classes; the chip owns `aria-pressed`. A selected chip
shows a check before the label (it replaces a projected `ckChipIcon` while on), so the state is never colour alone.
The label is cut with an ellipsis when it does not fit.

`ck-chip-group` is a `role="group"` flex row that wraps; give it an `aria-label` or `aria-labelledby`. Development
builds warn about a chip without a name and a group without one.

Keyboard: Tab moves between chips, Space or Enter toggles the focused chip. Height follows the control-height tokens
(2rem at `sm`, 2.75rem for `sm` and `md` under a coarse pointer, 3.75rem at `xl`). In forced colors a selected chip is
`Highlight`; motion stops under `prefers-reduced-motion`. Component tokens: `--ck-chip-bg` (default
`--ck-color-control`), `--ck-chip-fg` (`--ck-color-fg`), `--ck-chip-border-color` (`--ck-color-control-border`),
`--ck-chip-selected-bg` (`--ck-color-primary`), `--ck-chip-selected-fg` (`--ck-color-on-primary`), `--ck-chip-radius`
(`--ck-radius-full`) and `--ck-chip-group-gap` (`--ck-space-2`). Keep the selected fill 3:1 from the unselected one.

Global element styles: an unlayered `button { border: …; background: … }` or `svg { inline-size: 100% }` beats the
layered chip. Keep them off the chip (`button:not(.ck-chip)`) or put resets in a layer declared before ckui:
`@layer reset, ckui;`.

## Field and input

```ts
import { CK_FIELD_IMPORTS } from '@ckui/core/field';
```

```html
<ck-field>
  <label>Email</label>
  <span ckPrefix>@</span>
  <input ckInput type="email" autocomplete="email" formControlName="email" />
  <button ckButton ckSuffix variant="ghost" iconOnly size="sm" aria-label="Clear">...</button>
  <ck-hint>We only use it to send the receipt.</ck-hint>
  <ck-error>Enter a valid email.</ck-error>
</ck-field>
```

`ck-field` wraps one control, a native `<input>` or `<textarea>` marked with `ckInput`, a `ck-stepper` or a `ck-select`, and draws
the box, a floating `<label>`, a hint, an error and prefix and suffix content. It works with Reactive Forms,
`ngModel` and Signal Forms (`[formField]`); `ckInput` has no value accessor, the control stays native, so
`type`, `inputmode`, `enterkeyhint`, `autocomplete` and every other attribute stay on it. Inputs of
`ck-field`: `size` (default from `provideCkui`), `labelFloat` (`'auto' | 'always'`) and `invalid`
(`undefined` follows the control, `true` or `false` forces the state). Inputs of `textarea[ckInput]`:
`autosize`, `minRows` and `maxRows`. `ckInput` without a field draws its own box and takes a `size`.

The field links `<label for>` and the control `id`, merges the hint and error ids into
`aria-describedby` (your own tokens stay), sets `aria-invalid` while errors show and `aria-required`
for a required control, and puts the errors in one polite live region. A `<ck-error>` stays hidden
until the control is invalid and touched, or its form was submitted. The label floats while the
control is focused, has a value, a placeholder or an autofilled value, is a native date or time
control or a `ck-stepper` (the label stays floated there), or the field has a prefix. Under a coarse pointer the control is 44px high and its text is
at least 16px. Component tokens: `--ck-field-radius`, `--ck-field-bg`, `--ck-field-border-color`.

Linting: angular-eslint's `label-has-associated-control` flags `<ck-field><label>…</label><input ckInput>`
because the link is made at runtime. Either write `for` and `id` yourself (the field keeps both) or turn
the rule off for templates that use `ck-field`.

Global element styles: your own unlayered rules such as `input { font: … }` beat the layered field,
by design. Put resets in a layer declared before ckui: `@layer reset, ckui;`.

## Segmented control

```ts
import { CK_SEGMENTED_IMPORTS } from '@ckui/core/segmented';
```

```html
<ck-segmented aria-label="Calendar view" [(value)]="view">
  <ck-segment value="day">Day</ck-segment>
  <ck-segment value="week">Week</ck-segment>
  <ck-segment value="month">Month</ck-segment>
</ck-segmented>
```

`ck-segmented` is one radio group of mutually exclusive options (`CkSegmented`, `CkSegment`). It is a
single tab stop; the arrow keys move and select (Left and Right swap in right-to-left text), `Home` and
`End` go to the first and last enabled segment, `Space` selects. It works with Reactive Forms,
`ngModel` and Signal Forms (`[formField]`) and with `[(value)]` on its own. Inputs of `ck-segmented`:
`value` (`T | null`; `null` selects nothing and hides the indicator), `size` (default from `provideCkui`),
`disabled` and `fullWidth`. Inputs of `ck-segment`: `value` (required) and `disabled`. A segment holds
text, a direct `svg` child (an icon, shown before the text), or both; font-icon elements land in the label. The group needs an `aria-label` or
`aria-labelledby`, and an icon-only segment needs an `aria-label` (development builds warn about both).

The group is as tall as the control height of its size and every segment is that tall to hit (44px for
`sm` and `md` under a coarse pointer, 60px at `xl`). The selected segment is marked by a raised indicator
with its own 3:1 border, not by colour alone, and it slides to a new selection over
`--ck-duration-normal` (not under reduced motion, and not when it first appears). A segment is as wide
as an equal share of the group or its label (with icon and padding), whichever is larger, so a long
label never cuts a short neighbour's share: its column grows and the others shrink. Only when the
labels at their natural width cannot fit together does the group switch to equal columns and cut the
labels with an ellipsis (the full text stays in the accessible name); it never overflows its
container, and goes back to content widths as soon as there is room, also when only a label, the size or a loading font changes. Component tokens:
`--ck-segmented-bg`, `--ck-segmented-border-color`, `--ck-segmented-fg`,
`--ck-segmented-indicator-bg`, `--ck-segmented-indicator-fg`, `--ck-segmented-radius`,
`--ck-segmented-padding` (the gap around the indicator) and `--ck-segmented-padding-inline`
(horizontal padding of a segment, for a tighter control; the size's control padding by default).

Global element styles: a global `:focus-visible { outline: … }` beats the layered control and draws a
second ring on the segment itself. Keep it off the segments (`:focus-visible:not(.ck-segment)`) or put
resets in a layer declared before ckui: `@layer reset, ckui;`.

## Select

```ts
import { CK_SELECT_IMPORTS } from '@ckui/core/select';
```

```html
<ck-field>
  <label>Target</label>
  <ck-select formControlName="kind" placeholder="Pick one">
    <ck-option value="ftp">% FTP</ck-option>
    <ck-option value="watt">Watts</ck-option>
    <ck-option value="level">Level</ck-option>
    <ck-option value="free" disabled>Free</ck-option>
  </ck-select>
  <ck-hint>How the interval's target is measured.</ck-hint>
</ck-field>
```

`ck-select` is a single-choice dropdown (`CkSelect`, `CkOption`, `CkOptgroup`, `CkSelectValue`; a form control for
Reactive Forms, `ngModel` and Signal Forms). It is the WAI-ARIA select-only combobox: a native
`<button role="combobox">` that opens a `role="listbox"` under it, so a field's `<label for>` names it, `disabled` and
`<fieldset disabled>` work, and focus stays on the button while the arrow keys move a highlight
(`aria-activedescendant`). Inputs of `ck-select`: `value` (`T | null`; a value no option has shows the placeholder and
is kept), `placeholder`, `compareWith` (default `Object.is`, never called with `null`), `filter`, `filterWith`, `size`
(the field's, else the one from `provideCkui`) and `disabled`. Inputs of `ck-option`: `value` (required), `disabled` and
`id`. `ck-optgroup` takes `label` and `disabled`. Name the select with `aria-label` or `aria-labelledby` on `ck-select`
(they are inputs and move onto the button, like `aria-describedby`; bind them as `[aria-label]`), a wrapping `<label>`,
or a `ck-field`; development builds warn without a name.

Keys: closed, `ArrowDown`, `Enter`, `Space` and `Alt+ArrowDown` open on the selected option, `ArrowUp` opens on the selected
or last, `Home` and `End` on the first and last, and typing letters selects the matching option without opening. Open,
`ArrowDown` / `ArrowUp` move without wrapping, `Home` / `End`, `PageUp` / `PageDown` move by 10, typing jumps ahead (letters
typed within 500 ms make one search, the same letter again cycles), `Enter` / `Space` / `Alt+ArrowUp` select and close,
`Escape` closes without a change, and `Tab` selects the highlighted option and moves on. Disabled options are skipped.

What is inside `ck-option` is its row in the list; the button shows its text (a space between neighbouring elements,
`aria-hidden` parts left out). `<ng-template ckSelectValue let-option>` draws the selected option on the button instead:
`option.value` and `option.text`. Long text wraps in the list and is cut with an ellipsis on the button. The options are
projected into the open list, so the closed select still reads the text of the selected one.

`filter` puts a search field at the top of the list (`role="combobox"`, `aria-autocomplete="list"`, named after the select
and "Search"). Focus moves into it; typing hides the options that do not contain the text, ignoring case and accents, and
groups without a match; no match shows a "No results" row. `filterWith(option, query)` replaces the match. The result count is
announced politely 500 ms after typing stops, never when the list opens. In the field `Home` and `End` move the caret;
`ArrowUp`, `ArrowDown`, `PageUp`, `PageDown`, `Enter`, `Escape` and `Tab` work as in the list. The text clears when the list
closes. New labels: `search`, `resultCount` (`'{count} results'`) and `resultCountOne` (`'{count} result'`, used where `Intl.PluralRules` for the locale says `one`).

Where there is room the list is a popover under the button (it flips above, stays inside the viewport and is at least
as wide as the button); on a narrow viewport with a coarse pointer, when it opens, it is a bottom sheet titled with the
select's name, with full-width rows of at least 44px (60px at `xl`) and a check mark on the selected one. Inside a `ck-field`
the select is the field's control: the field draws the box, the floating label (it floats while a value, a placeholder or
focus is there), the hint and the error, and the select draws no border or fill of its own. The control is touched when
focus has left the button and the list together.

Component tokens: `--ck-select-bg`, `--ck-select-border-color` and `--ck-select-radius` (the standalone button; falling back
to the control tokens), `--ck-listbox-bg`, `--ck-listbox-radius`, `--ck-listbox-shadow`, `--ck-listbox-max-height` (20rem),
`--ck-option-bg-active`, `--ck-option-bg-selected` and `--ck-option-fg-selected`. The list is drawn in the overlay container,
outside the select, so set the list and option tokens on `:root` or a theme selector, not on a wrapper. The highlighted
option has a fill and a bar at the inline start, the selected one a check mark, so neither relies on colour alone; in
forced colors the highlight is `Highlight` on `HighlightText`.

Global element styles: an unlayered `button { border: … }` or `ck-option { padding: … }` beats the layered parts. Keep them off
the select (`button:not(.ck-select__trigger)`) or put resets in a layer declared before ckui: `@layer reset, ckui;`.

## Menu

```ts
import { CK_MENU_IMPORTS } from '@ckui/core/menu';
```

```html
<button ckButton variant="ghost" [ckMenuTrigger]="rowMenu" aria-label="Actions for Sweet Spot">
  …
</button>
<ng-template #rowMenu>
  <ck-menu>
    <button ckMenuItem (click)="start()">Start</button>
    <button ckMenuItem (click)="edit()">Edit</button>
    <ck-menu-divider />
    <button ckMenuItem tone="danger" (click)="remove()">Delete</button>
  </ck-menu>
</ng-template>
```

`ck-menu` is a list of actions behind a button, the WAI-ARIA menu button (`CkMenuTrigger`, `CkMenu`, `CkMenuItem`,
`CkMenuItemIcon`, `CkMenuDivider`). `[ckMenuTrigger]` goes on a native `<button>` (development builds warn about any other
element and about a button without a name) and works together with `ckButton`. It sets `aria-haspopup="menu"`,
`aria-expanded` and, while open, `aria-controls`; values you set yourself on those attributes are given back, and an id you
set is never replaced (a button without one gets an id while the menu is open). It opens on a click, `Enter`, `Space`,
`ArrowDown` (first item) and `ArrowUp` (last item); a second click closes it. `(menuOpened)` and `(menuClosed)` report each
round, and `#t="ckMenuTrigger"` gives `open()`, `close()` and the `isOpen` signal. Items are `button[ckMenuItem]`
(`role="menuitem"`) with the inputs `disabled` (focusable but inert, `aria-disabled`, never the native attribute) and
`tone` (`'default'` or `'danger'`); a leading `[ckMenuItemIcon]` is hidden from assistive technology.

Keys: `ArrowDown` / `ArrowUp` move and wrap (disabled items included), `Home` / `End`, typing jumps ahead (letters typed
within 500 ms make one search, the same letter again cycles), `Enter` / `Space` activate, `Escape` closes and returns focus
to the button, and `Tab` / `Shift+Tab` close the menu and move on from the button. Activating an item closes the menu and
returns focus to the button first, then your `(click)` runs, so a handler that opens a `CkDialog` finds a quiet page and the
dialog gives focus back to the button.

Where there is room the menu is a popover under the button (at least 12rem wide, not matched to the button; it flips above and
stays inside the viewport); on a narrow viewport with a coarse pointer, when it opens, it is a bottom sheet titled with the
button's name, with full-width rows of at least 44px and a **Cancel** row after a divider. Cancel is a plain button after the
menu, not an item, and Tab reaches it; its text is the new label `cancel` (`'Cancel'`). Swipe, backdrop and `Escape` close too.

Component tokens: `--ck-menu-bg`, `--ck-menu-radius`, `--ck-menu-shadow`, `--ck-menu-min-width` (12rem),
`--ck-menu-max-height` (20rem), `--ck-menu-item-bg-active` and `--ck-menu-item-fg-danger` (falls back to
`--ck-color-danger-fg`, 4.5:1 in both themes). The menu is drawn in the overlay container, outside the button, so set them on
`:root` or a theme selector, not on a wrapper. The focused item has a fill and a bar at the inline start; in forced colors it is
`Highlight` on `HighlightText` and a danger item is `CanvasText`, so let its text or icon say what it does. Nothing animates
under reduced motion.

Global element styles: an unlayered `button { padding: … }` beats the layered rows. Keep them off the menu
(`button:not(.ck-menu-item):not(.ck-menu-panel__cancel)`) or put resets in a layer declared before ckui: `@layer reset, ckui;`.

## Badge

```ts
import { CK_BADGE_IMPORTS } from '@ckui/core/badge';
```

```html
<ck-badge tone="success" dot>Connected</ck-badge>
<ck-badge tone="danger">
  <svg
    ckBadgeIcon
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M8 3v6M8 12.5v.5" />
  </svg>
  Upload failed
</ck-badge>
```

`ck-badge` is a small, non-interactive status pill (`CkBadge`, `CkBadgeIcon`). Inputs: `tone` (`neutral`
default, `success`, `warning`, `danger`), `dot` (a leading dot in the text colour) and `size` (`md`, a 1.5rem
pill, default; `sm`, 1.25rem, for dense lists). `ckBadgeIcon` on a projected `svg` makes it the leading icon,
drawn one em wide and hidden from assistive technology. The badge never wraps: text that does not fit its
container is cut with an ellipsis.

A badge has no role and is not a live region. The text has to state the status, since a dot, an icon or a
colour alone says nothing to a screen reader, and development builds warn about a badge without text. When a
change must be heard, announce it yourself, for instance in a `role="status"` element or a toast. Component
tokens: `--ck-badge-bg`, `--ck-badge-fg`, `--ck-badge-dot` (the dot's own colour, default the text colour; a coloured dot is decoration, so the text must still state the status) and `--ck-badge-radius` (they apply to every tone; scope them by `.ck-badge--<tone>` to restyle one tone).

Global element styles: a global rule such as `span { overflow: visible }` (no truncation) or
`svg { inline-size: 100% }` (a huge icon) beats the layered badge. Scope it away from the badge or put
resets in a layer declared before ckui: `@layer reset, ckui;`.

## Progress

```ts
import { CkProgress } from '@ckui/core/progress';
```

```html
<ck-progress aria-label="Upload" [value]="percent()" />
<ck-progress
  aria-label="Workout"
  [value]="step()"
  [max]="7"
  [valueText]="'Step ' + step() + ' of 7'"
/>
<ck-progress aria-label="Connecting" [value]="null" />
```

`ck-progress` is a horizontal progress bar (`CkProgress`, `role="progressbar"`). Inputs: `value` (a number
from 0 to `max`; below 0 counts as 0 and above `max` as `max`; `null`, `undefined`, `NaN` or any non-number
shows the indeterminate bar without `aria-valuenow`), `max` (default 100; anything that is not a finite number
above 0 counts as 100) and `valueText` (`aria-valuetext`, e.g. "Step 2 of 7"). The bar needs an `aria-label`
or `aria-labelledby` (development builds warn without one) and is not a live region: announce milestones
yourself.

The fill grows with a transform from the start edge (mirrored in right-to-left text) over
`--ck-duration-normal`, and not at all under `prefers-reduced-motion`, where the indeterminate bar is a still,
half-width fill. In forced colors the track gets an outline and the fill is `Highlight`. Component tokens:
`--ck-progress-track`, `--ck-progress-fill`, `--ck-progress-thickness` and `--ck-progress-radius`; keep the
fill at 3:1 against the track.

## Slider

```ts
import { CkSlider } from '@ckui/core/slider';
```

```html
<ck-slider
  aria-label="Grade"
  unit="%"
  showValue
  [min]="-10"
  [max]="20"
  [step]="0.5"
  [(value)]="grade"
  (valueCommit)="bike.setGrade($event)"
/>
```

`ck-slider` picks one number in a range (`CkSlider`, a form control for Reactive Forms, `ngModel` and Signal Forms).
The value is a `number` or `null`. Inputs: `min` (0), `max` (100), `step` (1, counted from `min`; it also sets the
fraction digits), `largeStep` (Page Up/Down, default 10 steps, at most the whole range), `unit` (`%` attaches to the
number, any other unit follows after a space), `valueText` (a function that writes the value text instead),
`showValue` (draws the value text next to the track, hidden from assistive technology), `size` and `disabled`.

The thumb is a custom element with `role="slider"` and the only tab stop. Name it with `aria-label` or
`aria-labelledby` on `ck-slider` (they are inputs and move onto the thumb, like `aria-describedby`; bind them as
`[aria-label]`); a wrapping `<label>` cannot name it, and development builds warn without a name. Arrow keys step
(Left and Right swap in right-to-left text), Page Up/Down move by `largeStep`, Home/End jump to `min`/`max`. A press
on the track or the thumb moves the value to the pointer and captures it, so a drag may leave the control; on a touch
screen the value moves with the first move or on lift, so a vertical swipe still scrolls the page.

The value is written while the thumb moves. `(valueCommit)` fires once when a change by the user ends, with the new
value: at pointer release, and for the keyboard when the key is released (a held key is one commit), or when focus
leaves while a key is down. It does not fire when the value ends where it started, and never for a value written by
the form. A value from the form outside the range or off the step is shown clamped and snapped and not written back;
`null` shows the thumb at `min` with an empty fill. A `min` above `max` counts as `max = min`, and a `step` that is
0, negative or not a number counts as 1; development builds warn about both.

The control is as high as the control height of its size (44px or more on a coarse pointer, 60px at `xl`), all of it
the hit area of the track; the thumb is drawn at 1 to 1.75rem and has a hit area of at least 24px, 44px on a coarse
pointer. Component tokens: `--ck-slider-track`, `--ck-slider-fill`, `--ck-slider-thumb-bg`, `--ck-slider-thumb-border`
(the 2px ring that keeps the thumb apart from the fill; keep it 3:1 against both) and `--ck-slider-thickness`. In
forced colors the rail has a `CanvasText` border, the fill is `Highlight` and the thumb is `Canvas` with a
`ButtonText` border; under reduced motion the pressed thumb does not scale.

Global element styles: an unlayered `* { border: 0 }` beats the layered rail and thumb and removes their borders. Keep
it off the slider (`:not(.ck-slider__rail, .ck-slider__thumb)`) or put resets in a layer declared before ckui:
`@layer reset, ckui;`.

## Stepper

```ts
import { CkStepper } from '@ckui/core/stepper';
```

```html
<ck-stepper aria-label="FTP" unit="W" [min]="50" [max]="600" [step]="5" [(value)]="ftp" />
<ck-stepper
  aria-label="FTP"
  decrementLabel="FTP minus 5"
  incrementLabel="FTP plus 5"
  [formControl]="ftp"
/>
```

`ck-stepper` is a number field with a minus and a plus button (`CkStepper`, a form control for Reactive Forms,
`ngModel` and Signal Forms). The value is a `number` or `null`. Inputs: `min`, `max`, `step` (default 1, counted
from `min`; it also sets the fraction digits), `largeStep` (Page Up/Down, default 10 steps), `unit` (text after the
value, read as part of the value text: "250 W"), `size`, `readonly`, `disabled`, `decrementLabel` and
`incrementLabel` (per-instance names for the buttons; the defaults come from the labels token).

The value is a real text input with `role="spinbutton"` and the only tab stop; the buttons are outside the tab
order. Name it with `aria-label` or `aria-labelledby` on `ck-stepper` (they are inputs and move onto the input
element, like `aria-describedby` for a hint or an error; bind them as `[aria-label]`) or wrap it in a `<label>`;
development builds warn without a name. The input uses `inputmode="decimal"`, and `text` when `min` is below 0. Arrow
Up/Down step, Page Up/Down move by `largeStep`, Home/End jump to `min`/`max` when set. Typed text is read on Enter or
blur: it is parsed with the locale (`LOCALE_ID`; both `.` and `,` count as a decimal mark), clamped, snapped to the
step, and text that is no number goes back to the last value. An empty field is `null`; from `null` the first arrow
or button press starts at `min`, else at 0. A held button repeats after 400 ms, every 80 ms, and by five steps after
two seconds; it stops on release, on leaving the button and at a limit. A `min` above `max` pins the value to `min`,
and a `step` that is 0, negative or not a number counts as 1; development builds warn about both. `(valueChange)`
reports every write to the value: each step of a held button, and a write from a form (`setValue`, `reset`) too;
a `[value]` binding from the parent does not emit.

Inside a `ck-field` the stepper is the field's control: the field draws the box, the floating label (always
floated), the hint and the error, names the input with the `<label>` and adds the hint and error ids and
`aria-invalid` / `aria-required` to it. The stepper then draws no border or background of its own, takes the
field's `size` unless it sets one, and its buttons sit at the edges of the box.

```html
<ck-field>
  <label>FTP</label>
  <ck-stepper formControlName="ftp" [min]="50" [max]="600" [step]="5" unit="W" />
  <ck-hint>Your functional threshold power.</ck-hint>
  <ck-error>Between 50 and 600 W.</ck-error>
</ck-field>
```

The buttons are squares of the control height (44px or more on a coarse pointer, 60px at `xl`). Component tokens:
`--ck-stepper-bg`, `--ck-stepper-border-color`, `--ck-stepper-radius` and `--ck-stepper-value-width` (default: as
wide as the formatted `min` and `max`).

Global element styles: an unlayered `button { border: … }` or `input { … }` beats the layered parts, and a global
`:focus-visible { outline: … }` draws a second ring on the input. Keep them off the stepper
(`button:not(.ck-stepper__button)`) or put resets in a layer declared before ckui: `@layer reset, ckui;`.

## Switch

```ts
import { CK_SWITCH_IMPORTS } from '@ckui/core/switch';
```

```html
<ck-switch [(value)]="autoUpload">
  Auto-upload
  <ck-hint>Uploads every finished ride to Strava.</ck-hint>
</ck-switch>
<ck-switch aria-label="Audio cues" labelPosition="end" [formControl]="audio" />
```

`ck-switch` is an on/off switch with a label (`CkSwitch`, a form control for Reactive Forms, `ngModel` and Signal
Forms; `CK_SWITCH_IMPORTS` is `[CkSwitch, CkHint]`). The value is a `boolean`, off by default; `null` from a
form counts as off. Inputs: `size` (`sm`, `md`, `lg`, `xl`, default from `provideCkui`), `disabled`, `labelPosition`
(`start`, the default, puts the text first and the switch at the end of the row; `end` puts the switch first) and
`aria-label` / `aria-labelledby` / `aria-describedby` (inputs that move onto the input element; bind them as
`[aria-label]`). `(valueChange)` reports every write to the value: a user change, and a write
from a form (`setValue`, `reset`) too; a `[value]` binding from the parent does not emit. The control is touched when
focus leaves it.

The row is a `<label>` around one native `<input type="checkbox" role="switch">`, so the checked state, Space and a
click on the text, the hint or the switch all work natively. The projected text names the switch; a
`<ck-hint>` (from `@ckui/core/form`, also part of `CK_FIELD_IMPORTS`) is its description (it takes an `id` input, else it gets one) and is part of the row, so a click on it
toggles too. A switch without visible text needs an `aria-label` or `aria-labelledby`; development builds warn
otherwise. The state is shown by the thumb's position, never by colour alone, and the thumb moves to the other side
in right-to-left text. `<fieldset disabled>` blocks and styles the switch like `disabled`.

The row is at least the control height of its size (44px or more on a coarse pointer, 60px at `xl`); the track is
2.25 × 1.25rem at `sm`, 2.75 × 1.5rem at `md`, 3.25 × 1.75rem at `lg` and 4 × 2.25rem at `xl`. Component tokens:
`--ck-switch-track` (off, default `--ck-color-control`), `--ck-switch-track-on` (default `--ck-color-primary`),
`--ck-switch-thumb` (off, default `--ck-color-fg-muted`), `--ck-switch-thumb-on` (default `--ck-color-on-primary`),
`--ck-switch-border-color` (off track, default `--ck-color-control-border`), `--ck-switch-radius` and
`--ck-switch-thumb-gap`. Keep the on track 3:1 from the off track. In forced colors the track border and thumb are
`CanvasText` and the on track is `Highlight`; motion stops under `prefers-reduced-motion`.

Global element styles: an unlayered `input { … }` or `label { … }` beats the layered parts. Keep them off the switch
(`input:not(.ck-switch__input)`) or put resets in a layer declared before ckui: `@layer reset, ckui;`.

## Tabs

```ts
import { CK_TABS_IMPORTS } from '@ckui/core/tabs';
```

```html
<ck-tabs [(value)]="source">
  <ck-tab-list aria-label="Workout source">
    <ck-tab value="predefined">Predefined</ck-tab>
    <ck-tab value="mine">Mine</ck-tab>
    <ck-tab value="shared">Shared</ck-tab>
  </ck-tab-list>
  <ck-tab-panel>One list for the selected source.</ck-tab-panel>
</ck-tabs>
```

`ck-tabs` switches between views on one page: underlined tabs and the panel of the selected one. It is not a
form control and not navigation between pages (`CkTabs`, `CkTabList`, `CkTab`, `CkTabPanel`, `CkTabContent`;
`CK_TABS_IMPORTS` is all five). Inputs of `ck-tabs`: `value` (two-way; `null` shows the first enabled tab),
`activation` (`auto`, the default, selects a tab as soon as the arrow keys focus it; `manual` waits for Enter or
Space), `size` (`sm`, `md`, `lg`, `xl`, default from `provideCkui`) and `fullWidth` (the tabs share the row
equally). `ck-tab` takes a required `value`, `disabled` and `id`; `ck-tab-panel` takes an optional `value`, `id` and
`tabStop`. `(valueChange)` fires when the user picks a tab.

A panel with a `value` belongs to the tab of that value and is hidden (`hidden` attribute, content kept) unless
that tab is selected; a development build warns about a panel whose value matches no tab. A panel without a
`value` is shared: every tab points at it with `aria-controls`, and it is labelled by whichever tab is selected.
Put an `<ng-template ckTabContent>` inside a panel to create its content only while the panel is shown and destroy
it when it is hidden. Lazy content in a shared panel lives on across tab switches: the panel stays shown, so it is
created once.

A `value` of `null`, one no tab has, or one that names a disabled tab shows the first enabled tab. That is only
reflected: the model is written when the user picks a tab, never for the implicit default, and tabs may be added
and removed at any time (removing the selected one shows the first tab). Values are compared with `Object.is`
and must not be `null`.

The row follows the WAI-ARIA tabs pattern: `role="tablist"` (it needs an `aria-label` or `aria-labelledby`;
development builds warn without one), `role="tab"` with `aria-selected`, `aria-controls` and a roving `tabindex`
(one tab stop, on the selected tab), and panels with `role="tabpanel"`, `aria-labelledby` and `tabindex="0"`. The panel is a tab stop so its content can be reached; when the content starts
with a focusable element (a list of buttons or links) set `[tabStop]="false"` and the panel has no `tabindex`, so Tab goes
from the selected tab straight to that element. There is no automatic detection. A static `tabindex` other than `0` on the
element is kept as written.
Keys: `ArrowRight` / `ArrowLeft` move between enabled tabs and wrap (swapped in right-to-left text), `Home` and
`End` jump, and `Enter` or `Space` select the focused tab; with `activation="auto"` the arrow keys, `Home` and
`End` select too. A disabled tab is skipped by the arrow keys (`tabindex="-1"`, never the tab stop). When the tabs do not fit, the row scrolls
sideways inside itself (the page never does), keeps the selected and the focused tab in view and cuts a label
wider than the row with an ellipsis. A fine pointer keeps a thin scrollbar (a plain wheel does not scroll a
horizontal row); touch hides it.

Each tab is at least the control height of its size (44px or more on a coarse pointer, 60px at `xl`). The selected
tab is marked by an underline, a heavier weight and the stronger text colour, never by colour alone; keep a custom
underline 3:1 from the page. The focus ring is drawn inside the tab on keyboard focus only. In forced colors the
underline is `Highlight`, the selected text and the line under the row are `CanvasText`, and a disabled tab is
`GrayText`; the underline grows in over `--ck-duration-fast` and not at all under `prefers-reduced-motion`.

Component tokens: `--ck-tabs-fg` (unselected text, default `--ck-color-fg-muted`), `--ck-tabs-fg-selected`
(default `--ck-color-fg`), `--ck-tabs-indicator` (underline, default `--ck-color-primary`),
`--ck-tabs-indicator-thickness` (default `--ck-space-1`), `--ck-tabs-border-color` (the 1px line under the row,
default `--ck-color-border-subtle`), `--ck-tabs-gap` (between tabs, default `0`), `--ck-tabs-padding-inline`
(default the control padding of the size), `--ck-tabs-font-weight` (unselected, default `--ck-font-weight-medium`)
and `--ck-tabs-font-weight-selected` (default `--ck-font-weight-semibold`). Set the two weights equal and no tab
changes width when it is selected.

Global element styles: an unlayered `ck-tab-panel { display: … }` keeps hidden panels on screen (use
`ck-tab-panel:not([hidden])`), and a global `:focus-visible { outline: … }` adds a second ring on the tab itself
(use `:focus-visible:not(.ck-tab)`). Or put resets in a layer declared before ckui: `@layer reset, ckui;`.

## Toast

```ts
import { CkToast } from '@ckui/core/toast';

const toast = inject(CkToast);
const ref = toast.show({
  tone: 'success',
  title: 'Saved',
  message: 'Your changes are stored.',
  action: { label: 'Undo', run: () => restore() },
});
const reason = await ref.dismissed; // 'timeout' | 'user' | 'action' | 'replaced' | 'programmatic'
```

`CkToast.show()` returns a `CkToastRef` (`dismiss()`, `update(partial)`, `dismissed`); `dismissAll()` closes
everything. Options: `message` (plain text), `title`, `tone` (`neutral`, `success`, `warning`, `danger`),
`action` (`{ label, run }`), `duration` (milliseconds) and `id`. A toast closes after 5 seconds, except one with
an `action` or the tone `danger`, which stays until dismissed unless you give a `duration`. The timer pauses
while the pointer is over the toast, while focus is inside it and while the page is hidden. Showing a toast with
the `id` of an open one replaces it in place and restarts the timer; the earlier ref reports `replaced`.

Every toast has a dismiss button and can be swiped away sideways. Each one is announced to screen readers
(`danger` assertively, the others politely, as title and message); changed text is announced again, nothing is
announced on the server. The toasts live in one `section` that is a direct child of `body`, exempt from `inert`
and painted above dialogs, so they stay clickable while a dialog is open.

`provideCkToast({ position, align, max, size })` is optional: `position` is `bottom` (default) or `top`, `align`
is `center` on a narrow screen and `end` otherwise unless you set it, `max` (default 3) is how many show at once
(the rest queue), and `size` is the size of the action and dismiss buttons (default from `provideCkui`; `xl` is
60px). The newest toast is always nearest the screen edge; safe-area insets are respected, and a narrow screen
gets the full width minus a `1rem` gutter. A toast that holds focus when it closes hands focus to the next toast,
else back to where it came from. Component tokens: `--ck-toast-bg` and `--ck-toast-fg` (neutral, success and
warning), `--ck-toast-danger-bg` and `--ck-toast-danger-fg`, `--ck-toast-radius`, `--ck-toast-max-width` and
`--ck-toast-shadow`.

Global element styles: a global `button:focus-visible { outline: … }` beats the layered toast buttons. Put
resets in a layer declared before ckui: `@layer reset, ckui;`.

## Dialog

```ts
import { CK_DIALOG_DATA, CK_DIALOG_IMPORTS, CkDialog, CkDialogRef } from '@ckui/core/dialog';

@Component({
  imports: [CK_DIALOG_IMPORTS],
  template: `
    <h2 ckDialogTitle>Delete this workout?</h2>
    <p ckDialogDescription>This cannot be undone.</p>
    <ck-dialog-actions>
      <button ckDialogInitialFocus ckDialogClose="keep">Keep it</button>
      <button ckDialogClose="delete">Delete</button>
    </ck-dialog-actions>
  `,
})
class ConfirmDelete {}

const ref = inject(CkDialog).open<ConfirmDelete, void, 'keep' | 'delete'>(ConfirmDelete, {
  role: 'alertdialog',
});
const answer = await ref.closed; // undefined when dismissed
```

`CkDialog.open(componentOrTemplate, config)` returns a `CkDialogRef` (`close(result?)`, `closed`); `closeAll()`
closes everything. The content injects `CK_DIALOG_DATA` and `CkDialogRef`. Config: `data`, `role` (`dialog` or
`alertdialog`), `width` (`sm`, `md`, `lg`: 24, 32 or 48rem), `dismissible` (Escape, backdrop and swipe; default
`true`), `closeButton`, `mode` (`auto`, `modal`, `sheet`), `fullHeight`, `injector` and `ariaLabel`. A component dialog sees the providers of the app root; pass `injector: inject(Injector)` from the opener for route-level or component-level ones (`CK_DIALOG_DATA` and `CkDialogRef` are provided on top). `closed` resolves after
the dialog has left the screen, with the first result passed to `close()`; Escape, the backdrop, a swipe and
destroying the app resolve it with `undefined`.

The same dialog can be declared in a template: `<ck-dialog [(open)]="open" (closed)="onClosed($event)">` with one
`<ng-template>` inside, which is rendered only while the dialog is open. Building blocks: `ckDialogTitle` (names the
dialog), `ckDialogDescription`, `ck-dialog-body` (the only part that scrolls), `ck-dialog-actions`,
`ckDialogClose="result"` and `ckDialogInitialFocus`. Initial focus goes to the marked element, else the first
tabbable one of the content (never the close button), else the panel. Focus is trapped, the page behind is inert and
focus returns to the opener on close.

On a narrow screen with a coarse pointer (`mode: 'auto'`) the dialog is a bottom sheet as tall as its content, with a
swipe handle, stacked full-width actions and the safe-area inset; `fullHeight` makes it as tall as the screen allows.
Component tokens: `--ck-dialog-bg`, `--ck-dialog-radius`, `--ck-dialog-padding`, `--ck-dialog-max-width` and
`--ck-dialog-shadow`.

Global element styles: a global `h2`, `p` or `button:focus-visible` rule beats the layered dialog styles; scope it
with `:not(.ck-dialog__title)`, `:not(.ck-dialog__description)` and `:not(.ck-button)`, or put resets in a layer
declared before ckui: `@layer reset, ckui;`. A component opened through `CkDialog` must keep its host element a
flex column (the default styles do this); a global `display` on it stops the body from scrolling.

## Drawer

```ts
import { CK_DRAWER_DATA, CK_DRAWER_IMPORTS, CkDrawer, CkDrawerRef } from '@ckui/core/drawer';

@Component({
  imports: [CK_DRAWER_IMPORTS],
  template: `
    <h2 ckDialogTitle>Devices</h2>
    <ck-dialog-body>
      @for (device of data.devices; track device) {
        <button (click)="ref.close(device)">{{ device }}</button>
      }
    </ck-dialog-body>
    <ck-dialog-actions><button ckDialogClose>Cancel</button></ck-dialog-actions>
  `,
})
class DeviceSheet {
  protected readonly data = inject<{ devices: string[] }>(CK_DRAWER_DATA);
  protected readonly ref = inject<CkDrawerRef<string>>(CkDrawerRef);
}

const ref = inject(CkDrawer).open<DeviceSheet, { devices: string[] }, string>(DeviceSheet, {
  side: 'end',
  data: { devices: ['Bike', 'Treadmill'] },
});
const device = await ref.closed; // undefined when dismissed
```

A drawer is a modal panel that slides in from the side of the screen. On a tablet or desktop it is a full-height side
panel; on a narrow screen with a coarse pointer it is the dialog's bottom sheet. It is written with the dialog's
building blocks, which `CK_DRAWER_IMPORTS` re-exports: `ckDialogTitle` (names the drawer), `ckDialogDescription`,
`ck-dialog-body` (the only part that scrolls), `ck-dialog-actions`, `ckDialogClose="result"` and
`ckDialogInitialFocus`.

`CkDrawer.open(componentOrTemplate, config)` returns a `CkDrawerRef` (`close(result?)`, `closed`, `closing`); it is
the ref of `CkDialog`, and `CK_DRAWER_DATA` is the token of `CK_DIALOG_DATA`, so content written for a dialog works in
a drawer. `closeAll()` closes the drawers and leaves dialogs open. Config: `data`, `side` (`start` or `end`, default
`end`: the right edge in a left-to-right page, the left edge in a right-to-left one), `mode` (`auto`, `side`,
`sheet`; `auto` is decided when the drawer opens), `width` (`sm`, `md`, `lg`: 20, 24 or 32rem, never wider than the
screen minus a margin), `role` (`dialog` or `alertdialog`), `dismissible` (Escape and backdrop, and a swipe on a
sheet; default `true`), `closeButton`, `fullHeight` (a sheet as tall as the screen allows), `injector` and
`ariaLabel`. `closed` resolves after the drawer has left the screen, with the first result passed to `close()`;
Escape, the backdrop, a swipe and destroying the app resolve it with `undefined`.

The same drawer can be declared in a template: `<ck-drawer [(open)]="open" side="end" (closed)="onClosed($event)">`
with one `<ng-template>` inside, which is rendered only while the drawer is open.

The drawer is modal like a dialog: `role="dialog"` (or `alertdialog`) with `aria-modal`, a focus trap, an inert page
behind it, Escape and backdrop close when dismissible, and focus returns to the opener. A side panel has no swipe; a
dialog opened from a drawer sits above it. The panel keeps its content out of display cut-outs (safe-area insets),
does not slide under `prefers-reduced-motion` and has a visible border in forced-colors mode.

Component tokens: `--ck-drawer-bg` (panel and grab area; falls back to `--ck-color-surface-raised`),
`--ck-drawer-width` (side panel; falls back to the 20, 24 or 32rem of `width`), `--ck-drawer-padding` (falls back to
`--ck-space-6`, `--ck-space-4` on a sheet) and `--ck-drawer-shadow` (falls back to `--ck-shadow-lg`). The drawer
does not read the `--ck-dialog-*` tokens.

Global element styles: as for the dialog, scope a global `h2`, `p` or `button:focus-visible` rule with
`:not(.ck-dialog__title)`, `:not(.ck-dialog__description)` and `:not(.ck-button)`, or put resets in a layer declared
before ckui: `@layer reset, ckui;`.

## Status

Pre-release. Version 0.1 is in progress and the API is not stable yet.

## Links

- Documentation: https://christophk93.github.io/ckui/
- Source and issues: https://github.com/ChristophK93/ckui

## Licence

MIT
