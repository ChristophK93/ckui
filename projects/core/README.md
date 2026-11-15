# @ckui/core

Accessible, themeable Angular components that work equally well on phone and desktop.

## Install

```bash
npm install @ckui/core @angular/cdk
```

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

## Configuration

```ts
import { provideCkui } from '@ckui/core';

bootstrapApplication(App, {
  providers: [
    provideCkui({
      size: 'md', // 'sm' | 'md' | 'lg', default 'md'
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

## Status

Pre-release. Version 0.1 is in progress and the API is not stable yet.

## Links

- Documentation: https://christophk93.github.io/ckui/
- Source and issues: https://github.com/ChristophK93/ckui

## Licence

MIT
