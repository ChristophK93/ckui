import { ApplicationRef, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormField, disabled, form } from '@angular/forms/signals';
import { CkSize } from '@ckui/core';
import { CK_SEGMENTED_IMPORTS } from '@ckui/core/segmented';

/** The tokens the shipped stylesheet declares, as far as the segmented control needs them. */
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
  '--ck-control-radius:8px',
  '--ck-line-height-tight:1.25',
  '--ck-font-weight-medium:500',
  '--ck-font-variant-numeric:tabular-nums',
  '--ck-space-1:4px',
  '--ck-space-2:8px',
  '--ck-duration-normal:0ms',
  '--ck-ease-standard:ease',
  '--ck-color-control:rgb(240, 240, 244)',
  '--ck-color-control-border:rgb(110, 110, 120)',
  '--ck-color-surface-raised:rgb(255, 255, 255)',
  '--ck-color-surface-hover:rgba(0, 0, 0, 0.06)',
  '--ck-color-fg:rgb(20, 20, 30)',
  '--ck-color-fg-muted:rgb(80, 80, 90)',
  '--ck-color-fg-disabled:rgb(150, 150, 160)',
  '--ck-focus-ring-width:2px',
  '--ck-focus-ring:2px solid rgb(0, 0, 255)',
  '--ck-shadow-sm:0 1px 2px rgba(0, 0, 0, 0.2)',
].join(';');

export const SEGMENTS =
  '<ck-segment value="a">A</ck-segment><ck-segment value="b">B</ck-segment><ck-segment value="c">C</ck-segment>';

/** One host for every segmented spec; each test swaps in its own template. */
@Component({
  imports: [CK_SEGMENTED_IMPORTS, ReactiveFormsModule, FormsModule, FormField],
  // Every test overrides this; it only has to use each import once.
  template: `
    <ck-segmented aria-label="Unused" [formControl]="control"
      ><ck-segment value="a">A</ck-segment></ck-segmented
    >
    <ck-segmented aria-label="Unused" [(ngModel)]="model"
      ><ck-segment value="a">A</ck-segment></ck-segmented
    >
    <ck-segmented aria-label="Unused" [formField]="signalForm.choice"
      ><ck-segment value="a">A</ck-segment></ck-segmented
    >
  `,
})
export class SegmentedHost {
  readonly control = new FormControl<string | null>('b');
  readonly model = signal<string | null>('b');
  readonly value = signal<string | null>('b');
  readonly locked = signal(false);
  readonly size = signal<CkSize | undefined>(undefined);
  readonly items = signal(['a', 'b', 'c']);
  readonly one = { id: 1 };
  readonly two = { id: 1 };
  readonly objectValue = signal<unknown>(null);
  readonly signalModel = signal<{ choice: string | null }>({ choice: 'b' });
  readonly signalForm = form(this.signalModel, (path) => {
    disabled(path.choice, () => this.locked());
  });
  /** Every `ngModelChange` and `(valueChange)` the template reports. */
  readonly emitted: (string | null)[] = [];
}

export function mount(
  template: string,
  prepare?: (host: SegmentedHost) => void,
): {
  fixture: ComponentFixture<SegmentedHost>;
  host: SegmentedHost;
  root: HTMLElement;
} {
  TestBed.overrideComponent(SegmentedHost, { set: { template } });
  const fixture = TestBed.createComponent(SegmentedHost);
  const root = fixture.nativeElement as HTMLElement;
  root.setAttribute('style', TOKENS);
  document.body.appendChild(root);
  prepare?.(fixture.componentInstance);
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

export const segmentsOf = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>('ck-segment'));

/** The `aria-checked` state of every segment, as the labels of the checked ones. */
export const checkedLabels = (root: HTMLElement): string[] =>
  segmentsOf(root)
    .filter((segment) => segment.getAttribute('aria-checked') === 'true')
    .map((segment) => segment.textContent!.trim());
