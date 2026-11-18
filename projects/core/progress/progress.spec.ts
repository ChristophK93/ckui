import { ApplicationRef, Component, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { cdp } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import { CkProgress } from './index';

const LIGHT_TOKENS: Record<string, string> = {
  '--ck-color-scheme': 'light',
  '--ck-color-bg': 'rgb(255, 255, 255)',
  '--ck-color-control': 'rgb(225, 225, 232)',
  '--ck-color-primary': 'rgb(60, 50, 200)',
};

const DARK_TOKENS: Record<string, string> = {
  '--ck-color-scheme': 'dark',
  '--ck-color-bg': 'rgb(20, 20, 24)',
  '--ck-color-control': 'rgb(50, 50, 60)',
  '--ck-color-primary': 'rgb(150, 150, 250)',
};

const SHARED_TOKENS: Record<string, string> = {
  '--ck-space-1': '4px',
  '--ck-radius-full': '9999px',
  '--ck-duration-slow': '300ms',
  '--ck-duration-normal': '200ms',
  '--ck-ease-standard': 'ease',
};

@Component({
  imports: [CkProgress],
  template: `<ck-progress aria-label="Unused" />`,
})
class ProgressHost {
  readonly value = signal<number | null | undefined>(40);
  readonly max = signal(100);
  readonly text = signal<string | undefined>(undefined);
}

function mount(
  template: string,
  tokens: Record<string, string> = LIGHT_TOKENS,
): { fixture: ComponentFixture<ProgressHost>; host: ProgressHost; root: HTMLElement } {
  TestBed.overrideComponent(ProgressHost, { set: { template } });
  const fixture = TestBed.createComponent(ProgressHost);
  const root = fixture.nativeElement as HTMLElement;
  for (const [name, value] of Object.entries({ ...SHARED_TOKENS, ...tokens })) {
    root.style.setProperty(name, value);
  }
  document.body.appendChild(root);
  fixture.detectChanges();
  return { fixture, host: fixture.componentInstance, root };
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
  TestBed.inject(ApplicationRef).tick();
}

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

async function emulate(features: { name: string; value: string }[]): Promise<void> {
  await (cdp() as unknown as Session).send('Emulation.setEmulatedMedia', { features });
}

/** The fill is measured at its final place, not on its way there. */
const NO_TRANSITION: Record<string, string> = { ...LIGHT_TOKENS, '--ck-duration-normal': '0s' };

const BAR =
  '<ck-progress aria-label="Workout" [value]="value()" [max]="max()" [valueText]="text()" />';

const barOf = (root: HTMLElement): HTMLElement => root.querySelector<HTMLElement>('ck-progress')!;
const fillOf = (root: HTMLElement): HTMLElement =>
  root.querySelector<HTMLElement>('.ck-progress__fill')!;

/** The share of the track the fill covers, measured from the layout. */
function covered(root: HTMLElement): number {
  const track = barOf(root).getBoundingClientRect();
  const fill = fillOf(root).getBoundingClientRect();
  return fill.width / track.width;
}

describe('CkProgress', () => {
  afterEach(async () => {
    document.body.replaceChildren();
    document.body.removeAttribute('dir');
    TestBed.resetTestingModule();
    await emulate([]);
  });

  describe('aria', () => {
    it('is a progressbar with the range 0 to max and the current value', () => {
      const { root } = mount(BAR);
      const bar = barOf(root);
      expect(bar.getAttribute('role')).toBe('progressbar');
      expect(bar.getAttribute('aria-valuemin')).toBe('0');
      expect(bar.getAttribute('aria-valuemax')).toBe('100');
      expect(bar.getAttribute('aria-valuenow')).toBe('40');
      expect(bar.getAttribute('aria-label')).toBe('Workout');
      expect(bar.hasAttribute('aria-valuetext')).toBe(false);
    });

    it('follows value, max and valueText when they change', async () => {
      const { fixture, host, root } = mount(BAR);
      host.value.set(2);
      host.max.set(7);
      host.text.set('Step 2 of 7');
      await settle(fixture);
      const bar = barOf(root);
      expect(bar.getAttribute('aria-valuenow')).toBe('2');
      expect(bar.getAttribute('aria-valuemax')).toBe('7');
      expect(bar.getAttribute('aria-valuetext')).toBe('Step 2 of 7');
      host.text.set(undefined);
      await settle(fixture);
      expect(bar.hasAttribute('aria-valuetext')).toBe(false);
    });

    it('drops an empty valueText instead of announcing nothing', () => {
      const { root } = mount('<ck-progress aria-label="Workout" [value]="1" valueText="" />');
      expect(barOf(root).hasAttribute('aria-valuetext')).toBe(false);
    });

    it('can be named by aria-labelledby', () => {
      const { root } = mount(
        '<span id="name">Upload</span><ck-progress aria-labelledby="name" [value]="1" />',
      );
      expect(barOf(root).getAttribute('aria-labelledby')).toBe('name');
    });

    it('is not a live region', () => {
      const { root } = mount(BAR);
      for (const name of ['aria-live', 'aria-atomic']) {
        expect(barOf(root).hasAttribute(name)).toBe(false);
      }
    });

    it('keeps the consumer id and class on the host', () => {
      const { root } = mount(
        '<ck-progress id="mine" class="mine" aria-label="Workout" [value]="1" />',
      );
      expect(barOf(root).id).toBe('mine');
      expect(barOf(root).classList.contains('mine')).toBe(true);
      expect(barOf(root).classList.contains('ck-progress')).toBe(true);
    });
  });

  describe('values', () => {
    it('clamps below zero and above max, in aria-valuenow and in the drawn fill', async () => {
      const { fixture, host, root } = mount(BAR, NO_TRANSITION);
      for (const [value, now, share] of [
        [0, '0', 0],
        [-5, '0', 0],
        [-Infinity, '0', 0],
        [100, '100', 1],
        [150, '100', 1],
        [Infinity, '100', 1],
        [37.5, '37.5', 0.375],
      ] as const) {
        host.value.set(value);
        await settle(fixture);
        expect(barOf(root).getAttribute('aria-valuenow'), String(value)).toBe(now);
        expect(covered(root), String(value)).toBeCloseTo(share, 2);
        expect(barOf(root).classList.contains('ck-progress--indeterminate')).toBe(false);
      }
    });

    it('scales the share to a custom max', async () => {
      const { fixture, host, root } = mount(BAR, NO_TRANSITION);
      host.max.set(7);
      host.value.set(2);
      await settle(fixture);
      expect(covered(root)).toBeCloseTo(2 / 7, 2);
      host.value.set(9);
      await settle(fixture);
      expect(barOf(root).getAttribute('aria-valuenow')).toBe('7');
      expect(covered(root)).toBeCloseTo(1, 2);
    });

    it.each([
      ['0', 0],
      ['-10', -10],
      ['NaN', NaN],
      ['Infinity', Infinity],
      ['-Infinity', -Infinity],
    ])('falls back to a max of 100 for %s', async (_name, max) => {
      const { fixture, host, root } = mount(BAR);
      host.max.set(max);
      host.value.set(50);
      await settle(fixture);
      expect(barOf(root).getAttribute('aria-valuemax')).toBe('100');
      expect(barOf(root).getAttribute('aria-valuenow')).toBe('50');
      expect(covered(root)).toBeCloseTo(0.5, 2);
    });

    it('survives a max that is not a number at all', async () => {
      const { fixture, host, root } = mount(BAR);
      host.max.set('7' as unknown as number);
      host.value.set(50);
      await settle(fixture);
      expect(barOf(root).getAttribute('aria-valuemax')).toBe('100');
      expect(covered(root)).toBeCloseTo(0.5, 2);
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['NaN', NaN],
    ])('is indeterminate for %s, without aria-valuenow', async (_name, value) => {
      const { fixture, host, root } = mount(BAR);
      host.value.set(value);
      await settle(fixture);
      const bar = barOf(root);
      expect(bar.classList.contains('ck-progress--indeterminate')).toBe(true);
      expect(bar.hasAttribute('aria-valuenow')).toBe(false);
      expect(bar.getAttribute('aria-valuemax')).toBe('100');
      expect(bar.getAttribute('role')).toBe('progressbar');
    });

    it('is indeterminate when no value is given at all', () => {
      const { root } = mount('<ck-progress aria-label="Connecting" />');
      expect(barOf(root).classList.contains('ck-progress--indeterminate')).toBe(true);
      expect(barOf(root).hasAttribute('aria-valuenow')).toBe(false);
    });

    it('goes determinate again and back without leaving state behind', async () => {
      const { fixture, host, root } = mount(BAR);
      host.value.set(null);
      await settle(fixture);
      host.value.set(25);
      await settle(fixture);
      expect(barOf(root).getAttribute('aria-valuenow')).toBe('25');
      expect(barOf(root).classList.contains('ck-progress--indeterminate')).toBe(false);
      expect(covered(root)).toBeCloseTo(0.25, 2);
      host.value.set(null);
      await settle(fixture);
      expect(barOf(root).hasAttribute('aria-valuenow')).toBe(false);
    });

    it('treats a value that is not a number, such as a string, as indeterminate', async () => {
      const { fixture, host, root } = mount(BAR);
      host.value.set('40' as unknown as number);
      await settle(fixture);
      expect(barOf(root).hasAttribute('aria-valuenow')).toBe(false);
      expect(barOf(root).classList.contains('ck-progress--indeterminate')).toBe(true);
    });
  });

  describe('look', () => {
    it('is a full-width track of 4px with a fully round end', () => {
      const { root } = mount('<div style="inline-size: 300px">' + BAR + '</div>');
      const rect = barOf(root).getBoundingClientRect();
      expect(rect.width).toBe(300);
      expect(rect.height).toBe(4);
      expect(getComputedStyle(barOf(root)).borderTopLeftRadius).toBe('9999px');
      expect(getComputedStyle(barOf(root)).overflow).toBe('hidden');
    });

    it('paints the track with the control fill and the fill with the primary colour', () => {
      const { root } = mount(BAR);
      expect(getComputedStyle(barOf(root)).backgroundColor).toBe('rgb(225, 225, 232)');
      expect(getComputedStyle(fillOf(root)).backgroundColor).toBe('rgb(60, 50, 200)');
    });

    it('takes the component tokens on the instance, for the thickness too', () => {
      const { root } = mount(
        '<ck-progress aria-label="Step" [value]="50" style="--ck-progress-track: rgb(1, 2, 3); --ck-progress-fill: rgb(4, 5, 6); --ck-progress-thickness: 9px; --ck-progress-radius: 2px" />',
      );
      expect(getComputedStyle(barOf(root)).backgroundColor).toBe('rgb(1, 2, 3)');
      expect(getComputedStyle(fillOf(root)).backgroundColor).toBe('rgb(4, 5, 6)');
      expect(barOf(root).getBoundingClientRect().height).toBe(9);
      expect(getComputedStyle(barOf(root)).borderTopLeftRadius).toBe('2px');
    });

    it('fills from the left in left-to-right text', () => {
      const { root } = mount('<div style="inline-size: 200px">' + BAR + '</div>');
      const track = barOf(root).getBoundingClientRect();
      const fill = fillOf(root).getBoundingClientRect();
      expect(fill.left).toBeCloseTo(track.left, 0);
      expect(fill.right).toBeCloseTo(track.left + 80, 0);
    });

    it('fills from the right in right-to-left text', () => {
      document.body.setAttribute('dir', 'rtl');
      const { root } = mount('<div style="inline-size: 200px">' + BAR + '</div>');
      const track = barOf(root).getBoundingClientRect();
      const fill = fillOf(root).getBoundingClientRect();
      expect(fill.right).toBeCloseTo(track.right, 0);
      expect(fill.left).toBeCloseTo(track.right - 80, 0);
    });

    it('fills from the right in a right-to-left subtree of a left-to-right page', () => {
      const { root } = mount('<div dir="rtl" style="inline-size: 200px">' + BAR + '</div>');
      const track = barOf(root).getBoundingClientRect();
      const fill = fillOf(root).getBoundingClientRect();
      expect(fill.right).toBeCloseTo(track.right, 0);
    });

    it('animates the fill over the normal duration', () => {
      const { root } = mount(BAR);
      const style = getComputedStyle(fillOf(root));
      expect(style.transitionProperty).toBe('transform');
      expect(style.transitionDuration).toBe('0.2s');
    });

    it('moves to a new value over time, not in one frame', async () => {
      const { fixture, host, root } = mount(BAR, {
        ...LIGHT_TOKENS,
        '--ck-duration-normal': '400ms',
      });
      // Resolve the style once, so the transition starts from the drawn 40%.
      expect(getComputedStyle(fillOf(root)).transform).toContain('matrix');
      host.value.set(100);
      fixture.detectChanges();
      const early = covered(root);
      expect(early).toBeGreaterThanOrEqual(0.4);
      expect(early).toBeLessThan(1);
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve, 600));
      expect(covered(root)).toBeCloseTo(1, 2);
    });

    it('does not animate under reduced motion, even with a duration token', async () => {
      const { fixture, host, root } = mount(BAR, {
        ...LIGHT_TOKENS,
        '--ck-duration-normal': '400ms',
      });
      await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      expect(getComputedStyle(fillOf(root)).transitionProperty).toBe('none');
      host.value.set(100);
      fixture.detectChanges();
      expect(covered(root)).toBeCloseTo(1, 2);
    });

    it('draws a track outline and a Highlight fill in forced colors', async () => {
      const { root } = mount(BAR);
      expect(getComputedStyle(barOf(root)).outlineStyle).toBe('none');
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      expect(getComputedStyle(barOf(root)).outlineStyle).toBe('solid');
      expect(getComputedStyle(barOf(root)).outlineWidth).toBe('1px');
      expect(getComputedStyle(fillOf(root)).forcedColorAdjust).toBe('none');
      expect(getComputedStyle(fillOf(root)).backgroundColor).not.toBe('rgb(60, 50, 200)');
    });
  });

  describe('indeterminate', () => {
    const INDETERMINATE =
      '<div style="inline-size: 200px"><ck-progress aria-label="Connecting" /></div>';

    it('runs a segment 40% of the track wide along the track', () => {
      const { root } = mount(INDETERMINATE);
      const style = getComputedStyle(fillOf(root));
      expect(style.animationName).toBe('ck-progress-slide');
      expect(style.animationIterationCount).toBe('infinite');
      expect(fillOf(root).offsetWidth).toBe(80);
    });

    it('lasts five times the slow duration token', () => {
      const { root } = mount(INDETERMINATE, { ...LIGHT_TOKENS, '--ck-duration-slow': '200ms' });
      expect(getComputedStyle(fillOf(root)).animationDuration).toBe('1s');
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      const slower = mount(INDETERMINATE, { ...LIGHT_TOKENS, '--ck-duration-slow': '500ms' });
      expect(getComputedStyle(fillOf(slower.root)).animationDuration).toBe('2.5s');
    });

    it('does not slide the fill into place when it turns determinate, or back', async () => {
      const { fixture, host, root } = mount(BAR, {
        ...LIGHT_TOKENS,
        '--ck-duration-normal': '400ms',
      });
      host.value.set(null);
      await settle(fixture);
      expect(getComputedStyle(fillOf(root)).animationName).toBe('ck-progress-slide');
      host.value.set(40);
      fixture.detectChanges();
      // Measured in the same frame as the change: a transition from the sliding segment's
      // transform and width would still be near the start.
      expect(covered(root)).toBeCloseTo(0.4, 2);
      expect(getComputedStyle(fillOf(root)).animationName).toBe('none');
      host.value.set(null);
      fixture.detectChanges();
      expect(fillOf(root).classList.contains('ck-progress__fill--slide')).toBe(true);
      expect(getComputedStyle(fillOf(root)).transitionProperty).toBe('none');
    });

    it('slides over time, and keeps moving the segment in the track', async () => {
      const { root } = mount(INDETERMINATE);
      const first = fillOf(root).getBoundingClientRect().left;
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(fillOf(root).getBoundingClientRect().left).not.toBe(first);
    });

    it('slides from the right to the left in right-to-left text', async () => {
      document.body.setAttribute('dir', 'rtl');
      const { root } = mount(INDETERMINATE);
      const track = barOf(root).getBoundingClientRect();
      expect(fillOf(root).getBoundingClientRect().left).toBeGreaterThanOrEqual(track.right - 1);
      await new Promise((resolve) => setTimeout(resolve, 600));
      expect(fillOf(root).getBoundingClientRect().left).toBeLessThan(track.right);
    });

    it('is a still, half-width fill from the start under reduced motion', async () => {
      const { root } = mount(INDETERMINATE);
      await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      expect(getComputedStyle(fillOf(root)).animationName).toBe('none');
      const track = barOf(root).getBoundingClientRect();
      const fill = fillOf(root).getBoundingClientRect();
      expect(fill.width).toBeCloseTo(track.width / 2, 0);
      expect(fill.left).toBeCloseTo(track.left, 0);
    });

    it('is a still half-width fill from the right under reduced motion in right-to-left', async () => {
      document.body.setAttribute('dir', 'rtl');
      const { root } = mount(INDETERMINATE);
      await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      const track = barOf(root).getBoundingClientRect();
      const fill = fillOf(root).getBoundingClientRect();
      expect(fill.right).toBeCloseTo(track.right, 0);
      expect(fill.width).toBeCloseTo(track.width / 2, 0);
    });
  });

  describe('dev warnings', () => {
    const warn = () => vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const run = async (template: string) => {
      const mounted = mount(template);
      await TestBed.inject(ApplicationRef).whenStable();
      TestBed.inject(ApplicationRef).tick();
      return mounted;
    };

    it('warns once when there is no accessible name', async () => {
      const spy = warn();
      const { fixture } = await run('<ck-progress [value]="3" />');
      await settle(fixture);
      expect(spy).toHaveBeenCalledTimes(1);
      const [message, element] = spy.mock.calls[0];
      expect(message).toContain('ck-progress');
      expect((element as HTMLElement).tagName).toBe('CK-PROGRESS');
    });

    it.each([
      ['an empty aria-label', '<ck-progress aria-label=" " [value]="3" />'],
      [
        'an aria-labelledby id that does not exist',
        '<ck-progress aria-labelledby="nope" [value]="3" />',
      ],
      [
        'an aria-labelledby pointing at an empty element',
        '<span id="empty"></span><ck-progress aria-labelledby="empty" [value]="3" />',
      ],
      ['only valueText', '<ck-progress valueText="Step 2" [value]="3" />'],
    ])('warns for %s', async (_name, template) => {
      const spy = warn();
      await run(template);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['aria-label', '<ck-progress aria-label="Workout" [value]="3" />'],
      [
        'aria-labelledby',
        '<span id="name">Workout</span><ck-progress aria-labelledby="name" [value]="3" />',
      ],
    ])('does not warn when named through %s', async (_name, template) => {
      const spy = warn();
      await run(template);
      expect(spy).not.toHaveBeenCalled();
    });

    describe('max', () => {
      const BAD_MAX = '<ck-progress aria-label="Workout" [value]="3" [max]="max()" />';

      it.each([0, -5, NaN, Infinity])('warns for a max of %s and counts it as 100', async (max) => {
        const spy = warn();
        const { fixture, host, root } = mount(BAD_MAX);
        host.max.set(max);
        await settle(fixture);
        const messages = spy.mock.calls.filter(([text]) => String(text).includes('max='));
        expect(messages).toHaveLength(1);
        expect(String(messages[0][0])).toContain('100');
        expect(barOf(root).getAttribute('aria-valuemax')).toBe('100');
      });

      it('warns once however often the bad max changes, and not for a good one', async () => {
        const spy = warn();
        const { fixture, host } = mount(BAD_MAX);
        await settle(fixture);
        expect(spy).not.toHaveBeenCalled();
        for (const max of [0, -1, NaN, 5, 0]) {
          host.max.set(max);
          await settle(fixture);
        }
        expect(spy.mock.calls.filter(([text]) => String(text).includes('max='))).toHaveLength(1);
      });

      it('does not warn on the server', async () => {
        TestBed.configureTestingModule({
          providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
        });
        const spy = warn();
        const { fixture, host } = mount(BAD_MAX);
        host.max.set(0);
        await settle(fixture);
        expect(spy).not.toHaveBeenCalled();
      });

      it('does not warn for a bad max after the component was destroyed', async () => {
        const spy = warn();
        const { fixture, host } = mount(BAD_MAX);
        await settle(fixture);
        fixture.destroy();
        host.max.set(0);
        TestBed.inject(ApplicationRef).tick();
        await TestBed.inject(ApplicationRef).whenStable();
        expect(spy).not.toHaveBeenCalled();
      });

      it('does not warn when destroyed before the first render finishes', () => {
        const spy = warn();
        TestBed.overrideComponent(ProgressHost, {
          set: { template: '<ck-progress aria-label="A" [max]="0" />' },
        });
        TestBed.createComponent(ProgressHost).destroy();
        TestBed.inject(ApplicationRef).tick();
        expect(spy).not.toHaveBeenCalled();
      });
    });

    it('does not warn when destroyed before the first render finishes', () => {
      const spy = warn();
      TestBed.overrideComponent(ProgressHost, { set: { template: '<ck-progress />' } });
      TestBed.createComponent(ProgressHost).destroy();
      TestBed.inject(ApplicationRef).tick();
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not warn on the server', async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const spy = warn();
      await run('<ck-progress [value]="3" />');
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('server rendering', () => {
    it('renders the aria values and the fill share on the server', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const { root } = mount(
        '<ck-progress aria-label="Workout" [value]="2" [max]="8" valueText="Step 2 of 8" />',
      );
      const bar = barOf(root);
      expect(bar.getAttribute('aria-valuenow')).toBe('2');
      expect(bar.getAttribute('aria-valuemax')).toBe('8');
      expect(bar.getAttribute('aria-valuetext')).toBe('Step 2 of 8');
      expect(bar.style.getPropertyValue('--_ck-progress-fraction')).toBe('0.25');
    });
  });

  describe.each([
    ['light', LIGHT_TOKENS],
    ['dark', DARK_TOKENS],
  ])('accessibility in the %s theme', (_name, tokens) => {
    it('has no axe violations, determinate, indeterminate, empty and full', async () => {
      const { fixture, host, root } = mount(
        `<div style="background: var(--ck-color-bg); inline-size: 300px">${BAR}</div>`,
        tokens,
      );
      await expectNoAxeViolations(root);
      for (const value of [null, 0, 100, 150]) {
        host.value.set(value);
        await settle(fixture);
        await expectNoAxeViolations(root);
      }
    });
  });
});
