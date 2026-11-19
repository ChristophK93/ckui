import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { CK_LABELS } from '@ckui/core';
import { CK_MENU_SESSION } from './menu-context';

/**
 * What the overlay shows for an open menu: the consumer's template, and on a phone a title above
 * it and the Cancel row below it. Not public API.
 */
@Component({
  selector: 'ck-menu-panel',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ck-menu-panel',
    '[class.ck-menu-panel--sheet]': 'session.sheet',
    '[class.ck-menu-panel--popover]': '!session.sheet',
    '(mousedown)': 'onMousedown($event)',
  },
  template: `
    @if (session.sheet && session.name !== '') {
      <div class="ck-menu-panel__title">{{ session.name }}</div>
    }
    <ng-container *ngTemplateOutlet="session.template; injector: injector" />
    @if (session.sheet) {
      <div class="ck-menu-panel__footer">
        <button type="button" class="ck-menu-panel__cancel" (click)="session.close()">
          {{ labels().cancel }}
        </button>
      </div>
    }
  `,
  styleUrl: './menu.css',
})
export class CkMenuPanel {
  protected readonly session = inject(CK_MENU_SESSION);
  protected readonly labels = inject(CK_LABELS);
  /** Lets the consumer's template reach the session, though it is declared elsewhere. */
  protected readonly injector = inject(Injector);

  /** A press on padding must not take focus off the item that has it; buttons keep theirs. */
  protected onMousedown(event: MouseEvent): void {
    if (!(event.target instanceof Element && event.target.closest('button'))) {
      event.preventDefault();
    }
  }
}
