import { ApplicationRef, Component, TemplateRef, inject, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FormField, disabled, form, required, submit } from '@angular/forms/signals';
import { CkSize, provideCkui } from '@ckui/core';
import { CkDialog } from '@ckui/core/dialog';
import { CK_FIELD_IMPORTS } from '@ckui/core/field';
import { CkMedia } from '@ckui/core/internal';
import { CK_SELECT_IMPORTS } from '@ckui/core/select';
import { DARK_TOKENS as TOAST_DARK, resetEnvironment, setTokens } from './toast-env';
import { DIALOG_LIGHT } from './dialog-env';

/** The tokens the shipped stylesheet declares, as far as the select and its field need them. */
export const SELECT_LIGHT: Record<string, string> = {
  ...DIALOG_LIGHT,
  '--ck-font-size-xs': '12px',
  '--ck-font-size-sm': '14px',
  '--ck-font-size-lg': '18px',
  '--ck-radius-xl': '16px',
  '--ck-color-surface': 'rgb(255, 255, 255)',
  '--ck-color-control': 'rgb(240, 240, 244)',
  '--ck-color-control-border': 'rgb(110, 110, 120)',
  '--ck-color-border': 'rgb(120, 120, 130)',
  '--ck-color-focus-ring': 'rgb(0, 0, 255)',
  '--ck-color-surface-hover': 'rgba(0, 0, 0, 0.06)',
  '--ck-color-surface-active': 'rgba(0, 0, 0, 0.1)',
  '--ck-color-primary-subtle': 'rgb(232, 232, 252)',
  '--ck-color-primary-fg': 'rgb(60, 50, 180)',
  '--ck-color-danger-fg': 'rgb(150, 0, 0)',
  '--ck-shadow-md': '0 4px 8px rgba(0, 0, 0, 0.12)',
  '--ck-duration-fast': '0ms',
  '--ck-duration-normal': '0ms',
};

export const SELECT_DARK: Record<string, string> = {
  ...SELECT_LIGHT,
  ...TOAST_DARK,
  '--ck-color-surface': 'rgb(30, 30, 36)',
  '--ck-color-control': 'rgb(50, 50, 60)',
  '--ck-color-control-border': 'rgb(150, 150, 165)',
  '--ck-color-border': 'rgb(150, 150, 165)',
  '--ck-color-focus-ring': 'rgb(120, 160, 255)',
  '--ck-focus-ring': '2px solid rgb(120, 160, 255)',
  '--ck-color-primary-subtle': 'rgb(50, 50, 100)',
  '--ck-color-primary-fg': 'rgb(190, 190, 255)',
  '--ck-color-danger-fg': 'rgb(255, 150, 150)',
};

export interface Choice {
  readonly id: number;
  readonly name: string;
}

export const COUNTRIES = [
  'Austria',
  'Belgium',
  'Brazil',
  'Canada',
  'Croatia',
  'Denmark',
  'Ecuador',
  'Finland',
  'France',
  'Germany',
  'Ghana',
  'Greece',
  'Hungary',
  'Iceland',
  'Ireland',
  'Italy',
  'Japan',
  'Kenya',
  'Lithuania',
  'Mexico',
  'Netherlands',
  'Norway',
  'Peru',
  'Poland',
  'Portugal',
  'Romania',
  'Spain',
  'Sweden',
  'Switzerland',
  'Türkiye',
] as const;

