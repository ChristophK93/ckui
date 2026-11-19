import { DOCUMENT, NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  LOCALE_ID,
  PLATFORM_ID,
  Renderer2,
  TemplateRef,
  ViewEncapsulation,
  afterEveryRender,
  afterNextRender,
  booleanAttribute,
  computed,
  contentChild,
  contentChildren,
  effect,
  forwardRef,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ControlContainer } from '@angular/forms';
import { CK_CONFIG, CK_LABELS, CkSize } from '@ckui/core';
import {
  CK_CONTROL_STATE,
  CK_FIELD_CONTEXT,
  CkAnnouncer,
  CkAriaWiring,
  CkControlState,
  CkFormState,
  CkIcon,
  CkMedia,
  CkValueControl,
  RequiredProbe,
  Typeahead,
  collapseText,
  createCkId,
  hasAccessibleName,
  hasCommandKey,
  isPrintableKey,
  lazyNgControl,
  normalizeText,
  provideCkValueAccessor,
} from '@ckui/core/internal';
import { CkOverlayHandle, CkOverlayHost } from '@ckui/core/internal/overlay';
import { CkOption } from './option';
import { CK_SELECT, CkSelectContext } from './select-context';
import { CkSelectValue, CkSelectedOption } from './select-value';

declare const ngDevMode: unknown;

/** Page Up and Page Down move this many options. */
const PAGE_SIZE = 10;
/** The result count is announced this long after the last keystroke. */
const ANNOUNCE_DELAY = 500;

type StartAt = 'selected-first' | 'selected-last' | 'first' | 'last';
type KeySource = 'trigger' | 'search' | 'listbox';

function sameWiring(previous: CkAriaWiring | null, next: CkAriaWiring | null): boolean {
  return (
    previous === next ||
    (previous !== null &&
      next !== null &&
      previous.invalid === next.invalid &&
      previous.required === next.required &&
      previous.describedBy.join(' ') === next.describedBy.join(' '))
  );
}

/** The plural category of the count in the locale; English rules when the browser rejects the locale. */
function pluralCategory(count: number, locale: string): Intl.LDMLPluralRule {
  try {
    return new Intl.PluralRules(locale).select(count);
  } catch {
    return new Intl.PluralRules('en').select(count);
  }
}

function tokens(value: string | null): string[] {
  return (value ?? '').split(/\s+/).filter((token) => token !== '');
}

/** The text of a label without its `aria-hidden` parts (the required marker). */
function labelText(label: Element): string {
  const clone = label.cloneNode(true) as Element;
  clone.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => hidden.remove());
  return collapseText(clone.textContent);
}

/**
 * A single-choice dropdown: a button that shows the selected option and opens a list under it,
 * the WAI-ARIA "select-only combobox". Fill it with `ck-option` (and `ck-optgroup`) children.
 * Focus stays on the button while the list is open, and the arrow keys move a highlight through
 * it; typing a few letters jumps to the option that starts with them.
 *
 * On a phone (a narrow viewport with a coarse pointer, when it opens) the list is a bottom sheet
 * titled with the select's name, its options are full-width rows, and the keyboard keys work on the
 * focused list. With `filter` a search field sits above the list.
 *
 * Name it with `aria-label` or `aria-labelledby` on `ck-select`, or wrap it in a `<label>`. The
 * attributes are inputs here and move to the button. Inside a `ck-field` it is the field's
 * control: the field draws the box and the label, and adds its hint and error to the button's
 * description. The field's size applies unless `size` is set.
 *
 * The options are the content of `ck-select` but are drawn in the open list, so a select whose
 * options are not rendered yet shows the text of the selected one from the option itself.
 */
