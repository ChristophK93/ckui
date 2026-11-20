import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  PLATFORM_ID,
  Renderer2,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  contentChild,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { CK_CONFIG } from '@ckui/core';
import { CkHint } from '@ckui/core/form';
import { createCkId, hasAccessibleName } from '@ckui/core/internal';
import { CK_RADIO_GROUP } from './group-context';

declare const ngDevMode: unknown;

/**
 * One choice of a `ck-radio-group`. It is a `<label>` around one native `<input type="radio">`, so
 * the arrow keys, Space and a click on the whole row (circle, text and hint) work natively. The
 * group holds the value; this radio is checked while the group's value is its `option`.
 *
 * The projected text names the radio; a `ck-hint` describes it. Without visible text, give the
 * radio an `aria-label` or `aria-labelledby`: they are inputs and move onto the input element. A
 * `ck-radio` only works inside a `ck-radio-group`. An option of `null` or `undefined` can never be
 * checked, because those values mean "nothing chosen".
 */
@Component({
  selector: 'ck-radio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ck-radio-host' },
  template: `
    <label class="ck-radio" [class]="modifierClasses()" [class.ck-radio--disabled]="disabledNow()">
      <span class="ck-radio__control">
        <input
          #input
          class="ck-radio__input"
          type="radio"
          [name]="group.name()"
          [attr.value]="nativeValue()"
          [checked]="isOn()"
          [disabled]="disabledNow()"
          [attr.aria-label]="ariaLabel()"
          [attr.aria-labelledby]="labelledby()"
          [attr.aria-describedby]="describedby()"
          [attr.aria-invalid]="group.invalid() ? 'true' : null"
          (change)="onChange()"
        />
        <span class="ck-radio__circle" aria-hidden="true"><span class="ck-radio__dot"></span></span>
      </span>
      <span class="ck-radio__body">
        <span class="ck-radio__label" [id]="textId"><ng-content /></span>
        <ng-content select="ck-hint" />
      </span>
    </label>
  `,
  styleUrl: './radio.css',
})
export class CkRadio<T = unknown> implements OnInit {
  /** What the group's value is while this radio is checked. */
  readonly option = input.required<T>();
  /** Blocks this radio only; the group's own `disabled` blocks all of them. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** The accessible name for a radio without visible text. Moves from the host to the input. */
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  /** The ids of the elements that name the input. Moves from the host to the input. */
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });

  private readonly config = inject(CK_CONFIG);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly hint = contentChild(CkHint);
  /** @internal Set once the required `option` has a value; reading it earlier throws. */
  private readonly bound = signal(false);
  /** @internal Read-only view of `bound`, for the group. */
  readonly isBound = this.bound.asReadonly();

  protected readonly group = (() => {
    const found = inject(CK_RADIO_GROUP, { optional: true });
    if (found === null) {
      throw new Error('[ckui] ck-radio has to be inside a ck-radio-group.');
    }
    return found;
  })();

  protected readonly textId = createCkId('ck-radio-text');

  protected readonly disabledNow = computed(() => this.disabled() || this.group.disabled());

  /** @internal Whether the group's value is this radio's option. */
  readonly isOn = computed(() => this.bound() && this.group.isChecked(this.option()));

  protected readonly modifierClasses = computed(
    () => `ck-radio--${this.group.size() ?? this.config.size}`,
  );

  /** The consumer's names win; otherwise the projected text names the input. */
  protected readonly labelledby = computed(
    () => this.ariaLabelledby() ?? (this.ariaLabel() ? null : this.textId),
  );

  /** What a native form post sends: the option, when it is a string, number or boolean. */
  protected readonly nativeValue = computed(() => {
    const option: unknown = this.option();
    return typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean'
      ? String(option)
      : null;
  });

  protected readonly describedby = computed(() => this.hint()?.id() || null);

  constructor() {
    // The names are inputs here, so the host must not also keep them as a (role-less) attribute.
    const renderer = inject(Renderer2);
    renderer.removeAttribute(this.element, 'aria-label');
    renderer.removeAttribute(this.element, 'aria-labelledby');

    if (typeof ngDevMode !== 'undefined' && ngDevMode && isPlatformBrowser(inject(PLATFORM_ID))) {
      let destroyed = false;
      inject(DestroyRef).onDestroy(() => (destroyed = true));
      afterNextRender(() => {
        if (
          !destroyed &&
          !hasAccessibleName(this.inputRef().nativeElement, { title: false, text: false })
        ) {
          console.warn(
            '[ckui] ck-radio has no accessible name. Add text, or an aria-label or aria-labelledby.',
            this.element,
          );
        }
      });
    }
  }

  ngOnInit(): void {
    this.bound.set(true);
  }

  /** @internal Used by the group after a refused change. */
  syncNative(): void {
    this.inputRef().nativeElement.checked = this.isOn();
  }

  protected onChange(): void {
    if (!this.disabledNow() && this.inputRef().nativeElement.checked) {
      this.group.select(this.option());
    }
    // A refused change (disabled in between) puts the native state back, for every radio of the group.
    this.group.resync();
  }
}
