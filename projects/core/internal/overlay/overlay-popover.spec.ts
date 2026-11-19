import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { page } from 'vitest/browser';
import { CkMedia } from '@ckui/core/internal';
import { expectNoAxeViolations } from '../../testing/axe';
import { CkOverlayConfig, CkOverlayDismissReason, CkOverlayHost } from './overlay-host';

@Component({
  selector: 'ck-test-popover-content',
  template: `
    <button type="button" class="first">First</button>
    <button type="button" class="last">Last</button>
  `,
})
class Content {}

@Component({
  selector: 'ck-test-popover-medium',
  template: `<div style="inline-size: 200px; block-size: 40px">
    <button type="button" class="first">Medium</button>
  </div>`,
})
class MediumContent {}

@Component({
  selector: 'ck-test-popover-wide',
  template: `<div style="inline-size: 700px; block-size: 40px">
    <button type="button" class="first">Wide</button>
  </div>`,
})
class WideContent {}

@Component({
  selector: 'ck-test-popover-tall',
  host: { style: 'display: flex; flex-direction: column; min-block-size: 0' },
  template: `<div class="list" style="flex: 1 1 auto; min-block-size: 0; overflow: auto">
    <div style="block-size: 2000px"><button type="button" class="first">Tall</button></div>
  </div>`,
})
class TallContent {}

@Component({
  selector: 'ck-test-popover-grow',
  template: `<div [style.block-size.px]="height()">
    <button type="button" class="first">Grow</button>
  </div>`,
})
class GrowContent {
  static last: GrowContent | null = null;
  readonly height = signal(40);
  constructor() {
    GrowContent.last = this;
  }
}

@Component({ selector: 'ck-test-popover-empty', template: `<p>Nothing to focus</p>` })
class EmptyContent {}

type ContentType =
  | typeof Content
  | typeof MediumContent
  | typeof WideContent
  | typeof TallContent
  | typeof GrowContent
  | typeof EmptyContent;

const VIEWPORT = { width: 800, height: 600 };
const GAP = 4;
const MARGIN = 8;

function fakeMedia(options: { sheet?: boolean; reducedMotion?: boolean } = {}) {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: CkMedia,
        useValue: {
          sheet: signal(options.sheet ?? false),
          reducedMotion: signal(options.reducedMotion ?? false),
          narrow: signal(false),
          coarsePointer: signal(false),
        },
      },
    ],
  });
}

