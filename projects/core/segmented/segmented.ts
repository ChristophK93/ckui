import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  contentChildren,
  forwardRef,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CK_CONFIG, CkSize } from '@ckui/core';
import {
  CkMedia,
  CkValueControl,
  hasAccessibleName,
  provideCkValueAccessor,
} from '@ckui/core/internal';
import { CK_SEGMENTED_CONTEXT, CkSegmentRef, CkSegmentedContext } from './context';
import { CkSegment } from './segment';
import { overflows } from './segmented-fit';
import { Slide, slideIndicator } from './segmented-motion';

declare const ngDevMode: unknown;

/** -1 for the previous segment, 1 for the next one, 0 for a key that does not move. */
function stepOf(key: string, rtl: boolean): -1 | 0 | 1 {
  switch (key) {
    case 'ArrowUp':
      return -1;
    case 'ArrowDown':
      return 1;
    case 'ArrowLeft':
      return rtl ? 1 : -1;
    case 'ArrowRight':
      return rtl ? -1 : 1;
    default:
      return 0;
  }
}

/**
 * A group of mutually exclusive options that behaves as one radio group: one tab stop, the arrow
 * keys move and select. Direction comes from the `dir` attribute (`:dir(rtl)`), not from the CSS
 * `direction` property. The value is the `value` of the selected `ck-segment`, or `null`.
 *
 * Segments are as wide as an equal share or their label, whichever is larger. Only when the labels
 * cannot fit at all do they share the width equally and truncate with an ellipsis.
 */
