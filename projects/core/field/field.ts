import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  PLATFORM_ID,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterEveryRender,
  afterNextRender,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { CK_CONFIG, CkSize } from '@ckui/core';
import { CkError, CkHint } from '@ckui/core/form';
import {
  CK_CONTROL_STATE,
  CK_FIELD_CONTEXT,
  CK_MESSAGES_CONTEXT,
  CkFieldContext,
  CkMessagesContext,
  syncRequiredMarker,
} from '@ckui/core/internal';
import { CkPrefix } from './affix';
import { loadFieldStyles } from './styles';

declare const ngDevMode: unknown;

const LABEL_CLASS = 'ck-field__label';
const REQUIRED_CLASS = 'ck-field__required';

/**
 * Wraps one control (a native `ckInput` or a `ck-stepper`) with a floating `<label>`, `ck-hint`, `ck-error`, and `[ckPrefix]` /
 * `[ckSuffix]` content, and wires ids and ARIA between them.
 */
@Component({
  selector: 'ck-field',
  templateUrl: './field.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    { provide: CK_FIELD_CONTEXT, useExisting: CkField },
    { provide: CK_MESSAGES_CONTEXT, useExisting: CkField },
  ],
  host: {
    class: 'ck-field',
    '[class]': 'modifierClasses()',
  },
})
export class CkField implements CkFieldContext, CkMessagesContext {
  /** `undefined` uses the size from `provideCkui`. */
  readonly size = input<CkSize | undefined>(undefined);
  /** `always` keeps the label on the border even when the control is empty and unfocused. */
  readonly labelFloat = input<'auto' | 'always'>('auto');
  /** `undefined` follows the control; `true` or `false` forces the invalid look and the errors. */
  readonly invalid = input<boolean | undefined>(undefined);

  private readonly config = inject(CK_CONFIG);
  private readonly controls = contentChildren(CK_CONTROL_STATE, { descendants: true });
  private readonly hints = contentChildren(CkHint, { descendants: true });
  private readonly errors = contentChildren(CkError, { descendants: true });
  private readonly prefix = contentChild(CkPrefix, { descendants: true });
  private readonly main = viewChild<ElementRef<HTMLElement>>('main');
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private labelForSetByField = '';

  /** @internal Used by `ckInput`. */
  readonly resolvedSize = computed(() => this.size() ?? this.config.size);
  private readonly control = computed(() => this.controls()[0] ?? null);

  /** @internal Used by `ck-error`. */
  readonly errorsVisible = computed(() => {
    const forced = this.invalid();
    if (forced !== undefined) {
      return forced;
    }
    const control = this.control();
    return control !== null && control.invalid() && (control.touched() || control.submitted());
  });

  private readonly floated = computed(() => {
    if (this.labelFloat() === 'always') {
      return true;
    }
    const control = this.control();
    return (
      control !== null &&
      (control.focused() ||
        control.hasValue() ||
        control.hasPlaceholder() ||
        control.builtInUi() ||
        this.prefix() !== undefined)
    );
  });

  protected readonly modifierClasses = computed(() => {
    const control = this.control();
    const classes = ['ck-field', `ck-field--${this.resolvedSize()}`];
    if (this.floated()) {
      classes.push('ck-field--floated');
    }
    if (this.errorsVisible()) {
      classes.push('ck-field--invalid');
    }
    if (control?.disabled()) {
      classes.push('ck-field--disabled');
    }
    if (control?.element.tagName === 'TEXTAREA') {
      classes.push('ck-field--textarea');
    }
    return classes.join(' ');
  });

  constructor() {
    loadFieldStyles();
    if (this.isBrowser) {
      effect(() => this.wire());
      afterEveryRender(() => this.wire());
    }

    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
      let destroyed = false;
      inject(DestroyRef).onDestroy(() => (destroyed = true));
      afterNextRender(() => {
        if (destroyed) {
          return;
        }
        const count = this.controls().length;
        if (count !== 1) {
          console.warn(
            `[ckui] ck-field needs exactly one control (ckInput, ck-stepper or ck-select), found ${count}.`,
            this.main()?.nativeElement.closest('ck-field'),
          );
        }
        if (this.label() === null) {
          console.warn(
            '[ckui] ck-field has no <label>, so its control has no accessible name.',
            this.main()?.nativeElement.closest('ck-field'),
          );
        }
      });
    }
  }

  private label(): HTMLLabelElement | null {
    return this.main()?.nativeElement.querySelector<HTMLLabelElement>(':scope > label') ?? null;
  }

  /** Writes ids, ARIA and the required marker onto the projected label and control. Idempotent. */
  private wire(): void {
    const control = this.control();
    if (control === null) {
      return;
    }
    const errorsVisible = this.errorsVisible();
    const required = control.required();
    const hintIds = this.hints().map((hint) => hint.id());
    const errorIds = this.errors().map((error) => error.id());
    control.setWiring({
      describedBy: [...hintIds, ...(errorsVisible ? errorIds : [])].filter((id) => id !== ''),
      libraryIds: [...hintIds, ...errorIds].filter((id) => id !== ''),
      invalid: errorsVisible,
      required,
    });

    const label = this.label();
    if (label === null) {
      return;
    }
    label.classList.add(LABEL_CLASS);
    const id = control.element.id;
    const current = label.getAttribute('for');
    if (id !== '' && (current === null || current === this.labelForSetByField)) {
      label.setAttribute('for', id);
      this.labelForSetByField = id;
    }
    syncRequiredMarker(label, required, { label: LABEL_CLASS, marker: REQUIRED_CLASS });
  }
}