describe('CkOverlayHost popover', () => {
  let app: HTMLElement;
  let anchor: HTMLButtonElement;

  function place(element: HTMLElement, box: Record<string, string>): void {
    element.style.cssText = `position: fixed; ${Object.entries(box)
      .map(([name, value]) => `${name}: ${value}`)
      .join('; ')}`;
  }

  beforeEach(() => {
    document.body.innerHTML = `<div id="app"><button id="anchor" type="button">Anchor</button><button id="other" type="button">Other</button><p id="plain">Plain</p></div>`;
    app = document.querySelector<HTMLElement>('#app')!;
    anchor = document.querySelector<HTMLButtonElement>('#anchor')!;
    place(anchor, { left: '100px', top: '100px', width: '120px', height: '30px' });
    place(other(), { left: '600px', top: '300px', width: '80px', height: '30px' });
    anchor.focus();
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    document.body.replaceChildren();
    document.documentElement.removeAttribute('style');
    document.documentElement.classList.remove('cdk-global-scrollblock');
    window.scrollTo(0, 0);
    if (window.innerWidth !== VIEWPORT.width || window.innerHeight !== VIEWPORT.height) {
      await page.viewport(VIEWPORT.width, VIEWPORT.height);
    }
  });

  const host = () => TestBed.inject(CkOverlayHost);
  const other = () => document.querySelector<HTMLButtonElement>('#other')!;
  const wait = (milliseconds: number) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));
  const rect = (element: Element) => element.getBoundingClientRect();

  async function open(config: CkOverlayConfig = {}, content: ContentType = Content) {
    const dismissed = vi.fn<(reason: CkOverlayDismissReason) => void>();
    const handle = host().open(content, {
      mode: 'popover',
      anchor,
      onDismissRequest: dismissed,
      ...config,
    });
    await handle.opened;
    return { handle, dismissed };
  }

  const closesSoon = (handle: { closed: Promise<void> }) =>
    Promise.race([handle.closed.then(() => true), wait(1000).then(() => false)]);

  function press(key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    (document.activeElement ?? document.body).dispatchEvent(event);
    return event;
  }

  function pointerdown(target: Element): void {
    target.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, composed: true, cancelable: true }),
    );
  }

  describe('position', () => {
    it('opens below the anchor, aligned to its start, with a small gap', async () => {
      const { handle } = await open();
      expect(handle.mode).toBe('popover');
      const panel = rect(handle.panel);
      const anchorRect = rect(anchor);
      expect(Math.abs(panel.left - anchorRect.left)).toBeLessThan(1.5);
      expect(Math.abs(panel.top - (anchorRect.bottom + GAP))).toBeLessThan(1.5);
    });

    it('flips above when there is no room below', async () => {
      place(anchor, { left: '100px', top: '560px', width: '120px', height: '30px' });
      const { handle } = await open({}, WideContent);
      const panel = rect(handle.panel);
      expect(panel.bottom).toBeLessThanOrEqual(rect(anchor).top - GAP + 1.5);
      expect(panel.bottom).toBeGreaterThan(rect(anchor).top - GAP - 1.5);
    });

    it('is end-aligned to the anchor in a right-to-left page', async () => {
      const wrapper = document.createElement('div');
      wrapper.dir = 'rtl';
      wrapper.append(anchor);
      app.append(wrapper);
      place(anchor, { left: '400px', top: '100px', width: '120px', height: '30px' });
      const { handle } = await open({}, MediumContent);
      const panel = rect(handle.panel);
      const anchorRect = rect(anchor);
      expect(Math.abs(panel.right - anchorRect.right)).toBeLessThan(1.5);
      expect(panel.left).toBeLessThan(anchorRect.left);
      expect(handle.panel.closest('[dir]')?.getAttribute('dir')).toBe('rtl');
    });

    it('is start-aligned to the anchor in a left-to-right page', async () => {
      place(anchor, { left: '400px', top: '100px', width: '120px', height: '30px' });
      const { handle } = await open();
      expect(Math.abs(rect(handle.panel).left - 400)).toBeLessThan(1.5);
      expect(handle.panel.closest('[dir]')?.getAttribute('dir')).toBe('ltr');
    });

    it('moves to the end edge when the start edge would run off the screen', async () => {
      place(anchor, { left: '700px', top: '100px', width: '80px', height: '30px' });
      const { handle } = await open({}, MediumContent);
      const panel = rect(handle.panel);
      expect(panel.right).toBeLessThanOrEqual(VIEWPORT.width - MARGIN + 1);
      expect(Math.abs(panel.right - rect(anchor).right)).toBeLessThan(1.5);
    });

    it('pushes a panel that fits on neither side back onto the screen', async () => {
      place(anchor, { left: '300px', top: '100px', width: '50px', height: '30px' });
      const { handle } = await open({}, WideContent);
      const panel = rect(handle.panel);
      expect(panel.width).toBeGreaterThanOrEqual(699);
      expect(panel.left).toBeGreaterThanOrEqual(MARGIN - 1);
      expect(panel.right).toBeLessThanOrEqual(VIEWPORT.width - MARGIN + 1);
    });

    it('is at least as wide as the anchor with matchAnchorWidth, and only then', async () => {
      place(anchor, { left: '100px', top: '100px', width: '240px', height: '30px' });
      const wide = await open({ matchAnchorWidth: true });
      expect(rect(wide.handle.panel).width).toBeGreaterThanOrEqual(240);
      await wide.handle.close();
      const plain = await open();
      expect(rect(plain.handle.panel).width).toBeLessThan(240);
    });

    it('never asks for more width than the viewport leaves, for an anchor as wide as the page', async () => {
      place(anchor, { left: '0px', top: '100px', width: '800px', height: '30px' });
      const { handle } = await open({ matchAnchorWidth: true });
      const box = rect(handle.panel);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(VIEWPORT.width);
      expect(box.width).toBeGreaterThanOrEqual(VIEWPORT.width - 2 * MARGIN - 1);
    });

    it('follows the anchor width on reposition()', async () => {
      const { handle } = await open({ matchAnchorWidth: true });
      expect(rect(handle.panel).width).toBeGreaterThanOrEqual(120);
      anchor.style.width = '320px';
      handle.reposition();
      expect(rect(handle.panel).width).toBeGreaterThanOrEqual(320);
    });

    it('limits the height to the space left and lets the content scroll', async () => {
      place(anchor, { left: '100px', top: '280px', width: '120px', height: '30px' });
      const { handle } = await open({}, TallContent);
      const panel = rect(handle.panel);
      expect(panel.top).toBeGreaterThanOrEqual(0);
      // The gap is a transform on the panel, outside the box the margin limits.
      expect(panel.bottom).toBeLessThanOrEqual(VIEWPORT.height - MARGIN + GAP + 1);
      expect(panel.height).toBeLessThan(VIEWPORT.height);
      const list = handle.panel.querySelector<HTMLElement>('.list')!;
      expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
      list.scrollTop = 300;
      expect(list.scrollTop).toBeGreaterThan(0);
    });

    it('places the panel again, above or below, after the content grew', async () => {
      place(anchor, { left: '100px', top: '400px', width: '120px', height: '30px' });
      const { handle } = await open({}, GrowContent);
      expect(rect(handle.panel).top).toBeGreaterThanOrEqual(rect(anchor).bottom);
      GrowContent.last!.height.set(300);
      await wait(20);
      handle.reposition();
      expect(rect(handle.panel).bottom).toBeLessThanOrEqual(rect(anchor).top);
    });

    it('follows the anchor when a nested scroll container moves it', async () => {
      const scroller = document.createElement('div');
      place(scroller, { left: '50px', top: '50px', width: '400px', height: '300px' });
      scroller.style.overflow = 'auto';
      const filler = document.createElement('div');
      filler.style.height = '1200px';
      anchor.style.position = 'relative';
      anchor.style.cssText = 'position: relative; top: 20px; width: 120px; height: 30px';
      filler.append(anchor);
      scroller.append(filler);
      app.append(scroller);
      const { handle } = await open();
      const before = rect(handle.panel).top;
      scroller.scrollTop = 15;
      await vi.waitFor(() => expect(rect(handle.panel).top).toBeCloseTo(before - 15, 0));
    });

    it('is placed again when the window is resized', async () => {
      place(anchor, { right: '10px', top: '100px', width: '120px', height: '30px' });
      const { handle } = await open();
      const before = rect(handle.panel).right;
      await page.viewport(500, VIEWPORT.height);
      await vi.waitFor(() => expect(rect(handle.panel).right).toBeLessThan(before - 200));
      expect(rect(handle.panel).right).toBeLessThanOrEqual(500 - 10 + 1.5);
    });
  });

  describe('dismissal', () => {
    it('asks to close on Escape', async () => {
      const { dismissed } = await open();
      const event = press('Escape');
      expect(dismissed).toHaveBeenCalledExactlyOnceWith('escape');
      expect(event.defaultPrevented).toBe(true);
    });

    it('closes itself on Escape without an onDismissRequest', async () => {
      const handle = host().open(Content, { mode: 'popover', anchor });
      await handle.opened;
      press('Escape');
      expect(await closesSoon(handle)).toBe(true);
    });

    it('asks to close on a press outside the panel and the anchor', async () => {
      const { dismissed } = await open();
      pointerdown(document.querySelector('#plain')!);
      expect(dismissed).toHaveBeenCalledExactlyOnceWith('outside');
    });

    it('leaves a press on the anchor to the consumer', async () => {
      const { dismissed } = await open();
      pointerdown(anchor);
      expect(dismissed).not.toHaveBeenCalled();
    });

    it('ignores a press inside the panel', async () => {
      const { handle, dismissed } = await open();
      pointerdown(handle.panel.querySelector('.last')!);
      pointerdown(handle.panel);
      expect(dismissed).not.toHaveBeenCalled();
    });

    it('ignores a press that starts in a child of the anchor', async () => {
      const inner = document.createElement('span');
      anchor.append(inner);
      const { dismissed } = await open();
      pointerdown(inner);
      expect(dismissed).not.toHaveBeenCalled();
    });

    it('asks to close when focus moves to an element outside', async () => {
      const { dismissed } = await open();
      other().focus();
      expect(dismissed).toHaveBeenCalledExactlyOnceWith('focusout');
    });

    it('ignores focus moving inside the panel or back to the anchor', async () => {
      const { handle, dismissed } = await open();
      handle.panel.querySelector<HTMLElement>('.last')!.focus();
      anchor.focus();
      expect(dismissed).not.toHaveBeenCalled();
    });

    it('ignores focus that falls to the page itself', async () => {
      const { dismissed } = await open();
      document.body.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      document.documentElement.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      (document.activeElement as HTMLElement).blur();
      expect(dismissed).not.toHaveBeenCalled();
    });

    it('closes for real on a press outside and moves nothing else', async () => {
      const handle = host().open(Content, { mode: 'popover', anchor });
      await handle.opened;
      pointerdown(document.querySelector('#plain')!);
      expect(await closesSoon(handle)).toBe(true);
      expect(document.querySelector('.cdk-overlay-pane')).toBeNull();
    });

    it('asks to close with detached when the anchor scrolls out of its container', async () => {
      const scroller = document.createElement('div');
      place(scroller, { left: '50px', top: '50px', width: '300px', height: '100px' });
      scroller.style.overflow = 'auto';
      const filler = document.createElement('div');
      filler.style.height = '1500px';
      anchor.style.cssText = 'width: 120px; height: 30px';
      filler.append(anchor);
      scroller.append(filler);
      app.append(scroller);
      const { dismissed } = await open();
      expect(dismissed).not.toHaveBeenCalled();
      scroller.scrollTop = 800;
      await vi.waitFor(() => expect(dismissed).toHaveBeenCalledWith('detached'));
    });

    it('asks to close with detached when the anchor is removed from the page', async () => {
      const { dismissed } = await open();
      anchor.remove();
      await vi.waitFor(() => expect(dismissed).toHaveBeenCalledWith('detached'));
    });

    it('asks to close with detached when the anchor becomes hidden', async () => {
      const { dismissed } = await open();
      anchor.hidden = true;
      anchor.style.display = 'none';
      await vi.waitFor(() => expect(dismissed).toHaveBeenCalledWith('detached'));
    });

    it('closes a popover whose anchor was removed, without an onDismissRequest', async () => {
      const handle = host().open(Content, { mode: 'popover', anchor });
      await handle.opened;
      anchor.remove();
      expect(await closesSoon(handle)).toBe(true);
    });

    it('ignores every dismissal when it is not dismissible', async () => {
      const { handle, dismissed } = await open({ dismissible: false });
      press('Escape');
      pointerdown(document.querySelector('#plain')!);
      other().focus();
      anchor.remove();
      await wait(150);
      expect(dismissed).not.toHaveBeenCalled();
      expect(handle.panel.isConnected).toBe(true);
      expect(handle.panel.hasAttribute('inert')).toBe(false);
    });

    it('lets only the topmost of two popovers handle Escape', async () => {
      const first = await open();
      const second = await open({ anchor: other() });
      press('Escape');
      expect(second.dismissed).toHaveBeenCalledExactlyOnceWith('escape');
      expect(first.dismissed).not.toHaveBeenCalled();
    });

    it('does nothing after it was closed', async () => {
      const { handle, dismissed } = await open();
      await handle.close();
      press('Escape');
      pointerdown(document.querySelector('#plain')!);
      other().focus();
      anchor.remove();
      await wait(100);
      expect(dismissed).not.toHaveBeenCalled();
    });
  });

  describe('accessibility and focus', () => {
    it('has no role and no aria-modal by default, whatever the labels', async () => {
      const { handle } = await open({ ariaLabel: 'Choices' });
      expect(handle.panel.hasAttribute('role')).toBe(false);
      expect(handle.panel.hasAttribute('aria-modal')).toBe(false);
      expect(handle.panel.getAttribute('aria-label')).toBe('Choices');
    });

    it('sets a role when asked but never aria-modal', async () => {
      const { handle } = await open({ role: 'dialog' });
      expect(handle.panel.getAttribute('role')).toBe('dialog');
      expect(handle.panel.hasAttribute('aria-modal')).toBe(false);
    });

    it('has no role and no aria-modal for a modal asking for none, and the usual ones otherwise', async () => {
      const none = host().open(Content, { mode: 'modal', role: 'none' });
      await none.opened;
      expect(none.panel.hasAttribute('role')).toBe(false);
      expect(none.panel.hasAttribute('aria-modal')).toBe(false);
      await none.close();
      const usual = host().open(Content, { mode: 'modal' });
      await usual.opened;
      expect(usual.panel.getAttribute('role')).toBe('dialog');
      expect(usual.panel.getAttribute('aria-modal')).toBe('true');
    });

    it('has no axe violations', async () => {
      await open({ ariaLabel: 'Choices' });
      await expectNoAxeViolations(document.querySelector('.cdk-overlay-container')!);
    });

    it('moves focus to the first tabbable element by default', async () => {
      const { handle } = await open();
      expect(document.activeElement).toBe(handle.panel.querySelector('.first'));
    });

    it('moves focus to initialFocus when given', async () => {
      const { handle } = await open({
        initialFocus: () => document.querySelector<HTMLElement>('.cdk-overlay-pane .last'),
      });
      expect(document.activeElement).toBe(handle.panel.querySelector('.last'));
    });

    it('focuses the panel itself when nothing inside can take focus', async () => {
      const { handle } = await open({}, EmptyContent);
      expect(document.activeElement).toBe(handle.panel);
    });

    it('leaves focus on the anchor with autoFocus false, also after a click in the panel', async () => {
      const { handle } = await open({ autoFocus: false });
      expect(document.activeElement).toBe(anchor);
      expect(handle.panel.hasAttribute('tabindex')).toBe(false);
    });

    it('returns focus to the anchor when it was inside the panel', async () => {
      const { handle } = await open();
      expect(handle.panel.contains(document.activeElement)).toBe(true);
      const closing = handle.close();
      expect(document.activeElement).toBe(anchor);
      await closing;
    });

    it('leaves the focus the user moved elsewhere alone', async () => {
      const { handle } = await open();
      other().focus();
      await handle.close();
      expect(document.activeElement).toBe(other());
    });

    it('leaves focus on the anchor with autoFocus false after close', async () => {
      const { handle } = await open({ autoFocus: false });
      await handle.close();
      expect(document.activeElement).toBe(anchor);
    });

    it('falls back to the element focused before when the anchor cannot take focus', async () => {
      other().focus();
      const { handle } = await open();
      anchor.disabled = true;
      handle.close();
      expect(document.activeElement).toBe(other());
    });

    it('does not let focus fall to the page when the anchor is gone but the opener is not', async () => {
      other().focus();
      const { handle } = await open();
      expect(handle.panel.contains(document.activeElement)).toBe(true);
      anchor.remove();
      await handle.close();
      expect(document.activeElement).toBe(other());
    });
  });

  describe('motion', () => {
    it('fades in, and not at all with reduced motion', async () => {
      const animated = host().open(Content, { mode: 'popover', anchor });
      const pane = animated.panel.querySelector<HTMLElement>('.ck-overlay-pane')!;
      expect(pane.getAnimations().length).toBe(1);
      await animated.opened;
      await animated.close();
      TestBed.resetTestingModule();
      fakeMedia({ reducedMotion: true });
      const still = host().open(Content, { mode: 'popover', anchor });
      expect(still.panel.querySelector('.ck-overlay-pane')!.getAnimations().length).toBe(0);
      await still.opened;
      const started = performance.now();
      await still.close();
      expect(performance.now() - started).toBeLessThan(100);
    });
  });

  describe('not modal', () => {
    it('has no backdrop, no inert background, no scroll lock and no focus trap', async () => {
      const tall = document.createElement('div');
      tall.style.height = '4000px';
      document.body.append(tall);
      const { handle } = await open();
      expect(document.querySelector('.ck-overlay-backdrop')).toBeNull();
      expect(app.hasAttribute('inert')).toBe(false);
      expect(document.documentElement.classList.contains('cdk-global-scrollblock')).toBe(false);
      expect(document.querySelector('.cdk-focus-trap-anchor')).toBeNull();
      expect(handle.panel.classList.contains('ck-overlay--popover')).toBe(true);
      const point = rect(handle.panel);
      const hit = document.elementFromPoint(point.left + 2, point.top + 2);
      expect(handle.panel.contains(hit)).toBe(true);
      expect(document.elementFromPoint(5, 500)?.closest('.cdk-overlay-container')).toBeNull();
    });

    it('lets the page behind stay reachable by pointer and keyboard', async () => {
      await open({ autoFocus: false });
      other().focus();
      expect(document.activeElement).toBe(other());
    });
  });

  describe('in a modal overlay', () => {
    async function dialogWithPopover(config: CkOverlayConfig = {}) {
      const dialogDismissed = vi.fn();
      const dialog = host().open(Content, { mode: 'modal', onDismissRequest: dialogDismissed });
      await dialog.opened;
      const dialogAnchor = dialog.panel.querySelector<HTMLElement>('.last')!;
      const popover = host().open(WideContent, {
        mode: 'popover',
        anchor: dialogAnchor,
        onDismissRequest: undefined,
        ...config,
      });
      await popover.opened;
      return { dialog, popover, dialogAnchor, dialogDismissed };
    }

    it('takes focus although the dialog traps it, and neither is inert', async () => {
      const { dialog, popover } = await dialogWithPopover();
      expect(popover.panel.contains(document.activeElement)).toBe(true);
      popover.panel.querySelector<HTMLElement>('.first')!.focus();
      await wait(50);
      expect(popover.panel.contains(document.activeElement)).toBe(true);
      expect(dialog.panel.closest('[inert]')).toBeNull();
      expect(popover.panel.closest('[inert]')).toBeNull();
      expect(dialog.panel.isConnected).toBe(true);
    });

    it('sits above the dialog', async () => {
      const { dialog, popover } = await dialogWithPopover();
      const box = rect(popover.panel);
      const hit = document.elementFromPoint(box.left + 5, box.top + 5);
      expect(popover.panel.contains(hit)).toBe(true);
      expect(dialog.panel.contains(hit)).toBe(false);
    });

    it('closes alone on Escape, and focus returns to its anchor in the dialog', async () => {
      const { dialog, popover, dialogAnchor, dialogDismissed } = await dialogWithPopover();
      press('Escape');
      expect(await closesSoon(popover)).toBe(true);
      expect(dialogDismissed).not.toHaveBeenCalled();
      expect(dialog.panel.isConnected).toBe(true);
      expect(document.activeElement).toBe(dialogAnchor);
      press('Escape');
      expect(dialogDismissed).toHaveBeenCalledExactlyOnceWith('escape');
    });

    it('closes alone on a press inside the dialog but outside the popover', async () => {
      const { dialog, popover, dialogDismissed } = await dialogWithPopover();
      pointerdown(dialog.panel.querySelector('.first')!);
      expect(await closesSoon(popover)).toBe(true);
      expect(dialogDismissed).not.toHaveBeenCalled();
      expect(dialog.panel.closest('[inert]')).toBeNull();
    });

    it('closes alone when focus moves into the dialog', async () => {
      const { dialog, popover, dialogDismissed } = await dialogWithPopover();
      dialog.panel.querySelector<HTMLElement>('.first')!.focus();
      expect(await closesSoon(popover)).toBe(true);
      expect(dialogDismissed).not.toHaveBeenCalled();
    });

    it('does not let the press that closed it also close the dialog through the backdrop', async () => {
      const { popover, dialogDismissed } = await dialogWithPopover();
      const backdrop = document.querySelector<HTMLElement>('.ck-overlay-backdrop')!;
      pointerdown(backdrop);
      backdrop.click();
      expect(await closesSoon(popover)).toBe(true);
      expect(dialogDismissed).not.toHaveBeenCalled();
      pointerdown(backdrop);
      backdrop.click();
      expect(dialogDismissed).toHaveBeenCalledExactlyOnceWith('backdrop');
    });

    it('keeps the dialog open when the popover is not dismissible and the page is pressed', async () => {
      const { popover, dialogDismissed } = await dialogWithPopover({ dismissible: false });
      const backdrop = document.querySelector<HTMLElement>('.ck-overlay-backdrop')!;
      pointerdown(backdrop);
      backdrop.click();
      await wait(100);
      expect(popover.panel.isConnected).toBe(true);
      expect(dialogDismissed).not.toHaveBeenCalled();
    });

    it('closes with the dialog', async () => {
      const { dialog, popover, dialogAnchor } = await dialogWithPopover();
      await dialog.close();
      expect(await closesSoon(popover)).toBe(true);
      expect(document.querySelector('.cdk-overlay-pane')).toBeNull();
      expect(dialogAnchor.isConnected).toBe(false);
      expect(document.activeElement).not.toBe(document.body);
    });

    it('gives the page its focus back after popover and dialog are gone', async () => {
      const { dialog, popover } = await dialogWithPopover();
      void popover.close();
      await dialog.close();
      expect(document.activeElement).toBe(anchor);
    });
  });

  describe('mode auto', () => {
    it('becomes a popover on desktop with desktop: popover, and a sheet on a phone', async () => {
      fakeMedia({ sheet: false });
      const desktop = host().open(Content, { mode: 'auto', desktop: 'popover', anchor });
      expect(desktop.mode).toBe('popover');
      await desktop.opened;
      await desktop.close();
      TestBed.resetTestingModule();
      const sheet = signal(true);
      TestBed.configureTestingModule({
        providers: [
          {
            provide: CkMedia,
            useValue: {
              sheet,
              reducedMotion: signal(false),
              narrow: signal(true),
              coarsePointer: signal(true),
            },
          },
        ],
      });
      const phone = host().open(Content, { mode: 'auto', desktop: 'popover', anchor });
      expect(phone.mode).toBe('sheet');
      await phone.opened;
      sheet.set(false);
      await phone.close();
      const again = host().open(Content, { mode: 'auto', desktop: 'popover', anchor });
      expect(again.mode).toBe('popover');
      await again.close();
    });

    it('stays a modal without desktop', async () => {
      fakeMedia({ sheet: false });
      const handle = host().open(Content, { mode: 'auto', anchor });
      expect(handle.mode).toBe('modal');
      await handle.opened;
    });

    it('follows the real viewport: a narrow window alone (no coarse pointer) stays a popover', async () => {
      await page.viewport(390, 800);
      const media = TestBed.inject(CkMedia);
      expect(media.narrow()).toBe(true);
      expect(media.coarsePointer()).toBe(false);
      const handle = host().open(Content, { mode: 'auto', desktop: 'popover', anchor });
      await handle.opened;
      expect(handle.mode).toBe('popover');
      const box = rect(handle.panel);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(390);
    });

    it('needs an anchor for a popover, and leaves nothing behind without one', () => {
      expect(() => host().open(Content, { mode: 'popover' })).toThrow(/anchor/);
      expect(() => host().open(Content, { mode: 'auto', desktop: 'popover' })).toThrow(/anchor/);
      expect(document.querySelector('.cdk-overlay-pane')).toBeNull();
      expect(app.hasAttribute('inert')).toBe(false);
    });

    it('needs no anchor when the auto mode becomes a sheet', async () => {
      fakeMedia({ sheet: true });
      const handle = host().open(Content, { mode: 'auto', desktop: 'popover' });
      expect(handle.mode).toBe('sheet');
      await handle.opened;
    });
  });

  describe('autoFocus on other modes', () => {
    it('leaves focus alone in a modal with autoFocus false, but still gives it back', async () => {
      const handle = host().open(Content, { mode: 'modal', autoFocus: false });
      await handle.opened;
      expect(handle.panel.contains(document.activeElement)).toBe(false);
      other().focus();
      await handle.close();
      expect(document.activeElement).toBe(anchor);
    });

    it('keeps moving focus in by default', async () => {
      const handle = host().open(Content, { mode: 'modal' });
      await handle.opened;
      expect(document.activeElement).toBe(handle.panel.querySelector('.first'));
    });
  });

  describe('lifecycle', () => {
    it('keeps the content mounted until the task that closed it ends with keepUntilTaskEnds, and not otherwise', async () => {
      fakeMedia({ reducedMotion: true });
      const { handle } = await open({ keepUntilTaskEnds: true });
      void handle.close();
      await Promise.resolve();
      await Promise.resolve();
      expect(document.contains(handle.panel)).toBe(true);
      expect(handle.panel.closest('.cdk-overlay-connected-position-bounding-box')).toHaveProperty(
        'inert',
        true,
      );
      expect(await closesSoon(handle)).toBe(true);
      expect(document.contains(handle.panel)).toBe(false);

      const second = await open();
      void second.handle.close();
      for (let turn = 0; turn < 10; turn++) {
        await Promise.resolve();
      }
      expect(document.contains(second.handle.panel)).toBe(false);
    });

    type Call = [string, unknown, (boolean | AddEventListenerOptions)?];
    interface ListenerSpy {
      mock: { calls: unknown[][] };
    }
    const unmatched = (
      added: ListenerSpy,
      removed: ListenerSpy,
      types: string[],
      ownName?: string,
    ) =>
      (added.mock.calls as Call[])
        .filter(([type]) => types.includes(String(type)))
        .filter(([, listener]) => !ownName || (listener as { name?: string }).name === ownName)
        .filter(
          ([type, listener, options]) =>
            !(removed.mock.calls as Call[]).some(
              ([removedType, removedListener, removedOptions]) =>
                removedType === type &&
                removedListener === listener &&
                Boolean(
                  typeof removedOptions === 'object' ? removedOptions?.capture : removedOptions,
                ) === Boolean(typeof options === 'object' ? options?.capture : options),
            ),
        )
        .map(([type]) => String(type));

    const TYPES = ['keydown', 'pointerdown', 'focusin', 'scroll', 'resize'];

    it('removes every listener it added when the popover closes', async () => {
      const added = vi.spyOn(document, 'addEventListener');
      const removed = vi.spyOn(document, 'removeEventListener');
      const windowAdded = vi.spyOn(window, 'addEventListener');
      const windowRemoved = vi.spyOn(window, 'removeEventListener');
      const { handle, dismissed } = await open();
      expect(added.mock.calls.some(([type]) => type === 'pointerdown')).toBe(true);
      expect(added.mock.calls.some(([type]) => type === 'scroll')).toBe(true);
      expect(windowAdded.mock.calls.some(([type]) => type === 'resize')).toBe(true);
      await handle.close();
      expect(unmatched(added, removed, TYPES)).toEqual([]);
      expect(unmatched(windowAdded, windowRemoved, ['resize'], 'reposition')).toEqual([]);
      press('Escape');
      pointerdown(document.querySelector('#plain')!);
      expect(dismissed).not.toHaveBeenCalled();
    });

    it('closes popovers and removes every listener when the host is destroyed', async () => {
      const added = vi.spyOn(document, 'addEventListener');
      const removed = vi.spyOn(document, 'removeEventListener');
      const windowAdded = vi.spyOn(window, 'addEventListener');
      const windowRemoved = vi.spyOn(window, 'removeEventListener');
      const { handle, dismissed } = await open();
      const second = await open({ anchor: other() });
      TestBed.resetTestingModule();
      await expect(Promise.all([handle.closed, second.handle.closed])).resolves.toBeDefined();
      expect(document.querySelector('.cdk-overlay-pane')).toBeNull();
      expect(unmatched(added, removed, TYPES)).toEqual([]);
      expect(unmatched(windowAdded, windowRemoved, ['resize'], 'reposition')).toEqual([]);
      press('Escape');
      pointerdown(document.querySelector('#plain')!);
      other().focus();
      expect(dismissed).not.toHaveBeenCalled();
      expect(second.dismissed).not.toHaveBeenCalled();
    });

    it('settles opened and closed when closed before it finished opening', async () => {
      const handle = host().open(Content, { mode: 'popover', anchor });
      await handle.close();
      await expect(handle.opened).resolves.toBeUndefined();
      await expect(handle.closed).resolves.toBeUndefined();
      expect(handle.close()).toBe(handle.close());
      handle.reposition();
    });

    it('survives repeated open and close without leaking panels', async () => {
      for (let round = 0; round < 5; round++) {
        const handle = host().open(Content, { mode: 'popover', anchor });
        void handle.close();
        await handle.closed;
      }
      expect(document.querySelectorAll('.cdk-overlay-pane').length).toBe(0);
      expect(document.querySelectorAll('.cdk-overlay-connected-position-bounding-box').length).toBe(
        0,
      );
    });

    it('ignores reposition() after close', async () => {
      const { handle } = await open();
      await handle.close();
      expect(() => handle.reposition()).not.toThrow();
    });

    it('renders nothing on the server', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
      const handle = host().open(Content, { mode: 'popover', anchor });
      expect(handle.mode).toBe('popover');
      handle.reposition();
      await handle.opened;
      await handle.close();
      await handle.closed;
      expect(document.querySelector('.cdk-overlay-pane')).toBeNull();
      expect(document.activeElement).toBe(anchor);
    });
  });
});
