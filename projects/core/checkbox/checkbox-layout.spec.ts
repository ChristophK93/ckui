import { TestBed } from '@angular/core/testing';
import { cdp, page, userEvent } from 'vitest/browser';
import { DARK_TOKENS, inputOf, inputs, mount, query, settle } from '../testing/checkbox-host';

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

const CHECKBOX = (attributes = '', content = 'Save as template') =>
  `<ck-checkbox ${attributes}>${content}</ck-checkbox>`;
const HINT = '<ck-hint>Shows up under "Mine".</ck-hint>';
const rect = (root: HTMLElement, selector: string) => query(root, selector).getBoundingClientRect();
const style = (root: HTMLElement, selector: string) => getComputedStyle(query(root, selector));

describe('CkCheckbox layout', () => {
  afterEach(async () => {
    await emulate([]);
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
      'sizes the %s box and keeps the row at the control height',
      async (size, box, row) => {
        const { fixture, root } = mount(CHECKBOX(`size="${size}"`));
        await settle(fixture);
        expect(rect(root, '.ck-checkbox__box').width).toBe(box);
        expect(rect(root, '.ck-checkbox__box').height).toBe(box);
        expect(rect(root, '.ck-checkbox').height).toBeGreaterThanOrEqual(row);
        expect(rect(root, '.ck-checkbox').height).toBeLessThanOrEqual(row + 1);
      },
    );

    it('centres the box on the row for a one-line label', async () => {
      const { fixture, root } = mount(CHECKBOX());
      await settle(fixture);
      const row = rect(root, '.ck-checkbox');
      const box = rect(root, '.ck-checkbox__box');
      expect(box.top + box.height / 2).toBeCloseTo(row.top + row.height / 2, 0);
    });

    it('keeps the row at 44px on a coarse pointer and 60px at xl, with the tokens set inline', async () => {
      const coarse = DARK_TOKENS.replace(
        '--ck-control-height-md:40px',
        '--ck-control-height-md:44px',
      );
      const { fixture, root } = mount(CHECKBOX(), undefined, undefined, coarse);
      await settle(fixture);
      expect(rect(root, '.ck-checkbox').height).toBeGreaterThanOrEqual(44);
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      const extra = mount(CHECKBOX('size="xl"'), undefined, undefined, coarse);
      await settle(extra.fixture);
      expect(rect(extra.root, '.ck-checkbox').height).toBeGreaterThanOrEqual(60);
    });

    it('toggles from any point of the row, also the far end and the hint', async () => {
      const coarse = DARK_TOKENS.replace(
        '--ck-control-height-md:40px',
        '--ck-control-height-md:44px',
      );
      const { fixture, root } = mount(
        `<div style="inline-size:320px">${CHECKBOX('', `Save ${HINT}`)}</div>`,
        undefined,
        undefined,
        coarse,
      );
      await settle(fixture);
      const row = rect(root, '.ck-checkbox');
      for (const [x, y] of [
        [row.left + 2, row.top + 2],
        [row.right - 2, row.bottom - 2],
        [row.left + row.width / 2, row.top + 2],
      ]) {
        const hit = document.elementFromPoint(x, y);
        expect(hit?.closest('.ck-checkbox')).not.toBeNull();
      }
      (document.elementFromPoint(row.right - 4, row.bottom - 4) as HTMLElement).click();
      expect(inputOf(root).checked).toBe(true);
    });

    it('draws the check only when checked and the dash only when mixed, inside the box', async () => {
      const { fixture, root } = mount(
        `${CHECKBOX('[value]="true"')}${CHECKBOX('[indeterminate]="true"')}${CHECKBOX()}`,
      );
      await settle(fixture);
      const rows = Array.from(root.querySelectorAll('ck-checkbox'));
      const display = (row: Element, kind: string) =>
        getComputedStyle(row.querySelector(`.ck-checkbox__mark--${kind}`)!).display;
      expect([display(rows[0], 'check'), display(rows[0], 'minus')]).toEqual(['block', 'none']);
      expect([display(rows[1], 'check'), display(rows[1], 'minus')]).toEqual(['none', 'block']);
      expect([display(rows[2], 'check'), display(rows[2], 'minus')]).toEqual(['none', 'none']);
      const box = rows[0].querySelector('.ck-checkbox__box')!.getBoundingClientRect();
      const mark = rows[0].querySelector('.ck-checkbox__mark--check')!.getBoundingClientRect();
      expect(mark.left).toBeGreaterThanOrEqual(box.left);
      expect(mark.right).toBeLessThanOrEqual(box.right);
      expect(mark.top).toBeGreaterThanOrEqual(box.top);
      expect(mark.bottom).toBeLessThanOrEqual(box.bottom);
    });

    it('fills the box with the primary colour for checked and mixed, not for unchecked', async () => {
      const { fixture, root } = mount(
        `${CHECKBOX('[value]="true"')}${CHECKBOX('[indeterminate]="true"')}${CHECKBOX()}`,
      );
      await settle(fixture);
      const fills = Array.from(root.querySelectorAll('.ck-checkbox__box')).map(
        (box) => getComputedStyle(box).backgroundColor,
      );
      expect(fills).toEqual(['rgb(60, 60, 200)', 'rgb(60, 60, 200)', 'rgb(240, 240, 244)']);
      expect(style(root, '.ck-checkbox__box').borderTopColor).toBe('rgb(60, 60, 200)');
    });

    it('lets the component tokens restyle the box', async () => {
      const { fixture, root } = mount(
        `<div style="--ck-checkbox-bg:rgb(1, 2, 3);--ck-checkbox-border-color:rgb(4, 5, 6);--ck-checkbox-radius:9px;--ck-checkbox-checked-bg:rgb(7, 8, 9);--ck-checkbox-checked-fg:rgb(10, 11, 12)">${CHECKBOX()}${CHECKBOX('[value]="true"')}</div>`,
      );
      await settle(fixture);
      const [off, on] = Array.from(root.querySelectorAll('.ck-checkbox__box')).map((box) =>
        getComputedStyle(box),
      );
      expect(off.backgroundColor).toBe('rgb(1, 2, 3)');
      expect(off.borderTopColor).toBe('rgb(4, 5, 6)');
      expect(off.borderTopLeftRadius).toBe('9px');
      expect(on.backgroundColor).toBe('rgb(7, 8, 9)');
      expect(on.color).toBe('rgb(10, 11, 12)');
    });
  });

  describe('row layout', () => {
    it('puts the box first and the text after it by default', async () => {
      const { fixture, root } = mount(`<div style="inline-size:300px">${CHECKBOX()}</div>`);
      await settle(fixture);
      expect(rect(root, '.ck-checkbox__box').left).toBeLessThan(
        rect(root, '.ck-checkbox__text').left,
      );
      expect(rect(root, '.ck-checkbox__box').left).toBeCloseTo(rect(root, '.ck-checkbox').left, 0);
    });

    it('puts the text first and the box at the end with labelPosition start', async () => {
      const { fixture, root } = mount(
        `<div style="inline-size:300px">${CHECKBOX('labelPosition="start"')}</div>`,
      );
      await settle(fixture);
      expect(rect(root, '.ck-checkbox__text').left).toBeLessThan(
        rect(root, '.ck-checkbox__box').left,
      );
      expect(rect(root, '.ck-checkbox__box').right).toBeCloseTo(
        rect(root, '.ck-checkbox').right,
        0,
      );
    });

    it('puts the box on the right in right-to-left text', async () => {
      const { fixture, root } = mount(`<div style="inline-size:300px">${CHECKBOX()}</div>`);
      document.body.dir = 'rtl';
      await settle(fixture);
      expect(rect(root, '.ck-checkbox__box').left).toBeGreaterThan(
        rect(root, '.ck-checkbox__text').left,
      );
      expect(rect(root, '.ck-checkbox__box').right).toBeCloseTo(
        rect(root, '.ck-checkbox').right,
        0,
      );
    });

    it('keeps the box at the first line of a wrapping label', async () => {
      const long = 'Upload every finished ride automatically, '.repeat(12);
      const { fixture, root } = mount(`<div style="inline-size:240px">${CHECKBOX('', long)}</div>`);
      await settle(fixture);
      const row = rect(root, '.ck-checkbox');
      const box = rect(root, '.ck-checkbox__box');
      expect(query(root, '.ck-checkbox').scrollWidth).toBeLessThanOrEqual(Math.ceil(row.width));
      expect(box.right).toBeLessThanOrEqual(row.right + 0.5);
      expect(box.width).toBe(18);
      expect(box.top).toBeLessThan(row.top + 40);
      expect(row.height).toBeGreaterThan(100);
    });

    it('breaks an unbreakable long word instead of overflowing', async () => {
      const { fixture, root } = mount(
        `<div style="inline-size:200px">${CHECKBOX('', 'x'.repeat(200))}</div>`,
      );
      await settle(fixture);
      expect(query(root, '.ck-checkbox').scrollWidth).toBeLessThanOrEqual(200);
    });

    it('shows a focus ring on the box for the keyboard only', async () => {
      const { fixture, root } = mount(`<button id="before">Before</button>${CHECKBOX()}`);
      await settle(fixture);
      await userEvent.click(query(root, '.ck-checkbox__text'));
      expect(style(root, '.ck-checkbox__box').outlineStyle).toBe('none');
      query(root, '#before').focus();
      await userEvent.tab();
      expect(document.activeElement).toBe(inputOf(root));
      expect(style(root, '.ck-checkbox__box').outlineStyle).toBe('solid');
    });

    it('fits a phone viewport, also with the box at the end', async () => {
      await page.viewport(390, 844);
      try {
        const { fixture, root } = mount(
          `${CHECKBOX('', `Save as template ${HINT}`)}${CHECKBOX('labelPosition="start"')}`,
        );
        await settle(fixture);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
        for (const row of root.querySelectorAll('.ck-checkbox')) {
          expect(row.getBoundingClientRect().right).toBeLessThanOrEqual(390);
        }
      } finally {
        await page.viewport(800, 600);
      }
    });

    it('is only as wide as the box without text', async () => {
      const { fixture, root } = mount(
        `<div style="inline-size:300px">${CHECKBOX('aria-label="Select row"', '')}</div>`,
      );
      await settle(fixture);
      const row = rect(root, '.ck-checkbox');
      expect(row.width).toBeLessThanOrEqual(rect(root, '.ck-checkbox__box').width + 1);
      const hit = document.elementFromPoint(row.left + 250, row.top + row.height / 2);
      expect(hit?.closest('.ck-checkbox')).toBeNull();
    });

    it('styles a hint only inside the checkbox, never a bare hint elsewhere', async () => {
      const { fixture, root } = mount(
        `${CHECKBOX('', `Save ${HINT}`)}<ck-hint id="loose">Loose</ck-hint>`,
      );
      await settle(fixture);
      expect(getComputedStyle(query(root, '.ck-checkbox ck-hint')).display).toBe('block');
      expect(getComputedStyle(query(root, '#loose')).display).toBe('inline');
    });
  });

  describe('group layout', () => {
    const GROUP = `<ck-checkbox-group><label>Zones</label>
      <ck-checkbox option="a">A</ck-checkbox><ck-checkbox option="b">B</ck-checkbox>
      <ck-hint>Pick some.</ck-hint></ck-checkbox-group>`;

    it('stacks the rows with the gap token between them', async () => {
      const { fixture, root } = mount(`<div style="--ck-checkbox-group-gap:10px">${GROUP}</div>`);
      await settle(fixture);
      const [first, second] = inputs(root).map((input) =>
        input.closest('.ck-checkbox')!.getBoundingClientRect(),
      );
      expect(second.top - first.bottom).toBe(10);
      expect(second.left).toBe(first.left);
    });

    it('defaults the gap to one space step', async () => {
      const { fixture, root } = mount(GROUP);
      await settle(fixture);
      const [first, second] = inputs(root).map((input) =>
        input.closest('.ck-checkbox')!.getBoundingClientRect(),
      );
      expect(second.top - first.bottom).toBe(4);
    });

    it('styles hint and error only under the group container', async () => {
      const { fixture, root } = mount(
        `<ck-checkbox-group><label>Z</label><ck-checkbox option="a">A</ck-checkbox><ck-hint>Pick.</ck-hint></ck-checkbox-group>`,
      );
      await settle(fixture);
      expect(style(root, '.ck-checkbox-group__messages ck-hint').display).toBe('block');
      expect(style(root, '.ck-checkbox-group__messages ck-hint').color).toBe('rgb(80, 80, 90)');
    });

    it('fits a phone viewport with a long label and hint', async () => {
      await page.viewport(390, 844);
      try {
        const { fixture, root } = mount(
          `<ck-checkbox-group><label>${'Heart rate zones '.repeat(8)}</label>
            <ck-checkbox option="a">${'Long option text '.repeat(8)}</ck-checkbox>
            <ck-hint>${'Pick at least one '.repeat(6)}</ck-hint></ck-checkbox-group>`,
        );
        await settle(fixture);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
        expect(rect(root, 'ck-checkbox-group').right).toBeLessThanOrEqual(390);
      } finally {
        await page.viewport(800, 600);
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

    it('draws the unchecked box with a CanvasText border on Canvas', async () => {
      const { root } = await forced(CHECKBOX());
      expect(style(root, '.ck-checkbox__box').borderTopColor).toBe(
        resolveColor(root, 'CanvasText'),
      );
      expect(style(root, '.ck-checkbox__box').backgroundColor).toBe(resolveColor(root, 'Canvas'));
    });

    it('draws checked and mixed boxes with a Highlight fill and a HighlightText mark', async () => {
      const { root } = await forced(
        `${CHECKBOX('[value]="true"')}${CHECKBOX('[indeterminate]="true"')}`,
      );
      for (const box of Array.from(root.querySelectorAll('.ck-checkbox__box'))) {
        const styles = getComputedStyle(box);
        expect(styles.backgroundColor).toBe(resolveColor(root, 'Highlight'));
        expect(styles.borderTopColor).toBe(resolveColor(root, 'Highlight'));
        expect(styles.color).toBe(resolveColor(root, 'HighlightText'));
      }
      const mark = query(root, '.ck-checkbox__mark--check svg');
      expect(getComputedStyle(mark).stroke).toBe(resolveColor(root, 'HighlightText'));
    });

    it('draws disabled and fieldset-disabled boxes in GrayText, and an enabled hint not', async () => {
      const { root } = await forced(
        `<fieldset disabled>${CHECKBOX('[value]="true"', `Locked ${HINT}`)}</fieldset>
         ${CHECKBOX('disabled', `Off ${HINT}`)}
         ${CHECKBOX('', `Live ${HINT}`)}`,
      );
      const gray = resolveColor(root, 'GrayText');
      const [fieldset, disabled, live] = Array.from(root.querySelectorAll('ck-checkbox'));
      const of = (host: Element, selector: string) =>
        getComputedStyle(host.querySelector(selector)!);
      for (const host of [fieldset, disabled]) {
        expect(of(host, '.ck-checkbox').color).toBe(gray);
        expect(of(host, 'ck-hint').color).toBe(gray);
        expect(of(host, '.ck-checkbox__box').borderTopColor).toBe(gray);
      }
      expect(of(fieldset, '.ck-checkbox__box').color).toBe(gray);
      expect(of(fieldset, '.ck-checkbox__box').backgroundColor).toBe(resolveColor(root, 'Canvas'));
      expect(of(live, 'ck-hint').color).not.toBe(gray);
      expect(of(live, '.ck-checkbox').color).not.toBe(gray);
    });

    it('draws the keyboard focus ring in Highlight at the token width', async () => {
      const { root } = await forced(`<button id="before">Before</button>${CHECKBOX()}`);
      query(root, '#before').focus();
      await userEvent.tab();
      const box = style(root, '.ck-checkbox__box');
      expect(box.outlineColor).toBe(resolveColor(root, 'Highlight'));
      expect(box.outlineStyle).toBe('solid');
      expect(box.outlineWidth).toBe('2px');
      expect(box.outlineOffset).toBe('2px');
    });
  });

  describe('reduced motion', () => {
    const MOTION = DARK_TOKENS.replace('--ck-duration-normal:0ms', '--ck-duration-normal:200ms');

    it('fades with a transition normally and with none under reduced motion', async () => {
      const normal = mount(CHECKBOX(), undefined, undefined, MOTION);
      await settle(normal.fixture);
      expect(style(normal.root, '.ck-checkbox__box').transitionDuration).toContain('0.2s');
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      const reduced = mount(CHECKBOX(), undefined, undefined, MOTION);
      await settle(reduced.fixture);
      expect(style(reduced.root, '.ck-checkbox__box').transitionDuration).toBe('0s');
    });
  });
});
