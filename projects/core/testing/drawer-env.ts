import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CkMedia } from '@ckui/core/internal';
import {
  DIALOG_DARK,
  DIALOG_LIGHT,
  TemplateOwner,
  flush,
  resetEnvironment,
  settle,
  setup,
  wait,
} from './dialog-env';

export { DIALOG_DARK, DIALOG_LIGHT, TemplateOwner, flush, resetEnvironment, settle, setup, wait };

export const drawerPanel = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('.ck-drawer-panel');

export const drawerPanels = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.ck-drawer-panel'));

/** Replaces `CkMedia` with signals the spec flips by hand. Call after `setup()`. */
export function fakeMedia(options: { sheet?: boolean; reducedMotion?: boolean } = {}) {
  const sheet = signal(options.sheet ?? false);
  const reducedMotion = signal(options.reducedMotion ?? false);
  TestBed.configureTestingModule({
    providers: [
      {
        provide: CkMedia,
        useValue: {
          sheet,
          reducedMotion,
          narrow: signal(options.sheet ?? false),
          coarsePointer: signal(options.sheet ?? false),
        },
      },
    ],
  });
  return { sheet, reducedMotion };
}

/** Sends a key to whatever has focus, the way the browser would. */
export function press(key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  (document.activeElement ?? document.body).dispatchEvent(event);
  return event;
}
