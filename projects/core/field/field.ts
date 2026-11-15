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
import { CK_CONTROL_STATE, CK_FIELD_CONTEXT, CkFieldContext } from './control-state';
import { CkPrefix } from './affix';
import { loadFieldStyles } from './styles';
import { CkError } from './error';
import { CkHint } from './hint';

declare const ngDevMode: unknown;

const LABEL_CLASS = 'ck-field__label';
const REQUIRED_CLASS = 'ck-field__required';

/**
 * Wraps one native `ckInput` with a floating `<label>`, `ck-hint`, `ck-error`, and `[ckPrefix]` /
 * `[ckSuffix]` content, and wires ids and ARIA between them.
 */
@Component({
  selector: 'ck-field',
  templateUrl: './field.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [{ provide: CK_FIELD_CONTEXT, useExisting: CkField }],
  host: {
    class: 'ck-field',
    '[class]': 'modifierClasses()',
  },
})
export class CkField implements CkFieldContext {
  /** `undefined` uses the size from `provideCkui`. */
  readonly size = input<CkSize | undefined>(undefined);
  /** `always` keeps the label on the border even when the control is empty and unfocused. */
  readonly labelFloat = input<'auto' | 'always'>('auto');
  /** `undefined` follows the control; `true` or `false` forces the invalid look and the errors. */
  readonly invalid = input<boolean | undefined>(undefined);

  private readonly config = inject(CK_CONFIG);
  private readonly controls = contentChildren(CK_CONTROL_STATE, { descendants: true });
  private readonly hints = contentChildren(CkHint, { descendants: true, read: ElementRef });
  private readonly errors = contentChildren(CkError, { descendants: true, read: ElementRef });
  private readonly prefix = contentChild(CkPrefix, { descendants: true });
  private readonly main = viewChild<ElementRef<HTMLElement>>('main');
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private labelForSetByField = '';

  /** @internal Used by `ckInput` and `ck-error`. */
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
        control.nativeUi() ||
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
            `[ckui] ck-field needs exactly one ckInput, found ${count}.`,
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
    const idOf = (ref: ElementRef): string => (ref.nativeElement as HTMLElement).id;
    const hintIds = this.hints().map(idOf);
    const errorIds = this.errors().map(idOf);
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
    this.syncRequiredMarker(label, required);
  }

  /** Reuses a marker that is already in the label (server render) instead of adding a second. */
  private syncRequiredMarker(label: HTMLElement, required: boolean): void {
    const markers = Array.from(label.children).filter((child) =>
      child.classList.contains(REQUIRED_CLASS),
    );
    label.classList.toggle(`${LABEL_CLASS}--required`, required);
    if (!required) {
      markers.forEach((marker) => marker.remove());
      return;
    }
    markers.slice(1).forEach((marker) => marker.remove());
    if (markers.length === 0) {
      const marker = label.ownerDocument.createElement('span');
      marker.setAttribute('aria-hidden', 'true');
      marker.className = REQUIRED_CLASS;
      marker.textContent = ' *';
      label.append(marker);
    }
  }
}
