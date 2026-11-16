import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { CK_LABELS } from '@ckui/core';
import { CkButton } from '@ckui/core/button';
import { CkIcon, CkIconName, CkMedia } from '@ckui/core/internal';
import { CkToastTone } from './toast-ref';
import { CkToastStore, ToastEntry } from './toast-store';

/** A drag shorter than this is a tap, and one that is mostly vertical is a scroll. */
const SWIPE_SLOP = 8;
/** Dragged further than this share of the toast's width, the toast is dismissed on release... */
const SWIPE_DISTANCE_RATIO = 0.35;
/** ...or after a quicker flick (px per ms) that moved at least this far (px). */
const SWIPE_FLICK_VELOCITY = 0.5;
const SWIPE_FLICK_MIN_DISTANCE = 24;
const VELOCITY_WINDOW = 100;
/** Gives up waiting for `animationend` this long after the animation should have ended. */
const LEAVE_GRACE = 100;
/** A click this soon (ms) after a drag's pointerup is the drag's own and is swallowed. */
const CLICK_AFTER_DRAG = 100;

const ICONS: Record<CkToastTone, CkIconName> = {
  neutral: 'info',
  success: 'check',
  warning: 'alert-triangle',
  danger: 'alert-octagon',
};

function parseTime(value: string): number {
  const match = /^\s*(-?[\d.]+)(ms|s)\s*$/.exec(value);
  if (!match) {
    return 0;
  }
  const amount = Number(match[1]) * (match[2] === 's' ? 1000 : 1);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

/** One toast: tone icon, text, an optional action and the dismiss button. Pauses its timer, swipes away. */
@Component({
  selector: 'ck-toast-item',
  imports: [CkButton, CkIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ck-toast',
    '[class]': 'toneClass()',
    '[class.ck-toast--leaving]': 'leaving()',
    '[class.ck-toast--swiped]': 'entry().swiped()',
    '[attr.inert]': 'leaving() ? "" : null',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'onFocusOut($event)',
    '(pointerdown)': 'onPointerDown($event)',
  },
  template: `
    <span class="ck-toast__icon" aria-hidden="true">
      <ck-icon [name]="iconName()" />
    </span>
    <div class="ck-toast__text">
      @if (content().title; as title) {
        <div class="ck-toast__title">{{ title }}</div>
      }
      @if (content().message.trim() !== '') {
        <div class="ck-toast__message">{{ content().message }}</div>
      }
    </div>
    <div class="ck-toast__buttons">
      @if (content().action; as action) {
        <button
          ckButton
          type="button"
          variant="ghost"
          class="ck-toast__action"
          [size]="store.size()"
          (click)="runAction()"
        >
          {{ action.label }}
        </button>
      }
      <button
        ckButton
        type="button"
        variant="ghost"
        iconOnly
        class="ck-toast__dismiss"
        [size]="store.size()"
        [attr.aria-label]="labels().dismiss"
        (click)="dismiss()"
      >
        <ck-icon name="close" />
      </button>
    </div>
  `,
})
export class CkToastItem {
  readonly entry = input.required<ToastEntry>();

  protected readonly store = inject(CkToastStore);
  protected readonly labels = inject(CK_LABELS);
  private readonly media = inject(CkMedia);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly view = this.element.ownerDocument.defaultView as Window;

  protected readonly content = computed(() => this.entry().content());
  protected readonly leaving = computed(() => this.entry().phase() === 'leaving');
  protected readonly toneClass = computed(() => `ck-toast--${this.content().tone}`);
  protected readonly iconName = computed<CkIconName>(() => ICONS[this.content().tone]);

  private destroyed = false;
  private stopTracking: (() => void) | null = null;
  /** `timeStamp` of the pointerup that ended a drag; the click that follows it is swallowed. */
  private dragEndedAt: number | null = null;

  constructor() {
    const destroyRef = this.destroyRef;
    const swallowClick = (event: Event): void => {
      const endedAt = this.dragEndedAt;
      this.dragEndedAt = null;
      if (endedAt !== null && event.timeStamp - endedAt < CLICK_AFTER_DRAG) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    this.element.addEventListener('click', swallowClick, { capture: true });
    destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.element.removeEventListener('click', swallowClick, { capture: true });
      this.stopTracking?.();
    });

    effect(() => {
      this.entry().element = this.element;
    });

    effect(() => {
      if (this.leaving()) {
        untracked(() => afterNextRender(() => this.finishLeaving(), { injector: this.injector }));
      }
    });
  }

  protected runAction(): void {
    const entry = this.entry();
    const action = entry.content().action;
    if (!action || entry.phase() !== 'visible') {
      return;
    }
    try {
      action.run();
    } finally {
      this.store.dismiss(entry, 'action');
    }
  }

  protected dismiss(): void {
    this.store.dismiss(this.entry(), 'user');
  }

  protected onPointerEnter(event: PointerEvent): void {
    if (event.pointerType !== 'touch') {
      this.store.pause(this.entry(), 'hover');
    }
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (event.pointerType !== 'touch') {
      this.store.resume(this.entry(), 'hover');
    }
  }

  protected onFocusIn(): void {
    this.store.pause(this.entry(), 'focus');
  }

  protected onFocusOut(event: FocusEvent): void {
    if (!(event.relatedTarget instanceof Node && this.element.contains(event.relatedTarget))) {
      this.store.resume(this.entry(), 'focus');
    }
  }

  /** Removes the toast once its leave animation is over, at once when there is none. */
  private finishLeaving(): void {
    if (this.destroyed) {
      return;
    }
    const entry = this.entry();
    const style = this.view.getComputedStyle(this.element);
    const duration = parseTime(style.animationDuration.split(',')[0] ?? '');
    if (style.animationName === 'none' || duration === 0 || this.media.reducedMotion()) {
      this.store.remove(entry);
      return;
    }
    let done = false;
    const finish = (): void => {
      if (!done) {
        done = true;
        clearTimeout(fallback);
        this.element.removeEventListener('animationend', finish);
        this.store.remove(entry);
      }
    };
    const fallback = setTimeout(finish, duration + LEAVE_GRACE);
    this.element.addEventListener('animationend', finish);
    this.destroyRef.onDestroy(() => clearTimeout(fallback));
  }

  protected onPointerDown(event: PointerEvent): void {
    this.dragEndedAt = null;
    const entry = this.entry();
    if (
      this.stopTracking ||
      !event.isPrimary ||
      event.button !== 0 ||
      entry.phase() !== 'visible'
    ) {
      return;
    }
    const element = this.element;
    const doc = element.ownerDocument;
    const now = (): number => this.view.performance.now();
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const width = Math.max(element.getBoundingClientRect().width, 1);
    let swiping = false;
    let offset = 0;
    let samples = [{ offset: 0, time: now() }];

    this.store.pause(entry, 'drag');

    const end = (): void => {
      doc.removeEventListener('pointermove', onMove);
      doc.removeEventListener('pointerup', onUp);
      doc.removeEventListener('pointercancel', onCancel);
      this.stopTracking = null;
      element.classList.remove('ck-toast--dragging');
      this.store.resume(entry, 'drag');
    };

    const snapBack = (): void => {
      const from = offset;
      const opacity = element.style.opacity || '1';
      element.style.translate = '';
      element.style.opacity = '';
      const duration = this.media.reducedMotion()
        ? 0
        : parseTime(this.view.getComputedStyle(element).getPropertyValue('--ck-duration-normal'));
      if (from !== 0 && duration > 0 && typeof element.animate === 'function') {
        element.animate(
          [
            { translate: `${from}px 0`, opacity },
            { translate: '0 0', opacity: '1' },
          ],
          { duration, easing: 'ease-out' },
        );
      }
    };

    const velocity = (): number => {
      const current = now();
      const recent = samples.filter((sample) => current - sample.time <= VELOCITY_WINDOW);
      const first = recent[0];
      const last = recent[recent.length - 1];
      return first && last
        ? (Math.abs(last.offset) - Math.abs(first.offset)) / Math.max(1, current - first.time)
        : 0;
    };

    const onMove = (moved: PointerEvent): void => {
      if (moved.pointerId !== pointerId) {
        return;
      }
      const deltaX = moved.clientX - startX;
      const deltaY = moved.clientY - startY;
      if (!swiping) {
        if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < SWIPE_SLOP) {
          return;
        }
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          end();
          return;
        }
        swiping = true;
        element.classList.add('ck-toast--dragging');
        try {
          element.setPointerCapture?.(pointerId);
        } catch {
          // A pointer that is already gone cannot be captured; the document listeners still work.
        }
      }
      offset = deltaX;
      element.style.translate = `${offset}px 0`;
      element.style.opacity = String(Math.max(0, 1 - Math.abs(offset) / width));
      samples.push({ offset, time: now() });
    };

    const onUp = (released: PointerEvent): void => {
      if (released.pointerId !== pointerId) {
        return;
      }
      const distance = Math.abs(offset);
      const dismissed =
        swiping &&
        (distance > width * SWIPE_DISTANCE_RATIO ||
          (velocity() >= SWIPE_FLICK_VELOCITY && distance >= SWIPE_FLICK_MIN_DISTANCE));
      end();
      if (swiping) {
        this.dragEndedAt = released.timeStamp;
      }
      if (dismissed) {
        this.store.dismiss(entry, 'user', true);
      } else if (swiping) {
        snapBack();
      }
    };

    const onCancel = (cancelled: PointerEvent): void => {
      if (cancelled.pointerId !== pointerId) {
        return;
      }
      end();
      if (swiping) {
        snapBack();
      }
    };

    this.stopTracking = () => {
      end();
      samples = [];
    };
    doc.addEventListener('pointermove', onMove);
    doc.addEventListener('pointerup', onUp);
    doc.addEventListener('pointercancel', onCancel);
  }
}
