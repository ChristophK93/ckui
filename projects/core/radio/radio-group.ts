import { isPlatformBrowser } from '@angular/common';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  ModelSignal,
  PLATFORM_ID,
  Renderer2,
  ViewEncapsulation,
  afterEveryRender,
  afterNextRender,
  booleanAttribute,
  computed,
  contentChildren,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import { ControlContainer } from '@angular/forms';
import { CK_CONFIG, CkSize } from '@ckui/core';
import { CkError, CkHint } from '@ckui/core/form';
import {
  CK_MESSAGES_CONTEXT,
  CkFormState,
  CkMessagesContext,
  CkValueControl,
  createCkId,
  hasAccessibleName,
  lazyNgControl,
  provideCkValueAccessor,
  syncRequiredMarker,
} from '@ckui/core/internal';
import { CK_RADIO_GROUP, CkRadioGroupContext } from './group-context';
import { CkRadio } from './radio';

declare const ngDevMode: unknown;

const LABEL_CLASS = 'ck-radio-group__label';
const OWN_LABEL_ID = /^ck-radio-group-label-[0-9]+$/;
const REQUIRED_CLASS = 'ck-radio-group__required';

/**
 * A group of `ck-radio` that edits one value: the `option` of the radio that is checked. `null` or
 * `undefined` means nothing is checked, which is also what a value that matches no radio shows.
 * Options are matched with `compareWith` (default `Object.is`).
 *
 * The radios are native inputs that share one `name`, so Tab, Shift+Tab, the arrow keys (which move
 * and check, skip disabled radios and wrap) and Space work natively. The first `<label>` child names
 * the group (`role="radiogroup"`); `aria-label` and `aria-labelledby` are inputs that name it too. A
 * `ck-hint` is its description and a `ck-error` shows when the form control is invalid and touched
 * (focus left the whole group) or its form was submitted. Hint and error must be direct children
 * of the group.
 *
 * `required` draws the marker on the label and sets `aria-required`; the group itself never
 * validates. Validation comes from your form: `Validators.required`, the `required` attribute next
 * to `formControl` or `ngModel`, or `required()` in Signal Forms.
 */
