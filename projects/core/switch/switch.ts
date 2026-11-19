import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ModelSignal,
  PLATFORM_ID,
  Renderer2,
  ViewEncapsulation,
  afterNextRender,
  computed,
  contentChild,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CK_CONFIG, CkSize } from '@ckui/core';
import {
  CkValueControl,
  createCkId,
  hasAccessibleName,
  provideCkValueAccessor,
} from '@ckui/core/internal';
import { CkSwitchHint } from './switch-hint';

declare const ngDevMode: unknown;

/**
 * An on/off switch with a label. It is one native `<input type="checkbox" role="switch">`, so the
 * checked state, Space and a click on the whole row (label text, hint and switch) work natively.
 * The value is a `boolean`; `null` or `undefined` from a form counts as off.
 *
 * The projected text names the switch; a `ck-switch-hint` describes it. Without visible text, give
 * `ck-switch` an `aria-label` or `aria-labelledby`: they are inputs and move onto the input element.
 */
@Component({
  selector: 'ck-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [provideCkValueAccessor(CkSwitch)],
  host: { class: 'ck-switch-host' },
  template: `
    <label class="ck-switch" [class]="modifierClasses()" [class.ck-switch--disabled]="isDisabled()">
      <span class="ck-switch__control">
        <input
          #input
          class="ck-switch__input"
          type="checkbox"
          role="switch"
          [checked]="on()"
          [disabled]="isDisabled()"
          [attr.aria-label]="ariaLabel()"
          [attr.aria-labelledby]="labelledby()"
          [attr.aria-describedby]="describedby()"
          (change)="onToggle()"
          (blur)="markTouched()"
        />
        <span class="ck-switch__track" aria-hidden="true">
          <span class="ck-switch__thumb"></span>
        </span>
      </span>
      <span class="ck-switch__body">
        <span class="ck-switch__text" [id]="textId"><ng-content /></span>
        <ng-content select="ck-switch-hint" />
      </span>
    </label>
  `,
  styleUrl: './switch.css',
})
export class CkSwitch extends CkValueControl<boolean> {
  /** On or off. `null` or `undefined` from a form counts as off. */
  override readonly value: ModelSignal<boolean> = model(false);
  /** `undefined` uses the size from `provideCkui`. */
  readonly size = input<CkSize | undefined>(undefined);
  /** Where the text goes: `start` puts it first and the switch at the end of the row. */
  readonly labelPosition = input<'start' | 'end'>('start');
  /** The accessible name for a switch without visible text. Moves from the host to the input. */
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  /** The ids of the elements that name the input. Moves from the host to the input. */
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });
  /** More ids that describe the input, after the hint. Moves from the host to the input. */
  readonly ariaDescribedby = input<string | null>(null, { alias: 'aria-describedby' });

  private readonly config = inject(CK_CONFIG);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly hint = contentChild(CkSwitchHint);

  protected readonly textId = createCkId('ck-switch-text');

  protected readonly on = computed(() => this.value() === true);

  protected readonly modifierClasses = computed(
    () =>
      `ck-switch--${this.size() ?? this.config.size} ck-switch--label-${this.labelPosition() === 'end' ? 'end' : 'start'}`,
  );

  /** The consumer's names win; otherwise the projected text names the input. */
  protected readonly labelledby = computed(
    () => this.ariaLabelledby() ?? (this.ariaLabel() ? null : this.textId),
  );

  protected readonly describedby = computed(() => {
    const ids = [this.hint()?.id(), this.ariaDescribedby()].filter((id) => !!id);
    return ids.length > 0 ? ids.join(' ') : null;
  });

  constructor() {
    super();
    // The names are inputs here, so the host must not also keep them as a (role-less) attribute.
    const renderer = inject(Renderer2);
    renderer.removeAttribute(this.element, 'aria-label');
    renderer.removeAttribute(this.element, 'aria-labelledby');
    renderer.removeAttribute(this.element, 'aria-describedby');

    if (typeof ngDevMode !== 'undefined' && ngDevMode && isPlatformBrowser(inject(PLATFORM_ID))) {
      let destroyed = false;
      inject(DestroyRef).onDestroy(() => (destroyed = true));
      afterNextRender(() => {
        if (
          !destroyed &&
          !hasAccessibleName(this.inputRef().nativeElement, { title: false, text: false })
        ) {
          console.warn(
            '[ckui] ck-switch has no accessible name. Add text, or an aria-label or aria-labelledby.',
            this.element,
          );
        }
      });
    }
  }

  protected onToggle(): void {
    const input = this.inputRef().nativeElement;
    this.commit(input.checked);
    // A refused change (disabled in between) puts the native state back.
    input.checked = this.on();
  }
}
