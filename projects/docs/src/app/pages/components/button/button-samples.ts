/** Code shown on the button page. Plain text, rendered through interpolation so no escaping is needed. */
export const SAMPLES = {
  variants: `import { Component } from '@angular/core';
import { CkButton } from '@ckui/core/button';

@Component({
  selector: 'app-actions',
  imports: [CkButton],
  template: \`
    <button ckButton variant="primary">Primary</button>
    <button ckButton>Secondary</button>
    <button ckButton variant="ghost">Ghost</button>
    <button ckButton variant="danger">Danger</button>
  \`,
})
export class Actions {}`,
  sizes: `import { Component } from '@angular/core';
import { CkButton } from '@ckui/core/button';

@Component({
  selector: 'app-sizes',
  imports: [CkButton],
  template: \`
    <button ckButton variant="primary" size="sm">Small</button>
    <button ckButton variant="primary" size="md">Medium</button>
    <button ckButton variant="primary" size="lg">Large</button>
  \`,
})
export class Sizes {}`,
  icons: `import { Component } from '@angular/core';
import { CkButton } from '@ckui/core/button';

@Component({
  selector: 'app-icons',
  imports: [CkButton],
  template: \`
    <button ckButton variant="primary">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M3 8.5l3.5 3.5L13 4.5" />
      </svg>
      Save
    </button>

    <button ckButton iconOnly aria-label="Close">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M4 4l8 8M12 4l-8 8" />
      </svg>
    </button>
  \`,
})
export class Icons {}`,
  loading: `import { Component, signal } from '@angular/core';
import { CkButton } from '@ckui/core/button';

@Component({
  selector: 'app-save',
  imports: [CkButton],
  template: \`
    <button ckButton variant="primary" [loading]="saving()" (click)="save()">Save</button>
  \`,
})
export class Save {
  protected readonly saving = signal(false);

  protected async save(): Promise<void> {
    this.saving.set(true);
    try {
      await fetch('/api/save', { method: 'POST' });
    } finally {
      this.saving.set(false);
    }
  }
}`,
  links: `import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CkButton } from '@ckui/core/button';

@Component({
  selector: 'app-links',
  imports: [CkButton, RouterLink],
  template: \`
    <a ckButton variant="primary" routerLink="/theming">Read the theming guide</a>
    <a ckButton routerLink="/tokens" disabled>Unavailable</a>
  \`,
})
export class Links {}`,
  states: `import { Component } from '@angular/core';
import { CkButton } from '@ckui/core/button';

@Component({
  selector: 'app-states',
  imports: [CkButton],
  template: \`
    <button ckButton variant="primary" disabled>Disabled</button>
    <button ckButton type="submit" form="signup">Submit the sign-up form</button>
  \`,
})
export class States {}`,
  radius: `/* in your app: one button, a whole form or the root */
.checkout {
  --ck-button-radius: var(--ck-radius-full);
}`,
};
