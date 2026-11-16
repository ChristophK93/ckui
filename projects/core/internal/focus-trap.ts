import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';
import { DOCUMENT } from '@angular/common';
import { Injectable, Injector, afterNextRender, inject } from '@angular/core';

export interface CkFocusTrap {
  /**
   * Remembers the focused element, then focuses `initialFocus()` if it returns an element that takes
   * focus, else the first tabbable one inside. Resolves `false` if nothing could be focused.
   */
  activate(initialFocus?: () => HTMLElement | null): Promise<boolean>;
  /** Destroys the trap and gives focus back if the remembered element is still connected. Safe to call repeatedly. */
  release(): void;
}

@Injectable({ providedIn: 'root' })
export class CkFocusTrapFactory {
  private readonly focusTrapFactory = inject(FocusTrapFactory);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  create(element: HTMLElement): CkFocusTrap {
    const trap: FocusTrap = this.focusTrapFactory.create(element);
    const { document, injector } = this;
    let previous: HTMLElement | null = null;
    let released = false;

    return {
      activate: (initialFocus) => {
        if (released) {
          return Promise.resolve(false);
        }
        previous ??= document.activeElement instanceof HTMLElement ? document.activeElement : null;
        // The CDK's own deferred variant would still focus after a release in between.
        return new Promise<boolean>((resolve) => {
          afterNextRender(
            () => {
              if (released) {
                return resolve(false);
              }
              const target = initialFocus?.() ?? null;
              if (target) {
                target.focus();
                if (document.activeElement === target) {
                  return resolve(true);
                }
              }
              resolve(trap.focusInitialElement());
            },
            { injector },
          );
        });
      },
      release: () => {
        if (released) {
          return;
        }
        released = true;
        trap.destroy();
        const target = previous;
        previous = null;
        if (target?.isConnected) {
          target.focus();
        }
      },
    };
  }
}
