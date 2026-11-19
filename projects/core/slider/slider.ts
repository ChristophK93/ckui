import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  LOCALE_ID,
  PLATFORM_ID,
  Renderer2,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CK_CONFIG, CkSize } from '@ckui/core';
import {
  CkValueControl,
  NumberGrid,
  adjacent,
  createFormatter,
  decimalsOf,
  finiteOrNull,
  hasAccessibleName,
  provideCkValueAccessor,
  snap,
  toNumber,
} from '@ckui/core/internal';

declare const ngDevMode: unknown;

const DEFAULT_MAX = 100;
const DEFAULT_LARGE_FACTOR = 10;
const HANDLED_KEYS = new Set([
  'ArrowRight',
  'ArrowLeft',
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
]);

/**
 * A slider for one number in a range. The thumb is a custom element with the WAI-ARIA `slider`
 * role, so it looks the same everywhere and its hit area can be larger than what is drawn.
 *
 * The value is written while the thumb moves (every pointer move, every key step), so a form or
 * `[(value)]` always holds the current number. `valueCommit` reports the end of one change, once:
 * at pointer release, and for the keyboard when the key that changed the value is released. Use
 * it for work that should not run on every step, such as sending the value to a device.
 *
 * A value from the form that is outside the range or off the step is shown clamped and snapped
 * but is not written back. A `null` value shows the thumb at `min` with an empty fill.
 *
 * Name it with `aria-label` or `aria-labelledby` on `ck-slider`. The attributes are inputs here
 * and move to the thumb, which is the only element with a role. A wrapping `<label>` cannot name
 * it.
 */
