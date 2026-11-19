import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
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
    tabindex: '0',
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

  /** @internal */
  readonly group = inject(CK_TABS_CONTEXT);
  private readonly content = contentChild(CkTabContent);

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
