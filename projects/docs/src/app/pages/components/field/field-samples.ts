const EYE = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M1.5 8s2.3-4.5 6.5-4.5S14.5 8 14.5 8s-2.3 4.5-6.5 4.5S1.5 8 1.5 8z" />
            <circle cx="8" cy="8" r="2" />
          </svg>`;

/** A complete component around a template, so every sample compiles as copied. */
function component(
  className: string,
  selector: string,
  template: string,
  options: { signals?: boolean; body?: string } = {},
): string {
  const core = options.signals ? 'Component, signal' : 'Component';
  const indented = template
    .split('\n')
    .map((line) => (line === '' ? '' : `    ${line}`))
    .join('\n');
  return `import { ${core} } from '@angular/core';
import { CK_FIELD_IMPORTS } from '@ckui/core/field';

@Component({
  selector: '${selector}',
  imports: [CK_FIELD_IMPORTS],
  template: \`
${indented}
  \`,
})
export class ${className} {${options.body ? `\n${options.body}\n` : ''}}`;
}

/** Code shown on the field page. Plain text, rendered through interpolation so no escaping is needed. */
export const SAMPLES = {
  basics: component(
    'Name',
    'app-name',
    `<ck-field>
  <label>Full name</label>
  <input ckInput autocomplete="name" />
  <ck-hint>As it appears on your ID.</ck-hint>
</ck-field>`,
  ),
  reactive: `import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CkButton } from '@ckui/core/button';
import { CK_FIELD_IMPORTS } from '@ckui/core/field';

@Component({
  selector: 'app-sign-up',
  imports: [ReactiveFormsModule, CK_FIELD_IMPORTS, CkButton],
  template: \`
    <form [formGroup]="form" (ngSubmit)="submit()">
      <ck-field>
        <label>Email</label>
        <input ckInput type="email" autocomplete="email" formControlName="email" />
        <ck-hint>We only use it to send the receipt.</ck-hint>
        @if (form.controls.email.errors; as errors) {
          <ck-error>
            {{ errors['required'] ? 'Enter your email.' : 'Enter a valid email.' }}
          </ck-error>
        }
      </ck-field>

      <ck-field>
        <label>Password</label>
        <input
          ckInput
          [type]="reveal() ? 'text' : 'password'"
          autocomplete="new-password"
          formControlName="password"
        />
        <button
          ckButton
          ckSuffix
          type="button"
          variant="ghost"
          iconOnly
          size="sm"
          aria-label="Show password"
          [attr.aria-pressed]="reveal()"
          (click)="reveal.set(!reveal())"
        >
          ${EYE}
        </button>
        @if (form.controls.password.errors) {
          <ck-error>Use at least 8 characters.</ck-error>
        }
      </ck-field>

      <ck-field>
        <label>Message</label>
        <textarea ckInput autosize [minRows]="2" [maxRows]="5" formControlName="message"></textarea>
      </ck-field>

      <button ckButton variant="primary" type="submit">Send</button>
    </form>
  \`,
})
export class SignUp {
  protected readonly reveal = signal(false);
  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    message: new FormControl('', { nonNullable: true }),
  });

  protected submit(): void {
    if (this.form.valid) {
      console.log(this.form.getRawValue());
    }
  }
}`,
  template: `import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CkButton } from '@ckui/core/button';
import { CK_FIELD_IMPORTS } from '@ckui/core/field';

@Component({
  selector: 'app-sign-up',
  imports: [FormsModule, CK_FIELD_IMPORTS, CkButton],
  template: \`
    <form #signUp="ngForm" (ngSubmit)="submit(signUp.valid)">
      <ck-field>
        <label>Email</label>
        <input
          ckInput
          type="email"
          name="email"
          autocomplete="email"
          required
          email
          [(ngModel)]="model.email"
          #email="ngModel"
        />
        <ck-hint>We only use it to send the receipt.</ck-hint>
        @if (email.errors; as errors) {
          <ck-error>
            {{ errors['required'] ? 'Enter your email.' : 'Enter a valid email.' }}
          </ck-error>
        }
      </ck-field>

      <ck-field>
        <label>Password</label>
        <input
          ckInput
          [type]="reveal() ? 'text' : 'password'"
          name="password"
          autocomplete="new-password"
          required
          minlength="8"
          [(ngModel)]="model.password"
          #password="ngModel"
        />
        <button
          ckButton
          ckSuffix
          type="button"
          variant="ghost"
          iconOnly
          size="sm"
          aria-label="Show password"
          [attr.aria-pressed]="reveal()"
          (click)="reveal.set(!reveal())"
        >
          ${EYE}
        </button>
        @if (password.errors) {
          <ck-error>Use at least 8 characters.</ck-error>
        }
      </ck-field>

      <ck-field>
        <label>Message</label>
        <textarea
          ckInput
          autosize
          [minRows]="2"
          [maxRows]="5"
          name="message"
          [(ngModel)]="model.message"
        ></textarea>
      </ck-field>

      <button ckButton variant="primary" type="submit">Send</button>
    </form>
  \`,
})
export class SignUp {
  protected readonly reveal = signal(false);
  protected readonly model = { email: '', password: '', message: '' };

  protected submit(valid: boolean | null): void {
    if (valid) {
      console.log(this.model);
    }
  }
}`,
  signal: `import { Component, signal } from '@angular/core';
import { FormField, FormRoot, email, form, minLength, required } from '@angular/forms/signals';
import { CkButton } from '@ckui/core/button';
import { CK_FIELD_IMPORTS } from '@ckui/core/field';

@Component({
  selector: 'app-sign-up',
  imports: [FormField, FormRoot, CK_FIELD_IMPORTS, CkButton],
  template: \`
    <form [formRoot]="signUp">
      <ck-field>
        <label>Email</label>
        <input ckInput type="email" autocomplete="email" [formField]="signUp.email" />
        <ck-hint>We only use it to send the receipt.</ck-hint>
        @if (signUp.email().errors()[0]; as error) {
          <ck-error>
            {{ error.kind === 'required' ? 'Enter your email.' : 'Enter a valid email.' }}
          </ck-error>
        }
      </ck-field>

      <ck-field>
        <label>Password</label>
        <input
          ckInput
          [type]="reveal() ? 'text' : 'password'"
          autocomplete="new-password"
          [formField]="signUp.password"
        />
        <button
          ckButton
          ckSuffix
          type="button"
          variant="ghost"
          iconOnly
          size="sm"
          aria-label="Show password"
          [attr.aria-pressed]="reveal()"
          (click)="reveal.set(!reveal())"
        >
          ${EYE}
        </button>
        @if (signUp.password().invalid()) {
          <ck-error>Use at least 8 characters.</ck-error>
        }
      </ck-field>

      <ck-field>
        <label>Message</label>
        <textarea
          ckInput
          autosize
          [minRows]="2"
          [maxRows]="5"
          [formField]="signUp.message"
        ></textarea>
      </ck-field>

      <button ckButton variant="primary" type="submit">Send</button>
    </form>
  \`,
})
export class SignUp {
  protected readonly reveal = signal(false);
  protected readonly model = signal({ email: '', password: '', message: '' });
  protected readonly signUp = form(
    this.model,
    (path) => {
      required(path.email);
      email(path.email);
      required(path.password);
      minLength(path.password, 8);
    },
    {
      submission: {
        action: async () => {
          console.log(this.model());
        },
      },
    },
  );
}`,
  errors: component(
    'Username',
    'app-username',
    `<ck-field [invalid]="taken()">
  <label>Username</label>
  <input ckInput autocomplete="username" />
  <ck-hint>Letters and digits only.</ck-hint>
  <ck-error>This name is taken.</ck-error>
</ck-field>`,
    { signals: true, body: '  protected readonly taken = signal(true);' },
  ),
  floatAlways: component(
    'Floats',
    'app-floats',
    `<ck-field labelFloat="always">
  <label>Always on the border</label>
  <input ckInput />
</ck-field>

<ck-field>
  <label>Floats because of the placeholder</label>
  <input ckInput placeholder="jane@example.com" />
</ck-field>`,
  ),
  affixes: `import { Component } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_FIELD_IMPORTS } from '@ckui/core/field';

@Component({
  selector: 'app-affixes',
  imports: [CK_FIELD_IMPORTS, CkButton],
  template: \`
    <ck-field>
      <label>Amount</label>
      <span ckPrefix>€</span>
      <input ckInput inputmode="decimal" aria-describedby="amount-currency" />
      <span ckSuffix id="amount-currency">EUR</span>
    </ck-field>

    <ck-field>
      <label>Search</label>
      <input ckInput type="search" #search />
      <button
        ckButton
        ckSuffix
        type="button"
        variant="ghost"
        iconOnly
        size="sm"
        aria-label="Clear search"
        (click)="search.value = ''; search.focus()"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </ck-field>
  \`,
})
export class Affixes {}`,
  textarea: component(
    'Message',
    'app-message',
    `<ck-field>
  <label>Message</label>
  <textarea ckInput autosize [minRows]="2" [maxRows]="6"></textarea>
  <ck-hint>Grows with the text, then scrolls after six lines.</ck-hint>
</ck-field>`,
  ),
  sizes: component(
    'Sizes',
    'app-sizes',
    `<ck-field size="sm"><label>Small</label><input ckInput /></ck-field>
<ck-field size="md"><label>Medium</label><input ckInput /></ck-field>
<ck-field size="lg"><label>Large</label><input ckInput /></ck-field>
<ck-field size="xl"><label>Extra large</label><input ckInput /></ck-field>`,
  ),
  states: component(
    'States',
    'app-states',
    `<ck-field>
  <label>Disabled</label>
  <input ckInput disabled value="Cannot change" />
</ck-field>

<ck-field>
  <label>Read only</label>
  <input ckInput readonly value="Copy me" />
</ck-field>`,
  ),
  standalone: `import { Component } from '@angular/core';
import { CkInput } from '@ckui/core/field';

@Component({
  selector: 'app-filter',
  imports: [CkInput],
  template: \`<input ckInput type="search" aria-label="Filter the table" placeholder="Filter" />\`,
})
export class Filter {}`,
  reset: `/* An unlayered rule beats the layered field. Keep resets in a layer declared first: */
@layer reset, ckui;

@layer reset {
  input,
  textarea {
    font: inherit;
  }
}`,
  tokens: `/* in your app: one field, a whole form or the root */
.checkout {
  --ck-field-radius: var(--ck-radius-full);
  --ck-field-bg: var(--ck-color-surface-raised);
  --ck-field-border-color: var(--ck-color-fg-muted);
}`,
};
