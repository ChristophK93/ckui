import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  PLATFORM_ID,
  ElementRef,
  Injectable,
  InjectionToken,
  Renderer2,
  Signal,
  afterEveryRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  ControlContainer,
  FormControl,
  NgControl,
  Validators,
} from '@angular/forms';
import { CkSize } from '@ckui/core';
import { createCkId } from '@ckui/core/internal';

/** What `ck-field` asks of `ckInput` for the ARIA attributes on the native control. */
export interface CkAriaWiring {
  readonly describedBy: readonly string[];
  /** Every hint and error id of the field, shown or not; tokens with these ids belong to the field. */
  readonly libraryIds: readonly string[];
  readonly invalid: boolean;
  readonly required: boolean;
}

/** What `ckInput` tells `ck-field` about the native control. Internal, not exported from the entry point. */
export interface CkControlState {
  readonly element: HTMLInputElement | HTMLTextAreaElement;
  readonly id: Signal<string>;
  readonly focused: Signal<boolean>;
  readonly hasValue: Signal<boolean>;
  readonly hasPlaceholder: Signal<boolean>;
  readonly nativeUi: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly required: Signal<boolean>;
  readonly invalid: Signal<boolean>;
  readonly touched: Signal<boolean>;
  readonly submitted: Signal<boolean>;
  /** Counts value changes, however they happened (typing, forms API, `[value]`). */
  readonly version: Signal<number>;
  setWiring(wiring: CkAriaWiring): void;
}

/** What `ckInput`, `ck-hint` and `ck-error` ask of the surrounding `ck-field`. */
export interface CkFieldContext {
  readonly resolvedSize: Signal<CkSize>;
  readonly errorsVisible: Signal<boolean>;
}

export const CK_CONTROL_STATE = new InjectionToken<CkControlState>('CK_CONTROL_STATE');
export const CK_FIELD_CONTEXT = new InjectionToken<CkFieldContext>('CK_FIELD_CONTEXT');

const NATIVE_UI_TYPES = new Set(['date', 'time', 'datetime-local', 'month', 'week']);

interface Snapshot {
  readonly id: string;
  readonly focused: boolean;
  readonly hasValue: boolean;
  readonly hasPlaceholder: boolean;
  readonly nativeUi: boolean;
  readonly disabled: boolean;
  readonly readonly: boolean;
  readonly required: boolean;
  readonly invalid: boolean;
  readonly touched: boolean;
  readonly submitted: boolean;
}

const INITIAL_SNAPSHOT: Snapshot = {
  id: '',
  focused: false,
  hasValue: false,
  hasPlaceholder: false,
  nativeUi: false,
  disabled: false,
  readonly: false,
  required: false,
  invalid: false,
  touched: false,
  submitted: false,
};

function sameSnapshot(previous: Snapshot, next: Snapshot): boolean {
  return (Object.keys(previous) as (keyof Snapshot)[]).every((key) => previous[key] === next[key]);
}

/**
 * Holds an attribute the component overrides, and gives the consumer's own value back afterwards.
 * The consumer's value is also kept in a `data-ck-claim-*` attribute, so markup that was rendered
 * earlier (server render) is recognised: a value the library wrote is never mistaken for the
 * consumer's.
 */
class AttributeClaim {
  private claimed = false;
  private ours: string | null = null;
  private theirs: string | null = null;
  private readonly marker: string;

  constructor(
    private readonly element: HTMLElement,
    private readonly name: string,
    private readonly renderer: Renderer2,
  ) {
    this.marker = `data-ck-claim-${name}`;
  }