@Component({
  selector: 'ck-segmented',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    provideCkValueAccessor(CkSegmented),
    { provide: CK_SEGMENTED_CONTEXT, useExisting: forwardRef(() => CkSegmented) },
  ],
  host: {
    class: 'ck-segmented',
    role: 'radiogroup',
    '[class]': 'modifierClasses()',
    '[class.ck-segmented--has-value]': 'checkedIndex() >= 0',
    '[class.ck-segmented--disabled]': 'isDisabled()',
    '[class.ck-segmented--full-width]': 'fullWidth()',
    '[class.ck-segmented--compact]': 'compact()',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    '[style.--_ck-segmented-column]': 'column()',
    '(keydown)': 'onKeydown($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `<span class="ck-segmented__indicator" aria-hidden="true"></span><ng-content />`,
  styleUrl: './segmented.css',
})
export class CkSegmented<T = unknown>
  extends CkValueControl<T | null>
  implements CkSegmentedContext
{
  /** `undefined` uses the size from `provideCkui`. */
  readonly size = input<CkSize | undefined>(undefined);
  /** Stretches the group to the width of its container; by default it is as wide as its segments. */
  readonly fullWidth = input(false, { transform: booleanAttribute });

  private readonly config = inject(CK_CONFIG);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly segments = contentChildren(CkSegment, { descendants: true });

  protected readonly modifierClasses = computed(
    () => `ck-segmented--${this.size() ?? this.config.size}`,
  );

  private readonly current = computed(() => this.value() ?? null);
  protected readonly checkedIndex = computed(() =>
    this.segments().findIndex((segment) => segment.checked()),
  );

  /** The grid column of the checked segment, which the indicator is placed in. */
  protected readonly column = computed(() => {
    const index = this.checkedIndex();
    return index >= 0 ? index + 1 : null;
  });

  /** Equal columns with truncated labels: the labels do not fit at their natural width. */
  protected readonly compact = signal(false);

  private readonly media = inject(CkMedia);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private destroyed = false;
  private shownSegment: HTMLElement | null = null;
  private slide: Slide | null = null;
  private observer: ResizeObserver | null = null;
  private mutations: MutationObserver | null = null;
  private fonts: FontFaceSet | null = null;

  /** @internal Used by `ck-segment`. */
  readonly groupDisabled = computed(() => this.isDisabled());

  /** @internal Used by `ck-segment`. The checked segment, else the first one that can be used. */
  readonly tabStop = computed<CkSegmentRef | null>(() => {
    if (this.isDisabled()) {
      return null;
    }
    const usable = this.segments().filter((segment) => !segment.unavailable());
    return usable.find((segment) => segment.checked()) ?? usable[0] ?? null;
  });

  constructor() {
    super();
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.slide?.animation.cancel();
      this.observer?.disconnect();
      this.observer = null;
      this.mutations?.disconnect();
      this.mutations = null;
      this.fonts?.removeEventListener('loadingdone', this.onFontsLoaded);
      this.fonts = null;
    });
    afterRenderEffect(() => this.slideTo(this.segments()[this.checkedIndex()]?.element ?? null));
    afterRenderEffect(() => {
      // The size changes the font, so it counts as content here.
      this.modifierClasses();
      this.fit(this.segments());
    });
    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
      let destroyed = false;
      inject(DestroyRef).onDestroy(() => (destroyed = true));
      afterNextRender(() => {
        if (!destroyed && !hasAccessibleName(this.element, { title: false, text: false })) {
          console.warn(
            '[ckui] ck-segmented has no accessible name. Add an aria-label or aria-labelledby.',
            this.element,
          );
        }
      });
    }
  }

  /** Slides the indicator after the layout moved it, unless it appears or motion is reduced. */
  private slideTo(selected: HTMLElement | null): void {
    if (!this.browser || this.destroyed) {
      return;
    }
    const previous = this.shownSegment;
    this.shownSegment = selected;
    const reduced = untracked(this.media.reducedMotion);
    const indicator = this.element.querySelector<HTMLElement>('.ck-segmented__indicator');
    if (indicator === null || selected === null || previous === null || previous === selected) {
      return;
    }
    if (reduced || !previous.isConnected) {
      this.slide?.animation.cancel();
      this.slide = null;
      return;
    }
    this.slide = slideIndicator(indicator, this.element, previous, selected, this.slide);
  }

  /** Watches the group, its segments and their content, and switches the compact layout. */
  private fit(segments: readonly CkSegment[]): void {
    if (!this.browser || this.destroyed) {
      return;
    }
    const Observer = this.element.ownerDocument.defaultView?.ResizeObserver;
    if (Observer !== undefined && this.observer === null) {
      this.observer = new Observer(() => this.measure());
    }
    this.observer?.disconnect();
    this.observer?.observe(this.element);
    for (const segment of segments) {
      this.observer?.observe(segment.element);
    }
    this.watchContent(segments);
    this.measure();
  }

  /**
   * A label that changes (text, language, font) moves no box once the group is compact, so the
   * resize observer is blind to it: watch the text itself and the fonts that finish loading.
   */
  private watchContent(segments: readonly CkSegment[]): void {
    const document = this.element.ownerDocument;
    const Mutation = document.defaultView?.MutationObserver;
    this.mutations?.disconnect();
    if (Mutation !== undefined) {
      this.mutations = new Mutation(() => this.measure());
      for (const segment of segments) {
        this.mutations.observe(segment.element, {
          childList: true,
          characterData: true,
          subtree: true,
        });
      }
    }
    if (this.fonts === null && document.fonts !== undefined) {
      this.fonts = document.fonts;
      this.fonts.addEventListener('loadingdone', this.onFontsLoaded);
    }
  }

  private readonly onFontsLoaded = (): void => this.measure();

  private measure(): void {
    if (this.destroyed) {
      return;
    }
    const elements = untracked(this.segments).map((segment) => segment.element);
    const overflow = overflows(this.element, elements);
    if (overflow !== null) {
      this.compact.set(overflow);
    }
  }

  /** @internal Used by `ck-segment`. */
  isChecked(value: unknown): boolean {
    const current = this.current();
    return current !== null && Object.is(current, value);
  }

  /** @internal Used by `ck-segment`. */
  select(segment: CkSegmentRef): void {
    if (!segment.unavailable()) {
      this.commit(segment.value() as T);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.isDisabled() || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const target = event.target as Node;
    const segments = this.segments();
    const focused = segments.find((segment) => segment.element.contains(target));
    if (focused === undefined) {
      return;
    }
    const usable = segments.filter((segment) => !segment.unavailable());
    if (usable.length === 0) {
      return;
    }

    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.select(focused);
      return;
    }

    const next = this.targetOf(event.key, focused, usable);
    if (next === null) {
      return;
    }
    event.preventDefault();
    this.select(next);
    next.element.focus();
  }

  /** The segment a navigation key leads to, or `null` for a key that does not navigate. */
  private targetOf(key: string, focused: CkSegment, usable: CkSegment[]): CkSegment | null {
    const last = usable.length - 1;
    if (key === 'Home') {
      return usable[0];
    }
    if (key === 'End') {
      return usable[last];
    }
    const step = stepOf(key, this.element.matches(':dir(rtl)'));
    if (step === 0) {
      return null;
    }
    const from = usable.indexOf(focused);
    if (from < 0) {
      return step > 0 ? usable[0] : usable[last];
    }
    return usable[(from + step + usable.length) % usable.length];
  }

  protected onFocusOut(event: FocusEvent): void {
    const entering = event.relatedTarget;
    if (this.isDisabled()) {
      return;
    }
    if (!(entering instanceof Node) || !this.element.contains(entering)) {
      this.markTouched();
    }
  }
}
