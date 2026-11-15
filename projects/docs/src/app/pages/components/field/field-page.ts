import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FormField, FormRoot, email, form, minLength, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { CkButton } from '@ckui/core/button';
import { CK_FIELD_IMPORTS } from '@ckui/core/field';
import { SAMPLES } from './field-samples';

interface InputRow {
  readonly name: string;
  readonly on: string;
  readonly type: string;
  readonly defaultValue: string;
  readonly description: string;
}

interface PartRow {
  readonly name: string;
  readonly description: string;
}

interface TokenRow {
  readonly name: string;
  readonly fallback: string;
  readonly description: string;
}

@Component({
  selector: 'docs-field-page',
  imports: [
    CK_FIELD_IMPORTS,
    CkButton,
    RouterLink,
    NgTemplateOutlet,
    FormsModule,
    ReactiveFormsModule,
    FormField,
    FormRoot,
  ],
  styleUrl: './field-page.css',
  templateUrl: './field-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldPage {
  protected readonly samples = SAMPLES;
  protected readonly forceInvalid = signal(false);

  protected readonly reveal = {
    reactive: signal(false),
    template: signal(false),
    signal: signal(false),
  };
  protected readonly status = {
    reactive: signal(''),
    template: signal(''),
    signal: signal(''),
  };

  protected readonly reactiveForm = new FormGroup({
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

  protected readonly templateModel = { email: '', password: '', message: '' };

  protected readonly signalModel = signal({ email: '', password: '', message: '' });
  protected readonly signalForm = form(
    this.signalModel,
    (path) => {
      required(path.email);
      email(path.email);
      required(path.password);
      minLength(path.password, 8);
    },
    {
      submission: {
        action: async () => {
          this.status.signal.set('Sent. The form is valid.');
        },
        onInvalid: () => this.status.signal.set('Not sent. Fix the errors first.'),
      },
    },
  );

  protected readonly inputs: readonly InputRow[] = [
    {
      name: 'size',
      on: 'ck-field',
      type: "'sm' | 'md' | 'lg' | 'xl'",
      defaultValue: 'the size from provideCkui()',
      description: 'Height, padding and font size of the box. The input inside follows it.',
    },
    {
      name: 'labelFloat',
      on: 'ck-field',
      type: "'auto' | 'always'",
      defaultValue: "'auto'",
      description:
        'auto floats the label while the control is focused, has a value, shows a placeholder or a native picker UI, is autofilled, or the field has a prefix. always keeps it on the border.',
    },
    {
      name: 'invalid',
      on: 'ck-field',
      type: 'boolean | undefined',
      defaultValue: 'undefined',
      description:
        'undefined follows the control. true forces the invalid look and shows the errors; false forces both off.',
    },
    {
      name: 'size',
      on: 'ckInput',
      type: "'sm' | 'md' | 'lg' | 'xl'",
      defaultValue: 'the size from provideCkui()',
      description:
        'ckui size, not the native size attribute (use CSS for the width). Only used without a ck-field around it; inside a field the field decides.',
    },
    {
      name: 'autosize',
      on: 'textarea[ckInput]',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Grows the textarea with its content. Uses CSS field-sizing: content, and a measured height where the browser has no support for it.',
    },
    {
      name: 'minRows',
      on: 'textarea[ckInput]',
      type: 'number',
      defaultValue: 'the rows attribute, or 2',
      description:
        'The fewest rows with autosize. A value that is not a whole number of at least 1 is ignored.',
    },
    {
      name: 'maxRows',
      on: 'textarea[ckInput]',
      type: 'number',
      defaultValue: 'none',
      description:
        'The most rows with autosize; the textarea scrolls past it. Below minRows it is raised to minRows.',
    },
  ];

  protected readonly parts: readonly PartRow[] = [
    { name: 'ck-field', description: 'The box. One ckInput, one label, any hints and errors.' },
    {
      name: 'input[ckInput], textarea[ckInput]',
      description:
        'The native control. type, inputmode, enterkeyhint, autocomplete, name and every other attribute stay on it.',
    },
    {
      name: 'label',
      description:
        'A plain label directly inside ck-field. The field sets its for attribute and floats it.',
    },
    {
      name: 'ck-hint',
      description: 'Help text. Always visible, and part of the control description.',
    },
    {
      name: 'ck-error',
      description:
        'An error message. It has the hidden attribute until the field shows errors, and joins the description while it shows.',
    },
    {
      name: 'ckPrefix, ckSuffix',
      description:
        'Content before and after the control: text, an icon, or a button. A button stays in the tab order after the control.',
    },
    {
      name: 'CK_FIELD_IMPORTS',
      description:
        'All six of the above in one array: imports: [CK_FIELD_IMPORTS]. Import CkInput alone for a standalone input.',
    },
  ];

  protected readonly tokens: readonly TokenRow[] = [
    {
      name: '--ck-field-radius',
      fallback: 'var(--ck-control-radius)',
      description: 'Corner radius of the box and of a standalone input.',
    },
    {
      name: '--ck-field-bg',
      fallback: 'var(--ck-color-surface)',
      description:
        'Fill of the box. The label notch uses it too, so it always matches the box and never shows a patch on the page.',
    },
    {
      name: '--ck-field-border-color',
      fallback: 'var(--ck-color-border)',
      description:
        'Border colour at rest. Keep it at 3:1 against the page. An invalid field always uses the danger colour.',
    },
  ];

  protected readonly semanticTokens: readonly string[] = [
    '--ck-color-surface, --ck-color-surface-hover, --ck-color-fg, --ck-color-fg-muted',
    '--ck-color-fg-disabled, --ck-color-border, --ck-color-border-subtle, --ck-font-variant-numeric',
    '--ck-color-danger, --ck-color-danger-fg',
    '--ck-control-height-*, --ck-control-padding-inline-*, --ck-control-font-size-*',
    '--ck-control-radius, --ck-focus-ring, --ck-focus-ring-offset',
    '--ck-font-size-xs, --ck-font-size-sm, --ck-duration-fast, --ck-ease-standard',
  ];

  protected submitReactive(): void {
    this.status.reactive.set(
      this.reactiveForm.valid ? 'Sent. The form is valid.' : 'Not sent. Fix the errors first.',
    );
  }

  protected submitTemplate(valid: boolean | null): void {
    this.status.template.set(
      valid ? 'Sent. The form is valid.' : 'Not sent. Fix the errors first.',
    );
  }

  protected toggle(name: 'reactive' | 'template' | 'signal'): void {
    this.reveal[name].update((value) => !value);
  }

  protected toggleForcedError(): void {
    this.forceInvalid.update((value) => !value);
  }
}
