import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  PLATFORM_ID,
  ElementRef,
  Injectable,
  Renderer2,
  afterEveryRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ControlContainer, NgControl } from '@angular/forms';
import {
  AttributeClaim,
  CkAriaWiring,
  CkControlState,
  CkFormState,
  RequiredProbe,
  createCkId,
} from '@ckui/core/internal';

const NATIVE_UI_TYPES = new Set(['date', 'time', 'datetime-local', 'month', 'week']);

interface Snapshot {
  readonly id: string;
  readonly focused: boolean;
  readonly hasValue: boolean;
  readonly hasPlaceholder: boolean;
  readonly builtInUi: boolean;
  readonly disabled: boolean;
  readonly readonly: boolean;
  readonly required: boolean;
}

const INITIAL_SNAPSHOT: Snapshot = {
  id: '',
  focused: false,
  hasValue: false,
  hasPlaceholder: false,
  builtInUi: false,
  disabled: false,
  readonly: false,
  required: false,
};

function sameSnapshot(previous: Snapshot, next: Snapshot): boolean {
  return (Object.keys(previous) as (keyof Snapshot)[]).every((key) => previous[key] === next[key]);
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

  private readonly formState = new CkFormState(
    { control: () => this.ngControl, container: () => this.container },
    () => this.refresh(),
  );
  private readonly snapshot = signal<Snapshot>(INITIAL_SNAPSHOT, { equal: sameSnapshot });
  private readonly versionState = signal(0);
  readonly version = this.versionState.asReadonly();
  readonly id = computed(() => this.snapshot().id);
  readonly focused = computed(() => this.snapshot().focused);
  readonly hasValue = computed(() => this.snapshot().hasValue);
  readonly hasPlaceholder = computed(() => this.snapshot().hasPlaceholder);
  readonly builtInUi = computed(() => this.snapshot().builtInUi);
  readonly disabled = computed(() => this.snapshot().disabled || this.formState.disabled());
  readonly readonly = computed(() => this.snapshot().readonly);
  readonly required = computed(() => this.snapshot().required);
  readonly invalid = computed(() => this.formState.invalid());
  readonly touched = computed(() => this.formState.touched());
  readonly submitted = computed(() => this.formState.submitted());

  private wiring: CkAriaWiring | null = null;
  private lastValue = '';
  private lastModelEmpty = true;
  private readonly invalidClaim = new AttributeClaim(this.element, 'aria-invalid', this.renderer);
  private readonly requiredClaim = new AttributeClaim(this.element, 'aria-required', this.renderer);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly libraryIdsSeen = new Set<string>();
  private readonly requiredProbe = new RequiredProbe();

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
    destroyRef.onDestroy(() => this.formState.release());
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
    this.formState.refresh();

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

    this.snapshot.set({
      id: element.id,
      focused: element.ownerDocument?.activeElement === element,
      hasValue,
      hasPlaceholder: element.placeholder.trim() !== '',
      builtInUi: NATIVE_UI_TYPES.has(type),
      disabled: element.disabled || inDisabledFieldset(element),
      readonly: element.readOnly,
      required: element.required || this.requiredProbe.isRequired(this.ngControl?.control),
    });
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
