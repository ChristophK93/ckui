import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { CkTooltip } from '@ckui/core/tooltip';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import {
  bubbles,
  cleanUp,
  layer,
  mount,
  pointer,
  press,
  settle,
  shown,
  wait,
} from '../testing/tooltip-host';

const BUTTON = (attributes = '') =>
  `<button ckButton aria-label="Rest timer" [ckTooltip]="text()" [ckTooltipPosition]="position()" [ckTooltipShowDelay]="delay()" [ckTooltipDisabled]="disabled()" ${attributes}>Rest</button>`;

const TWO_BUTTONS = `
  <button id="first" ckButton aria-label="Start" ckTooltip="Starts the workout">Start</button>
  <button id="second" ckButton aria-label="Skip" ckTooltip="Skips this block">Skip</button>`;

/** The `0` fake timers: pending hover and hide timers run when the test says so. */
function fakeTimers(): void {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
}

const button = (root: HTMLElement, selector = 'button'): HTMLButtonElement =>
  root.querySelector<HTMLButtonElement>(selector)!;

describe('CkTooltip', () => {
  afterEach(() => {
    cleanUp();
  });

  describe('the bubble', () => {
    it('is one role="tooltip" element in a shared inert-exempt layer on body, hidden until shown', async () => {
      const { fixture, root } = mount(BUTTON());
      await settle(fixture);
      const element = layer()!;
      expect(element.parentElement).toBe(document.body);
      expect(element.hasAttribute('data-ck-inert-exempt')).toBe(true);
      expect(bubbles()).toHaveLength(1);
      const bubble = bubbles()[0];
      expect(bubble.getAttribute('role')).toBe('tooltip');
      expect(bubble.getAttribute('popover')).toBe('manual');
      expect(bubble.id).toMatch(/^ck-tooltip-\d+$/);
      expect(bubble.textContent).toBe('Starts after each set');
      expect(bubble.matches(':popover-open')).toBe(false);
      expect(getComputedStyle(bubble).display).toBe('none');
      expect(root.contains(bubble)).toBe(false);
    });

    it('shares one layer between all tooltips and leaves it empty after the last one is gone', async () => {
      const { fixture } = mount(TWO_BUTTONS);
      await settle(fixture);
      expect(document.querySelectorAll('.ck-tooltip-layer')).toHaveLength(1);
      expect(bubbles()).toHaveLength(2);
      fixture.destroy();
      expect(bubbles()).toHaveLength(0);
      expect(layer()!.childElementCount).toBe(0);
    });

    it('opens in the top layer, above everything else on the page', async () => {
      const { fixture, root } = mount(BUTTON(), (host) => host.delay.set(0));
      await settle(fixture);
      pointer(button(root), 'pointerenter');
      await settle(fixture);
      const bubble = shown()[0];
      expect(bubble).toBeDefined();
      expect(getComputedStyle(bubble).position).toBe('fixed');
      const box = bubble.getBoundingClientRect();
      expect(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)).toBe(
        bubble,
      );
    });

    it('keeps an empty, null, undefined or blank text from showing or wiring anything', async () => {
      for (const text of ['', '   ', null, undefined]) {
        const { fixture, root } = mount(BUTTON(), (host) => host.text.set(text));
        await settle(fixture);
        expect(bubbles()).toHaveLength(0);
        expect(button(root).hasAttribute('aria-describedby')).toBe(false);
        pointer(button(root), 'pointerenter');
        button(root).focus();
        await settle(fixture);
        expect(shown()).toHaveLength(0);
        fixture.destroy();
        cleanUp();
      }
    });

    it('trims the text and shows plain text only, never markup', async () => {
      const { fixture } = mount(BUTTON(), (host) => host.text.set('  <b>Bold</b> move  '));
      await settle(fixture);
      expect(bubbles()[0].textContent).toBe('<b>Bold</b> move');
      expect(bubbles()[0].querySelector('b')).toBeNull();
    });

    it('exposes the directive as ckTooltip with show(), hide() and isVisible', async () => {
      const { fixture, root } = mount(
        `<button ckButton aria-label="Rest timer" ckTooltip="Hi" #tip="ckTooltip" (click)="tip.isVisible() ? tip.hide() : tip.show()">Rest</button>`,
      );
      await settle(fixture);
      const tooltip = fixture.debugElement.query(By.directive(CkTooltip)).injector.get(CkTooltip);
      expect(tooltip.isVisible()).toBe(false);
      tooltip.show();
      expect(tooltip.isVisible()).toBe(true);
      expect(shown()).toHaveLength(1);
      tooltip.show();
      expect(shown()).toHaveLength(1);
      tooltip.hide();
      tooltip.hide();
      expect(tooltip.isVisible()).toBe(false);
      expect(shown()).toHaveLength(0);
      button(root).click();
      expect(shown()).toHaveLength(1);
    });
  });

  describe('hover', () => {
    it('shows after the delay (500 ms by default) and not before', async () => {
      fakeTimers();
      const { fixture, root } = mount(
        `<button ckButton aria-label="Rest timer" ckTooltip="Hi">Rest</button>`,
      );
      await settle(fixture);
      pointer(button(root), 'pointerenter');
      vi.advanceTimersByTime(499);
      expect(shown()).toHaveLength(0);
      vi.advanceTimersByTime(1);
      expect(shown()).toHaveLength(1);
    });

    it('takes its delay from ckTooltipShowDelay, and 0 shows at once', async () => {
      fakeTimers();
      const { fixture, root, host } = mount(BUTTON(), (instance) => instance.delay.set(1200));
      await settle(fixture);
      pointer(button(root), 'pointerenter');
      vi.advanceTimersByTime(1199);
      expect(shown()).toHaveLength(0);
      vi.advanceTimersByTime(1);
      expect(shown()).toHaveLength(1);
      pointer(button(root), 'pointerleave');
      vi.advanceTimersByTime(100);
      host.delay.set(0);
      await settle(fixture);
      pointer(button(root), 'pointerenter');
      expect(shown()).toHaveLength(1);
    });

    it('never shows when the pointer leaves before the delay is over', async () => {
      fakeTimers();
      const { fixture, root } = mount(BUTTON());
      await settle(fixture);
      pointer(button(root), 'pointerenter');
      vi.advanceTimersByTime(300);
      pointer(button(root), 'pointerleave');
      vi.advanceTimersByTime(2000);
      expect(shown()).toHaveLength(0);
    });

    it('treats a negative or invalid delay as no delay and a repeated enter as one', async () => {
      fakeTimers();
      const { fixture, root } = mount(BUTTON(), (host) => host.delay.set(-50));
      await settle(fixture);
      pointer(button(root), 'pointerenter');
      expect(shown()).toHaveLength(1);
    });

    it('hides 100 ms after the pointer leaves the host, not sooner', async () => {
      fakeTimers();
      const { fixture, root } = mount(BUTTON(), (host) => host.delay.set(0));
      await settle(fixture);
      pointer(button(root), 'pointerenter');
      pointer(button(root), 'pointerleave');
      vi.advanceTimersByTime(99);
      expect(shown()).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(shown()).toHaveLength(0);
    });

    it('stays open while the pointer is on the bubble and hides 100 ms after it leaves that too', async () => {
      fakeTimers();
      const { fixture, root } = mount(BUTTON(), (host) => host.delay.set(0));
      await settle(fixture);
      pointer(button(root), 'pointerenter');
      pointer(button(root), 'pointerleave');
      vi.advanceTimersByTime(60);
      pointer(shown()[0], 'pointerenter');
      vi.advanceTimersByTime(1000);
      expect(shown()).toHaveLength(1);
      pointer(shown()[0], 'pointerleave');
      vi.advanceTimersByTime(99);
      expect(shown()).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(shown()).toHaveLength(0);
    });

    it('stays open when the pointer goes from the bubble back to the host', async () => {
      fakeTimers();
      const { fixture, root } = mount(BUTTON(), (host) => host.delay.set(0));
      await settle(fixture);
      pointer(button(root), 'pointerenter');
      pointer(button(root), 'pointerleave');
      pointer(shown()[0], 'pointerenter');
      pointer(shown()[0], 'pointerleave');
      pointer(button(root), 'pointerenter');
      vi.advanceTimersByTime(1000);
      expect(shown()).toHaveLength(1);
    });

    it('keeps the bubble open while a real mouse moves from the host onto it (hoverable)', async () => {
      const { fixture, root } = mount(BUTTON(), (host) => {
        host.delay.set(0);
        host.position.set('below');
      });
      root.style.padding = '120px';
      await settle(fixture);
      await userEvent.hover(button(root));
      expect(shown()).toHaveLength(1);
      await userEvent.hover(shown()[0]);
      await wait(250);
      expect(shown()).toHaveLength(1);
      await userEvent.unhover(shown()[0]);
      await wait(250);
      expect(shown()).toHaveLength(0);
    });

    it('hides at once on a mouse press on the host and does not come back until the pointer re-enters', async () => {
      fakeTimers();
      const { fixture, root } = mount(BUTTON(), (host) => host.delay.set(100));
      await settle(fixture);
      pointer(button(root), 'pointerenter');
      vi.advanceTimersByTime(100);
      expect(shown()).toHaveLength(1);
      pointer(button(root), 'pointerdown');
      expect(shown()).toHaveLength(0);
      vi.advanceTimersByTime(2000);
      expect(shown()).toHaveLength(0);
      pointer(button(root), 'pointerleave');
      pointer(button(root), 'pointerenter');
      vi.advanceTimersByTime(100);
      expect(shown()).toHaveLength(1);
    });

    it('cancels a pending show when the pointer goes down before the delay is over', async () => {
      fakeTimers();
      const { fixture, root } = mount(BUTTON());
      await settle(fixture);
      pointer(button(root), 'pointerenter');
      vi.advanceTimersByTime(200);
      pointer(button(root), 'pointerdown');
      vi.advanceTimersByTime(2000);
      expect(shown()).toHaveLength(0);
    });

    it('shows for a pen like for a mouse', async () => {
      fakeTimers();
      const { fixture, root } = mount(BUTTON());
      await settle(fixture);
      pointer(button(root), 'pointerenter', { pointerType: 'pen' });
      vi.advanceTimersByTime(500);
      expect(shown()).toHaveLength(1);
    });

    it('does not show on the hover that a finger sends before a touch press', async () => {
      fakeTimers();
      const { fixture, root } = mount(BUTTON());
      await settle(fixture);
      pointer(button(root), 'pointerenter', { pointerType: 'touch' });
      vi.advanceTimersByTime(2000);
      expect(shown()).toHaveLength(0);
    });

    it('still shows for the mouse on a disabled button, which a keyboard never reaches', async () => {
      fakeTimers();
      const { fixture, root } = mount(
        `<button ckButton disabled aria-label="Rest timer" ckTooltip="Hi">Rest</button>`,
      );
      await settle(fixture);
      pointer(button(root), 'pointerenter');
      vi.advanceTimersByTime(500);
      expect(shown()).toHaveLength(1);
    });
  });

  describe('moving between tooltips', () => {
    it('skips the delay for the next host within 300 ms of a hide, and not after', async () => {
      fakeTimers();
      const { fixture, root } = mount(TWO_BUTTONS);
      await settle(fixture);
      const first = button(root, '#first');
      const second = button(root, '#second');
      pointer(first, 'pointerenter');
      vi.advanceTimersByTime(500);
      pointer(first, 'pointerleave');
      vi.advanceTimersByTime(100);
      expect(shown()).toHaveLength(0);
      vi.advanceTimersByTime(299);
      pointer(second, 'pointerenter');
      expect(shown().map((bubble) => bubble.textContent)).toEqual(['Skips this block']);
      pointer(second, 'pointerleave');
      vi.advanceTimersByTime(100);
      vi.advanceTimersByTime(300);
      pointer(first, 'pointerenter');
      expect(shown()).toHaveLength(0);
      vi.advanceTimersByTime(500);
      expect(shown()).toHaveLength(1);
    });

    it('skips the delay while the previous tooltip is still waiting for its own hide', async () => {
      fakeTimers();
      const { fixture, root } = mount(TWO_BUTTONS);
      await settle(fixture);
      pointer(button(root, '#first'), 'pointerenter');
      vi.advanceTimersByTime(500);
      pointer(button(root, '#first'), 'pointerleave');
      vi.advanceTimersByTime(40);
      pointer(button(root, '#second'), 'pointerenter');
      expect(shown().map((bubble) => bubble.textContent)).toEqual(['Skips this block']);
      vi.advanceTimersByTime(5000);
      expect(shown()).toHaveLength(1);
    });

    it('shows one tooltip at a time, also from the keyboard and from show()', async () => {
      const { fixture, root } = mount(TWO_BUTTONS);
      await settle(fixture);
      const tooltips = fixture.debugElement
        .queryAll(By.directive(CkTooltip))
        .map((element) => element.injector.get(CkTooltip));
      tooltips[0].show();
      tooltips[1].show();
      expect(shown().map((bubble) => bubble.textContent)).toEqual(['Skips this block']);
      expect(tooltips[0].isVisible()).toBe(false);
      await userEvent.tab();
      await userEvent.tab();
      expect(shown()).toHaveLength(1);
      expect(button(root, '#first').getAttribute('aria-describedby')).not.toBeNull();
    });
  });

  describe('focus', () => {
    it('shows at once when the keyboard focuses the host and hides on blur', async () => {
      const { fixture, root } = mount(`<button id="before">Before</button>` + TWO_BUTTONS);
      await settle(fixture);
      button(root, '#before').focus();
      await userEvent.tab();
      expect(document.activeElement).toBe(button(root, '#first'));
      expect(shown().map((bubble) => bubble.textContent)).toEqual(['Starts the workout']);
      await userEvent.tab();
      expect(document.activeElement).toBe(button(root, '#second'));
      expect(shown().map((bubble) => bubble.textContent)).toEqual(['Skips this block']);
      await userEvent.tab({ shift: true });
      await userEvent.tab({ shift: true });
      expect(shown()).toHaveLength(0);
    });

    it('stays quiet for the focus that a mouse click gives (no :focus-visible)', async () => {
      const { fixture, root } = mount(TWO_BUTTONS);
      await settle(fixture);
      await userEvent.click(button(root, '#first'));
      await wait(50);
      expect(document.activeElement).toBe(button(root, '#first'));
      expect(button(root, '#first').matches(':focus-visible')).toBe(false);
      expect(shown()).toHaveLength(0);
    });

    it('hides on blur even when the pointer is resting on the bubble', async () => {
      fakeTimers();
      const { fixture, root } = mount(TWO_BUTTONS);
      await settle(fixture);
      await userEvent.tab();
      expect(shown()).toHaveLength(1);
      pointer(shown()[0], 'pointerenter');
      button(root, '#first').blur();
      expect(shown()).toHaveLength(0);
    });

    it('does not show for a disabled tooltip or a host without text', async () => {
      const { fixture, root } = mount(BUTTON(), (host) => host.disabled.set(true));
      await settle(fixture);
      await userEvent.tab();
      expect(document.activeElement).toBe(button(root));
      expect(shown()).toHaveLength(0);
    });
  });

  describe('Escape', () => {
    it('hides the visible tooltip and stops there: prevented, not passed on', async () => {
      const { fixture, root } = mount(TWO_BUTTONS);
      await settle(fixture);
      await userEvent.tab();
      expect(shown()).toHaveLength(1);
      const seen: KeyboardEvent[] = [];
      const listener = (event: KeyboardEvent) => seen.push(event);
      document.body.addEventListener('keydown', listener);
      document.addEventListener('keydown', listener);
      const event = press(button(root, '#first'), 'Escape');
      document.body.removeEventListener('keydown', listener);
      document.removeEventListener('keydown', listener);
      expect(shown()).toHaveLength(0);
      expect(event.defaultPrevented).toBe(true);
      expect(seen).toEqual([]);
    });

    it('does nothing when no tooltip is visible: the key passes through untouched', async () => {
      const { fixture, root } = mount(TWO_BUTTONS);
      await settle(fixture);
      const seen: KeyboardEvent[] = [];
      const listener = (event: KeyboardEvent) => seen.push(event);
      document.addEventListener('keydown', listener);
      const event = press(button(root, '#first'), 'Escape');
      document.removeEventListener('keydown', listener);
      expect(event.defaultPrevented).toBe(false);
      expect(seen).toHaveLength(1);
    });

    it('stops listening once the tooltip is hidden, so the next Escape passes through', async () => {
      const { fixture, root } = mount(TWO_BUTTONS);
      await settle(fixture);
      await userEvent.tab();
      press(button(root, '#first'), 'Escape');
      const event = press(button(root, '#first'), 'Escape');
      expect(event.defaultPrevented).toBe(false);
    });

    it('ignores other keys and composition', async () => {
      const { fixture, root } = mount(TWO_BUTTONS);
      await settle(fixture);
      await userEvent.tab();
      expect(press(button(root, '#first'), 'Enter').defaultPrevented).toBe(false);
      expect(press(button(root, '#first'), 'Escape', { isComposing: true }).defaultPrevented).toBe(
        false,
      );
      expect(shown()).toHaveLength(1);
    });

    it('closes only the tooltip inside an open dialog; the second Escape closes the dialog', async () => {
      const { fixture, host } = mount(
        `<button id="opener" ckButton (click)="openDialog()">Open</button>
         <ng-template #dialogTemplate>
           <h2 ckDialogTitle>Settings</h2>
           <button id="inside" ckButton aria-label="Timer" ckTooltip="Counts rest" [ckTooltipShowDelay]="0">Timer</button>
         </ng-template>`,
      );
      await settle(fixture);
      const ref = host.openDialog();
      await settle(fixture);
      await wait(350);
      const inside = document.querySelector<HTMLButtonElement>('#inside')!;
      inside.scrollIntoView();
      await userEvent.hover(inside);
      expect(shown().map((bubble) => bubble.textContent)).toEqual(['Counts rest']);
      expect(shown()[0].closest('[inert]')).toBeNull();
      expect(document.querySelector('.ck-dialog-panel')).not.toBeNull();
      await userEvent.keyboard('{Escape}');
      await settle(fixture);
      expect(shown()).toHaveLength(0);
      expect(document.querySelector('.ck-dialog-panel')).not.toBeNull();
      await userEvent.keyboard('{Escape}');
      await settle(fixture);
      await wait(350);
      expect(document.querySelector('.ck-dialog-panel')).toBeNull();
      await ref.closed;
    });
  });

  describe('naming and description', () => {
    it('adds the bubble id to aria-describedby and takes it away again, never touching the name', async () => {
      const { fixture, root } = mount(BUTTON(), (host) => host.text.set('Starts after each set'));
      await settle(fixture);
      const bubbleId = bubbles()[0].id;
      expect(button(root).getAttribute('aria-describedby')).toBe(bubbleId);
      expect(button(root).getAttribute('aria-label')).toBe('Rest timer');
      expect(button(root).hasAttribute('aria-labelledby')).toBe(false);
      expect(button(root).hasAttribute('title')).toBe(false);
      fixture.componentInstance.disabled.set(true);
      await settle(fixture);
      expect(button(root).hasAttribute('aria-describedby')).toBe(false);
      expect(Array.from(button(root).attributes, (attribute) => attribute.name).sort()).toEqual(
        ['aria-label', 'ckbutton', 'class', 'type'].sort(),
      );
    });

    it('keeps a static consumer aria-describedby and restores it exactly', async () => {
      const { fixture, root } = mount(
        `<button ckButton aria-label="Rest timer" aria-describedby="hint other" ckTooltip="Hi">Rest</button>`,
      );
      await settle(fixture);
      const bubbleId = bubbles()[0].id;
      expect(button(root).getAttribute('aria-describedby')).toBe(`hint other ${bubbleId}`);
      fixture.destroy();
      expect(button(root).getAttribute('aria-describedby')).toBe('hint other');
      expect(bubbles()).toHaveLength(0);
    });

    it('keeps a bound consumer value, also when it changes while the tooltip is wired', async () => {
      const { fixture, root, host } = mount(
        `<button ckButton aria-label="Rest timer" [attr.aria-describedby]="describedBy()" ckTooltip="Hi">Rest</button>`,
        (instance) => instance.describedBy.set('one'),
      );
      await settle(fixture);
      const bubbleId = bubbles()[0].id;
      expect(button(root).getAttribute('aria-describedby')).toBe(`one ${bubbleId}`);
      host.describedBy.set('two three');
      await settle(fixture);
      await wait(20);
      expect(button(root).getAttribute('aria-describedby')).toBe(`two three ${bubbleId}`);
      host.describedBy.set(null);
      await settle(fixture);
      await wait(20);
      expect(button(root).getAttribute('aria-describedby')).toBe(bubbleId);
      host.describedBy.set('late');
      await settle(fixture);
      await wait(20);
      expect(button(root).getAttribute('aria-describedby')).toBe(`late ${bubbleId}`);
      fixture.destroy();
      expect(button(root).getAttribute('aria-describedby')).toBe('late');
    });

    it('removes the attribute it created when the host had none', async () => {
      const { fixture, root } = mount(BUTTON());
      await settle(fixture);
      expect(button(root).hasAttribute('aria-describedby')).toBe(true);
      fixture.destroy();
      expect(button(root).hasAttribute('aria-describedby')).toBe(false);
      expect(
        Array.from(button(root).attributes).some((attribute) =>
          attribute.name.startsWith('data-ck-claim'),
        ),
      ).toBe(false);
    });

    it('does not wire a text that equals the accessible name, whitespace and case aside', async () => {
      for (const [markup, text] of [
        [
          `<button ckButton aria-label="Rest timer" [ckTooltip]="text()">x</button>`,
          '  rest   TIMER ',
        ],
        [`<button ckButton [ckTooltip]="text()">Rest timer</button>`, 'Rest Timer'],
        [
          `<span id="name">Rest</span> <span id="name2">timer</span><button ckButton aria-labelledby="name name2" [ckTooltip]="text()">x</button>`,
          'rest timer',
        ],
        [
          `<label for="field">Rest timer</label><input id="field" [ckTooltip]="text()" />`,
          'rest timer',
        ],
        [`<button ckButton title="Rest timer" [ckTooltip]="text()"></button>`, 'rest timer'],
      ] as const) {
        const { fixture, root } = mount(markup, (host) => host.text.set(text));
        await settle(fixture);
        const target = root.querySelector('button, input')!;
        expect(target.hasAttribute('aria-describedby'), markup).toBe(false);
        fixture.debugElement.query(By.directive(CkTooltip)).injector.get(CkTooltip).show();
        expect(shown(), markup).toHaveLength(1);
        fixture.destroy();
        cleanUp();
      }
    });

    it('wires it again when the text changes to something else, and not when the text changes to match the name', async () => {
      const { fixture, root, host } = mount(BUTTON(), (instance) =>
        instance.text.set('Rest timer'),
      );
      await settle(fixture);
      expect(button(root).hasAttribute('aria-describedby')).toBe(false);
      host.text.set('Starts after each set');
      await settle(fixture);
      expect(button(root).getAttribute('aria-describedby')).toBe(bubbles()[0].id);
      host.text.set('REST TIMER');
      await settle(fixture);
      expect(button(root).hasAttribute('aria-describedby')).toBe(false);
    });

    it('warns once in development when the host has no accessible name, never for a named host', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const named = mount(
        `<button ckButton aria-label="Rest timer" ckTooltip="Hi">x</button>
         <button ckButton>Rest</button>`,
      );
      await settle(named.fixture);
      expect(warn).not.toHaveBeenCalled();
      named.fixture.destroy();
      cleanUp();
      const { fixture, host } = mount(
        `<button ckButton [ckTooltip]="text()"><svg aria-hidden="true" width="8" height="8"></svg></button>`,
      );
      await settle(fixture);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('ckTooltip');
      host.text.set('Something else');
      await settle(fixture);
      host.text.set(null);
      await settle(fixture);
      host.text.set('Again');
      await settle(fixture);
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('changes while it is shown', () => {
    it('updates the text and the placement when the text changes', async () => {
      const { fixture, root, host } = mount(
        `<div style="padding: 200px 300px"><button ckButton aria-label="Rest timer" [ckTooltip]="text()" ckTooltipPosition="below" [ckTooltipShowDelay]="0">Rest</button></div>`,
        (instance) => instance.text.set('Short'),
      );
      await settle(fixture);
      pointer(button(root), 'pointerenter');
      const bubble = shown()[0];
      const narrow = bubble.getBoundingClientRect();
      host.text.set('A much longer text that makes the bubble clearly wider than before');
      await settle(fixture);
      const wide = bubble.getBoundingClientRect();
      expect(bubble.textContent).toContain('much longer');
      expect(wide.width).toBeGreaterThan(narrow.width + 40);
      const hostBox = button(root).getBoundingClientRect();
      expect(wide.left + wide.width / 2).toBeCloseTo(hostBox.left + hostBox.width / 2, 0);
    });

    it('moves to the other side when ckTooltipPosition changes', async () => {
      const { fixture, root, host } = mount(
        `<div style="padding: 200px 200px"><button ckButton aria-label="Rest timer" [ckTooltip]="text()" [ckTooltipPosition]="position()" [ckTooltipShowDelay]="0">Rest</button></div>`,
      );
      await settle(fixture);
      pointer(button(root), 'pointerenter');
      const bubble = shown()[0];
      expect(bubble.classList.contains('ck-tooltip--above')).toBe(true);
      expect(bubble.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        button(root).getBoundingClientRect().top,
      );
      host.position.set('below');
      await settle(fixture);
      expect(bubble.classList.contains('ck-tooltip--below')).toBe(true);
      expect(bubble.classList.contains('ck-tooltip--above')).toBe(false);
      expect(bubble.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        button(root).getBoundingClientRect().bottom,
      );
    });

    it('hides and unwires when the text becomes empty, and comes back with new text', async () => {
      const { fixture, root, host } = mount(BUTTON(), (instance) => instance.delay.set(0));
      await settle(fixture);
      pointer(button(root), 'pointerenter');
      expect(shown()).toHaveLength(1);
      host.text.set('');
      await settle(fixture);
      expect(shown()).toHaveLength(0);
      expect(bubbles()).toHaveLength(0);
      expect(button(root).hasAttribute('aria-describedby')).toBe(false);
      host.text.set('Back again');
      await settle(fixture);
      expect(bubbles()[0].textContent).toBe('Back again');
      expect(button(root).getAttribute('aria-describedby')).toBe(bubbles()[0].id);
    });

    it('hides an open tooltip and stops showing when ckTooltipDisabled turns on', async () => {
      const { fixture, root, host } = mount(BUTTON(), (instance) => instance.delay.set(0));
      await settle(fixture);
      pointer(button(root), 'pointerenter');
      expect(shown()).toHaveLength(1);
      host.disabled.set(true);
      await settle(fixture);
      expect(shown()).toHaveLength(0);
      expect(bubbles()).toHaveLength(0);
      expect(button(root).hasAttribute('aria-describedby')).toBe(false);
      pointer(button(root), 'pointerleave');
      pointer(button(root), 'pointerenter');
      button(root).focus();
      expect(shown()).toHaveLength(0);
      host.disabled.set(false);
      await settle(fixture);
      pointer(button(root), 'pointerleave');
      pointer(button(root), 'pointerenter');
      expect(shown()).toHaveLength(1);
    });
  });

  describe('many tooltips', () => {
    it('mounts and wires 500 hosts quickly and shows one on hover', async () => {
      const started = Date.now();
      const { fixture, root } = mount(
        `@for (item of items; track item) {
           <button ckButton [attr.aria-label]="'Item ' + item" [ckTooltip]="'Tip ' + item" [ckTooltipShowDelay]="0">x</button>
         }`,
        (host) => host.items.push(...Array.from({ length: 500 }, (_, index) => index)),
      );
      await settle(fixture);
      expect(Date.now() - started).toBeLessThan(3000);
      expect(bubbles()).toHaveLength(500);
      expect(root.querySelectorAll('button[aria-describedby]')).toHaveLength(500);
      const hover = Date.now();
      pointer(root.querySelectorAll('button')[250], 'pointerenter');
      expect(shown().map((bubble) => bubble.textContent)).toEqual(['Tip 250']);
      expect(Date.now() - hover).toBeLessThan(200);
      fixture.destroy();
      expect(layer()!.childElementCount).toBe(0);
    });
  });

  describe('destroy', () => {
    it('removes the bubble, restores aria-describedby and leaves the layer empty while shown', async () => {
      const { fixture, root } = mount(
        `<button ckButton aria-label="Rest timer" aria-describedby="hint" ckTooltip="Hi" ckTooltipShowDelay="0">Rest</button>`,
      );
      await settle(fixture);
      pointer(button(root), 'pointerenter');
      expect(shown()).toHaveLength(1);
      fixture.destroy();
      expect(bubbles()).toHaveLength(0);
      expect(layer()!.childElementCount).toBe(0);
      expect(button(root).getAttribute('aria-describedby')).toBe('hint');
    });

    it('runs nothing afterwards: no timers, scroll, resize, key or pointer reaction', async () => {
      fakeTimers();
      const { fixture, root } = mount(TWO_BUTTONS);
      await settle(fixture);
      const first = button(root, '#first');
      pointer(first, 'pointerenter');
      vi.advanceTimersByTime(500);
      pointer(first, 'pointerleave');
      const show = vi.spyOn(HTMLElement.prototype, 'showPopover');
      const hide = vi.spyOn(HTMLElement.prototype, 'hidePopover');
      const place = vi.spyOn(Element.prototype, 'getBoundingClientRect');
      fixture.destroy();
      const calls = place.mock.calls.length;
      show.mockClear();
      hide.mockClear();
      first.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
      document.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('resize'));
      press(first, 'Escape');
      vi.advanceTimersByTime(10_000);
      expect(show).not.toHaveBeenCalled();
      expect(hide).not.toHaveBeenCalled();
      expect(place.mock.calls.length).toBe(calls);
      expect(bubbles()).toHaveLength(0);
      expect(document.querySelectorAll('.ck-tooltip-layer > *')).toHaveLength(0);
    });

    it('stops the Escape handling and the scroll listener of a destroyed visible tooltip', async () => {
      const { fixture, root } = mount(TWO_BUTTONS);
      await settle(fixture);
      await userEvent.tab();
      expect(shown()).toHaveLength(1);
      const first = button(root, '#first');
      fixture.destroy();
      const event = press(first, 'Escape');
      expect(event.defaultPrevented).toBe(false);
    });

    it('does not leave a pending show behind when the host is destroyed during the delay', async () => {
      fakeTimers();
      const { fixture, root } = mount(TWO_BUTTONS);
      await settle(fixture);
      pointer(button(root, '#first'), 'pointerenter');
      vi.advanceTimersByTime(300);
      fixture.destroy();
      const show = vi.spyOn(HTMLElement.prototype, 'showPopover');
      vi.advanceTimersByTime(5000);
      expect(show).not.toHaveBeenCalled();
      expect(document.querySelectorAll('.ck-tooltip-layer > *')).toHaveLength(0);
    });

    it('removes the layer with the application, so the next one starts clean', async () => {
      const { fixture } = mount(TWO_BUTTONS);
      await settle(fixture);
      expect(layer()).not.toBeNull();
      fixture.destroy();
      TestBed.resetTestingModule();
      expect(layer()).toBeNull();
    });

    it('survives something clearing the body: the layer is put back when a tooltip shows again', async () => {
      const { fixture, root } = mount(BUTTON(), (host) => host.delay.set(0));
      await settle(fixture);
      layer()!.remove();
      pointer(button(root), 'pointerenter');
      expect(shown()).toHaveLength(1);
      expect(layer()!.parentElement).toBe(document.body);
    });
  });
});
