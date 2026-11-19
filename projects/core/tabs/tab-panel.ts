import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  contentChild,
  inject,
  input,
} from '@angular/core';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { createCkId } from '@ckui/core/internal';
import { CK_TABS_CONTEXT, CkTabPanelRef } from './context';
import { CkTabContent } from './tab-content';

declare const ngDevMode: unknown;

/**
 * The content of a tab. With a `value` it belongs to the tab of that value and is hidden unless
 * that tab is selected. Without one it is the shared panel: it shows the content of whichever tab
 * is selected, and every tab points at it. Put an `<ng-template ckTabContent>` inside to create
 * the content only while the panel is shown.
 */
@Component({
  selector: 'ck-tab-panel',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ck-tab-panel',
    role: 'tabpanel',
    '[attr.tabindex]': 'tabindex()',
    '[id]': 'id()',
    '[hidden]': '!shown()',
    '[attr.aria-labelledby]': 'labelledBy()',
  },
  template: `<ng-content />
    @if (lazy(); as template) {
      <ng-container [ngTemplateOutlet]="template" />
    }`,
})
export class CkTabPanel<T = unknown> implements CkTabPanelRef {
  /** The value of the tab this panel belongs to. Leave it out for one panel shared by all tabs. */
  readonly value = input<T | null | undefined>(undefined);
  /** Defaults to a generated id; the tabs' `aria-controls` follow a change. */
  readonly id = input(createCkId('ck-tab-panel'));

  /**
   * Whether the panel is a tab stop (`tabindex="0"`, the default). Turn it off when the panel's
   * content starts with a focusable element, such as a list of buttons or links: Tab then goes from
   * the selected tab straight to that element instead of stopping on the empty panel first. With
   * `false` the panel has no `tabindex` at all. A static `tabindex` other than `0` on the element
   * itself (`tabindex="-1"`) is kept as written and wins over this input.
   */
  readonly tabStop = input(true, { transform: booleanAttribute });

  /** @internal */
  readonly group = inject(CK_TABS_CONTEXT);
  private readonly content = contentChild(CkTabContent);
  // Read before the first binding. A `0` may be ours from the server render, so only other values count.
  private readonly ownTabindex = (() => {
    const value =
      inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.getAttribute('tabindex');
    return value !== null && value !== '0' ? value : null;
  })();

  protected readonly tabindex = computed(() => this.ownTabindex ?? (this.tabStop() ? '0' : null));
  protected readonly shown = computed(() => this.group.isShown(this));
  protected readonly labelledBy = computed(() => this.group.tabIdFor(this));
  protected readonly lazy = computed(() =>
    this.shown() ? (this.content()?.template ?? null) : null,
  );

  constructor() {
    if (typeof ngDevMode !== 'undefined' && ngDevMode && isPlatformBrowser(inject(PLATFORM_ID))) {
      let destroyed = false;
      inject(DestroyRef).onDestroy(() => (destroyed = true));
      afterNextRender(() => {
        const value = this.value();
        if (!destroyed && value != null && !this.group.hasTab(value)) {
          console.warn(
            '[ckui] ck-tab-panel has a value that matches no ck-tab, so it is never shown:',
            value,
          );
        }
      });
    }
  }
}
