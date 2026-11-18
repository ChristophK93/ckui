import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideCkui } from '@ckui/core';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import {
  SEGMENTS,
  SegmentedHost,
  checkedLabels,
  mount,
  query,
  segmentsOf,
  settle,
} from '../testing/segmented-host';

const GROUP = (attributes = '', content = SEGMENTS) =>
  `<ck-segmented aria-label="Unit" ${attributes}>${content}</ck-segmented>`;

const BEFORE = '<button id="before">Before</button>';
const AFTER = '<button id="after">After</button>';

/** A group of four where the second segment is disabled, for the skipping rules. */
const WITH_DISABLED =
  '<ck-segment value="a">A</ck-segment><ck-segment value="b" disabled>B</ck-segment>' +
  '<ck-segment value="c">C</ck-segment><ck-segment value="d">D</ck-segment>';

const ICON = '<svg aria-hidden="true" viewBox="0 0 16 16"><path d="M0 0h16v16H0z" /></svg>';

const tabIndexes = (root: HTMLElement) =>
  segmentsOf(root).map((segment) => segment.getAttribute('tabindex'));

describe('CkSegmented', () => {
  afterEach(() => {
    document.body.replaceChildren();
    TestBed.resetTestingModule();
  });

  describe('structure', () => {
    it('is a radio group of radios, named by the consumer', () => {
      const { root } = mount(GROUP());
      const group = query(root, 'ck-segmented');
      expect(group.getAttribute('role')).toBe('radiogroup');
      expect(group.getAttribute('aria-label')).toBe('Unit');
      expect(segmentsOf(root).map((segment) => segment.getAttribute('role'))).toEqual([
        'radio',
        'radio',
        'radio',
      ]);
    });

    it('marks the segment that matches the value as checked', async () => {
      const { fixture, root } = mount(GROUP('[value]="value()"'));
      await settle(fixture);
      expect(segmentsOf(root).map((segment) => segment.getAttribute('aria-checked'))).toEqual([
        'false',
        'true',
        'false',
      ]);
      expect(query(root, 'ck-segmented').classList.contains('ck-segmented--has-value')).toBe(true);
    });

    it('follows the value when it changes', async () => {
      const { fixture, host, root } = mount(GROUP('[value]="value()"'));
      await settle(fixture);
      host.value.set('c');
      await settle(fixture);
      expect(checkedLabels(root)).toEqual(['C']);
      host.value.set('a');
      await settle(fixture);
      expect(checkedLabels(root)).toEqual(['A']);
    });

    it.each([
      ['null', 'null'],
      ['a value no segment has', "'zzz'"],
    ])('checks nothing and shows no indicator for %s', async (_name, expression) => {
      const { fixture, root } = mount(GROUP(`[value]="${expression}"`));
      await settle(fixture);
      expect(checkedLabels(root)).toEqual([]);
      expect(
        segmentsOf(root).every((segment) => segment.getAttribute('aria-checked') === 'false'),
      ).toBe(true);
      expect(query(root, 'ck-segmented').classList.contains('ck-segmented--has-value')).toBe(false);
      expect(getComputedStyle(query(root, '.ck-segmented__indicator')).display).toBe('none');
    });

    it('checks nothing while the value was never set', async () => {
      const { fixture, root } = mount(GROUP());
      await settle(fixture);
      expect(checkedLabels(root)).toEqual([]);
      expect(getComputedStyle(query(root, '.ck-segmented__indicator')).display).toBe('none');
    });

    it('shows the indicator again after null and back', async () => {
      const { fixture, host, root } = mount(GROUP('[value]="value()"'));
      await settle(fixture);
      host.value.set(null);
      await settle(fixture);
      expect(getComputedStyle(query(root, '.ck-segmented__indicator')).display).toBe('none');
      host.value.set('a');
      await settle(fixture);
      expect(getComputedStyle(query(root, '.ck-segmented__indicator')).display).toBe('block');
    });

    it('keeps the indicator out of the accessibility tree', () => {
      const { root } = mount(GROUP());
      expect(query(root, '.ck-segmented__indicator').getAttribute('aria-hidden')).toBe('true');
    });

    it('takes the size from the input, then from provideCkui, then md', async () => {
      TestBed.configureTestingModule({ providers: [provideCkui({ size: 'lg' })] });
      const { fixture, host, root } = mount(GROUP('[size]="size()"'));
      await settle(fixture);
      const group = query(root, 'ck-segmented');
      expect(group.classList.contains('ck-segmented--lg')).toBe(true);
      host.size.set('xl');
      await settle(fixture);
      expect(group.classList.contains('ck-segmented--xl')).toBe(true);
      expect(group.classList.contains('ck-segmented--lg')).toBe(false);
    });

    it('defaults to md', () => {
      const { root } = mount(GROUP());
      expect(query(root, 'ck-segmented').classList.contains('ck-segmented--md')).toBe(true);
    });

    it('adds the full width class for fullWidth', () => {
      const { root } = mount(GROUP('fullWidth'));
      expect(query(root, 'ck-segmented').classList.contains('ck-segmented--full-width')).toBe(true);
    });

    it('keeps the consumer attributes on the host', () => {
      const { root } = mount(GROUP('id="mine" aria-describedby="help" class="mine"'));
      const group = query(root, 'ck-segmented');
      expect(group.id).toBe('mine');
      expect(group.getAttribute('aria-describedby')).toBe('help');
      expect(group.classList.contains('mine')).toBe(true);
      expect(group.classList.contains('ck-segmented')).toBe(true);
    });

    it('handles segments added and removed, and keeps the indicator on the checked one', async () => {
      const { fixture, host, root } = mount(
        GROUP(
          '[value]="value()"',
          '@for (item of items(); track item) {<ck-segment [value]="item">{{ item }}</ck-segment>}',
        ),
      );
      await settle(fixture);
      const group = query(root, 'ck-segmented');
      expect(tabIndexes(root)).toEqual(['-1', '0', '-1']);
      expect(group.style.getPropertyValue('--_ck-segmented-column')).toBe('2');
      host.items.set(['b', 'c', 'd', 'e']);
      await settle(fixture);
      expect(checkedLabels(root)).toEqual(['b']);
      expect(tabIndexes(root)).toEqual(['0', '-1', '-1', '-1']);
      expect(group.style.getPropertyValue('--_ck-segmented-column')).toBe('1');
      host.items.set(['c', 'd']);
      await settle(fixture);
      expect(checkedLabels(root)).toEqual([]);
      expect(tabIndexes(root)).toEqual(['0', '-1']);
      expect(group.classList.contains('ck-segmented--has-value')).toBe(false);
      expect(group.style.getPropertyValue('--_ck-segmented-column')).toBe('');
    });

    it('compares object values by identity', async () => {
      const { fixture, host, root } = mount(
        GROUP(
          '[value]="objectValue()"',
          '<ck-segment [value]="one">One</ck-segment><ck-segment [value]="two">Two</ck-segment>',
        ),
      );
      host.objectValue.set(host.two);
      await settle(fixture);
      expect(checkedLabels(root)).toEqual(['Two']);
    });
  });

  describe('tab stop', () => {
    it('is the checked segment, the others are skipped', async () => {
      const { fixture, root } = mount(GROUP('[value]="value()"'));
      await settle(fixture);
      expect(tabIndexes(root)).toEqual(['-1', '0', '-1']);
    });

    it('is the first segment when nothing is checked', async () => {
      const { fixture, root } = mount(GROUP('[value]="null"'));
      await settle(fixture);
      expect(tabIndexes(root)).toEqual(['0', '-1', '-1']);
    });

    it('is the first enabled segment when the first is disabled and nothing is checked', async () => {
      const { fixture, root } = mount(
        GROUP(
          '[value]="null"',
          '<ck-segment value="a" disabled>A</ck-segment><ck-segment value="b">B</ck-segment>',
        ),
      );
      await settle(fixture);
      expect(tabIndexes(root)).toEqual([null, '0']);
    });

    it('is the first enabled segment when the checked one is disabled', async () => {
      const { fixture, root } = mount(
        GROUP(
          'value="a"',
          '<ck-segment value="a" disabled>A</ck-segment><ck-segment value="b">B</ck-segment>',
        ),
      );
      await settle(fixture);
      expect(tabIndexes(root)).toEqual([null, '0']);
    });

    it('moves with the value', async () => {
      const { fixture, host, root } = mount(GROUP('[value]="value()"'));
      await settle(fixture);
      host.value.set('c');
      await settle(fixture);
      expect(tabIndexes(root)).toEqual(['-1', '-1', '0']);
    });

    it('is nowhere when every segment is disabled', async () => {
      const { fixture, root } = mount(
        GROUP(
          '',
          '<ck-segment value="a" disabled>A</ck-segment><ck-segment value="b" disabled>B</ck-segment>',
        ),
      );
      await settle(fixture);
      expect(tabIndexes(root)).toEqual([null, null]);
    });

    it('is entered once on the checked segment and left with the next Tab', async () => {
      const { fixture, root } = mount(`${BEFORE}${GROUP('[value]="value()"')}${AFTER}`);
      await settle(fixture);
      const segments = segmentsOf(root);
      query(root, '#before').focus();
      await userEvent.tab();
      expect(document.activeElement).toBe(segments[1]);
      await userEvent.tab();
      expect(document.activeElement).toBe(query(root, '#after'));
      await userEvent.tab({ shift: true });
      expect(document.activeElement).toBe(segments[1]);
      await userEvent.tab({ shift: true });
      expect(document.activeElement).toBe(query(root, '#before'));
    });

    it('is entered on the first enabled segment when the value is null', async () => {
      const { fixture, root } = mount(`${BEFORE}${GROUP('[value]="null"')}`);
      await settle(fixture);
      query(root, '#before').focus();
      await userEvent.tab();
      expect(document.activeElement).toBe(segmentsOf(root)[0]);
      expect(checkedLabels(root)).toEqual([]);
    });
  });

  describe('keyboard', () => {
    async function focused(template: string, label: string) {
      const mounted = mount(template);
      await settle(mounted.fixture);
      const target = segmentsOf(mounted.root).find(
        (segment) => segment.textContent!.trim() === label,
      )!;
      target.focus();
      expect(document.activeElement).toBe(target);
      return { ...mounted, active: () => document.activeElement as HTMLElement };
    }

    describe.each([
      ['ltr', '<div dir="ltr">', 'ArrowRight', 'ArrowLeft'],
      ['rtl', '<div dir="rtl">', 'ArrowLeft', 'ArrowRight'],
    ])('in %s', (_name, wrapper, forward, backward) => {
      const group = (attributes: string, content = SEGMENTS) =>
        `${wrapper}${GROUP(attributes, content)}</div>`;

      it(`${forward} moves to the next segment and selects it`, async () => {
        const { fixture, host, root, active } = await focused(group('[(value)]="value"'), 'A');
        await userEvent.keyboard(`{${forward}}`);
        await settle(fixture);
        expect(active().textContent).toBe('B');
        expect(host.value()).toBe('b');
        expect(checkedLabels(root)).toEqual(['B']);
      });

      it(`${backward} moves to the previous segment and selects it`, async () => {
        const { fixture, host, root, active } = await focused(group('[(value)]="value"'), 'B');
        await userEvent.keyboard(`{${backward}}`);
        await settle(fixture);
        expect(active().textContent).toBe('A');
        expect(host.value()).toBe('a');
        expect(checkedLabels(root)).toEqual(['A']);
      });

      it(`${forward} wraps from the last segment to the first`, async () => {
        const { fixture, host, active } = await focused(group('[(value)]="value"'), 'C');
        await userEvent.keyboard(`{${forward}}`);
        await settle(fixture);
        expect(active().textContent).toBe('A');
        expect(host.value()).toBe('a');
      });

      it(`${backward} wraps from the first segment to the last`, async () => {
        const { fixture, host, active } = await focused(group('[(value)]="value"'), 'A');
        await userEvent.keyboard(`{${backward}}`);
        await settle(fixture);
        expect(active().textContent).toBe('C');
        expect(host.value()).toBe('c');
      });

      it(`${forward} skips a disabled segment`, async () => {
        const { fixture, host, active } = await focused(
          group('[(value)]="value"', WITH_DISABLED),
          'A',
        );
        await userEvent.keyboard(`{${forward}}`);
        await settle(fixture);
        expect(active().textContent).toBe('C');
        expect(host.value()).toBe('c');
      });

      it(`${backward} skips a disabled segment and wraps over it`, async () => {
        const { fixture, host, active } = await focused(
          group('[(value)]="value"', WITH_DISABLED),
          'C',
        );
        await userEvent.keyboard(`{${backward}}`);
        await settle(fixture);
        expect(active().textContent).toBe('A');
        await userEvent.keyboard(`{${backward}}`);
        await settle(fixture);
        expect(active().textContent).toBe('D');
        expect(host.value()).toBe('d');
      });

      it('Home and End go to the first and last segment of the list', async () => {
        const { fixture, host, active } = await focused(group('[(value)]="value"'), 'B');
        await userEvent.keyboard('{End}');
        await settle(fixture);
        expect(active().textContent).toBe('C');
        await userEvent.keyboard('{Home}');
        await settle(fixture);
        expect(active().textContent).toBe('A');
        expect(host.value()).toBe('a');
      });
    });

    it.each([
      ['ltr', ''],
      ['rtl', 'dir="rtl"'],
    ])(
      'ArrowDown and ArrowUp move the same way whatever the direction (%s)',
      async (_name, direction) => {
        const { fixture, host, active } = await focused(
          `<div ${direction}>${GROUP('[(value)]="value"')}</div>`,
          'B',
        );
        await userEvent.keyboard('{ArrowDown}');
        await settle(fixture);
        expect(active().textContent).toBe('C');
        expect(host.value()).toBe('c');
        await userEvent.keyboard('{ArrowUp}{ArrowUp}');
        await settle(fixture);
        expect(active().textContent).toBe('A');
        expect(host.value()).toBe('a');
      },
    );

    it('selects the second segment on ArrowRight when focus entered an empty group', async () => {
      const { fixture, host, root } = mount(`${BEFORE}${GROUP('[(value)]="value"')}`);
      host.value.set(null);
      await settle(fixture);
      query(root, '#before').focus();
      await userEvent.tab();
      expect(host.value()).toBeNull();
      await userEvent.keyboard('{ArrowRight}');
      await settle(fixture);
      expect(document.activeElement).toBe(segmentsOf(root)[1]);
      expect(host.value()).toBe('b');
    });

    it('does not select a segment just by focusing it', async () => {
      const { fixture, host, root } = mount(`${BEFORE}${GROUP('[(value)]="value"')}`);
      host.value.set(null);
      await settle(fixture);
      query(root, '#before').focus();
      await userEvent.tab();
      await settle(fixture);
      expect(host.value()).toBeNull();
      expect(checkedLabels(root)).toEqual([]);
    });

    it('selects the focused segment with Space and keeps the page from scrolling', async () => {
      const { fixture, host, root, active } = await focused(GROUP('[(value)]="value"'), 'C');
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      active().dispatchEvent(event);
      await settle(fixture);
      expect(event.defaultPrevented).toBe(true);
      expect(host.value()).toBe('c');
      expect(checkedLabels(root)).toEqual(['C']);
    });

    it('selects with Space through a real key press', async () => {
      const { fixture, host } = await focused(GROUP('[(value)]="value"'), 'C');
      await userEvent.keyboard(' ');
      await settle(fixture);
      expect(host.value()).toBe('c');
    });

    it('does nothing on Space for a disabled segment', async () => {
      const { fixture, host, root } = mount(GROUP('[(value)]="value"', WITH_DISABLED));
      await settle(fixture);
      segmentsOf(root)[1].dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      await settle(fixture);
      expect(host.value()).toBe('b');
    });

    it('goes to the first and last enabled segment with Home and End', async () => {
      const { fixture, host, active } = await focused(
        GROUP(
          '[(value)]="value"',
          '<ck-segment value="a" disabled>A</ck-segment><ck-segment value="b">B</ck-segment>' +
            '<ck-segment value="c">C</ck-segment><ck-segment value="d" disabled>D</ck-segment>',
        ),
        'C',
      );
      await userEvent.keyboard('{Home}');
      await settle(fixture);
      expect(active().textContent).toBe('B');
      expect(host.value()).toBe('b');
      await userEvent.keyboard('{End}');
      await settle(fixture);
      expect(active().textContent).toBe('C');
      expect(host.value()).toBe('c');
    });

    it('stays put and keeps the value when only one segment is enabled', async () => {
      const { fixture, host, active } = await focused(
        GROUP(
          '[(value)]="value"',
          '<ck-segment value="a" disabled>A</ck-segment><ck-segment value="b">B</ck-segment><ck-segment value="c" disabled>C</ck-segment>',
        ),
        'B',
      );
      await userEvent.keyboard('{ArrowRight}{ArrowLeft}{ArrowDown}{Home}{End}');
      await settle(fixture);
      expect(active().textContent).toBe('B');
      expect(host.value()).toBe('b');
    });

    it.each(['{Enter}', '{Escape}', 'x', '{PageDown}'])('ignores %s', async (key) => {
      const { fixture, host, active } = await focused(GROUP('[(value)]="value"'), 'A');
      await userEvent.keyboard(key);
      await settle(fixture);
      expect(active().textContent).toBe('A');
      expect(host.value()).toBe('b');
    });

    it.each(['ctrlKey', 'metaKey', 'altKey'])('ignores arrows held with %s', async (modifier) => {
      const { fixture, host, active } = await focused(GROUP('[(value)]="value"'), 'B');
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
        [modifier]: true,
      });
      active().dispatchEvent(event);
      await settle(fixture);
      expect(event.defaultPrevented).toBe(false);
      expect(host.value()).toBe('b');
    });

    it('lets a key through that happens outside every segment', async () => {
      const { fixture, host, root } = mount(GROUP('[(value)]="value"'));
      await settle(fixture);
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      });
      query(root, 'ck-segmented').dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(host.value()).toBe('b');
    });

    it('does not react to keys while the group is disabled', async () => {
      const { fixture, host, root } = mount(GROUP('[(value)]="value" [disabled]="locked()"'));
      host.locked.set(true);
      await settle(fixture);
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      });
      segmentsOf(root)[1].dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(host.value()).toBe('b');
    });

    it('survives a burst of arrow keys', async () => {
      const { fixture, host, root, active } = await focused(GROUP('[(value)]="value"'), 'A');
      await userEvent.keyboard('{ArrowRight}'.repeat(7));
      await settle(fixture);
      expect(active()).toBe(segmentsOf(root)[7 % 3]);
      expect(host.value()).toBe('b');
    });
  });

  describe('pointer', () => {
    it('selects the clicked segment', async () => {
      const { fixture, host, root } = mount(GROUP('[(value)]="value"'));
      await settle(fixture);
      await userEvent.click(segmentsOf(root)[2]);
      await settle(fixture);
      expect(host.value()).toBe('c');
      expect(checkedLabels(root)).toEqual(['C']);
    });

    it('selects when the click lands on an icon inside the segment', async () => {
      const { fixture, host, root } = mount(
        GROUP(
          '[(value)]="value"',
          `<ck-segment value="a">${ICON}A</ck-segment><ck-segment value="b">B</ck-segment>`,
        ),
      );
      host.value.set('b');
      await settle(fixture);
      await userEvent.click(query(root, 'ck-segment svg'));
      await settle(fixture);
      expect(host.value()).toBe('a');
    });

    it('ignores a click on a disabled segment', async () => {
      const { fixture, host, root } = mount(GROUP('[(value)]="value"', WITH_DISABLED));
      await settle(fixture);
      segmentsOf(root)[1].click();
      await settle(fixture);
      expect(host.value()).toBe('b');
    });

    it('does not focus a disabled segment on a pointer click', async () => {
      const { fixture, root } = mount(`${BEFORE}${GROUP('[(value)]="value"', WITH_DISABLED)}`);
      await settle(fixture);
      query(root, '#before').focus();
      await userEvent.click(segmentsOf(root)[1], { force: true });
      expect(document.activeElement).not.toBe(segmentsOf(root)[1]);
      expect(segmentsOf(root)[1].hasAttribute('tabindex')).toBe(false);
    });

    it('does not focus any segment of a disabled group on a pointer click', async () => {
      const { fixture, host, root } = mount(GROUP('[value]="value()" [disabled]="locked()"'));
      host.locked.set(true);
      await settle(fixture);
      await userEvent.click(segmentsOf(root)[0], { force: true });
      expect(segmentsOf(root).includes(document.activeElement as HTMLElement)).toBe(false);
    });

    it('ignores every click while the group is disabled', async () => {
      const { fixture, host, root } = mount(GROUP('[(value)]="value" [disabled]="locked()"'));
      host.locked.set(true);
      await settle(fixture);
      segmentsOf(root)[2].click();
      await settle(fixture);
      expect(host.value()).toBe('b');
    });

    it('reports a click on the checked segment as no change', async () => {
      const { fixture, host, root } = mount(
        GROUP('[ngModel]="model()" (ngModelChange)="emitted.push($event)"'),
      );
      await settle(fixture);
      await userEvent.click(segmentsOf(root)[1]);
      await settle(fixture);
      expect(host.emitted).toEqual([]);
    });

    it('moves the roving tab stop with a click', async () => {
      const { fixture, root } = mount(GROUP('[(value)]="value"'));
      await settle(fixture);
      await userEvent.click(segmentsOf(root)[0]);
      await settle(fixture);
      expect(tabIndexes(root)).toEqual(['0', '-1', '-1']);
    });
  });

  describe('disabled', () => {
    it('sets aria-disabled on the group and every segment and leaves the tab order', async () => {
      const { fixture, host, root } = mount(GROUP('[value]="value()" [disabled]="locked()"'));
      host.locked.set(true);
      await settle(fixture);
      expect(query(root, 'ck-segmented').getAttribute('aria-disabled')).toBe('true');
      for (const segment of segmentsOf(root)) {
        expect(segment.getAttribute('aria-disabled')).toBe('true');
        expect(segment.hasAttribute('tabindex')).toBe(false);
      }
      host.locked.set(false);
      await settle(fixture);
      expect(query(root, 'ck-segmented').hasAttribute('aria-disabled')).toBe(false);
      expect(segmentsOf(root)[1].getAttribute('tabindex')).toBe('0');
    });

    it('is skipped by Tab', async () => {
      const { fixture, host, root } = mount(
        `${BEFORE}${GROUP('[value]="value()" [disabled]="locked()"')}${AFTER}`,
      );
      host.locked.set(true);
      await settle(fixture);
      query(root, '#before').focus();
      await userEvent.tab();
      expect(document.activeElement).toBe(query(root, '#after'));
    });

    it('marks only the disabled segment', async () => {
      const { fixture, root } = mount(GROUP('[value]="value()"', WITH_DISABLED));
      await settle(fixture);
      expect(segmentsOf(root).map((segment) => segment.getAttribute('aria-disabled'))).toEqual([
        null,
        'true',
        null,
        null,
      ]);
    });

    it('takes the disabled attribute as a plain boolean attribute', async () => {
      const { fixture, root } = mount(GROUP('disabled'));
      await settle(fixture);
      expect(query(root, 'ck-segmented').getAttribute('aria-disabled')).toBe('true');
    });
  });

  describe('touched', () => {
    it('is set when focus leaves the group, not when it moves inside', async () => {
      const { fixture, host, root } = mount(`${GROUP('[formControl]="control"')}${AFTER}`);
      await settle(fixture);
      segmentsOf(root)[1].focus();
      await userEvent.keyboard('{ArrowRight}');
      await userEvent.keyboard('{ArrowLeft}');
      await settle(fixture);
      expect(host.control.touched).toBe(false);
      query(root, '#after').focus();
      await settle(fixture);
      expect(host.control.touched).toBe(true);
    });

    it('is set when focus leaves through a click on something else', async () => {
      const { fixture, host, root } = mount(`${GROUP('[formControl]="control"')}${AFTER}`);
      await settle(fixture);
      await userEvent.click(segmentsOf(root)[0]);
      expect(host.control.touched).toBe(false);
      await userEvent.click(query(root, '#after'));
      expect(host.control.touched).toBe(true);
    });

    it('is not set while the group is disabled', async () => {
      const { fixture, host, root } = mount(`${GROUP('[formControl]="control"')}${AFTER}`);
      await settle(fixture);
      segmentsOf(root)[1].focus();
      host.control.disable();
      await settle(fixture);
      query(root, '#after').focus();
      await settle(fixture);
      expect(host.control.touched).toBe(false);
    });

    it('is not set by pointer clicks inside the group', async () => {
      const { fixture, host, root } = mount(GROUP('[formControl]="control"'));
      await settle(fixture);
      await userEvent.click(segmentsOf(root)[0]);
      await userEvent.click(segmentsOf(root)[2]);
      expect(host.control.touched).toBe(false);
    });
  });

  describe('Reactive Forms', () => {
    const template = GROUP('[formControl]="control"');

    it('shows the initial value without marking the control dirty', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      expect(checkedLabels(root)).toEqual(['B']);
      expect(host.control.dirty).toBe(false);
    });

    it('takes programmatic writes, null and reset included, without dirtying the control', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      host.control.setValue('c');
      await settle(fixture);
      expect(checkedLabels(root)).toEqual(['C']);
      host.control.setValue(null);
      await settle(fixture);
      expect(checkedLabels(root)).toEqual([]);
      expect(getComputedStyle(query(root, '.ck-segmented__indicator')).display).toBe('none');
      host.control.patchValue('a');
      await settle(fixture);
      expect(checkedLabels(root)).toEqual(['A']);
      host.control.reset();
      await settle(fixture);
      expect(checkedLabels(root)).toEqual([]);
      expect(host.control.dirty).toBe(false);
    });

    it('writes one value per user change and marks the control dirty', async () => {
      const { fixture, host, root } = mount(template);
      const emitted: (string | null)[] = [];
      host.control.valueChanges.subscribe((value) => emitted.push(value));
      await settle(fixture);
      await userEvent.click(segmentsOf(root)[2]);
      await settle(fixture);
      expect(host.control.value).toBe('c');
      expect(host.control.dirty).toBe(true);
      expect(emitted).toEqual(['c']);
      await userEvent.click(segmentsOf(root)[2]);
      expect(emitted).toEqual(['c']);
    });

    it('writes once per key press', async () => {
      const { fixture, host, root } = mount(template);
      const emitted: (string | null)[] = [];
      host.control.valueChanges.subscribe((value) => emitted.push(value));
      await settle(fixture);
      segmentsOf(root)[1].focus();
      await userEvent.keyboard('{ArrowRight}{ArrowRight}');
      await settle(fixture);
      expect(emitted).toEqual(['c', 'a']);
    });

    it('disables and enables with the control', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      host.control.disable();
      await settle(fixture);
      expect(query(root, 'ck-segmented').getAttribute('aria-disabled')).toBe('true');
      segmentsOf(root)[0].click();
      expect(host.control.value).toBe('b');
      host.control.enable();
      await settle(fixture);
      expect(query(root, 'ck-segmented').hasAttribute('aria-disabled')).toBe(false);
      segmentsOf(root)[0].click();
      expect(host.control.value).toBe('a');
    });

    it('is disabled on first render when the control already is', async () => {
      const { fixture, root } = mount(template, (host) => host.control.disable());
      await settle(fixture);
      expect(query(root, 'ck-segmented').getAttribute('aria-disabled')).toBe('true');
      expect(tabIndexes(root)).toEqual([null, null, null]);
    });
  });

  describe('ngModel', () => {
    const template = GROUP(
      '[ngModel]="model()" (ngModelChange)="model.set($event); emitted.push($event)"',
    );

    it('shows the initial model once Angular has written it', async () => {
      const { fixture, root } = mount(template);
      await settle(fixture);
      expect(checkedLabels(root)).toEqual(['B']);
    });

    it('emits ngModelChange once per user change and never for a programmatic write', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      host.model.set('c');
      await settle(fixture);
      expect(checkedLabels(root)).toEqual(['C']);
      expect(host.emitted).toEqual([]);
      await userEvent.click(segmentsOf(root)[0]);
      await settle(fixture);
      expect(host.emitted).toEqual(['a']);
      expect(host.model()).toBe('a');
      host.model.set(null);
      await settle(fixture);
      expect(checkedLabels(root)).toEqual([]);
      expect(host.emitted).toEqual(['a']);
    });

    it('takes the disabled input next to ngModel', async () => {
      const { fixture, host, root } = mount(
        GROUP('[ngModel]="model()" [disabled]="locked()" (ngModelChange)="model.set($event)"'),
      );
      host.locked.set(true);
      await settle(fixture);
      expect(query(root, 'ck-segmented').getAttribute('aria-disabled')).toBe('true');
      segmentsOf(root)[0].click();
      await settle(fixture);
      expect(host.model()).toBe('b');
    });
  });

  describe('Signal Forms', () => {
    const template = GROUP('[formField]="signalForm.choice"');

    it('shows the initial field value', async () => {
      const { fixture, root } = mount(template);
      await settle(fixture);
      expect(checkedLabels(root)).toEqual(['B']);
    });

    it('writes a user change into the model and a model change into the view', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      await userEvent.click(segmentsOf(root)[2]);
      await settle(fixture);
      expect(host.signalModel().choice).toBe('c');
      expect(host.signalForm.choice().dirty()).toBe(true);
      host.signalModel.set({ choice: 'a' });
      await settle(fixture);
      expect(checkedLabels(root)).toEqual(['A']);
      host.signalModel.set({ choice: null });
      await settle(fixture);
      expect(checkedLabels(root)).toEqual([]);
    });

    it('does not dirty the field for a programmatic write', async () => {
      const { fixture, host } = mount(template);
      await settle(fixture);
      host.signalModel.set({ choice: 'c' });
      await settle(fixture);
      expect(host.signalForm.choice().dirty()).toBe(false);
    });

    it('marks the field touched when focus leaves', async () => {
      const { fixture, host, root } = mount(`${template}${AFTER}`);
      await settle(fixture);
      segmentsOf(root)[1].focus();
      expect(host.signalForm.choice().touched()).toBe(false);
      query(root, '#after').focus();
      await settle(fixture);
      expect(host.signalForm.choice().touched()).toBe(true);
    });

    it('is disabled by a disabled field', async () => {
      const { fixture, host, root } = mount(template);
      host.locked.set(true);
      await settle(fixture);
      expect(query(root, 'ck-segmented').getAttribute('aria-disabled')).toBe('true');
      segmentsOf(root)[0].click();
      await settle(fixture);
      expect(host.signalModel().choice).toBe('b');
      host.locked.set(false);
      await settle(fixture);
      segmentsOf(root)[0].click();
      await settle(fixture);
      expect(host.signalModel().choice).toBe('a');
    });
  });

  describe('standalone value', () => {
    it('updates a two-way bound value from a click and the keyboard', async () => {
      const { fixture, host, root } = mount(GROUP('[(value)]="value"'));
      await settle(fixture);
      await userEvent.click(segmentsOf(root)[0]);
      expect(host.value()).toBe('a');
      await userEvent.keyboard('{ArrowRight}');
      expect(host.value()).toBe('b');
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
    const groupWarnings = (spy: ReturnType<typeof warn>) =>
      spy.mock.calls.filter(([message]) => String(message).startsWith('[ckui] ck-segmented '));

    it('warns once when the group has no accessible name', async () => {
      const spy = warn();
      await run(`<ck-segmented>${SEGMENTS}</ck-segmented>`);
      expect(spy).toHaveBeenCalledTimes(1);
      const [message, element] = spy.mock.calls[0];
      expect(message).toContain('ck-segmented');
      expect((element as HTMLElement).tagName).toBe('CK-SEGMENTED');
    });

    it.each([
      ['an empty aria-label', '<ck-segmented aria-label=" ">'],
      ['an aria-labelledby id that does not exist', '<ck-segmented aria-labelledby="nope">'],
      [
        'an aria-labelledby pointing at an empty element',
        '<span id="empty"></span><ck-segmented aria-labelledby="empty">',
      ],
      ['only a title', '<ck-segmented title="Unit">'],
    ])('warns for %s', async (_name, open) => {
      const spy = warn();
      await run(`${open}${SEGMENTS}</ck-segmented>`);
      expect(groupWarnings(spy)).toHaveLength(1);
    });

    it.each([
      ['aria-label', '<ck-segmented aria-label="Unit">'],
      ['aria-labelledby', '<span id="name">Unit</span><ck-segmented aria-labelledby="name">'],
    ])('does not warn when named through %s', async (_name, open) => {
      const spy = warn();
      await run(`${open}${SEGMENTS}</ck-segmented>`);
      expect(spy).not.toHaveBeenCalled();
    });

    it.each([
      ['no content', '<ck-segment value="a"></ck-segment>'],
      ['an aria-hidden icon only', `<ck-segment value="a">${ICON}</ck-segment>`],
      ['an empty aria-label', `<ck-segment value="a" aria-label=" ">${ICON}</ck-segment>`],
      ['hidden text only', '<ck-segment value="a"><span hidden>x</span></ck-segment>'],
    ])('warns once for a segment with %s', async (_name, segment) => {
      const spy = warn();
      await run(GROUP('', segment));
      expect(spy).toHaveBeenCalledTimes(1);
      const [message, element] = spy.mock.calls[0];
      expect(message).toContain('ck-segment');
      expect((element as HTMLElement).tagName).toBe('CK-SEGMENT');
    });

    it.each([
      ['an aria-label', `<ck-segment value="a" aria-label="Day">${ICON}</ck-segment>`],
      ['a title', `<ck-segment value="a" title="Day">${ICON}</ck-segment>`],
      ['text next to an icon', `<ck-segment value="a">${ICON}Day</ck-segment>`],
      [
        'an aria-labelledby',
        `<span id="day">Day</span><ck-segment value="a" aria-labelledby="day">${ICON}</ck-segment>`,
      ],
    ])('does not warn for a segment named by %s', async (_name, segment) => {
      const spy = warn();
      await run(GROUP('', segment));
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not warn when destroyed before the first render finishes', () => {
      const spy = warn();
      TestBed.overrideComponent(SegmentedHost, {
        set: { template: '<ck-segmented><ck-segment value="a"></ck-segment></ck-segmented>' },
      });
      TestBed.createComponent(SegmentedHost).destroy();
      TestBed.inject(ApplicationRef).tick();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has no axe violations with a value, with none, and disabled', async () => {
      const { fixture, host, root } = mount(
        GROUP(
          '[value]="value()" [disabled]="locked()"',
          `${WITH_DISABLED}<ck-segment value="e" aria-label="Icon">${ICON}</ck-segment>`,
        ),
      );
      await settle(fixture);
      await expectNoAxeViolations(root);
      host.value.set(null);
      await settle(fixture);
      await expectNoAxeViolations(root);
      host.locked.set(true);
      await settle(fixture);
      await expectNoAxeViolations(root);
    });
  });
});
