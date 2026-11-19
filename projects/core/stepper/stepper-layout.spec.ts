import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CK_SIZES, CkSize } from '@ckui/core';
import { CkMedia } from '@ckui/core/internal';
import { cdp, page, userEvent } from 'vitest/browser';
import { inputOf, minusOf, mount, plusOf, query, settle } from '../testing/stepper-host';

const HEIGHTS: Record<CkSize, number> = { sm: 32, md: 40, lg: 48, xl: 60 };
/** The coarse-pointer values of `tokens.css`, set inline: sm and md rise to 44. */
const COARSE_TOKENS =
  '--ck-control-height-sm:44px;--ck-control-height-md:44px;--ck-control-font-size-sm:16px;--ck-control-font-size-md:16px';
const COARSE_HEIGHTS: Record<CkSize, number> = { sm: 44, md: 44, lg: 48, xl: 60 };

const stepper = (attributes = '') => `<ck-stepper aria-label="FTP" ${attributes} [value]="250" />`;

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

async function emulate(features: { name: string; value: string }[]): Promise<void> {
  await (cdp() as unknown as Session).send('Emulation.setEmulatedMedia', { features });
}

const rect = (element: Element) => element.getBoundingClientRect();

describe('CkStepper layout', () => {
  afterEach(async () => {
    document.body.replaceChildren();
    document.body.removeAttribute('dir');
    TestBed.resetTestingModule();
    await emulate([]);
    await page.viewport(800, 600);
  });

  describe('size and hit area', () => {
    it.each(CK_SIZES.map((size) => [size, HEIGHTS[size]] as const))(
      'is the control height at %s (%spx) with square buttons of that size',
      async (size, height) => {
        const { fixture, root } = mount(stepper(`size="${size}" [min]="50" [max]="600"`));
        await settle(fixture);
        expect(rect(query(root, 'ck-stepper')).height).toBe(height);
        for (const button of [minusOf(root), plusOf(root)]) {
          expect(rect(button).width).toBe(height);
          expect(rect(button).height).toBe(height);
        }
        expect(rect(inputOf(root)).height).toBe(height);
      },
    );

    it.each(CK_SIZES.map((size) => [size, COARSE_HEIGHTS[size]] as const))(
      'keeps both buttons at least 44px square at %s with the coarse tokens',
      async (size, height) => {
        const { fixture, root } = mount(stepper(`size="${size}"`));
        root.setAttribute('style', `${root.getAttribute('style')};${COARSE_TOKENS}`);
        await settle(fixture);
        for (const button of [minusOf(root), plusOf(root)]) {
          expect(rect(button).width).toBe(height);
          expect(rect(button).height).toBe(height);
          expect(rect(button).width).toBeGreaterThanOrEqual(
            size === 'sm' || size === 'md' ? 44 : 48,
          );
        }
      },
    );

    it('hits the buttons across their whole square and the input in the middle', async () => {
      // The outer corners are rounded, so the probes sit in a square-cornered control.
      const { fixture, root } = mount(stepper('size="xl" style="--ck-stepper-radius: 0px"'));
      await settle(fixture);
      for (const button of [minusOf(root), plusOf(root)]) {
        const box = rect(button);
        for (const [x, y] of [
          [box.left + 2, box.top + 2],
          [box.left + box.width / 2, box.top + box.height / 2],
          [box.right - 2, box.bottom - 2],
        ]) {
          expect(document.elementFromPoint(x, y)?.closest('button')).toBe(button);
        }
      }
      const box = rect(inputOf(root));
      expect(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)).toBe(
        inputOf(root),
      );
    });

    it('takes the height from the control tokens set on the page', async () => {
      const { fixture, root } = mount(stepper());
      root.setAttribute('style', `${root.getAttribute('style')};--ck-control-height-md:52px`);
      await settle(fixture);
      expect(rect(query(root, 'ck-stepper')).height).toBe(52);
      expect(rect(minusOf(root)).width).toBe(52);
    });
  });

  describe('order and direction', () => {
    it('lays out minus, value, plus from the start edge', async () => {
      const { fixture, root } = mount(stepper('unit="W"'));
      await settle(fixture);
      expect(rect(minusOf(root)).right).toBeLessThanOrEqual(rect(inputOf(root)).left + 0.5);
      expect(rect(inputOf(root)).right).toBeLessThanOrEqual(rect(plusOf(root)).left + 0.5);
      expect(rect(query(root, '.ck-stepper__unit')).left).toBeGreaterThanOrEqual(
        rect(inputOf(root)).right - 0.5,
      );
    });

    it('keeps minus at the inline start in right-to-left text', async () => {
      document.body.dir = 'rtl';
      const { fixture, root } = mount(stepper());
      await settle(fixture);
      expect(rect(minusOf(root)).left).toBeGreaterThan(rect(plusOf(root)).left);
      expect(rect(inputOf(root)).left).toBeGreaterThan(rect(plusOf(root)).right - 0.5);
    });

    it('keeps the DOM order input first, so a wrapping label names the input', async () => {
      const { fixture, root } = mount(`<label>FTP <ck-stepper [value]="1" /></label>`);
      await settle(fixture);
      expect(inputOf(root).labels?.length).toBe(1);
      expect(minusOf(root).labels?.length).toBe(0);
    });
  });

  describe('value width', () => {
    it('is as wide as the longest limit, not the current value', async () => {
      const { fixture, root } = mount(
        `<ck-stepper aria-label="Narrow" [min]="0" [max]="9" [value]="1" />
         <ck-stepper aria-label="Wide" [min]="0" [max]="100000" [value]="1" />`,
      );
      await settle(fixture);
      expect(rect(inputOf(root, 1)).width).toBeGreaterThan(rect(inputOf(root, 0)).width);
    });

    it('does not change width while the value grows to the limit', async () => {
      const { fixture, root } = mount(
        `<ck-stepper aria-label="FTP" [min]="0" [max]="999" [value]="5" />`,
      );
      await settle(fixture);
      const before = rect(inputOf(root)).width;
      plusOf(root).click();
      await settle(fixture);
      inputOf(root).value = '999';
      expect(rect(inputOf(root)).width).toBe(before);
    });

    it('fits the formatted limits including the decimals and the sign', async () => {
      const { fixture, root } = mount(
        `<ck-stepper aria-label="Grade" [min]="-10.5" [max]="10.5" [step]="0.5" [value]="0" />`,
      );
      await settle(fixture);
      expect(inputOf(root).scrollWidth).toBeLessThanOrEqual(inputOf(root).clientWidth);
    });

    it('uses --ck-stepper-value-width when set', async () => {
      const { fixture, root } = mount(
        `<ck-stepper aria-label="FTP" style="--ck-stepper-value-width: 120px" [value]="1" />`,
      );
      await settle(fixture);
      expect(rect(inputOf(root)).width).toBe(120);
    });
  });

  describe('narrow containers and the phone', () => {
    it('stays inside a container narrower than its content and keeps the buttons whole', async () => {
      const { fixture, root } = mount(
        `<div style="inline-size: 150px"><ck-stepper aria-label="FTP" unit="W" size="xl" [min]="0" [max]="100000" [value]="12345" /></div>`,
      );
      await settle(fixture);
      const host = rect(query(root, 'ck-stepper'));
      expect(host.width).toBeLessThanOrEqual(150);
      expect(rect(minusOf(root)).width).toBe(60);
      expect(rect(plusOf(root)).width).toBe(60);
    });

    it('does not overflow a 390px page, in the app row with a label and a unit', async () => {
      await page.viewport(390, 844);
      const { fixture, root } = mount(
        `<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px; box-sizing: border-box; inline-size: 100%">
           <span>Functional threshold power</span>
           <ck-stepper aria-label="FTP" unit="W" size="lg" [min]="50" [max]="600" [value]="250" decrementLabel="FTP minus 5" incrementLabel="FTP plus 5" [step]="5" />
         </div>`,
      );
      await settle(fixture);
      expect(window.innerWidth).toBe(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      expect(rect(query(root, 'ck-stepper')).right).toBeLessThanOrEqual(390);
    });
  });

  describe('look', () => {
    it('fills with the control colour, draws the value bold with tabular numerals', async () => {
      const { fixture, root } = mount(stepper());
      await settle(fixture);
      const host = getComputedStyle(query(root, 'ck-stepper'));
      expect(host.backgroundColor).toBe('rgb(240, 240, 244)');
      expect(host.borderTopLeftRadius).toBe('8px');
      expect(getComputedStyle(inputOf(root)).fontWeight).toBe('700');
      expect(getComputedStyle(inputOf(root)).fontVariantNumeric).toBe('tabular-nums');
      expect(getComputedStyle(inputOf(root)).textAlign).toBe('center');
    });

    it('rounds only the outer corners of the buttons', async () => {
      const { fixture, root } = mount(stepper());
      await settle(fixture);
      const minus = getComputedStyle(minusOf(root));
      const plus = getComputedStyle(plusOf(root));
      expect([minus.borderTopLeftRadius, minus.borderTopRightRadius]).toEqual(['8px', '0px']);
      expect([plus.borderTopLeftRadius, plus.borderTopRightRadius]).toEqual(['0px', '8px']);
    });

    it('restyles with its own tokens', async () => {
      const { fixture, root } = mount(
        stepper(
          'style="--ck-stepper-bg: rgb(1, 2, 3); --ck-stepper-radius: 20px; --ck-stepper-border-color: rgb(4, 5, 6)"',
        ),
      );
      await settle(fixture);
      const host = getComputedStyle(query(root, 'ck-stepper'));
      expect(host.backgroundColor).toBe('rgb(1, 2, 3)');
      expect(host.borderTopLeftRadius).toBe('20px');
      expect(host.boxShadow).toContain('rgb(4, 5, 6)');
    });

    it('draws one focus ring around the control for keyboard focus, and none for a tap on a button on a phone', async () => {
      // A text input always matches :focus-visible, so the ring is absent only where a tap does
      // not focus the input: a coarse pointer.
      TestBed.configureTestingModule({
        providers: [{ provide: CkMedia, useValue: { coarsePointer: signal(true) } }],
      });
      const { fixture, root } = mount(`<button id="before">Before</button>${stepper()}`);
      await settle(fixture);
      const host = query(root, 'ck-stepper');
      await userEvent.click(query(root, '#before'));
      await userEvent.click(plusOf(root));
      await userEvent.click(minusOf(root));
      expect(document.activeElement).not.toBe(inputOf(root));
      expect(getComputedStyle(host).outlineStyle).toBe('none');
      query(root, '#before').focus();
      await userEvent.tab();
      expect(document.activeElement).toBe(inputOf(root));
      expect(getComputedStyle(host).outlineStyle).toBe('solid');
      expect(getComputedStyle(host).outlineColor).toBe('rgb(0, 0, 255)');
      expect(getComputedStyle(inputOf(root)).outlineStyle).toBe('none');
    });

    it('greys out and shows the not-allowed cursor for a control inside a disabled fieldset', async () => {
      const { fixture, root } = mount(
        `<fieldset disabled><ck-stepper aria-label="A" unit="W" [value]="3" /></fieldset>`,
      );
      await settle(fixture);
      const grey = 'rgb(150, 150, 160)';
      expect(getComputedStyle(inputOf(root)).color).toBe(grey);
      expect(getComputedStyle(query(root, '.ck-stepper__unit')).color).toBe(grey);
      expect(getComputedStyle(plusOf(root)).color).toBe(grey);
      expect(getComputedStyle(query(root, '.ck-stepper__field')).cursor).toBe('not-allowed');
    });

    it('greys the unit and outlines in GrayText for a fieldset-disabled control in forced colors', async () => {
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      const { fixture, root } = mount(
        `<fieldset disabled><ck-stepper aria-label="A" unit="W" [value]="3" /></fieldset>
         <ck-stepper aria-label="B" unit="W" [value]="3" />`,
      );
      await settle(fixture);
      const grayText = getComputedStyle(query(root, 'fieldset ck-stepper')).outlineColor;
      const live = getComputedStyle(root.querySelectorAll('ck-stepper')[1]).outlineColor;
      expect(grayText).not.toBe(live);
      expect(getComputedStyle(query(root, '.ck-stepper__unit')).color).toBe(
        getComputedStyle(plusOf(root)).color,
      );
    });

    it('keeps a very long unit inside a 390px page, shrinking the value before the buttons', async () => {
      await page.viewport(390, 844);
      const { fixture, root } = mount(
        `<div style="padding: 16px; box-sizing: border-box; inline-size: 100%">
           <ck-stepper aria-label="Pace" unit="minutes per kilometre on a flat road" size="lg" [min]="0" [max]="999" [value]="250" />
         </div>`,
      );
      await settle(fixture);
      expect(window.innerWidth).toBe(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      const host = rect(query(root, 'ck-stepper'));
      expect(host.right).toBeLessThanOrEqual(390 - 16 + 0.5);
      expect(rect(minusOf(root)).width).toBe(48);
      expect(rect(plusOf(root)).width).toBe(48);
      expect(rect(plusOf(root)).right).toBeLessThanOrEqual(host.right + 0.5);
    });

    it('greys out the buttons at a bound and the whole control when disabled', async () => {
      const { fixture, root } = mount(
        `<ck-stepper aria-label="A" [max]="250" [value]="250" /><ck-stepper aria-label="B" disabled [value]="1" />`,
      );
      await settle(fixture);
      expect(getComputedStyle(plusOf(root, 0)).color).toBe('rgb(150, 150, 160)');
      expect(getComputedStyle(minusOf(root, 0)).color).toBe('rgb(20, 20, 30)');
      expect(getComputedStyle(inputOf(root, 1)).color).toBe('rgb(150, 150, 160)');
      expect(getComputedStyle(plusOf(root, 1)).cursor).toBe('not-allowed');
    });

    it('draws an outline instead of the shadow, and Highlight for the ring, in forced colors', async () => {
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      const { fixture, root } = mount(`<button id="before">Before</button>${stepper()}`);
      await settle(fixture);
      const host = getComputedStyle(query(root, 'ck-stepper'));
      expect(host.boxShadow).toBe('none');
      expect(host.outlineStyle).toBe('solid');
      query(root, '#before').focus();
      await userEvent.tab();
      expect(getComputedStyle(query(root, 'ck-stepper')).outlineWidth).toBe('2px');
    });
  });
});