/** One host for every select spec; each test swaps in its own template. */
@Component({
  imports: [CK_SELECT_IMPORTS, CK_FIELD_IMPORTS, ReactiveFormsModule, FormsModule, FormField],
  // Every test overrides this; it only has to use each import once.
  template: `
    <ck-select aria-label="Unused" [formControl]="control" />
    <ck-select aria-label="Unused" [(ngModel)]="model" />
    <ck-select aria-label="Unused" [formField]="signalForm.kind" />
    <ck-field><label for="unused">Unused</label></ck-field>
  `,
})
export class SelectHost {
  readonly control = new FormControl<string | null>(null);
  readonly group = new FormGroup({
    kind: new FormControl<string | null>(null, Validators.required),
  });
  readonly model = signal<string | null>(null);
  readonly value = signal<unknown>(null);
  readonly locked = signal(false);
  readonly size = signal<CkSize | undefined>(undefined);
  readonly selectSize = signal<CkSize | undefined>(undefined);
  readonly forced = signal<boolean | undefined>(undefined);
  readonly describedBy = signal<string | null>(null);
  readonly placeholder = signal('Pick one');
  readonly submits = signal(0);
  readonly items = signal<{ value: string; label: string; disabled?: boolean }[]>([
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Bravo' },
    { value: 'c', label: 'Charlie' },
  ]);
  readonly countries = signal<readonly string[]>(COUNTRIES);
  readonly choices: readonly Choice[] = [
    { id: 1, name: 'One' },
    { id: 2, name: 'Two' },
    { id: 3, name: 'Three' },
  ];
  readonly sameChoice = (first: Choice, second: Choice): boolean => first.id === second.id;
  readonly signalModel = signal<{ kind: string | null }>({ kind: null });
  readonly signalForm = form(this.signalModel, (path) => {
    required(path.kind);
    disabled(path.kind, () => this.locked());
  });
  /** A template named `dialogTemplate` can be opened as a dialog. */
  readonly dialogTemplate = viewChild<TemplateRef<unknown>>('dialogTemplate');
  private readonly dialog = inject(CkDialog);
  /** Every `(valueChange)` the template reports. */
  readonly emitted: unknown[] = [];

  openDialog() {
    return this.dialog.open(this.dialogTemplate()!, { ariaLabel: 'Settings' });
  }

  submitSignalForm(): void {
    void submit(this.signalForm, { action: async () => undefined });
  }
}

/** The four options of the plan's example. */
export const KINDS = `
  <ck-option value="ftp">% FTP</ck-option>
  <ck-option value="watt">Watts</ck-option>
  <ck-option value="level">Level</ck-option>
  <ck-option value="free" disabled>Free</ck-option>
`;

export interface MediaFake {
  readonly sheet: ReturnType<typeof signal<boolean>>;
}

/** Replaces `CkMedia`: the select opens as a sheet while `sheet` is true. */
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
  prepare?: (host: SelectHost) => void,
  beforeRender?: (root: HTMLElement) => void,
  tokens: Record<string, string> = SELECT_LIGHT,
): { fixture: ComponentFixture<SelectHost>; host: SelectHost; root: HTMLElement } {
  setTokens(tokens);
  TestBed.configureTestingModule({ providers: [provideCkui()] });
  TestBed.overrideComponent(SelectHost, { set: { template } });
  const fixture = TestBed.createComponent(SelectHost);
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

export const triggerOf = (root: ParentNode, index = 0): HTMLButtonElement =>
  root.querySelectorAll<HTMLButtonElement>('.ck-select__trigger')[index];

export const popup = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('.ck-select-popup');

export const listbox = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('.ck-select-listbox');

export const searchInput = (): HTMLInputElement | null =>
  document.querySelector<HTMLInputElement>('.ck-select-popup__input');

/** The options of the open list, in order, as the user sees them (hidden ones are left out). */
export const optionsOf = (hidden = false): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.ck-select-listbox ck-option')).filter(
    (option) => hidden || !option.hidden,
  );

export const optionText = (option: Element): string =>
  option.textContent!.replace(/\s+/g, ' ').trim();

export const labelsOf = (): string[] => optionsOf().map(optionText);

export const activeOption = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('.ck-select-listbox ck-option.ck-option--active');

export const overlayPanels = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.cdk-overlay-container .ck-overlay'));

/** The text the closed trigger shows. */
export const shownValue = (root: ParentNode, index = 0): string =>
  optionText(triggerOf(root, index).querySelector('.ck-select__value')!);

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
