import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CkButton } from '@ckui/core/button';
import { CK_FIELD_IMPORTS } from '@ckui/core/field';
import { cdp, userEvent } from 'vitest/browser';
import { contrastRatio, resolveToken } from '../../core/testing/contrast';
import { CUSTOM_THEME_CSS } from './app/pages/theming/theming-samples';
import { resetTestTheme, setTestTheme, settleAnimations } from './app/testing/theme-env';

const FOCUS_YELLOW = 'rgb(255, 204, 0)';
const FIELD_FILL = 'rgb(22, 22, 24)';

@Component({
  imports: [CkButton, CK_FIELD_IMPORTS],
  template: `
    <button id="before" type="button">Before</button>
    <div class="ck-root area" [attr.data-ck-theme]="theme">
      <button id="primary" ckButton variant="primary">Save</button>
      <button id="secondary" ckButton>Cancel</button>
      <button id="ghost" ckButton variant="ghost">Skip</button>
      <button id="danger" ckButton variant="danger">Delete</button>
      <button id="extra-large" ckButton variant="primary" size="xl">Continue</button>
      <ck-field>
        <label for="themed-name">Name</label>
        <input ckInput id="themed-name" />
      </ck-field>
      <ck-field labelFloat="always" id="floated-field">
        <label for="themed-floated">Floated</label>
        <input ckInput id="themed-floated" value="Value" />
      </ck-field>
      <input id="standalone" ckInput aria-label="Standalone" />
    </div>
  `,
})
class ThemedHost {
  theme: string | null = null;
}

