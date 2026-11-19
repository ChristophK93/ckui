import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  Renderer2,
  RendererStyleFlags2,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  PLATFORM_ID,
  signal,
  untracked,
} from '@angular/core';
import { CK_CONFIG, CkSize } from '@ckui/core';
import { CK_CONTROL_STATE, CK_FIELD_CONTEXT, hasAccessibleName } from '@ckui/core/internal';
import { loadFieldStyles } from './styles';
import { CkInputControl } from './control-state';

declare const ngDevMode: unknown;

const DEFAULT_ROWS = 2;

function toRows(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const rows = Math.floor(Number(value));
  return Number.isFinite(rows) && rows >= 1 ? rows : undefined;
}

/**
 * A native `<input>` or `<textarea>` for `ck-field`, or on its own with a box of its own.
 * Every native attribute stays on the element.
 */
@Directive({
  selector: 'input[ckInput], textarea[ckInput]',
  providers: [{ provide: CK_CONTROL_STATE, useClass: CkInputControl }],
  host: {
    class: 'ck-input',
    '[class]': 'modifierClasses()',
    '[class.ck-input--textarea]': 'isTextarea',
    '[class.ck-input--autosize]': 'autosizeActive()',
    '[class.ck-input--autosize-js]': 'autosizeActive() && scriptSizing()',
    '[class.ck-input--max-rows]': 'autosizeActive() && maxRowCount() !== undefined',
  },
})
export class CkInput {
  /** Only used without a surrounding `ck-field`; inside one the field's size applies. */
  readonly size = input<CkSize | undefined>(undefined);
  /** A textarea grows with its content between `minRows` and `maxRows`. */
  readonly autosize = input(false, { transform: booleanAttribute });
  readonly minRows = input<number | undefined, number | string | null | undefined>(undefined, {
    transform: toRows,
  });
  readonly maxRows = input<number | undefined, number | string | null | undefined>(undefined, {
    transform: toRows,
  });

  private readonly control = inject(CK_CONTROL_STATE) as CkInputControl;
  private readonly field = inject(CK_FIELD_CONTEXT, { optional: true });
  private readonly config = inject(CK_CONFIG);
  private readonly renderer = inject(Renderer2);
  private readonly element = this.control.element;
  protected readonly isTextarea = this.element.tagName === 'TEXTAREA';

  protected readonly modifierClasses = computed(() =>
    this.field ? '' : `ck-input--standalone ck-input--${this.size() ?? this.config.size}`,
  );
  protected readonly autosizeActive = computed(() => this.isTextarea && this.autosize());
  protected readonly maxRowCount = computed(() => {
    const max = this.maxRows();
    return max === undefined ? undefined : Math.max(max, this.minRowCount());
  });
  protected readonly scriptSizing = signal(false);
  private measured = false;
  private readonly minRowCount = computed(
    () => this.minRows() ?? toRows(this.element.getAttribute('rows')) ?? DEFAULT_ROWS,
  );

  constructor() {
    const destroyRef = inject(DestroyRef);
    if (this.field === null) {
      loadFieldStyles();
    }
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    let destroyed = false;
    destroyRef.onDestroy(() => (destroyed = true));

    effect(() => {
      if (this.autosizeActive()) {
        this.setRowProperty('--_ck-rows-min', this.minRowCount());
        this.setRowProperty('--_ck-rows-max', this.maxRowCount());
      } else {
        this.setRowProperty('--_ck-rows-min', undefined);
        this.setRowProperty('--_ck-rows-max', undefined);
      }
    });

    // Without `field-sizing: content` the height is measured after every value change.
    effect(() => {
      if (this.autosizeActive() && this.scriptSizing()) {
        this.minRowCount();
        this.maxRowCount();
        this.control.version();
        untracked(() => this.measure());
      } else if (this.measured) {
        this.measured = false;
        this.element.style.removeProperty('block-size');
      }
    });

    if (isBrowser) {
      afterNextRender(() => {
        if (destroyed) {
          return;
        }
        this.scriptSizing.set(!supportsFieldSizing());
        this.observeWidth(destroyRef, () => destroyed);
        if (typeof ngDevMode !== 'undefined' && ngDevMode && this.field === null) {
          this.control.refresh();
          if (!hasAccessibleName(this.element, { title: true, text: false, labels: true })) {
            console.warn(
              '[ckui] ckInput outside a ck-field has no accessible name. Add a <label for>, aria-label or aria-labelledby.',
              this.element,
            );
          }
        }
      });
    }
  }

  private setRowProperty(name: string, rows: number | undefined): void {
    if (rows === undefined) {
      this.renderer.removeStyle(this.element, name, RendererStyleFlags2.DashCase);
    } else {
      this.renderer.setStyle(this.element, name, String(rows), RendererStyleFlags2.DashCase);
    }
  }

  /** Re-measures when the width changes, since that rewraps the text. Script sizing only. */
  private observeWidth(destroyRef: DestroyRef, isDestroyed: () => boolean): void {
    if (!this.isTextarea || typeof ResizeObserver === 'undefined') {
      return;
    }
    let lastWidth = -1;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width !== lastWidth) {
        lastWidth = width;
        // Measuring changes the observed element's size; do it outside the observer callback.
        requestAnimationFrame(() => {
          if (!isDestroyed() && this.autosizeActive() && this.scriptSizing()) {
            this.measure();
          }
        });
      }
    });
    observer.observe(this.element);
    destroyRef.onDestroy(() => observer.disconnect());
  }

  /** Sets the height to the content; the CSS min and max rows clamp it. */
  private measure(): void {
    const element = this.element as HTMLTextAreaElement;
    if (!element.isConnected) {
      return;
    }
    const style = getComputedStyle(element);
    const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const previousOverflow = element.style.overflowY;
    element.style.overflowY = 'hidden';
    element.style.blockSize = '0px';
    const needed = element.scrollHeight + (Number.isFinite(border) ? border : 0);
    element.style.blockSize = `${needed}px`;
    this.measured = true;
    element.style.overflowY = previousOverflow;
  }
}

function supportsFieldSizing(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('field-sizing', 'content')
  );
}
