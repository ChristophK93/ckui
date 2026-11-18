import { TestBed } from '@angular/core/testing';
import { CK_SIZES, CkSize } from '@ckui/core';
import { cdp, userEvent } from 'vitest/browser';
import { mount, query, segmentsOf, settle } from '../testing/segmented-host';

const GAP = 4;

const HEIGHTS: Record<CkSize, number> = { sm: 32, md: 40, lg: 48, xl: 60 };
/** The coarse-pointer values of `tokens.css`, set inline: sm and md rise to 44. */
const COARSE_TOKENS =
  '--ck-control-height-sm:44px;--ck-control-height-md:44px;--ck-control-font-size-sm:16px;--ck-control-font-size-md:16px';
const COARSE_HEIGHTS: Record<CkSize, number> = { sm: 44, md: 44, lg: 48, xl: 60 };

const group = (attributes = '', content = '') =>
  `<ck-segmented aria-label="Unit" ${attributes}>${
    content ||
    '<ck-segment value="a">A</ck-segment><ck-segment value="b">B</ck-segment><ck-segment value="c">C</ck-segment>'
  }</ck-segmented>`;

const ICON = '<svg aria-hidden="true" viewBox="0 0 16 16"><path d="M0 0h16v16H0z" /></svg>';

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

async function emulate(features: { name: string; value: string }[]): Promise<void> {
  await (cdp() as unknown as Session).send('Emulation.setEmulatedMedia', { features });
}

const rect = (element: Element) => element.getBoundingClientRect();

