import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  DestroyRef,
  EnvironmentInjector,
  Injectable,
  PLATFORM_ID,
  ViewEncapsulation,
  createComponent,
  inject,
} from '@angular/core';

/** A tooltip the layer can hide when another one takes over, or on Escape. */
export interface CkTooltipClient {
  hide(): void;
  /** True while the tooltip was shown by keyboard focus: it comes back when the tooltip that took over hides. */
  isRestorable(): boolean;
  restore(): void;
}

/** Moving to another tooltip host within this many milliseconds of a tooltip hiding skips the show delay. */
const WARM_WINDOW = 300;

/**
 * Only here to bring the tooltip's stylesheet into the page when the layer is created: a directive
 * has no styles of its own. The element it renders into holds every tooltip bubble.
 */
@Component({
  selector: 'ck-tooltip-layer',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ck-tooltip-layer',
    'data-ck-inert-exempt': '',
    // A press on a bubble is not an outside press for an open popover (a menu) next to it.
    'data-ck-outside-ignore': '',
  },
  styleUrl: './tooltip.css',
})
export class CkTooltipLayerHost {}

/**
 * Shared state of every `ckTooltip`: the one layer element on `body` that holds the bubbles
 * (`data-ck-inert-exempt`, so a modal's `inert` never hides them), the single visible tooltip, the
 * short window after a hide in which the next tooltip shows at once, and the Escape key.
 */
@Injectable({ providedIn: 'root' })
export class CkTooltipLayer {
  private readonly document = inject(DOCUMENT);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private layerElement: HTMLElement | null = null;
  private layerComponent: ComponentRef<CkTooltipLayerHost> | null = null;
  private active: CkTooltipClient | null = null;
  private suspended: CkTooltipClient | null = null;
  private warmTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('keydown', this.onKeydown, true);
      this.clearWarm();
      this.active = null;
      this.suspended = null;
      this.layerComponent?.destroy();
      this.layerElement?.remove();
      this.layerComponent = null;
      this.layerElement = null;
    });
  }

  /** Whether the next tooltip shows without its delay: one is visible, or one hid a moment ago. */
  get warm(): boolean {
    return this.active !== null || this.warmTimer !== null;
  }

  /** The layer element, created on first use and put back on `body` when something removed it. */
  element(): HTMLElement {
    if (this.layerElement === null) {
      const element = this.document.createElement('div');
      this.layerComponent = createComponent(CkTooltipLayerHost, {
        environmentInjector: this.environmentInjector,
        hostElement: element,
      });
      this.layerElement = element;
    }
    if (!this.layerElement.isConnected) {
      this.document.body.appendChild(this.layerElement);
    }
    return this.layerElement;
  }

  /** Makes `client` the visible tooltip; the one shown before it hides. */
  claim(client: CkTooltipClient): void {
    const previous = this.active;
    this.clearWarm();
    this.active = client;
    if (previous === null) {
      this.document.addEventListener('keydown', this.onKeydown, true);
    } else if (previous !== client) {
      // A tooltip that keyboard focus showed is not lost to a hover elsewhere: it returns after it.
      this.suspended = previous.isRestorable() ? previous : this.suspended;
      previous.hide();
    }
    if (this.suspended === client) {
      this.suspended = null;
    }
  }

  /** `client` is gone or lost focus: it must not come back. */
  forget(client: CkTooltipClient): void {
    if (this.suspended === client) {
      this.suspended = null;
    }
  }

  /** `client` hid. Starts the warm window when it was the visible one. */
  release(client: CkTooltipClient): void {
    if (this.active !== client || !this.browser) {
      return;
    }
    this.active = null;
    this.document.removeEventListener('keydown', this.onKeydown, true);
    this.clearWarm();
    this.warmTimer = setTimeout(() => (this.warmTimer = null), WARM_WINDOW);
    const resumed = this.suspended;
    this.suspended = null;
    resumed?.restore();
  }

  private clearWarm(): void {
    if (this.warmTimer !== null) {
      clearTimeout(this.warmTimer);
      this.warmTimer = null;
    }
  }

  /** Escape hides the visible tooltip and stops there: a dialog, menu or sheet around it stays open. */
  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.isComposing || this.active === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.suspended = null;
    this.active.hide();
  };
}
