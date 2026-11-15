import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Injectable, inject } from '@angular/core';

/** Screen-reader announcements through one shared live region. */
@Injectable({ providedIn: 'root' })
export class CkAnnouncer {
  private readonly liveAnnouncer = inject(LiveAnnouncer);

  /** Resolves once the message is in the live region. A blank message does nothing. */
  announce(message: string, politeness: 'polite' | 'assertive' = 'polite'): Promise<void> {
    if (typeof message !== 'string' || message.trim() === '') {
      return Promise.resolve();
    }
    return this.liveAnnouncer.announce(message, politeness);
  }

  clear(): void {
    this.liveAnnouncer.clear();
  }
}
