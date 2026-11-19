import { ApplicationRef, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FormField, disabled, form, minLength, validate } from '@angular/forms/signals';
import { CkSize } from '@ckui/core';
import { CK_CHECKBOX_IMPORTS } from '@ckui/core/checkbox';

/** The tokens the shipped stylesheet declares, as far as the checkbox needs them. */
export const TOKENS = [
  '--ck-control-height-sm:32px',
  '--ck-control-height-md:40px',
  '--ck-control-height-lg:48px',
  '--ck-control-height-xl:60px',
  '--ck-control-font-size-sm:14px',
  '--ck-control-font-size-md:16px',
  '--ck-control-font-size-lg:18px',
  '--ck-control-font-size-xl:20px',
  '--ck-font-size-sm:14px',
  '--ck-font-weight-medium:500',
  '--ck-line-height-tight:1.25',
  '--ck-line-height-normal:1.5',
  '--ck-space-1:4px',
  '--ck-space-2:8px',
  '--ck-space-3:12px',
  '--ck-radius-sm:4px',
  '--ck-target-min:24px',
  '--ck-duration-normal:0ms',
  '--ck-ease-standard:ease',
  '--ck-color-control:rgb(240, 240, 244)',
  '--ck-color-border:rgb(110, 110, 120)',
  '--ck-color-primary:rgb(60, 60, 200)',
  '--ck-color-on-primary:rgb(255, 255, 255)',
  '--ck-color-danger-fg:rgb(160, 20, 20)',
  '--ck-color-fg:rgb(20, 20, 30)',
  '--ck-color-fg-muted:rgb(80, 80, 90)',
  '--ck-color-fg-disabled:rgb(150, 150, 160)',
  '--ck-focus-ring-width:2px',
  '--ck-focus-ring-offset:2px',
  '--ck-focus-ring:2px solid rgb(0, 0, 255)',
].join(';');

/** The same tokens with the dark theme's colours, as `themes.css` sets them. */
export const DARK_TOKENS = [
  TOKENS,
  '--ck-color-scheme:dark',
  '--ck-color-control:rgb(50, 50, 60)',
  '--ck-color-border:rgb(150, 150, 165)',
  '--ck-color-primary:rgb(140, 150, 255)',
  '--ck-color-on-primary:rgb(20, 20, 24)',
  '--ck-color-danger-fg:rgb(255, 150, 150)',
  '--ck-color-fg:rgb(245, 245, 250)',
  '--ck-color-fg-muted:rgb(180, 180, 195)',
  '--ck-color-fg-disabled:rgb(120, 120, 135)',
  '--ck-focus-ring:2px solid rgb(120, 160, 255)',
  'background:rgb(20, 20, 24)',
  'color:rgb(245, 245, 250)',
].join(';');

/** One host for every checkbox spec; each test swaps in its own template. */
@Component({
  imports: [CK_CHECKBOX_IMPORTS, ReactiveFormsModule, FormsModule, FormField],
  // Every test overrides this; it only has to use each import once.
  template: `
    <ck-checkbox [formControl]="control"
      >Unused <ck-hint>Hint</ck-hint><ck-error>E</ck-error></ck-checkbox
    >
    <ck-checkbox [(ngModel)]="model">Unused</ck-checkbox>
    <ck-checkbox [formField]="signalForm.accepted">Unused</ck-checkbox>
    <ck-checkbox-group [formControl]="zonesControl"
      ><ck-checkbox option="a">A</ck-checkbox></ck-checkbox-group
    >
  `,
})
export class CheckboxHost {
  readonly control = new FormControl<boolean | null>(true);
  readonly terms = new FormControl<boolean | null>(false, Validators.requiredTrue);
  readonly zonesControl = new FormControl<string[] | null>([], Validators.required);
  readonly formGroup = new FormGroup({ terms: this.terms, zones: this.zonesControl });
  readonly model = signal<boolean | null>(true);
  readonly zonesModel = signal<string[] | null>(['vo2']);
  readonly value = signal(false);
  readonly indeterminate = signal(false);
  readonly locked = signal(false);
  readonly size = signal<CkSize | undefined>(undefined);
  readonly hint = signal<string | null>('Shows up under "Mine".');
  readonly hintId = signal('hint-a');
  readonly errorId = signal('error-a');
  readonly label = signal('Save as template');
  readonly zones = signal<unknown[]>([]);
  readonly options = signal<string[]>(['endurance', 'vo2', 'tempo']);
  readonly showTempo = signal(true);
  readonly objectOptions = [{ id: 1 }, { id: 2 }, { id: 3 }];
  readonly objects = signal<{ id: number }[]>([]);
  readonly signalModel = signal<{ accepted: boolean; zones: string[] }>({
    accepted: true,
    zones: ['vo2'],
  });
  readonly signalForm = form(this.signalModel, (path) => {
    disabled(path.accepted, () => this.locked());
    validate(path.accepted, ({ value }) => (value() ? undefined : { kind: 'required' }));
    minLength(path.zones, 1);
  });
  /** Every `(valueChange)` the template reports. */
  readonly emitted: unknown[] = [];
}

export function mount(
  template: string,
  prepare?: (host: CheckboxHost) => void,
  beforeRender?: (root: HTMLElement) => void,
  tokens: string = TOKENS,
): { fixture: ComponentFixture<CheckboxHost>; host: CheckboxHost; root: HTMLElement } {
  TestBed.overrideComponent(CheckboxHost, { set: { template } });
  const fixture = TestBed.createComponent(CheckboxHost);
  const root = fixture.nativeElement as HTMLElement;
  root.setAttribute('style', tokens);
  document.body.appendChild(root);
  prepare?.(fixture.componentInstance);
  beforeRender?.(root);
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

export const inputOf = (root: HTMLElement, index = 0): HTMLInputElement =>
  root.querySelectorAll<HTMLInputElement>('.ck-checkbox__input')[index];

export const inputs = (root: HTMLElement): HTMLInputElement[] =>
  Array.from(root.querySelectorAll<HTMLInputElement>('.ck-checkbox__input'));
