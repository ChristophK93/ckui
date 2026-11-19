import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { userEvent } from 'vitest/browser';
import {
  ROW_MENU,
  cancelButton,
  cleanUp,
  fakeMedia,
  itemText,
  items,
  labels,
  menu,
  mount,
  overlayPanels,
  panel,
  press,
  settle,
  trigger,
  wait,
} from '../testing/menu-host';

describe('CkMenuTrigger and CkMenu', () => {
  afterEach(async () => {
    cleanUp();
    await wait(0);
  });

  async function setup(
    template = ROW_MENU(),
    prepare?: Parameters<typeof mount>[1],
    beforeRender?: Parameters<typeof mount>[2],
  ) {
    const mounted = mount(template, prepare, beforeRender);
    await settle(mounted.fixture);
    return { ...mounted, trigger: trigger(mounted.root) };
  }

  async function open(template = ROW_MENU(), prepare?: Parameters<typeof mount>[1]) {
    const mounted = await setup(template, prepare);
    mounted.trigger.click();
    await settle(mounted.fixture);
    return mounted;
  }

  describe('the trigger', () => {
    it('is a collapsed menu button with no aria-controls while closed', async () => {
      const { trigger } = await setup();
      expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(trigger.hasAttribute('aria-controls')).toBe(false);
      expect(trigger.hasAttribute('id')).toBe(false);
      expect(trigger.classList.contains('ck-button')).toBe(true);
      expect(menu()).toBeNull();
    });

    it('points aria-controls at the menu and expands while it is open, and gives both back', async () => {
      const { fixture, trigger } = await open();
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(trigger.getAttribute('aria-controls')).toBe(menu()!.id);
      expect(menu()!.id).not.toBe('');
      trigger.click();
      await settle(fixture);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(trigger.hasAttribute('aria-controls')).toBe(false);
    });

    it('names the menu by the button: a generated id lives only while it is open', async () => {
      const { fixture, trigger } = await open();
      expect(trigger.id).not.toBe('');
      expect(menu()!.getAttribute('aria-labelledby')).toBe(trigger.id);
      expect(menu()!.getAttribute('role')).toBe('menu');
      expect(menu()!.getAttribute('aria-orientation')).toBe('vertical');
      trigger.click();
      await settle(fixture);
      expect(trigger.hasAttribute('id')).toBe(false);
    });

    it('never overwrites an id the consumer set, static or bound, and keeps it afterwards', async () => {
      const staticId = await open(ROW_MENU('id="mine"'));
      expect(staticId.trigger.id).toBe('mine');
      expect(menu()!.getAttribute('aria-labelledby')).toBe('mine');
      staticId.trigger.click();
      await settle(staticId.fixture);
      expect(staticId.trigger.id).toBe('mine');
      cleanUp();

      const bound = await open(ROW_MENU('[id]="triggerId()"'), (host) =>
        host.triggerId.set('bound'),
      );
      expect(bound.trigger.id).toBe('bound');
      expect(menu()!.getAttribute('aria-labelledby')).toBe('bound');
      bound.host.triggerId.set('changed');
      await settle(bound.fixture);
      expect(bound.trigger.id).toBe('changed');
      bound.trigger.click();
      await settle(bound.fixture);
      expect(bound.trigger.id).toBe('changed');
    });

    it('keeps a consumer aria-controls and aria-haspopup, static, through a round trip', async () => {
      const { fixture, trigger } = await setup(
        ROW_MENU('aria-controls="their-panel" aria-haspopup="dialog"'),
      );
      expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
      expect(trigger.getAttribute('aria-controls')).toBe('their-panel');
      trigger.click();
      await settle(fixture);
      expect(trigger.getAttribute('aria-controls')).toBe(menu()!.id);
      trigger.click();
      await settle(fixture);
      expect(trigger.getAttribute('aria-controls')).toBe('their-panel');
      trigger.click();
      await settle(fixture);
      trigger.click();
      await settle(fixture);
      expect(trigger.getAttribute('aria-controls')).toBe('their-panel');
    });

    it('keeps a bound aria-controls, also when the bound value changes between rounds', async () => {
      const { fixture, host, trigger } = await setup(
        ROW_MENU('[attr.aria-controls]="controls()"'),
        (state) => state.controls.set('first'),
      );
      expect(trigger.getAttribute('aria-controls')).toBe('first');
      trigger.click();
      await settle(fixture);
      expect(trigger.getAttribute('aria-controls')).toBe(menu()!.id);
      trigger.click();
      await settle(fixture);
      expect(trigger.getAttribute('aria-controls')).toBe('first');
      host.controls.set('second');
      await settle(fixture);
      expect(trigger.getAttribute('aria-controls')).toBe('second');
      trigger.click();
      await settle(fixture);
      trigger.click();
      await settle(fixture);
      expect(trigger.getAttribute('aria-controls')).toBe('second');
      host.controls.set(null);
      await settle(fixture);
      expect(trigger.hasAttribute('aria-controls')).toBe(false);
    });

    it('keeps the attributes of ckButton and the consumer on the same element', async () => {
      const { trigger } = await setup(ROW_MENU('title="Row actions" data-x="1"'));
      expect(trigger.getAttribute('type')).toBe('button');
      expect(trigger.getAttribute('title')).toBe('Row actions');
      expect(trigger.getAttribute('data-x')).toBe('1');
      expect(trigger.getAttribute('aria-label')).toBe('Actions for Sweet Spot');
    });

    it('works on a button that is not a ckButton', async () => {
      const { fixture, trigger } = await setup(
        `<button type="button" class="trigger" [ckMenuTrigger]="m" aria-label="More">…</button>
         <ng-template #m><ck-menu><button ckMenuItem>One</button></ck-menu></ng-template>`,
      );
      trigger.click();
      await settle(fixture);
      expect(labels()).toEqual(['One']);
    });

    it('does nothing for a disabled button and for a missing template', async () => {
      const { fixture, trigger } = await setup(ROW_MENU('disabled'));
      trigger.click();
      press(trigger, 'ArrowDown');
      await settle(fixture);
      expect(menu()).toBeNull();
      cleanUp();

      const missing = await setup(
        `<button type="button" class="trigger" [ckMenuTrigger]="null" aria-label="More">…</button>`,
      );
      missing.trigger.click();
      press(missing.trigger, 'ArrowDown');
      await settle(missing.fixture);
      expect(menu()).toBeNull();
      expect(missing.trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('exposes open(), close() and isOpen, and reports both outputs once per round', async () => {
      const { fixture, host } = await setup(
        `<button type="button" class="trigger" #t="ckMenuTrigger" [ckMenuTrigger]="m" aria-label="More"
           (menuOpened)="opened.set(opened() + 1)" (menuClosed)="closed.set(closed() + 1)">…</button>
         <span id="state">{{ t.isOpen() }}</span>
         <button type="button" id="open" (click)="t.open()">open</button>
         <button type="button" id="close" (click)="t.close()">close</button>
         <ng-template #m><ck-menu><button ckMenuItem>One</button></ck-menu></ng-template>`,
      );
      const state = () => fixture.nativeElement.querySelector('#state').textContent;
      expect(state()).toBe('false');
      fixture.nativeElement.querySelector('#open').click();
      await settle(fixture);
      expect(state()).toBe('true');
      expect(menu()).not.toBeNull();
      fixture.nativeElement.querySelector('#open').click();
      await settle(fixture);
      expect(host.opened()).toBe(1);
      fixture.nativeElement.querySelector('#close').click();
      fixture.nativeElement.querySelector('#close').click();
      await settle(fixture);
      expect(state()).toBe('false');
      expect(menu()).toBeNull();
      expect(host.closed()).toBe(1);
      fixture.nativeElement.querySelector('#open').click();
      await settle(fixture);
      expect([host.opened(), host.closed()]).toEqual([2, 1]);
    });

    it('warns in development about a missing name and about a host that is not a button', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture } = await setup(
        `<button type="button" [ckMenuTrigger]="m"></button>
         <ng-template #m><ck-menu></ck-menu></ng-template>`,
      );
      const messages = warn.mock.calls.map((call) => String(call[0]));
      expect(messages.some((message) => message.includes('no accessible name'))).toBe(true);
      expect(messages.some((message) => message.includes('native <button>'))).toBe(false);
      warn.mockClear();
      cleanUp();

      const other = mount(
        '<a [ckMenuTrigger]="m" aria-label="More">x</a><ng-template #m><ck-menu></ck-menu></ng-template>',
      );
      await settle(other.fixture);
      const otherMessages = warn.mock.calls.map((call) => String(call[0]));
      expect(otherMessages.some((message) => message.includes('native <button>'))).toBe(true);
      expect(fixture).toBeDefined();
    });
  });

  describe('opening', () => {
    it('opens on a click and focuses the first enabled item', async () => {
      const { trigger } = await open();
      expect(labels()).toEqual(['Start', 'Edit', 'Copy', 'Delete']);
      expect(document.activeElement).toBe(items()[0]);
      expect(items().map((item) => item.tabIndex)).toEqual([0, -1, -1, -1]);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });

    it('opens on Enter and on Space from the trigger with the first item focused', async () => {
      const { fixture, trigger } = await setup();
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      await settle(fixture);
      expect(document.activeElement).toBe(items()[0]);
      await userEvent.keyboard('{Escape}');
      await settle(fixture);
      expect(menu()).toBeNull();
      expect(document.activeElement).toBe(trigger);
      await userEvent.keyboard(' ');
      await settle(fixture);
      expect(menu()).not.toBeNull();
      expect(document.activeElement).toBe(items()[0]);
    });

    it('opens on ArrowDown with the first item and on ArrowUp with the last, and prevents the scroll', async () => {
      const { fixture, trigger } = await setup();
      trigger.focus();
      expect(press(trigger, 'ArrowDown').defaultPrevented).toBe(true);
      await settle(fixture);
      expect(document.activeElement).toBe(items()[0]);
      press(items()[0], 'Escape');
      await settle(fixture);
      expect(menu()).toBeNull();
      expect(press(trigger, 'ArrowUp').defaultPrevented).toBe(true);
      await settle(fixture);
      expect(document.activeElement).toBe(items()[3]);
      expect(items().map((item) => item.tabIndex)).toEqual([-1, -1, -1, 0]);
    });

    it('ignores ArrowDown with a modifier and other keys', async () => {
      const { fixture, trigger } = await setup();
      trigger.focus();
      press(trigger, 'ArrowDown', { altKey: true });
      press(trigger, 'ArrowDown', { ctrlKey: true });
      press(trigger, 'a');
      press(trigger, 'Home');
      await settle(fixture);
      expect(menu()).toBeNull();
    });

    it('starts on the first item that is not disabled and falls back when all are', async () => {
      const first = await open(
        `<button class="trigger" [ckMenuTrigger]="m" aria-label="More">…</button>
         <ng-template #m><ck-menu>
           <button ckMenuItem disabled>One</button><button ckMenuItem>Two</button><button ckMenuItem disabled>Three</button>
         </ck-menu></ng-template>`,
      );
      expect(document.activeElement).toBe(items()[1]);
      first.trigger.click();
      await settle(first.fixture);
      press(first.trigger, 'ArrowUp');
      await settle(first.fixture);
      expect(document.activeElement).toBe(items()[1]);
      cleanUp();

      await open(
        `<button class="trigger" [ckMenuTrigger]="m" aria-label="More">…</button>
         <ng-template #m><ck-menu>
           <button ckMenuItem disabled>One</button><button ckMenuItem disabled>Two</button>
         </ck-menu></ng-template>`,
      );
      expect(document.activeElement).toBe(items()[0]);
    });

    it('opens an empty menu and focuses the panel without an error', async () => {
      await open(
        `<button class="trigger" [ckMenuTrigger]="m" aria-label="More">…</button>
         <ng-template #m><ck-menu></ck-menu></ng-template>`,
      );
      expect(menu()).not.toBeNull();
      expect(items()).toEqual([]);
      expect(panel()!.closest('.ck-overlay')!.contains(document.activeElement)).toBe(true);
    });

    it('closes with a second click on the trigger (it is a toggle)', async () => {
      const { fixture, trigger } = await open();
      await userEvent.click(trigger);
      await settle(fixture);
      expect(menu()).toBeNull();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      await userEvent.click(trigger);
      await settle(fixture);
      expect(menu()).not.toBeNull();
    });

    it('opens one menu at a time from the same trigger, also with a rapid triple click', async () => {
      const { fixture, trigger } = await setup();
      trigger.click();
      trigger.click();
      trigger.click();
      await settle(fixture);
      expect(document.querySelectorAll('ck-menu').length).toBe(1);
    });

    it('names its popover without a role or aria-modal', async () => {
      await open();
      const overlay = panel()!.closest<HTMLElement>('.ck-overlay')!;
      expect(overlay.hasAttribute('role')).toBe(false);
      expect(overlay.hasAttribute('aria-modal')).toBe(false);
      expect(overlayPanels()).toHaveLength(1);
    });
  });

  describe('closing', () => {
    it('closes on Escape and gives focus back to the trigger', async () => {
      const { fixture, trigger } = await open();
      await userEvent.keyboard('{Escape}');
      await settle(fixture);
      expect(menu()).toBeNull();
      expect(document.activeElement).toBe(trigger);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('closes on Tab and lets focus move on from the trigger to the next element', async () => {
      const { fixture } = await open();
      await userEvent.keyboard('{Tab}');
      await settle(fixture);
      expect(menu()).toBeNull();
      expect(document.activeElement?.id).toBe('after');
    });

    it('closes on Shift+Tab and moves on to the element before the trigger', async () => {
      const { fixture } = await open();
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
      await settle(fixture);
      expect(menu()).toBeNull();
      expect(document.activeElement?.id).toBe('before');
    });

    it('closes on an outside press without taking focus from what was pressed', async () => {
      const { fixture } = await open();
      const after = document.getElementById('after')!;
      await userEvent.click(after);
      await settle(fixture);
      expect(menu()).toBeNull();
      expect(document.activeElement).toBe(after);
    });

    it('closes when focus moves elsewhere', async () => {
      const { fixture } = await open();
      document.getElementById('after')!.focus();
      await settle(fixture);
      expect(menu()).toBeNull();
      expect(document.activeElement?.id).toBe('after');
    });

    it('closes when the trigger is scrolled out of view', async () => {
      const { fixture, trigger } = await setup(
        `<div id="scroller" style="block-size: 80px; overflow: auto">
           <div style="block-size: 400px">${ROW_MENU()}</div>
         </div>`,
      );
      trigger.click();
      await settle(fixture);
      expect(menu()).not.toBeNull();
      document.getElementById('scroller')!.scrollTop = 300;
      await wait(100);
      await settle(fixture);
      expect(menu()).toBeNull();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('ignores a press inside the menu padding and keeps focus on the item', async () => {
      const { fixture } = await open();
      const focused = document.activeElement;
      const box = menu()!.getBoundingClientRect();
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: box.left + 1,
        clientY: box.top + 1,
      });
      menu()!.dispatchEvent(event);
      await settle(fixture);
      expect(event.defaultPrevented).toBe(true);
      expect(menu()).not.toBeNull();
      expect(document.activeElement).toBe(focused);
    });
  });

  describe('server', () => {
    it('renders the trigger only and opens nothing', async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const { fixture, trigger } = await setup();
      expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      trigger.click();
      press(trigger, 'ArrowDown');
      await settle(fixture);
      expect(menu()).toBeNull();
      expect(overlayPanels()).toEqual([]);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('sheet', () => {
    it('opens a dialog sheet named and titled with the trigger name, and ends in a Cancel row', async () => {
      fakeMedia(true);
      const { fixture } = await open();
      const sheet = document.querySelector<HTMLElement>('.ck-overlay--sheet')!;
      expect(sheet.getAttribute('role')).toBe('dialog');
      expect(sheet.getAttribute('aria-modal')).toBe('true');
      expect(sheet.getAttribute('aria-label')).toBe('Actions for Sweet Spot');
      expect(sheet.querySelector('.ck-menu-panel__title')!.textContent!.trim()).toBe(
        'Actions for Sweet Spot',
      );
      expect(labels()).toEqual(['Start', 'Edit', 'Copy', 'Delete']);
      expect(itemText(cancelButton()!)).toBe('Cancel');
      expect(cancelButton()!.hasAttribute('role')).toBe(false);
      expect(menu()!.contains(cancelButton())).toBe(false);
      expect(items()).not.toContain(cancelButton());
      void fixture;
    });
  });
});
