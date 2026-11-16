import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
} from '@angular/core';
import { CK_LABELS } from '@ckui/core';
import { CkMedia } from '@ckui/core/internal';
import { CkToastItem } from './toast-item';
import { CkToastStore } from './toast-store';

/**
 * The one `<section>` that holds every toast, a direct child of `body`. `data-ck-inert-exempt`
 * keeps it clickable while a modal overlay has made the rest of the page inert.
 */
@Component({
  selector: 'ck-toast-host',
  imports: [CkToastItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ck-toast-host',
    'data-ck-inert-exempt': '',
    '[attr.aria-label]': 'labels().notifications',
    '[class.ck-toast-host--top]': 'store.position === "top"',
    '[class.ck-toast-host--bottom]': 'store.position === "bottom"',
    '[class.ck-toast-host--center]': 'align() === "center"',
    '[class.ck-toast-host--end]': 'align() === "end"',
    '[class.ck-toast-host--narrow]': 'media.narrow()',
    '[class.ck-toast-host--empty]': 'shown().length === 0',
  },
  template: `
    @for (entry of shown(); track entry.key) {
      <ck-toast-item [entry]="entry" />
    }
  `,
  styleUrl: './toast.css',
})
export class CkToastHost {
  protected readonly store = inject(CkToastStore);
  protected readonly labels = inject(CK_LABELS);
  protected readonly media = inject(CkMedia);

  /** Centred on a narrow viewport, at the end otherwise, unless `provideCkToast` says which. */
  protected readonly align = computed(
    () => this.store.alignOverride ?? (this.media.narrow() ? 'center' : 'end'),
  );

  /** Queued toasts wait; the newest is nearest the screen edge, so at the top it comes first in the DOM. */
  protected readonly shown = computed(() => {
    const shown = this.store.entries().filter((entry) => entry.phase() !== 'queued');
    return this.store.position === 'top' ? shown.reverse() : shown;
  });
}
