import { By } from '@angular/platform-browser';
import { CkTooltip } from '@ckui/core/tooltip';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cdp, userEvent } from 'vitest/browser';
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

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

const fakeTimers = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
const find = <T extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): T =>
  root.querySelector<T>(selector)!;
const tokens = (element: Element): string[] =>
  (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((token) => token !== '');

const FIELD = `
  <button id="before">Before</button>
  <ck-field [invalid]="invalid()">
    <label>Weight</label>
    <input ckInput ckTooltip="In kg" [ckTooltipDisabled]="disabled()" />
    <ck-hint>Your body weight.</ck-hint>
    <ck-error>Enter a weight.</ck-error>
  </ck-field>`;

describe('CkTooltip robustness', () => {
  afterEach(() => {
    cleanUp();
  });

  describe('beside other writers of aria-describedby', () => {
    it('keeps the ids a field adds after the tooltip wired, through disable, name match and destroy', async () => {
      const { fixture, host, root } = mount(FIELD, (instance) => instance.text.set('In kg'));
      await settle(fixture);
      const input = find<HTMLInputElement>(root, 'input');
      const bubbleId = bubbles()[0].id;
      const withoutTooltip = (): string[] => tokens(input).filter((token) => token !== bubbleId);
      expect(tokens(input)).toContain(bubbleId);
      host.invalid.set(true);
      await settle(fixture);
      await wait(30);
      const fieldIds = withoutTooltip();
      expect(fieldIds.length).toBe(2);
      expect(tokens(input)).toContain(bubbleId);
      // (a) disabled: only the field's ids, no dangling tooltip id
      host.disabled.set(true);
      await settle(fixture);
      await wait(30);
      expect(input.getAttribute('aria-describedby')).toBe(fieldIds.join(' '));
      // wired again, then the field's error goes away and comes back
      host.disabled.set(false);
      await settle(fixture);
      await wait(30);
      expect(tokens(input).sort()).toEqual([...fieldIds, bubbleId].sort());
      host.invalid.set(false);
      await settle(fixture);
      await wait(30);
      host.invalid.set(true);
      await settle(fixture);
      await wait(30);
      expect(tokens(input).sort()).toEqual([...fieldIds, bubbleId].sort());
      fixture.destroy();
      cleanUp();
    });

    it('releases the id when the text equals the name, and when the tooltip is destroyed', async () => {
      const { fixture, host, root } = mount(
        `<ck-field [invalid]="invalid()">
           <label>Weight</label>
           <input ckInput [ckTooltip]="text()" />
           <ck-hint>Your body weight.</ck-hint>
           <ck-error>Enter a weight.</ck-error>
         </ck-field>`,
        (instance) => instance.text.set('In kg'),
      );
      await settle(fixture);
      const input = find<HTMLInputElement>(root, 'input');
      const bubbleId = bubbles()[0].id;
      host.invalid.set(true);
      await settle(fixture);
      await wait(30);
      const fieldIds = tokens(input).filter((token) => token !== bubbleId);
      expect(fieldIds.length).toBe(2);
      // (b) text equals the name: read once, so the id must be gone and the field's ids stay
      host.text.set('weight');
      await settle(fixture);
      await wait(30);
      expect(input.getAttribute('aria-describedby')).toBe(fieldIds.join(' '));
      host.text.set('In kg');
      await settle(fixture);
      await wait(30);
      expect(tokens(input).sort()).toEqual([...fieldIds, bubbleId].sort());
      // (c) destroy: the field's ids stay, the tooltip's is gone
      const tooltip = fixture.debugElement.query(By.directive(CkTooltip)).injector.get(CkTooltip);
      expect(tooltip).toBeDefined();
      fixture.destroy();
      expect(input.getAttribute('aria-describedby')).toBe(fieldIds.join(' '));
    });

    it('keeps an id that the CDK describer style of writer appends', async () => {
      const { fixture, root } = mount(
        `<button ckButton aria-label="Rest timer" aria-describedby="one" ckTooltip="Hi">Rest</button>`,
      );
      await settle(fixture);
      const target = find(root, 'button');
      const bubbleId = bubbles()[0].id;
      target.setAttribute('aria-describedby', `${target.getAttribute('aria-describedby')} cdk-1`);
      await wait(30);
      expect(tokens(target).sort()).toEqual(['cdk-1', 'one', bubbleId].sort());
      fixture.componentInstance.disabled.set(true);
      fixture.destroy();
      expect(target.getAttribute('aria-describedby')).toBe('one cdk-1');
    });
  });

  describe('through the attribute watcher', () => {
    const NAMED = `<button id="target" ckButton [attr.aria-label]="label()" [ckTooltip]="text()">x</button>`;

    it('wires and unwires when aria-label becomes equal and unequal to the text', async () => {
      const { fixture, host, root } = mount(NAMED, (instance) => {
        instance.text.set('Starts after each set');
        instance.label.set('Rest timer');
      });
      await settle(fixture);
      const target = find(root, '#target');
      expect(tokens(target)).toEqual([bubbles()[0].id]);
      host.label.set('starts after each SET');
      await settle(fixture);
      await wait(30);
      expect(target.hasAttribute('aria-describedby')).toBe(false);
      host.label.set('Rest timer');
      await settle(fixture);
      await wait(30);
      expect(tokens(target)).toEqual([bubbles()[0].id]);
    });

    it('follows aria-labelledby, aria-label and title changes made behind its back', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, root } = mount(
        `<span id="name">Starts after each set</span><button id="target" ckButton aria-labelledby="name" ckTooltip="Starts after each set"></button>`,
      );
      await settle(fixture);
      const target = find(root, '#target');
      expect(target.hasAttribute('aria-describedby')).toBe(false);
      target.removeAttribute('aria-labelledby');
      await wait(30);
      expect(tokens(target)).toHaveLength(1);
      target.setAttribute('aria-label', 'Rest timer');
      await wait(30);
      expect(tokens(target)).toHaveLength(1);
      target.setAttribute('aria-label', ' starts  AFTER each set ');
      await wait(30);
      expect(target.hasAttribute('aria-describedby')).toBe(false);
      // aria-labelledby wins over aria-label, as it does for the browser
      target.setAttribute('aria-labelledby', 'name');
      target.setAttribute('aria-label', 'Something else');
      await wait(30);
      expect(target.hasAttribute('aria-describedby')).toBe(false);
      target.removeAttribute('aria-labelledby');
      await wait(30);
      expect(tokens(target)).toHaveLength(1);
      target.removeAttribute('aria-label');
      target.setAttribute('title', 'Starts after each set');
      await wait(30);
      expect(target.hasAttribute('aria-describedby')).toBe(false);
      target.setAttribute('title', 'Different');
      await wait(30);
      expect(tokens(target)).toHaveLength(1);
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('puts our id back when a consumer binding rewrites aria-describedby to nothing', async () => {
      const { fixture, root } = mount(
        `<button id="target" ckButton aria-label="Rest timer" ckTooltip="Hi">x</button>`,
      );
      await settle(fixture);
      const target = find(root, '#target');
      target.removeAttribute('aria-describedby');
      await wait(30);
      expect(tokens(target)).toEqual([bubbles()[0].id]);
    });
  });

  describe('without the Popover API', () => {
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover');

    afterEach(() => {
      if (original) {
        Object.defineProperty(HTMLElement.prototype, 'showPopover', original);
      }
    });

    it('is off: nothing mounted, nothing wired, nothing visible, and Escape reaches the dialog', async () => {
      delete (HTMLElement.prototype as unknown as Record<string, unknown>)['showPopover'];
      const { fixture, host, root } = mount(
        `<button id="opener" ckButton (click)="openDialog()">Open</button>
         <button id="target" ckButton aria-label="Rest timer" ckTooltip="Hi" [ckTooltipShowDelay]="0">Rest</button>
         <ng-template #dialogTemplate>
           <h2 ckDialogTitle>Settings</h2>
           <button id="inside" ckButton aria-label="Timer" ckTooltip="Counts rest">Timer</button>
         </ng-template>`,
      );
      await settle(fixture);
      const target = find(root, '#target');
      expect(layer()).toBeNull();
      expect(bubbles()).toHaveLength(0);
      expect(target.hasAttribute('aria-describedby')).toBe(false);
      pointer(target, 'pointerenter');
      target.focus();
      await userEvent.tab();
      expect(shown()).toHaveLength(0);
      const tooltip = fixture.debugElement.query(By.css('#target')).injector.get(CkTooltip);
      tooltip.show();
      expect(tooltip.isVisible()).toBe(false);
      host.openDialog();
      await settle(fixture);
      await wait(350);
      const inside = document.querySelector<HTMLElement>('#inside')!;
      inside.focus();
      await userEvent.keyboard('{Escape}');
      await settle(fixture);
      await wait(350);
      expect(document.querySelector('.ck-dialog-panel')).toBeNull();
    });

    it('does not claim the layer or swallow Escape when showPopover throws', async () => {
      vi.spyOn(HTMLElement.prototype, 'showPopover').mockImplementation(() => {
        throw new DOMException('not allowed', 'InvalidStateError');
      });
      const { fixture, root } = mount(
        `<button id="target" ckButton aria-label="Rest timer" ckTooltip="Hi">Rest</button>`,
      );
      await settle(fixture);
      const tooltip = fixture.debugElement.query(By.directive(CkTooltip)).injector.get(CkTooltip);
      tooltip.show();
      expect(tooltip.isVisible()).toBe(false);
      expect(press(find(root, '#target'), 'Escape').defaultPrevented).toBe(false);
    });
  });

  describe('focus that a pointer gave', () => {
    const INPUT = `<button id="before">Before</button><input id="target" aria-label="Weight" ckTooltip="In kg" [ckTooltipShowDelay]="0" /><button id="after">After</button>`;

    it('stays quiet for a real mouse click on a text input', async () => {
      const { fixture, root } = mount(INPUT);
      await settle(fixture);
      await userEvent.click(find(root, '#target'));
      await wait(150);
      expect(document.activeElement).toBe(find(root, '#target'));
      expect(shown()).toHaveLength(0);
    });

    it('stays quiet for a tap on a text input, and shows for Tab', async () => {
      const session = cdp() as unknown as Session;
      await session.send('Emulation.setTouchEmulationEnabled', {
        enabled: true,
        maxTouchPoints: 1,
      });
      try {
        const { fixture, root } = mount(INPUT);
        root.style.padding = '120px';
        await settle(fixture);
        const box = find(root, '#target').getBoundingClientRect();
        const point = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [point],
        });
        await wait(60);
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await wait(200);
        expect(document.activeElement).toBe(find(root, '#target'));
        expect(shown()).toHaveLength(0);
        find(root, '#before').focus();
        await userEvent.tab();
        expect(document.activeElement).toBe(find(root, '#target'));
        expect(shown().map((bubble) => bubble.textContent)).toEqual(['In kg']);
      } finally {
        await session.send('Emulation.setTouchEmulationEnabled', {
          enabled: false,
          maxTouchPoints: 1,
        });
      }
    });

    it('does not let a press on an already focused input swallow a later keyboard focus', async () => {
      const { fixture, root } = mount(INPUT);
      await settle(fixture);
      const input = find(root, '#target');
      await userEvent.click(input);
      await userEvent.click(input);
      await userEvent.tab();
      await userEvent.tab({ shift: true });
      expect(document.activeElement).toBe(input);
      expect(shown()).toHaveLength(1);
    });
  });

  describe('keyboard focus and the mouse', () => {
    const TWO = `
      <button id="first" ckButton aria-label="Start" ckTooltip="Starts it" [ckTooltipShowDelay]="0">Start</button>
      <button id="second" ckButton aria-label="Skip" ckTooltip="Skips it" [ckTooltipShowDelay]="0">Skip</button>`;

    it('keeps a keyboard-shown tooltip when the mouse crosses the host', async () => {
      fakeTimers();
      const { fixture, root } = mount(TWO);
      await settle(fixture);
      await userEvent.tab();
      expect(shown().map((bubble) => bubble.textContent)).toEqual(['Starts it']);
      pointer(find(root, '#first'), 'pointerenter');
      pointer(find(root, '#first'), 'pointerleave');
      vi.advanceTimersByTime(1000);
      expect(shown().map((bubble) => bubble.textContent)).toEqual(['Starts it']);
    });

    it('shows the hovered tooltip, then gives the focused one back when the hover ends', async () => {
      fakeTimers();
      const { fixture, root } = mount(TWO);
      await settle(fixture);
      await userEvent.tab();
      pointer(find(root, '#second'), 'pointerenter');
      expect(shown().map((bubble) => bubble.textContent)).toEqual(['Skips it']);
      pointer(find(root, '#second'), 'pointerleave');
      vi.advanceTimersByTime(100);
      expect(shown().map((bubble) => bubble.textContent)).toEqual(['Starts it']);
    });

    it('does not bring a tooltip back once its host lost focus, or after Escape', async () => {
      fakeTimers();
      const { fixture, root } = mount(TWO);
      await settle(fixture);
      await userEvent.tab();
      pointer(find(root, '#second'), 'pointerenter');
      find(root, '#first').blur();
      pointer(find(root, '#second'), 'pointerleave');
      vi.advanceTimersByTime(500);
      expect(shown()).toHaveLength(0);
      await userEvent.tab();
      pointer(find(root, '#second'), 'pointerenter');
      press(find(root, '#second'), 'Escape');
      vi.advanceTimersByTime(500);
      expect(shown()).toHaveLength(0);
    });
  });

  describe('placement while things change', () => {
    it('follows the host when it changes size, without any scroll or resize event', async () => {
      const { fixture, root } = mount(
        `<div style="padding: 200px 300px"><button id="target" ckButton aria-label="Rest timer" ckTooltip="Hi" ckTooltipPosition="below">Rest</button></div>`,
      );
      await settle(fixture);
      const target = find(root, '#target');
      fixture.debugElement.query(By.directive(CkTooltip)).injector.get(CkTooltip).show();
      const bubble = shown()[0];
      target.style.width = '300px';
      await wait(80);
      const box = bubble.getBoundingClientRect();
      const host = target.getBoundingClientRect();
      expect(box.left + box.width / 2).toBeCloseTo(host.left + host.width / 2, 0);
    });

    it('places again once an ancestor animation is over', async () => {
      const style = document.createElement('style');
      style.textContent =
        '@keyframes ck-spec-slide { from { transform: translateX(150px) } to { transform: none } }';
      document.head.append(style);
      try {
        const { fixture, root } = mount(
          `<div id="slider" style="animation: ck-spec-slide 250ms linear both; padding: 200px 100px"><button id="target" ckButton aria-label="Rest timer" ckTooltip="Hi" ckTooltipPosition="below">Rest</button></div>`,
        );
        await settle(fixture);
        const target = find(root, '#target');
        fixture.debugElement.query(By.directive(CkTooltip)).injector.get(CkTooltip).show();
        const bubble = shown()[0];
        await wait(450);
        const box = bubble.getBoundingClientRect();
        const host = target.getBoundingClientRect();
        expect(box.left + box.width / 2).toBeCloseTo(host.left + host.width / 2, 0);
      } finally {
        style.remove();
      }
    });

    it('takes its direction from the host, not from the page', async () => {
      const { fixture, root } = mount(
        `<div dir="rtl"><button id="rtl" ckButton aria-label="One" ckTooltip="Hi">One</button></div>
         <button id="ltr" ckButton aria-label="Two" ckTooltip="Hi">Two</button>`,
      );
      await settle(fixture);
      const tooltips = fixture.debugElement
        .queryAll(By.directive(CkTooltip))
        .map((element) => element.injector.get(CkTooltip));
      tooltips[0].show();
      expect(shown()[0].dir).toBe('rtl');
      expect(getComputedStyle(shown()[0]).direction).toBe('rtl');
      tooltips[1].show();
      expect(shown()[0].dir).toBe('ltr');
      expect(find(root, '#rtl')).toBeDefined();
    });

    it('sets and restores -webkit-user-select with user-select while a finger is down', async () => {
      fakeTimers();
      const { fixture, root } = mount(
        `<button id="target" ckButton aria-label="Rest timer" ckTooltip="Hi" style="user-select: text">Rest</button>`,
      );
      await settle(fixture);
      const target = find(root, '#target');
      pointer(target, 'pointerdown', { pointerType: 'touch' });
      expect(target.style.getPropertyValue('user-select')).toBe('none');
      expect(target.style.getPropertyValue('-webkit-user-select')).toBe('none');
      pointer(target, 'pointerup', { pointerType: 'touch' });
      expect(target.style.getPropertyValue('user-select')).toBe('text');
      expect(target.style.getPropertyValue('-webkit-user-select')).toBe('text');
    });
  });

  describe('behind a modal and over other overlays', () => {
    it('never shows for a host inside an inert page, from show(), hover or focus', async () => {
      const { fixture, host, root } = mount(
        `<button id="target" ckButton aria-label="Rest timer" ckTooltip="Hi" [ckTooltipShowDelay]="0">Rest</button>
         <ng-template #dialogTemplate><h2 ckDialogTitle>Modal</h2><button ckButton ckDialogClose>Close</button></ng-template>`,
      );
      await settle(fixture);
      host.openDialog();
      await settle(fixture);
      await wait(350);
      const target = find(root, '#target');
      expect(target.closest('[inert]')).not.toBeNull();
      const tooltip = fixture.debugElement.query(By.directive(CkTooltip)).injector.get(CkTooltip);
      tooltip.show();
      pointer(target, 'pointerenter');
      target.dispatchEvent(new FocusEvent('focus'));
      expect(shown()).toHaveLength(0);
      expect(tooltip.isVisible()).toBe(false);
      expect(layer()!.childElementCount).toBe(1);
    });

    it('hides only the tooltip on the first Escape inside an open menu, and closes the menu on the second', async () => {
      const { fixture, root } = mount(
        `<button id="trigger" ckButton aria-label="Actions" [ckMenuTrigger]="menuTemplate">Actions</button>
         <ng-template #menuTemplate>
           <ck-menu>
             <button ckMenuItem ckTooltip="Begins the workout">Start</button>
             <button ckMenuItem>Edit</button>
           </ck-menu>
         </ng-template>`,
      );
      await settle(fixture);
      const trigger = find(root, '#trigger');
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      await settle(fixture);
      await wait(100);
      expect(document.querySelector('ck-menu')).not.toBeNull();
      expect(shown().map((bubble) => bubble.textContent)).toEqual(['Begins the workout']);
      await userEvent.keyboard('{Escape}');
      await settle(fixture);
      expect(shown()).toHaveLength(0);
      expect(document.querySelector('ck-menu')).not.toBeNull();
      await userEvent.keyboard('{Escape}');
      await settle(fixture);
      await wait(350);
      expect(document.querySelector('ck-menu')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it('does not close an open menu when the pointer presses its visible tooltip', async () => {
      const { fixture, root } = mount(
        `<button id="trigger" ckButton aria-label="Actions" [ckMenuTrigger]="menuTemplate">Actions</button>
         <ng-template #menuTemplate>
           <ck-menu>
             <button ckMenuItem ckTooltip="Begins the workout" ckTooltipPosition="end">Start</button>
             <button ckMenuItem>Edit</button>
           </ck-menu>
         </ng-template>`,
      );
      root.style.padding = '100px';
      await settle(fixture);
      find(root, '#trigger').focus();
      await userEvent.keyboard('{Enter}');
      await settle(fixture);
      await wait(100);
      const bubble = shown()[0];
      expect(bubble).toBeDefined();
      await userEvent.click(bubble);
      await settle(fixture);
      await wait(100);
      expect(document.querySelector('ck-menu')).not.toBeNull();
      await userEvent.click(find(root, '#trigger'));
      await settle(fixture);
      await wait(350);
      expect(document.querySelector('ck-menu')).toBeNull();
    });
  });
});
