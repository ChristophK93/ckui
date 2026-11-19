import { TestBed } from '@angular/core/testing';
import { CK_SIZES, CkSize } from '@ckui/core';
import { cdp, page, userEvent } from 'vitest/browser';
import { GROUP } from '../testing/tabs-env';
import { TOKENS, mount, query, settle, tabsOf } from '../testing/tabs-host';

const HEIGHTS: Record<CkSize, number> = { sm: 32, md: 40, lg: 48, xl: 60 };
/** The coarse-pointer values of `tokens.css`, set inline: sm and md rise to 44. */
const COARSE_TOKENS = '--ck-control-height-sm:44px;--ck-control-height-md:44px';

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

const rect = (element: Element) => element.getBoundingClientRect();
const indicator = (tab: Element) => getComputedStyle(tab, '::after');
const list = (root: HTMLElement) => query(root, 'ck-tab-list');

/** Many tabs in a fixed-width box, the selected one given by the host value. */
const MANY = (count: number, width: number, attributes = '') =>
  `<div id="box" style="inline-size:${width}px">
     <ck-tabs [value]="value()" ${attributes}>
       <ck-tab-list aria-label="Many">
         @for (item of range; track item) {<ck-tab [value]="item">Workout {{ item }}</ck-tab>}
       </ck-tab-list>
     </ck-tabs>
   </div>`.replace(
    'range',
    `[${Array.from({ length: count }, (_, index) => index + 1).join(',')}]`,
  );

/** Whether `inner` lies fully inside `outer` horizontally, within half a pixel. */
const insideHorizontally = (inner: Element, outer: Element) =>
  rect(inner).left >= rect(outer).left - 0.5 && rect(inner).right <= rect(outer).right + 0.5;