  /** `desired` of `null` releases the attribute. A consumer rewriting it in between is noticed. */
  apply(desired: string | null): void {
    const current = this.element.getAttribute(this.name);
    if (!this.claimed) {
      const recorded = this.element.getAttribute(this.marker);
      if (recorded !== null) {
        this.claimed = true;
        this.ours = current;
        this.theirs = recorded === 'none' ? null : recorded.slice('value:'.length);
      } else {
        this.theirs = current;
      }
    } else if (current !== this.ours) {
      this.theirs = current;
    }
    if (desired !== null) {
      this.claimed = true;
      this.ours = desired;
      this.renderer.setAttribute(
        this.element,
        this.marker,
        this.theirs === null ? 'none' : `value:${this.theirs}`,
      );
      if (current !== desired) {
        this.renderer.setAttribute(this.element, this.name, desired);
      }
    } else if (this.claimed) {
      this.claimed = false;
      this.ours = null;
      this.renderer.removeAttribute(this.element, this.marker);
      if (this.theirs === null) {
        this.renderer.removeAttribute(this.element, this.name);
      } else if (current !== this.theirs) {
        this.renderer.setAttribute(this.element, this.name, this.theirs);
      }
    }
  }
}

function tokens(value: string | null): string[] {
  return (value ?? '').split(/\s+/).filter((token) => token !== '');
}

/** A control inside `<fieldset disabled>` is disabled without a `disabled` attribute of its own. */
function inDisabledFieldset(element: HTMLElement): boolean {
  try {
    return element.matches(':disabled');
  } catch {
    return false;
  }
}

