import {
  Component,
  Injector,
  PLATFORM_ID,
  TemplateRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { CK_DIALOG_DATA, CkDialog } from '@ckui/core/dialog';
import { expectNoAxeViolations } from '../testing/axe';
import {
  DIALOG_DARK,
  TemplateOwner,
  drawerPanel,
  drawerPanels,
  fakeMedia,
  press,
  resetEnvironment,
  settle,
  setup,
  wait,
} from '../testing/drawer-env';
import { CK_DRAWER_DATA, CK_DRAWER_IMPORTS, CkDrawer, CkDrawerConfig, CkDrawerRef } from './index';

interface SheetData {
  readonly title: string;
}

@Component({
  selector: 'ck-test-device-sheet',
  imports: [CK_DRAWER_IMPORTS],
  template: `
    <h2 ckDialogTitle>{{ data.title }}</h2>
    <p ckDialogDescription>Pair a bike or a treadmill.</p>
    <ck-dialog-body><button type="button" class="in-body">Scan</button></ck-dialog-body>
    <ck-dialog-actions>
      <button type="button" class="cancel" ckDialogClose>Cancel</button>
      <button type="button" class="save" ckDialogInitialFocus [ckDialogClose]="'saved'">
        Save
      </button>
    </ck-dialog-actions>
  `,
})
class DeviceSheet {
  protected readonly data = inject<SheetData>(CK_DRAWER_DATA);
  readonly ref = inject(CkDrawerRef);
}

@Component({
  selector: 'ck-test-unnamed',
  imports: [CK_DRAWER_IMPORTS],
  template: `<ck-dialog-body>Nothing names me</ck-dialog-body>`,
})
class Unnamed {}

@Component({ selector: 'ck-test-eager', template: `<p>Closes itself</p>` })
class Eager {
  constructor() {
    inject(CkDrawerRef).close('early');
  }
}

@Component({
  selector: 'ck-test-plain',
  imports: [CK_DRAWER_IMPORTS],
  template: `<h2 ckDialogTitle>Dialog on top</h2>
    <button type="button" class="top-button" ckDialogClose>Close it</button>`,
})
class OnTop {}

@Component({
  template: `<ng-template #template
    ><h2 ckDialogTitle>From a template</h2>
    <button type="button" class="done" ckDialogClose="tpl">Done</button></ng-template
  >`,
  imports: [CK_DRAWER_IMPORTS],
})
class TemplateSource extends TemplateOwner {}

class ProviderMarker {}

@Component({
  selector: 'ck-test-injected',
  imports: [CK_DRAWER_IMPORTS],
  template: `<h2 ckDialogTitle>Injected</h2>`,
})
class Injected {
  readonly marker = inject(ProviderMarker, { optional: true });
  static last: Injected | null = null;
  constructor() {
    Injected.last = this;
  }
}

describe('CkDrawer service', () => {
  beforeEach(() => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<main id="app"><button id="opener" type="button">Open</button></main>',
    );
    setup();
    document.querySelector<HTMLElement>('#opener')!.focus();
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    await wait(0);
    resetEnvironment();
    vi.restoreAllMocks();
  });

  const drawer = () => TestBed.inject(CkDrawer);
  const app = () => document.querySelector<HTMLElement>('#app')!;

  async function open<R = unknown>(
    config: CkDrawerConfig = { data: { title: 'Devices' } satisfies SheetData },
    content: Parameters<CkDrawer['open']>[0] = DeviceSheet,
  ): Promise<CkDrawerRef<R>> {
    const ref = drawer().open<unknown, unknown, R>(content, { mode: 'side', ...config });
    await settle();
    return ref;
  }

  describe('opening', () => {
    it('shows a full-height side panel with the dialog semantics and the names from the parts', async () => {
      await open();
      const element = drawerPanel()!;
      const title = element.querySelector<HTMLElement>('h2')!;
      expect(element.getAttribute('role')).toBe('dialog');
      expect(element.getAttribute('aria-modal')).toBe('true');
      expect(element.getAttribute('aria-labelledby')).toBe(title.id);
      expect(element.getAttribute('aria-describedby')).toBe(
        element.querySelector('.ck-dialog__description')!.id,
      );
      expect(element.classList.contains('ck-overlay--side')).toBe(true);
      expect(element.classList.contains('ck-overlay--right')).toBe(true);
      expect(element.classList.contains('ck-drawer-panel--md')).toBe(true);
      expect(Math.round(element.getBoundingClientRect().height)).toBe(window.innerHeight);
      expect(element.querySelector('.ck-dialog--side')).not.toBeNull();
    });

    it('hands the data and the ref to a component, and both tokens are the dialog ones', async () => {
      const ref = await open({ data: { title: 'Bike' } satisfies SheetData });
      expect(drawerPanel()!.querySelector('h2')!.textContent).toBe('Bike');
      expect(CK_DRAWER_DATA).toBe(CK_DIALOG_DATA);
      drawerPanel()!.querySelector<HTMLButtonElement>('.save')!.click();
      await expect(ref.closed).resolves.toBe('saved');
    });

    it('opens a template with the ref available to its content', async () => {
      const fixture = TestBed.createComponent(TemplateSource);
      document.body.append(fixture.nativeElement);
      fixture.detectChanges();
      const ref = drawer().open<unknown, unknown, string>(fixture.componentInstance.template(), {
        mode: 'side',
      });
      await settle();
      drawerPanel()!.querySelector<HTMLButtonElement>('.done')!.click();
      await expect(ref.closed).resolves.toBe('tpl');
    });

    it('names the panel with ariaLabel and supports alertdialog', async () => {
      await open({ ariaLabel: 'Help', role: 'alertdialog' }, Unnamed);
      expect(drawerPanel()!.getAttribute('aria-label')).toBe('Help');
      expect(drawerPanel()!.getAttribute('role')).toBe('alertdialog');
    });

    it('applies width and side to the panel', async () => {
      await open({ width: 'lg', side: 'start', ariaLabel: 'x' }, Unnamed);
      expect(drawerPanel()!.classList.contains('ck-drawer-panel--lg')).toBe(true);
      expect(drawerPanel()!.classList.contains('ck-overlay--left')).toBe(true);
    });

    it('passes the injector of the config on to a component', async () => {
      const parent = Injector.create({ providers: [{ provide: ProviderMarker, useValue: 1 }] });
      await open({ injector: parent }, Injected);
      expect(Injected.last!.marker).toBe(1);
    });

    it('closes by itself when the content closes it while the drawer is still opening', async () => {
      const ref = drawer().open(Eager, { mode: 'side' });
      await expect(ref.closed).resolves.toBe('early');
      await settle();
      expect(drawerPanels()).toHaveLength(0);
      expect(app().hasAttribute('inert')).toBe(false);
    });
  });

  describe('focus and the page behind it', () => {
    it('focuses the marked element, traps Tab, makes the page inert and gives focus back', async () => {
      const ref = await open();
      const panel = drawerPanel()!;
      expect(document.activeElement).toBe(panel.querySelector('.save'));
      expect(app().hasAttribute('inert')).toBe(true);
      for (let step = 0; step < 8; step++) {
        await userEvent.tab();
        expect(panel.contains(document.activeElement)).toBe(true);
      }
      for (let step = 0; step < 8; step++) {
        await userEvent.tab({ shift: true });
        expect(panel.contains(document.activeElement)).toBe(true);
      }
      ref.close();
      await ref.closed;
      expect(app().hasAttribute('inert')).toBe(false);
      expect(document.activeElement).toBe(document.querySelector('#opener'));
    });

    it('focuses the first tabbable element, not the scrolling body, without a marked one', async () => {
      await open({ ariaLabel: 'Plain' }, OnTop);
      expect(document.activeElement).toBe(drawerPanel()!.querySelector('.top-button'));
    });

    it('has a close button named by the labels token, after the content', async () => {
      await open();
      const close = drawerPanel()!.querySelector<HTMLButtonElement>('.ck-dialog__close')!;
      expect(close.getAttribute('aria-label')).toBe('Close');
      expect(close.previousElementSibling!.classList.contains('ck-dialog__content')).toBe(true);
    });

    it('has no close button with closeButton: false', async () => {
      await open({ closeButton: false, ariaLabel: 'x' }, Unnamed);
      expect(drawerPanel()!.querySelector('.ck-dialog__close')).toBeNull();
    });
  });

  describe('results and dismissal', () => {
    it('resolves with undefined after Escape and after a backdrop click', async () => {
      const first = await open();
      press('Escape');
      await expect(first.closed).resolves.toBeUndefined();
      await settle();
      const second = await open();
      document.querySelector<HTMLElement>('.ck-overlay-backdrop')!.click();
      await expect(second.closed).resolves.toBeUndefined();
      expect(document.activeElement).toBe(document.querySelector('#opener'));
    });

    it('resolves with undefined for the close button', async () => {
      const ref = await open();
      drawerPanel()!.querySelector<HTMLButtonElement>('.ck-dialog__close')!.click();
      await expect(ref.closed).resolves.toBeUndefined();
    });

    it('only counts the first close, however many follow', async () => {
      const ref = await open<string>();
      ref.close('first');
      ref.close('second');
      ref.close();
      await expect(ref.closed).resolves.toBe('first');
    });

    it('ignores Escape and the backdrop when not dismissible, but not the close button or ref', async () => {
      const ref = await open({ dismissible: false, data: { title: 'Fixed' } });
      press('Escape');
      document.querySelector<HTMLElement>('.ck-overlay-backdrop')!.click();
      await wait(40);
      expect(drawerPanels()).toHaveLength(1);
      drawerPanel()!.querySelector<HTMLButtonElement>('.ck-dialog__close')!.click();
      await expect(ref.closed).resolves.toBeUndefined();
    });

    it('has no swipe area on a side panel, and one on a sheet', async () => {
      await open();
      expect(drawerPanel()!.querySelector('[data-ck-sheet-grab]')).toBeNull();
      drawer().closeAll();
      await settle();
      await open({ mode: 'sheet', data: { title: 'Sheet' } });
      expect(drawerPanel()!.querySelector('[data-ck-sheet-grab]')).not.toBeNull();
    });
  });

  describe('mode', () => {
    it('is decided when it opens: a sheet while CkMedia says sheet, a side panel after', async () => {
      TestBed.resetTestingModule();
      setup();
      const { sheet } = fakeMedia({ sheet: true });
      const data = { title: 'Auto' };
      drawer().open(DeviceSheet, { data });
      sheet.set(false);
      drawer().open(DeviceSheet, { data });
      await settle();
      expect(drawerPanels()[0].classList.contains('ck-overlay--sheet')).toBe(true);
      expect(drawerPanels()[1].classList.contains('ck-overlay--side')).toBe(true);
      sheet.set(true);
      await settle();
      expect(drawerPanels()[1].classList.contains('ck-overlay--side')).toBe(true);
      expect(drawerPanels()[0].querySelector('.ck-dialog--sheet')).not.toBeNull();
      expect(drawerPanels()[1].querySelector('.ck-dialog--sheet')).toBeNull();
    });

    it('lets mode side win on a phone and mode sheet win on a desktop', async () => {
      TestBed.resetTestingModule();
      setup();
      fakeMedia({ sheet: true });
      drawer().open(DeviceSheet, { mode: 'side', data: { title: 'Forced side' } });
      await settle();
      expect(drawerPanel()!.classList.contains('ck-overlay--side')).toBe(true);
      drawer().closeAll();
      await settle();
      TestBed.resetTestingModule();
      setup();
      fakeMedia({ sheet: false });
      drawer().open(DeviceSheet, { mode: 'sheet', data: { title: 'Forced sheet' } });
      await settle();
      expect(drawerPanel()!.classList.contains('ck-overlay--sheet')).toBe(true);
    });

    it('gives a content-height or full-height sheet', async () => {
      await open({ mode: 'sheet', data: { title: 'Short' } });
      const short = drawerPanel()!.getBoundingClientRect().height;
      expect(short).toBeLessThan(window.innerHeight / 2);
      drawer().closeAll();
      await settle();
      await open({ mode: 'sheet', fullHeight: true, data: { title: 'Full' } });
      expect(Math.round(drawerPanel()!.getBoundingClientRect().height)).toBe(window.innerHeight);
    });
  });

  describe('on the server', () => {
    it('shows nothing and resolves closed at once', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
      const ref = drawer().open(DeviceSheet, { data: { title: 'Server' } });
      await expect(ref.closed).resolves.toBeUndefined();
      await expect(ref.closing).resolves.toBeUndefined();
      expect(drawerPanels()).toHaveLength(0);
      expect(app().hasAttribute('inert')).toBe(false);
      expect(() => ref.close('x')).not.toThrow();
      expect(() => drawer().closeAll()).not.toThrow();
    });
  });

  describe('closeAll and teardown', () => {
    it('closes every drawer and leaves a dialog alone', async () => {
      const refs = [await open(), await open({ side: 'start', data: { title: 'Two' } })];
      const dialogRef = TestBed.inject(CkDialog).open(OnTop, { mode: 'modal' });
      await settle();
      drawer().closeAll();
      await expect(Promise.all(refs.map((ref) => ref.closed))).resolves.toEqual([
        undefined,
        undefined,
      ]);
      await settle();
      expect(drawerPanels()).toHaveLength(0);
      expect(document.querySelectorAll('.ck-dialog-panel')).toHaveLength(1);
      dialogRef.close();
      await dialogRef.closed;
    });

    it('does nothing for closeAll without drawers', () => {
      expect(() => drawer().closeAll()).not.toThrow();
    });

    it('releases inert, the scroll lock, the trap and the Escape listener, and settles every promise on destroy', async () => {
      document.body.insertAdjacentHTML('beforeend', '<div style="height: 4000px"></div>');
      const refs = [await open(), await open({ side: 'start', data: { title: 'Two' } })];
      const settled: unknown[] = [];
      for (const ref of refs) {
        void ref.closed.then((result) => settled.push(['closed', result]));
        void ref.closing.then(() => settled.push(['closing']));
      }
      expect(app().hasAttribute('inert')).toBe(true);
      expect(document.documentElement.classList.contains('cdk-global-scrollblock')).toBe(true);
      TestBed.resetTestingModule();
      await Promise.all(refs.flatMap((ref) => [ref.closed, ref.closing]));
      await wait(0);
      expect(settled).toHaveLength(4);
      expect(drawerPanels()).toHaveLength(0);
      expect(document.querySelector('.ck-overlay-backdrop')).toBeNull();
      expect(app().hasAttribute('inert')).toBe(false);
      expect(document.documentElement.classList.contains('cdk-global-scrollblock')).toBe(false);
      expect(document.querySelector('.cdk-focus-trap-anchor')).toBeNull();
      expect(document.activeElement).toBe(document.querySelector('#opener'));
      expect(press('Escape').defaultPrevented).toBe(false);
      expect(() => refs[0].close('late')).not.toThrow();
      await expect(refs[0].closed).resolves.toBeUndefined();
    });
  });

  describe('rapid use', () => {
    it('opens and closes five drawers in a row without leaving anything behind', async () => {
      const refs = Array.from({ length: 5 }, (_, index) =>
        drawer().open(DeviceSheet, {
          mode: 'side',
          side: index % 2 ? 'start' : 'end',
          data: { title: `Drawer ${index}` },
        }),
      );
      refs.forEach((ref) => ref.close());
      await Promise.all(refs.map((ref) => ref.closed));
      await settle();
      expect(drawerPanels()).toHaveLength(0);
      expect(document.querySelector('.cdk-overlay-container')!.childElementCount).toBe(0);
      expect(app().hasAttribute('inert')).toBe(false);
      expect(document.documentElement.classList.contains('cdk-global-scrollblock')).toBe(false);
      expect(document.activeElement).toBe(document.querySelector('#opener'));
    });

    it('opening the same drawer twice gives two panels that close independently', async () => {
      const first = await open<string>();
      const second = await open<string>();
      expect(drawerPanels()).toHaveLength(2);
      second.close('two');
      await expect(second.closed).resolves.toBe('two');
      await settle();
      expect(drawerPanels()).toHaveLength(1);
      expect(app().hasAttribute('inert')).toBe(true);
      first.close('one');
      await expect(first.closed).resolves.toBe('one');
    });

    it('closes during the opening animation', async () => {
      document.documentElement.style.setProperty('--ck-duration-normal', '300ms');
      const ref = drawer().open(DeviceSheet, { mode: 'side', data: { title: 'Slow' } });
      await wait(60);
      ref.close('now');
      await expect(ref.closed).resolves.toBe('now');
      await settle();
      expect(drawerPanels()).toHaveLength(0);
      expect(app().hasAttribute('inert')).toBe(false);
    });

    it('can open again while the first is still leaving', async () => {
      document.documentElement.style.setProperty('--ck-duration-normal', '300ms');
      const first = await open();
      first.close();
      const second = drawer().open(DeviceSheet, { mode: 'side', data: { title: 'Again' } });
      await first.closed;
      await settle();
      expect(drawerPanels()).toHaveLength(1);
      expect(drawerPanel()!.querySelector('h2')!.textContent).toBe('Again');
      expect(app().hasAttribute('inert')).toBe(true);
      press('Escape');
      await second.closed;
      expect(app().hasAttribute('inert')).toBe(false);
      expect(document.documentElement.classList.contains('cdk-global-scrollblock')).toBe(false);
    });

    it('keeps a drawer under a dialog inert, takes Escape for the dialog only and gets focus back', async () => {
      const lower = await open();
      const drawerElement = drawerPanel()!;
      const upper = TestBed.inject(CkDialog).open(OnTop, { mode: 'modal' });
      await settle();
      expect(drawerElement.closest('.cdk-global-overlay-wrapper')!.hasAttribute('inert')).toBe(
        true,
      );
      press('Escape');
      await expect(upper.closed).resolves.toBeUndefined();
      await settle();
      expect(drawerPanels()).toHaveLength(1);
      expect(drawerElement.closest('.cdk-global-overlay-wrapper')!.hasAttribute('inert')).toBe(
        false,
      );
      expect(drawerElement.contains(document.activeElement)).toBe(true);
      press('Escape');
      await expect(lower.closed).resolves.toBeUndefined();
    });

    it('opens a drawer from inside a dialog and restores focus into the dialog', async () => {
      const dialogRef = TestBed.inject(CkDialog).open(OnTop, { mode: 'modal' });
      await settle();
      const dialogButton = document.querySelector<HTMLElement>('.ck-dialog-panel .top-button')!;
      dialogButton.focus();
      const ref = await open();
      press('Escape');
      await ref.closed;
      await settle();
      expect(document.querySelector('.ck-dialog-panel')!.contains(document.activeElement)).toBe(
        true,
      );
      dialogRef.close();
      await dialogRef.closed;
    });
  });

  describe('development warning', () => {
    it('warns for a drawer without title and ariaLabel, naming the drawer', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      await open({}, Unnamed);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain(
        'CkDrawer: the drawer has no accessible name',
      );
    });

    it('stays quiet with a title or an ariaLabel', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      await open();
      await open({ ariaLabel: 'Help' }, Unnamed);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('a11y', () => {
    it('has no axe violations as a side panel in light and dark, and as a sheet', async () => {
      await open();
      await expectNoAxeViolations(document.querySelector('.cdk-overlay-container')!);
      drawer().closeAll();
      await settle();
      await open({ mode: 'sheet', data: { title: 'Sheet' } });
      await expectNoAxeViolations(document.querySelector('.cdk-overlay-container')!);
      TestBed.resetTestingModule();
      resetEnvironment();
      document.body.insertAdjacentHTML('afterbegin', '<main id="app"><button>Page</button></main>');
      setup(DIALOG_DARK);
      await open();
      await expectNoAxeViolations(document.querySelector('.cdk-overlay-container')!);
      drawer().closeAll();
      await settle();
      await open({ mode: 'sheet', data: { title: 'Sheet' } });
      await expectNoAxeViolations(document.querySelector('.cdk-overlay-container')!);
    });
  });
});

describe('CkDrawer content from a signal template', () => {
  afterEach(async () => {
    TestBed.resetTestingModule();
    await wait(0);
    resetEnvironment();
  });

  it('keeps template bindings reactive', async () => {
    const label = signal('One');
    @Component({
      template: `<ng-template #template
        ><p class="reactive">{{ label() }}</p></ng-template
      >`,
    })
    class Reactive {
      readonly template = viewChild.required<TemplateRef<unknown>>('template');
      protected readonly label = label;
    }
    setup();
    const fixture = TestBed.createComponent(Reactive);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    const ref = TestBed.inject(CkDrawer).open(fixture.componentInstance.template(), {
      mode: 'side',
      ariaLabel: 'Reactive',
    });
    await settle();
    expect(document.querySelector('.reactive')!.textContent).toBe('One');
    label.set('Two');
    await settle();
    expect(document.querySelector('.reactive')!.textContent).toBe('Two');
    ref.close();
    await ref.closed;
  });
});
