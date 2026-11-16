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

`ck-field` wraps one native `<input>` or `<textarea>` marked with `ckInput` and draws the box, a
floating `<label>`, a hint, an error and prefix and suffix content. It works with Reactive Forms,
`ngModel` and Signal Forms (`[formField]`); there is no value accessor, the control stays native, so
`type`, `inputmode`, `enterkeyhint`, `autocomplete` and every other attribute stay on it. Inputs of
`ck-field`: `size` (default from `provideCkui`), `labelFloat` (`'auto' | 'always'`) and `invalid`
(`undefined` follows the control, `true` or `false` forces the state). Inputs of `textarea[ckInput]`:
`autosize`, `minRows` and `maxRows`. `ckInput` without a field draws its own box and takes a `size`.

The field links `<label for>` and the control `id`, merges the hint and error ids into
`aria-describedby` (your own tokens stay), sets `aria-invalid` while errors show and `aria-required`
for a required control, and puts the errors in one polite live region. A `<ck-error>` stays hidden
until the control is invalid and touched, or its form was submitted. The label floats while the
control is focused, has a value, a placeholder or an autofilled value, is a native date or time
control, or the field has a prefix. Under a coarse pointer the control is 44px high and its text is
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
with its own 3:1 border, not by colour alone. Labels that do not fit are cut with an ellipsis, the full
text stays in the accessible name. Component tokens: `--ck-segmented-bg`, `--ck-segmented-border-color`,
`--ck-segmented-fg`, `--ck-segmented-indicator-bg`, `--ck-segmented-indicator-fg`,
`--ck-segmented-radius` and `--ck-segmented-padding`.

Global element styles: a global `:focus-visible { outline: … }` beats the layered control and draws a
second ring on the segment itself. Keep it off the segments (`:focus-visible:not(.ck-segment)`) or put
resets in a layer declared before ckui: `@layer reset, ckui;`.

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

## Status

Pre-release. Version 0.1 is in progress and the API is not stable yet.

## Links

- Documentation: https://christophk93.github.io/ckui/
- Source and issues: https://github.com/ChristophK93/ckui

## Licence

MIT