/** Every token the shipped dark theme block declares, found in the loaded library stylesheet. */
function darkThemeTokens(): string[] {
  const tokens = new Set<string>();
  const visit = (rules: CSSRuleList): void => {
    for (const rule of Array.from(rules)) {
      if (
        rule instanceof CSSStyleRule &&
        /^\[data-ck-theme=["']dark["']\]$/.test(rule.selectorText)
      ) {
        for (const name of Array.from(rule.style)) {
          if (name.startsWith('--')) {
            tokens.add(name);
          }
        }
      } else if ('cssRules' in rule) {
        visit((rule as CSSGroupingRule).cssRules);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      visit(sheet.cssRules);
    } catch {
      // A cross-origin sheet cannot be read.
    }
  }
  return [...tokens];
}

/** Tabs forward from a sentinel before the area until the element has focus, as a keyboard user would. */
async function keyboardFocus(element: HTMLElement): Promise<void> {
  document.querySelector<HTMLElement>('#before')!.focus();
  for (let step = 0; step < 12 && document.activeElement !== element; step++) {
    await userEvent.tab();
  }
  expect(document.activeElement).toBe(element);
  await settleAnimations();
}

function applyStyle(css: string): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  return style;
}

function mountHost(theme: string | null): HTMLElement {
  const fixture = TestBed.createComponent(ThemedHost);
  fixture.componentInstance.theme = theme;
  const root = fixture.nativeElement as HTMLElement;
  document.body.appendChild(root);
  fixture.detectChanges();
  return root;
}

async function emulateScheme(scheme: 'light' | 'dark' | null): Promise<void> {
  // The provider adds `send` to the session type at runtime only.
  const session = cdp() as unknown as {
    send(method: string, params: unknown): Promise<unknown>;
  };
  await session.send('Emulation.setEmulatedMedia', {
    features: scheme ? [{ name: 'prefers-color-scheme', value: scheme }] : [],
  });
}

/**
 * Applies the "Custom theme" block of the theming page as an unlayered stylesheet. Later components
 * add their own `describe` here, so every package is checked against the same app theme, with and
 * without a `data-ck-theme` attribute.
 */
describe('custom theme', () => {
  let style: HTMLStyleElement | undefined;

  afterEach(async () => {
    style?.remove();
    document.body.replaceChildren();
    resetTestTheme();
    TestBed.resetTestingModule();
    await emulateScheme(null);
  });

  describe('sample', () => {
    beforeEach(() => {
      style = applyStyle(CUSTOM_THEME_CSS);
    });

    it('is applied as written: unlayered and without a layer statement', () => {
      expect(CUSTOM_THEME_CSS).not.toContain('@layer');
      expect(style?.sheet?.cssRules).toHaveLength(1);
      expect(style?.sheet?.cssRules[0]).toBeInstanceOf(CSSStyleRule);
    });

    it('sets every token the shipped dark theme block declares', () => {
      const shipped = darkThemeTokens();
      expect(shipped.length).toBeGreaterThan(30);
      const missing = shipped.filter((token) => !CUSTOM_THEME_CSS.includes(`${token}:`));
      expect(missing).toEqual([]);
    });

    it('meets the contrast targets of the shipped themes, except the intentionally quiet lines', () => {
      const element = mountHost('dark').querySelector<HTMLElement>('.area')!;
      const token = (name: string): string => resolveToken(element, `--ck-color-${name}`);
      const problems: string[] = [];
      const check = (foregrounds: string[], backgrounds: string[], minimum: number): void => {
        for (const foreground of foregrounds) {
          for (const background of backgrounds) {
            const ratio = contrastRatio(token(foreground), token(background));
            if (ratio < minimum) {
              problems.push(`${foreground} on ${background}: ${ratio.toFixed(2)} < ${minimum}`);
            }
          }
        }
      };
      check(['fg', 'fg-muted'], ['bg', 'surface', 'surface-raised', 'control'], 4.5);
      check(['on-primary'], ['primary', 'primary-hover', 'primary-active'], 4.5);
      check(['on-danger'], ['danger', 'danger-hover', 'danger-active'], 4.5);
      check(['on-success'], ['success'], 4.5);
      check(['on-warning'], ['warning'], 4.5);
      for (const role of ['primary', 'danger', 'success', 'warning']) {
        check([`${role}-fg`], ['bg', 'surface', `${role}-subtle`], 4.5);
      }
      check(['focus-ring', 'primary', 'danger'], ['bg', 'surface'], 3);
      expect(problems).toEqual([]);
    });
  });

  describe.each([
    { name: 'with data-ck-theme="dark"', theme: 'dark', scheme: null },
    { name: 'without data-ck-theme, OS light', theme: null, scheme: 'light' },
    { name: 'without data-ck-theme, OS dark', theme: null, scheme: 'dark' },
  ] as const)('$name', ({ theme, scheme }) => {
    let root: HTMLElement;
    const query = <T extends HTMLElement>(selector: string): T =>
      root.querySelector<T>(selector) as T;

    beforeEach(async () => {
      await emulateScheme(scheme);
      setTestTheme(theme);
      style = applyStyle(CUSTOM_THEME_CSS);
      root = mountHost(theme);
    });

    describe('button', () => {
      it('fills the primary button white with near-black text', () => {
        const computed = getComputedStyle(query('#primary'));
        expect(computed.backgroundColor).toBe('rgb(255, 255, 255)');
        expect(computed.color).toBe('rgb(11, 11, 12)');
      });

      it('fills the secondary button with the control colour and a transparent border', () => {
        const computed = getComputedStyle(query('#secondary'));
        expect(computed.backgroundColor).toBe('rgb(36, 36, 39)');
        expect(computed.borderTopColor).toBe('rgba(0, 0, 0, 0)');
        expect(computed.color).toBe('rgb(255, 255, 255)');
      });

      it('fills the danger button red with near-black text', () => {
        const computed = getComputedStyle(query('#danger'));
        expect(computed.backgroundColor).toBe('rgb(255, 90, 78)');
        expect(computed.color).toBe('rgb(11, 11, 12)');
      });

      it('gives the ghost button no fill and white text', () => {
        const computed = getComputedStyle(query('#ghost'));
        expect(computed.backgroundColor).toBe('rgba(0, 0, 0, 0)');
        expect(computed.color).toBe('rgb(255, 255, 255)');
      });

      it('rounds to 10px, uses the custom font and tabular numerals', () => {
        for (const id of ['#primary', '#secondary', '#ghost', '#danger']) {
          const computed = getComputedStyle(query(id));
          expect(computed.borderTopLeftRadius, id).toBe('10px');
          expect(computed.fontFamily, id).toMatch(/^"Fira Sans"/);
          expect(computed.fontVariantNumeric, id).toBe('tabular-nums');
        }
      });

      it('draws the 3px yellow outline on keyboard focus only', async () => {
        const button = query('#primary');
        await keyboardFocus(button);
        const computed = getComputedStyle(button);
        expect(computed.outlineColor).toBe(FOCUS_YELLOW);
        expect(computed.outlineWidth).toBe('3px');
        expect(computed.outlineOffset).toBe('3px');
      });

      it('shows no outline when the button is clicked with the pointer', async () => {
        const button = query('#primary');
        await userEvent.click(button);
        expect(document.activeElement).toBe(button);
        expect(getComputedStyle(button).outlineStyle).toBe('none');
      });

      it('is 60px high at size xl', () => {
        expect(query('#extra-large').getBoundingClientRect().height).toBe(60);
      });
    });

    describe('field', () => {
      it('paints the box with the surface fill and the resting border', () => {
        const box = getComputedStyle(query('.ck-field__box'));
        expect(box.backgroundColor).toBe(FIELD_FILL);
        expect(box.borderTopColor).toBe('rgb(47, 47, 51)');
        expect(box.borderTopLeftRadius).toBe('10px');
      });

      it('writes white text in the input and paints the notch of a floated label with the fill', () => {
        expect(getComputedStyle(query('ck-field input')).color).toBe('rgb(255, 255, 255)');
        const label = getComputedStyle(query('#floated-field label'));
        expect(label.backgroundImage).toContain(`${FIELD_FILL} 50%`);
        expect(label.color).toBe('rgb(185, 185, 190)');
      });

      it('keeps tabular numerals and the custom font on the field and its input', () => {
        const field = query('ck-field');
        expect(getComputedStyle(field).fontVariantNumeric).toBe('tabular-nums');
        expect(getComputedStyle(query('ck-field input')).fontVariantNumeric).toBe('tabular-nums');
        expect(getComputedStyle(field).fontFamily).toMatch(/^"Fira Sans"/);
      });

      it('turns the border into a yellow ring on keyboard focus', async () => {
        await keyboardFocus(query<HTMLInputElement>('#themed-name'));
        const box = getComputedStyle(query('.ck-field__box'));
        expect(box.borderTopColor).toBe(FOCUS_YELLOW);
        expect(box.boxShadow).toContain(FOCUS_YELLOW);
        expect(box.boxShadow).toContain('2px');
      });

      it('applies fill, radius, numerals and font to a standalone input', () => {
        const computed = getComputedStyle(query('#standalone'));
        expect(computed.backgroundColor).toBe(FIELD_FILL);
        expect(computed.borderTopLeftRadius).toBe('10px');
        expect(computed.fontVariantNumeric).toBe('tabular-nums');
        expect(computed.fontFamily).toMatch(/^"Fira Sans"/);
      });

      it('shows the 3px yellow outline on a standalone input after keyboard focus', async () => {
        const input = query('#standalone');
        await keyboardFocus(input);
        expect(getComputedStyle(input).outlineColor).toBe(FOCUS_YELLOW);
      });
    });
  });

  describe('scoped to a class of its own', () => {
    // The sample's selector, swapped for a plain class: no data-ck-theme anywhere.
    const scoped = CUSTOM_THEME_CSS.replace(":root,\n[data-ck-theme='dark']", '.area');

    beforeEach(() => {
      expect(scoped).not.toBe(CUSTOM_THEME_CSS);
      setTestTheme('light');
      style = applyStyle(scoped);
    });

    it('draws the area ring on a button, not the page ring', async () => {
      const button = mountHost(null).querySelector<HTMLElement>('#primary')!;
      await keyboardFocus(button);
      const computed = getComputedStyle(button);
      expect(computed.outlineColor).toBe(FOCUS_YELLOW);
      expect(computed.outlineWidth).toBe('3px');
    });

    it('tints the hover overlay from the area text colour, not the page text colour', async () => {
      const ghost = mountHost(null).querySelector<HTMLElement>('#ghost')!;
      const probe = document.createElement('div');
      probe.style.background = 'color-mix(in oklch, #ffffff 6%, transparent)';
      document.body.appendChild(probe);
      const expected = getComputedStyle(probe).backgroundColor;
      await userEvent.hover(ghost);
      await settleAnimations();
      expect(getComputedStyle(ghost).backgroundColor).toBe(expected);
    });
  });
});
