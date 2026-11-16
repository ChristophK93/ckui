import { Component, PLATFORM_ID, TemplateRef, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import { CkMedia } from './media';
import { CkOverlayConfig, CkOverlayHost } from './overlay-host';

@Component({
  selector: 'ck-test-content',
  template: `
    <button type="button" class="first">First</button>
    <button type="button" class="last">Last</button>
  `,
})
class Content {}

@Component({ selector: 'ck-test-empty', template: `<p>Nothing to focus</p>` })
class EmptyContent {}

@Component({
  selector: 'ck-test-broken',
  template: ``,
})
class BrokenContent {
  constructor() {
    throw new Error('broken content');
  }
}

@Component({
  template: `<ng-template #tpl
    ><button type="button" class="from-template">{{ label() }}</button></ng-template
  >`,
})
class TemplateHost {
  readonly label = signal('One');
  readonly template = viewChild.required<TemplateRef<unknown>>('tpl');
}

function fakeMedia(options: { sheet?: boolean; reducedMotion?: boolean } = {}) {
  const sheet = signal(options.sheet ?? false);
  const reducedMotion = signal(options.reducedMotion ?? false);
  TestBed.configureTestingModule({
    providers: [
      {
        provide: CkMedia,
        useValue: {
          sheet,
          reducedMotion,
          narrow: signal(false),
          coarsePointer: signal(false),
        },
      },
    ],
  });
  return { sheet, reducedMotion };
}

describe('CkOverlayHost', () => {
  let opener: HTMLButtonElement;
  let app: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="app"><button id="opener" type="button">Open</button></div>
      <section id="toasts" data-ck-inert-exempt><button id="toast-button" type="button">Undo</button></section>
    `;
    app = document.querySelector<HTMLElement>('#app')!;
    opener = document.querySelector<HTMLButtonElement>('#opener')!;
    opener.focus();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.replaceChildren();
    document.documentElement.removeAttribute('style');
    document.documentElement.classList.remove('cdk-global-scrollblock');
  });

  const host = () => TestBed.inject(CkOverlayHost);

  async function open(
    config: CkOverlayConfig = {},
    content: typeof Content | typeof EmptyContent = Content,
  ) {
    const handle = host().open(content, { mode: 'modal', ...config });
    await handle.opened;
    return handle;
  }

  const query = <T extends Element>(selector: string) => document.querySelector<T>(selector);
  const wait = (milliseconds: number) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

  function press(key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    (document.activeElement ?? document.body).dispatchEvent(event);
    return event;
  }

  describe('modal', () => {
    it('renders a centred dialog with role, aria-modal and a backdrop', async () => {
      const handle = await open({ ariaLabel: 'Confirm' });
      expect(handle.mode).toBe('modal');
      expect(handle.panel.getAttribute('role')).toBe('dialog');
      expect(handle.panel.getAttribute('aria-modal')).toBe('true');
      expect(handle.panel.getAttribute('aria-label')).toBe('Confirm');
      expect(query('.ck-overlay-backdrop')).not.toBeNull();
      const rect = handle.panel.getBoundingClientRect();
      expect(Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2)).toBeLessThan(2);
      expect(Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2)).toBeLessThan(2);
      expect(handle.panel.querySelector('.ck-overlay-grab')).toBeNull();
    });

    it('supports alertdialog, labelledby and describedby', async () => {
      const handle = await open({
        role: 'alertdialog',
        ariaLabelledBy: 'title',
        ariaDescribedBy: 'text',
      });
      expect(handle.panel.getAttribute('role')).toBe('alertdialog');
      expect(handle.panel.getAttribute('aria-labelledby')).toBe('title');
      expect(handle.panel.getAttribute('aria-describedby')).toBe('text');
      expect(handle.panel.hasAttribute('aria-label')).toBe(false);
    });

    it('adds panel classes and the layer token as the container z-index', async () => {
      const handle = await open({ panelClass: ['one', 'two'] });
      expect(handle.panel.classList.contains('one')).toBe(true);
      expect(handle.panel.classList.contains('two')).toBe(true);
      expect(handle.panel.classList.contains('ck-overlay--modal')).toBe(true);
      expect(query<HTMLElement>('.cdk-overlay-container')!.style.zIndex).toBe(
        'var(--ck-z-overlay, 1000)',
      );
    });

    it('has no axe violations', async () => {
      await open({ ariaLabel: 'Confirm' });
      await expectNoAxeViolations(query('.cdk-overlay-container')!);
    });

    it('renders template content and keeps it reactive', async () => {
      const fixture = TestBed.createComponent(TemplateHost);
      await fixture.whenStable();
      const handle = host().open(fixture.componentInstance.template(), { mode: 'modal' });
      await handle.opened;
      expect(handle.panel.querySelector('.from-template')?.textContent).toBe('One');
      fixture.componentInstance.label.set('Two');
      await fixture.whenStable();
      expect(handle.panel.querySelector('.from-template')?.textContent).toBe('Two');
      await handle.close();
    });

    it('leaves nothing behind when the content throws', () => {
      expect(() => host().open(BrokenContent, { mode: 'modal' })).toThrow('broken content');
      expect(query('.cdk-overlay-pane')).toBeNull();
      expect(app.inert).toBe(false);
      expect(document.documentElement.classList.contains('cdk-global-scrollblock')).toBe(false);
    });
  });

  describe('sheet', () => {
    it('sits at the bottom, full width, as tall as its content, with a grab area', async () => {
      const handle = await open({ mode: 'sheet' });
      expect(handle.mode).toBe('sheet');
      const rect = handle.panel.getBoundingClientRect();
      expect(Math.round(rect.bottom)).toBe(window.innerHeight);
      expect(rect.width).toBe(window.innerWidth);
      expect(rect.height).toBeLessThan(window.innerHeight / 2);
      expect(handle.panel.querySelector('[data-ck-sheet-grab]')).not.toBeNull();
      expect(handle.panel.classList.contains('ck-overlay--sheet')).toBe(true);
    });

    it('fills the viewport height with fullHeight and never exceeds it', async () => {
      const handle = await open({ mode: 'sheet', fullHeight: true });
      const rect = handle.panel.getBoundingClientRect();
      expect(Math.round(rect.height)).toBe(window.innerHeight);
      expect(Math.round(rect.top)).toBe(0);
    });

    it('caps a tall content at the viewport height', async () => {
      const handle = host().open(Content, { mode: 'sheet' });
      await handle.opened;
      (handle.panel.querySelector('.first') as HTMLElement).style.height = '5000px';
      expect(handle.panel.getBoundingClientRect().height).toBeLessThanOrEqual(window.innerHeight);
    });

    it('keeps the grab area off the content, also under a coarse pointer target size', async () => {
      const root = document.documentElement;
      root.style.setProperty('--ck-target-min', '44px');
      root.style.setProperty('--ck-space-2', '8px');
      root.style.setProperty('--ck-space-1', '4px');
      root.style.setProperty('--ck-space-10', '40px');
      try {
        const handle = await open({ mode: 'sheet' });
        const grab = handle.panel.querySelector<HTMLElement>('[data-ck-sheet-grab]')!;
        const firstButton = handle.panel.querySelector<HTMLElement>('.first')!;
        const grabRect = grab.getBoundingClientRect();
        const contentRect = firstButton.getBoundingClientRect();
        expect(grabRect.height).toBe(44);
        expect(contentRect.top).toBeGreaterThanOrEqual(grabRect.bottom);
        const corner = document.elementFromPoint(contentRect.right - 2, contentRect.top + 2);
        expect(corner).toBe(firstButton);
        expect(
          document
            .elementFromPoint(grabRect.right - 2, grabRect.top + 2)
            ?.closest('[data-ck-sheet-grab]'),
        ).toBe(grab);
      } finally {
        for (const name of ['--ck-target-min', '--ck-space-2', '--ck-space-1', '--ck-space-10']) {
          root.style.removeProperty(name);
        }
      }
    });

    it('has no grab area when it is not dismissible', async () => {
      const handle = await open({ mode: 'sheet', dismissible: false });
      expect(handle.panel.querySelector('[data-ck-sheet-grab]')).toBeNull();
    });

    it('has no axe violations', async () => {
      await open({ mode: 'sheet', ariaLabel: 'Sheet' });
      await expectNoAxeViolations(query('.cdk-overlay-container')!);
    });
  });

  describe('mode auto', () => {
    it('opens a sheet when CkMedia says sheet, at the moment of opening', async () => {
      const media = fakeMedia({ sheet: true });
      const first = host().open(Content, { mode: 'auto' });
      media.sheet.set(false);
      const second = host().open(Content, {});
      expect(first.mode).toBe('sheet');
      expect(second.mode).toBe('modal');
      await Promise.all([first.opened, second.opened]);
    });

    it('opens a modal when CkMedia says no sheet', async () => {
      fakeMedia({ sheet: false });
      const handle = host().open(Content, { mode: 'auto' });
      expect(handle.mode).toBe('modal');
      await handle.opened;
    });

    it('follows the real viewport: a narrow window alone (no coarse pointer) stays a modal', async () => {
      const original = { width: window.innerWidth, height: window.innerHeight };
      try {
        await page.viewport(390, 800);
        const media = TestBed.inject(CkMedia);
        expect(media.narrow()).toBe(true);
        expect(media.coarsePointer()).toBe(false);
        const handle = host().open(Content, { mode: 'auto' });
        await handle.opened;
        expect(handle.mode).toBe('modal');
        const rect = handle.panel.getBoundingClientRect();
        expect(rect.left).toBeGreaterThanOrEqual(0);
        expect(rect.right).toBeLessThanOrEqual(390);
        await handle.close();
        const sheet = host().open(Content, { mode: 'sheet' });
        await sheet.opened;
        expect(sheet.panel.getBoundingClientRect().width).toBe(390);
        expect(Math.round(sheet.panel.getBoundingClientRect().bottom)).toBe(800);
      } finally {
        await page.viewport(original.width, original.height);
      }
    });
  });

  describe('focus', () => {
    it('moves focus into the overlay and traps Tab', async () => {
      const handle = await open();
      const first = handle.panel.querySelector<HTMLElement>('.first')!;
      const last = handle.panel.querySelector<HTMLElement>('.last')!;
      expect(document.activeElement).toBe(first);
      last.focus();
      await userEvent.tab();
      expect(document.activeElement).toBe(first);
      await userEvent.tab({ shift: true });
      expect(document.activeElement).toBe(last);
    });

    it('gives focus back to the opener after close', async () => {
      const handle = await open();
      expect(document.activeElement).not.toBe(opener);
      await handle.close();
      expect(document.activeElement).toBe(opener);
    });

    it('restores focus before the close animation ends', async () => {
      const handle = await open();
      const closing = handle.close();
      expect(document.activeElement).toBe(opener);
      await closing;
    });

    it('does not throw and leaves focus alone when the opener is gone', async () => {
      const handle = await open();
      opener.remove();
      await expect(handle.close()).resolves.toBeUndefined();
      expect(document.activeElement).toBe(document.body);
    });

    it('moves focus to the remaining overlay when the opener can not take it back', async () => {
      const first = await open();
      first.panel.querySelector<HTMLElement>('.last')!.focus();
      const second = await open();
      second.panel.querySelector<HTMLElement>('.first')!.focus();
      first.panel.querySelector<HTMLElement>('.last')!.setAttribute('disabled', '');
      await second.close();
      expect(first.panel.contains(document.activeElement)).toBe(true);
    });

    it('does not take focus anywhere when the opener is disabled and no overlay remains', async () => {
      const handle = await open();
      opener.disabled = true;
      await handle.close();
      expect(document.activeElement).toBe(document.body);
    });

    it('ends on the page opener when the lower overlay closes first and then the upper one', async () => {
      const first = await open();
      const second = await open();
      await first.close();
      expect(second.panel.contains(document.activeElement)).toBe(true);
      await second.close();
      expect(document.activeElement).toBe(opener);
    });

    it('keeps the opener known although the background turns inert first', async () => {
      const handle = host().open(Content, { mode: 'modal' });
      expect(app.inert).toBe(true);
      await handle.opened;
      await handle.close();
      expect(document.activeElement).toBe(opener);
    });

    it('focuses the panel when the content has nothing focusable', async () => {
      const handle = await open({}, EmptyContent);
      expect(document.activeElement).toBe(handle.panel);
    });

    it('focuses the panel before the opening animation ends when nothing is focusable', async () => {
      const handle = host().open(EmptyContent, { mode: 'modal' });
      await wait(30);
      expect(handle.panel.getAnimations().length).toBeGreaterThan(0);
      expect(document.activeElement).toBe(handle.panel);
      await handle.close();
    });

    it('focuses the element config.initialFocus picks, and falls back when it picks nothing', async () => {
      const picked = await open({ initialFocus: () => query<HTMLElement>('.last') });
      expect(document.activeElement).toBe(query('.last'));
      await picked.close();
      const none = await open({ initialFocus: () => null });
      expect(document.activeElement).toBe(query('.first'));
      await none.close();
    });

    it('does not move focus after an overlay closed before it finished opening', async () => {
      const handle = host().open(Content, { mode: 'modal' });
      const closing = handle.close();
      await handle.opened;
      await closing;
      expect(document.activeElement).toBe(opener);
    });
  });

  describe('scroll lock', () => {
    it('blocks the page scroll while open and releases it on close', async () => {
      const tall = document.createElement('div');
      tall.style.height = '4000px';
      document.body.append(tall);
      const html = document.documentElement;
      const handle = await open();
      expect(html.classList.contains('cdk-global-scrollblock')).toBe(true);
      await handle.close();
      expect(html.classList.contains('cdk-global-scrollblock')).toBe(false);
    });

    it('keeps the lock until the last of two overlays is gone', async () => {
      const tall = document.createElement('div');
      tall.style.height = '4000px';
      document.body.append(tall);
      const html = document.documentElement;
      const first = await open();
      const second = await open();
      await first.close();
      expect(html.classList.contains('cdk-global-scrollblock')).toBe(true);
      await second.close();
      expect(html.classList.contains('cdk-global-scrollblock')).toBe(false);
    });
  });

  describe('inert', () => {
    it('makes the app inert but not the overlay, exempt elements or the live announcer', async () => {
      const announcer = document.createElement('div');
      announcer.className = 'cdk-live-announcer-element';
      document.body.append(announcer);
      const handle = await open();
      expect(app.inert).toBe(true);
      expect(query<HTMLElement>('#toasts')!.inert).toBe(false);
      expect(announcer.inert).toBe(false);
      expect(query<HTMLElement>('.cdk-overlay-container')!.inert).toBe(false);
      expect(handle.panel.closest('[inert]')).toBeNull();
      await handle.close();
      expect(app.hasAttribute('inert')).toBe(false);
    });

    it('keeps exempt elements clickable while an overlay is open', async () => {
      query<HTMLElement>('#toasts')!.style.cssText =
        'position: fixed; z-index: 1100; inset-block-end: 0';
      await open();
      const clicks = vi.fn();
      const button = query<HTMLButtonElement>('#toast-button')!;
      button.addEventListener('click', clicks);
      await userEvent.click(button);
      expect(clicks).toHaveBeenCalledOnce();
    });

    it('gives back an inert attribute the app had set', async () => {
      app.setAttribute('inert', '');
      const handle = await open();
      expect(app.inert).toBe(true);
      await handle.close();
      expect(app.hasAttribute('inert')).toBe(true);
    });

    it('is reference counted: closing the top of two overlays leaves the first one modal', async () => {
      const first = await open();
      const second = await open();
      expect(first.panel.closest('.cdk-global-overlay-wrapper')!.hasAttribute('inert')).toBe(true);
      expect(second.panel.closest('.cdk-global-overlay-wrapper')!.hasAttribute('inert')).toBe(
        false,
      );
      await second.close();
      expect(app.inert).toBe(true);
      expect(first.panel.closest('.cdk-global-overlay-wrapper')!.hasAttribute('inert')).toBe(false);
      await first.close();
      expect(app.hasAttribute('inert')).toBe(false);
    });

    it('keeps the app inert when the lower overlay closes first', async () => {
      const first = await open();
      const second = await open();
      await first.close();
      expect(app.inert).toBe(true);
      await second.close();
      expect(app.hasAttribute('inert')).toBe(false);
    });

    it('gives focus back to the lower overlay when the upper one closes', async () => {
      const first = await open();
      const firstButton = first.panel.querySelector<HTMLElement>('.last')!;
      firstButton.focus();
      const second = await open();
      expect(first.panel.contains(document.activeElement)).toBe(false);
      await second.close();
      expect(document.activeElement).toBe(firstButton);
    });
  });

  describe('dismissal', () => {
    it('closes on Escape', async () => {
      const handle = await open();
      const event = press('Escape');
      expect(event.defaultPrevented).toBe(true);
      await handle.closed;
      expect(query('.cdk-overlay-pane')).toBeNull();
    });

    it('closes only the topmost overlay per Escape', async () => {
      const first = await open();
      const second = await open();
      press('Escape');
      await second.closed;
      expect(query('.cdk-overlay-pane')).toBe(first.panel);
      press('Escape');
      await first.closed;
      expect(query('.cdk-overlay-pane')).toBeNull();
    });

    it('does nothing on Escape when the topmost overlay is not dismissible, and does not reach the one below', async () => {
      const first = await open();
      const second = await open({ dismissible: false });
      const event = press('Escape');
      await wait(300);
      expect(event.defaultPrevented).toBe(false);
      expect(query('.cdk-overlay-pane')).not.toBeNull();
      expect(document.querySelectorAll('.cdk-overlay-pane')).toHaveLength(2);
      await second.close();
      press('Escape');
      await first.closed;
    });

    it('ignores other keys, a handled Escape and Escape without an overlay', async () => {
      press('Escape');
      const handle = await open();
      press('Enter');
      press('Esc');
      const handled = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      document.body.addEventListener('keydown', (event) => event.preventDefault(), { once: true });
      document.body.dispatchEvent(handled);
      await wait(300);
      expect(document.querySelectorAll('.cdk-overlay-pane')).toHaveLength(1);
      await handle.close();
    });

    it('stops listening once the last overlay is gone', async () => {
      const handle = await open();
      await handle.close();
      const event = press('Escape');
      expect(event.defaultPrevented).toBe(false);
    });

    it('closes on a backdrop click and not on a click inside the panel', async () => {
      const handle = await open();
      handle.panel.querySelector<HTMLElement>('.first')!.click();
      handle.panel.click();
      await wait(300);
      expect(document.querySelectorAll('.cdk-overlay-pane')).toHaveLength(1);
      query<HTMLElement>('.ck-overlay-backdrop')!.click();
      await handle.closed;
      expect(query('.cdk-overlay-pane')).toBeNull();
    });

    it('ignores the backdrop when not dismissible', async () => {
      const handle = await open({ dismissible: false });
      query<HTMLElement>('.ck-overlay-backdrop')!.click();
      await wait(300);
      expect(query('.cdk-overlay-pane')).not.toBeNull();
      await handle.close();
    });

    it('asks onDismissRequest instead of closing when it is given, with the reason', async () => {
      const requests: string[] = [];
      const handle = await open({ onDismissRequest: (reason) => requests.push(reason) });
      press('Escape');
      query<HTMLElement>('.ck-overlay-backdrop')!.click();
      await wait(300);
      expect(requests).toEqual(['escape', 'backdrop']);
      expect(query('.cdk-overlay-pane')).not.toBeNull();
      await handle.close();
    });

    it('does not ask about dismissal for an overlay that is already closing', async () => {
      const requests: string[] = [];
      const handle = await open({ onDismissRequest: (reason) => requests.push(reason) });
      const closing = handle.close();
      press('Escape');
      await closing;
      expect(requests).toEqual([]);
    });
  });

  describe('swipe', () => {
    function pointer(type: string, target: EventTarget, clientY: number): void {
      target.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 7,
          isPrimary: true,
          button: 0,
          clientX: 100,
          clientY,
          bubbles: true,
          cancelable: true,
        }),
      );
    }

    async function openSheet(config: CkOverlayConfig = {}) {
      const handle = await open({ mode: 'sheet', ...config });
      handle.panel.querySelector<HTMLElement>('.first')!.style.height = '300px';
      const grab = handle.panel.querySelector<HTMLElement>('[data-ck-sheet-grab]')!;
      const height = handle.panel.getBoundingClientRect().height;
      return { handle, grab, height };
    }

    it('closes after a drag with a real pointer and captures it', async () => {
      const capture = vi.spyOn(HTMLElement.prototype, 'setPointerCapture');
      document.documentElement.style.setProperty('--ck-target-min', '44px');
      const { handle, grab } = await openSheet();
      await userEvent.dragAndDrop(grab, handle.panel, {
        sourcePosition: { x: 40, y: 10 },
        targetPosition: { x: 40, y: 250 },
      });
      await handle.closed;
      expect(capture).toHaveBeenCalled();
      expect(query('.cdk-overlay-pane')).toBeNull();
    });

    it('follows the finger and closes after a drag of more than a third of the height', async () => {
      const { handle, grab, height } = await openSheet();
      vi.useFakeTimers({ toFake: ['performance'] });
      pointer('pointerdown', grab, 100);
      vi.advanceTimersByTime(300);
      pointer('pointermove', document, 100 + height * 0.2);
      expect(handle.panel.style.transform).toBe(`translateY(${height * 0.2}px)`);
      vi.advanceTimersByTime(300);
      pointer('pointermove', document, 100 + height * 0.5);
      vi.advanceTimersByTime(300);
      pointer('pointerup', document, 100 + height * 0.5);
      vi.useRealTimers();
      await handle.closed;
      expect(query('.cdk-overlay-pane')).toBeNull();
    });

    it('snaps back after a slow drag of less than a third', async () => {
      const { handle, grab, height } = await openSheet();
      vi.useFakeTimers({ toFake: ['performance'] });
      pointer('pointerdown', grab, 100);
      vi.advanceTimersByTime(500);
      pointer('pointermove', document, 100 + height * 0.3);
      vi.advanceTimersByTime(500);
      pointer('pointerup', document, 100 + height * 0.3);
      vi.useRealTimers();
      expect(handle.panel.style.transform).toBe('');
      await wait(300);
      expect(query('.cdk-overlay-pane')).not.toBeNull();
      await handle.close();
    });

    it('closes after a fast flick that stays under a third', async () => {
      const { handle, grab, height } = await openSheet();
      pointer('pointerdown', grab, 100);
      pointer('pointermove', document, 100 + Math.min(40, height * 0.25));
      pointer('pointerup', document, 100 + Math.min(40, height * 0.25));
      await handle.closed;
      expect(query('.cdk-overlay-pane')).toBeNull();
    });

    it('ignores a tiny fast twitch', async () => {
      const { handle, grab } = await openSheet();
      pointer('pointerdown', grab, 100);
      pointer('pointermove', document, 105);
      pointer('pointerup', document, 105);
      await wait(300);
      expect(query('.cdk-overlay-pane')).not.toBeNull();
      await handle.close();
    });

    it('never moves the sheet up', async () => {
      const { handle, grab } = await openSheet();
      pointer('pointerdown', grab, 100);
      pointer('pointermove', document, 40);
      expect(handle.panel.style.transform).toBe('translateY(0px)');
      pointer('pointerup', document, 40);
      await wait(300);
      expect(query('.cdk-overlay-pane')).not.toBeNull();
      await handle.close();
    });

    it('does not start from the content, only from the grab area', async () => {
      const { handle, height } = await openSheet();
      pointer('pointerdown', handle.panel.querySelector('.first')!, 100);
      pointer('pointermove', document, 100 + height);
      pointer('pointerup', document, 100 + height);
      await wait(300);
      expect(query('.cdk-overlay-pane')).not.toBeNull();
      await handle.close();
    });

    it('snaps back when the dismiss request is not answered with a close', async () => {
      const requests: string[] = [];
      const { handle, grab, height } = await openSheet({
        onDismissRequest: (reason) => requests.push(reason),
      });
      pointer('pointerdown', grab, 100);
      pointer('pointermove', document, 100 + height);
      pointer('pointerup', document, 100 + height);
      expect(requests).toEqual(['swipe']);
      expect(handle.panel.style.transform).toBe('');
      await handle.close();
    });

    it('snaps back on pointercancel and ignores another pointer', async () => {
      const { handle, grab, height } = await openSheet();
      pointer('pointerdown', grab, 100);
      pointer('pointermove', document, 100 + height * 0.2);
      document.dispatchEvent(
        new PointerEvent('pointermove', { pointerId: 9, clientY: 100 + height, bubbles: true }),
      );
      expect(handle.panel.style.transform).toBe(`translateY(${height * 0.2}px)`);
      pointer('pointercancel', document, 100 + height * 0.2);
      expect(handle.panel.style.transform).toBe('');
      await wait(300);
      expect(query('.cdk-overlay-pane')).not.toBeNull();
      await handle.close();
    });
  });

  describe('animation', () => {
    it('waits for the close animation before detaching', async () => {
      const handle = await open();
      const closing = handle.close();
      expect(query('.cdk-overlay-pane')).not.toBeNull();
      expect(handle.panel.getAnimations().length).toBeGreaterThan(0);
      await closing;
      expect(query('.cdk-overlay-pane')).toBeNull();
    });

    it('returns the same promise for repeated close calls and resolves closed', async () => {
      const handle = await open();
      const first = handle.close();
      expect(handle.close()).toBe(first);
      await first;
      await expect(handle.closed).resolves.toBeUndefined();
      await expect(handle.close()).resolves.toBeUndefined();
    });

    it('is instant under reduced motion', async () => {
      fakeMedia({ reducedMotion: true });
      const handle = host().open(Content, { mode: 'modal' });
      expect(handle.panel.getAnimations()).toHaveLength(0);
      await handle.opened;
      const started = performance.now();
      await handle.close();
      expect(handle.panel.getAnimations()).toHaveLength(0);
      expect(performance.now() - started).toBeLessThan(100);
      expect(query('.cdk-overlay-pane')).toBeNull();
    });

    it('lets a second overlay open while the first is still closing', async () => {
      const first = await open();
      const firstClosing = first.close();
      const second = host().open(Content, { mode: 'modal' });
      expect(document.querySelectorAll('.cdk-overlay-pane')).toHaveLength(2);
      await firstClosing;
      expect(document.querySelectorAll('.cdk-overlay-pane')).toHaveLength(1);
      await second.opened;
      expect(app.inert).toBe(true);
      expect(second.panel.contains(document.activeElement)).toBe(true);
      press('Escape');
      await second.closed;
      expect(app.hasAttribute('inert')).toBe(false);
      expect(document.activeElement).toBe(opener);
    });

    it('keeps the scroll lock across a close and an immediate reopen', async () => {
      const tall = document.createElement('div');
      tall.style.height = '4000px';
      document.body.append(tall);
      const html = document.documentElement;
      const first = await open();
      const closing = first.close();
      const second = host().open(Content, { mode: 'modal' });
      await closing;
      expect(html.classList.contains('cdk-global-scrollblock')).toBe(true);
      await second.close();
      expect(html.classList.contains('cdk-global-scrollblock')).toBe(false);
    });

    it('can close an overlay before its opening animation ends', async () => {
      const handle = host().open(Content, { mode: 'sheet' });
      await handle.close();
      expect(query('.cdk-overlay-pane')).toBeNull();
      expect(app.hasAttribute('inert')).toBe(false);
    });
  });

  describe('lifecycle', () => {
    it('tears everything down when the injector is destroyed', async () => {
      const first = await open();
      const second = await open({ mode: 'sheet' });
      const sibling = document.createElement('div');
      document.body.append(sibling);
      TestBed.resetTestingModule();
      await expect(Promise.all([first.closed, second.closed])).resolves.toBeDefined();
      expect(query('.cdk-overlay-pane')).toBeNull();
      for (const element of [app, sibling, query('#toasts')!]) {
        expect(element.hasAttribute('inert')).toBe(false);
      }
      expect(document.querySelector('.cdk-focus-trap-anchor')).toBeNull();
      expect(document.activeElement).toBe(opener);
      expect(document.documentElement.classList.contains('cdk-global-scrollblock')).toBe(false);
      expect(() => press('Escape')).not.toThrow();
    });

    it('renders nothing on the server and reports the overlay as closed', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
      const handle = host().open(Content, { mode: 'sheet' });
      expect(handle.mode).toBe('sheet');
      await handle.opened;
      await handle.close();
      await handle.closed;
      expect(query('.cdk-overlay-pane')).toBeNull();
      expect(app.hasAttribute('inert')).toBe(false);
    });
  });
});
