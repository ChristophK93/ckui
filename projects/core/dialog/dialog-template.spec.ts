import { Component, DestroyRef, PLATFORM_ID, inject, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { expectNoAxeViolations } from '../testing/axe';
import { panel, panels, resetEnvironment, settle, setup, wait } from '../testing/dialog-env';
import { CK_DIALOG_IMPORTS, CkDialogRole } from './index';

const probe = { created: 0, destroyed: 0 };

@Component({ selector: 'ck-test-probe', template: `<span class="probe">probe</span>` })
class Probe {
  constructor() {
    probe.created++;
    inject(DestroyRef).onDestroy(() => probe.destroyed++);
  }
}

@Component({
  imports: [CK_DIALOG_IMPORTS, Probe],
  template: `
    <button type="button" class="opener" (click)="isOpen.set(true)">Open</button>
    <ck-dialog
      [(open)]="isOpen"
      [role]="role()"
      [dismissible]="dismissible()"
      [closeButton]="closeButton()"
      mode="modal"
      width="sm"
      (closed)="results.push($event)"
    >
      <ng-template>
        <ck-test-probe />
        <h2 ckDialogTitle>Template dialog</h2>
        <ck-dialog-actions>
          <button type="button" class="ok" ckDialogClose="ok">Ok</button>
          <button type="button" class="no" [ckDialogClose]="42">No</button>
        </ck-dialog-actions>
      </ng-template>
    </ck-dialog>
  `,
})
class Host {
  readonly isOpen = signal(false);
  readonly role = signal<CkDialogRole>('dialog');
  readonly dismissible = signal(true);
  readonly closeButton = signal(true);
  readonly results: unknown[] = [];
}

@Component({
  imports: [CK_DIALOG_IMPORTS],
  template: `<ck-dialog [open]="true" ariaLabel="Nothing inside"></ck-dialog>`,
})
class NoTemplateHost {}

describe('ck-dialog', () => {
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

  const press = (key: string): void => {
    (document.activeElement ?? document.body).dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
  };

  it('instantiates nothing and renders nothing while closed', async () => {
    await render();
    expect(probe.created).toBe(0);
    expect(panels()).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('ck-dialog')!.textContent).toBe('');
  });

  it('renders its content in a dialog panel while open, with the config inputs applied', async () => {
    const host = await render();
    host.role.set('alertdialog');
    host.isOpen.set(true);
    await settle();
    expect(probe.created).toBe(1);
    expect(panel()!.getAttribute('role')).toBe('alertdialog');
    expect(panel()!.classList.contains('ck-dialog-panel--sm')).toBe(true);
    expect(panel()!.getAttribute('aria-labelledby')).toBe(panel()!.querySelector('h2')!.id);
  });

  it('opens on first render when open starts true', async () => {
    await render(true);
    expect(panel()).not.toBeNull();
    expect(probe.created).toBe(1);
  });

  it('destroys the content when it closes, and creates it afresh the next time', async () => {
    const host = await render(true);
    host.isOpen.set(false);
    await wait(20);
    await settle();
    expect(panels()).toHaveLength(0);
    expect(probe.destroyed).toBe(1);
    host.isOpen.set(true);
    await settle();
    expect(probe.created).toBe(2);
  });

  it('sets open to false and emits the result when the content closes it', async () => {
    const host = await render(true);
    panel()!.querySelector<HTMLButtonElement>('.ok')!.click();
    await vi.waitFor(() => expect(host.results).toEqual(['ok']));
    await settle();
    expect(host.isOpen()).toBe(false);
    expect(panels()).toHaveLength(0);
  });

  it('keeps a result that is not a string: 42 from the second button', async () => {
    const host = await render(true);
    panel()!.querySelector<HTMLButtonElement>('.no')!.click();
    await vi.waitFor(() => expect(host.results).toEqual([42]));
  });

  it('follows Escape, the backdrop and the close button with open = false and undefined', async () => {
    const host = await render(true);
    press('Escape');
    await vi.waitFor(() => expect(host.results).toEqual([undefined]));
    await settle();
    expect(host.isOpen()).toBe(false);

    host.isOpen.set(true);
    await settle();
    document.querySelector<HTMLElement>('.ck-overlay-backdrop')!.click();
    await vi.waitFor(() => expect(host.results).toHaveLength(2));
    await settle();
    expect(host.isOpen()).toBe(false);

    host.isOpen.set(true);
    await settle();
    panel()!.querySelector<HTMLButtonElement>('.ck-dialog__close')!.click();
    await vi.waitFor(() => expect(host.results).toHaveLength(3));
    expect(host.results).toEqual([undefined, undefined, undefined]);
  });

  it('ignores Escape when dismissible is false, and has no close button with closeButton false', async () => {
    const host = await render();
    host.dismissible.set(false);
    host.closeButton.set(false);
    host.isOpen.set(true);
    await settle();
    press('Escape');
    await settle();
    expect(panel()).not.toBeNull();
    expect(panel()!.querySelector('.ck-dialog__close')).toBeNull();
    expect(host.isOpen()).toBe(true);
  });

  it('closes when the host sets open to false and emits closed once', async () => {
    const host = await render(true);
    host.isOpen.set(false);
    await settle();
    await vi.waitFor(() => expect(host.results).toEqual([undefined]));
    await wait(30);
    expect(host.results).toHaveLength(1);
  });

  it('opens a new dialog when open goes false and true again during the close animation', async () => {
    document.documentElement.style.setProperty('--ck-duration-normal', '200ms');
    const host = await render(true);
    await wait(250);
    host.isOpen.set(false);
    await settle();
    host.isOpen.set(true);
    await settle();
    expect(host.isOpen()).toBe(true);
    await wait(300);
    await settle();
    expect(panels()).toHaveLength(1);
    expect(host.isOpen()).toBe(true);
    expect(host.results).toEqual([undefined]);
  });

  it('does nothing when open flips false and true within one change detection', async () => {
    const host = await render(true);
    host.isOpen.set(false);
    host.isOpen.set(true);
    await settle();
    expect(panels()).toHaveLength(1);
    expect(host.results).toEqual([]);
  });

  it('closes its dialog without emitting when the host is destroyed', async () => {
    const host = await render(true);
    fixture.destroy();
    await wait(30);
    await settle();
    expect(panels()).toHaveLength(0);
    expect(host.results).toEqual([]);
    expect(probe.destroyed).toBe(1);
  });

  it('warns and stays closed when there is no template inside', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const bare = TestBed.createComponent(NoTemplateHost);
    document.body.appendChild(bare.nativeElement);
    await settle();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('<ng-template>'));
    expect(panels()).toHaveLength(0);
  });

  it('has no axe violations while open', async () => {
    await render(true);
    await expectNoAxeViolations(document.querySelector('.cdk-overlay-container')!);
  });

  it('does not leave the declaring element in the layout', async () => {
    await render(true);
    const element = fixture.nativeElement.querySelector('ck-dialog') as HTMLElement;
    expect(getComputedStyle(element).display).toBe('none');
  });

  it('sets open to false when the close starts, so the opener can reopen during the leave animation', async () => {
    document.documentElement.style.setProperty('--ck-duration-normal', '300ms');
    const host = await render(true);
    await wait(350);
    press('Escape');
    await vi.waitFor(() => expect(host.isOpen()).toBe(false));
    expect(host.results).toEqual([]);
    host.isOpen.set(true);
    await settle();
    await wait(450);
    await settle();
    expect(host.isOpen()).toBe(true);
    expect(panels()).toHaveLength(1);
    expect(host.results).toEqual([undefined]);
    expect(probe.created).toBe(2);
  });

  it('gives focus back to the element that opened it, also for a template dialog', async () => {
    const host = await render();
    const opener = fixture.nativeElement.querySelector('.opener') as HTMLButtonElement;
    opener.focus();
    opener.click();
    await settle();
    await vi.waitFor(() => expect(panels()).toHaveLength(1));
    await settle();
    expect(panel()!.contains(document.activeElement)).toBe(true);
    panel()!.querySelector<HTMLButtonElement>('.ok')!.click();
    await vi.waitFor(() => expect(host.results).toEqual(['ok']));
    expect(document.activeElement).toBe(opener);
  });
});

describe('ck-dialog on the server', () => {
  beforeEach(() => {
    setup();
    probe.created = 0;
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    await wait(0);
    resetEnvironment();
    vi.restoreAllMocks();
  });

  it('renders nothing, warns about nothing and does not throw for an open dialog', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.isOpen.set(true);
    document.body.appendChild(fixture.nativeElement);
    await settle();
    expect(panels()).toHaveLength(0);
    expect(probe.created).toBe(0);
    expect(warn).not.toHaveBeenCalled();
    expect(fixture.componentInstance.isOpen()).toBe(true);
    expect(fixture.componentInstance.results).toEqual([]);
  });
});
