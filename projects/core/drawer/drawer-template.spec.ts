import { Component, DestroyRef, PLATFORM_ID, inject, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  drawerPanel,
  drawerPanels,
  press,
  resetEnvironment,
  settle,
  setup,
  wait,
} from '../testing/drawer-env';
import { CK_DRAWER_IMPORTS, CkDrawerSide } from './index';

const probe = { created: 0, destroyed: 0 };

@Component({ selector: 'ck-test-probe', template: `<span class="probe">probe</span>` })
class Probe {
  constructor() {
    probe.created++;
    inject(DestroyRef).onDestroy(() => probe.destroyed++);
  }
}

@Component({
  imports: [CK_DRAWER_IMPORTS, Probe],
  template: `
    <main id="page">
      <button type="button" class="opener" (click)="isOpen.set(true)">Open</button>
    </main>
    <ck-drawer
      [(open)]="isOpen"
      [side]="side()"
      [dismissible]="dismissible()"
      [closeButton]="closeButton()"
      mode="side"
      width="sm"
      (closed)="results.push($event)"
    >
      <ng-template>
        <ck-test-probe />
        <h2 ckDialogTitle>Template drawer</h2>
        <ck-dialog-body><button type="button" class="in-body">Inside</button></ck-dialog-body>
        <ck-dialog-actions>
          <button type="button" class="ok" ckDialogClose="ok">Ok</button>
          <button type="button" class="no" [ckDialogClose]="42">No</button>
        </ck-dialog-actions>
      </ng-template>
    </ck-drawer>
  `,
})
class Host {
  readonly isOpen = signal(false);
  readonly side = signal<CkDrawerSide>('end');
  readonly dismissible = signal(true);
  readonly closeButton = signal(true);
  readonly results: unknown[] = [];
}

@Component({
  imports: [CK_DRAWER_IMPORTS],
  template: `<ck-drawer [open]="true" ariaLabel="Nothing inside"></ck-drawer>`,
})
class NoTemplateHost {}

