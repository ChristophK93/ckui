import { TestBed } from '@angular/core/testing';
import { cdp, page, userEvent } from 'vitest/browser';
import { DARK_TOKENS, inputOf, inputs, mount, query, settle } from '../testing/radio-host';

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

async function emulate(features: { name: string; value: string }[]): Promise<void> {
  await (cdp() as unknown as Session).send('Emulation.setEmulatedMedia', { features });
}

/** The computed colour of a CSS colour keyword (a system colour included) under the current emulation. */
function resolveColor(root: HTMLElement, value: string): string {
  const probe = document.createElement('div');
  probe.style.color = value;
  root.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

const RADIO = (attributes = '', content = 'Kilograms') =>
  `<ck-radio ${attributes}>${content}</ck-radio>`;
const GROUP = (content: string, attributes = '') =>
  `<ck-radio-group aria-label="Unit" ${attributes}>${content}</ck-radio-group>`;
const ONE = (option = 'kg', attributes = '', content = 'Kilograms', group = '') =>
  GROUP(RADIO(`option="${option}" ${attributes}`, content), group);
const HINT = '<ck-hint>Metric.</ck-hint>';
const rect = (root: HTMLElement, selector: string) => query(root, selector).getBoundingClientRect();
const style = (root: HTMLElement, selector: string) => getComputedStyle(query(root, selector));
const COARSE = DARK_TOKENS.replace('--ck-control-height-md:40px', '--ck-control-height-md:44px');

describe('CkRadio layout', () => {
  afterEach(async () => {
    await emulate([]);
    await page.viewport(800, 600);
    vi.restoreAllMocks();
    document.body.replaceChildren();
    document.body.removeAttribute('dir');
    document.documentElement.removeAttribute('dir');
    TestBed.resetTestingModule();
  });

  describe('sizes', () => {
    it.each([
      ['sm', 18, 32],
      ['md', 18, 40],
      ['lg', 20, 48],
      ['xl', 24, 60],
    ] as const)(
      'sizes the %s circle and keeps the row at the control height',
      async (size, circle, row) => {
        const { fixture, root } = mount(ONE('kg', '', 'Kilograms', `size="${size}"`));
        await settle(fixture);
        expect(rect(root, '.ck-radio__circle').width).toBe(circle);
        expect(rect(root, '.ck-radio__circle').height).toBe(circle);
        expect(rect(root, '.ck-radio').height).toBeGreaterThanOrEqual(row);
        expect(rect(root, '.ck-radio').height).toBeLessThanOrEqual(row + 1);
      },
    );

    it('draws a round circle and centres it on the row for a one-line label', async () => {
      const { fixture, root } = mount(ONE());
      await settle(fixture);
      const row = rect(root, '.ck-radio');
      const circle = rect(root, '.ck-radio__circle');
      expect(circle.top + circle.height / 2).toBeCloseTo(row.top + row.height / 2, 0);
      expect(style(root, '.ck-radio__circle').borderTopLeftRadius).toBe('50%');
      expect(style(root, '.ck-radio__circle').borderTopWidth).toBe('2px');
    });

    it('keeps the row at 44px on a coarse pointer and 60px at xl, with the tokens set inline', async () => {
      const { fixture, root } = mount(ONE(), undefined, undefined, COARSE);
      await settle(fixture);
      expect(rect(root, '.ck-radio').height).toBeGreaterThanOrEqual(44);
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      const extra = mount(ONE('kg', '', 'Kilograms', 'size="xl"'), undefined, undefined, COARSE);
      await settle(extra.fixture);
      expect(rect(extra.root, '.ck-radio').height).toBeGreaterThanOrEqual(60);
    });

    it('checks from any point of the row on a coarse pointer, the far end and the hint included', async () => {
      const { fixture, root } = mount(
        `<div style="inline-size:320px">${ONE('kg', '', `Kilograms ${HINT}`)}</div>`,
        undefined,
        undefined,
        COARSE,
      );
      await settle(fixture);
      const row = rect(root, '.ck-radio');
      for (const [x, y] of [
        [row.left + 2, row.top + 2],
        [row.right - 2, row.bottom - 2],
        [row.left + row.width / 2, row.top + 2],
      ]) {
        expect(document.elementFromPoint(x, y)?.closest('.ck-radio')).not.toBeNull();
      }
      (document.elementFromPoint(row.right - 4, row.bottom - 4) as HTMLElement).click();
      expect(inputOf(root).checked).toBe(true);
    });

    it('draws the dot only when checked, centred inside the circle', async () => {
      const { fixture, root } = mount(
        GROUP(`${RADIO('option="a"')}${RADIO('option="b"')}`, 'value="b"'),
      );
      await settle(fixture);
      const [off, on] = Array.from(root.querySelectorAll('.ck-radio__dot'));
      expect(off.getBoundingClientRect().width).toBe(0);
      const circle = on.closest('.ck-radio__circle')!.getBoundingClientRect();
      const dot = on.getBoundingClientRect();
      expect(dot.width).toBe(7);
      expect(dot.left).toBeGreaterThan(circle.left);
      expect(dot.right).toBeLessThan(circle.right);
      expect(dot.left + dot.width / 2).toBeCloseTo(circle.left + circle.width / 2, 0);
      expect(dot.top + dot.height / 2).toBeCloseTo(circle.top + circle.height / 2, 0);
    });

    it('fills the circle with the primary colour and a contrasting dot for checked, not for unchecked', async () => {
      const { fixture, root } = mount(
        GROUP(`${RADIO('option="a"')}${RADIO('option="b"')}`, 'value="b"'),
      );
      await settle(fixture);
      const circles = Array.from(root.querySelectorAll('.ck-radio__circle')).map((circle) =>
        getComputedStyle(circle),
      );
      expect(circles.map((circle) => circle.backgroundColor)).toEqual([
        'rgb(240, 240, 244)',
        'rgb(60, 60, 200)',
      ]);
      expect(circles[1].borderTopColor).toBe('rgb(60, 60, 200)');
      expect(circles[0].borderTopColor).toBe('rgb(110, 110, 120)');
      expect(getComputedStyle(root.querySelectorAll('.ck-radio__dot')[1]).backgroundColor).toBe(
        'rgb(255, 255, 255)',
      );
    });

    it('lets the component tokens restyle the circle and the dot', async () => {
      const { fixture, root } = mount(
        `<div style="--ck-radio-bg:rgb(1, 2, 3);--ck-radio-border-color:rgb(4, 5, 6);--ck-radio-checked-bg:rgb(7, 8, 9);--ck-radio-checked-fg:rgb(10, 11, 12)">${GROUP(`${RADIO('option="a"')}${RADIO('option="b"')}`, 'value="b"')}</div>`,
      );
      await settle(fixture);
      const [off, on] = Array.from(root.querySelectorAll('.ck-radio__circle')).map((circle) =>
        getComputedStyle(circle),
      );
      expect(off.backgroundColor).toBe('rgb(1, 2, 3)');
      expect(off.borderTopColor).toBe('rgb(4, 5, 6)');
      expect(on.backgroundColor).toBe('rgb(7, 8, 9)');
      expect(on.borderTopColor).toBe('rgb(7, 8, 9)');
      expect(getComputedStyle(root.querySelectorAll('.ck-radio__dot')[1]).backgroundColor).toBe(
        'rgb(10, 11, 12)',
      );
    });

    it('paints a disabled checked radio in the disabled colour', async () => {
      const { fixture, root } = mount(GROUP(RADIO('option="a" disabled', 'Off'), 'value="a"'));
      await settle(fixture);
      expect(style(root, '.ck-radio').color).toBe('rgb(150, 150, 160)');
      expect(style(root, '.ck-radio__circle').backgroundColor).toBe('rgb(150, 150, 160)');
      expect(style(root, '.ck-radio__circle').borderTopColor).toBe('rgb(150, 150, 160)');
      expect(style(root, '.ck-radio').cursor).toBe('not-allowed');
    });

    it('draws the border in the danger colour while the error shows', async () => {
      const { fixture, root } = mount(
        `<ck-radio-group [formControl]="unitControl" aria-label="Unit">${RADIO('option="a"')}<ck-error>E</ck-error></ck-radio-group><button id="after">After</button>`,
      );
      await settle(fixture);
      inputOf(root).focus();
      query(root, '#after').focus();
      await settle(fixture);
      expect(style(root, '.ck-radio__circle').borderTopColor).toBe('rgb(160, 20, 20)');
    });
  });

  describe('row layout', () => {
    it('puts the circle first and the text after it', async () => {
      const { fixture, root } = mount(`<div style="inline-size:300px">${ONE()}</div>`);
      await settle(fixture);
      expect(rect(root, '.ck-radio__circle').left).toBeLessThan(
        rect(root, '.ck-radio__label').left,
      );
      expect(rect(root, '.ck-radio__circle').left).toBeCloseTo(rect(root, '.ck-radio').left, 0);
    });

    it('puts the circle on the right in right-to-left text', async () => {
      const { fixture, root } = mount(`<div style="inline-size:300px">${ONE()}</div>`);
      document.body.dir = 'rtl';
      await settle(fixture);
      expect(rect(root, '.ck-radio__circle').left).toBeGreaterThan(
        rect(root, '.ck-radio__label').left,
      );
      expect(rect(root, '.ck-radio__circle').right).toBeCloseTo(rect(root, '.ck-radio').right, 0);
    });

    it('keeps the circle at the first line of a wrapping label', async () => {
      const long = 'Upload every finished ride automatically, '.repeat(12);
      const { fixture, root } = mount(
        `<div style="inline-size:240px">${ONE('kg', '', long)}</div>`,
      );
      await settle(fixture);
      const row = rect(root, '.ck-radio');
      const circle = rect(root, '.ck-radio__circle');
      expect(query(root, '.ck-radio').scrollWidth).toBeLessThanOrEqual(Math.ceil(row.width));
      expect(circle.right).toBeLessThanOrEqual(row.right + 0.5);
      expect(circle.width).toBe(18);
      expect(circle.top).toBeLessThan(row.top + 40);
      expect(row.height).toBeGreaterThan(100);
    });

    it('breaks an unbreakable long word instead of overflowing', async () => {
      const { fixture, root } = mount(
        `<div style="inline-size:200px">${ONE('kg', '', 'x'.repeat(200))}</div>`,
      );
      await settle(fixture);
      expect(query(root, '.ck-radio').scrollWidth).toBeLessThanOrEqual(200);
    });

    it('shows a focus ring on the circle for the keyboard only', async () => {
      const { fixture, root } = mount(`<button id="before">Before</button>${ONE()}`);
      await settle(fixture);
      await userEvent.click(query(root, '.ck-radio__label'));
      expect(style(root, '.ck-radio__circle').outlineStyle).toBe('none');
      query(root, '#before').focus();
      await userEvent.tab();
      expect(document.activeElement).toBe(inputOf(root));
      expect(style(root, '.ck-radio__circle').outlineStyle).toBe('solid');
    });

    it('is only as wide as the circle without text', async () => {
      const { fixture, root } = mount(
        `<div style="inline-size:300px">${GROUP(RADIO('option="a" aria-label="Choice A"', ''))}</div>`,
      );
      await settle(fixture);
      const row = rect(root, '.ck-radio');
      expect(row.width).toBeLessThanOrEqual(rect(root, '.ck-radio__circle').width + 1);
      const hit = document.elementFromPoint(row.left + 250, row.top + row.height / 2);
      expect(hit?.closest('.ck-radio')).toBeNull();
    });

    it('styles a hint only inside the radio, never a bare hint elsewhere', async () => {
      const { fixture, root } = mount(
        `${ONE('kg', '', `Kilograms ${HINT}`)}<ck-hint id="loose">Loose</ck-hint>`,
      );
      await settle(fixture);
      expect(getComputedStyle(query(root, '.ck-radio ck-hint')).display).toBe('block');
      expect(getComputedStyle(query(root, '#loose')).display).toBe('inline');
    });

    it('fits a phone viewport, with a long label and hint', async () => {
      await page.viewport(390, 844);
      const { fixture, root } = mount(
        `<ck-radio-group><label>${'Weight unit '.repeat(10)}</label>
          ${RADIO('option="a"', `${'Long option text '.repeat(8)}<ck-hint>${'Explained '.repeat(12)}</ck-hint>`)}
          ${RADIO('option="b"', 'x'.repeat(120))}
          <ck-hint>${'Pick at least one '.repeat(6)}</ck-hint></ck-radio-group>`,
      );
      await settle(fixture);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      expect(rect(root, 'ck-radio-group').right).toBeLessThanOrEqual(390);
    });
  });

  describe('group layout', () => {
    const THREE = GROUP(
      `<label>Unit</label>${RADIO('option="a"', 'A')}${RADIO('option="b"', 'B')}${RADIO('option="c"', 'C')}<ck-hint>Pick one.</ck-hint>`,
    );
    const rows = (root: HTMLElement) =>
      inputs(root).map((input) => input.closest('.ck-radio')!.getBoundingClientRect());

    it('stacks the rows with the gap token between them', async () => {
      const { fixture, root } = mount(`<div style="--ck-radio-group-gap:10px">${THREE}</div>`);
      await settle(fixture);
      const [first, second] = rows(root);
      expect(second.top - first.bottom).toBe(10);
      expect(second.left).toBe(first.left);
    });

    it('defaults the gap to one space step', async () => {
      const { fixture, root } = mount(THREE);
      await settle(fixture);
      const [first, second] = rows(root);
      expect(second.top - first.bottom).toBe(4);
    });

    it('styles hint and error only under the group container', async () => {
      const { fixture, root } = mount(THREE);
      await settle(fixture);
      expect(style(root, '.ck-radio-group__messages ck-hint').display).toBe('block');
      expect(style(root, '.ck-radio-group__messages ck-hint').color).toBe('rgb(80, 80, 90)');
    });

    it('lays the rows side by side with inline, with the gap token, and keeps each row at its height', async () => {
      const { fixture, root } = mount(
        `<div style="--ck-radio-group-gap:10px;inline-size:600px">${GROUP(`${RADIO('option="a"', 'A')}${RADIO('option="b"', 'B')}`, 'inline')}</div>`,
      );
      await settle(fixture);
      const [first, second] = rows(root);
      expect(second.top).toBe(first.top);
      expect(second.left - first.right).toBe(10);
      expect(first.height).toBeGreaterThanOrEqual(40);
    });

    it('separates inline rows by one space step of 16px by default', async () => {
      const { fixture, root } = mount(
        `<div style="inline-size:600px">${GROUP(`${RADIO('option="a"', 'A')}${RADIO('option="b"', 'B')}`, 'inline')}</div>`,
      );
      await settle(fixture);
      const [first, second] = rows(root);
      expect(second.left - first.right).toBe(16);
    });

    it('wraps inline rows at a phone width, without overflow, and in right-to-left text', async () => {
      await page.viewport(390, 844);
      const many = ['Kilograms', 'Pounds', 'Stone', 'Ounces', 'Grams', 'Tonnes']
        .map((name, index) => RADIO(`option="${index}"`, name.repeat(2)))
        .join('');
      const { fixture, root } = mount(GROUP(many, 'inline'));
      await settle(fixture);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      const tops = new Set(rows(root).map((row) => Math.round(row.top)));
      expect(tops.size).toBeGreaterThan(1);
      document.body.dir = 'rtl';
      await settle(fixture);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      for (const row of rows(root)) {
        expect(row.right).toBeLessThanOrEqual(390);
        expect(row.left).toBeGreaterThanOrEqual(0);
      }
    });

    it('keeps one very long inline label inside the group', async () => {
      const { fixture, root } = mount(
        `<div style="inline-size:240px">${GROUP(`${RADIO('option="a"', 'y'.repeat(150))}${RADIO('option="b"', 'B')}`, 'inline')}</div>`,
      );
      await settle(fixture);
      for (const row of rows(root)) {
        expect(row.right).toBeLessThanOrEqual(240.5);
      }
    });
  });

  describe('forced colors', () => {
    const forced = async (template: string) => {
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      const mounted = mount(template);
      await settle(mounted.fixture);
      return mounted;
    };

    it('draws the unchecked circle with a CanvasText border on Canvas', async () => {
      const { root } = await forced(ONE());
      expect(style(root, '.ck-radio__circle').borderTopColor).toBe(
        resolveColor(root, 'CanvasText'),
      );
      expect(style(root, '.ck-radio__circle').backgroundColor).toBe(resolveColor(root, 'Canvas'));
    });

    it('draws the checked circle with a Highlight fill and a HighlightText dot that shows', async () => {
      const { root } = await forced(
        GROUP(`${RADIO('option="a"')}${RADIO('option="b"')}`, 'value="b"'),
      );
      const circle = getComputedStyle(root.querySelectorAll('.ck-radio__circle')[1]);
      expect(circle.backgroundColor).toBe(resolveColor(root, 'Highlight'));
      expect(circle.borderTopColor).toBe(resolveColor(root, 'Highlight'));
      const dot = root.querySelectorAll('.ck-radio__dot')[1];
      expect(getComputedStyle(dot).backgroundColor).toBe(resolveColor(root, 'HighlightText'));
      expect(getComputedStyle(dot).backgroundColor).not.toBe(circle.backgroundColor);
      expect(dot.getBoundingClientRect().width).toBe(7);
    });

    it('draws disabled and fieldset-disabled radios in GrayText, and an enabled hint not', async () => {
      const { root } = await forced(
        `<fieldset disabled>${GROUP(RADIO('option="a"', `Locked ${HINT}`), 'value="a"')}</fieldset>
         ${GROUP(RADIO('option="b" disabled', `Off ${HINT}`), 'value="b"')}
         ${GROUP(RADIO('option="c"', `Live ${HINT}`), 'value="c"')}`,
      );
      const gray = resolveColor(root, 'GrayText');
      const [fieldset, disabled, live] = Array.from(root.querySelectorAll('ck-radio'));
      const of = (host: Element, selector: string) =>
        getComputedStyle(host.querySelector(selector)!);
      for (const host of [fieldset, disabled]) {
        expect(of(host, '.ck-radio').color).toBe(gray);
        expect(of(host, 'ck-hint').color).toBe(gray);
        expect(of(host, '.ck-radio__circle').borderTopColor).toBe(gray);
        expect(of(host, '.ck-radio__circle').backgroundColor).toBe(resolveColor(root, 'Canvas'));
        expect(of(host, '.ck-radio__dot').backgroundColor).toBe(gray);
      }
      expect(of(live, 'ck-hint').color).not.toBe(gray);
      expect(of(live, '.ck-radio').color).not.toBe(gray);
    });

    it('draws the keyboard focus ring in Highlight at the token width', async () => {
      const { root } = await forced(`<button id="before">Before</button>${ONE()}`);
      query(root, '#before').focus();
      await userEvent.tab();
      const circle = style(root, '.ck-radio__circle');
      expect(circle.outlineColor).toBe(resolveColor(root, 'Highlight'));
      expect(circle.outlineStyle).toBe('solid');
      expect(circle.outlineWidth).toBe('2px');
      expect(circle.outlineOffset).toBe('2px');
    });
  });

  describe('reduced motion', () => {
    const MOTION = DARK_TOKENS.replace('--ck-duration-normal:0ms', '--ck-duration-normal:200ms');

    it('scales the dot in with a transition normally and with none under reduced motion', async () => {
      const normal = mount(ONE(), undefined, undefined, MOTION);
      await settle(normal.fixture);
      expect(style(normal.root, '.ck-radio__dot').transitionDuration).toContain('0.2s');
      expect(style(normal.root, '.ck-radio__dot').transitionProperty).toBe('transform');
      expect(style(normal.root, '.ck-radio__circle').transitionDuration).toContain('0.2s');
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      const reduced = mount(ONE(), undefined, undefined, MOTION);
      await settle(reduced.fixture);
      expect(style(reduced.root, '.ck-radio__dot').transitionDuration).toBe('0s');
      expect(style(reduced.root, '.ck-radio__circle').transitionDuration).toBe('0s');
    });
  });
});
