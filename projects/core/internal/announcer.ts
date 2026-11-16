import { LiveAnnouncer } from '@angular/cdk/a11y';
import { _CdkPrivateStyleLoader, _VisuallyHiddenLoader } from '@angular/cdk/private';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

type Politeness = 'polite' | 'assertive';

interface Pending {
  readonly message: string;
  readonly politeness: Politeness;
}

/** Joins messages in order, with ". " unless the earlier one already ends in punctuation. */
function join(messages: readonly string[]): string {
  return messages.reduce((text, message) => {
    const trimmed = message.trim();
    if (text === '') {
      return trimmed;
    }
    return /[.!?:;,]$/.test(text) ? `${text} ${trimmed}` : `${text}. ${trimmed}`;
  }, '');
}

/** A message handed to the live region this recently (ms) may not have been read out yet. */
const READ_OUT_WINDOW = 150;

/**
 * Screen-reader announcements through one shared live region. The CDK live region keeps only the
 * last message, so announcements made in the same tick are collected and spoken as one message, in
 * order (joined with ". "); it is assertive if any of them is. A batch that follows within 150 ms
 * of the previous hand-over (the previous one may not be read out yet, and the CDK would replace
 * it) is spoken together with the previous text, again in order and assertive if either is; after
 * a longer pause only the new text is written. The region is hidden visually by the CDK styles,
 * which this service loads itself.
 */
@Injectable({ providedIn: 'root' })
export class CkAnnouncer {
  private readonly liveAnnouncer = inject(LiveAnnouncer);
  private pending: Pending[] = [];
  private waiters: (() => void)[] = [];
  private scheduled = false;
  private readonly view = inject(DOCUMENT).defaultView;
  private last: (Pending & { at: number }) | null = null;

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      inject(_CdkPrivateStyleLoader).load(_VisuallyHiddenLoader);
    }
  }

  /**
   * Resolves once the message is in the live region. A blank message does nothing. Messages from
   * the same tick share one live-region update and one promise result.
   */
  announce(message: string, politeness: Politeness = 'polite'): Promise<void> {
    if (typeof message !== 'string' || message.trim() === '') {
      return Promise.resolve();
    }
    this.pending.push({ message, politeness });
    const done = new Promise<void>((resolve) => this.waiters.push(resolve));
    if (!this.scheduled) {
      this.scheduled = true;
      queueMicrotask(() => this.flush());
    }
    return done;
  }

  /** Empties the live region and drops announcements that have not been written yet. */
  clear(): void {
    this.pending = [];
    this.last = null;
    this.release();
    this.liveAnnouncer.clear();
  }

  private flush(): void {
    this.scheduled = false;
    const items = this.pending;
    if (items.length === 0) {
      return;
    }
    this.pending = [];
    const waiters = this.waiters;
    this.waiters = [];
    const now = this.view?.performance.now() ?? Date.now();
    const previous = this.last && now - this.last.at < READ_OUT_WINDOW ? this.last : null;
    const fresh = join(items.map((item) => item.message));
    // The same words again are repeated on their own, not stacked onto themselves.
    const all = previous && previous.message !== fresh ? [previous, ...items] : items;
    const politeness = all.some((item) => item.politeness === 'assertive') ? 'assertive' : 'polite';
    const message = all === items ? fresh : join(all.map((item) => item.message));
    this.last = { message, politeness, at: now };
    void this.liveAnnouncer
      .announce(message, politeness)
      .then(() => waiters.forEach((resolve) => resolve()));
  }

  private release(): void {
    const waiters = this.waiters;
    this.waiters = [];
    waiters.forEach((resolve) => resolve());
  }
}