describe('ck-drawer', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(() => {
    setup();
    probe.created = 0;
    probe.destroyed = 0;
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    await wait(0);
    resetEnvironment();
    vi.restoreAllMocks();
  });

  async function render(initiallyOpen = false): Promise<Host> {
    fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.componentInstance.isOpen.set(initiallyOpen);
    await settle();
    return fixture.componentInstance;
  }

  it('instantiates nothing and renders nothing while closed', async () => {
    await render();
    expect(probe.created).toBe(0);
    expect(drawerPanels()).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('ck-drawer')!.textContent).toBe('');
    expect(fixture.nativeElement.querySelector('ck-drawer')!.style.display).toBe('none');
  });

  it('renders its content in a side panel while open, with the inputs applied', async () => {
    const host = await render();
    host.side.set('start');
    host.isOpen.set(true);
    await settle();
    expect(probe.created).toBe(1);
    expect(drawerPanel()!.classList.contains('ck-overlay--left')).toBe(true);
    expect(drawerPanel()!.classList.contains('ck-drawer-panel--sm')).toBe(true);
    expect(drawerPanel()!.getAttribute('aria-labelledby')).toBe(
      drawerPanel()!.querySelector('h2')!.id,
    );
    expect(fixture.nativeElement.hasAttribute('inert')).toBe(true);
  });

  it('opens on first render when open starts true', async () => {
    await render(true);
    expect(drawerPanel()).not.toBeNull();
    expect(probe.created).toBe(1);
  });

  it('destroys the content when it closes, and creates it afresh the next time', async () => {
    const host = await render(true);
    host.isOpen.set(false);
    await wait(20);
    await settle();
    expect(drawerPanels()).toHaveLength(0);
    expect(probe.destroyed).toBe(1);
    host.isOpen.set(true);
    await settle();
    expect(probe.created).toBe(2);
  });

  it('sets open to false and emits the result when the content closes it', async () => {
    const host = await render(true);
    drawerPanel()!.querySelector<HTMLButtonElement>('.ok')!.click();
    await vi.waitFor(() => expect(host.results).toEqual(['ok']));
    await settle();
    expect(host.isOpen()).toBe(false);
    expect(drawerPanels()).toHaveLength(0);
  });

  it('keeps a result that is not a string: 42 from the second button', async () => {
    const host = await render(true);
    drawerPanel()!.querySelector<HTMLButtonElement>('.no')!.click();
    await vi.waitFor(() => expect(host.results).toEqual([42]));
  });

  it('follows Escape, the backdrop and the close button with open = false and undefined', async () => {
    const host = await render(true);
    press('Escape');
    await vi.waitFor(() => expect(host.results).toEqual([undefined]));
    expect(host.isOpen()).toBe(false);
    await settle();

    host.isOpen.set(true);
    await settle();
    document.querySelector<HTMLElement>('.ck-overlay-backdrop')!.click();
    await vi.waitFor(() => expect(host.results).toHaveLength(2));
    await settle();

    host.isOpen.set(true);
    await settle();
    drawerPanel()!.querySelector<HTMLButtonElement>('.ck-dialog__close')!.click();
    await vi.waitFor(() => expect(host.results).toHaveLength(3));
    expect(host.results).toEqual([undefined, undefined, undefined]);
  });

  it('ignores Escape and the backdrop when dismissible is false', async () => {
    const host = await render();
    host.dismissible.set(false);
    host.isOpen.set(true);
    await settle();
    press('Escape');
    document.querySelector<HTMLElement>('.ck-overlay-backdrop')!.click();
    await wait(40);
    expect(host.isOpen()).toBe(true);
    expect(drawerPanels()).toHaveLength(1);
  });

  it('hides the close button with closeButton false', async () => {
    const host = await render();
    host.closeButton.set(false);
    host.isOpen.set(true);
    await settle();
    expect(drawerPanel()!.querySelector('.ck-dialog__close')).toBeNull();
  });

  it('opens again right after a close started, while the old panel is still leaving', async () => {
    document.documentElement.style.setProperty('--ck-duration-normal', '300ms');
    const host = await render(true);
    drawerPanel()!.querySelector<HTMLButtonElement>('.ok')!.click();
    await vi.waitFor(() => expect(host.isOpen()).toBe(false));
    host.isOpen.set(true);
    await settle();
    await vi.waitFor(() => expect(drawerPanels()).toHaveLength(1), { timeout: 1500 });
    expect(host.isOpen()).toBe(true);
    expect(probe.created).toBe(2);
    press('Escape');
    await vi.waitFor(() => expect(host.isOpen()).toBe(false));
  });

  it('toggles quickly without leaving a panel, inert or scroll lock behind', async () => {
    const host = await render();
    document.body.insertAdjacentHTML('beforeend', '<div style="height: 4000px"></div>');
    for (let toggle = 0; toggle < 5; toggle++) {
      host.isOpen.set(true);
      await settle();
      expect(document.documentElement.classList.contains('cdk-global-scrollblock')).toBe(true);
      host.isOpen.set(false);
      await settle();
    }
    await wait(300);
    await settle();
    expect(drawerPanels()).toHaveLength(0);
    expect(fixture.nativeElement.hasAttribute('inert')).toBe(false);
    expect(document.documentElement.classList.contains('cdk-global-scrollblock')).toBe(false);
    expect(probe.created).toBe(probe.destroyed);
  });

  it('closes and tears down when the component is destroyed while open, without emitting', async () => {
    const host = await render(true);
    fixture.destroy();
    await wait(300);
    await settle();
    expect(drawerPanels()).toHaveLength(0);
    expect(probe.destroyed).toBe(1);
    expect(host.results).toEqual([]);
    expect(document.querySelector('.cdk-focus-trap-anchor')).toBeNull();
  });

  it('warns and resets open when there is no <ng-template>', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const noTemplate = TestBed.createComponent(NoTemplateHost);
    document.body.appendChild(noTemplate.nativeElement);
    await settle();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('ck-drawer'));
    expect(drawerPanels()).toHaveLength(0);
  });

  it('opens nothing on the server', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.isOpen.set(true);
    await settle();
    expect(drawerPanels()).toHaveLength(0);
    expect(probe.created).toBe(0);
    expect(fixture.componentInstance.results).toEqual([]);
  });
});
