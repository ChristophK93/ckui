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
import { CkCheckbox } from './checkbox';
import { CK_CHECKBOX_GROUP, CK_NO_OPTION, CkCheckboxGroupContext } from './group-context';

declare const ngDevMode: unknown;

const LABEL_CLASS = 'ck-checkbox-group__label';
const OWN_LABEL_ID = /^ck-checkbox-group-label-[0-9]+$/;
const REQUIRED_CLASS = 'ck-checkbox-group__required';

/**
 * A group of `ck-checkbox` that edits one array. Each checkbox adds its `option` to the array while it
 * is checked; the array keeps the order of the checkboxes in the page, whatever order they were
 * clicked in. `null` or `undefined` from a form counts as an empty array.
 *
 * The first `<label>` child names the group (`role="group"`); `aria-label` and `aria-labelledby` are
 * inputs that name it too. A `ck-hint` is its description and a `ck-error` shows when the form
 * control is invalid and touched (focus left the whole group) or its form was submitted. Hint and
 * error must be direct children of the group.
 *
 * `required` draws the marker on the label; the group itself never validates. Validation comes from
 * your form: `Validators.required` rejects an empty array (`Validators.minLength(1)` skips it), and the
 * `required` attribute next to `formControl` or `ngModel` adds that same validator. In Signal Forms
 * use `required()` or `minLength(path, 1)`.
 */
@Component({
  selector: 'ck-checkbox-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    provideCkValueAccessor(CkCheckboxGroup),
    { provide: CK_MESSAGES_CONTEXT, useExisting: CkCheckboxGroup },
    { provide: CK_CHECKBOX_GROUP, useFactory: () => inject(CkCheckboxGroup).context },
  ],
  host: {
    class: 'ck-checkbox-group',
    role: 'group',
    '[class]': 'modifierClasses()',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-labelledby]': 'labelledby()',
    '[attr.aria-describedby]': 'describedby()',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    <ng-content select="label" />
    <div class="ck-checkbox-group__list"><ng-content /></div>
    <div class="ck-checkbox-group__messages">
      <ng-content select="ck-hint" />
      <ng-content select="ck-error" />
    </div>
  `,
  styleUrl: './checkbox-group.css',
})
export class CkCheckboxGroup<T = unknown>
  extends CkValueControl<T[]>
  implements CkMessagesContext, AfterContentInit
{
  /** The options that are checked. `null` or `undefined` from a form counts as empty. */
  override readonly value: ModelSignal<T[]> = model<T[]>([]);
  /** `undefined` uses the size from `provideCkui`. Every checkbox in the group takes it as its default. */
  readonly size = input<CkSize | undefined>(undefined);
  /** Draws the required marker on the label. Presentational: validation comes from your form. */
  readonly required = input(false, { transform: booleanAttribute });
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
  private readonly checkboxes = contentChildren(CkCheckbox, { descendants: true });
  private readonly hints = contentChildren(CkHint);
  private readonly errors = contentChildren(CkError);
  private readonly labelId = signal<string | null>(null);
  private readonly generatedLabelId = createCkId('ck-checkbox-group-label');
  private warnedUnknown = false;

  private readonly selected = computed<readonly unknown[]>(() => {
    const value: unknown = this.value();
    return Array.isArray(value) ? value : [];
  });

  /** @internal Used by `ck-error`. */
  readonly errorsVisible = computed(
    () => this.formState.invalid() && (this.formState.touched() || this.formState.submitted()),
  );

  /** @internal Used by `ck-checkbox`. */
  readonly context: CkCheckboxGroupContext = {
    size: this.size,
    disabled: this.isDisabled,
    invalid: this.errorsVisible,
    isChecked: (option) => this.selected().some((entry) => Object.is(entry, option)),
    toggle: (option, checked) => this.toggle(option, checked),
  };

  protected readonly modifierClasses = computed(
    () =>
      `ck-checkbox-group--${this.size() ?? this.config.size}${this.isDisabled() ? ' ck-checkbox-group--disabled' : ''}`,
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
            '[ckui] ck-checkbox-group has no accessible name. Add a <label> as a direct child, or an aria-label or aria-labelledby.',
            this.element,
          );
        }
      });
    }
  }

  ngAfterContentInit(): void {
    // Before the host bindings run, so the first render (and a server render) is already named.
    this.wire();
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

  /** Builds the array in the order of the checkboxes; values no checkbox knows stay at the end. */
  private toggle(option: unknown, checked: boolean): void {
    const boxes = this.checkboxes();
    const next: unknown[] = [];
    for (const box of boxes) {
      const boxOption = box.option();
      if (boxOption === CK_NO_OPTION || next.some((entry) => Object.is(entry, boxOption))) {
        continue;
      }
      const on = Object.is(boxOption, option) ? checked : this.context.isChecked(boxOption);
      if (on) {
        next.push(boxOption);
      }
    }
    const unknown = this.selected().filter(
      (entry) => !boxes.some((box) => Object.is(box.option(), entry)),
    );
    if (unknown.length > 0 && !this.warnedUnknown) {
      this.warnedUnknown = true;
      if (typeof ngDevMode !== 'undefined' && ngDevMode) {
        console.warn(
          '[ckui] ck-checkbox-group holds values that no checkbox has as its option; they are kept.',
          unknown,
          this.element,
        );
      }
    }
    this.commit([...next, ...unknown] as T[]);
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
