import { userEvent } from 'vitest/browser';
import {
  ROW_MENU,
  cleanUp,
  items,
  labels,
  menu,
  mount,
  press,
  settle,
  trigger,
  wait,
} from '../testing/menu-host';

const FRUIT = `
  <button type="button" class="trigger" [ckMenuTrigger]="m" aria-label="Fruit">Fruit</button>
  <ng-template #m>
    <ck-menu>
      <button ckMenuItem (click)="log('apple')">Apple</button>
      <button ckMenuItem (click)="log('apricot')">Apricot</button>
      <button ckMenuItem disabled (click)="log('avocado')">Avocado</button>
      <button ckMenuItem (click)="log('banana')">Banana</button>
      <button ckMenuItem (click)="log('blueberry')">Blueberry</button>
      <button ckMenuItem (click)="log('cherry')"><svg ckMenuItemIcon></svg>Cherry <b>pie</b></button>
    </ck-menu>
  </ng-template>
`;

const active = () => items().indexOf(document.activeElement as HTMLButtonElement);

describe('CkMenu keyboard', () => {
  afterEach(async () => {
    cleanUp();
    await wait(0);
  });

  async function open(template = FRUIT, prepare?: Parameters<typeof mount>[1]) {
    const mounted = mount(template, prepare);
    await settle(mounted.fixture);
    const button = trigger(mounted.root);
    button.click();
    await settle(mounted.fixture);
    return { ...mounted, trigger: button };
  }

  describe('moving', () => {
    it('moves down and up through every item, disabled ones included', async () => {
      await open();
      expect(active()).toBe(0);
      await userEvent.keyboard('{ArrowDown}');
      expect(active()).toBe(1);
      await userEvent.keyboard('{ArrowDown}');
      expect(active()).toBe(2);
      expect(document.activeElement!.getAttribute('aria-disabled')).toBe('true');
      await userEvent.keyboard('{ArrowDown}{ArrowDown}');
      expect(active()).toBe(4);
      await userEvent.keyboard('{ArrowUp}');
      expect(active()).toBe(3);
    });

    it('wraps from the last item to the first and from the first to the last', async () => {
      await open();
      await userEvent.keyboard('{ArrowUp}');
      expect(active()).toBe(5);
      await userEvent.keyboard('{ArrowDown}');
      expect(active()).toBe(0);
    });

    it('jumps with Home and End and prevents the page from scrolling', async () => {
      await open();
      const end = press(document.activeElement!, 'End');
      expect(end.defaultPrevented).toBe(true);
      expect(active()).toBe(5);
      const home = press(document.activeElement!, 'Home');
      expect(home.defaultPrevented).toBe(true);
      expect(active()).toBe(0);
      expect(press(document.activeElement!, 'ArrowDown').defaultPrevented).toBe(true);
    });

    it('keeps one tab stop: the focused item has tabindex 0 and the others -1', async () => {
      await open();
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
      expect(items().map((item) => item.tabIndex)).toEqual([-1, -1, -1, 0, -1, -1]);
      await userEvent.keyboard('{End}');
      expect(items().map((item) => item.tabIndex)).toEqual([-1, -1, -1, -1, -1, 0]);
    });

    it('ignores Alt, Ctrl and Meta combinations and the left and right arrows', async () => {
      await open();
      press(document.activeElement!, 'ArrowDown', { altKey: true });
      press(document.activeElement!, 'ArrowDown', { ctrlKey: true });
      press(document.activeElement!, 'End', { metaKey: true });
      press(document.activeElement!, 'b', { ctrlKey: true });
      press(document.activeElement!, 'ArrowRight');
      press(document.activeElement!, 'ArrowLeft');
      expect(active()).toBe(0);
      expect(menu()).not.toBeNull();
    });

    it('stays put while a composition is running', async () => {
      await open();
      press(document.activeElement!, 'ArrowDown', { isComposing: true });
      expect(active()).toBe(0);
    });

    it('moves on the first key press of a held arrow without skipping an item', async () => {
      await open();
      await userEvent.keyboard('{ArrowDown>3/}');
      expect(active()).toBe(3);
    });
  });

  describe('typeahead', () => {
    it('moves to the next item that starts with the typed letter, disabled items included', async () => {
      await open();
      await userEvent.keyboard('a');
      expect(active()).toBe(1);
      await userEvent.keyboard('a');
      expect(active()).toBe(2);
      expect(document.activeElement!.getAttribute('aria-disabled')).toBe('true');
    });

    it('cycles through the items of one letter, and wraps', async () => {
      await open();
      await userEvent.keyboard('bb');
      expect(active()).toBe(4);
      await userEvent.keyboard('b');
      expect(active()).toBe(3);
    });

    it('builds a prefix from letters typed in a row', async () => {
      await open();
      await userEvent.keyboard('bl');
      expect(active()).toBe(4);
    });

    it('starts a new search after the typing window', async () => {
      await open();
      vi.useFakeTimers({ toFake: ['Date'], now: 1000 });
      press(document.activeElement!, 'b');
      expect(active()).toBe(3);
      vi.setSystemTime(1200);
      press(document.activeElement!, 'l');
      expect(active()).toBe(4);
      vi.setSystemTime(1900);
      press(document.activeElement!, 'c');
      expect(active()).toBe(5);
    });

    it('keeps a prefix inside the window and drops it just after', async () => {
      await open();
      vi.useFakeTimers({ toFake: ['Date'], now: 1000 });
      press(document.activeElement!, 'a');
      expect(active()).toBe(1);
      vi.setSystemTime(1500);
      press(document.activeElement!, 'p');
      expect(active()).toBe(1);
      vi.setSystemTime(2100);
      press(document.activeElement!, 'p');
      expect(active()).toBe(1);
    });

    it('leaves the focus where it is when nothing matches', async () => {
      await open();
      await userEvent.keyboard('z');
      expect(active()).toBe(0);
    });

    it('matches an uppercase letter and reads the text of the label', async () => {
      await open();
      await userEvent.keyboard('C');
      expect(active()).toBe(5);
      await userEvent.keyboard('{Home}');
      vi.useFakeTimers({ toFake: ['Date'], now: 5000 });
      for (const [time, key] of [
        [5000, 'c'],
        [5100, 'h'],
        [5200, 'e'],
      ] as const) {
        vi.setSystemTime(time);
        press(document.activeElement!, key);
      }
      expect(active()).toBe(5);
    });

    it('does not run a disabled item on typeahead and keeps the menu open', async () => {
      const { host } = await open();
      await userEvent.keyboard('aa');
      expect(active()).toBe(2);
      expect(host.calls).toEqual([]);
      expect(menu()).not.toBeNull();
    });

    it('treats a space inside a running search as part of it and does not press the item', async () => {
      const { host } = await open(
        FRUIT.replace('Blueberry', 'Blue berry').replace('Banana', 'Blue banana'),
      );
      await userEvent.keyboard('blue ');
      await settle();
      expect(active()).toBe(3);
      expect(host.calls).toEqual([]);
      expect(menu()).not.toBeNull();
      await userEvent.keyboard('b');
      expect(active()).toBe(3);
    });

    it('uses a leading space to press, not to search', async () => {
      const { fixture, host } = await open();
      await userEvent.keyboard(' ');
      await settle(fixture);
      expect(host.calls).toEqual(['apple']);
    });

    it('does not swallow modifier and function keys', async () => {
      await open();
      expect(press(document.activeElement!, 'Shift').defaultPrevented).toBe(false);
      expect(press(document.activeElement!, 'F5').defaultPrevented).toBe(false);
    });
  });

  describe('pressing', () => {
    it('presses with Enter: closes first, then runs the handler once', async () => {
      const { fixture, host, trigger } = await open();
      await userEvent.keyboard('{Enter}');
      await settle(fixture);
      expect(host.calls).toEqual(['apple']);
      expect(menu()).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it('presses with Space on its release, once', async () => {
      const { fixture, host, trigger } = await open();
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard(' ');
      await settle(fixture);
      expect(host.calls).toEqual(['apricot']);
      expect(menu()).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it('does nothing with Enter and Space on a disabled item and keeps the menu open and focused', async () => {
      const { host } = await open();
      await userEvent.keyboard('{ArrowDown}{ArrowDown}');
      expect(active()).toBe(2);
      await userEvent.keyboard('{Enter}');
      await userEvent.keyboard(' ');
      expect(host.calls).toEqual([]);
      expect(menu()).not.toBeNull();
      expect(active()).toBe(2);
    });

    it('does nothing on a click of a disabled item either, even with a bubbling listener above it', async () => {
      const { fixture, host } = await open();
      const outside = vi.fn();
      menu()!.addEventListener('click', outside);
      const disabled = items()[2];
      disabled.click();
      await settle(fixture);
      expect(host.calls).toEqual([]);
      expect(menu()).not.toBeNull();
      expect(outside).not.toHaveBeenCalled();
    });

    it('presses the item under the mouse and closes before the handler runs', async () => {
      const { fixture, host, trigger } = await open();
      await userEvent.click(items()[1]);
      await settle(fixture);
      expect(host.calls).toEqual(['apricot']);
      expect(menu()).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it('follows the disabled input with aria-disabled and never sets the native attribute', async () => {
      const { fixture, host } = await open(
        `<button type="button" class="trigger" [ckMenuTrigger]="m" aria-label="Fruit">Fruit</button>
         <ng-template #m><ck-menu>
           <button ckMenuItem [disabled]="locked()" (click)="log('one')">One</button>
         </ck-menu></ng-template>`,
        (state) => state.locked.set(true),
      );
      expect(items()[0].getAttribute('aria-disabled')).toBe('true');
      expect(items()[0].hasAttribute('disabled')).toBe(false);
      host.locked.set(false);
      await settle(fixture);
      expect(items()[0].hasAttribute('aria-disabled')).toBe(false);
      items()[0].click();
      await settle(fixture);
      expect(host.calls).toEqual(['one']);
    });
  });

  describe('items that change while the menu is open', () => {
    const LIST = `
      <button type="button" class="trigger" [ckMenuTrigger]="m" aria-label="List">List</button>
      <ng-template #m><ck-menu>
        @for (item of items(); track item.id) {
          <button ckMenuItem [disabled]="item.disabled ?? false" (click)="log(item.label)">{{ item.label }}</button>
        }
      </ck-menu></ng-template>`;

    it('takes an item that is added into the arrow order', async () => {
      const { fixture, host } = await open(LIST);
      host.items.update((list) => [...list, { id: 4, label: 'Delete' }]);
      await settle(fixture);
      expect(labels()).toEqual(['Start', 'Edit', 'Copy', 'Delete']);
      await userEvent.keyboard('{ArrowUp}');
      expect(active()).toBe(3);
    });

    it('moves focus to a neighbour when the focused item is removed, never to the page', async () => {
      const { fixture, host } = await open(LIST);
      await userEvent.keyboard('{ArrowDown}');
      expect(active()).toBe(1);
      host.items.update((list) => list.filter((item) => item.id !== 2));
      await settle(fixture);
      await wait(20);
      expect(labels()).toEqual(['Start', 'Copy']);
      expect(document.activeElement).not.toBe(document.body);
      expect(menu()!.contains(document.activeElement)).toBe(true);
      await userEvent.keyboard('{ArrowDown}');
      expect(menu()!.contains(document.activeElement)).toBe(true);
    });

    it('survives losing every item and getting some back', async () => {
      const { fixture, host } = await open(LIST);
      host.items.set([]);
      await settle(fixture);
      await wait(20);
      expect(items()).toEqual([]);
      expect(document.activeElement).not.toBe(document.body);
      await userEvent.keyboard('{ArrowDown}{End}a');
      host.items.set([{ id: 9, label: 'Back' }]);
      await settle(fixture);
      expect(labels()).toEqual(['Back']);
      expect(items()[0].tabIndex).toBe(0);
    });

    it('keeps the item that has focus when another one before it is added', async () => {
      const { fixture, host } = await open(LIST);
      await userEvent.keyboard('{ArrowDown}');
      host.items.update((list) => [{ id: 0, label: 'Zero' }, ...list]);
      await settle(fixture);
      expect(document.activeElement).toBe(items()[2]);
      expect(items()[2].tabIndex).toBe(0);
      expect(items()[0].tabIndex).toBe(-1);
    });
  });

  describe('the trigger while the menu is open', () => {
    it('moves into the menu with ArrowDown and ArrowUp when the trigger has focus again', async () => {
      const { trigger } = await open(ROW_MENU());
      trigger.focus();
      press(trigger, 'ArrowUp');
      expect(document.activeElement).toBe(items().at(-1));
      trigger.focus();
      press(trigger, 'ArrowDown');
      expect(document.activeElement).toBe(items()[0]);
    });
  });
});
