# ckui

Accessible, themeable Angular components that work equally well on phone and desktop.

- Accessibility first: WAI-ARIA patterns, full keyboard support, WCAG 2.2 AA.
- Mobile and desktop: touch-sized targets, bottom sheets on small screens.
- Themeable with CSS custom properties and plain CSS, no Tailwind or Sass needed.
- Small: one entry point per component, no runtime dependencies besides Angular and the CDK.

## Status

Pre-release. Version 0.1 is in progress and the API is not stable yet.

## Install

```bash
npm install @ckui/core @angular/cdk
```

## Development

Requires Node `^22.22.3`, `^24.15.0` or `>=26` (see `.nvmrc`).

```bash
npm install
npm start               # docs app at http://localhost:4200
npm run build:lib       # build @ckui/core into dist/ckui/core
npm run build:docs      # build the docs app
npm run lint
npm test                # Vitest browser mode (Chromium), library and docs
npm run check           # everything CI runs
```

The first test run needs a browser: `npx playwright install chromium`.

## Contributing

Versions and the changelog are managed with [Changesets](https://github.com/changesets/changesets).
A change that affects the published package needs a changeset:

```bash
npm run changeset
```

Run `npm run check` before opening a pull request.

## Licence

[MIT](./LICENSE)
