import { ApplicationRef, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FormField, disabled, form, required } from '@angular/forms/signals';
import { CkSize } from '@ckui/core';
import { CK_RADIO_IMPORTS } from '@ckui/core/radio';

/** The tokens the shipped stylesheet declares, as far as the radio group needs them. */
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
  '--ck-space-4:16px',
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

/** One host for every radio spec; each test swaps in its own template. */
@Component({
  imports: [CK_RADIO_IMPORTS, ReactiveFormsModule, FormsModule, FormField],
  // Every test overrides this; it only has to use each import once.
  template: `
    <ck-radio-group [formControl]="unitControl" aria-label="Unused"
      ><ck-radio option="a">A <ck-hint>Hint</ck-hint></ck-radio
      ><ck-error>E</ck-error>
    </ck-radio-group>
    <ck-radio-group [(ngModel)]="model" aria-label="Unused"
      ><ck-radio option="a">A</ck-radio></ck-radio-group
    >
    <ck-radio-group [formField]="signalForm.unit" aria-label="Unused"
      ><ck-radio option="a">A</ck-radio></ck-radio-group
    >
  `,
})
export class RadioHost {
  readonly unitControl = new FormControl<string | null>(null, Validators.required);
  readonly formGroup = new FormGroup({ unit: this.unitControl });
  readonly model = signal<string | null>('lb');
  readonly unit = signal<unknown>(null);
  readonly locked = signal(false);
  readonly groupName = signal('unit');
  readonly size = signal<CkSize | undefined>(undefined);
  readonly hint = signal<string | null>('Imperial');
  readonly hintId = signal('hint-a');
  readonly label = signal('Kilograms');
  readonly options = signal<string[]>(['kg', 'lb', 'st']);
  readonly showMiddle = signal(true);
  readonly objectOptions = [{ id: 1 }, { id: 2 }, { id: 3 }];
  readonly sameId = (option: { id: number }, value: { id: number }) => option.id === value.id;
  readonly signalModel = signal<{ unit: string | null }>({ unit: null });
  readonly signalForm = form(this.signalModel, (path) => {
    disabled(path.unit, () => this.locked());
    required(path.unit);
  });
  /** Every `(valueChange)` the template reports. */
  readonly emitted: unknown[] = [];
}

export function mount(
  template: string,
  prepare?: (host: RadioHost) => void,
  beforeRender?: (root: HTMLElement) => void,
  tokens: string = TOKENS,
): { fixture: ComponentFixture<RadioHost>; host: RadioHost; root: HTMLElement } {
  TestBed.overrideComponent(RadioHost, { set: { template } });
  const fixture = TestBed.createComponent(RadioHost);
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
  root.querySelectorAll<HTMLInputElement>('.ck-radio__input')[index];

export const inputs = (root: HTMLElement): HTMLInputElement[] =>
  Array.from(root.querySelectorAll<HTMLInputElement>('.ck-radio__input'));

export const checkedOf = (root: HTMLElement): boolean[] =>
  inputs(root).map((input) => input.checked);