describe('CkSegmented layout', () => {
  afterEach(async () => {
    document.body.replaceChildren();
    TestBed.resetTestingModule();
    await emulate([]);
  });

  describe('height and hit area', () => {
    it.each(CK_SIZES.map((size) => [size, HEIGHTS[size]] as const))(
      'is the control height at %s (%spx) and every segment fills it',
      async (size, height) => {
        const { fixture, root } = mount(group(`size="${size}" value="b"`));
        await settle(fixture);
        expect(rect(query(root, 'ck-segmented')).height).toBe(height);
        for (const segment of segmentsOf(root)) {
          expect(rect(segment).height).toBe(height);
        }
      },
    );

    it.each(CK_SIZES.map((size) => [size, COARSE_HEIGHTS[size]] as const))(
      'is 44, 44, 48 and 60px under coarse values: %s is %spx',
      async (size, height) => {
        const { fixture, root } = mount(group(`size="${size}" value="b"`));
        root.style.cssText += `;${COARSE_TOKENS}`;
        await settle(fixture);
        expect(rect(query(root, 'ck-segmented')).height).toBe(height);
        for (const segment of segmentsOf(root)) {
          expect(rect(segment).height).toBe(height);
        }
      },
    );

    it.each(CK_SIZES)(
      'hits a segment at its top, bottom and side edges, over the inset indicator too (%s)',
      async (size) => {
        const { fixture, root } = mount(group(`size="${size}" value="b"`));
        root.style.cssText += `;${COARSE_TOKENS}`;
        await settle(fixture);
        for (const [index, segment] of segmentsOf(root).entries()) {
          const box = rect(segment);
          const points: [number, number][] = [
            [box.left + box.width / 2, box.top + 1],
            [box.left + box.width / 2, box.bottom - 1],
            [box.left + 1, box.top + box.height / 2],
            [box.right - 1, box.top + box.height / 2],
            [box.left + 1, box.top + 1],
            [box.right - 1, box.bottom - 1],
          ];
          for (const [x, y] of points) {
            const hit = document.elementFromPoint(x, y);
            expect(hit?.closest('ck-segment'), `${size} segment ${index} at ${x},${y}`).toBe(
              segment,
            );
          }
        }
      },
    );

    it('never lets the indicator take the pointer', async () => {
      const { fixture, root } = mount(group('value="b"'));
      await settle(fixture);
      expect(getComputedStyle(query(root, '.ck-segmented__indicator')).pointerEvents).toBe('none');
    });
  });

  describe('width', () => {
    it('gives every segment the width of the widest label', async () => {
      const { fixture, root } = mount(
        group(
          'value="a"',
          '<ck-segment value="a">Day</ck-segment><ck-segment value="b">A much longer label</ck-segment><ck-segment value="c">Mid</ck-segment>',
        ),
      );
      await settle(fixture);
      const widths = segmentsOf(root).map((segment) => rect(segment).width);
      expect(new Set(widths.map((width) => Math.round(width))).size).toBe(1);
      const widest = query(root, 'ck-segment:nth-child(3) .ck-segment__content');
      expect(widest.scrollWidth).toBeLessThanOrEqual(widest.clientWidth);
    });

    it('keeps the widths equal when the checked segment changes', async () => {
      const { fixture, host, root } = mount(
        group(
          '[value]="value()"',
          '<ck-segment value="a">Day</ck-segment><ck-segment value="b">A much longer label</ck-segment>',
        ),
      );
      await settle(fixture);
      const before = rect(query(root, 'ck-segmented')).width;
      host.value.set('a');
      await settle(fixture);
      expect(rect(query(root, 'ck-segmented')).width).toBe(before);
    });

    it('is as wide as its segments by default and as wide as the container with fullWidth', async () => {
      const { fixture, root } = mount(
        `<div id="box" style="inline-size: 300px">${group('value="b"')}${group('fullWidth value="b"')}</div>`,
      );
      await settle(fixture);
      const [plain, full] = Array.from(root.querySelectorAll('ck-segmented'));
      expect(rect(plain).width).toBeLessThan(150);
      expect(rect(full).width).toBe(300);
      expect(segmentsOf(full as HTMLElement).map((segment) => rect(segment).width)).toEqual([
        100, 100, 100,
      ]);
    });

    it('splits the width evenly for two and for five segments', async () => {
      const { fixture, root } = mount(
        `<div style="inline-size: 300px">${group(
          'fullWidth value="a"',
          '<ck-segment value="a">A</ck-segment><ck-segment value="b">B</ck-segment>',
        )}${group(
          'fullWidth value="a"',
          Array.from({ length: 5 }, (_, i) => `<ck-segment value="${i}">${i}</ck-segment>`).join(
            '',
          ),
        )}</div>`,
      );
      await settle(fixture);
      const [two, five] = Array.from(root.querySelectorAll<HTMLElement>('ck-segmented'));
      expect(segmentsOf(two).map((segment) => rect(segment).width)).toEqual([150, 150]);
      expect(segmentsOf(five).map((segment) => rect(segment).width)).toEqual([60, 60, 60, 60, 60]);
    });
  });

  describe('indicator', () => {
    function expectOnSegment(root: HTMLElement, index: number, gap = GAP, rtl = false): void {
      const indicator = rect(query(root, '.ck-segmented__indicator'));
      const segment = rect(segmentsOf(root)[index]);
      const track = rect(query(root, 'ck-segmented'));
      expect(indicator.width).toBeCloseTo(segment.width - 2 * gap, 1);
      expect(indicator.height).toBeCloseTo(track.height - 2 * gap, 1);
      expect(indicator.top).toBeCloseTo(track.top + gap, 1);
      if (rtl) {
        expect(indicator.right).toBeCloseTo(segment.right - gap, 1);
      } else {
        expect(indicator.left).toBeCloseTo(segment.left + gap, 1);
      }
    }

    it.each([0, 1, 2])('sits inside segment %s inset by the padding', async (index) => {
      const { fixture, host, root } = mount(group('[value]="value()" fullWidth'));
      host.value.set(['a', 'b', 'c'][index]);
      await settle(fixture);
      expectOnSegment(root, index);
    });

    it('follows the value from segment to segment, back and forth', async () => {
      const { fixture, host, root } = mount(group('[value]="value()"'));
      await settle(fixture);
      for (const [value, index] of [
        ['c', 2],
        ['a', 0],
        ['b', 1],
        ['c', 2],
        ['b', 1],
      ] as const) {
        host.value.set(value);
        await settle(fixture);
        expectOnSegment(root, index);
      }
    });

    it('is placed from the first render when the value is already set', async () => {
      const { root } = mount(group('value="c"'));
      expectOnSegment(root, 2);
    });

    it('follows the padding token, also when it is set on the group', async () => {
      const { fixture, root } = mount(group('value="b" fullWidth'));
      root.style.setProperty('--ck-segmented-padding', '7px');
      await settle(fixture);
      expectOnSegment(root, 1, 7);
      const group_ = query(root, 'ck-segmented');
      group_.style.setProperty('--ck-segmented-padding', '2px');
      await settle(fixture);
      expectOnSegment(root, 1, 2);
    });

    it('is correct with two and with five segments, at the first and the last', async () => {
      const five = Array.from(
        { length: 5 },
        (_, i) => `<ck-segment value="${i}">${i}</ck-segment>`,
      );
      const { fixture, host, root } = mount(
        group('[value]="objectValue()" fullWidth', five.join('')),
      );
      for (const index of [0, 4, 2]) {
        host.objectValue.set(String(index));
        await settle(fixture);
        expectOnSegment(root, index);
      }
    });

    describe('in right-to-left text', () => {
      it('starts at the right and mirrors the segment order', async () => {
        const { fixture, root } = mount(`<div dir="rtl">${group('value="a" fullWidth')}</div>`);
        await settle(fixture);
        const segments = segmentsOf(root);
        expect(rect(segments[0]).left).toBeGreaterThan(rect(segments[2]).left);
        expectOnSegment(root, 0, GAP, true);
      });

      it.each([0, 1, 2])('sits inside segment %s', async (index) => {
        const { fixture, host, root } = mount(
          `<div dir="rtl">${group('[value]="value()" fullWidth')}</div>`,
        );
        host.value.set(['a', 'b', 'c'][index]);
        await settle(fixture);
        expectOnSegment(root, index, GAP, true);
      });

      it('follows the dir attribute alone: a CSS direction property does not push the indicator out', async () => {
        const { fixture, root } = mount(
          `<div style="direction: rtl">${group('value="c" fullWidth')}</div>`,
        );
        await settle(fixture);
        const track = rect(query(root, 'ck-segmented'));
        const indicator = rect(query(root, '.ck-segmented__indicator'));
        expect(indicator.left).toBeGreaterThanOrEqual(track.left);
        expect(indicator.right).toBeLessThanOrEqual(track.right);
        expect(rect(segmentsOf(root)[0]).left).toBeLessThan(rect(segmentsOf(root)[2]).left);
        expectOnSegment(root, 2);
      });

      it('follows a change of direction at runtime', async () => {
        const { fixture, root } = mount(
          `<div id="wrapper" dir="ltr">${group('value="c" fullWidth')}</div>`,
        );
        await settle(fixture);
        expectOnSegment(root, 2);
        query(root, '#wrapper').dir = 'rtl';
        await settle(fixture);
        expectOnSegment(root, 2, GAP, true);
      });
    });
  });

  describe('labels', () => {
    it('cuts a long label with an ellipsis and keeps its full text', async () => {
      const label = 'A label with many ordinary words that is far too long for its segment';
      const { fixture, root } = mount(
        `<div id="box" style="inline-size: 180px">${group(
          'value="a" fullWidth',
          `<ck-segment value="a">${label}</ck-segment><ck-segment value="b">B</ck-segment><ck-segment value="c">C</ck-segment>`,
        )}</div>`,
      );
      await settle(fixture);
      const track = query(root, 'ck-segmented');
      expect(rect(track).width).toBe(180);
      expect(track.scrollWidth).toBeLessThanOrEqual(track.clientWidth);
      const content = query(root, '.ck-segment__label');
      expect(getComputedStyle(content).textOverflow).toBe('ellipsis');
      expect(getComputedStyle(content).whiteSpace).toBe('nowrap');
      expect(content.scrollWidth).toBeGreaterThan(content.clientWidth);
      expect(content.textContent).toBe(label);
      expect(rect(content).right).toBeLessThanOrEqual(rect(segmentsOf(root)[0]).right);
    });

    it('stays inside a container narrower than its segments', async () => {
      const { fixture, root } = mount(
        `<div style="inline-size: 100px">${group(
          'value="a"',
          '<ck-segment value="a">One label</ck-segment><ck-segment value="b">Another label</ck-segment>',
        )}</div>`,
      );
      await settle(fixture);
      const track = query(root, 'ck-segmented');
      expect(rect(track).width).toBeLessThanOrEqual(100);
      expect(rect(track).height).toBe(40);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    });

    it('keeps the label on one line and the height unchanged', async () => {
      const { fixture, root } = mount(
        `<div style="inline-size: 140px">${group(
          'value="a" fullWidth',
          '<ck-segment value="a">Several words in one label</ck-segment><ck-segment value="b">Another long one</ck-segment>',
        )}</div>`,
      );
      await settle(fixture);
      expect(rect(query(root, 'ck-segmented')).height).toBe(40);
      expect(rect(query(root, '.ck-segment__content')).height).toBeLessThan(30);
    });

    it('puts an icon before its text, a token gap apart, and sizes it to the font', async () => {
      const { fixture, root } = mount(
        group('value="a"', `<ck-segment value="a">Day${ICON}</ck-segment>`),
      );
      await settle(fixture);
      const svg = query(root, 'svg');
      const label = query(root, '.ck-segment__label');
      expect(rect(svg).width).toBe(16);
      expect(rect(svg).height).toBe(16);
      expect(rect(label).left - rect(svg).right).toBe(8);
      expect(rect(svg).top + rect(svg).height / 2).toBeCloseTo(
        rect(label).top + rect(label).height / 2,
        0,
      );
    });

    it('mirrors the icon and text order in RTL', async () => {
      const { fixture, root } = mount(
        `<div dir="rtl">${group('value="a"', `<ck-segment value="a">${ICON}Day</ck-segment>`)}</div>`,
      );
      await settle(fixture);
      expect(rect(query(root, 'svg')).left).toBeGreaterThanOrEqual(
        rect(query(root, '.ck-segment__label')).right + 8 - 1,
      );
    });

    it('hides the empty label of an icon-only segment so no gap is left', async () => {
      const { fixture, root } = mount(
        group('value="a"', `<ck-segment value="a" aria-label="Day">${ICON}</ck-segment>`),
      );
      await settle(fixture);
      expect(getComputedStyle(query(root, '.ck-segment__label')).display).toBe('none');
    });

    it('keeps a long label with an icon on one line, cut by an ellipsis next to the icon', async () => {
      const { fixture, root } = mount(
        `<div style="inline-size: 120px">${group(
          'value="a" fullWidth',
          `<ck-segment value="a">${ICON}A label that is far too long for this segment</ck-segment><ck-segment value="b">B</ck-segment>`,
        )}</div>`,
      );
      await settle(fixture);
      const label = query(root, '.ck-segment__label');
      expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
      expect(rect(query(root, 'svg')).width).toBe(16);
      expect(rect(segmentsOf(root)[0]).height).toBe(40);
    });

    it('centres an icon-only segment', async () => {
      const { fixture, root } = mount(
        group(
          'value="a" fullWidth',
          `<ck-segment value="a" aria-label="Day">${ICON}</ck-segment><ck-segment value="b" aria-label="Night">${ICON}</ck-segment>`,
        ),
      );
      await settle(fixture);
      for (const segment of segmentsOf(root)) {
        const svg = query(segment, 'svg');
        expect(rect(svg).left + rect(svg).width / 2).toBeCloseTo(
          rect(segment).left + rect(segment).width / 2,
          0,
        );
        expect(rect(svg).top + rect(svg).height / 2).toBeCloseTo(
          rect(segment).top + rect(segment).height / 2,
          0,
        );
      }
    });

    it.each(CK_SIZES)('takes the font size of the control at %s', async (size) => {
      const { fixture, root } = mount(group(`size="${size}" value="a"`));
      await settle(fixture);
      const expected = { sm: '14px', md: '16px', lg: '18px', xl: '20px' }[size];
      expect(getComputedStyle(segmentsOf(root)[0]).fontSize).toBe(expected);
    });

    it('takes the coarse font size from the control token', async () => {
      const { fixture, root } = mount(group('size="sm" value="a"'));
      root.style.cssText += `;${COARSE_TOKENS}`;
      await settle(fixture);
      expect(getComputedStyle(segmentsOf(root)[0]).fontSize).toBe('16px');
    });

    it('uses tabular numerals and the medium weight on every segment', async () => {
      const { fixture, root } = mount(group('value="a"'));
      await settle(fixture);
      for (const segment of segmentsOf(root)) {
        expect(getComputedStyle(segment).fontVariantNumeric).toBe('tabular-nums');
        expect(getComputedStyle(segment).fontWeight).toBe('500');
      }
    });
  });

  describe('colours and tokens', () => {
    it('reads the semantic tokens when no component token is set', async () => {
      const { fixture, root } = mount(group('value="b"'));
      await settle(fixture);
      const track = getComputedStyle(query(root, 'ck-segmented'));
      expect(track.backgroundColor).toBe('rgb(240, 240, 244)');
      expect(track.boxShadow).toContain('rgb(110, 110, 120)');
      expect(track.borderTopLeftRadius).toBe('8px');
      const indicator = getComputedStyle(query(root, '.ck-segmented__indicator'));
      expect(indicator.backgroundColor).toBe('rgb(255, 255, 255)');
      expect(indicator.borderTopColor).toBe('rgb(110, 110, 120)');
      expect(indicator.borderTopWidth).toBe('1px');
      expect(indicator.boxShadow).not.toBe('none');
      const [first, checked] = segmentsOf(root);
      expect(getComputedStyle(first).color).toBe('rgb(80, 80, 90)');
      expect(getComputedStyle(checked).color).toBe('rgb(20, 20, 30)');
    });

    it('takes every component token set on an ancestor', async () => {
      const { fixture, root } = mount(group('value="b"'));
      root.style.cssText += `;--ck-segmented-bg:rgb(1, 2, 3);--ck-segmented-border-color:rgb(4, 5, 6);--ck-segmented-fg:rgb(7, 8, 9);--ck-segmented-indicator-bg:rgb(10, 11, 12);--ck-segmented-indicator-fg:rgb(13, 14, 15);--ck-segmented-radius:12px;--ck-segmented-padding:2px`;
      await settle(fixture);
      const track = getComputedStyle(query(root, 'ck-segmented'));
      expect(track.backgroundColor).toBe('rgb(1, 2, 3)');
      expect(track.boxShadow).toContain('rgb(4, 5, 6)');
      expect(track.borderTopLeftRadius).toBe('12px');
      const indicator = getComputedStyle(query(root, '.ck-segmented__indicator'));
      expect(indicator.backgroundColor).toBe('rgb(10, 11, 12)');
      expect(indicator.borderTopColor).toBe('rgb(4, 5, 6)');
      expect(indicator.borderTopLeftRadius).toBe('10px');
      const [first, checked] = segmentsOf(root);
      expect(getComputedStyle(first).color).toBe('rgb(7, 8, 9)');
      expect(getComputedStyle(checked).color).toBe('rgb(13, 14, 15)');
      expect(getComputedStyle(first, '::after').borderTopLeftRadius).toBe('12px');
    });

    it('never gives the indicator a negative radius when the padding exceeds the radius', async () => {
      const { fixture, root } = mount(group('value="b"'));
      root.style.cssText += ';--ck-segmented-radius:2px;--ck-segmented-padding:6px';
      await settle(fixture);
      expect(getComputedStyle(query(root, '.ck-segmented__indicator')).borderTopLeftRadius).toBe(
        '0px',
      );
    });

    it('declares none of its own tokens', async () => {
      const { fixture, root } = mount(group('value="b"'));
      await settle(fixture);
      const style = getComputedStyle(query(root, 'ck-segmented'));
      for (const token of [
        'bg',
        'border-color',
        'fg',
        'indicator-bg',
        'indicator-fg',
        'radius',
        'padding',
      ]) {
        expect(style.getPropertyValue(`--ck-segmented-${token}`), token).toBe('');
      }
    });

    it('lets the group follow the colour scheme token', async () => {
      const { fixture, root } = mount(group('value="b"'));
      root.style.setProperty('--ck-color-scheme', 'dark');
      await settle(fixture);
      expect(getComputedStyle(query(root, 'ck-segmented')).colorScheme).toBe('dark');
    });

    it('shows the hover fill on an unchecked, enabled segment only', async () => {
      const { fixture, root } = mount(
        group(
          'value="a"',
          '<ck-segment value="a">A</ck-segment><ck-segment value="b">B</ck-segment><ck-segment value="c" disabled>C</ck-segment>',
        ),
      );
      await settle(fixture);
      const fill = (index: number) =>
        getComputedStyle(segmentsOf(root)[index], '::before').backgroundColor;
      expect(fill(1)).toBe('rgba(0, 0, 0, 0)');
      await userEvent.hover(segmentsOf(root)[1]);
      expect(fill(1)).toBe('rgba(0, 0, 0, 0.06)');
      await userEvent.hover(segmentsOf(root)[0]);
      expect(fill(0)).toBe('rgba(0, 0, 0, 0)');
      expect(fill(1)).toBe('rgba(0, 0, 0, 0)');
      await userEvent.hover(segmentsOf(root)[2]);
      expect(fill(2)).toBe('rgba(0, 0, 0, 0)');
    });

    it('insets the hover fill like the indicator, so the hit area stays the whole height', async () => {
      const { fixture, root } = mount(group('value="a" fullWidth'));
      await settle(fixture);
      const before = getComputedStyle(segmentsOf(root)[1], '::before');
      expect(before.top).toBe(`${GAP}px`);
      expect(before.left).toBe(`${GAP}px`);
      expect(rect(segmentsOf(root)[1]).height).toBe(40);
    });

    it('looks disabled per segment and for the whole group', async () => {
      const { fixture, host, root } = mount(
        group(
          '[value]="value()" [disabled]="locked()"',
          '<ck-segment value="a">A</ck-segment><ck-segment value="b">B</ck-segment><ck-segment value="c" disabled>C</ck-segment>',
        ),
      );
      await settle(fixture);
      const [first, checked, disabled] = segmentsOf(root);
      expect(getComputedStyle(disabled).color).toBe('rgb(150, 150, 160)');
      expect(getComputedStyle(disabled).cursor).toBe('not-allowed');
      expect(getComputedStyle(first).cursor).toBe('pointer');
      host.locked.set(true);
      await settle(fixture);
      for (const segment of [first, checked, disabled]) {
        expect(getComputedStyle(segment).color).toBe('rgb(150, 150, 160)');
        expect(getComputedStyle(segment).cursor).toBe('not-allowed');
      }
    });
  });

  describe('focus ring', () => {
    const ring = (segment: Element) => getComputedStyle(segment, '::after');

    it('is drawn inside the segment after keyboard focus', async () => {
      const { fixture, root } = mount(`<button id="before">Before</button>${group('value="b"')}`);
      await settle(fixture);
      query(root, '#before').focus();
      await userEvent.tab();
      const segment = segmentsOf(root)[1];
      expect(document.activeElement).toBe(segment);
      expect(getComputedStyle(segment).outlineStyle).toBe('none');
      expect(ring(segment).outlineColor).toBe('rgb(0, 0, 255)');
      expect(ring(segment).outlineStyle).toBe('solid');
      expect(ring(segment).outlineWidth).toBe('2px');
      expect(ring(segment).outlineOffset).toBe('-2px');
      expect(ring(segment).borderTopLeftRadius).toBe('8px');
    });

    it('is not drawn after a pointer click', async () => {
      const { fixture, root } = mount(group('value="b"'));
      await settle(fixture);
      await userEvent.click(segmentsOf(root)[2]);
      expect(document.activeElement).toBe(segmentsOf(root)[2]);
      expect(ring(segmentsOf(root)[2]).outlineStyle).toBe('none');
    });

    it('moves with the arrow keys', async () => {
      const { fixture, root } = mount(group('value="a"'));
      await settle(fixture);
      segmentsOf(root)[0].focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(ring(segmentsOf(root)[1]).outlineStyle).toBe('solid');
      expect(ring(segmentsOf(root)[0]).outlineStyle).toBe('none');
    });
  });

  describe('forced colors', () => {
    it('paints the checked segment with Highlight and HighlightText and draws the track border', async () => {
      const { fixture, root } = mount(group('value="b"'));
      await settle(fixture);
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      const probe = document.createElement('div');
      probe.style.cssText =
        'background: Highlight; color: HighlightText; outline: 1px solid ButtonText';
      root.appendChild(probe);
      const highlight = getComputedStyle(probe);
      const indicator = getComputedStyle(query(root, '.ck-segmented__indicator'));
      expect(indicator.backgroundColor).toBe(highlight.backgroundColor);
      expect(indicator.boxShadow).toBe('none');
      expect(getComputedStyle(segmentsOf(root)[1]).color).toBe(highlight.color);
      // Otherwise the browser backs the text with a Canvas plate that hides HighlightText.
      expect(getComputedStyle(segmentsOf(root)[1]).forcedColorAdjust).toBe('none');
      const track = getComputedStyle(query(root, 'ck-segmented'));
      expect(track.outlineStyle).toBe('solid');
      expect(track.outlineColor).toBe(highlight.outlineColor);
      expect(track.boxShadow).toBe('none');
    });

    it('shows a disabled selected segment in an enabled group as an outlined, grey one', async () => {
      const { fixture, root } = mount(
        group(
          'value="a"',
          '<ck-segment value="a" disabled>A</ck-segment><ck-segment value="b">B</ck-segment>',
        ),
      );
      await settle(fixture);
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      const probe = document.createElement('div');
      probe.style.cssText = 'color: GrayText; background: Canvas; outline: 1px solid GrayText';
      root.appendChild(probe);
      const reference = getComputedStyle(probe);
      const indicator = getComputedStyle(query(root, '.ck-segmented__indicator'));
      expect(indicator.backgroundColor).toBe(reference.backgroundColor);
      expect(indicator.borderTopColor).toBe(reference.color);
      expect(getComputedStyle(segmentsOf(root)[0]).color).toBe(reference.color);
    });

    it('greys out a disabled group', async () => {
      const { fixture, root } = mount(group('value="b" disabled'));
      await settle(fixture);
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      const probe = document.createElement('div');
      probe.style.cssText = 'color: GrayText';
      root.appendChild(probe);
      for (const segment of segmentsOf(root)) {
        expect(getComputedStyle(segment).color).toBe(getComputedStyle(probe).color);
      }
    });
  });
});
