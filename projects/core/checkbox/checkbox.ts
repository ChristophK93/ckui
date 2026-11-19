import { isPlatformBrowser } from '@angular/common';
import {
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
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';
import { ControlContainer } from '@angular/forms';
import { CK_CONFIG, CkSize } from '@ckui/core';
import { CkError, CkHint } from '@ckui/core/form';
import {
  CK_MESSAGES_CONTEXT,
  CkFormState,
  CkIcon,
  CkMessagesContext,
  CkValueControl,
  createCkId,
  hasAccessibleName,
  lazyNgControl,
  provideCkValueAccessor,
} from '@ckui/core/internal';
import { CK_CHECKBOX_GROUP, CK_NO_OPTION } from './group-context';

declare const ngDevMode: unknown;

/**
 * A checkbox with a label. It is one native `<input type="checkbox">`, so the checked state, Space
 * and a click on the whole row (box, text and hint) work natively. The value is a `boolean`; `null`
 * or `undefined` from a form counts as unchecked.
 *
 * The projected text names the checkbox; a `ck-hint` describes it. Without visible text, give
 * `ck-checkbox` an `aria-label` or `aria-labelledby`: they are inputs and move onto the input element.
 *
 * A standalone checkbox can hold a `ck-error` (for `Validators.requiredTrue`): it shows once the
 * form control is invalid and touched, or its form was submitted. Inside a `ck-checkbox-group`
 * the checkbox takes an `option` instead of a value, and the group shows the errors.
 */
@Component({
  selector: 'ck-checkbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CkIcon],
  providers: [
    provideCkValueAccessor(CkCheckbox),
    { provide: CK_MESSAGES_CONTEXT, useExisting: CkCheckbox },
  ],
  host: { class: 'ck-checkbox-host' },
  template: `
    <label
      class="ck-checkbox"
      [class]="modifierClasses()"
      [class.ck-checkbox--disabled]="disabledNow()"
    >
      <span class="ck-checkbox__control">
        <input
          #input
          class="ck-checkbox__input"
          type="checkbox"
          [checked]="checked()"
          [indeterminate]="indeterminate()"
          [disabled]="disabledNow()"
          [attr.aria-label]="ariaLabel()"
          [attr.aria-labelledby]="labelledby()"
          [attr.aria-describedby]="describedby()"
          [attr.aria-invalid]="invalid() ? 'true' : null"
          (change)="onToggle()"
          (blur)="onBlur()"
        />
        <span class="ck-checkbox__box" aria-hidden="true">
          <ck-icon class="ck-checkbox__mark ck-checkbox__mark--check" name="check" />
          <ck-icon class="ck-checkbox__mark ck-checkbox__mark--minus" name="minus" />
        </span>
      </span>
      <span class="ck-checkbox__body">
        <span class="ck-checkbox__text" [id]="textId"><ng-content /></span>
        <ng-content select="ck-hint" />
        <ng-content select="ck-error" />
      </span>
    </label>
  `,
  styleUrl: './checkbox.css',
})
export class CkCheckbox extends CkValueControl<boolean> implements CkMessagesContext {
  /** Checked or not. `null` or `undefined` from a form counts as unchecked. Not used inside a group. */
  override readonly value: ModelSignal<boolean> = model(false);
  /**
   * The mixed state, for example a "select all" while only some items are on. The next click clears
   * it and checks the box. Bind it two-way, or derive it from your state.
   */
  readonly indeterminate: ModelSignal<boolean> = model(false);
  /** What this checkbox adds to the array of its `ck-checkbox-group` while it is checked. */
  readonly option = input<unknown>(CK_NO_OPTION);
  /** `undefined` takes the size of the group, else the one from `provideCkui`. */
  readonly size = input<CkSize | undefined>(undefined);
  /** Where the text goes: `end` puts the box first, `start` puts the text first and the box at the end. */
  readonly labelPosition = input<'start' | 'end'>('end');
  /** The accessible name for a checkbox without visible text. Moves from the host to the input. */
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  /** The ids of the elements that name the input. Moves from the host to the input. */
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });
  /** More ids that describe the input, after the hint and error. Moves from the host to the input. */
  readonly ariaDescribedby = input<string | null>(null, { alias: 'aria-describedby' });

  private readonly config = inject(CK_CONFIG);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly group = inject(CK_CHECKBOX_GROUP, { optional: true });
  private readonly container = inject(ControlContainer, { optional: true });
  private readonly lookup = lazyNgControl(inject(Injector));
  private readonly formState = new CkFormState({
    control: this.lookup,
    container: () => this.container,
  });
  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly hint = contentChild(CkHint);
  private readonly errors = contentChildren(CkError);

  protected readonly textId = createCkId('ck-checkbox-text');

  protected readonly disabledNow = computed(
    () => this.isDisabled() || (this.group?.disabled() ?? false),
  );

  protected readonly checked = computed(() =>
    this.group ? this.group.isChecked(this.option()) : this.value() === true,
  );

  /** @internal Used by `ck-error`. A group shows its own errors, never one per checkbox. */
  readonly errorsVisible = computed(
    () =>
      this.group === null &&
      this.formState.invalid() &&
      (this.formState.touched() || this.formState.submitted()),
  );

  protected readonly invalid = computed(
    () => this.errorsVisible() || (this.group?.invalid() ?? false),
  );

  protected readonly modifierClasses = computed(
    () =>
      `ck-checkbox--${this.size() ?? this.group?.size() ?? this.config.size} ck-checkbox--label-${this.labelPosition() === 'start' ? 'start' : 'end'}`,
  );

  /** The consumer's names win; otherwise the projected text names the input. */
  protected readonly labelledby = computed(
    () => this.ariaLabelledby() ?? (this.ariaLabel() ? null : this.textId),
  );

  protected readonly describedby = computed(() => {
    const ids = [
      this.hint()?.id(),
      ...(this.errorsVisible() ? this.errors().map((error) => error.id()) : []),
      this.ariaDescribedby(),
    ].filter((id) => !!id);
    return ids.length > 0 ? ids.join(' ') : null;
  });

  constructor() {
    super();
    // The names are inputs here, so the host must not also keep them as a (role-less) attribute.
    const renderer = inject(Renderer2);
    renderer.removeAttribute(this.element, 'aria-label');
    renderer.removeAttribute(this.element, 'aria-labelledby');
    renderer.removeAttribute(this.element, 'aria-describedby');

    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);
    if (isBrowser && this.group === null) {
      effect(() => this.formState.refresh());
      afterEveryRender(() => this.formState.refresh());
      destroyRef.onDestroy(() => this.formState.release());
    }

    if (typeof ngDevMode !== 'undefined' && ngDevMode && isBrowser) {
      let destroyed = false;
      destroyRef.onDestroy(() => (destroyed = true));
      afterNextRender(() => {
        if (destroyed) {
          return;
        }
        if (!hasAccessibleName(this.inputRef().nativeElement, { title: false, text: false })) {
          console.warn(
            '[ckui] ck-checkbox has no accessible name. Add text, or an aria-label or aria-labelledby.',
            this.element,
          );
        }
        if (this.group !== null) {
          if (this.option() === CK_NO_OPTION) {
            console.warn(
              '[ckui] ck-checkbox inside a ck-checkbox-group needs an option, or it can never be checked.',
              this.element,
            );
          }
          if (this.lookup() !== null) {
            console.warn(
              '[ckui] ck-checkbox inside a ck-checkbox-group has its own form binding. Bind the group instead.',
              this.element,
            );
          }
        }
      });
      let warnedValue = false;
      effect(() => {
        if (this.group !== null && this.value() !== false && !warnedValue) {
          warnedValue = true;
          console.warn(
            '[ckui] ck-checkbox inside a ck-checkbox-group has its own value. Its state comes from the group; bind the group instead.',
            this.element,
          );
        }
      });
    }
  }

  protected onToggle(): void {
    const input = this.inputRef().nativeElement;
    // A click on the mixed state checks the box, like a "select all" does.
    const next = this.indeterminate() ? true : input.checked;
    if (this.indeterminate()) {
      this.indeterminate.set(false);
    }
    if (this.group !== null) {
      if (!this.disabledNow()) {
        this.group.toggle(this.option(), next);
      }
    } else {
      this.commit(next);
    }
    // A refused change (disabled in between, a group that kept its array) puts the native state back.
    input.checked = this.checked();
    input.indeterminate = this.indeterminate();
  }

  protected onBlur(): void {
    // In a group, only focus leaving the whole group counts as touched.
    if (this.group === null) {
      this.markTouched();
    }
  }
}
