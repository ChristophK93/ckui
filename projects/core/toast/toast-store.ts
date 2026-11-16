import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, WritableSignal, computed, inject, signal } from '@angular/core';
import { CK_CONFIG, CkSize } from '@ckui/core';
import { CkAnnouncer } from '@ckui/core/internal';
import { CK_TOAST_CONFIG, CkToastPosition, DEFAULT_MAX } from './config';
import {
  CkToastAction,
  CkToastDismissReason,
  CkToastOptions,
  CkToastRef,
  CkToastTone,
} from './toast-ref';

declare const ngDevMode: unknown;

export const DEFAULT_DURATION = 5000;
/** After a pause at least this much time is left, so a toast never vanishes the instant the pointer leaves it. */
export const MIN_RESUME = 1000;
/** The longest delay `setTimeout` accepts; a longer duration counts as "until dismissed". */
export const MAX_DURATION = 2_147_483_647;

const TONES: readonly CkToastTone[] = ['neutral', 'success', 'warning', 'danger'];

/** A toast's content after validation. */
export interface ToastContent {
  readonly message: string;
  readonly title: string | undefined;
  readonly tone: CkToastTone;
  readonly action: CkToastAction | undefined;
  readonly duration: number | null | undefined;
}

export type ToastPhase = 'queued' | 'visible' | 'leaving';

export class ToastEntry {
  readonly content: WritableSignal<ToastContent>;
  readonly phase = signal<ToastPhase>('queued');
  /** Set when the user swiped the toast away, so it fades out where it is. */
  readonly swiped = signal(false);
  /** The rendered item, set by the item itself; used to move focus away before it leaves. */
  element: HTMLElement | null = null;
  /** The ref that currently controls this toast; an older one was replaced. */
  ref!: CkToastRef;
  /** Settles the current ref's `dismissed`. */
  settle: (reason: CkToastDismissReason) => void = () => undefined;
  timer: ReturnType<typeof setTimeout> | undefined;
  remaining: number | null = null;
  startedAt = 0;
  readonly pauses = new Set<string>();
  announced = '';

  constructor(
    /** Unique per stack entry; the key of the rendered item. */
    readonly key: number,
    /** The consumer's `id`, if any. */
    readonly id: string | undefined,
    content: ToastContent,
  ) {
    this.content = signal(content);
  }
}

