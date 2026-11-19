import { ApplicationRef, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FormField, email, form, max, min, required, submit } from '@angular/forms/signals';
import { CkSize } from '@ckui/core';
import { CkButton } from '@ckui/core/button';
import { CK_FIELD_IMPORTS } from '@ckui/core/field';
import { CkStepper } from '@ckui/core/stepper';

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
  '--ck-font-weight-bold:700',
  '--ck-color-surface-active:rgba(0, 0, 0, 0.1)',
  '--ck-focus-ring-offset:2px',
  '--ck-focus-ring:2px solid rgb(0, 0, 255)',
].join(';');

/** The tokens with dark colours, as `themes.css` sets them. */
export const DARK_TOKENS = [
  TOKENS,
  '--ck-color-scheme:dark',
  '--ck-color-bg:rgb(20, 20, 24)',
  '--ck-color-surface:rgb(30, 30, 36)',
  '--ck-color-control:rgb(50, 50, 60)',
  '--ck-color-control-border:rgb(150, 150, 165)',
  '--ck-color-border:rgb(150, 150, 165)',
  '--ck-color-surface-hover:rgba(255, 255, 255, 0.08)',
  '--ck-color-surface-active:rgba(255, 255, 255, 0.14)',
  '--ck-color-fg:rgb(245, 245, 250)',
  '--ck-color-fg-muted:rgb(180, 180, 195)',
  '--ck-color-fg-disabled:rgb(120, 120, 135)',
  '--ck-color-danger-fg:rgb(255, 150, 150)',
  '--ck-color-focus-ring:rgb(120, 160, 255)',
  '--ck-focus-ring:2px solid rgb(120, 160, 255)',
].join(';');

/** One host for every field spec; each test swaps in its own template. */
@Component({
  imports: [CK_FIELD_IMPORTS, CkButton, CkStepper, ReactiveFormsModule, FormsModule, FormField],
  // Every test overrides this; it only has to use each import once.
  template: `
    <button ckButton>Unused</button>
    <input [formField]="signalForm.email" />
    <ck-stepper aria-label="Unused" />
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
  readonly ftpForm = new FormGroup({
    ftp: new FormControl<number | null>(250, [
      Validators.required,
      Validators.min(50),
      Validators.max(600),
    ]),
  });
  readonly modelFtp = signal<number | null>(250);
  readonly signalFtp = signal<{ ftp: number | null }>({ ftp: 250 });
  readonly signalFtpForm = form(this.signalFtp, (path) => {
    required(path.ftp);
    min(path.ftp, 50);
    max(path.ftp, 600);
  });
  readonly size = signal<CkSize | undefined>(undefined);
  readonly stepperSizeValue = signal<CkSize | undefined>(undefined);
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
  readonly hintId = signal('hint-a');
  readonly errorId = signal('error-a');
  readonly ariaInvalid = signal<string | null>(null);
  readonly showPrefix = signal(true);
  readonly rows = signal<number | undefined>(undefined);
  readonly on = signal(true);

  submitSignalFtp(): void {
    void submit(this.signalFtpForm, { action: async () => undefined });
  }

  submitSignalForm(): void {
    void submit(this.signalForm, { action: async () => undefined });
  }
}

export function mount(
  template: string,
  prepare?: (host: FieldHost) => void,
  tokens: string = TOKENS,
): {
  fixture: ComponentFixture<FieldHost>;
  host: FieldHost;
  root: HTMLElement;
} {
  TestBed.overrideComponent(FieldHost, { set: { template } });
  const fixture = TestBed.createComponent(FieldHost);
  const root = fixture.nativeElement as HTMLElement;
  root.setAttribute('style', tokens);
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
