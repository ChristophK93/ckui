import {
  ApplicationRef,
  Component,
  EnvironmentInjector,
  InjectionToken,
  Injector,
  WritableSignal,
  createEnvironmentInjector,
  inject,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { panel, resetEnvironment, settle, setup, wait } from '../testing/dialog-env';
import { CK_DIALOG_DATA, CK_DIALOG_IMPORTS, CkDialog, CkDialogRef } from './index';

interface IdData {
  readonly titleId: WritableSignal<string>;
  readonly descriptionId: WritableSignal<string>;
  readonly showDescription: WritableSignal<boolean>;
  readonly showSecondTitle: WritableSignal<boolean>;
  readonly showFirstTitle: WritableSignal<boolean>;
}

const idData = (): IdData => ({
  titleId: signal('title-a'),
  descriptionId: signal('description-a'),
  showDescription: signal(true),
  showSecondTitle: signal(false),
  showFirstTitle: signal(true),
});

@Component({
  selector: 'ck-test-static-ids',
  imports: [CK_DIALOG_IMPORTS],
  template: `
    <h2 ckDialogTitle id="my-title">Static</h2>
    <p ckDialogDescription id="my-description">Static text</p>
  `,
})
class StaticIds {}

@Component({
  selector: 'ck-test-bound-ids',
  imports: [CK_DIALOG_IMPORTS],
  template: `
    @if (data.showFirstTitle()) {
      <h2 ckDialogTitle class="first" [id]="data.titleId()">Bound</h2>
    }
    @if (data.showSecondTitle()) {
      <h2 ckDialogTitle class="second" id="second-title">Second</h2>
    }
    @if (data.showDescription()) {
      <p ckDialogDescription [id]="data.descriptionId()">Bound text</p>
    }
  `,
})
class BoundIds {
  protected readonly data = inject<IdData>(CK_DIALOG_DATA);
}

@Component({
  selector: 'ck-test-default-ids',
  imports: [CK_DIALOG_IMPORTS],
  template: `
    <h2 ckDialogTitle>One</h2>
    <p ckDialogDescription>Two</p>
  `,
})
class DefaultIds {}

const SERVICE = new InjectionToken<string>('SERVICE');

@Component({
  selector: 'ck-test-needs-service',
  imports: [CK_DIALOG_IMPORTS],
  template: `<h2 ckDialogTitle>{{ service }} {{ data }}</h2>`,
})
class NeedsService {
  protected readonly service = inject(SERVICE);
  protected readonly data = inject(CK_DIALOG_DATA);
  readonly ref = inject(CkDialogRef);
}

@Component({
  selector: 'ck-test-opener',
  template: ``,
  providers: [{ provide: SERVICE, useValue: 'element' }],
})
class Opener {
  private readonly dialog = inject(CkDialog);
  private readonly injector = inject(Injector);

  open(): void {
    this.dialog.open(NeedsService, { mode: 'modal', injector: this.injector, data: 'payload' });
  }
}

describe('CkDialog ids and injector', () => {
  beforeEach(() => setup());

  afterEach(async () => {
    TestBed.resetTestingModule();
    await wait(0);
    resetEnvironment();
  });

  const dialog = () => TestBed.inject(CkDialog);
  const title = (): HTMLElement => panel()!.querySelector<HTMLElement>('.ck-dialog__title')!;

  describe('title and description ids', () => {
    it('keeps a static id and points the panel at it', async () => {
      dialog().open(StaticIds, { mode: 'modal' });
      await settle();
      expect(title().id).toBe('my-title');
      expect(panel()!.getAttribute('aria-labelledby')).toBe('my-title');
      expect(panel()!.getAttribute('aria-describedby')).toBe('my-description');
    });

    it('generates unique ids when there are none', async () => {
      dialog().open(DefaultIds, { mode: 'modal' });
      dialog().open(DefaultIds, { mode: 'modal' });
      await settle();
      const ids = Array.from(
        document.querySelectorAll('.ck-dialog__title, .ck-dialog__description'),
        (element) => element.id,
      );
      expect(ids.every((id) => id !== '')).toBe(true);
      expect(new Set(ids).size).toBe(4);
      const first = document.querySelector<HTMLElement>('.ck-dialog-panel')!;
      expect(first.getAttribute('aria-labelledby')).toBe(first.querySelector('h2')!.id);
    });

    it('uses a bound id from the first render, and follows it when it changes while open', async () => {
      const data = idData();
      dialog().open(BoundIds, { mode: 'modal', data });
      await settle();
      expect(title().id).toBe('title-a');
      expect(panel()!.getAttribute('aria-labelledby')).toBe('title-a');
      expect(panel()!.getAttribute('aria-describedby')).toBe('description-a');
      data.titleId.set('title-b');
      data.descriptionId.set('description-b');
      await settle();
      expect(title().id).toBe('title-b');
      expect(panel()!.getAttribute('aria-labelledby')).toBe('title-b');
      expect(panel()!.getAttribute('aria-describedby')).toBe('description-b');
      expect(panel()!.querySelectorAll('#title-a, #description-a')).toHaveLength(0);
    });

    it('describes the dialog by a description that appears after it opened, and drops it again', async () => {
      const data = idData();
      data.showDescription.set(false);
      dialog().open(BoundIds, { mode: 'modal', data });
      await settle();
      expect(panel()!.hasAttribute('aria-describedby')).toBe(false);
      data.showDescription.set(true);
      await settle();
      expect(panel()!.getAttribute('aria-describedby')).toBe('description-a');
      data.showDescription.set(false);
      await settle();
      expect(panel()!.hasAttribute('aria-describedby')).toBe(false);
    });

    it('lets the newest title name the dialog, and gives the name back to the older one when it goes', async () => {
      const data = idData();
      dialog().open(BoundIds, { mode: 'modal', data });
      await settle();
      data.showSecondTitle.set(true);
      await settle();
      expect(panel()!.getAttribute('aria-labelledby')).toBe('second-title');
      data.showSecondTitle.set(false);
      await settle();
      expect(panel()!.getAttribute('aria-labelledby')).toBe('title-a');
    });

    it('keeps the newer title when the older one goes first', async () => {
      const data = idData();
      dialog().open(BoundIds, { mode: 'modal', data });
      await settle();
      data.showSecondTitle.set(true);
      await settle();
      data.showFirstTitle.set(false);
      await settle();
      expect(panel()!.getAttribute('aria-labelledby')).toBe('second-title');
      data.showSecondTitle.set(false);
      await settle();
      expect(panel()!.hasAttribute('aria-labelledby')).toBe(false);
    });
  });

  describe('injector option', () => {
    it('resolves a service that only a parent environment injector provides', async () => {
      const injector = createEnvironmentInjector(
        [{ provide: SERVICE, useValue: 'route' }],
        TestBed.inject(EnvironmentInjector),
      );
      dialog().open(NeedsService, { mode: 'modal', injector, data: 'payload' });
      await settle();
      expect(title().textContent).toBe('route payload');
      injector.destroy();
    });

    it('resolves a provider of the opener element when its injector is passed', async () => {
      const fixture = TestBed.createComponent(Opener);
      fixture.componentInstance.open();
      await settle();
      expect(title().textContent).toBe('element payload');
    });

    it('still provides CK_DIALOG_DATA and CkDialogRef next to unrelated providers of the injector', async () => {
      const injector = Injector.create({
        providers: [
          { provide: SERVICE, useValue: 'own' },
          { provide: new InjectionToken('OTHER'), useValue: 1 },
        ],
        parent: TestBed.inject(Injector),
      });
      const ref = dialog().open<NeedsService, string, string>(NeedsService, {
        mode: 'modal',
        injector,
        data: 'kept',
      });
      await settle();
      expect(title().textContent).toBe('own kept');
      ref.close('done');
      await expect(ref.closed).resolves.toBe('done');
    });

    it('does not see providers of the opener when no injector is given (no provider found)', async () => {
      TestBed.createComponent(Opener);
      dialog().open(NeedsService, { mode: 'modal', data: 'x' });
      let thrown: unknown;
      try {
        TestBed.inject(ApplicationRef).tick();
      } catch (error) {
        thrown = error;
      }
      expect(String(thrown)).toMatch(/NG0201|No provider found/);
    });
  });
});
