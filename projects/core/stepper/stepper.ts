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
  afterRenderEffect,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { CK_CONFIG, CK_LABELS, CkSize } from '@ckui/core';
import {
  CkIcon,
  CkMedia,
  CkValueControl,
  hasAccessibleName,
  provideCkValueAccessor,
} from '@ckui/core/internal';
import {
  StepperGrid,
  createFormatter,
  decimalsOf,
  moveBy,
  parseNumber,
  separatorsOf,
  snap,
} from './stepper-math';

declare const ngDevMode: unknown;

/** A held button repeats after this delay, then at the interval, and speeds up after the ramp. */
const REPEAT_DELAY = 400;
const REPEAT_INTERVAL = 80;
const REPEAT_RAMP = 2000;
const REPEAT_RAMP_FACTOR = 5;
const DEFAULT_LARGE_FACTOR = 10;
const SHOWN_DIGITS = 6;

type Direction = 1 | -1;

/** Accepts `50`, `'50'`, `null`, `undefined` and `''`; anything else that is no number is `NaN`. */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
}

const finiteOrNull = (value: number | null): number | null =>
  value !== null && Number.isFinite(value) ? value : null;

/**
 * A number field with a minus and a plus button. The value is a real text input with the
 * `spinbutton` role: type a number (committed on Enter or blur, snapped to `step` and clamped to
 * `min` / `max`), use the arrow keys, or press the buttons, which repeat while held. An empty
 * field is `null`. The buttons are outside the tab order; the input is the one tab stop.
 *
 * Name it with `aria-label` or `aria-labelledby` on `ck-stepper`, or wrap it in a `<label>`. The
 * attributes are inputs here and move to the input element.
 *
 * The input comes first in the DOM, so a wrapping `<label>` names it rather than a button; the
 * minus button is moved in front of it with CSS `order`.
 */
