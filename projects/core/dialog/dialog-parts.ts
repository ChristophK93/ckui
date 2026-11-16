import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  Renderer2,
  ViewEncapsulation,
  afterNextRender,
  inject,
  input,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createCkId } from '@ckui/core/internal';
import { CK_DIALOG_CONTEXT } from './dialog-context';
import { CkDialogRef } from './dialog-ref';

/** Marks a heading as the title of the dialog: it names the dialog (`aria-labelledby`). */
@Directive({
  selector: '[ckDialogTitle]',
  host: { class: 'ck-dialog__title', '[attr.id]': 'id()' },
})
export class CkDialogTitle {
  /** Default: a generated id. */
  readonly id = input(createCkId('ck-dialog-title'));

  constructor() {
    const context = inject(CK_DIALOG_CONTEXT, { optional: true });
    if (context) {
      const remove = untracked(() => context.titles.add(this.id));
      inject(DestroyRef).onDestroy(() => untracked(remove));
    }
  }
}

/** Marks the text that explains the dialog: it describes it (`aria-describedby`). */
@Directive({
  selector: '[ckDialogDescription]',
  host: { class: 'ck-dialog__description', '[attr.id]': 'id()' },
})
export class CkDialogDescription {
  /** Default: a generated id. */
  readonly id = input(createCkId('ck-dialog-description'));

  constructor() {
    const context = inject(CK_DIALOG_CONTEXT, { optional: true });
    if (context) {
      const remove = untracked(() => context.descriptions.add(this.id));
      inject(DestroyRef).onDestroy(() => untracked(remove));
    }
  }
}

/** The part of a dialog that scrolls when the content is taller than the screen. */
@Component({
  selector: 'ck-dialog-body',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ck-dialog-body' },
  template: `<div class="ck-dialog-body__inner"><ng-content /></div>`,
})
export class CkDialogBody {
  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const renderer = inject(Renderer2);
    const destroyRef = inject(DestroyRef);
    let ownTabindex = false;

    // A region that scrolls must be reachable by keyboard, but only while it actually scrolls.
    const update = (): void => {
      const scrolls = element.scrollHeight > element.clientHeight + 1;
      if (scrolls && !element.hasAttribute('tabindex')) {
        renderer.setAttribute(element, 'tabindex', '0');
        ownTabindex = true;
      } else if (!scrolls && ownTabindex) {
        renderer.removeAttribute(element, 'tabindex');
        ownTabindex = false;
      }
    };

    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      afterNextRender(() => {
        const Observer = element.ownerDocument.defaultView?.ResizeObserver;
        if (!Observer || destroyRef.destroyed) {
          return;
        }
        const observer = new Observer(update);
        observer.observe(element);
        observer.observe(element.firstElementChild!);
        destroyRef.onDestroy(() => observer.disconnect());
        update();
      });
    }
  }
}

/** The row of buttons at the bottom of a dialog. On a sheet they stack and fill the width. */
@Component({
  selector: 'ck-dialog-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ck-dialog-actions' },
  template: `<ng-content />`,
})
export class CkDialogActions {}

/** Closes the dialog with the bound value as its result when the element is clicked. */
@Directive({
  selector: '[ckDialogClose]',
  host: { '(click)': 'close()' },
})
export class CkDialogClose<R = unknown> {
  /** The result of the dialog; empty means `undefined`. */
  readonly result = input<R | '' | undefined>(undefined, { alias: 'ckDialogClose' });

  private readonly ref = inject<CkDialogRef<R>>(CkDialogRef, { optional: true });

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    // A native button in a form would submit it.
    if (element.tagName === 'BUTTON' && !element.hasAttribute('type')) {
      inject(Renderer2).setAttribute(element, 'type', 'button');
    }
  }

  protected close(): void {
    const result = this.result();
    this.ref?.close(result === '' ? undefined : result);
  }
}

/** Takes focus when the dialog opens, e.g. the least destructive action of an `alertdialog`. */
@Directive({
  selector: '[ckDialogInitialFocus]',
  host: { 'data-ck-dialog-initial-focus': '' },
})
export class CkDialogInitialFocus {}
