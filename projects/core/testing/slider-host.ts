import { ApplicationRef, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormField, disabled, form } from '@angular/forms/signals';
import { CkSize } from '@ckui/core';
import { CkSlider } from '@ckui/core/slider';

/** The tokens the shipped stylesheet declares, as far as the slider needs them. */
export const TOKENS = [
  '--ck-control-height-sm:32px',
  '--ck-control-height-md:40px',
  '--ck-control-height-lg:48px',
  '--ck-control-height-xl:60px',
  '--ck-control-font-size-sm:14px',
  '--ck-control-font-size-md:16px',
  '--ck-control-font-size-lg:18px',
  '--ck-control-font-size-xl:20px',
  '--ck-space-2:8px',
  '--ck-space-3:12px',
  '--ck-radius-full:9999px',
  '--ck-target-min:24px',
  '--ck-line-height-tight:1.25',
  '--ck-font-weight-bold:700',
  '--ck-font-variant-numeric:tabular-nums',
  '--ck-duration-fast:100ms',
  '--ck-ease-standard:cubic-bezier(0.4, 0, 0.2, 1)',
  '--ck-color-bg:rgb(250, 250, 252)',
  '--ck-color-control:rgb(240, 240, 244)',
  '--ck-color-control-border:rgb(110, 110, 120)',
  '--ck-color-primary:rgb(79, 70, 229)',
  '--ck-color-fg:rgb(20, 20, 30)',
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
  '--ck-color-primary:rgb(129, 140, 248)',
  '--ck-color-fg:rgb(245, 245, 250)',
  '--ck-color-fg-disabled:rgb(120, 120, 135)',
  '--ck-focus-ring:2px solid rgb(120, 160, 255)',
].join(';');

/** One host for every slider spec; each test swaps in its own template. */
@Component({
  imports: [CkSlider, ReactiveFormsModule, FormsModule, FormField],
  // Every test overrides this; it only has to use each import once.
  template: `
    <ck-slider aria-label="Unused" [formControl]="control" />
    <ck-slider aria-label="Unused" [(ngModel)]="model" />
    <ck-slider aria-label="Unused" [formField]="signalForm.grade" />
  `,
})
export class SliderHost {
  readonly control = new FormControl<number | null>(50);
  readonly model = signal<number | null>(50);
  readonly value = signal<number | null>(50);
  readonly locked = signal(false);
  readonly size = signal<CkSize | undefined>(undefined);
  readonly min = signal<number | null>(0);
  readonly max = signal<number | null>(100);
  readonly step = signal<number | null>(1);
  readonly valueText = signal<((value: number) => string) | undefined>(undefined);
  readonly signalModel = signal<{ grade: number | null }>({ grade: 50 });
  readonly signalForm = form(this.signalModel, (path) => {
    disabled(path.grade, () => this.locked());
  });
  /** Every `(valueChange)` the template reports: one per live write. */
  readonly emitted: (number | null)[] = [];
  /** Every `(valueCommit)` the template reports. */
  readonly commits: number[] = [];
}

/**
 * `beforeRender` runs after the elements exist and before the first change detection, where a
 * server render that the page takes over sits.
 */
export function mount(
  template: string,
  prepare?: (host: SliderHost) => void,
  beforeRender?: (root: HTMLElement) => void,
  tokens: string = TOKENS,
): { fixture: ComponentFixture<SliderHost>; host: SliderHost; root: HTMLElement } {
  TestBed.overrideComponent(SliderHost, { set: { template } });
  const fixture = TestBed.createComponent(SliderHost);
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

export const thumbOf = (root: HTMLElement, index = 0): HTMLElement =>
  root.querySelectorAll<HTMLElement>('.ck-slider__thumb')[index];

/** Where the thumb sits, as the percentage of the rail that its style carries. */
export const positionOf = (root: HTMLElement, index = 0): string =>
  thumbOf(root, index).style.getPropertyValue('--_ck-slider-position');

export const trackOf = (root: HTMLElement, index = 0): HTMLElement =>
  root.querySelectorAll<HTMLElement>('.ck-slider__track')[index];

export const railOf = (root: HTMLElement, index = 0): HTMLElement =>
  root.querySelectorAll<HTMLElement>('.ck-slider__rail')[index];

export const fillOf = (root: HTMLElement, index = 0): HTMLElement =>
  root.querySelectorAll<HTMLElement>('.ck-slider__fill')[index];

/** A key event on the element. */
export function press(
  element: Element,
  key: string,
  init: KeyboardEventInit = {},
  type: 'keydown' | 'keyup' = 'keydown',
): KeyboardEvent {
  const event = new KeyboardEvent(type, { key, bubbles: true, cancelable: true, ...init });
  element.dispatchEvent(event);
  return event;
}

/** A key held down: keydown, then keyup. `repeat` sends further keydowns first, like auto-repeat. */
export function tap(element: Element, key: string, repeat = 0): void {
  press(element, key);
  for (let count = 0; count < repeat; count++) {
    press(element, key, { repeat: true });
  }
  press(element, key, {}, 'keyup');
}

export type PointerType =
  'pointerdown' | 'pointerup' | 'pointercancel' | 'pointermove' | 'lostpointercapture';

/** A primary pointer event of the kind a mouse or finger sends, at the fraction of the rail. */
export function pointer(
  element: Element,
  type: PointerType,
  init: PointerEventInit & { at?: number; root?: HTMLElement } = {},
): PointerEvent {
  const { at, root, ...rest } = init;
  const rail = (root ?? element.closest('ck-slider')!).querySelector('.ck-slider__rail')!;
  const rect = rail.getBoundingClientRect();
  const x = at === undefined ? rect.left + rect.width / 2 : rect.left + rect.width * at;
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    clientX: x,
    clientY: rect.top + rect.height / 2,
    ...rest,
  });
  element.dispatchEvent(event);
  return event;
}
