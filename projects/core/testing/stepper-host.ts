import { ApplicationRef, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  FormField,
  disabled,
  form,
  max,
  min,
  readonly as readonlyField,
} from '@angular/forms/signals';
import { CkSize } from '@ckui/core';
import { CkStepper } from '@ckui/core/stepper';

/** The tokens the shipped stylesheet declares, as far as the stepper needs them. */
export const TOKENS = [
  '--ck-control-height-sm:32px',
  '--ck-control-height-md:40px',
  '--ck-control-height-lg:48px',
  '--ck-control-height-xl:60px',
  '--ck-control-font-size-sm:14px',
  '--ck-control-font-size-md:16px',
  '--ck-control-font-size-lg:18px',
  '--ck-control-font-size-xl:20px',
  '--ck-control-radius:8px',
  '--ck-line-height-tight:1.25',
  '--ck-font-weight-bold:700',
  '--ck-font-variant-numeric:tabular-nums',
  '--ck-color-control:rgb(240, 240, 244)',
  '--ck-color-control-border:rgb(110, 110, 120)',
  '--ck-color-surface-hover:rgba(0, 0, 0, 0.06)',
  '--ck-color-surface-active:rgba(0, 0, 0, 0.1)',
  '--ck-color-fg:rgb(20, 20, 30)',
  '--ck-color-fg-muted:rgb(80, 80, 90)',
  '--ck-color-fg-disabled:rgb(150, 150, 160)',
  '--ck-focus-ring-offset:2px',
  '--ck-focus-ring:2px solid rgb(0, 0, 255)',
].join(';');

/** The same tokens with the dark theme's colours, as `themes.css` sets them. */
export const DARK_TOKENS = [
  TOKENS,
  '--ck-color-scheme:dark',
  '--ck-color-bg:rgb(20, 20, 24)',
  '--ck-color-control:rgb(50, 50, 60)',
  '--ck-color-control-border:rgb(150, 150, 165)',
  '--ck-color-surface-hover:rgba(255, 255, 255, 0.08)',
  '--ck-color-surface-active:rgba(255, 255, 255, 0.14)',
  '--ck-color-fg:rgb(245, 245, 250)',
  '--ck-color-fg-muted:rgb(180, 180, 195)',
  '--ck-color-fg-disabled:rgb(120, 120, 135)',
  '--ck-focus-ring:2px solid rgb(120, 160, 255)',
].join(';');

/** One host for every stepper spec; each test swaps in its own template. */
@Component({
  imports: [CkStepper, ReactiveFormsModule, FormsModule, FormField],
  // Every test overrides this; it only has to use each import once.
  template: `
    <ck-stepper aria-label="Unused" [formControl]="control" />
    <ck-stepper aria-label="Unused" [(ngModel)]="model" />
    <ck-stepper aria-label="Unused" [formField]="signalForm.amount" />
  `,
})
export class StepperHost {
  readonly control = new FormControl<number | null>(250);
  readonly model = signal<number | null>(250);
  readonly value = signal<number | null>(250);
  readonly locked = signal(false);
  readonly readonly = signal(false);
  readonly size = signal<CkSize | undefined>(undefined);
  readonly min = signal<number | null>(null);
  readonly max = signal<number | null>(null);
  readonly step = signal<number | null>(null);
  readonly label = signal('FTP minus 5');
  readonly describedBy = signal<string | null>('hint');
  readonly signalModel = signal<{ amount: number | null }>({ amount: 250 });
  /** What the Signal Forms schema says about the field; `undefined` is no limit. */
  readonly fieldMin = signal<number | undefined>(undefined);
  readonly fieldMax = signal<number | undefined>(undefined);
  readonly fieldReadonly = signal(false);
  readonly signalForm = form(this.signalModel, (path) => {
    disabled(path.amount, () => this.locked());
    min(path.amount, () => this.fieldMin());
    max(path.amount, () => this.fieldMax());
    readonlyField(path.amount, () => this.fieldReadonly());
  });
  /** Every `(valueChange)` the template reports. */
  readonly emitted: (number | null)[] = [];
}

/**
 * `beforeRender` runs after the elements exist and before the first change detection, which is
 * where server markup that a person has typed into sits when the page takes it over.
 */
export function mount(
  template: string,
  prepare?: (host: StepperHost) => void,
  beforeRender?: (root: HTMLElement) => void,
  tokens: string = TOKENS,
): { fixture: ComponentFixture<StepperHost>; host: StepperHost; root: HTMLElement } {
  TestBed.overrideComponent(StepperHost, { set: { template } });
  const fixture = TestBed.createComponent(StepperHost);
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
  root.querySelectorAll<HTMLInputElement>('.ck-stepper__input')[index];

export const minusOf = (root: HTMLElement, index = 0): HTMLButtonElement =>
  root.querySelectorAll<HTMLButtonElement>('.ck-stepper__button--decrement')[index];

export const plusOf = (root: HTMLElement, index = 0): HTMLButtonElement =>
  root.querySelectorAll<HTMLButtonElement>('.ck-stepper__button--increment')[index];

/** Types into the field the way a user does: replaces the text, fires `input`, leaves committing to the test. */
export function typeInto(input: HTMLInputElement, text: string): void {
  input.focus();
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

export function press(element: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  element.dispatchEvent(event);
  return event;
}

/** A primary pointer event of the kind a mouse or finger sends. */
export function pointer(
  element: Element,
  type:
    | 'pointerdown'
    | 'pointerup'
    | 'pointercancel'
    | 'pointerleave'
    | 'pointermove'
    | 'lostpointercapture',
  init: PointerEventInit = {},
): PointerEvent {
  const rect = element.getBoundingClientRect();
  const event = new PointerEvent(type, {
    bubbles: type !== 'pointerleave',
    cancelable: true,
    isPrimary: true,
    pointerId: 1,
    button: 0,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
    ...init,
  });
  element.dispatchEvent(event);
  return event;
}
