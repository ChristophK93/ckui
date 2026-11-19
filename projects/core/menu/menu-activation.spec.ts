import { userEvent } from 'vitest/browser';
import {
  cleanUp,
  items,
  menu,
  mount,
  overlayPanels,
  settle,
  trigger,
  wait,
} from '../testing/menu-host';

const DIALOG_MENU = `
  <button type="button" class="trigger" [ckMenuTrigger]="m" aria-label="Actions">Actions</button>
  <ng-template #m>
    <ck-menu>
      <button ckMenuItem (click)="log('edit')">Edit</button>
      <button ckMenuItem tone="danger" (click)="openDialog()">Delete</button>
    </ck-menu>
  </ng-template>
  <ng-template #dialogTemplate>
    <h2>Delete this workout?</h2>
    <button type="button" class="confirm">Delete</button>
  </ng-template>
`;

const dialogPanel = () => document.querySelector<HTMLElement>('.ck-dialog-panel');

describe('CkMenuItem activation order', () => {
  afterEach(async () => {
    cleanUp();
    await wait(0);
  });

  async function setup(template: string) {
    const mounted = mount(template, undefined, undefined);
    await settle(mounted.fixture);
    return { ...mounted, trigger: trigger(mounted.root) };
  }

  it('runs the handler after the menu has started closing: the trigger is already collapsed and focused', async () => {
    const { fixture, host, trigger } = await setup(`
      <button type="button" class="trigger" [ckMenuTrigger]="m" aria-label="Actions">Actions</button>
      <ng-template #m><ck-menu>
        <button ckMenuItem (click)="log(probe())">Edit</button>
      </ck-menu></ng-template>`);
    const bounding = '.cdk-overlay-connected-position-bounding-box';
    Object.assign(host, {
      probe: () =>
        `focus on trigger: ${document.activeElement === trigger}, menu inert: ${document.querySelector<HTMLElement>(bounding)?.inert}`,
    });
    trigger.click();
    await settle(fixture);
    items()[0].click();
    await settle(fixture);
    expect(host.calls).toEqual(['focus on trigger: true, menu inert: true']);
  });

  it('opens a real dialog from an item: the menu is gone, the dialog is open, and closing it returns focus to the trigger', async () => {
    const { fixture, host, trigger } = await setup(DIALOG_MENU);
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await settle(fixture);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await settle(fixture);
    await wait(20);
    expect(menu()).toBeNull();
    expect(overlayPanels().some((panel) => panel.classList.contains('ck-overlay--popover'))).toBe(
      false,
    );
    expect(dialogPanel()).not.toBeNull();
    expect(document.activeElement).toBe(document.querySelector('.confirm'));
    host.dialogs[0].close(undefined);
    await settle(fixture);
    await wait(50);
    expect(dialogPanel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('does the same with a mouse click on the item', async () => {
    const { fixture, host, trigger } = await setup(DIALOG_MENU);
    await userEvent.click(trigger);
    await settle(fixture);
    await userEvent.click(items()[1]);
    await settle(fixture);
    await wait(20);
    expect(menu()).toBeNull();
    expect(dialogPanel()).not.toBeNull();
    host.dialogs[0].close(undefined);
    await settle(fixture);
    await wait(50);
    expect(document.activeElement).toBe(trigger);
  });

  it('lets a handler that moves focus elsewhere keep it there', async () => {
    const { fixture, trigger } = await setup(`
      <button type="button" class="trigger" [ckMenuTrigger]="m" aria-label="Actions">Actions</button>
      <input id="field" #field />
      <ng-template #m><ck-menu>
        <button ckMenuItem (click)="field.focus()">Focus the field</button>
      </ck-menu></ng-template>`);
    trigger.click();
    await settle(fixture);
    items()[0].click();
    await settle(fixture);
    expect(document.activeElement?.id).toBe('field');
  });

  it('runs a handler once per press', async () => {
    const { fixture, host, trigger } = await setup(DIALOG_MENU);
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await settle(fixture);
    await userEvent.keyboard('{Enter}');
    await settle(fixture);
    expect(host.calls).toEqual(['edit']);
    expect(menu()).toBeNull();
  });
});

describe('CkMenu in a dialog', () => {
  afterEach(async () => {
    cleanUp();
    await wait(0);
  });

  const TEMPLATE = `
    <ng-template #dialogTemplate>
      <h2>Workout</h2>
      <button type="button" class="trigger" [ckMenuTrigger]="m" aria-label="Actions">Actions</button>
      <button type="button" class="other">Other</button>
      <ng-template #m><ck-menu><button ckMenuItem (click)="log('x')">One</button><button ckMenuItem>Two</button></ck-menu></ng-template>
    </ng-template>`;

  async function openDialog() {
    const mounted = mount(TEMPLATE);
    await settle(mounted.fixture);
    mounted.host.openDialog();
    await settle(mounted.fixture);
    await wait(20);
    return { ...mounted, trigger: trigger() };
  }

  it('opens above the modal dialog and closes only the menu on the first Escape', async () => {
    const { fixture, trigger } = await openDialog();
    trigger.focus();
    trigger.click();
    await settle(fixture);
    const box = menu()!.getBoundingClientRect();
    expect(document.elementFromPoint(box.left + 5, box.top + 5)?.closest('ck-menu')).toBe(menu());
    await userEvent.keyboard('{Escape}');
    await settle(fixture);
    await wait(20);
    expect(menu()).toBeNull();
    expect(dialogPanel()).not.toBeNull();
    expect(document.activeElement).toBe(trigger);
    await userEvent.keyboard('{Escape}');
    await settle(fixture);
    await wait(50);
    expect(dialogPanel()).toBeNull();
  });

  it('presses an item with the dialog staying open and focus back on the trigger', async () => {
    const { fixture, host, trigger } = await openDialog();
    trigger.focus();
    trigger.click();
    await settle(fixture);
    items()[0].click();
    await settle(fixture);
    await wait(20);
    expect(host.calls).toEqual(['x']);
    expect(dialogPanel()).not.toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