@Component({
  selector: 'ck-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [provideCkValueAccessor(CkSlider)],
  host: {
    class: 'ck-slider',
    '[class]': 'modifierClasses()',
    '[class.ck-slider--disabled]': 'isDisabled()',
    '[class.ck-slider--pressing]': 'pressing()',
  },
  template: `
    <span
      #track
      class="ck-slider__track"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerCancel()"
      (lostpointercapture)="endPress()"
      (contextmenu)="onContextMenu($event)"
    >
      <span #rail class="ck-slider__rail">
        <span class="ck-slider__fill" [style.inline-size.%]="fillPercent()"></span>
        <span
          #thumb
          class="ck-slider__thumb"
          role="slider"
          aria-orientation="horizontal"
          [attr.tabindex]="isDisabled() ? null : 0"
          [attr.aria-disabled]="ariaDisabled() ? 'true' : null"
          [attr.aria-label]="ariaLabel()"
          [attr.aria-labelledby]="ariaLabelledby()"
          [attr.aria-describedby]="ariaDescribedby()"
          [attr.aria-valuenow]="shown()"
          [attr.aria-valuemin]="bounds().min"
          [attr.aria-valuemax]="bounds().max"
          [attr.aria-valuetext]="shownText()"
          [style.--_ck-slider-position]="position()"
          (focus)="syncLock()"
          (keydown)="onKeydown($event)"
          (keyup)="onKeyup($event)"
          (blur)="onBlur()"
        ></span>
      </span>
    </span>
    @if (showValue()) {
      <span class="ck-slider__value" aria-hidden="true">
        <span class="ck-slider__value-text">{{ shownText() }}</span>
        <span class="ck-slider__value-size">{{ minText() }}</span>
        <span class="ck-slider__value-size">{{ maxText() }}</span>
      </span>
    }
  `,
  styleUrl: './slider.css',
})
export class CkSlider extends CkValueControl<number | null> {
  /** Smallest value, at the inline start of the track. */
  readonly min = input<number | null, unknown>(0, { transform: toNumber });
  /** Largest value. When below `min`, it counts as `min` and development builds warn. */
  readonly max = input<number | null, unknown>(DEFAULT_MAX, { transform: toNumber });
  /** Distance between values, counted from `min`. Not a number above 0 counts as 1. */
  readonly step = input<number | null, unknown>(1, { transform: toNumber });
  /** What Page Up and Page Down move by. Default: 10 steps, at most the whole range. */
  readonly largeStep = input<number | null, unknown>(null, { transform: toNumber });
  /** Text after the value, part of the value text for assistive technology: `%` reads "50%". */
  readonly unit = input('');
  /** `undefined` uses the size from `provideCkui`. */
  readonly size = input<CkSize | undefined>(undefined);
  /** Writes the value text for assistive technology (and for `showValue`), instead of the default. */
  readonly valueText = input<((value: number) => string) | undefined>(undefined);
  /** Shows the value text next to the track. It is hidden from assistive technology. */
  readonly showValue = input(false, { transform: booleanAttribute });
  /** The accessible name of the thumb. Moves from the host to the thumb. */
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  /** The ids of the elements that name the thumb. Moves from the host to the thumb. */
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });
  /** The ids of a hint or error for the thumb. Moves from the host to the thumb. */
  readonly ariaDescribedby = input<string | null>(null, { alias: 'aria-describedby' });

  /**
   * Fires once when a change by the user ends, with the new value, and only when it differs from
   * the value before the change: at pointer release after a drag or a tap on the track, and for
   * the keyboard when the key is released (so a held key is one commit). Never for a value that
   * the form or `[value]` writes.
   */
  readonly valueCommit = output<number>();

  private readonly config = inject(CK_CONFIG);
  private readonly locale = inject(LOCALE_ID);
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly trackRef = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly railRef = viewChild.required<ElementRef<HTMLElement>>('rail');
  private readonly thumbRef = viewChild.required<ElementRef<HTMLElement>>('thumb');

  protected readonly pressing = signal(false);
  /** Whether a `<fieldset disabled>` around the slider locked it when last looked at. */
  private readonly fieldsetDisabled = signal(false);
  protected readonly ariaDisabled = computed(() => this.isDisabled() || this.fieldsetDisabled());
  private pressId: number | null = null;
  private pressStart: number | null = null;
  /** A touch press waits for movement or release before it moves the value, so a scroll can win. */
  private pressMoved = false;
  private stopWatchingRelease: (() => void) | null = null;
  private keyChange: { readonly before: number | null } | null = null;

  protected readonly modifierClasses = computed(
    () => `ck-slider ck-slider--${this.size() ?? this.config.size}`,
  );

  private readonly stepSize = computed(() => {
    const step = this.step();
    return step !== null && Number.isFinite(step) && step > 0 ? step : 1;
  });

  /** The limits, with `max` raised to `min` when they cross. */
  protected readonly bounds = computed(() => {
    const min = finiteOrNull(this.min()) ?? 0;
    const max = finiteOrNull(this.max()) ?? DEFAULT_MAX;
    return { min, max: max < min ? min : max };
  });

  private readonly digits = computed(() =>
    Math.max(decimalsOf(this.stepSize()), decimalsOf(this.bounds().min)),
  );

  private readonly grid = computed<NumberGrid>(() => ({
    step: this.stepSize(),
    ...this.bounds(),
    digits: this.digits(),
  }));

  private readonly largeDelta = computed(() => {
    const { min, max } = this.bounds();
    const large = this.largeStep();
    const wanted =
      large !== null && Number.isFinite(large) && large > 0
        ? large
        : this.stepSize() * DEFAULT_LARGE_FACTOR;
    return Math.max(this.stepSize(), Math.min(wanted, max - min));
  });

  private readonly formatter = computed(() =>
    createFormatter(this.locale, this.digits(), this.digits()),
  );

  /** The value as the form holds it: a finite number, else `null`. */
  protected readonly current = computed<number | null>(() => {
    const value = this.value();
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  });

  /** What the thumb shows: the value clamped and snapped, `min` for none. Never written back. */
  protected readonly shown = computed(() => {
    const value = this.current();
    return value === null ? this.bounds().min : snap(value, this.grid());
  });

  private readonly fraction = computed(() => {
    const { min, max } = this.bounds();
    return max > min ? (this.shown() - min) / (max - min) : 0;
  });

  protected readonly percent = computed(() => this.fraction() * 100);

  protected readonly position = computed(() => `${this.percent()}%`);

  protected readonly fillPercent = computed(() => (this.current() === null ? 0 : this.percent()));

  private textOf(value: number): string {
    const custom = this.valueText();
    if (custom) {
      return custom(value);
    }
    const text = this.formatter().format(value);
    const unit = this.unit();
    return unit === '' ? text : unit === '%' ? `${text}%` : `${text} ${unit}`;
  }

  protected readonly shownText = computed(() => this.textOf(this.shown()));

  /** The texts of both limits, drawn invisibly so the value is as wide as the widest of them. */
  protected readonly minText = computed(() => this.textOf(this.bounds().min));
  protected readonly maxText = computed(() => this.textOf(this.bounds().max));

  constructor() {
    super();
    // The names are inputs here, so the host must not also keep them as a (role-less) attribute.
    const renderer = inject(Renderer2);
    renderer.removeAttribute(this.element, 'aria-label');
    renderer.removeAttribute(this.element, 'aria-labelledby');
    renderer.removeAttribute(this.element, 'aria-describedby');

    inject(DestroyRef).onDestroy(() => {
      this.pressId = null;
      this.keyChange = null;
      this.unwatchRelease();
    });

    effect(() => {
      if (this.isDisabled()) {
        this.endPress();
        this.endKeyChange();
      }
    });

    if (this.browser) {
      afterNextRender(() => this.syncLock());
    }

    if (typeof ngDevMode !== 'undefined' && ngDevMode && this.browser) {
      this.watchConfiguration();
    }
  }

  private watchConfiguration(): void {
    let destroyed = false;
    inject(DestroyRef).onDestroy(() => (destroyed = true));
    afterNextRender(() => {
      if (
        !destroyed &&
        !hasAccessibleName(this.thumbRef().nativeElement, {
          title: false,
          text: false,
          labels: false,
        })
      ) {
        console.warn(
          '[ckui] ck-slider has no accessible name. Add an aria-label or aria-labelledby to it.',
          this.element,
        );
      }
    });
    let warnedStep = false;
    let warnedBounds = false;
    effect(() => {
      const step = this.step();
      if (!warnedStep && step !== null && !(Number.isFinite(step) && step > 0)) {
        warnedStep = true;
        console.warn(
          `[ckui] ck-slider step must be a number above 0, got ${step}. Using 1.`,
          this.element,
        );
      }
      const min = finiteOrNull(this.min()) ?? 0;
      const max = finiteOrNull(this.max()) ?? DEFAULT_MAX;
      if (!warnedBounds && min > max) {
        warnedBounds = true;
        console.warn(
          `[ckui] ck-slider min (${min}) is above max (${max}). Treating max as min.`,
          this.element,
        );
      }
    });
  }

  /**
   * Disabled by the input, the form, or an ancestor `<fieldset disabled>`. A custom element has no
   * `:disabled` state, so the fieldset is looked up here and noted for `aria-disabled`.
   */
  protected syncLock(): boolean {
    const inDisabledFieldset = this.element.closest('fieldset:disabled') !== null;
    this.fieldsetDisabled.set(inDisabledFieldset);
    return this.isDisabled() || inDisabledFieldset;
  }

  private rtl(): boolean {
    const view = this.document.defaultView;
    return view?.getComputedStyle(this.railRef().nativeElement).direction === 'rtl';
  }

  /** Reports the end of a change when the value is not the one the change started from. */
  private emitIfChanged(before: number | null): void {
    const now = this.current();
    if (now !== null && !Object.is(now, before)) {
      this.valueCommit.emit(now);
    }
  }

  // Pointer

  /** The value under a pointer position, snapped. The rail's inner box is the whole range. */
  private valueAt(clientX: number): number {
    const rail = this.railRef().nativeElement;
    const rect = rail.getBoundingClientRect();
    const width = rail.clientWidth;
    const along = width > 0 ? (clientX - rect.left - rail.clientLeft) / width : 0;
    const fraction = Math.min(1, Math.max(0, this.rtl() ? 1 - along : along));
    const { min, max } = this.bounds();
    return snap(min + fraction * (max - min), this.grid());
  }

  private moveTo(clientX: number): void {
    this.pressMoved = true;
    this.commit(this.valueAt(clientX));
  }

  protected onPointerDown(event: PointerEvent): void {
    // A thumb inside `<fieldset disabled>` still gets pointer events.
    if (event.button !== 0 || !event.isPrimary || this.syncLock()) {
      return;
    }
    this.endPress();
    this.endKeyChange();
    if (event.cancelable) {
      event.preventDefault();
    }
    this.pressId = event.pointerId;
    this.pressStart = this.current();
    this.pressMoved = false;
    this.pressing.set(true);
    this.thumbRef().nativeElement.focus({ preventScroll: true });
    try {
      this.trackRef().nativeElement.setPointerCapture(event.pointerId);
    } catch {
      // A pointer that is already gone cannot be captured; the press still ends on release.
    }
    this.watchRelease();
    if (event.pointerType !== 'touch') {
      this.moveTo(event.clientX);
    }
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.pressId !== null && event.pointerId === this.pressId) {
      this.moveTo(event.clientX);
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.pressId === null || event.pointerId !== this.pressId) {
      return;
    }
    if (!this.pressMoved) {
      this.moveTo(event.clientX);
    }
    this.endPress();
  }

  /** The browser took the gesture (a vertical scroll): whatever it moved goes back, no commit. */
  protected onPointerCancel(): void {
    if (this.pressId !== null && this.pressMoved) {
      this.commit(this.pressStart);
    }
    this.endPress();
  }

  protected onContextMenu(event: Event): void {
    // The long press of a touch screen must not open a menu in the middle of a drag.
    if (this.pressId !== null) {
      event.preventDefault();
    }
  }

  /** Release, cancel, lost capture, blur, a lock or the document turning hidden. */
  protected endPress(): void {
    if (this.pressId === null) {
      return;
    }
    const id = this.pressId;
    this.pressId = null;
    this.pressing.set(false);
    this.unwatchRelease();
    const track = this.trackRef().nativeElement;
    try {
      if (track.hasPointerCapture(id)) {
        track.releasePointerCapture(id);
      }
    } catch {
      // Nothing left to release.
    }
    this.emitIfChanged(this.pressStart);
  }

  private watchRelease(): void {
    this.unwatchRelease();
    const onVisibility = (): void => {
      if (this.document.visibilityState === 'hidden') {
        this.endPress();
      }
    };
    this.document.addEventListener('visibilitychange', onVisibility);
    this.stopWatchingRelease = () =>
      this.document.removeEventListener('visibilitychange', onVisibility);
  }

  private unwatchRelease(): void {
    this.stopWatchingRelease?.();
    this.stopWatchingRelease = null;
  }

  // Keyboard

  private keyTarget(key: string): number | null {
    const grid = this.grid();
    const value = this.shown();
    // Left and Right follow the reading direction; Up and Down always add and subtract.
    const forward = this.rtl() ? -1 : 1;
    switch (key) {
      case 'ArrowRight':
        return adjacent(value, forward, grid);
      case 'ArrowLeft':
        return adjacent(value, forward === 1 ? -1 : 1, grid);
      case 'ArrowUp':
        return adjacent(value, 1, grid);
      case 'ArrowDown':
        return adjacent(value, -1, grid);
      case 'PageUp':
        return snap(value + this.largeDelta(), grid);
      case 'PageDown':
        return snap(value - this.largeDelta(), grid);
      case 'Home':
        return snap(grid.min ?? 0, grid);
      case 'End':
        return snap(grid.max ?? 0, grid);
      default:
        return null;
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.syncLock() || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const target = this.keyTarget(event.key);
    if (target === null) {
      return;
    }
    event.preventDefault();
    this.keyChange ??= { before: this.current() };
    this.commit(target);
  }

  protected onKeyup(event: KeyboardEvent): void {
    if (HANDLED_KEYS.has(event.key)) {
      this.endKeyChange();
    }
  }

  private endKeyChange(): void {
    const change = this.keyChange;
    this.keyChange = null;
    if (change !== null) {
      this.emitIfChanged(change.before);
    }
  }

  /** Focus left the slider: any change still in progress ends here, and the control is touched. */
  protected onBlur(): void {
    this.endKeyChange();
    this.endPress();
    if (!this.isDisabled()) {
      this.markTouched();
    }
  }
}
