import { ApplicationRef, Component, TemplateRef, inject, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideCkui } from '@ckui/core';
import { CkButton } from '@ckui/core/button';
import { CK_DIALOG_IMPORTS, CkDialog, CkDialogRef } from '@ckui/core/dialog';
import { CK_FIELD_IMPORTS } from '@ckui/core/field';
import { CK_MENU_IMPORTS } from '@ckui/core/menu';
import { CK_TOOLTIP_IMPORTS, CkTooltipPosition } from '@ckui/core/tooltip';
import { DIALOG_DARK, DIALOG_LIGHT } from './dialog-env';
import { resetEnvironment, setTokens } from './toast-env';

/** The tokens the shipped stylesheet declares, as far as tooltips and the dialog around them need them. */
export const TOOLTIP_LIGHT: Record<string, string> = {
  ...DIALOG_LIGHT,
  '--ck-color-surface': 'rgb(255, 255, 255)',
  '--ck-radius-sm': '4px',
  '--ck-font-size-sm': '14px',
  '--ck-font-weight-medium': '500',
  '--ck-duration-fast': '100ms',
};

export const TOOLTIP_DARK: Record<string, string> = {
  ...TOOLTIP_LIGHT,
  ...DIALOG_DARK,
  '--ck-color-surface': 'rgb(20, 20, 24)',
  '--ck-duration-fast': '100ms',
};

/** One host for every tooltip spec; each test swaps in its own template. */
@Component({
  imports: [CK_TOOLTIP_IMPORTS, CkButton, CK_DIALOG_IMPORTS, CK_FIELD_IMPORTS, CK_MENU_IMPORTS],
  // Every test overrides this; it only has to use each import once.
  template: `
    <button ckButton ckTooltip="Unused" aria-label="Unused">Unused</button>
    <ck-field
      ><label for="unused">Unused</label><input ckInput id="unused" ckTooltip="Unused"
    /></ck-field>
    <button ckButton [ckMenuTrigger]="menuTemplate" aria-label="Menu">Menu</button>
    <ng-template #menuTemplate
      ><ck-menu><button ckMenuItem>Item</button></ck-menu></ng-template
    >
    <ng-template #dialogTemplate>
      <h2 ckDialogTitle>Dialog</h2>
      <button ckButton ckDialogClose>Close</button>
    </ng-template>
  `,
})
export class TooltipHost {
  readonly text = signal<string | null | undefined>('Starts after each set');
  readonly position = signal<CkTooltipPosition>('above');
  readonly disabled = signal(false);
  readonly invalid = signal(false);
  readonly delay = signal(500);
  readonly describedBy = signal<string | null>(null);
  readonly label = signal('Rest timer');
  /** Rows for a template that repeats a tooltip host: `@for (item of items; …)`. */
  readonly items: number[] = [];
  /** Every handler the template calls, in order: `(click)="log('start')"`. */
  readonly calls: string[] = [];
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

export function mount(
  template: string,
  prepare?: (host: TooltipHost) => void,
  beforeRender?: (root: HTMLElement) => void,
  tokens: Record<string, string> = TOOLTIP_LIGHT,
): { fixture: ComponentFixture<TooltipHost>; host: TooltipHost; root: HTMLElement } {
  setTokens(tokens);
  TestBed.configureTestingModule({ providers: [provideCkui()] });
  TestBed.overrideComponent(TooltipHost, { set: { template } });
  const fixture = TestBed.createComponent(TooltipHost);
  const root = fixture.nativeElement as HTMLElement;
  document.body.appendChild(root);
  prepare?.(fixture.componentInstance);
  beforeRender?.(root);
  fixture.detectChanges();
  return { fixture, host: fixture.componentInstance, root };
}

/** Runs change detection and the render hooks until nothing is left. */
export async function settle(fixture?: ComponentFixture<unknown>): Promise<void> {
  const appRef = TestBed.inject(ApplicationRef);
  await appRef.whenStable();
  fixture?.detectChanges();
  appRef.tick();
  await appRef.whenStable();
  appRef.tick();
}

/** Puts the document back the way a spec found it: tokens, direction, body children, the layer. */
export function cleanUp(): void {
  TestBed.resetTestingModule();
  resetEnvironment();
  document.documentElement.classList.remove('cdk-global-scrollblock');
  document.querySelectorAll('.ck-tooltip-layer').forEach((layer) => layer.remove());
}

export const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/** The layer element on `body`, once something created it. */
export const layer = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('.ck-tooltip-layer');

/** Every bubble in the layer, shown or not. */
export const bubbles = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.ck-tooltip-layer > .ck-tooltip'));

/** The bubbles that are showing. */
export const shown = (): HTMLElement[] =>
  bubbles().filter((bubble) => bubble.matches(':popover-open'));

/** A pointer event of a mouse, a pen or a finger on the element. */
export function pointer(
  element: Element,
  type:
    | 'pointerenter'
    | 'pointerleave'
    | 'pointerdown'
    | 'pointerup'
    | 'pointermove'
    | 'pointercancel'
    | 'lostpointercapture',
  init: PointerEventInit = {},
): PointerEvent {
  const rect = element.getBoundingClientRect();
  const event = new PointerEvent(type, {
    bubbles: type !== 'pointerenter' && type !== 'pointerleave',
    cancelable: true,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
    ...init,
  });
  element.dispatchEvent(event);
  return event;
}

/** A key event on the element. */
export function press(element: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  element.dispatchEvent(event);
  return event;
}