@Component({
  selector: 'ck-stepper',
  imports: [CkIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [provideCkValueAccessor(CkStepper)],
  host: {
    class: 'ck-stepper',
    '[class]': 'modifierClasses()',
    '[class.ck-stepper--disabled]': 'isDisabled()',
    '[class.ck-stepper--readonly]': 'readonly()',
    '[style.--_ck-stepper-chars]': 'chars()',
    '(focusout)': 'onFocusOut($event)',
    '(click)': 'focusInput($event)',
  },
  template: `
    <span class="ck-stepper__field">
      <input
        #input
        class="ck-stepper__input"
        type="text"
        role="spinbutton"
        [attr.inputmode]="inputMode()"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        enterkeyhint="done"
        [attr.value]="displayValue()"
        [readOnly]="readonly()"
        [disabled]="isDisabled()"
        [attr.aria-label]="ariaLabel()"
        [attr.aria-labelledby]="ariaLabelledby()"
        [attr.aria-describedby]="ariaDescribedby()"
        [attr.aria-readonly]="readonly() ? 'true' : null"
        [attr.aria-valuenow]="current()"
        [attr.aria-valuemin]="bounds().min"
        [attr.aria-valuemax]="bounds().max"
        [attr.aria-valuetext]="valueText()"
        (input)="editing = true"
        (keydown)="onKeydown($event)"
      />
      @if (unit()) {
        <span class="ck-stepper__unit" aria-hidden="true">{{ unit() }}</span>
      }
    </span>
    <button
      type="button"
      class="ck-stepper__button ck-stepper__button--decrement"
      tabindex="-1"
      [attr.aria-label]="decrementText()"
      [disabled]="decrementBlocked()"
      (pointerdown)="onPress($event, -1)"
      (pointermove)="onPressMove($event)"
      (pointerup)="endPress()"
      (pointercancel)="onPressCancel()"
      (lostpointercapture)="endPress()"
      (pointerleave)="endPress()"
      (click)="onButtonClick(-1)"
      (auxclick)="$event.preventDefault()"
      (contextmenu)="$event.preventDefault()"
    >
      <ck-icon name="minus" />
    </button>
    <button
      type="button"
      class="ck-stepper__button ck-stepper__button--increment"
      tabindex="-1"
      [attr.aria-label]="incrementText()"
      [disabled]="incrementBlocked()"
      (pointerdown)="onPress($event, 1)"
      (pointermove)="onPressMove($event)"
      (pointerup)="endPress()"
      (pointercancel)="onPressCancel()"
      (lostpointercapture)="endPress()"
      (pointerleave)="endPress()"
      (click)="onButtonClick(1)"
      (auxclick)="$event.preventDefault()"
      (contextmenu)="$event.preventDefault()"
    >
      <ck-icon name="plus" />
    </button>
  `,
  styleUrl: './stepper.css',
})
export class CkStepper extends CkValueControl<number | null> {
  /** Smallest value. Without it the value has no lower limit. When above `max`, `min` wins. */
  readonly min = input<number | null, unknown>(null, { transform: toNumber });
  /** Largest value. Without it the value has no upper limit. */
  readonly max = input<number | null, unknown>(null, { transform: toNumber });
  /** Distance between values, counted from `min` (else 0). Not a number above 0 counts as 1. */
  readonly step = input<number | null, unknown>(null, { transform: toNumber });
  /** What Page Up and Page Down move by. Default: 10 steps. */
  readonly largeStep = input<number | null, unknown>(null, { transform: toNumber });
  /** Text after the value, part of the value text for assistive technology: `W` reads "250 W". */
  readonly unit = input('');
  /** `undefined` uses the size from `provideCkui`. */
  readonly size = input<CkSize | undefined>(undefined);
  /** The value can be read and focused, but not typed or stepped. */
  readonly readonly = input(false, { transform: booleanAttribute });
  /** Replaces the label of the minus button ("FTP minus 5"). */
  readonly decrementLabel = input('');
  /** Replaces the label of the plus button ("FTP plus 5"). */
  readonly incrementLabel = input('');
  /** The accessible name of the input. Moves from the host to the input element. */
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  /** The ids of the elements that name the input. Moves from the host to the input element. */
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });
  /** The ids of a hint or error for the input. Moves from the host to the input element. */
  readonly ariaDescribedby = input<string | null>(null, { alias: 'aria-describedby' });

  private readonly config = inject(CK_CONFIG);
  private readonly labels = inject(CK_LABELS);
  private readonly locale = inject(LOCALE_ID);
  private readonly media = inject(CkMedia);
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');

  /** Typed text that is not committed yet. */
  protected editing = false;
  /** The text last written into the input, so the render after a commit does not redo it. */
  private shown: string | null = null;
  private holding = false;
  /** Set by an accepted pointerdown on a button; the click that follows it must not step again. */
  private pressed = false;
  private stopWatchingRelease: (() => void) | null = null;
  private repeatTimer: ReturnType<typeof setTimeout> | null = null;
  private repeatElapsed = 0;
  private repeatDirection: Direction = 1;

  protected readonly modifierClasses = computed(
    () => `ck-stepper ck-stepper--${this.size() ?? this.config.size}`,
  );

  /** The decimal keypad has no minus sign, so a range that allows negatives gets the text one. */
  protected readonly inputMode = computed(() => {
    const { min } = this.bounds();
    return min !== null && min < 0 ? 'text' : 'decimal';
  });

  protected readonly stepSize = computed(() => {
    const step = this.step();
    return step !== null && Number.isFinite(step) && step > 0 ? step : 1;
  });

  /** The limits, with `max` raised to `min` when they cross. */
  protected readonly bounds = computed(() => {
    const min = finiteOrNull(this.min());
    const max = finiteOrNull(this.max());
    return { min, max: min !== null && max !== null && max < min ? min : max };
  });

  private readonly digits = computed(() =>
    Math.max(decimalsOf(this.stepSize()), decimalsOf(this.bounds().min ?? 0)),
  );

  private readonly grid = computed<StepperGrid>(() => ({
    step: this.stepSize(),
    ...this.bounds(),
    digits: this.digits(),
  }));

  private readonly largeDelta = computed(() => {
    const large = this.largeStep();
    return large !== null && Number.isFinite(large) && large > 0
      ? large
      : this.stepSize() * DEFAULT_LARGE_FACTOR;
  });

  private readonly separators = computed(() => separatorsOf(this.locale));

  /** The committed value, `null` for none (or anything that is not a finite number). */
  protected readonly current = computed<number | null>(() => {
    const value = this.value();
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  });

  private format(value: number | null): string {
    if (value === null) {
      return '';
    }
    const shown = Math.min(decimalsOf(value), SHOWN_DIGITS);
    return createFormatter(this.locale, this.digits(), shown).format(value);
  }

  protected readonly displayValue = computed(() => this.format(this.current()));

  protected readonly valueText = computed(() => {
    const value = this.displayValue();
    return value === '' ? null : this.unit() ? `${value} ${this.unit()}` : value;
  });

  /** Width of the value in characters, from the formatted limits (else the value), at least 3. */
  protected readonly chars = computed(() => {
    const { min, max } = this.bounds();
    const sources = min !== null || max !== null ? [min, max] : [this.current()];
    const lengths = sources
      .filter((value): value is number => value !== null)
      .map((value) => this.format(value).length);
    return Math.max(3, ...lengths);
  });

  protected readonly decrementText = computed(
    () => this.decrementLabel() || this.labels().decrement,
  );
  protected readonly incrementText = computed(
    () => this.incrementLabel() || this.labels().increment,
  );

  private readonly locked = computed(() => this.isDisabled() || this.readonly());

  protected readonly decrementBlocked = computed(() => {
    const { min } = this.bounds();
    const value = this.current();
    return this.locked() || (value !== null && min !== null && value <= min);
  });

  protected readonly incrementBlocked = computed(() => {
    const { max } = this.bounds();
    const value = this.current();
    return this.locked() || (value !== null && max !== null && value >= max);
  });

  constructor() {
    super();
    // The names are inputs here, so the host must not also keep them as a (role-less) attribute.
    const renderer = inject(Renderer2);
    renderer.removeAttribute(this.element, 'aria-label');
    renderer.removeAttribute(this.element, 'aria-labelledby');
    renderer.removeAttribute(this.element, 'aria-describedby');

    inject(DestroyRef).onDestroy(() => {
      this.holding = false;
      this.clearRepeat();
      this.unwatchRelease();
    });

    effect(() => {
      if (this.locked()) {
        this.endPress();
      }
    });

    let firstRender = true;
    afterRenderEffect(() => {
      const text = this.displayValue();
      if (!this.browser) {
        return;
      }
      const wasFirst = firstRender;
      firstRender = false;
      // Server markup keeps what a visitor typed before the page took over, as a draft.
      if (wasFirst && this.inputRef().nativeElement.value !== text) {
        this.editing = true;
        this.shown = text;
        return;
      }
      // A commit already showed this text; typing since then is a new draft the render must keep.
      if (text !== this.shown) {
        this.show(text);
      }
    });

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
        !hasAccessibleName(this.inputRef().nativeElement, {
          title: false,
          text: false,
          labels: true,
        })
      ) {
        console.warn(
          '[ckui] ck-stepper has no accessible name. Add an aria-label or aria-labelledby, or wrap it in a <label>.',
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
          `[ckui] ck-stepper step must be a number above 0, got ${step}. Using 1.`,
          this.element,
        );
      }
      const min = finiteOrNull(this.min());
      const max = finiteOrNull(this.max());
      if (!warnedBounds && min !== null && max !== null && min > max) {
        warnedBounds = true;
        console.warn(
          `[ckui] ck-stepper min (${min}) is above max (${max}). The value is pinned to min.`,
          this.element,
        );
      }
    });
  }

  /** Writes text into the input and drops any uncommitted typing. */
  private show(text: string): void {
    const input = this.inputRef().nativeElement;
    this.editing = false;
    this.shown = text;
    if (input.value !== text) {
      input.value = text;
    }
  }

  /** The value arrows and buttons start from: the typed text when valid, else the value. */
  private base(): number | null {
    if (!this.editing) {
      return this.current();
    }
    const parsed = parseNumber(this.inputRef().nativeElement.value, this.separators());
    if (parsed === undefined) {
      return this.current();
    }
    return parsed === null ? null : snap(parsed, this.grid());
  }

  /** Moves by `count` steps from the base. Returns whether the committed value changed. */
  private stepBy(direction: Direction, count: number): boolean {
    const grid = this.grid();
    const base = this.base();
    const next =
      base === null
        ? snap(Math.min(grid.min ?? 0, grid.max ?? Infinity), grid)
        : moveBy(base, direction, count, grid);
    return this.settle(next);
  }

  /** Commits a value from the user and shows what the control then holds. */
  private settle(next: number | null): boolean {
    const before = this.current();
    if (next === before) {
      // Also an emptied field whose value was never set: `undefined` to `null` is no change.
      this.show(this.displayValue());
      return false;
    }
    this.commit(next);
    this.show(this.displayValue());
    return !Object.is(before, this.current());
  }

  private commitText(): void {
    if (!this.editing) {
      return;
    }
    const parsed = parseNumber(this.inputRef().nativeElement.value, this.separators());
    if (parsed === undefined) {
      this.show(this.displayValue());
      return;
    }
    this.settle(parsed === null ? null : snap(parsed, this.grid()));
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.isDisabled() || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (event.key === 'Enter') {
      this.commitText();
      return;
    }
    if (this.readonly()) {
      return;
    }
    const { min, max } = this.bounds();
    switch (event.key) {
      case 'ArrowUp':
        this.stepBy(1, 1);
        break;
      case 'ArrowDown':
        this.stepBy(-1, 1);
        break;
      case 'PageUp':
        this.stepBy(1, this.largeDelta() / this.stepSize());
        break;
      case 'PageDown':
        this.stepBy(-1, this.largeDelta() / this.stepSize());
        break;
      case 'Home':
        if (min === null) {
          return;
        }
        this.settle(snap(min, this.grid()));
        break;
      case 'End':
        if (max === null) {
          return;
        }
        this.settle(snap(max, this.grid()));
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  protected onFocusOut(event: FocusEvent): void {
    if (this.isDisabled()) {
      return;
    }
    // Ending a hold counts as touched already, so a blur during one reports once.
    const onInput = event.target === this.inputRef().nativeElement;
    const endsHold = onInput && this.holding;
    if (onInput) {
      this.commitText();
      this.endPress();
    }
    const entering = event.relatedTarget;
    if (!endsHold && (!(entering instanceof Node) || !this.element.contains(entering))) {
      this.markTouched();
    }
  }

  /** A click on the field around the value (the unit, the padding) focuses the input. */
  protected focusInput(event: Event): void {
    const input = this.inputRef().nativeElement;
    const target = event.target;
    if (
      target instanceof Element &&
      target !== input &&
      target.closest('.ck-stepper__field') !== null &&
      !input.disabled
    ) {
      input.focus({ preventScroll: true });
    }
  }

  /** The press starts on pointerdown, so the first step happens at once and a hold can repeat. */
  protected onPress(event: PointerEvent, direction: Direction): void {
    const blocked = direction > 0 ? this.incrementBlocked() : this.decrementBlocked();
    // A button inside `<fieldset disabled>` is :disabled but still gets pointer events.
    const disabledByAncestor = (event.currentTarget as HTMLElement).matches(':disabled');
    if (event.button !== 0 || !event.isPrimary || blocked || disabledByAncestor) {
      return;
    }
    this.pressed = true;
    // Keeps focus where it is (the input, so arrows still work); the click still happens.
    event.preventDefault();
    if (!this.media.coarsePointer()) {
      this.inputRef().nativeElement.focus({ preventScroll: true });
    }
    this.endPress();
    this.holding = true;
    this.watchRelease();
    this.repeatDirection = direction;
    this.repeatElapsed = 0;
    if (this.stepBy(direction, 1)) {
      this.scheduleRepeat(REPEAT_DELAY);
    } else {
      this.endPress();
    }
  }

  /** A pointer that has moved off the button no longer holds it. */
  protected onPressMove(event: PointerEvent): void {
    if (!this.holding) {
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!inside) {
      // Released elsewhere, so no click follows on this button.
      this.pressed = false;
      this.endPress();
    }
  }

  /** The browser took the pointer away: no click follows. */
  protected onPressCancel(): void {
    this.pressed = false;
    this.endPress();
  }

  /**
   * The click after a pointer press was handled on pointerdown and is skipped. A click without a
   * pointerdown (keyboard, a screen reader's activation, `button.click()`) steps once here.
   */
  protected onButtonClick(direction: Direction): void {
    if (this.pressed) {
      this.pressed = false;
      return;
    }
    if (this.locked()) {
      return;
    }
    this.stepBy(direction, 1);
    this.markTouched();
  }

  private scheduleRepeat(delay: number): void {
    this.repeatTimer = setTimeout(() => {
      this.repeatTimer = null;
      this.repeatElapsed += delay;
      if (!this.holding || this.locked() || this.inputRef().nativeElement.matches(':disabled')) {
        this.endPress();
        return;
      }
      const count = this.repeatElapsed >= REPEAT_RAMP ? REPEAT_RAMP_FACTOR : 1;
      if (this.stepBy(this.repeatDirection, count)) {
        this.scheduleRepeat(REPEAT_INTERVAL);
      } else {
        this.endPress();
      }
    }, delay);
  }

  /**
   * On a coarse pointer the input is not focused during a press, so the window losing focus and
   * the document turning hidden are the only signals that the finger will not be released here.
   */
  private watchRelease(): void {
    this.unwatchRelease();
    const view = this.document.defaultView;
    const onVisibility = (): void => {
      if (this.document.visibilityState === 'hidden') {
        this.endPress();
      }
    };
    const onBlur = (): void => this.endPress();
    this.document.addEventListener('visibilitychange', onVisibility);
    view?.addEventListener('blur', onBlur);
    this.stopWatchingRelease = () => {
      this.document.removeEventListener('visibilitychange', onVisibility);
      view?.removeEventListener('blur', onBlur);
    };
  }

  private unwatchRelease(): void {
    this.stopWatchingRelease?.();
    this.stopWatchingRelease = null;
  }

  private clearRepeat(): void {
    if (this.repeatTimer !== null) {
      clearTimeout(this.repeatTimer);
      this.repeatTimer = null;
    }
  }

  /** Release, cancel, lost capture, leave, blur, hidden, a bound or a lock: stops, counts as touched. */
  protected endPress(): void {
    this.clearRepeat();
    this.unwatchRelease();
    if (this.holding) {
      this.holding = false;
      this.markTouched();
    }
  }
}