@Component({
  selector: 'ck-radio-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    provideCkValueAccessor(CkRadioGroup),
    { provide: CK_MESSAGES_CONTEXT, useExisting: CkRadioGroup },
    { provide: CK_RADIO_GROUP, useFactory: () => inject(CkRadioGroup).context },
  ],
  host: {
    class: 'ck-radio-group',
    role: 'radiogroup',
    '[class]': 'modifierClasses()',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-labelledby]': 'labelledby()',
    '[attr.aria-describedby]': 'describedby()',
    '[attr.aria-required]': 'required() ? "true" : null',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    <ng-content select="label" />
    <div class="ck-radio-group__list"><ng-content /></div>
    <div class="ck-radio-group__messages">
      <ng-content select="ck-hint" />
      <ng-content select="ck-error" />
    </div>
  `,
  styleUrl: './radio-group.css',
})
export class CkRadioGroup<T = unknown>
  extends CkValueControl<T | null>
  implements CkMessagesContext, AfterContentInit
{
  /** The `option` of the checked radio. `null` or `undefined` means nothing is checked. */
  override readonly value: ModelSignal<T | null> = model<T | null>(null);
  /** `undefined` uses the size from `provideCkui`. Every radio in the group takes it. */
  readonly size = input<CkSize | undefined>(undefined);
  /** Draws the required marker and sets `aria-required`. Presentational: validation comes from your form. */
  readonly required = input(false, { transform: booleanAttribute });
  /** Lays the radios in a wrapping row instead of a column. */
  readonly inline = input(false, { transform: booleanAttribute });
  /** The `name` of the native inputs, for a native form post. Default: a generated one. */
  readonly name = input<string>(createCkId('ck-radio-group'));
  /** Tells whether a radio's option is the group's value. Default `Object.is`. Never gets `null`. */
  readonly compareWith = input<(option: T, value: T) => boolean>(Object.is);
  /** The accessible name when there is no `<label>`. Moves from the host to the group element. */
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  /** The ids of the elements that name the group. Wins over the `<label>`. */
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });
  /** More ids that describe the group, after the hints and errors. */
  readonly ariaDescribedby = input<string | null>(null, { alias: 'aria-describedby' });

  private readonly destroyRef = inject(DestroyRef);
  private readonly config = inject(CK_CONFIG);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly container = inject(ControlContainer, { optional: true });
  private readonly lookup = lazyNgControl(inject(Injector));
  private readonly formState = new CkFormState({
    control: this.lookup,
    container: () => this.container,
  });
  private readonly radios = contentChildren(CkRadio, { descendants: true });
  private readonly hints = contentChildren(CkHint);
  private readonly errors = contentChildren(CkError);
  private readonly labelId = signal<string | null>(null);
  private readonly generatedLabelId = createCkId('ck-radio-group-label');
  /** The default of `name`, read before any binding: used when a bound `name` is empty. */
  private readonly generatedName = this.name();
  private warnedUnknown = false;

  /** @internal Used by `ck-error`. */
  readonly errorsVisible = computed(
    () => this.formState.invalid() && (this.formState.touched() || this.formState.submitted()),
  );

  /** @internal Used by `ck-radio`. */
  readonly context: CkRadioGroupContext = {
    size: this.size,
    name: computed(() => this.name() || this.generatedName),
    disabled: this.isDisabled,
    invalid: this.errorsVisible,
    isChecked: (option) => this.isChecked(option),
    select: (option) => this.commit(option as T),
    resync: () => this.radios().forEach((radio) => radio.syncNative()),
  };

  protected readonly modifierClasses = computed(
    () =>
      `ck-radio-group--${this.size() ?? this.config.size}${this.inline() ? ' ck-radio-group--inline' : ''}${this.isDisabled() ? ' ck-radio-group--disabled' : ''}`,
  );

  protected readonly labelledby = computed(
    () => this.ariaLabelledby() ?? (this.ariaLabel() ? null : this.labelId()),
  );

  protected readonly describedby = computed(() => {
    const ids = [
      ...this.hints().map((hint) => hint.id()),
      ...(this.errorsVisible() ? this.errors().map((error) => error.id()) : []),
      this.ariaDescribedby(),
    ].filter((id) => !!id);
    return ids.length > 0 ? ids.join(' ') : null;
  });

  constructor() {
    super();
    // The names are inputs here, so the host must not also keep them as plain attributes.
    const renderer = inject(Renderer2);
    renderer.removeAttribute(this.element, 'aria-label');
    renderer.removeAttribute(this.element, 'aria-labelledby');
    renderer.removeAttribute(this.element, 'aria-describedby');

    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = this.destroyRef;
    if (isBrowser) {
      effect(() => this.formState.refresh());
      afterEveryRender(() => {
        this.formState.refresh();
        this.wire();
      });
      destroyRef.onDestroy(() => this.formState.release());
    }

    if (typeof ngDevMode !== 'undefined' && ngDevMode && isBrowser) {
      let destroyed = false;
      destroyRef.onDestroy(() => (destroyed = true));
      afterNextRender(() => {
        if (!destroyed && !hasAccessibleName(this.element, { title: false, text: false })) {
          console.warn(
            '[ckui] ck-radio-group has no accessible name. Add a <label> as a direct child, or an aria-label or aria-labelledby.',
            this.element,
          );
        }
      });
      effect(() => {
        const value = this.value() ?? null;
        const radios = this.radios();
        // A radio whose option is not bound yet may still turn out to be the checked one.
        const matched =
          value === null ||
          radios.length === 0 ||
          !radios.every((radio) => radio.isBound()) ||
          radios.some((radio) => radio.isOn());
        untracked(() => {
          if (matched || this.warnedUnknown) {
            return;
          }
          this.warnedUnknown = true;
          console.warn(
            '[ckui] ck-radio-group value matches no ck-radio, so none is checked. Check the option values or add compareWith.',
            value,
            this.element,
          );
        });
      });
    }
  }

  ngAfterContentInit(): void {
    // Before the host bindings run, so the first render (and a server render) is already named.
    this.wire();
  }

  private isChecked(option: unknown): boolean {
    const value = this.value() ?? null;
    if (value === null) {
      return false;
    }
    return (this.compareWith() as (option: unknown, value: unknown) => boolean)(option, value);
  }

  private label(): HTMLLabelElement | null {
    const found = Array.from(this.element.children).find((child) => child.tagName === 'LABEL');
    return (found as HTMLLabelElement | undefined) ?? null;
  }

  /** Gives the label an id (a consumer's own stays) and the required marker. Idempotent. */
  private wire(): void {
    const label = this.label();
    if (label === null) {
      this.labelId.set(null);
      return;
    }
    label.classList.add(LABEL_CLASS);
    // A server-generated id of the library's own pattern is replaced; any other id is the consumer's.
    if (label.id === '' || (label.id !== this.generatedLabelId && OWN_LABEL_ID.test(label.id))) {
      label.setAttribute('id', this.generatedLabelId);
    }
    this.labelId.set(label.id);
    syncRequiredMarker(label, this.required(), { label: LABEL_CLASS, marker: REQUIRED_CLASS });
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && this.element.contains(next)) {
      return;
    }
    if (next === null) {
      // A press on a label, hint or gap blurs before the next radio takes focus: decide afterwards.
      setTimeout(() => {
        const active = this.element.ownerDocument.activeElement;
        if (!this.destroyRef.destroyed && !(active !== null && this.element.contains(active))) {
          this.markTouched();
        }
      });
      return;
    }
    this.markTouched();
  }
}
