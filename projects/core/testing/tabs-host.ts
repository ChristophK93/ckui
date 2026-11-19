import { ApplicationRef, Component, DestroyRef, Directive, inject, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CkSize } from '@ckui/core';
import { CK_TABS_IMPORTS } from '@ckui/core/tabs';

/** The tokens the shipped stylesheet declares, as far as the tabs need them. */
export const TOKENS = [
  '--ck-control-height-sm:32px',
  '--ck-control-height-md:40px',
  '--ck-control-height-lg:48px',
  '--ck-control-height-xl:60px',
  '--ck-control-padding-inline-sm:8px',
  '--ck-control-padding-inline-md:12px',
  '--ck-control-padding-inline-lg:16px',
  '--ck-control-padding-inline-xl:20px',
  '--ck-control-font-size-sm:14px',
  '--ck-control-font-size-md:16px',
  '--ck-control-font-size-lg:18px',
  '--ck-control-font-size-xl:20px',
  '--ck-line-height-tight:1.25',
  '--ck-font-weight-medium:500',
  '--ck-font-weight-semibold:600',
  '--ck-font-variant-numeric:tabular-nums',
  '--ck-space-1:4px',
  '--ck-duration-fast:0ms',
  '--ck-ease-standard:ease',
  '--ck-color-primary:rgb(60, 60, 200)',
  '--ck-color-border-subtle:rgb(225, 225, 232)',
  '--ck-color-surface-hover:rgba(0, 0, 0, 0.06)',
  '--ck-color-surface-active:rgba(0, 0, 0, 0.12)',
  '--ck-color-fg:rgb(20, 20, 30)',
  '--ck-color-fg-muted:rgb(80, 80, 90)',
  '--ck-color-fg-disabled:rgb(150, 150, 160)',
  '--ck-focus-ring-width:2px',
  '--ck-focus-ring-offset:2px',
  '--ck-focus-ring:2px solid rgb(0, 0, 255)',
].join(';');

/** The same tokens with the dark theme's colours, as `themes.css` sets them. */
export const DARK_TOKENS = [
  TOKENS,
  '--ck-color-scheme:dark',
  '--ck-color-primary:rgb(140, 150, 255)',
  '--ck-color-border-subtle:rgb(50, 50, 60)',
  '--ck-color-surface-hover:rgba(255, 255, 255, 0.08)',
  '--ck-color-surface-active:rgba(255, 255, 255, 0.14)',
  '--ck-color-fg:rgb(245, 245, 250)',
  '--ck-color-fg-muted:rgb(180, 180, 195)',
  '--ck-color-fg-disabled:rgb(120, 120, 135)',
  '--ck-focus-ring:2px solid rgb(120, 160, 255)',
  'background:rgb(20, 20, 24)',
  'color:rgb(245, 245, 250)',
].join(';');

/** A tabs group with the three tabs of the workout library and one shared panel. */
export const TABS = (attributes = '', panel = '<ck-tab-panel>Shared</ck-tab-panel>') =>
  `<ck-tabs ${attributes}>
     <ck-tab-list aria-label="Source">
       <ck-tab value="a">Alpha</ck-tab>
       <ck-tab value="b">Beta</ck-tab>
       <ck-tab value="c">Gamma</ck-tab>
     </ck-tab-list>
     ${panel}
   </ck-tabs>`;

/** How many times a `[probe]` element has been created and destroyed, for the lazy content. */
export const probes = { created: 0, destroyed: 0 };

@Directive({ selector: '[ckProbe]' })
export class Probe {
  constructor() {
    probes.created += 1;
    inject(DestroyRef).onDestroy(() => (probes.destroyed += 1));
  }
}

/** One host for every tabs spec; each test swaps in its own template. */
@Component({
  imports: [CK_TABS_IMPORTS, Probe],
  // Every test overrides this; it only has to use each import once.
  template: `
    <ck-tabs [(value)]="value">
      <ck-tab-list aria-label="Unused">
        <ck-tab value="a">A</ck-tab>
      </ck-tab-list>
      <ck-tab-panel value="a"
        ><ng-template ckTabContent><i ckProbe>A</i></ng-template></ck-tab-panel
      >
    </ck-tabs>
  `,
})
export class TabsHost {
  readonly value = signal<string | null>(null);
  readonly size = signal<CkSize | undefined>(undefined);
  readonly items = signal(['a', 'b', 'c']);
  readonly locked = signal<string[]>([]);
  readonly tabStop = signal(true);
  readonly ids = signal({ tab: 'tab-one', panel: 'panel-one' });
  readonly objectValue = signal<unknown>(null);
  /** Every `(valueChange)` the template reports. */
  readonly emitted: (string | null)[] = [];
}

export function mount(
  template: string,
  prepare?: (host: TabsHost) => void,
  tokens: string = TOKENS,
  beforeRender?: (root: HTMLElement) => void,
): { fixture: ComponentFixture<TabsHost>; host: TabsHost; root: HTMLElement } {
  TestBed.overrideComponent(TabsHost, { set: { template } });
  const fixture = TestBed.createComponent(TabsHost);
  const root = fixture.nativeElement as HTMLElement;
  root.setAttribute('style', tokens);
  document.body.appendChild(root);
  prepare?.(fixture.componentInstance);
  beforeRender?.(root);
  fixture.detectChanges();
  return { fixture, host: fixture.componentInstance, root };
}

/** Runs change detection and every deferred task until nothing is left, twice for effects. */
export async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
  TestBed.inject(ApplicationRef).tick();
}

export const query = <T extends HTMLElement = HTMLElement>(
  root: HTMLElement,
  selector: string,
): T => root.querySelector<T>(selector)!;

export const tabsOf = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>('ck-tab'));

export const panelsOf = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>('ck-tab-panel'));

/** The labels of the selected tabs. */
export const selectedLabels = (root: HTMLElement): string[] =>
  tabsOf(root)
    .filter((tab) => tab.getAttribute('aria-selected') === 'true')
    .map((tab) => tab.textContent!.trim());

/** The text of every panel that is not hidden. */
export const shownPanels = (root: HTMLElement): string[] =>
  panelsOf(root)
    .filter((panel) => !panel.hidden)
    .map((panel) => panel.textContent!.trim());
