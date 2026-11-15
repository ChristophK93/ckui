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