describe('CkTabs layout', () => {
  afterEach(async () => {
    document.body.replaceChildren();
    document.body.removeAttribute('dir');
    TestBed.resetTestingModule();
    await emulate([]);
    await page.viewport(800, 600);
  });

  describe('size and hit area', () => {
    it.each(CK_SIZES.map((size) => [size, HEIGHTS[size]] as const))(
      'makes each tab the control height at %s (%spx) and the row one border taller',
      async (size, height) => {
        const { fixture, root } = mount(GROUP(`size="${size}"`));
        await settle(fixture);
        for (const tab of tabsOf(root)) {
          expect(rect(tab).height).toBe(height);
        }
        expect(rect(list(root)).height).toBe(height + 1);
      },
    );

    it('keeps every tab at least 44px high with the coarse tokens, and 60px at xl', async () => {
      const { fixture, root } = mount(GROUP('size="md"'));
      root.setAttribute('style', `${root.getAttribute('style')};${COARSE_TOKENS}`);
      await settle(fixture);
      expect(rect(tabsOf(root)[0]).height).toBeGreaterThanOrEqual(44);
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      const extra = mount(GROUP('size="xl"'));
      extra.root.setAttribute('style', `${extra.root.getAttribute('style')};${COARSE_TOKENS}`);
      await settle(extra.fixture);
      expect(rect(tabsOf(extra.root)[0]).height).toBeGreaterThanOrEqual(60);
    });

    it('takes the height from the control tokens set on the page', async () => {
      const { fixture, root } = mount(GROUP());
      root.setAttribute('style', `${root.getAttribute('style')};--ck-control-height-md:52px`);
      await settle(fixture);
      expect(rect(tabsOf(root)[0]).height).toBe(52);
    });

    it('hits a tab across its whole width and height, with no gap between the tabs', async () => {
      const { fixture, root } = mount(GROUP('size="xl"'));
      await settle(fixture);
      for (const tab of tabsOf(root)) {
        const box = rect(tab);
        for (const [x, y] of [
          [box.left + 1, box.top + 1],
          [box.left + box.width / 2, box.top + box.height / 2],
          [box.right - 1, box.bottom - 1],
        ]) {
          expect(document.elementFromPoint(x, y)?.closest('ck-tab')).toBe(tab);
        }
      }
      const [first, second] = tabsOf(root).map(rect);
      expect(second.left).toBeCloseTo(first.right, 0);
    });

    it('takes the space between tabs from --ck-tabs-gap', async () => {
      const { fixture, root } = mount(GROUP('style="--ck-tabs-gap:10px"'));
      await settle(fixture);
      const [first, second] = tabsOf(root).map(rect);
      expect(second.left - first.right).toBeCloseTo(10, 0);
    });

    it('takes the padding of each tab from --ck-tabs-padding-inline', async () => {
      const { fixture, root } = mount(GROUP('style="--ck-tabs-padding-inline:30px"'));
      await settle(fixture);
      expect(getComputedStyle(tabsOf(root)[0]).paddingLeft).toBe('30px');
    });
  });

  describe('selected state', () => {
    it('marks the selected tab by an underline, the text colour and the weight, not by colour alone', async () => {
      const { fixture, host, root } = mount(GROUP());
      host.value.set('b');
      await settle(fixture);
      const [first, second] = tabsOf(root);
      expect(getComputedStyle(second).color).toBe('rgb(20, 20, 30)');
      expect(getComputedStyle(first).color).toBe('rgb(80, 80, 90)');
      expect(getComputedStyle(second).fontWeight).toBe('600');
      expect(getComputedStyle(first).fontWeight).toBe('500');
      expect(indicator(second).backgroundColor).toBe('rgb(60, 60, 200)');
      expect(parseFloat(indicator(second).blockSize)).toBe(4);
      expect(indicator(second).scale).toBe('1');
      expect(indicator(first).scale).not.toBe('1');
      expect(indicator(tabsOf(root)[2]).scale).not.toBe('1');
    });

    it('draws the underline across the full width of the tab, at its bottom edge', async () => {
      const { fixture, host, root } = mount(GROUP());
      host.value.set('b');
      await settle(fixture);
      const tab = tabsOf(root)[1];
      const style = indicator(tab);
      expect(parseFloat(style.width)).toBeCloseTo(rect(tab).width, 0);
      expect(style.position).toBe('absolute');
      expect(style.bottom).toBe('0px');
    });

    it('draws a 1px line under the row', async () => {
      const { fixture, root } = mount(GROUP());
      await settle(fixture);
      const style = getComputedStyle(list(root));
      expect(style.borderBottomWidth).toBe('1px');
      expect(style.borderBottomColor).toBe('rgb(225, 225, 232)');
      expect(style.borderBottomStyle).toBe('solid');
    });

    it('reads the component tokens', async () => {
      const { fixture, host, root } = mount(
        GROUP(
          `style="--ck-tabs-fg:rgb(1, 2, 3);--ck-tabs-fg-selected:rgb(4, 5, 6);--ck-tabs-indicator:rgb(255, 204, 0);
                  --ck-tabs-indicator-thickness:6px;--ck-tabs-border-color:rgb(7, 8, 9);
                  --ck-tabs-font-weight:400;--ck-tabs-font-weight-selected:700"`,
        ),
      );
      host.value.set('b');
      await settle(fixture);
      const [first, second] = tabsOf(root);
      expect(getComputedStyle(first).color).toBe('rgb(1, 2, 3)');
      expect(getComputedStyle(second).color).toBe('rgb(4, 5, 6)');
      expect(getComputedStyle(first).fontWeight).toBe('400');
      expect(getComputedStyle(second).fontWeight).toBe('700');
      expect(indicator(second).backgroundColor).toBe('rgb(255, 204, 0)');
      expect(parseFloat(indicator(second).blockSize)).toBe(6);
      expect(getComputedStyle(list(root)).borderBottomColor).toBe('rgb(7, 8, 9)');
    });

    it('draws a translucent overlay on a hovered tab, and none on a disabled one', async () => {
      const { fixture, root } = mount(
        `<ck-tabs><ck-tab-list aria-label="Source"><ck-tab value="a">Alpha</ck-tab>
         <ck-tab value="b" disabled>Beta</ck-tab></ck-tab-list></ck-tabs>`,
      );
      await settle(fixture);
      const [enabled, disabled] = tabsOf(root);
      expect(getComputedStyle(enabled).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      await userEvent.hover(enabled);
      expect(getComputedStyle(enabled).backgroundColor).toBe('rgba(0, 0, 0, 0.06)');
      await userEvent.hover(disabled);
      expect(getComputedStyle(disabled).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(getComputedStyle(disabled).color).toBe('rgb(150, 150, 160)');
      expect(getComputedStyle(disabled).cursor).toBe('not-allowed');
    });
  });

  describe('focus ring', () => {
    it('is drawn inside the tab as a pseudo-element, on keyboard focus only, so neither the scroll container nor a global rule can move it out', async () => {
      const { fixture, root } = mount(`<button id="before">Before</button>${GROUP()}`);
      await settle(fixture);
      const tab = tabsOf(root)[0];
      await userEvent.click(tab);
      expect(getComputedStyle(tab, '::before').outlineStyle).toBe('none');
      query(root, '#before').focus();
      await userEvent.tab();
      expect(document.activeElement).toBe(tab);
      expect(getComputedStyle(tab).outlineStyle).toBe('none');
      const style = getComputedStyle(tab, '::before');
      expect(rect(tab).width).toBeGreaterThan(0);
      expect(parseFloat(style.width)).toBeCloseTo(rect(tab).width, 0);
      expect(parseFloat(style.height)).toBeCloseTo(rect(tab).height, 0);
      expect(style.outlineStyle).toBe('solid');
      expect(style.outlineWidth).toBe('2px');
      expect(style.outlineColor).toBe('rgb(0, 0, 255)');
      expect(style.outlineOffset).toBe('-2px');
      expect(rect(tab).top).toBeGreaterThanOrEqual(rect(list(root)).top);
      expect(rect(tab).bottom).toBeLessThanOrEqual(rect(list(root)).bottom);
    });

    it('is drawn around a focused panel, outside it', async () => {
      const { fixture, root } = mount(`<button id="before">Before</button>${GROUP()}`);
      await settle(fixture);
      query(root, 'ck-tab-panel').focus();
      await userEvent.tab({ shift: true });
      await userEvent.tab();
      const style = getComputedStyle(query(root, 'ck-tab-panel'));
      expect(style.outlineStyle).toBe('solid');
      expect(style.outlineOffset).toBe('2px');
    });
  });

  describe('overflow', () => {
    it('scrolls the row sideways at 390px without widening the page, and shows the selected tab', async () => {
      await page.viewport(390, 844);
      const { fixture, host, root } = mount(MANY(12, 358), (prepared) =>
        prepared.value.set(12 as never),
      );
      await settle(fixture);
      const row = list(root);
      expect(row.scrollWidth).toBeGreaterThan(row.clientWidth);
      expect(rect(row).width).toBeLessThanOrEqual(358);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      const last = tabsOf(root).at(-1)!;
      expect(last.getAttribute('aria-selected')).toBe('true');
      expect(insideHorizontally(last, row)).toBe(true);
      expect(row.scrollLeft).toBeGreaterThan(0);
      host.value.set(1 as never);
      await settle(fixture);
      expect(insideHorizontally(tabsOf(root)[0], row)).toBe(true);
      expect(row.scrollLeft).toBe(0);
    });

    it('keeps every tab at its natural width instead of squeezing the labels', async () => {
      const { fixture, root } = mount(MANY(12, 300));
      await settle(fixture);
      for (const tab of tabsOf(root)) {
        const label = tab.querySelector<HTMLElement>('.ck-tab__label')!;
        expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth);
        expect(getComputedStyle(label).whiteSpace).toBe('nowrap');
      }
    });

    it('brings a tab into view when keyboard focus reaches it, in both activation modes', async () => {
      for (const mode of ['auto', 'manual']) {
        document.body.replaceChildren();
        TestBed.resetTestingModule();
        const { fixture, root } = mount(MANY(12, 300, `activation="${mode}"`));
        await settle(fixture);
        const row = list(root);
        tabsOf(root)[0].focus();
        await userEvent.keyboard('{End}');
        await settle(fixture);
        expect(document.activeElement, mode).toBe(tabsOf(root).at(-1));
        expect(insideHorizontally(tabsOf(root).at(-1)!, row), mode).toBe(true);
        await userEvent.keyboard('{Home}');
        await settle(fixture);
        expect(insideHorizontally(tabsOf(root)[0], row), mode).toBe(true);
        expect(row.scrollLeft, mode).toBe(0);
      }
    });

    it('keeps a focused tab in view while the row is scrolled away from it', async () => {
      const { fixture, root } = mount(MANY(12, 300));
      await settle(fixture);
      const row = list(root);
      tabsOf(root)[0].focus();
      row.scrollLeft = row.scrollWidth;
      await settle(fixture);
      expect(insideHorizontally(tabsOf(root)[0], row)).toBe(false);
      await userEvent.keyboard('{ArrowRight}');
      await settle(fixture);
      expect(insideHorizontally(tabsOf(root)[1], row)).toBe(true);
    });

    it('scrolls only the row, never the page', async () => {
      await page.viewport(390, 500);
      const { fixture, host, root } = mount(
        `<div style="block-size:1500px"></div>${MANY(12, 300)}`,
        (prepared) => prepared.value.set(1 as never),
      );
      await settle(fixture);
      const scroller = document.scrollingElement!;
      scroller.scrollTop = 1400;
      const before = scroller.scrollTop;
      expect(before).toBeGreaterThan(0);
      host.value.set(12 as never);
      await settle(fixture);
      expect(scroller.scrollTop).toBe(before);
      expect(scroller.scrollLeft).toBe(0);
      expect(insideHorizontally(tabsOf(root).at(-1)!, list(root))).toBe(true);
    });

    it('does not scroll a row that fits', async () => {
      const { fixture, root } = mount(GROUP());
      await settle(fixture);
      const row = list(root);
      expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
      expect(row.scrollLeft).toBe(0);
    });

    it('keeps the selected tab in view in right-to-left text, at both ends', async () => {
      document.body.dir = 'rtl';
      const { fixture, host, root } = mount(MANY(12, 300), (prepared) =>
        prepared.value.set(12 as never),
      );
      await settle(fixture);
      const row = list(root);
      expect(row.scrollWidth).toBeGreaterThan(row.clientWidth);
      expect(insideHorizontally(tabsOf(root).at(-1)!, row)).toBe(true);
      host.value.set(1 as never);
      await settle(fixture);
      expect(insideHorizontally(tabsOf(root)[0], row)).toBe(true);
      host.value.set(7 as never);
      await settle(fixture);
      expect(insideHorizontally(tabsOf(root)[6], row)).toBe(true);
    });

    it('brings the selected tab back into view when the row gets narrower', async () => {
      const { fixture, root } = mount(MANY(12, 1300), (prepared) =>
        prepared.value.set(12 as never),
      );
      await settle(fixture);
      const row = list(root);
      expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
      query(root, '#box').style.inlineSize = '300px';
      await expect.poll(() => insideHorizontally(tabsOf(root).at(-1)!, row)).toBe(true);
      expect(row.scrollLeft).toBeGreaterThan(0);
    });

    it('keeps a thin scrollbar for a fine pointer, and hides it for touch', async () => {
      const { fixture, root } = mount(MANY(12, 300));
      await settle(fixture);
      const style = getComputedStyle(list(root));
      expect(style.overflowX).toBe('auto');
      expect(style.overflowY).toBe('hidden');
      expect(style.overscrollBehaviorX).toBe('contain');
      expect(style.scrollbarWidth).toBe('thin');
      // The emulation cannot switch the pointer, so the touch rule is read from the stylesheet.
      const widths = new Map<string, string>();
      const visit = (rules: CSSRuleList, condition: string): void => {
        for (const rule of Array.from(rules)) {
          if (rule instanceof CSSMediaRule) {
            visit(rule.cssRules, rule.conditionText);
          } else if (rule instanceof CSSStyleRule) {
            if (rule.selectorText === '.ck-tab-list' && rule.style.scrollbarWidth !== '') {
              widths.set(condition, rule.style.scrollbarWidth);
            }
          } else if ('cssRules' in rule) {
            visit((rule as CSSGroupingRule).cssRules, condition);
          }
        }
      };
      for (const sheet of Array.from(document.styleSheets)) {
        visit(sheet.cssRules, '');
      }
      const entries = [...widths.entries()];
      expect(entries.find(([condition]) => /not/.test(condition))?.[1]).toBe('none');
      expect(
        entries.find(
          ([condition]) => /pointer:\s*fine/.test(condition) && !/not/.test(condition),
        )?.[1],
      ).toBe('thin');
    });

    it('brings the selected tab back into view when tabs are inserted before it', async () => {
      const { fixture, host, root } = mount(
        `<div id="box" style="inline-size:300px"><ck-tabs [value]="value()"><ck-tab-list aria-label="Many">
           @for (item of items(); track item) {<ck-tab [value]="item">Workout {{ item }}</ck-tab>}
         </ck-tab-list></ck-tabs></div>`,
        (prepared) => {
          prepared.items.set(['m', 'n', 'o', 'p', 'q', 'r', 'z']);
          prepared.value.set('z');
        },
      );
      await settle(fixture);
      const row = list(root);
      const selected = () =>
        tabsOf(root).find((tab) => tab.getAttribute('aria-selected') === 'true')!;
      expect(insideHorizontally(selected(), row)).toBe(true);
      host.items.set([
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        'z',
      ]);
      await settle(fixture);
      await expect.poll(() => insideHorizontally(selected(), row)).toBe(true);
    });

    it('brings the selected tab back into view when the labels grow after the first render', async () => {
      const { fixture, root } = mount(MANY(12, 300), (prepared) => prepared.value.set(12 as never));
      await settle(fixture);
      const row = list(root);
      const last = tabsOf(root).at(-1)!;
      expect(insideHorizontally(last, row)).toBe(true);
      for (const tab of tabsOf(root)) {
        tab.style.fontSize = '28px';
      }
      await expect.poll(() => insideHorizontally(last, row)).toBe(true);
      expect(row.scrollLeft).toBeGreaterThan(0);
    });

    it('keeps the selected tab in view when a label gets longer', async () => {
      const { fixture, root } = mount(MANY(12, 300), (prepared) => prepared.value.set(11 as never));
      await settle(fixture);
      const row = list(root);
      const selected = tabsOf(root)[10];
      tabsOf(root)[0].querySelector('.ck-tab__label')!.textContent = 'A much longer first label';
      await expect.poll(() => insideHorizontally(selected, row)).toBe(true);
    });
  });

  describe('long labels and width', () => {
    it('cuts a label that is wider than the row, never wider than its container', async () => {
      const { fixture, root } = mount(
        `<div id="box" style="inline-size:240px"><ck-tabs><ck-tab-list aria-label="Long">
           <ck-tab value="a">${'Very long workout name '.repeat(8)}</ck-tab><ck-tab value="b">Short</ck-tab>
         </ck-tab-list></ck-tabs></div>`,
      );
      await settle(fixture);
      const [long] = tabsOf(root);
      expect(rect(long).width).toBeLessThanOrEqual(240);
      const label = long.querySelector<HTMLElement>('.ck-tab__label')!;
      expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
      expect(getComputedStyle(label).textOverflow).toBe('ellipsis');
      expect(rect(list(root)).width).toBeLessThanOrEqual(240);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    });

    it('keeps a long label whole in the accessible text', async () => {
      const text = 'Aaaa '.repeat(30).trim();
      const { fixture, root } = mount(
        `<ck-tabs><ck-tab-list aria-label="Long"><ck-tab value="a">${text}</ck-tab></ck-tab-list></ck-tabs>`,
      );
      await settle(fixture);
      expect(tabsOf(root)[0].textContent!.trim()).toBe(text);
    });

    it('is as wide as its tabs by default, and shares the container equally when full width', async () => {
      const inline = mount(`<div style="inline-size:600px">${GROUP()}</div>`);
      await settle(inline.fixture);
      expect(rect(tabsOf(inline.root)[0]).width).toBeLessThan(200);
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      const { fixture, root } = mount(`<div style="inline-size:600px">${GROUP('fullWidth')}</div>`);
      await settle(fixture);
      const widths = tabsOf(root).map((tab) => rect(tab).width);
      for (const width of widths) {
        expect(width).toBeCloseTo(200, 0);
      }
      expect(rect(list(root)).width).toBe(600);
    });

    it('lets a full width tab with a longer label grow instead of being cut, and scrolls when all do not fit', async () => {
      const { fixture, root } = mount(
        `<div style="inline-size:300px"><ck-tabs fullWidth><ck-tab-list aria-label="Mixed">
           <ck-tab value="a">Vordefiniert</ck-tab><ck-tab value="b">Meine</ck-tab><ck-tab value="c">Geteilt</ck-tab>
         </ck-tab-list></ck-tabs></div>`,
      );
      await settle(fixture);
      for (const tab of tabsOf(root)) {
        const label = tab.querySelector<HTMLElement>('.ck-tab__label')!;
        expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth);
      }
      const total = tabsOf(root).reduce((sum, tab) => sum + rect(tab).width, 0);
      expect(total).toBeCloseTo(300, 0);
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      const tight = mount(MANY(12, 300, 'fullWidth'));
      await settle(tight.fixture);
      expect(list(tight.root).scrollWidth).toBeGreaterThan(list(tight.root).clientWidth);
      for (const tab of tabsOf(tight.root)) {
        const label = tab.querySelector<HTMLElement>('.ck-tab__label')!;
        expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth);
      }
    });

    it('keeps the size from the control tokens in a very narrow container', async () => {
      const { fixture, root } = mount(`<div style="inline-size:60px">${GROUP('fullWidth')}</div>`);
      await settle(fixture);
      expect(rect(tabsOf(root)[0]).height).toBe(40);
      expect(rect(list(root)).width).toBeLessThanOrEqual(60);
    });
  });

  describe('forced colors', () => {
    const forced = async (template: string, selected?: string) => {
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      const mounted = mount(template, (host) => host.value.set(selected ?? null));
      await settle(mounted.fixture);
      return mounted;
    };

    it('draws the underline in Highlight, the selected text in CanvasText and the row line in CanvasText', async () => {
      const { root } = await forced(GROUP(), 'b');
      const [first, second] = tabsOf(root);
      expect(indicator(second).backgroundColor).toBe(resolveColor(root, 'Highlight'));
      expect(getComputedStyle(second).color).toBe(resolveColor(root, 'CanvasText'));
      expect(getComputedStyle(first).color).toBe(resolveColor(root, 'ButtonText'));
      expect(getComputedStyle(list(root)).borderBottomColor).toBe(resolveColor(root, 'CanvasText'));
      expect(indicator(second).scale).toBe('1');
      expect(indicator(first).scale).not.toBe('1');
    });

    it('draws a disabled tab in GrayText and an enabled one not', async () => {
      const { root } = await forced(
        `<ck-tabs><ck-tab-list aria-label="Source"><ck-tab value="a">Alpha</ck-tab>
         <ck-tab value="b" disabled>Beta</ck-tab><ck-tab value="c">Gamma</ck-tab></ck-tab-list></ck-tabs>`,
      );
      const [enabled, disabled, other] = tabsOf(root);
      expect(getComputedStyle(disabled).color).toBe(resolveColor(root, 'GrayText'));
      expect(getComputedStyle(enabled).color).not.toBe(resolveColor(root, 'GrayText'));
      expect(getComputedStyle(other).color).not.toBe(resolveColor(root, 'GrayText'));
    });

    it('draws the keyboard focus ring of a tab and of a panel in Highlight at the token width', async () => {
      const { root } = await forced(`<button id="before">Before</button>${GROUP()}`);
      query(root, '#before').focus();
      await userEvent.tab();
      const tab = getComputedStyle(tabsOf(root)[0], '::before');
      expect(tab.outlineColor).toBe(resolveColor(root, 'Highlight'));
      expect(tab.outlineStyle).toBe('solid');
      expect(tab.outlineWidth).toBe('2px');
      await userEvent.tab();
      const panel = getComputedStyle(query(root, 'ck-tab-panel'));
      expect(panel.outlineColor).toBe(resolveColor(root, 'Highlight'));
      expect(panel.outlineWidth).toBe('2px');
    });

    it('colours a hovered enabled tab Highlight and leaves a disabled one in GrayText', async () => {
      const { root } = await forced(
        `<ck-tabs><ck-tab-list aria-label="Source"><ck-tab value="a">Alpha</ck-tab>
         <ck-tab value="b">Beta</ck-tab><ck-tab value="c" disabled>Gamma</ck-tab></ck-tab-list></ck-tabs>`,
      );
      const [, hovered, disabled] = tabsOf(root);
      await userEvent.hover(hovered);
      expect(getComputedStyle(hovered).color).toBe(resolveColor(root, 'Highlight'));
      await userEvent.hover(disabled);
      expect(getComputedStyle(disabled).color).toBe(resolveColor(root, 'GrayText'));
    });
  });

  describe('reduced motion', () => {
    const MOTION = (tokens: string) =>
      tokens.replace('--ck-duration-fast:0ms', '--ck-duration-fast:100ms');

    it('transitions the colour and the underline normally and not under reduced motion', async () => {
      const normal = mount(GROUP(), undefined, MOTION(TOKENS));
      await settle(normal.fixture);
      const tab = tabsOf(normal.root)[0];
      expect(getComputedStyle(tab).transitionDuration).toContain('0.1s');
      expect(indicator(tab).transitionDuration).toBe('0.1s');
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      const reduced = mount(GROUP(), undefined, MOTION(TOKENS));
      await settle(reduced.fixture);
      const quiet = tabsOf(reduced.root)[0];
      expect(getComputedStyle(quiet).transitionDuration).toBe('0s');
      expect(indicator(quiet).transitionDuration).toBe('0s');
    });
  });
});
