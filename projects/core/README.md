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

## Status

Pre-release. Version 0.1 is in progress and the API is not stable yet.

## Links

- Documentation: https://christophk93.github.io/ckui/
- Source and issues: https://github.com/ChristophK93/ckui

## Licence

MIT