function present(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function normaliseAction(action: unknown): CkToastAction | undefined {
  const candidate = action as Partial<CkToastAction> | null | undefined;
  return candidate && present(candidate.label) && typeof candidate.run === 'function'
    ? { label: candidate.label, run: candidate.run }
    : undefined;
}

/** The validated content, or `null` when there is nothing to show. */
function normalise(options: unknown): ToastContent | null {
  const source = (typeof options === 'object' && options !== null ? options : {}) as Record<
    string,
    unknown
  >;
  const title = present(source['title']) ? source['title'] : undefined;
  const message = typeof source['message'] === 'string' ? source['message'] : '';
  if (message.trim() === '' && title === undefined) {
    return null;
  }
  const duration = source['duration'];
  return {
    message,
    title,
    tone: TONES.includes(source['tone'] as CkToastTone)
      ? (source['tone'] as CkToastTone)
      : 'neutral',
    action: normaliseAction(source['action']),
    duration: typeof duration === 'number' || duration === null ? duration : undefined,
  };
}

/** Milliseconds until the toast closes by itself, or `null` when it stays until dismissed. */
export function effectiveDuration(content: ToastContent): number | null {
  const { duration } = content;
  if (duration === null) {
    return null;
  }
  if (typeof duration === 'number') {
    return Number.isFinite(duration) && duration > 0 && duration <= MAX_DURATION ? duration : null;
  }
  return content.action !== undefined || content.tone === 'danger' ? null : DEFAULT_DURATION;
}

export function announcementOf(content: ToastContent): string {
  const { title, message } = content;
  if (title === undefined) {
    return message;
  }
  if (message.trim() === '') {
    return title;
  }
  return /[.!?:]$/.test(title.trim()) ? `${title} ${message}` : `${title}. ${message}`;
}

/** The state of every open toast: queue, timers, announcements. The host and the items render it. */
@Injectable({ providedIn: 'root' })
export class CkToastStore {
  private readonly document = inject(DOCUMENT);
  private readonly announcer = inject(CkAnnouncer);
  private readonly config = inject(CK_TOAST_CONFIG);
  private readonly ckConfig = inject(CK_CONFIG);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Every toast in the order shown, leaving ones included until their animation ends. */
  readonly entries = signal<readonly ToastEntry[]>([]);
  readonly position: CkToastPosition = this.config.position ?? 'bottom';
  readonly max: number = this.config.max ?? DEFAULT_MAX;
  readonly alignOverride = this.config.align;
  readonly size = computed<CkSize>(() => this.config.size ?? this.ckConfig.size);

  /** Called just before a visible toast starts leaving, while its element can still hold focus. */
  beforeLeave: ((entry: ToastEntry) => void) | null = null;

  private nextKey = 0;
  private listening = false;
  private destroyed = false;

  show(options: CkToastOptions): CkToastRef {
    const content = normalise(options);
    if (!this.isBrowser || this.destroyed || content === null) {
      if (content === null && typeof ngDevMode !== 'undefined' && ngDevMode) {
        console.warn('[ckui] CkToast.show needs a message or a title, nothing was shown.');
      }
      return this.settledRef();
    }
    const id = present(options.id) ? options.id : undefined;
    const existing =
      id === undefined
        ? undefined
        : this.entries().find((entry) => entry.id === id && entry.phase() !== 'leaving');
    if (existing) {
      this.replace(existing, content);
      return existing.ref;
    }
    this.listen();
    const entry = new ToastEntry(this.nextKey++, id, content);
    this.bind(entry);
    this.entries.update((entries) => [...entries, entry]);
    this.promote();
    return entry.ref;
  }

  /** Queued toasts go first and quietly, so closing the visible ones promotes and announces nothing. */
  dismissAll(): void {
    const all = [...this.entries()];
    const queued = all.filter((entry) => entry.phase() === 'queued');
    for (const entry of queued) {
      this.clearTimer(entry);
      entry.settle('programmatic');
    }
    if (queued.length > 0) {
      this.entries.update((entries) => entries.filter((entry) => !queued.includes(entry)));
    }
    for (const entry of all) {
      if (!queued.includes(entry)) {
        this.dismiss(entry, 'programmatic');
      }
    }
  }

  dismiss(entry: ToastEntry, reason: CkToastDismissReason, swiped = false): void {
    const phase = entry.phase();
    if (phase === 'leaving') {
      return;
    }
    this.clearTimer(entry);
    entry.settle(reason);
    if (phase === 'queued') {
      this.remove(entry);
      return;
    }
    this.beforeLeave?.(entry);
    entry.swiped.set(swiped);
    entry.phase.set('leaving');
    this.promote();
  }

  /** Takes the entry out once it has left the screen. */
  remove(entry: ToastEntry): void {
    this.clearTimer(entry);
    if (this.entries().includes(entry)) {
      this.entries.update((entries) => entries.filter((other) => other !== entry));
    }
  }

  pause(entry: ToastEntry, reason: string): void {
    entry.pauses.add(reason);
    if (entry.timer !== undefined && entry.remaining !== null) {
      clearTimeout(entry.timer);
      entry.timer = undefined;
      entry.remaining = Math.max(entry.remaining - (Date.now() - entry.startedAt), MIN_RESUME);
    }
  }

  resume(entry: ToastEntry, reason: string): void {
    if (entry.pauses.delete(reason)) {
      this.arm(entry);
    }
  }

  /** Closes everything without animation and stops listening; used when the app is destroyed. */
  teardown(): void {
    this.destroyed = true;
    this.beforeLeave = null;
    for (const entry of this.entries()) {
      this.clearTimer(entry);
      entry.settle('programmatic');
      entry.phase.set('leaving');
    }
    this.entries.set([]);
    if (this.listening) {
      this.listening = false;
      this.document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  /** Gives the entry a fresh ref; the previous ref of a replaced toast has already been settled. */
  private bind(entry: ToastEntry): void {
    let resolve: (reason: CkToastDismissReason) => void = () => undefined;
    const dismissed = new Promise<CkToastDismissReason>((done) => (resolve = done));
    const ref: CkToastRef = new CkToastRef({
      dismissed,
      dismiss: () => {
        if (entry.ref === ref) {
          this.dismiss(entry, 'programmatic');
        }
      },
      update: (partial) => {
        if (entry.ref === ref) {
          this.update(entry, partial);
        }
      },
    });
    entry.ref = ref;
    entry.settle = resolve;
  }

  private settledRef(): CkToastRef {
    return new CkToastRef({
      dismissed: Promise.resolve('programmatic'),
      dismiss: () => undefined,
      update: () => undefined,
    });
  }

  private replace(entry: ToastEntry, content: ToastContent): void {
    entry.settle('replaced');
    this.bind(entry);
    this.apply(entry, content);
  }

  private update(entry: ToastEntry, partial: Partial<CkToastOptions>): void {
    if (entry.phase() === 'leaving' || typeof partial !== 'object' || partial === null) {
      return;
    }
    const current = entry.content();
    const has = (key: keyof CkToastOptions): boolean =>
      Object.hasOwn(partial, key) && !(key === 'message' && partial.message === undefined);
    const merged = normalise({
      message: has('message') ? partial.message : current.message,
      title: has('title') ? partial.title : current.title,
      tone: has('tone') ? partial.tone : current.tone,
      action: has('action') ? partial.action : current.action,
      duration: has('duration') ? partial.duration : current.duration,
    });
    if (merged !== null) {
      this.apply(entry, merged);
    }
  }

  private apply(entry: ToastEntry, content: ToastContent): void {
    entry.content.set(content);
    if (entry.phase() === 'visible') {
      this.restart(entry);
      this.announce(entry);
    }
  }

  /** Shows queued toasts while there is a free slot. */
  private promote(): void {
    const entries = this.entries();
    let free = this.max - entries.filter((entry) => entry.phase() === 'visible').length;
    for (const entry of entries) {
      if (free <= 0) {
        break;
      }
      if (entry.phase() === 'queued') {
        free--;
        entry.phase.set('visible');
        if (this.document.visibilityState === 'hidden') {
          entry.pauses.add('hidden');
        }
        this.restart(entry);
        this.announce(entry);
      }
    }
  }

  private restart(entry: ToastEntry): void {
    this.clearTimer(entry);
    entry.remaining = effectiveDuration(entry.content());
    this.arm(entry);
  }

  private arm(entry: ToastEntry): void {
    if (
      entry.phase() !== 'visible' ||
      entry.remaining === null ||
      entry.pauses.size > 0 ||
      entry.timer !== undefined
    ) {
      return;
    }
    entry.startedAt = Date.now();
    entry.timer = setTimeout(() => {
      entry.timer = undefined;
      this.dismiss(entry, 'timeout');
    }, entry.remaining);
  }

  private clearTimer(entry: ToastEntry): void {
    if (entry.timer !== undefined) {
      clearTimeout(entry.timer);
      entry.timer = undefined;
    }
  }

  /** Danger is assertive, everything else polite; the same words at the same politeness are not repeated. */
  private announce(entry: ToastEntry): void {
    const content = entry.content();
    const politeness = content.tone === 'danger' ? 'assertive' : 'polite';
    const text = announcementOf(content);
    const signature = `${politeness}|${text}`;
    if (signature !== entry.announced) {
      entry.announced = signature;
      void this.announcer.announce(text, politeness);
    }
  }

  private listen(): void {
    if (!this.listening) {
      this.listening = true;
      this.document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  private readonly onVisibilityChange = (): void => {
    const hidden = this.document.visibilityState === 'hidden';
    for (const entry of this.entries()) {
      if (entry.phase() !== 'visible') {
        continue;
      }
      if (hidden) {
        this.pause(entry, 'hidden');
      } else {
        this.resume(entry, 'hidden');
      }
    }
  };
}
