import { ApplicationRef, Component, TemplateRef, inject, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideCkui } from '@ckui/core';
import { CkButton } from '@ckui/core/button';
import { CkDialog, CkDialogRef } from '@ckui/core/dialog';
import { CkMedia } from '@ckui/core/internal';
import { CK_MENU_IMPORTS } from '@ckui/core/menu';
import { resetEnvironment, setTokens } from './toast-env';
import { SELECT_DARK, SELECT_LIGHT } from './select-host';

export { SELECT_DARK as MENU_DARK, SELECT_LIGHT as MENU_LIGHT };

/** One host for every menu spec; each test swaps in its own template. */
@Component({
  imports: [CK_MENU_IMPORTS, CkButton],
  // Every test overrides this; it only has to use each import once.
  template: `
    <button ckButton [ckMenuTrigger]="unused" aria-label="Unused">Unused</button>
    <ng-template #unused>
      <ck-menu>
        <button ckMenuItem><svg ckMenuItemIcon></svg>Unused</button>
        <ck-menu-divider />
      </ck-menu>
    </ng-template>
  `,
})
export class MenuHost {
  /** Every handler the template calls, in order: `(click)="log('edit')"`. */
  readonly calls: string[] = [];
  readonly items = signal<{ id: number; label: string; disabled?: boolean }[]>([
    { id: 1, label: 'Start' },
    { id: 2, label: 'Edit' },
    { id: 3, label: 'Copy' },
  ]);
  readonly label = signal('Actions for Sweet Spot');
  readonly controls = signal<string | null>(null);
  readonly triggerId = signal<string | null>(null);
  readonly locked = signal(false);
  readonly opened = signal(0);
  readonly closed = signal(0);
  /** A template named `dialogTemplate` can be opened as a dialog. */
  readonly dialogTemplate = viewChild<TemplateRef<unknown>>('dialogTemplate');
  readonly dialogs: CkDialogRef[] = [];
  private readonly dialog = inject(CkDialog);

  log(name: string): void {
    this.calls.push(name);
  }

  openDialog(): CkDialogRef {
    const ref = this.dialog.open(this.dialogTemplate()!, { ariaLabel: 'Confirm' });
    this.dialogs.push(ref);
    return ref;
  }
}

export interface MediaFake {
  readonly sheet: ReturnType<typeof signal<boolean>>;
}

/** Replaces `CkMedia`: the menu opens as a sheet while `sheet` is true. */
export function fakeMedia(sheet = false): MediaFake {
  const state = signal(sheet);
  TestBed.configureTestingModule({
    providers: [
      {
        provide: CkMedia,
        useValue: {
          sheet: state,
          reducedMotion: signal(false),
          narrow: signal(sheet),
          coarsePointer: signal(sheet),
        },
      },
    ],
  });
  return { sheet: state };
}

export function mount(
  template: string,
  prepare?: (host: MenuHost) => void,
  beforeRender?: (root: HTMLElement) => void,
  tokens: Record<string, string> = SELECT_LIGHT,
): { fixture: ComponentFixture<MenuHost>; host: MenuHost; root: HTMLElement } {
  setTokens(tokens);
  TestBed.configureTestingModule({ providers: [provideCkui()] });
  TestBed.overrideComponent(MenuHost, { set: { template } });
  const fixture = TestBed.createComponent(MenuHost);
  const root = fixture.nativeElement as HTMLElement;
  document.body.appendChild(root);
  prepare?.(fixture.componentInstance);
  beforeRender?.(root);
  fixture.detectChanges();
  return { fixture, host: fixture.componentInstance, root };
}

/** Runs change detection and every deferred task until nothing is left. */
export async function settle(fixture?: ComponentFixture<unknown>): Promise<void> {
  const appRef = TestBed.inject(ApplicationRef);
  await appRef.whenStable();
  fixture?.detectChanges();
  appRef.tick();
  await appRef.whenStable();
  appRef.tick();
}

export function cleanUp(): void {
  TestBed.resetTestingModule();
  resetEnvironment();
  document.documentElement.classList.remove('cdk-global-scrollblock');
}

export const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/** The usual trigger and menu of the plan's row actions. */
export const ROW_MENU = (triggerAttributes = '', menuAttributes = '') => `
  <button type="button" id="before">Before</button>
  <button ckButton variant="ghost" class="trigger" [ckMenuTrigger]="rowMenu" aria-label="Actions for Sweet Spot" ${triggerAttributes}>Actions</button>
  <button type="button" id="after">After</button>
  <ng-template #rowMenu>
    <ck-menu ${menuAttributes}>
      <button ckMenuItem (click)="log('start')">Start</button>
      <button ckMenuItem (click)="log('edit')">Edit</button>
      <button ckMenuItem disabled (click)="log('copy')">Copy</button>
      <ck-menu-divider />
      <button ckMenuItem tone="danger" (click)="log('delete')">Delete</button>
    </ck-menu>
  </ng-template>
`;

export const trigger = (root: ParentNode = document): HTMLButtonElement =>
  root.querySelector<HTMLButtonElement>('.trigger')!;

export const menu = (): HTMLElement | null => document.querySelector<HTMLElement>('ck-menu');

export const panel = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('.ck-menu-panel');

/** The items of the open menu in order, disabled ones included. */
export const items = (): HTMLButtonElement[] =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('ck-menu [role="menuitem"]'));

export const itemText = (item: Element): string => item.textContent!.replace(/\s+/g, ' ').trim();

export const labels = (): string[] => items().map(itemText);

export const overlayPanels = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.cdk-overlay-container .ck-overlay'));

export const cancelButton = (): HTMLButtonElement | null =>
  document.querySelector<HTMLButtonElement>('.ck-menu-panel__cancel');

/** A key event on the element. */
export function press(
  element: Element,
  key: string,
  init: KeyboardEventInit = {},
  type: 'keydown' | 'keyup' = 'keydown',
): KeyboardEvent {
  const event = new KeyboardEvent(type, { key, bubbles: true, cancelable: true, ...init });
  element.dispatchEvent(event);
  return event;
}
