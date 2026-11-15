import { ApplicationRef, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { CkButton } from '@ckui/core/button';
import { CK_FIELD_IMPORTS } from '@ckui/core/field';

/** The tokens the shipped stylesheet declares, as far as the field's layout needs them. */
export const TOKENS = [
  '--ck-control-height-sm:32px',
  '--ck-control-height-md:40px',
  '--ck-control-height-lg:48px',
  '--ck-control-height-xl:60px',
  '--ck-control-padding-inline-sm:8px',
  '--ck-control-padding-inline-md:12px',
  '--ck-control-padding-inline-lg:16px',
  '--ck-control-padding-inline-xl:20px',
  '--ck-control-font-size-sm:14px',
  '--ck-control-font-size-md:16px',
  '--ck-control-font-size-lg:18px',
  '--ck-control-font-size-xl:20px',
  '--ck-control-radius:8px',
  '--ck-line-height-normal:1.5',
  '--ck-line-height-tight:1.25',
  '--ck-font-size-xs:12px',
  '--ck-font-size-sm:14px',
  '--ck-space-1:4px',
  '--ck-space-2:8px',
  '--ck-duration-fast:0ms',
  '--ck-ease-standard:ease',
  '--ck-color-danger-fg:rgb(150, 0, 0)',
  '--ck-color-fg-disabled:rgb(150, 150, 160)',
  '--ck-color-surface:rgb(255, 255, 255)',
  '--ck-color-fg:rgb(20, 20, 30)',
  '--ck-color-fg-muted:rgb(80, 80, 90)',
  '--ck-color-border:rgb(120, 120, 130)',
  '--ck-color-control:rgb(240, 240, 244)',
  '--ck-color-control-border:rgb(110, 110, 120)',
  '--ck-font-variant-numeric:tabular-nums',
  '--ck-color-danger:rgb(200, 30, 30)',
  '--ck-color-focus-ring:rgb(0, 0, 255)',
  '--ck-focus-ring-width:2px',
  '--ck-color-surface-hover:rgba(0, 0, 0, 0.06)',
  '--ck-color-border-subtle:rgb(220, 220, 225)',
].join(';');

/** One host for every field spec; each test swaps in its own template. */
@Component({
  imports: [CK_FIELD_IMPORTS, CkButton, ReactiveFormsModule, FormsModule, FormField],
  // Every test overrides this; it only has to use each import once.
  template: `
    <button ckButton>Unused</button>
    <input [formField]="signalForm.email" />
  `,
})
export class FieldHost {
  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    note: new FormControl('', { nonNullable: true }),
  });
  readonly submits = signal(0);

  readonly modelEmail = signal('');

  readonly signalModel = signal({ email: '', note: '' });
  readonly signalForm = form(this.signalModel, (path) => {
    required(path.email);
    email(path.email);
  });

  readonly text = signal('');
  readonly placeholder = signal<string | null>(null);
  readonly type = signal('text');
  readonly forced = signal<boolean | undefined>(undefined);
  readonly floatMode = signal<'auto' | 'always'>('auto');
  readonly describedBy = signal<string | null>(null);
  readonly inputId = signal<string | null>(null);
  readonly ariaInvalid = signal<string | null>(null);
  readonly showPrefix = signal(true);
  readonly rows = signal<number | undefined>(undefined);
  readonly on = signal(true);

  submitSignalForm(): void {
    void submit(this.signalForm, { action: async () => undefined });
  }
}

export function mount(
  template: string,
  prepare?: (host: FieldHost) => void,
): {
  fixture: ComponentFixture<FieldHost>;
  host: FieldHost;
  root: HTMLElement;
} {
  TestBed.overrideComponent(FieldHost, { set: { template } });
  const fixture = TestBed.createComponent(FieldHost);
  const root = fixture.nativeElement as HTMLElement;
  root.setAttribute('style', TOKENS);
  document.body.appendChild(root);
  prepare?.(fixture.componentInstance);
  fixture.detectChanges();
  return { fixture, host: fixture.componentInstance, root };
}

/** Runs change detection and every deferred task until nothing is left, twice for effects. */
export async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
  TestBed.inject(ApplicationRef).tick();
}

export const query = <T extends HTMLElement = HTMLElement>(
  root: HTMLElement,
  selector: string,
): T => root.querySelector<T>(selector)!;

/** Every rule of every stylesheet, flattened through `@layer` and `@media` blocks. */
export function allRules(): CSSStyleRule[] {
  const rules: CSSStyleRule[] = [];
  const visit = (list: CSSRuleList): void => {
    for (const rule of Array.from(list)) {
      if (rule instanceof CSSStyleRule) {
        rules.push(rule);
      }
      if ('cssRules' in rule) {
        visit((rule as CSSGroupingRule).cssRules);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      visit(sheet.cssRules);
    } catch {
      // A cross-origin sheet cannot be read.
    }
  }
  return rules;
}
