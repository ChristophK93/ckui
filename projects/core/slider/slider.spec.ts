import { ApplicationRef, LOCALE_ID, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideCkui } from '@ckui/core';
import { vi } from 'vitest';
import { expectNoAxeViolations } from '../testing/axe';
import {
  DARK_TOKENS,
  SliderHost,
  TOKENS,
  fillOf,
  mount,
  positionOf,
  press,
  query,
  settle,
  tap,
  thumbOf,
} from '../testing/slider-host';

const SLIDER = (attributes = '') =>
  `<ck-slider aria-label="Grade" ${attributes} [value]="value()" (valueChange)="emitted.push($event)" (valueCommit)="commits.push($event)" />`;

const attribute = (element: Element, name: string): string | null => element.getAttribute(name);

describe('CkSlider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
    TestBed.resetTestingModule();
  });

  describe('structure', () => {
    it('is one slider thumb named by the consumer, with the names moved off the host', async () => {
      const { fixture, root } = mount(
        `<span id="name">Grade</span><span id="hint">Between 0 and 100</span>
         <ck-slider aria-label="Grade" aria-labelledby="name" aria-describedby="hint" [value]="50" />`,
      );
      await settle(fixture);
      const thumb = thumbOf(root);
      expect(root.querySelectorAll('[role="slider"]')).toHaveLength(1);
      expect(attribute(thumb, 'role')).toBe('slider');
      expect(attribute(thumb, 'tabindex')).toBe('0');
      expect(attribute(thumb, 'aria-orientation')).toBe('horizontal');
      expect(attribute(thumb, 'aria-label')).toBe('Grade');
      expect(attribute(thumb, 'aria-labelledby')).toBe('name');
      expect(attribute(thumb, 'aria-describedby')).toBe('hint');
      const host = query(root, 'ck-slider');
      for (const name of ['aria-label', 'aria-labelledby', 'aria-describedby']) {
        expect(host.hasAttribute(name), name).toBe(false);
      }
      expect(attribute(thumb, 'aria-disabled')).toBeNull();
    });

    it('leaves out the naming attributes that were not given', async () => {
      const { fixture, root } = mount(`<ck-slider aria-label="Grade" [value]="5" />`);
      await settle(fixture);
      expect(thumbOf(root).hasAttribute('aria-labelledby')).toBe(false);
      expect(thumbOf(root).hasAttribute('aria-describedby')).toBe(false);
    });

    it('exposes the value, the limits and the value text to assistive technology', async () => {
      const { fixture, root } = mount(SLIDER('[min]="-10" [max]="20" [step]="0.5"'), (host) =>
        host.value.set(4.5),
      );
      await settle(fixture);
      const thumb = thumbOf(root);
      expect(attribute(thumb, 'aria-valuenow')).toBe('4.5');
      expect(attribute(thumb, 'aria-valuemin')).toBe('-10');
      expect(attribute(thumb, 'aria-valuemax')).toBe('20');
      expect(attribute(thumb, 'aria-valuetext')).toBe('4.5');
    });

    it('defaults to 0 to 100 in steps of 1', async () => {
      const { fixture, root } = mount(SLIDER());
      await settle(fixture);
      expect(attribute(thumbOf(root), 'aria-valuemin')).toBe('0');
      expect(attribute(thumbOf(root), 'aria-valuemax')).toBe('100');
      expect(attribute(thumbOf(root), 'aria-valuenow')).toBe('50');
    });

    it('reads limits and step given as strings, as plain attributes are', async () => {
      const { fixture, root } = mount(
        `<ck-slider aria-label="Grade" min="10" max="30" step="5" [value]="19" />`,
      );
      await settle(fixture);
      expect(attribute(thumbOf(root), 'aria-valuemin')).toBe('10');
      expect(attribute(thumbOf(root), 'aria-valuemax')).toBe('30');
      expect(attribute(thumbOf(root), 'aria-valuenow')).toBe('20');
    });

    it('takes the thumb out of the tab order and marks it disabled', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="Grade" [disabled]="locked()" [value]="50" />`,
      );
      host.locked.set(true);
      await settle(fixture);
      expect(thumbOf(root).hasAttribute('tabindex')).toBe(false);
      expect(attribute(thumbOf(root), 'aria-disabled')).toBe('true');
      expect(query(root, 'ck-slider').classList.contains('ck-slider--disabled')).toBe(true);
      host.locked.set(false);
      await settle(fixture);
      expect(attribute(thumbOf(root), 'tabindex')).toBe('0');
      expect(thumbOf(root).hasAttribute('aria-disabled')).toBe(false);
    });

    it('is marked disabled inside a disabled fieldset, and again enabled when it is focused after', async () => {
      const { fixture, host, root } = mount(
        `<fieldset [disabled]="locked()"><ck-slider aria-label="A" [value]="50" /></fieldset>`,
        (testHost) => testHost.locked.set(true),
      );
      await settle(fixture);
      expect(attribute(thumbOf(root), 'aria-disabled')).toBe('true');
      host.locked.set(false);
      await settle(fixture);
      thumbOf(root).focus();
      await settle(fixture);
      expect(thumbOf(root).hasAttribute('aria-disabled')).toBe(false);
    });

    it('uses the size from provideCkui and the size input over it', async () => {
      TestBed.configureTestingModule({ providers: [provideCkui({ size: 'lg' })] });
      const { fixture, root } = mount(
        `<ck-slider aria-label="A" [value]="1" /><ck-slider aria-label="B" size="sm" [value]="1" />`,
      );
      await settle(fixture);
      const [first, second] = Array.from(root.querySelectorAll('ck-slider'));
      expect(first.classList.contains('ck-slider--lg')).toBe(true);
      expect(second.classList.contains('ck-slider--sm')).toBe(true);
      expect(second.classList.contains('ck-slider--lg')).toBe(false);
    });
  });

  describe('value text', () => {
    it('writes the value with the unit: a plain space, none for a percent sign', async () => {
      const { fixture, root } = mount(
        `<ck-slider aria-label="A" unit="W" [value]="250" [max]="500" />
         <ck-slider aria-label="B" unit="%" [value]="40" />
         <ck-slider aria-label="C" [value]="40" />`,
      );
      await settle(fixture);
      expect(attribute(thumbOf(root, 0), 'aria-valuetext')).toBe('250 W');
      expect(attribute(thumbOf(root, 1), 'aria-valuetext')).toBe('40%');
      expect(attribute(thumbOf(root, 2), 'aria-valuetext')).toBe('40');
    });

    it('shows as many fraction digits as the step has', async () => {
      const { fixture, root } = mount(
        `<ck-slider aria-label="A" [step]="0.5" [value]="4" />
         <ck-slider aria-label="B" [step]="0.25" [value]="4.5" />
         <ck-slider aria-label="C" [step]="5" [value]="4" />`,
      );
      await settle(fixture);
      expect(attribute(thumbOf(root, 0), 'aria-valuetext')).toBe('4.0');
      expect(attribute(thumbOf(root, 1), 'aria-valuetext')).toBe('4.50');
      expect(attribute(thumbOf(root, 2), 'aria-valuetext')).toBe('5');
    });

    it('formats with the locale of the app', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de' }] });
      const { fixture, root } = mount(`<ck-slider aria-label="A" [step]="0.5" [value]="4.5" />`);
      await settle(fixture);
      expect(attribute(thumbOf(root), 'aria-valuetext')).toBe('4,5');
    });

    it('lets valueText replace the text, with the shown value, for the thumb and the visible value', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" showValue [valueText]="valueText()" [min]="0" [max]="10" [value]="value()" />`,
        (testHost) => {
          testHost.value.set(7.4);
          testHost.valueText.set((value) => `Level ${value} of 10`);
        },
      );
      await settle(fixture);
      expect(attribute(thumbOf(root), 'aria-valuetext')).toBe('Level 7 of 10');
      expect(query(root, '.ck-slider__value-text').textContent).toBe('Level 7 of 10');
      host.value.set(2);
      await settle(fixture);
      expect(attribute(thumbOf(root), 'aria-valuetext')).toBe('Level 2 of 10');
    });

    it('shows the value next to the track only with showValue, and hides it from assistive technology', async () => {
      const { fixture, root } = mount(
        `<ck-slider aria-label="A" [value]="40" unit="%" showValue />
         <ck-slider aria-label="B" [value]="40" />`,
      );
      await settle(fixture);
      const shown = root.querySelectorAll('.ck-slider__value');
      expect(shown).toHaveLength(1);
      expect(shown[0].querySelector('.ck-slider__value-text')!.textContent).toBe('40%');
      expect(attribute(shown[0], 'aria-hidden')).toBe('true');
      expect(root.querySelector('ck-slider:nth-of-type(2) .ck-slider__value')).toBeNull();
    });

    it('keeps very large numbers and a very long unit whole in the value text', async () => {
      const { fixture, root } = mount(
        `<ck-slider aria-label="A" showValue unit="watts of mean maximal power" [min]="0" [max]="1000000000000" [value]="123456789012" />`,
      );
      await settle(fixture);
      expect(attribute(thumbOf(root), 'aria-valuetext')).toBe(
        '123456789012 watts of mean maximal power',
      );
    });
  });

  describe('a value from outside', () => {
    it('shows a value above the range at max, below it at min, and writes nothing back', async () => {
      const { fixture, host, root } = mount(SLIDER('[min]="10" [max]="20"'), (testHost) =>
        testHost.value.set(150),
      );
      await settle(fixture);
      expect(attribute(thumbOf(root), 'aria-valuenow')).toBe('20');
      expect(fillOf(root).style.inlineSize).toBe('100%');
      host.value.set(-4);
      await settle(fixture);
      expect(attribute(thumbOf(root), 'aria-valuenow')).toBe('10');
      expect(fillOf(root).style.inlineSize).toBe('0%');
      expect(host.emitted).toEqual([]);
      expect(host.commits).toEqual([]);
    });

    it('shows a value that is off the step at the nearest step, and writes nothing back', async () => {
      const { fixture, host, root } = mount(SLIDER('[step]="0.5"'), (testHost) =>
        testHost.value.set(33.3),
      );
      await settle(fixture);
      expect(attribute(thumbOf(root), 'aria-valuenow')).toBe('33.5');
      expect(attribute(thumbOf(root), 'aria-valuetext')).toBe('33.5');
      expect(host.emitted).toEqual([]);
    });

    it('counts steps from min, not from 0', async () => {
      const { fixture, root } = mount(SLIDER('[min]="2" [max]="20" [step]="5"'), (host) =>
        host.value.set(10),
      );
      await settle(fixture);
      expect(attribute(thumbOf(root), 'aria-valuenow')).toBe('12');
    });

    it('does not mark a reactive control dirty for a value it shows clamped', async () => {
      const { fixture, host } = mount(
        `<ck-slider aria-label="A" [min]="0" [max]="10" [formControl]="control" />`,
      );
      host.control.setValue(500);
      await settle(fixture);
      expect(host.control.value).toBe(500);
      expect(host.control.dirty).toBe(false);
    });

    it.each([
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['a string', 'abc' as unknown as number],
    ])('treats %s like no value', async (_name, bad) => {
      const { fixture, root } = mount(SLIDER('[min]="5"'), (host) => host.value.set(bad));
      await settle(fixture);
      expect(attribute(thumbOf(root), 'aria-valuenow')).toBe('5');
      expect(fillOf(root).style.inlineSize).toBe('0%');
    });

    it('shows no value as the thumb at min with an empty fill, still announcing min', async () => {
      const { fixture, host, root } = mount(SLIDER('[min]="-10" [max]="10"'), (testHost) =>
        testHost.value.set(null),
      );
      await settle(fixture);
      expect(attribute(thumbOf(root), 'aria-valuenow')).toBe('-10');
      expect(positionOf(root)).toBe('0%');
      expect(fillOf(root).style.inlineSize).toBe('0%');
      host.value.set(0);
      await settle(fixture);
      expect(positionOf(root)).toBe('50%');
      expect(fillOf(root).style.inlineSize).toBe('50%');
    });

    it('places the thumb and the fill at the fraction of the range', async () => {
      const { fixture, root } = mount(SLIDER('[min]="-10" [max]="20"'), (host) =>
        host.value.set(5),
      );
      await settle(fixture);
      expect(positionOf(root)).toBe('50%');
      expect(fillOf(root).style.inlineSize).toBe('50%');
    });

    it('treats max as min when min is above max, and warns once', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, host, root } = mount(SLIDER('[min]="50" [max]="10"'), (testHost) =>
        testHost.value.set(30),
      );
      await settle(fixture);
      expect(attribute(thumbOf(root), 'aria-valuemin')).toBe('50');
      expect(attribute(thumbOf(root), 'aria-valuemax')).toBe('50');
      expect(attribute(thumbOf(root), 'aria-valuenow')).toBe('50');
      expect(positionOf(root)).toBe('0%');
      expect(fillOf(root).style.inlineSize).toBe('0%');
      host.value.set(80);
      await settle(fixture);
      press(thumbOf(root), 'End');
      press(thumbOf(root), 'ArrowRight');
      await settle(fixture);
      expect(attribute(thumbOf(root), 'aria-valuenow')).toBe('50');
      const crossed = warn.mock.calls.filter(([message]) => String(message).includes('above max'));
      expect(crossed).toHaveLength(1);
    });

    it('uses a step of 1 for 0, negative and non-numeric steps, and warns once', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, root } = mount(
        `<ck-slider aria-label="A" [step]="0" [value]="2.4" />
         <ck-slider aria-label="B" [step]="-3" [value]="2.6" />`,
      );
      await settle(fixture);
      expect(attribute(thumbOf(root, 0), 'aria-valuenow')).toBe('2');
      expect(attribute(thumbOf(root, 1), 'aria-valuenow')).toBe('3');
      expect(warn.mock.calls.filter(([message]) => String(message).includes('step'))).toHaveLength(
        2,
      );
    });

    it('reaches a decimal step without float drift', async () => {
      const { fixture, root } = mount(SLIDER('[step]="0.1"'), (host) => host.value.set(0.2));
      await settle(fixture);
      press(thumbOf(root), 'ArrowRight');
      await settle(fixture);
      expect(attribute(thumbOf(root), 'aria-valuenow')).toBe('0.3');
      expect(attribute(thumbOf(root), 'aria-valuetext')).toBe('0.3');
    });
  });

  describe('development warnings', () => {
    it('warns without an accessible name, and not with a label or labelledby', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture } = mount(`<ck-slider [value]="1" />`);
      await settle(fixture);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('ck-slider has no accessible name'),
        expect.anything(),
      );
      warn.mockClear();
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      const named = mount(
        `<span id="name">Grade</span><ck-slider aria-labelledby="name" [value]="1" />
         <ck-slider aria-label="Other" [value]="1" />`,
      );
      await settle(named.fixture);
      expect(warn).not.toHaveBeenCalled();
    });

    it('is not named by a wrapping label, which cannot label a custom element', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture } = mount(`<label>Grade <ck-slider [value]="1" /></label>`);
      await settle(fixture);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('no accessible name'),
        expect.anything(),
      );
    });

    it('does not warn when destroyed before the first render finishes', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      TestBed.overrideComponent(SliderHost, { set: { template: '<ck-slider [value]="1" />' } });
      TestBed.createComponent(SliderHost).destroy();
      TestBed.inject(ApplicationRef).tick();
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('server rendering', () => {
    it('renders the thumb with its ARIA state, touches no layout and stays silent', async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const computed = vi.spyOn(window, 'getComputedStyle');
      const { fixture, root } = mount(
        SLIDER('unit="%" showValue [min]="-10" [max]="20" [step]="0.5"'),
        (host) => host.value.set(4.5),
      );
      TestBed.inject(ApplicationRef).tick();
      const thumb = thumbOf(root);
      expect(attribute(thumb, 'role')).toBe('slider');
      expect(attribute(thumb, 'aria-valuenow')).toBe('4.5');
      expect(attribute(thumb, 'aria-valuetext')).toBe('4.5%');
      expect(attribute(thumb, 'aria-label')).toBe('Grade');
      expect(positionOf(root)).toMatch(/^48\.33/);
      expect(query(root, '.ck-slider__value-text').textContent).toBe('4.5%');
      expect(query(root, 'ck-slider').classList.contains('ck-slider--md')).toBe(true);
      expect(computed).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
      fixture.destroy();
    });
  });

  describe('events', () => {
    it('reports each live write through valueChange and keeps the model in step', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [(value)]="value" (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      press(thumbOf(root), 'ArrowRight');
      press(thumbOf(root), 'ArrowRight');
      await settle(fixture);
      expect(host.value()).toBe(52);
      expect(host.emitted).toEqual([51, 52]);
    });

    it('does not report a key that changes nothing', async () => {
      const { fixture, host, root } = mount(SLIDER(), (testHost) => testHost.value.set(100));
      await settle(fixture);
      tap(thumbOf(root), 'ArrowRight');
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      expect(host.commits).toEqual([]);
    });
  });

  describe.each([
    ['light', TOKENS],
    ['dark', DARK_TOKENS],
  ])('accessibility in the %s theme', (name, tokens) => {
    it('has no axe violations in any state', async () => {
      const { fixture, root } = mount(
        `<div style="background: var(--ck-color-bg, #fff); color: var(--ck-color-fg)">
          <ck-slider aria-label="Grade" unit="%" showValue [min]="-10" [max]="20" [value]="5" />
          <ck-slider aria-label="Empty" [value]="null" />
          <ck-slider aria-label="Locked" [value]="3" disabled />
          <ck-slider aria-label="At the limit" [value]="100" />
          <span id="label">Cadence</span>
          <span id="hint">Between 40 and 140</span>
          <ck-slider aria-labelledby="label" aria-describedby="hint" [value]="90" />
          <fieldset disabled><legend>Locked group</legend><ck-slider aria-label="In a fieldset" [value]="3" /></fieldset>
        </div>`,
        undefined,
        undefined,
        tokens,
      );
      await settle(fixture);
      expect(getComputedStyle(query(root, 'ck-slider')).colorScheme).toBe(
        name === 'dark' ? 'dark' : 'normal',
      );
      await expectNoAxeViolations(root);
    });
  });
});
