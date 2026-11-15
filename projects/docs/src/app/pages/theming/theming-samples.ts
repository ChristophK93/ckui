/** The block of the "Custom theme" section; the docs specs apply it exactly as shown. */
export const CUSTOM_THEME_CSS = `/* your stylesheet, after @ckui/core/styles.css, in no cascade layer */
:root,
[data-ck-theme='dark'] {
  --ck-color-scheme: dark;

  /* surfaces and lines */
  --ck-color-bg: #0b0b0c;
  --ck-color-surface: #161618;
  --ck-color-surface-raised: #161618;
  --ck-color-control: #242427;
  --ck-color-control-border: transparent;
  --ck-color-border: #2f2f33;
  --ck-color-border-subtle: #2f2f33;

  /* hover and pressed overlays: declare them here, they resolve where they are declared */
  --ck-color-surface-hover: color-mix(in oklch, var(--ck-color-fg) 6%, transparent);
  --ck-color-surface-active: color-mix(in oklch, var(--ck-color-fg) 10%, transparent);

  /* text */
  --ck-color-fg: #ffffff;
  --ck-color-fg-muted: #b9b9be;
  --ck-color-fg-disabled: #6e6e75;

  /* a white primary with near-black text on it */
  --ck-color-primary: #ffffff;
  --ck-color-primary-hover: #e4e4e7;
  --ck-color-primary-active: #cfcfd4;
  --ck-color-on-primary: #0b0b0c;
  --ck-color-primary-subtle: #242427;
  --ck-color-primary-fg: #ffffff;

  --ck-color-danger: #ff5a4e;
  --ck-color-danger-hover: #ff766c;
  --ck-color-danger-active: #ff948c;
  --ck-color-on-danger: #0b0b0c;
  --ck-color-danger-subtle: #2c1512;
  --ck-color-danger-fg: #ff6a5f;

  --ck-color-success: #3ddc84;
  --ck-color-on-success: #0b0b0c;
  --ck-color-success-subtle: #12281c;
  --ck-color-success-fg: #3ddc84;

  --ck-color-warning: #f5b800;
  --ck-color-on-warning: #0b0b0c;
  --ck-color-warning-subtle: #2b2410;
  --ck-color-warning-fg: #f5c542;

  /* a thick, high-visibility focus ring; the shorthand is declared here too */
  --ck-color-focus-ring: #ffcc00;
  --ck-focus-ring-width: 3px;
  --ck-focus-ring-offset: 3px;
  --ck-focus-ring: var(--ck-focus-ring-width) solid var(--ck-color-focus-ring);

  /* scrim and shadows */
  --ck-color-backdrop: rgb(0 0 0 / 0.7);
  --ck-shadow-sm: 0 1px 2px rgb(0 0 0 / 0.5);
  --ck-shadow-md: 0 4px 8px -2px rgb(0 0 0 / 0.6), 0 2px 4px -2px rgb(0 0 0 / 0.5);
  --ck-shadow-lg: 0 12px 24px -4px rgb(0 0 0 / 0.65), 0 4px 8px -4px rgb(0 0 0 / 0.55);

  /* shape and type */
  --ck-radius-sm: 4px;
  --ck-radius-md: 10px;
  --ck-control-radius: 10px;
  --ck-font-sans: 'Fira Sans', system-ui, sans-serif;
}`;

/** Code shown on the theming page. Plain text, rendered through interpolation so no escaping is needed. */
export const SAMPLES = {
  importAngularJson: `"styles": [
  "node_modules/@ckui/core/styles/styles.css",
  "src/styles.css"
]`,
  importCss: `@import '@ckui/core/styles.css';`,
  rootClass: `<html lang="en" class="ck-root">`,
  forceTheme: `<!-- the whole page -->
<html class="ck-root" data-ck-theme="dark">

<!-- one section: ck-root repaints its text and background -->
<section class="ck-root" data-ck-theme="light">...</section>`,
  semanticOverride: `/* your stylesheet, after @ckui/core/styles.css */
:root,
[data-ck-theme='light'] {
  --ck-color-primary: var(--ck-green-700);
  --ck-color-primary-hover: var(--ck-green-800);
  --ck-color-primary-active: var(--ck-green-900);
}

/* the dark theme has its own values: override those too */
@media (prefers-color-scheme: dark) {
  :root:not([data-ck-theme='light']) {
    --ck-color-primary: var(--ck-green-400);
    --ck-color-primary-hover: var(--ck-green-300);
    --ck-color-primary-active: var(--ck-green-200);
  }
}
[data-ck-theme='dark'] {
  --ck-color-primary: var(--ck-green-400);
  --ck-color-primary-hover: var(--ck-green-300);
  --ck-color-primary-active: var(--ck-green-200);
}`,
  componentToken: `/* inside the library: read with a fallback, never declared */
border-radius: var(--ck-button-radius, var(--ck-radius-md));

/* in your app: set it anywhere, on the root or on one form */
.checkout {
  --ck-button-radius: var(--ck-radius-full);
}`,
  layerWins: `/* unlayered rules always beat rules inside @layer ckui */
.my-card {
  background: var(--ck-color-surface-raised);
}`,
  customTheme: CUSTOM_THEME_CSS,
  provideCkui: `import { provideCkui } from '@ckui/core';

bootstrapApplication(App, {
  providers: [
    provideCkui({
      size: 'md',
      sheetBreakpoint: 640,
      labels: { close: 'Schließen' },
    }),
  ],
});`,
  labelsSignal: `import { signal } from '@angular/core';
import { CkLabels, provideCkui } from '@ckui/core';

const labels = signal<Partial<CkLabels>>({ close: 'Schließen', loading: 'Lädt' });

provideCkui({ labels });
// later: labels.set({ close: 'Fermer' }) updates every component`,
  labelsFactory: `import { computed, inject } from '@angular/core';

provideCkui({
  // runs in an injection context: inject whatever your i18n library needs
  labels: () => {
    const translator = inject(Translator);
    return computed(() => ({
      close: translator.translate('ui.close'),
      loading: translator.translate('ui.loading'),
      noResults: translator.translate('ui.noResults'),
    }));
  },
});`,
  labelsSubtree: `import { Component, signal } from '@angular/core';
import { CK_DEFAULT_LABELS, CK_LABELS, CkLabels } from '@ckui/core';

@Component({
  providers: [
    {
      provide: CK_LABELS,
      useValue: signal<CkLabels>({ ...CK_DEFAULT_LABELS, close: 'Dismiss' }).asReadonly(),
    },
  ],
})
export class Notifications {}`,
} as const;
