import { BreakpointObserver } from '@angular/cdk/layout';
import { Injectable, Signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CK_CONFIG } from '@ckui/core';

/** Viewport and user-preference signals. All `false` on the server, where nothing can match. */
@Injectable({ providedIn: 'root' })
export class CkMedia {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly config = inject(CK_CONFIG);

  /** `(pointer: coarse)` */
  readonly coarsePointer: Signal<boolean> = this.watch('(pointer: coarse)');
  /** Viewport narrower than `CK_CONFIG.sheetBreakpoint`. */
  readonly narrow: Signal<boolean> = this.watch(
    `(max-width: ${this.config.sheetBreakpoint - 0.02}px)`,
  );
  /** `(prefers-reduced-motion: reduce)` */
  readonly reducedMotion: Signal<boolean> = this.watch('(prefers-reduced-motion: reduce)');
  /** Coarse pointer and a narrow viewport: overlays render as sheets. */
  readonly sheet: Signal<boolean> = computed(() => this.coarsePointer() && this.narrow());

  private watch(query: string): Signal<boolean> {
    const state = toSignal(this.breakpointObserver.observe(query), {
      initialValue: { matches: this.breakpointObserver.isMatched(query), breakpoints: {} },
    });
    return computed(() => state().matches);
  }
}