@Component({
  selector: 'ck-select',
  imports: [CkIcon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    provideCkValueAccessor(CkSelect),
    { provide: CK_SELECT, useExisting: forwardRef(() => CkSelect) },
    { provide: CK_CONTROL_STATE, useFactory: () => inject(CkSelect).fieldControl },
  ],
  host: {
    class: 'ck-select',
    '[class]': 'modifierClasses()',
    '[class.ck-select--open]': 'open()',
    '[class.ck-select--disabled]': 'isDisabled()',
  },
  template: `
    <button
      #trigger
      type="button"
      role="combobox"
      class="ck-select__trigger"
      aria-haspopup="listbox"
      [attr.id]="triggerId"
      [disabled]="isDisabled()"
      [attr.aria-expanded]="open() ? 'true' : 'false'"
      [attr.aria-controls]="open() ? listboxId : null"
      [attr.aria-activedescendant]="triggerActiveId()"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-labelledby]="ariaLabelledby()"
      [attr.aria-describedby]="describedby()"
      [attr.aria-invalid]="wiring()?.invalid ? 'true' : null"
      [attr.aria-required]="wiring()?.required ? 'true' : null"
      (click)="onTriggerClick()"
      (keydown)="onTriggerKeydown($event)"
      (keyup)="onTriggerKeyup($event)"
      (focus)="refresh()"
      (blur)="onTriggerBlur($event)"
    >
      <span class="ck-select__value">
        @if (selectedOption() !== null) {
          @if (valueTemplate(); as custom) {
            <ng-container
              *ngTemplateOutlet="custom.template; context: { $implicit: selectedSnapshot() }"
            />
          } @else {
            <span class="ck-select__text">{{ selectedText() }}</span>
          }
        } @else if (placeholder() !== '') {
          <span class="ck-select__placeholder">{{ placeholder() }}</span>
        }
      </span>
      <ck-icon class="ck-select__chevron" name="chevron-down" />
    </button>
    <ng-template #panel>
      <div
        [class]="popupClasses()"
        (mousedown)="onPopupMousedown($event)"
        (focusout)="onPopupFocusOut($event)"
        (focusin)="refresh()"
      >
        @if (sheetOpen() && nameText() !== '') {
          <div class="ck-select-popup__title">{{ nameText() }}</div>
        }
        @if (filter()) {
          <div class="ck-select-popup__search">
            <input
              type="search"
              role="combobox"
              class="ck-select-popup__input"
              aria-autocomplete="list"
              aria-expanded="true"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              enterkeyhint="search"
              [attr.aria-controls]="listboxId"
              [attr.aria-activedescendant]="activeId()"
              [attr.aria-label]="searchLabel()"
              [value]="query()"
              (input)="onSearchInput($event)"
              (keydown)="onListKeydown($event, 'search')"
            />
          </div>
        }
        <div
          class="ck-select-listbox"
          role="listbox"
          [attr.id]="listboxId"
          [attr.aria-label]="nameText() || null"
          [attr.tabindex]="sheetOpen() && !filter() ? 0 : null"
          [attr.aria-activedescendant]="sheetOpen() && !filter() ? activeId() : null"
          (keydown)="onListKeydown($event, 'listbox')"
        >
          <ng-content />
          @if (filter() && visibleOptions().length === 0) {
            <div
              class="ck-select-listbox__empty"
              role="option"
              aria-disabled="true"
              aria-selected="false"
            >
              {{ labels().noResults }}
            </div>
          }
        </div>
      </div>
    </ng-template>
  `,
  styleUrls: ['./select.css', './listbox.css'],
})
export class CkSelect<T = unknown> extends CkValueControl<T | null> implements CkSelectContext {
  /** Shown, muted, while no option is selected. */
  readonly placeholder = input('', {
    transform: (value: string | null | undefined) => value ?? '',
  });
  /** `undefined` uses the size from `provideCkui`, or the field's. */
  readonly size = input<CkSize | undefined>(undefined);
  /** Tells whether an option's value is the select's value. Default `Object.is`. Never gets `null`. */
  readonly compareWith = input<(optionValue: T, value: T) => boolean>(Object.is);
  /** A search field above the list that hides the options that do not match. */
  readonly filter = input(false, { transform: booleanAttribute });
  /**
   * Replaces the match of the filter: gets each option and the text typed, returns whether it
   * stays. The default is "contains", ignoring case and accents, on the option's text.
   */
  readonly filterWith = input<((option: CkOption<T>, query: string) => boolean) | undefined>(
    undefined,
  );
  /** The accessible name of the button. Moves from the host to the button. */
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  /** The ids of the elements that name the button. Moves from the host to the button. */
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });
  /** The ids of a hint or error for the button. Moves from the host to the button. */
  readonly ariaDescribedby = input<string | null>(null, { alias: 'aria-describedby' });

  private readonly config = inject(CK_CONFIG);
  protected readonly labels = inject(CK_LABELS);
  private readonly locale = inject(LOCALE_ID);
  private readonly media = inject(CkMedia);
  private readonly overlay = inject(CkOverlayHost);
  private readonly announcer = inject(CkAnnouncer);
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly field = inject(CK_FIELD_CONTEXT, { optional: true });
  private readonly container = inject(ControlContainer, { optional: true });
  private readonly injector = inject(Injector);
  private readonly lookup = lazyNgControl(this.injector);
  private readonly formState = new CkFormState(
    { control: this.lookup, container: () => this.container },
    () => this.refresh(),
  );
  private readonly requiredProbe = new RequiredProbe();
  private readonly triggerRef = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panelRef = viewChild.required<TemplateRef<unknown>>('panel');
  private readonly options = contentChildren(CkOption, { descendants: true });
  protected readonly valueTemplate = contentChild(CkSelectValue);

  /** Set by the surrounding `ck-field`, if any. */
  protected readonly wiring = signal<CkAriaWiring | null>(null, { equal: sameWiring });
  protected readonly triggerId = createCkId('ck-select');
  protected readonly listboxId = createCkId('ck-select-listbox');
  protected readonly open = signal(false);
  /** Whether the open list is a bottom sheet; decided when it opened. */
  protected readonly sheetOpen = signal(false);
  protected readonly query = signal('');
  /** The select's accessible name as plain text, read when the list opens. */
  protected readonly nameText = signal('');
  private readonly activeOption = signal<CkOption | null>(null);
  private readonly focusedState = signal(false);
  private readonly domDisabled = signal(false);
  private readonly requiredState = signal(false);
  /** The text of the selected option, kept as a snapshot so the closed trigger can show it. */
  protected readonly selectedText = signal('');

  private handle: CkOverlayHandle | null = null;
  private readonly typeahead = new Typeahead();
  private announceTimer: ReturnType<typeof setTimeout> | null = null;
  private warnedValue: unknown = Symbol('none');
  /** Space presses the trigger on keyup; a keydown that was handled must not also click. */
  private spaceHandled = false;

  private readonly resolvedSize = computed(
    () => this.size() ?? this.field?.resolvedSize() ?? this.config.size,
  );

  protected readonly modifierClasses = computed(
    () => `ck-select ck-select--${this.resolvedSize()}`,
  );

  protected readonly popupClasses = computed(
    () =>
      `ck-select-popup ck-select-popup--${this.sheetOpen() ? 'sheet' : 'popover'} ck-select-popup--${this.resolvedSize()}`,
  );

  /** The consumer's ids, then the field's hint and error ids while a field wraps this control. */
  protected readonly describedby = computed(() => {
    const own = this.ariaDescribedby();
    const wiring = this.wiring();
    if (wiring === null) {
      return own;
    }
    const ids = new Set([...tokens(own), ...wiring.describedBy]);
    return ids.size > 0 ? [...ids].join(' ') : null;
  });

  /** The option whose value is the select's value. `null` for none, also for an unknown value. */
  protected readonly selectedOption = computed<CkOption | null>(() => {
    const value = this.value() ?? null;
    const compare = this.compareWith();
    for (const option of this.options()) {
      const current = option.current;
      if (current === null) {
        continue;
      }
      const optionValue = current.value;
      // A custom comparison never has to cope with `null`.
      const same =
        value === null || optionValue === null
          ? Object.is(optionValue, value)
          : compare(optionValue as T, value);
      if (same) {
        return option;
      }
    }
    return null;
  });

  /** What a custom value template gets. */
  protected readonly selectedSnapshot = computed<CkSelectedOption | null>(() => {
    const selected = this.selectedOption();
    const current = selected?.current;
    return current ? { value: current.value, text: this.selectedText() } : null;
  });

  private readonly visibleSet = computed<ReadonlySet<CkOption> | null>(() => {
    const query = this.query();
    if (!this.filter() || query.trim() === '') {
      return null;
    }
    const custom = this.filterWith();
    const needle = normalizeText(query, this.locale);
    return new Set(
      this.options().filter((option) =>
        custom
          ? custom(option as CkOption<T>, query)
          : normalizeText(option.text, this.locale).includes(needle),
      ),
    );
  });

  protected readonly visibleOptions = computed(() => {
    const set = this.visibleSet();
    return set === null ? this.options() : this.options().filter((option) => set.has(option));
  });

  private readonly enabledVisible = computed(() =>
    this.visibleOptions().filter((option) => !option.unavailable()),
  );

  /** The option the keyboard highlight is on, while the list is open. */
  protected readonly active = computed(() => {
    const option = this.activeOption();
    return option !== null && this.enabledVisible().includes(option) ? option : null;
  });
  protected readonly activeId = computed(() => this.active()?.id() ?? null);

  /** The trigger points at the highlight only while it holds the focus itself. */
  protected readonly triggerActiveId = computed(() =>
    this.open() && !this.sheetOpen() && !this.filter() ? this.activeId() : null,
  );

  protected readonly searchLabel = computed(() =>
    [this.nameText(), this.labels().search].filter((part) => part !== '').join(' '),
  );

  private readonly version = linkedSignal<T | null | undefined, number>({
    source: this.value,
    computation: (_, previous) => (previous?.value ?? -1) + 1,
  });

  /** @internal What `ck-field` reads when this select is its control. */
  readonly fieldControl: CkControlState = this.createFieldControl();

  constructor() {
    super();
    // The names are inputs here, so the host must not also keep them as a (role-less) attribute.
    const renderer = inject(Renderer2);
    renderer.removeAttribute(this.element, 'aria-label');
    renderer.removeAttribute(this.element, 'aria-labelledby');
    renderer.removeAttribute(this.element, 'aria-describedby');

    // Component effects run after the content's bindings, so the text is current on the server too.
    effect(() => {
      const selected = this.selectedOption();
      this.options();
      untracked(() => this.selectedText.set(selected?.text ?? ''));
    });

    if (this.browser) {
      effect(() => this.refresh());
      afterEveryRender(() => {
        this.refresh();
        this.selectedText.set(this.selectedOption()?.text ?? '');
      });
    }

    effect(() => {
      if (this.open() && (this.isDisabled() || this.fieldControl.disabled())) {
        untracked(() => this.close());
      }
    });

    // The highlighted option left (removed, hidden, disabled): highlight where the list starts.
    effect(() => {
      if (this.open() && this.active() === null) {
        const start = this.startOption('selected-first');
        untracked(() => this.activeOption.set(start));
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.formState.release();
      this.clearAnnounceTimer();
      const handle = this.handle;
      this.handle = null;
      void handle?.close();
    });

    if (typeof ngDevMode !== 'undefined' && ngDevMode && this.browser) {
      this.watchConfiguration();
    }
  }

  private createFieldControl(): CkControlState {
    const triggerRef = this.triggerRef;
    return {
      get element(): HTMLElement {
        return triggerRef().nativeElement;
      },
      id: computed(() => this.triggerId),
      focused: this.focusedState.asReadonly(),
      hasValue: computed(() => this.selectedOption() !== null),
      hasPlaceholder: computed(() => this.placeholder().trim() !== ''),
      builtInUi: computed(() => false),
      disabled: computed(
        () => this.isDisabled() || this.formState.disabled() || this.domDisabled(),
      ),
      readonly: computed(() => false),
      required: this.requiredState.asReadonly(),
      invalid: this.formState.invalid,
      touched: this.formState.touched,
      submitted: this.formState.submitted,
      version: this.version,
      setWiring: (wiring) => this.wiring.set(wiring),
    };
  }

  private get trigger(): HTMLButtonElement {
    return this.triggerRef().nativeElement;
  }

  private get panelElement(): HTMLElement | null {
    return this.handle?.panel ?? null;
  }

  private find<E extends HTMLElement>(selector: string): E | null {
    return this.panelElement?.querySelector<E>(selector) ?? null;
  }

  /** Copies the DOM and forms state the field needs into signals. Cheap when nothing changed. */
  protected refresh(): void {
    if (!this.browser) {
      return;
    }
    const trigger = this.trigger;
    this.formState.refresh();
    const active = this.document.activeElement;
    this.focusedState.set(
      active === trigger || (active !== null && (this.panelElement?.contains(active) ?? false)),
    );
    this.domDisabled.set(trigger.matches(':disabled'));
    this.requiredState.set(this.requiredProbe.isRequired(this.lookup()?.control));
  }

  private watchConfiguration(): void {
    let destroyed = false;
    inject(DestroyRef).onDestroy(() => (destroyed = true));
    afterNextRender(() => {
      if (
        !destroyed &&
        !hasAccessibleName(this.trigger, { title: false, text: false, labels: true })
      ) {
        console.warn(
          '[ckui] ck-select has no accessible name. Add an aria-label or aria-labelledby, or wrap it in a <label> or a ck-field.',
          this.element,
        );
      }
    });
    effect(() => {
      const value = this.value() ?? null;
      const options = this.options();
      const selected = this.selectedOption();
      // An option whose value is not bound yet may still turn out to be the selected one.
      const ready = options.length > 0 && options.every((option) => option.current !== null);
      untracked(() => {
        if (value === null || !ready || selected !== null || Object.is(value, this.warnedValue)) {
          return;
        }
        this.warnedValue = value;
        console.warn(
          '[ckui] ck-select value matches no ck-option, so the placeholder is shown. Check the option values or add compareWith.',
          value,
          this.element,
        );
      });
    });
  }

  // CkSelectContext, for the options.

  isSelected(option: object): boolean {
    return this.selectedOption() === option;
  }

  isActive(option: object): boolean {
    return this.open() && this.active() === option;
  }

  isVisible(option: object): boolean {
    const set = this.visibleSet();
    return set === null || set.has(option as CkOption);
  }

  choose(option: object): void {
    this.selectOption(option as CkOption);
    this.close();
  }

  // Opening and closing.

  /** The option the list starts on, `null` when none can be picked. */
  private startOption(start: StartAt): CkOption | null {
    const list = this.enabledVisible();
    const selected = this.selectedOption();
    const keep = selected !== null && list.includes(selected) ? selected : null;
    switch (start) {
      case 'first':
        return list[0] ?? null;
      case 'last':
        return list.at(-1) ?? null;
      case 'selected-last':
        return keep ?? list.at(-1) ?? null;
      default:
        return keep ?? list[0] ?? null;
    }
  }

  private openList(start: StartAt): void {
    if (!this.browser || this.open() || this.isDisabled() || this.trigger.matches(':disabled')) {
      return;
    }
    const sheet = this.media.sheet();
    const name = this.readName();
    this.nameText.set(name);
    this.sheetOpen.set(sheet);
    this.query.set('');
    this.typeahead.reset();
    this.activeOption.set(this.startOption(start));
    this.open.set(true);
    const filter = this.filter();
    const handle = this.overlay.open(this.panelRef(), {
      mode: 'auto',
      desktop: 'popover',
      anchor: this.trigger,
      matchAnchorWidth: true,
      // Without a search field a popover leaves the focus on the trigger.
      autoFocus: sheet || filter,
      role: sheet ? 'dialog' : 'none',
      ariaLabel: sheet && name !== '' ? name : undefined,
      dismissible: true,
      // A sheet with a search field keeps its height while the list shrinks, so the field stays put.
      fullHeight: sheet && filter,
      panelClass: ['ck-select-panel', `ck-select-panel--${this.resolvedSize()}`],
      initialFocus: () =>
        filter ? this.find('.ck-select-popup__input') : this.find('.ck-select-listbox'),
      onDismissRequest: () => this.close(),
    });
    this.handle = handle;
    void handle.closed.then(() => {
      if (this.handle === handle) {
        this.handle = null;
        this.reset();
      }
    });
    this.reveal(this.activeOption());
    afterNextRender(
      () => {
        if (this.handle === handle) {
          this.reveal(this.active());
        }
      },
      { injector: this.injector },
    );
  }

  /** Closes the list. Focus goes back to the trigger when it was inside the list. */
  protected close(): void {
    const handle = this.handle;
    if (handle === null) {
      return;
    }
    this.handle = null;
    this.reset();
    void handle.close();
  }

  private reset(): void {
    this.open.set(false);
    this.query.set('');
    this.typeahead.reset();
    this.clearAnnounceTimer();
  }

  private readName(): string {
    const label = (this.ariaLabel() ?? '').trim();
    if (label !== '') {
      return label;
    }
    const named = tokens(this.ariaLabelledby())
      .map((id) => collapseText(this.document.getElementById(id)?.textContent ?? null))
      .filter((text) => text !== '')
      .join(' ');
    if (named !== '') {
      return named;
    }
    return Array.from(this.trigger.labels ?? [], labelText)
      .filter((text) => text !== '')
      .join(' ');
  }

  // Choosing.

  private selectOption(option: CkOption): void {
    if (!option.unavailable() && this.selectedOption() !== option) {
      this.commit(option.current!.value as T);
    }
  }

  private chooseActive(): void {
    const active = this.active();
    if (active !== null) {
      this.selectOption(active);
    }
  }

  /** Picks the highlighted option and closes. With none highlighted (no match) the list stays. */
  private chooseAndClose(): void {
    if (this.active() !== null) {
      this.chooseActive();
      this.close();
    }
  }

  // The trigger.

  protected onTriggerClick(): void {
    if (this.isDisabled()) {
      return;
    }
    if (this.open()) {
      this.close();
      return;
    }
    // Some browsers do not focus a button that was clicked; the keys need it.
    if (this.document.activeElement !== this.trigger) {
      this.trigger.focus({ preventScroll: true });
    }
    this.openList('selected-first');
  }

  protected onTriggerKeyup(event: KeyboardEvent): void {
    if (event.key === ' ' && this.spaceHandled) {
      this.spaceHandled = false;
      // Space clicks a button on keyup; the keydown already did its work.
      event.preventDefault();
    }
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (this.isDisabled() || event.isComposing || hasCommandKey(event)) {
      return;
    }
    if (this.open()) {
      this.onOpenKeydown(event, 'trigger');
      return;
    }
    const type = isPrintableKey(event) && (event.key !== ' ' || this.typeahead.active());
    if (type) {
      event.preventDefault();
      this.spaceHandled = event.key === ' ';
      const list = this.enabledVisible();
      const selected = this.selectedOption();
      const index = this.typeahead.match(
        normalizeText(event.key, this.locale),
        list.map((option) => normalizeText(option.text, this.locale)),
        selected === null ? -1 : list.indexOf(selected),
      );
      if (index >= 0) {
        this.selectOption(list[index]);
      }
      return;
    }
    let start: StartAt;
    switch (event.key) {
      case 'ArrowDown':
      case 'Enter':
      case ' ':
        start = 'selected-first';
        break;
      case 'ArrowUp':
        if (event.altKey) {
          return;
        }
        start = 'selected-last';
        break;
      case 'Home':
        start = 'first';
        break;
      case 'End':
        start = 'last';
        break;
      default:
        return;
    }
    if (event.altKey && event.key !== 'ArrowDown') {
      return;
    }
    event.preventDefault();
    this.spaceHandled = event.key === ' ';
    this.openList(start);
  }

  protected onTriggerBlur(event: FocusEvent): void {
    this.refresh();
    // Focus moves into the sheet when it opens; it comes back when it closes.
    if (this.open() && this.sheetOpen()) {
      return;
    }
    const entering = event.relatedTarget;
    if (entering instanceof Node && this.panelElement?.contains(entering)) {
      return;
    }
    this.touch();
  }

  /** Touched means focus has left the trigger and the list together. */
  private touch(): void {
    if (!this.isDisabled()) {
      this.markTouched();
    }
  }

  // The open list.

  protected onPopupMousedown(event: MouseEvent): void {
    // A press on padding or an option must not take focus away from the trigger; the search field
    // is the one thing in the list that wants it.
    if (!(event.target instanceof Element && event.target.closest('.ck-select-popup__input'))) {
      event.preventDefault();
    }
  }

  protected onPopupFocusOut(event: FocusEvent): void {
    this.refresh();
    const entering = event.relatedTarget;
    if (
      entering instanceof Node &&
      (this.trigger.contains(entering) || (this.panelElement?.contains(entering) ?? false))
    ) {
      return;
    }
    this.touch();
  }

  protected onListKeydown(event: KeyboardEvent, source: KeySource): void {
    if (!this.isDisabled() && !event.isComposing && !hasCommandKey(event)) {
      this.onOpenKeydown(event, source);
    }
  }

  /** The keys of the open list, from the trigger, the search field or the focused list. */
  private onOpenKeydown(event: KeyboardEvent, source: KeySource): void {
    const searching = source === 'search';
    switch (event.key) {
      case 'ArrowDown':
        if (event.altKey) {
          return;
        }
        this.move(1);
        break;
      case 'ArrowUp':
        if (event.altKey) {
          this.chooseAndClose();
        } else {
          this.move(-1);
        }
        break;
      case 'Home':
      case 'End':
        // In the search field the caret keys belong to the text.
        if (searching) {
          return;
        }
        this.move(event.key === 'Home' ? 'first' : 'last');
        break;
      case 'PageDown':
        this.move(PAGE_SIZE);
        break;
      case 'PageUp':
        this.move(-PAGE_SIZE);
        break;
      case 'Enter':
        this.chooseAndClose();
        break;
      case ' ':
        if (searching) {
          return;
        }
        if (this.typeahead.active()) {
          this.typeaheadMove(event.key);
        } else {
          this.chooseAndClose();
        }
        this.spaceHandled = source === 'trigger';
        break;
      case 'Escape':
        this.close();
        break;
      case 'Tab':
        // The default action then moves focus on from wherever it lands.
        this.chooseActive();
        this.close();
        return;
      default:
        if (searching || !isPrintableKey(event)) {
          return;
        }
        this.typeaheadMove(event.key);
    }
    event.preventDefault();
  }

  private move(target: number | 'first' | 'last'): void {
    const list = this.enabledVisible();
    if (list.length === 0) {
      return;
    }
    const current = list.indexOf(this.active() as CkOption);
    let next: number;
    if (target === 'first') {
      next = 0;
    } else if (target === 'last') {
      next = list.length - 1;
    } else {
      // From nowhere a step down lands on the first option and a step up on the last.
      const base = current >= 0 ? current : target > 0 ? -1 : list.length;
      next = Math.min(list.length - 1, Math.max(0, base + target));
    }
    this.highlight(list[next]);
  }

  private typeaheadMove(character: string): void {
    const list = this.enabledVisible();
    const active = this.active();
    const index = this.typeahead.match(
      normalizeText(character, this.locale),
      list.map((option) => normalizeText(option.text, this.locale)),
      active === null ? -1 : list.indexOf(active),
    );
    if (index >= 0) {
      this.highlight(list[index]);
    }
  }

  private highlight(option: CkOption): void {
    this.activeOption.set(option);
    this.reveal(option);
  }

  /** Scrolls the list, and only the list, so that the option is in view. */
  private reveal(option: CkOption | null): void {
    const list = this.find('.ck-select-listbox');
    if (option === null || list === null) {
      return;
    }
    const top = option.element.offsetTop;
    const bottom = top + option.element.offsetHeight;
    if (top < list.scrollTop) {
      list.scrollTop = top;
    } else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }

  // The filter.

  protected onSearchInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.activeOption.set(this.enabledVisible()[0] ?? null);
    this.scheduleAnnouncement();
    const handle = this.handle;
    // The list changed height: place the popover again once it has rendered.
    afterNextRender(
      () => {
        if (this.handle === handle) {
          handle?.reposition();
          this.reveal(this.active());
        }
      },
      { injector: this.injector },
    );
  }

  private scheduleAnnouncement(): void {
    this.clearAnnounceTimer();
    this.announceTimer = setTimeout(() => {
      this.announceTimer = null;
      if (!this.open()) {
        return;
      }
      const count = this.visibleOptions().length;
      const labels = this.labels();
      const template =
        pluralCategory(count, this.locale) === 'one' ? labels.resultCountOne : labels.resultCount;
      const message =
        count === 0
          ? labels.noResults
          : template.replaceAll('{count}', new Intl.NumberFormat(this.locale).format(count));
      void this.announcer.announce(message);
    }, ANNOUNCE_DELAY);
  }

  private clearAnnounceTimer(): void {
    if (this.announceTimer !== null) {
      clearTimeout(this.announceTimer);
      this.announceTimer = null;
    }
  }
}
