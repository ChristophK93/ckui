import { TestBed } from '@angular/core/testing';
import { CK_SIZES, CkSize } from '@ckui/core';
import { CkMedia } from '@ckui/core/internal';
import { cdp, page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import {
  KINDS,
  SELECT_DARK,
  SELECT_LIGHT,
  activeOption,
  cleanUp,
  fakeMedia,
  listbox,
  mount,
  optionsOf,
  overlayPanels,
  popup,
  press,
  searchInput,
  settle,
  triggerOf,
  wait,
} from '../testing/select-host';

const HEIGHTS: Record<CkSize, number> = { sm: 32, md: 40, lg: 48, xl: 60 };

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

async function emulate(features: { name: string; value: string }[]): Promise<void> {
  await (cdp() as unknown as Session).send('Emulation.setEmulatedMedia', { features });
}

/** The computed colour of a CSS colour keyword (a system colour included) under the current emulation. */
function resolveColor(value: string): string {
  const probe = document.createElement('div');
  probe.style.color = value;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

const SELECT = (attributes = '') =>
  `<ck-select aria-label="Target" placeholder="Pick one" ${attributes} [(value)]="value">${KINDS}</ck-select>`;

const COUNTRY = (
  attributes = '',
) => `<ck-select aria-label="Country" ${attributes} [(value)]="value">
  @for (name of countries(); track name) { <ck-option [value]="name">{{ name }}</ck-option> }
</ck-select>`;

const rect = (element: Element) => element.getBoundingClientRect();
const style = (element: Element, pseudo?: string) => getComputedStyle(element, pseudo);

describe('CkSelect layout', () => {
  afterEach(async () => {
    cleanUp();
    await emulate([]);
    const session = cdp() as unknown as Session;
    await session
      .send('Emulation.setTouchEmulationEnabled', { enabled: false })
      .catch(() => undefined);
    await page.viewport(800, 600);
  });

  async function opened(
    template: string,
    prepare?: Parameters<typeof mount>[1],
    tokens?: Parameters<typeof mount>[3],
  ) {
    const mounted = mount(template, prepare, undefined, tokens);
    await settle(mounted.fixture);
    const trigger = triggerOf(mounted.root);
    trigger.click();
    await settle(mounted.fixture);
    return { ...mounted, trigger };
  }

  describe('the trigger', () => {
    it.each(CK_SIZES.map((size) => [size, HEIGHTS[size]] as const))(
      'is the control height at %s (%spx), full width, with a border and a rounded corner',
      async (size, height) => {
        const { fixture, root } = mount(SELECT(`size="${size}"`));
        await settle(fixture);
        const trigger = triggerOf(root);
        expect(rect(trigger).height).toBe(height);
        expect(rect(trigger).width).toBe(rect(root.querySelector('ck-select')!).width);
        expect(style(trigger).borderTopWidth).toBe('1px');
        expect(style(trigger).borderTopLeftRadius).toBe('8px');
        expect(style(trigger).backgroundColor).toBe('rgb(240, 240, 244)');
        expect(style(trigger).borderTopColor).toBe('rgb(110, 110, 120)');
      },
    );

    it('takes its look from the select tokens, before the control tokens', async () => {
      const { fixture, root } = mount(
        `<div style="--ck-select-bg: rgb(1, 2, 3); --ck-select-border-color: rgb(4, 5, 6); --ck-select-radius: 3px">${SELECT()}</div>`,
      );
      await settle(fixture);
      const trigger = triggerOf(root);
      expect(style(trigger).backgroundColor).toBe('rgb(1, 2, 3)');
      expect(style(trigger).borderTopColor).toBe('rgb(4, 5, 6)');
      expect(style(trigger).borderTopLeftRadius).toBe('3px');
    });

    it('is a 44px target under the coarse-pointer tokens', async () => {
      const { fixture, root } = mount(SELECT(), undefined, undefined, {
        ...SELECT_LIGHT,
        '--ck-control-height-md': '44px',
      });
      await settle(fixture);
      expect(rect(triggerOf(root)).height).toBe(44);
    });

    it('shows the value in the muted placeholder colour and the focus ring on the keyboard', async () => {
      const { fixture, root } = mount(
        `<button id="before" type="button">Before</button>${SELECT()}`,
      );
      await settle(fixture);
      expect(style(root.querySelector('.ck-select__placeholder')!).color).toBe('rgb(80, 80, 90)');
      root.querySelector<HTMLElement>('#before')!.focus();
      await userEvent.tab();
      expect(style(triggerOf(root)).outlineStyle).toBe('solid');
      expect(style(triggerOf(root)).outlineColor).toBe('rgb(0, 0, 255)');
    });

    it('greys out when disabled, also inside a disabled fieldset', async () => {
      const { fixture, root } = mount(`<fieldset disabled>${SELECT()}</fieldset>`);
      await settle(fixture);
      expect(style(triggerOf(root)).cursor).toBe('not-allowed');
      expect(style(triggerOf(root)).color).toBe('rgb(150, 150, 160)');
    });

    it('can be as narrow as its container and does not overflow', async () => {
      const { fixture, root } = mount(`<div style="inline-size: 90px">${SELECT()}</div>`);
      await settle(fixture);
      expect(rect(triggerOf(root)).width).toBe(90);
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
    });
  });

  describe('the popover', () => {
    it('is at least as wide as the trigger and keeps rows at least the target size', async () => {
      const { trigger } = await opened(`<div style="inline-size: 300px">${SELECT()}</div>`);
      expect(rect(popup()!).width).toBeGreaterThanOrEqual(300);
      for (const option of optionsOf()) {
        expect(rect(option).height).toBeGreaterThanOrEqual(24);
        expect(rect(option).width).toBeCloseTo(rect(listbox()!).width, 0);
      }
      expect(rect(popup()!).top).toBeGreaterThanOrEqual(rect(trigger).bottom);
    });

    it('rows are 44px tall under the coarse-pointer tokens', async () => {
      await opened(SELECT(), undefined, { ...SELECT_LIGHT, '--ck-target-min': '44px' });
      for (const option of optionsOf()) {
        expect(rect(option).height).toBeGreaterThanOrEqual(44);
      }
    });

    it('lets the whole row be pressed, to the edges', async () => {
      const { fixture, host } = await opened(SELECT());
      const row = rect(optionsOf()[1]);
      for (const x of [row.left + 1, row.right - 1]) {
        expect(document.elementFromPoint(x, row.top + row.height / 2)?.closest('ck-option')).toBe(
          optionsOf()[1],
        );
      }
      optionsOf()[1].click();
      await settle(fixture);
      expect(host.value()).toBe('watt');
    });

    it('wraps long option text instead of cutting it or growing the page', async () => {
      const long = 'Zone two endurance ride with cadence drills and a long unbroken tail '.repeat(
        4,
      );
      const { fixture } = await opened(
        `<div style="inline-size: 200px"><ck-select aria-label="Workout" [(value)]="value"><ck-option value="a">${long}</ck-option><ck-option value="b">Short</ck-option><ck-option value="c">${'x'.repeat(200)}</ck-option></ck-select></div>`,
      );
      await settle(fixture);
      const [wrapped, short, unbroken] = optionsOf();
      expect(rect(wrapped).height).toBeGreaterThan(rect(short).height * 2);
      expect(rect(popup()!).width).toBeLessThanOrEqual(480);
      expect(listbox()!.scrollWidth).toBeLessThanOrEqual(listbox()!.clientWidth);
      expect(rect(unbroken).right).toBeLessThanOrEqual(rect(popup()!).right);
      expect(style(wrapped.querySelector('.ck-option__content')!).textOverflow).not.toBe(
        'ellipsis',
      );
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    });

    it('scrolls inside a list of 200 options, up to the token height, and keeps the keyboard working', async () => {
      const { fixture, trigger, host } = await opened(
        COUNTRY(),
        (state) =>
          state.countries.set(Array.from({ length: 200 }, (_, index) => `Option ${index}`)),
        { ...SELECT_LIGHT, '--ck-listbox-max-height': '240px' },
      );
      expect(optionsOf().length).toBe(200);
      expect(rect(listbox()!).height).toBeLessThanOrEqual(240);
      expect(listbox()!.scrollHeight).toBeGreaterThan(listbox()!.clientHeight);
      press(trigger, 'End');
      await settle(fixture);
      expect(activeOption()!.textContent!.trim()).toBe('Option 199');
      // The last row ends where the list's own padding starts.
      expect(listbox()!.scrollTop + listbox()!.clientHeight).toBeGreaterThanOrEqual(
        listbox()!.scrollHeight - 8,
      );
      for (let step = 0; step < 3; step++) {
        press(trigger, 'PageUp');
      }
      await settle(fixture);
      expect(activeOption()!.textContent!.trim()).toBe('Option 169');
      const row = rect(activeOption()!);
      expect(row.top).toBeGreaterThanOrEqual(rect(listbox()!).top - 1);
      expect(row.bottom).toBeLessThanOrEqual(rect(listbox()!).bottom + 1);
      press(trigger, 'Enter');
      await settle(fixture);
      expect(host.value()).toBe('Option 169');
    });

    it('opens upwards when there is no room below, and stays inside the viewport', async () => {
      const { trigger } = await opened(
        `<div style="position: fixed; inset-inline: 20px; inset-block-end: 6px">${SELECT()}</div>`,
        (state) => state.value.set('ftp'),
      );
      expect(rect(popup()!).bottom).toBeLessThanOrEqual(rect(trigger).top + 1);
      expect(rect(popup()!).top).toBeGreaterThanOrEqual(0);
    });

    it('shrinks into a short viewport and scrolls the list', async () => {
      await page.viewport(800, 200);
      await opened(COUNTRY(), (state) =>
        state.countries.set(Array.from({ length: 60 }, (_, index) => `Option ${index}`)),
      );
      expect(rect(popup()!).bottom).toBeLessThanOrEqual(200);
      expect(rect(popup()!).top).toBeGreaterThanOrEqual(0);
      expect(listbox()!.scrollHeight).toBeGreaterThan(listbox()!.clientHeight);
    });

    it('stays inside a phone-width window even though it is not a sheet there', async () => {
      await page.viewport(390, 800);
      await opened(SELECT());
      const media = TestBed.inject(CkMedia);
      expect(media.narrow()).toBe(true);
      expect(media.coarsePointer()).toBe(false);
      expect(document.querySelector('.ck-overlay--popover')).not.toBeNull();
      expect(document.querySelector('.ck-overlay--sheet')).toBeNull();
      expect(rect(popup()!).left).toBeGreaterThanOrEqual(0);
      expect(rect(popup()!).right).toBeLessThanOrEqual(390);
    });

    it('follows the options a stylesheet colours with its tokens', async () => {
      const { fixture } = await opened(SELECT(), (state) => state.value.set('watt'), {
        ...SELECT_LIGHT,
        '--ck-listbox-bg': 'rgb(250, 240, 230)',
        '--ck-option-bg-selected': 'rgb(10, 20, 30)',
        '--ck-option-fg-selected': 'rgb(200, 210, 220)',
        '--ck-listbox-shadow': '0 0 0 7px rgb(1, 1, 1)',
      });
      await settle(fixture);
      const selected = optionsOf()[1];
      expect(style(popup()!).backgroundColor).toBe('rgb(250, 240, 230)');
      expect(style(popup()!).boxShadow).toContain('rgb(1, 1, 1)');
      expect(style(selected).backgroundColor).toBe('rgb(10, 20, 30)');
      expect(style(selected).color).toBe('rgb(200, 210, 220)');
      expect(style(selected.querySelector('.ck-option__check')!).color).toBe('rgb(200, 210, 220)');
    });

    it('paints the highlight with a fill a step stronger than hover, and no bar', async () => {
      const { fixture, trigger } = await opened(SELECT());
      press(trigger, 'ArrowDown');
      await settle(fixture);
      const active = activeOption()!;
      expect(optionsOf()[1]).toBe(active);
      expect(style(active).backgroundImage).toContain('rgba(0, 0, 0, 0.1)');
      expect(style(active, '::before').content).toBe('none');
      expect(style(optionsOf()[0]).backgroundImage).toBe('none');
    });

    it('follows the highlight token', async () => {
      const { fixture, trigger } = await opened(SELECT(), undefined, {
        ...SELECT_LIGHT,
        '--ck-option-bg-active': 'rgb(250, 200, 100)',
      });
      press(trigger, 'ArrowDown');
      await settle(fixture);
      expect(style(activeOption()!).backgroundImage).toContain('rgb(250, 200, 100)');
    });

    it('draws the check on the selected option and its text in the selected weight', async () => {
      await opened(SELECT(), (state) => state.value.set('level'));
      const selected = optionsOf()[2];
      expect(selected.querySelector('.ck-option__check')).not.toBeNull();
      expect(style(selected).fontWeight).toBe('600');
      expect(style(optionsOf()[0]).fontWeight).not.toBe('600');
    });

    it('greys out a disabled option and a disabled group', async () => {
      await opened(SELECT());
      expect(style(optionsOf()[3]).color).toBe('rgb(150, 150, 160)');
      expect(style(optionsOf()[3]).cursor).toBe('not-allowed');
    });

    it('hides filtered options and groups from the layout', async () => {
      const { fixture } = await opened(
        `<ck-select aria-label="Target" filter [(value)]="value">
          <ck-optgroup label="Fruit"><ck-option value="a">Apple</ck-option></ck-optgroup>
          <ck-optgroup label="Veg"><ck-option value="c">Carrot</ck-option></ck-optgroup>
        </ck-select>`,
      );
      await userEvent.keyboard('car');
      await settle(fixture);
      const groups = Array.from(document.querySelectorAll<HTMLElement>('ck-optgroup'));
      expect(style(groups[0]).display).toBe('none');
      expect(style(groups[1]).display).toBe('block');
    });
  });

  describe('right-to-left', () => {
    it('aligns the popover and the chevron to the inline end', async () => {
      const { fixture, trigger } = await opened(
        `<div dir="rtl" style="inline-size: 200px; margin-inline-start: 300px">${SELECT()}</div>`,
      );
      press(trigger, 'ArrowDown');
      await settle(fixture);
      expect(rect(popup()!).right).toBeCloseTo(rect(trigger).right, 0);
      const chevron = rect(trigger.querySelector('.ck-select__chevron')!);
      expect(chevron.left - rect(trigger).left).toBeLessThan(20);
    });
  });

  describe('forced colors', () => {
    const forced = async (template: string, prepare?: Parameters<typeof mount>[1]) => {
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      return opened(template, prepare);
    };

    it('uses system colours for the trigger, its border and its focus ring', async () => {
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      const { fixture, root } = mount(`<button id="before" type="button">B</button>${SELECT()}`);
      await settle(fixture);
      const trigger = triggerOf(root);
      expect(style(trigger).borderTopColor).toBe(resolveColor('ButtonText'));
      expect(style(trigger).color).toBe(resolveColor('ButtonText'));
      root.querySelector<HTMLElement>('#before')!.focus();
      await userEvent.tab();
      expect(style(trigger).outlineColor).toBe(resolveColor('Highlight'));
    });

    it('paints the highlight Highlight on HighlightText and the selected check CanvasText', async () => {
      const { fixture, trigger } = await forced(SELECT(), (state) => state.value.set('ftp'));
      press(trigger, 'ArrowDown');
      await settle(fixture);
      const active = activeOption()!;
      expect(active.textContent!.trim()).toBe('Watts');
      expect(style(active).backgroundColor).toBe(resolveColor('Highlight'));
      expect(style(active).color).toBe(resolveColor('HighlightText'));
      expect(style(active).backgroundImage).toBe('none');
      const selected = optionsOf()[0];
      expect(style(selected.querySelector('.ck-option__check')!).color).toBe(
        resolveColor('CanvasText'),
      );
      press(trigger, 'ArrowUp');
      await settle(fixture);
      expect(activeOption()).toBe(selected);
      expect(style(selected.querySelector('.ck-option__check')!).color).toBe(
        resolveColor('HighlightText'),
      );
    });

    it('draws disabled options in GrayText and keeps the popup edge visible', async () => {
      await forced(SELECT());
      expect(style(optionsOf()[3]).color).toBe(resolveColor('GrayText'));
      expect(style(popup()!).borderTopColor).toBe(resolveColor('CanvasText'));
    });
  });

  describe('reduced motion', () => {
    it('does not animate the chevron', async () => {
      await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      const { fixture, root } = mount(SELECT(), undefined, undefined, {
        ...SELECT_LIGHT,
        '--ck-duration-fast': '100ms',
      });
      await settle(fixture);
      const chevron = root.querySelector<HTMLElement>('.ck-select__chevron')!;
      expect(style(chevron).transitionDuration).toBe('0s');
      triggerOf(root).click();
      await settle(fixture);
      expect(style(chevron).transform).not.toBe('none');
    });

    it('animates it otherwise', async () => {
      const { fixture, root } = mount(SELECT(), undefined, undefined, {
        ...SELECT_LIGHT,
        '--ck-duration-fast': '100ms',
      });
      await settle(fixture);
      expect(style(root.querySelector('.ck-select__chevron')!).transitionDuration).toBe('0.1s');
    });
  });

  describe('as a sheet', () => {
    it('is a bottom sheet across the viewport with rows as tall as the control', async () => {
      fakeMedia(true);
      const { fixture } = await opened(SELECT(), undefined, {
        ...SELECT_LIGHT,
        '--ck-control-height-md': '44px',
        '--ck-target-min': '44px',
      });
      await settle(fixture);
      const panel = document.querySelector<HTMLElement>('.ck-overlay--sheet')!;
      expect(rect(panel).width).toBe(window.innerWidth);
      expect(Math.round(rect(panel).bottom)).toBe(window.innerHeight);
      for (const option of optionsOf()) {
        expect(rect(option).height).toBeGreaterThanOrEqual(44);
        expect(rect(option).width).toBeGreaterThanOrEqual(window.innerWidth - 2);
      }
      expect(overlayPanels().length).toBe(1);
      expect(style(panel).borderTopLeftRadius).toBe('16px');
    });

    it('has 60px rows at xl', async () => {
      fakeMedia(true);
      await opened(SELECT('size="xl"'));
      for (const option of optionsOf()) {
        expect(rect(option).height).toBeGreaterThanOrEqual(60);
      }
    });

    it('scrolls a long list inside the sheet and never grows past the viewport', async () => {
      fakeMedia(true);
      await opened(COUNTRY(), (state) =>
        state.countries.set(Array.from({ length: 200 }, (_, index) => `Option ${index}`)),
      );
      const panel = document.querySelector<HTMLElement>('.ck-overlay--sheet')!;
      expect(rect(panel).height).toBeLessThanOrEqual(window.innerHeight);
      expect(listbox()!.scrollHeight).toBeGreaterThan(listbox()!.clientHeight);
    });

    it('is a real sheet under a coarse pointer in a phone-width window', async () => {
      await page.viewport(390, 844);
      await (cdp() as unknown as Session).send('Emulation.setTouchEmulationEnabled', {
        enabled: true,
        maxTouchPoints: 5,
      });
      await wait(50);
      const { fixture, host } = await opened(SELECT());
      expect(TestBed.inject(CkMedia).sheet()).toBe(true);
      const panel = document.querySelector<HTMLElement>('.ck-overlay--sheet')!;
      expect(panel.getAttribute('role')).toBe('dialog');
      expect(rect(panel).width).toBe(390);
      expect(Math.round(rect(panel).bottom)).toBe(844);
      optionsOf()[1].click();
      await settle(fixture);
      await wait(20);
      expect(host.value()).toBe('watt');
      expect(overlayPanels()).toEqual([]);
    });
  });

  describe('accessibility', () => {
    it.each([
      ['light', SELECT_LIGHT, 'white', 'rgb(20, 20, 30)'],
      ['dark', SELECT_DARK, 'rgb(30, 30, 36)', 'rgb(245, 245, 250)'],
    ] as const)(
      'has no axe violations in %s: closed, popover, popover with filter, sheet',
      async (_name, tokens, background, color) => {
        const wrap = (inner: string) =>
          `<div style="background: ${background}; color: ${color}">${inner}</div>`;
        const first = mount(
          wrap(
            `<label for="x">Plain</label>${SELECT('id="x"')}<ck-select aria-label="Searchable" filter [value]="value()">${KINDS}</ck-select>`,
          ),
          undefined,
          undefined,
          tokens,
        );
        await settle(first.fixture);
        await expectNoAxeViolations(first.root);
        const container = () => document.querySelector('.cdk-overlay-container')!;

        triggerOf(first.root, 0).click();
        await settle(first.fixture);
        press(triggerOf(first.root, 0), 'ArrowDown');
        await settle(first.fixture);
        await expectNoAxeViolations(container());
        await expectNoAxeViolations(first.root);
        press(triggerOf(first.root, 0), 'Escape');
        await settle(first.fixture);

        triggerOf(first.root, 1).click();
        await settle(first.fixture);
        await userEvent.keyboard('al');
        await settle(first.fixture);
        expect(searchInput()).not.toBeNull();
        await expectNoAxeViolations(container());
        await userEvent.keyboard('{Escape}');
        await settle(first.fixture);

        cleanUp();
        fakeMedia(true);
        const second = mount(wrap(`${SELECT()}`), undefined, undefined, tokens);
        await settle(second.fixture);
        triggerOf(second.root).click();
        await settle(second.fixture);
        await expectNoAxeViolations(container());
      },
    );

    it('has no axe violations for a sheet with a filter and no results', async () => {
      fakeMedia(true);
      const { fixture } = await opened(COUNTRY('filter'));
      await userEvent.keyboard('zzz');
      await settle(fixture);
      await expectNoAxeViolations(document.querySelector('.cdk-overlay-container')!);
    });
  });
});