function isEmptyModel(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * Reads a native input from the DOM and from whichever forms API drives it (Reactive Forms,
 * `ngModel`, Signal Forms) into signals. Provided by `ckInput`, one per control.
 */
@Injectable()
export class CkInputControl implements CkControlState {
  readonly element =
    inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly container = inject(ControlContainer, { optional: true });

  private readonly snapshot = signal<Snapshot>(INITIAL_SNAPSHOT, { equal: sameSnapshot });
  private readonly versionState = signal(0);
  readonly version = this.versionState.asReadonly();
  readonly id = computed(() => this.snapshot().id);
  readonly focused = computed(() => this.snapshot().focused);
  readonly hasValue = computed(() => this.snapshot().hasValue);
  readonly hasPlaceholder = computed(() => this.snapshot().hasPlaceholder);
  readonly nativeUi = computed(() => this.snapshot().nativeUi);
  readonly disabled = computed(() => this.snapshot().disabled);
  readonly readonly = computed(() => this.snapshot().readonly);
  readonly required = computed(() => this.snapshot().required);
  readonly invalid = computed(() => this.snapshot().invalid);
  readonly touched = computed(() => this.snapshot().touched);
  readonly submitted = computed(() => this.snapshot().submitted);

  private wiring: CkAriaWiring | null = null;
  private lastValue = '';
  private lastModelEmpty = true;
  private readonly invalidClaim = new AttributeClaim(this.element, 'aria-invalid', this.renderer);
  private readonly requiredClaim = new AttributeClaim(this.element, 'aria-required', this.renderer);
  private watchedControl: AbstractControl | null = null;
  private watchedForm: AbstractControl | null = null;
  private subscriptions: { unsubscribe(): void }[] = [];
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly libraryIdsSeen = new Set<string>();
  private probedValidator: unknown;
  private probedVerdict = false;

  constructor() {
    if (!this.isBrowser) {
      return;
    }
    const element = this.element;
    const destroyRef = inject(DestroyRef);
    if (element.id === '') {
      this.renderer.setAttribute(element, 'id', createCkId('ck-input'));
    }
    const listener = (): void => this.refresh();
    for (const type of ['focus', 'blur', 'input', 'change']) {
      element.addEventListener(type, listener);
      destroyRef.onDestroy(() => element.removeEventListener(type, listener));
    }
    destroyRef.onDestroy(() => this.unsubscribe());
    // Signal Forms state is read through signals, so this re-runs when it changes.
    effect(() => this.refresh());
    afterEveryRender(() => {
      this.refresh();
      this.applyWiring();
    });
  }

  setWiring(wiring: CkAriaWiring): void {
    if (!this.isBrowser) {
      return;
    }
    this.wiring = wiring;
    this.applyWiring();
  }

  /** Copies the current DOM and forms state into the signals. Cheap when nothing changed. */
  refresh(): void {
    if (!this.isBrowser) {
      return;
    }
    const element = this.element;
    const control = this.ngControl;
    this.watch();

    if (element.id === '') {
      this.renderer.setAttribute(element, 'id', createCkId('ck-input'));
    }
    const type = element.tagName === 'INPUT' ? (element as HTMLInputElement).type : '';
    const model: unknown = control?.value;
    const modelEmpty = isEmptyModel(model);
    // A number input holding "-" or "1e" reports an empty value but is not empty.
    const hasValue = element.value !== '' || !modelEmpty || !!element.validity?.badInput;
    if (element.value !== this.lastValue || modelEmpty !== this.lastModelEmpty) {
      this.lastValue = element.value;
      this.lastModelEmpty = modelEmpty;
      this.versionState.update((count) => count + 1);
    }
    const form = this.container?.formDirective as { submitted?: boolean } | null | undefined;

    this.snapshot.set({
      id: element.id,
      focused: element.ownerDocument?.activeElement === element,
      hasValue,
      hasPlaceholder: element.placeholder.trim() !== '',
      nativeUi: NATIVE_UI_TYPES.has(type),
      disabled: element.disabled || (control?.disabled ?? false) || inDisabledFieldset(element),
      readonly: element.readOnly,
      required: element.required || this.hasRequiredValidator(),
      invalid: control?.invalid ?? false,
      touched: control?.touched ?? false,
      submitted: form?.submitted === true,
    });
  }

  private hasRequiredValidator(): boolean {
    const control = this.ngControl?.control;
    if (!control) {
      return false;
    }
    if (control.hasValidator?.(Validators.required)) {
      return true;
    }
    // A composed validator hides `Validators.required`; ask it what it says about an empty value.
    const validator = control.validator;
    if (validator !== this.probedValidator) {
      const verdict = validator?.(new FormControl(''));
      this.probedValidator = validator;
      this.probedVerdict = verdict !== null && verdict !== undefined && 'required' in verdict;
    }
    return this.probedVerdict;
  }

  /** (Re)subscribes when the control or its form changes. Reactive Forms has no signals to read. */
  private watch(): void {
    const control = this.ngControl?.control;
    const nextControl = control instanceof AbstractControl ? control : null;
    const root = (this.container?.formDirective as { control?: unknown } | null | undefined)
      ?.control;
    const nextForm = root instanceof AbstractControl ? root : null;
    if (nextControl === this.watchedControl && nextForm === this.watchedForm) {
      return;
    }
    this.unsubscribe();
    this.watchedControl = nextControl;
    this.watchedForm = nextForm;
    const listener = (): void => this.refresh();
    for (const target of new Set([nextControl, nextForm])) {
      if (target) {
        this.subscriptions.push(target.events.subscribe(listener));
      }
    }
  }

  private unsubscribe(): void {
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions = [];
    this.watchedControl = null;
    this.watchedForm = null;
  }

  private applyWiring(): void {
    const wiring = this.wiring;
    if (!wiring) {
      return;
    }
    const element = this.element;
    const current = tokens(element.getAttribute('aria-describedby'));
    // An id the field ever owned stays the field's, even after its hint or error is gone.
    wiring.libraryIds.forEach((id) => this.libraryIdsSeen.add(id));
    const consumer = current.filter((token) => !this.libraryIdsSeen.has(token));
    const desired = [...consumer, ...wiring.describedBy];
    if (desired.join(' ') !== current.join(' ')) {
      if (desired.length > 0) {
        this.renderer.setAttribute(element, 'aria-describedby', desired.join(' '));
      } else {
        this.renderer.removeAttribute(element, 'aria-describedby');
      }
    }
    this.invalidClaim.apply(wiring.invalid ? 'true' : null);
    this.requiredClaim.apply(wiring.required && !element.required ? 'true' : null);
  }
}
