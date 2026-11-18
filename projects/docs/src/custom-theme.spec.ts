import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CK_BADGE_IMPORTS } from '@ckui/core/badge';
import { CkButton } from '@ckui/core/button';
import { CK_DIALOG_IMPORTS, CkDialog } from '@ckui/core/dialog';
import { CK_FIELD_IMPORTS } from '@ckui/core/field';
import { CkProgress } from '@ckui/core/progress';
import { CK_SEGMENTED_IMPORTS } from '@ckui/core/segmented';
import { CkStepper } from '@ckui/core/stepper';
import { CkToast } from '@ckui/core/toast';
import { cdp, userEvent } from 'vitest/browser';
import { contrastRatio, resolveToken } from '../../core/testing/contrast';
import { CUSTOM_THEME_CSS } from './app/pages/theming/theming-samples';
import { resetTestTheme, setTestTheme, settleAnimations } from './app/testing/theme-env';

const FOCUS_YELLOW = 'rgb(255, 204, 0)';
const FIELD_FILL = 'rgb(22, 22, 24)';

@Component({
  imports: [
    CkButton,
    CK_FIELD_IMPORTS,
    CK_SEGMENTED_IMPORTS,
    CK_BADGE_IMPORTS,
    CkProgress,
    CkStepper,
  ],
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
      <ck-segmented id="segmented" aria-label="View" value="week">
        <ck-segment value="day">Day</ck-segment>
        <ck-segment value="week">Week</ck-segment>
        <ck-segment value="month">Month</ck-segment>
      </ck-segmented>
      <ck-badge id="badge-neutral" dot>Kuipers S3</ck-badge>
      <ck-badge id="badge-success" tone="success" dot>Connected</ck-badge>
      <ck-badge id="badge-warning" tone="warning">Low battery</ck-badge>
      <ck-badge id="badge-danger" tone="danger" dot>Upload failed</ck-badge>
      <ck-progress id="progress" aria-label="Workout" [value]="40" />
      <ck-stepper id="stepper" aria-label="FTP" unit="W" [min]="50" [max]="600" [value]="250" />
    </div>
  `,
})
class ThemedHost {
  theme: string | null = null;
}

@Component({
  imports: [CK_DIALOG_IMPORTS],
  template: `
    <h2 ckDialogTitle>Delete the workout?</h2>
    <p ckDialogDescription>It cannot be undone.</p>
    <ck-dialog-actions>
      <button type="button" ckDialogClose ckDialogInitialFocus>Keep</button>
    </ck-dialog-actions>
  `,
})
class ThemedDialogContent {}

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
      check(['primary-fg'], ['surface-raised'], 4.5);
      check(['success', 'warning-fg'], ['surface-raised'], 3);
      check(['focus-ring'], ['surface-raised'], 3);
      check(['success-fg', 'warning-fg'], ['control'], 4.5);
      check(['primary'], ['control'], 3);
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

    describe('segmented control', () => {
      const ringOf = (segment: HTMLElement) => getComputedStyle(segment, '::after');

      it('fills the track with the control colour, rounds it to 10px and keeps its transparent border', () => {
        const track = getComputedStyle(query('#segmented'));
        expect(track.backgroundColor).toBe('rgb(36, 36, 39)');
        expect(track.borderTopLeftRadius).toBe('10px');
        expect(track.boxShadow).toContain('rgba(0, 0, 0, 0)');
      });

      it('fills the indicator with the white primary and rounds it to 6px', () => {
        const indicator = getComputedStyle(query('#segmented .ck-segmented__indicator'));
        expect(indicator.backgroundColor).toBe('rgb(255, 255, 255)');
        expect(indicator.borderTopLeftRadius).toBe('6px');
      });

      it('keeps the selected segment 3:1 from the track and its text at 4.5:1', () => {
        const track = getComputedStyle(query('#segmented')).backgroundColor;
        const indicator = getComputedStyle(query('#segmented .ck-segmented__indicator'));
        const [day, week] = Array.from(root.querySelectorAll<HTMLElement>('#segmented ck-segment'));
        expect(contrastRatio(indicator.backgroundColor, track)).toBeGreaterThanOrEqual(3);
        expect(
          contrastRatio(getComputedStyle(week).color, indicator.backgroundColor),
        ).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(getComputedStyle(day).color, track)).toBeGreaterThanOrEqual(4.5);
      });

      it('uses the custom font and tabular numerals', () => {
        const segment = getComputedStyle(query('#segmented ck-segment'));
        expect(segment.fontFamily).toMatch(/^"Fira Sans"/);
        expect(segment.fontVariantNumeric).toBe('tabular-nums');
        expect(getComputedStyle(query('#segmented')).fontVariantNumeric).toBe('tabular-nums');
      });

      it('is 60px high next to the 60px button at size xl', () => {
        query('#segmented').classList.replace('ck-segmented--md', 'ck-segmented--xl');
        expect(query('#segmented').getBoundingClientRect().height).toBe(60);
      });

      it('draws the 3px yellow ring inside the segment on keyboard focus only', async () => {
        const segment = query<HTMLElement>('#segmented ck-segment[aria-checked="true"]');
        await userEvent.click(segment);
        expect(ringOf(segment).outlineStyle).toBe('none');
        await keyboardFocus(segment);
        expect(ringOf(segment).outlineColor).toBe(FOCUS_YELLOW);
        expect(ringOf(segment).outlineWidth).toBe('3px');
        expect(ringOf(segment).outlineOffset).toBe('-3px');
      });
    });

    describe('badge', () => {
      const badge = (tone: string) => getComputedStyle(query(`#badge-${tone}`));

      it('fills the calm tones with the control colour and colours their text with the theme', () => {
        expect(badge('neutral').backgroundColor).toBe('rgb(36, 36, 39)');
        expect(badge('neutral').color).toBe('rgb(255, 255, 255)');
        expect(badge('success').backgroundColor).toBe('rgb(36, 36, 39)');
        expect(badge('success').color).toBe('rgb(61, 220, 132)');
        expect(badge('warning').backgroundColor).toBe('rgb(36, 36, 39)');
        expect(badge('warning').color).toBe('rgb(245, 197, 66)');
      });

      it('fills the danger badge with #FF5A4E and puts near-black text on it', () => {
        expect(badge('danger').backgroundColor).toBe('rgb(255, 90, 78)');
        expect(badge('danger').color).toBe('rgb(11, 11, 12)');
        expect(getComputedStyle(query('#badge-danger .ck-badge__dot')).backgroundColor).toBe(
          'rgb(11, 11, 12)',
        );
      });

      it('keeps the text of every tone at 4.5:1 on its fill', () => {
        for (const tone of ['neutral', 'success', 'warning', 'danger']) {
          expect(
            contrastRatio(badge(tone).color, badge(tone).backgroundColor),
            tone,
          ).toBeGreaterThanOrEqual(4.5);
        }
      });

      it('keeps a success dot, set with --ck-badge-dot, 3:1 from the control fill', () => {
        const element = query('#badge-neutral');
        element.style.setProperty('--ck-badge-dot', 'var(--ck-color-success)');
        const dot = getComputedStyle(query('#badge-neutral .ck-badge__dot'));
        expect(dot.backgroundColor).toBe('rgb(61, 220, 132)');
        expect(
          contrastRatio(dot.backgroundColor, getComputedStyle(element).backgroundColor),
        ).toBeGreaterThanOrEqual(3);
      });

      it('is a full pill in the custom font with tabular numerals', () => {
        expect(badge('neutral').borderTopLeftRadius).toBe('9999px');
        expect(badge('neutral').fontFamily).toMatch(/^"Fira Sans"/);
        expect(badge('neutral').fontVariantNumeric).toBe('tabular-nums');
        expect(query('#badge-neutral').getBoundingClientRect().height).toBe(24);
      });

      it('restyles with its own tokens, over the theme', () => {
        const element = query('#badge-success');
        element.style.setProperty('--ck-badge-bg', 'rgb(1, 2, 3)');
        element.style.setProperty('--ck-badge-fg', 'rgb(250, 250, 250)');
        element.style.setProperty('--ck-badge-radius', '4px');
        expect(getComputedStyle(element).backgroundColor).toBe('rgb(1, 2, 3)');
        expect(getComputedStyle(element).color).toBe('rgb(250, 250, 250)');
        expect(getComputedStyle(element).borderTopLeftRadius).toBe('4px');
      });
    });

    describe('progress', () => {
      const track = () => getComputedStyle(query('#progress'));
      const fill = () => getComputedStyle(query('#progress .ck-progress__fill'));

      it('fills the track with the control colour and the bar with the white primary', () => {
        expect(track().backgroundColor).toBe('rgb(36, 36, 39)');
        expect(fill().backgroundColor).toBe('rgb(255, 255, 255)');
      });

      it('keeps the fill 3:1 from the track', () => {
        expect(
          contrastRatio(fill().backgroundColor, track().backgroundColor),
        ).toBeGreaterThanOrEqual(3);
      });

      it('is a 4px bar with a full radius, and covers 40% of the track', () => {
        const bar = query('#progress').getBoundingClientRect();
        expect(bar.height).toBe(4);
        expect(track().borderTopLeftRadius).toBe('9999px');
        const fillRect = query('#progress .ck-progress__fill').getBoundingClientRect();
        expect(fillRect.width / bar.width).toBeCloseTo(0.4, 2);
      });

      it('restyles with its own tokens, over the theme', () => {
        const element = query('#progress');
        element.style.setProperty('--ck-progress-track', 'rgb(1, 2, 3)');
        element.style.setProperty('--ck-progress-fill', 'rgb(4, 5, 6)');
        element.style.setProperty('--ck-progress-thickness', '8px');
        expect(track().backgroundColor).toBe('rgb(1, 2, 3)');
        expect(fill().backgroundColor).toBe('rgb(4, 5, 6)');
        expect(element.getBoundingClientRect().height).toBe(8);
      });
    });

    describe('stepper', () => {
      const host = () => getComputedStyle(query('#stepper'));
      const input = () => getComputedStyle(query('#stepper .ck-stepper__input'));

      it('fills the control with the control colour, rounds it to 10px and keeps its transparent border', () => {
        expect(host().backgroundColor).toBe('rgb(36, 36, 39)');
        expect(host().borderTopLeftRadius).toBe('10px');
        expect(host().boxShadow).toContain('rgba(0, 0, 0, 0)');
      });

      it('writes the value white and bold, with the unit muted, all at 4.5:1 on the fill', () => {
        expect(input().color).toBe('rgb(255, 255, 255)');
        expect(input().fontWeight).toBe('700');
        const unit = getComputedStyle(query('#stepper .ck-stepper__unit'));
        expect(contrastRatio(input().color, host().backgroundColor)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(unit.color, host().backgroundColor)).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(
            getComputedStyle(query('#stepper .ck-stepper__button')).color,
            host().backgroundColor,
          ),
        ).toBeGreaterThanOrEqual(4.5);
      });

      it('uses the custom font and tabular numerals on the control and the value', () => {
        expect(host().fontFamily).toMatch(/^"Fira Sans"/);
        expect(input().fontFamily).toMatch(/^"Fira Sans"/);
        expect(host().fontVariantNumeric).toBe('tabular-nums');
        expect(input().fontVariantNumeric).toBe('tabular-nums');
      });

      it('rounds only the outer corners of the buttons to 10px', () => {
        const minus = getComputedStyle(query('#stepper .ck-stepper__button--decrement'));
        const plus = getComputedStyle(query('#stepper .ck-stepper__button--increment'));
        expect([minus.borderTopLeftRadius, minus.borderTopRightRadius]).toEqual(['10px', '0px']);
        expect([plus.borderTopLeftRadius, plus.borderTopRightRadius]).toEqual(['0px', '10px']);
      });

      it('is 60px high with 60px square buttons at size xl', () => {
        query('#stepper').classList.replace('ck-stepper--md', 'ck-stepper--xl');
        expect(query('#stepper').getBoundingClientRect().height).toBe(60);
        expect(query('#stepper .ck-stepper__button').getBoundingClientRect().width).toBe(60);
      });

      it('draws the 3px yellow ring around the control while the value has focus', async () => {
        const field = query<HTMLInputElement>('#stepper .ck-stepper__input');
        expect(host().outlineStyle).toBe('none');
        await keyboardFocus(field);
        expect(host().outlineColor).toBe(FOCUS_YELLOW);
        expect(host().outlineWidth).toBe('3px');
        expect(host().outlineOffset).toBe('3px');
        expect(
          contrastRatio(host().outlineColor, resolveToken(query('.area'), '--ck-color-bg')),
        ).toBeGreaterThanOrEqual(3);
      });

      it('restyles with its own tokens, over the theme', () => {
        const element = query('#stepper');
        element.style.setProperty('--ck-stepper-bg', 'rgb(1, 2, 3)');
        element.style.setProperty('--ck-stepper-radius', '4px');
        expect(host().backgroundColor).toBe('rgb(1, 2, 3)');
        expect(host().borderTopLeftRadius).toBe('4px');
      });
    });

    describe('toast', () => {
      const toastOf = (tone: string): HTMLElement =>
        document.querySelector<HTMLElement>(`ck-toast-item.ck-toast--${tone}`)!;
      const show = (options: Parameters<CkToast['show']>[0]): void => {
        TestBed.inject(CkToast).show({ duration: null, ...options });
        TestBed.inject(ApplicationRef).tick();
      };

      /** Tabs from a sentinel placed just before the toast host, as a keyboard user reaches it. */
      async function focusFromSentinel(target: HTMLElement): Promise<void> {
        const sentinel = document.createElement('button');
        sentinel.textContent = 'Sentinel';
        document.body.insertBefore(sentinel, document.querySelector('section.ck-toast-host'));
        sentinel.focus();
        for (let step = 0; step < 4 && document.activeElement !== target; step++) {
          await userEvent.tab();
        }
        expect(document.activeElement).toBe(target);
        await settleAnimations();
      }

      it('fills the neutral toast with the panel colour and its text white, on the panel border', () => {
        show({ message: 'Saved' });
        const style = getComputedStyle(toastOf('neutral'));
        expect(style.backgroundColor).toBe('rgb(22, 22, 24)');
        expect(style.color).toBe('rgb(255, 255, 255)');
        expect(style.borderTopColor).toBe('rgb(47, 47, 51)');
        expect(style.boxShadow).toContain('rgba(0, 0, 0, 0.65)');
        expect(style.borderTopLeftRadius).toBe('12px');
      });

      it('fills the danger toast with #FF5A4E and near-black text, and keeps its buttons readable', async () => {
        show({
          tone: 'danger',
          message: 'Broke',
          action: { label: 'Retry', run: () => undefined },
        });
        const toast = toastOf('danger');
        const style = getComputedStyle(toast);
        expect(style.backgroundColor).toBe('rgb(255, 90, 78)');
        expect(style.color).toBe('rgb(11, 11, 12)');
        const action = toast.querySelector<HTMLElement>('.ck-toast__action')!;
        const dismiss = toast.querySelector<HTMLElement>('.ck-toast__dismiss')!;
        for (const control of [action, dismiss]) {
          expect(getComputedStyle(control).color).toBe('rgb(11, 11, 12)');
          expect(
            contrastRatio(getComputedStyle(control).color, style.backgroundColor),
          ).toBeGreaterThanOrEqual(4.5);
        }
        expect(getComputedStyle(action).borderTopColor).toBe('rgb(11, 11, 12)');
        await userEvent.hover(action);
        await settleAnimations();
        const hovered = getComputedStyle(action);
        expect(hovered.backgroundColor).toBe('rgb(255, 118, 108)');
        expect(contrastRatio(hovered.color, hovered.backgroundColor)).toBeGreaterThanOrEqual(4.5);
      });

      it('restyles the calm toasts with --ck-toast-bg and -fg but leaves the danger toast on its own tokens', () => {
        show({ message: 'Calm' });
        show({ tone: 'danger', message: 'Broke' });
        const root = document.documentElement.style;
        root.setProperty('--ck-toast-bg', 'rgb(10, 20, 30)');
        root.setProperty('--ck-toast-fg', 'rgb(240, 240, 240)');
        try {
          expect(getComputedStyle(toastOf('neutral')).backgroundColor).toBe('rgb(10, 20, 30)');
          expect(getComputedStyle(toastOf('danger')).backgroundColor).toBe('rgb(255, 90, 78)');
          expect(getComputedStyle(toastOf('danger')).color).toBe('rgb(11, 11, 12)');
          root.setProperty('--ck-toast-danger-bg', 'rgb(200, 40, 40)');
          root.setProperty('--ck-toast-danger-fg', 'rgb(255, 255, 255)');
          expect(getComputedStyle(toastOf('danger')).backgroundColor).toBe('rgb(200, 40, 40)');
          expect(getComputedStyle(toastOf('danger')).color).toBe('rgb(255, 255, 255)');
        } finally {
          for (const token of [
            '--ck-toast-bg',
            '--ck-toast-fg',
            '--ck-toast-danger-bg',
            '--ck-toast-danger-fg',
          ]) {
            root.removeProperty(token);
          }
        }
      });

      it('draws the tone icons in the sample colours, 3:1 against the card', () => {
        show({ tone: 'success', message: 'Done' });
        show({ tone: 'warning', message: 'Careful' });
        for (const [tone, colour] of [
          ['success', 'rgb(61, 220, 132)'],
          ['warning', 'rgb(245, 197, 66)'],
        ] as const) {
          const icon = getComputedStyle(toastOf(tone).querySelector('.ck-toast__icon')!);
          expect(icon.color).toBe(colour);
          expect(
            contrastRatio(icon.color, getComputedStyle(toastOf(tone)).backgroundColor),
          ).toBeGreaterThanOrEqual(3);
        }
      });

      it('uses the custom font and tabular numerals', () => {
        show({ message: 'Saved' });
        const style = getComputedStyle(toastOf('neutral'));
        expect(style.fontFamily).toMatch(/^"Fira Sans"/);
        expect(style.fontVariantNumeric).toBe('tabular-nums');
      });

      it('shows the 3px yellow ring on the action of a calm toast after keyboard focus', async () => {
        show({ message: 'Archived', action: { label: 'Undo', run: () => undefined } });
        const action = toastOf('neutral').querySelector<HTMLElement>('.ck-toast__action')!;
        await focusFromSentinel(action);
        expect(getComputedStyle(action).outlineColor).toBe(FOCUS_YELLOW);
        expect(getComputedStyle(action).outlineWidth).toBe('3px');
      });
    });

    describe('dialog', () => {
      async function openDialog(): Promise<HTMLElement> {
        TestBed.inject(CkDialog).open(ThemedDialogContent, { mode: 'modal' });
        const appRef = TestBed.inject(ApplicationRef);
        await appRef.whenStable();
        appRef.tick();
        await appRef.whenStable();
        await settleAnimations();
        return document.querySelector<HTMLElement>('.ck-dialog-panel')!;
      }

      it('fills the panel with the raised colour, white text, the sample shadow and the library radius', async () => {
        const style = getComputedStyle(await openDialog());
        expect(style.backgroundColor).toBe('rgb(22, 22, 24)');
        expect(style.color).toBe('rgb(255, 255, 255)');
        expect(style.boxShadow).toContain('rgba(0, 0, 0, 0.65)');
        expect(style.borderTopLeftRadius).toBe('16px');
        expect(style.colorScheme).toBe('dark');
      });

      it('uses the custom font, keeps the description 4.5:1 on the panel and dims the page with the backdrop token', async () => {
        const panel = await openDialog();
        const surface = getComputedStyle(panel).backgroundColor;
        expect(getComputedStyle(panel).fontFamily).toMatch(/^"Fira Sans"/);
        const description = getComputedStyle(panel.querySelector('.ck-dialog__description')!);
        expect(contrastRatio(description.color, surface)).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(getComputedStyle(panel.querySelector('h2')!).color, surface),
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          getComputedStyle(document.querySelector('.ck-overlay-backdrop')!).backgroundColor,
        ).toBe('rgba(0, 0, 0, 0.7)');
      });

      it('shows the 3px yellow ring on the close button after keyboard focus, 3:1 on the panel', async () => {
        const panel = await openDialog();
        const close = panel.querySelector<HTMLElement>('.ck-dialog__close')!;
        for (let step = 0; step < 4 && document.activeElement !== close; step++) {
          await userEvent.tab();
        }
        expect(document.activeElement).toBe(close);
        await settleAnimations();
        const ring = getComputedStyle(close);
        expect(ring.outlineColor).toBe(FOCUS_YELLOW);
        expect(ring.outlineWidth).toBe('3px');
        expect(
          contrastRatio(ring.outlineColor, getComputedStyle(panel).backgroundColor),
        ).toBeGreaterThanOrEqual(3);
      });

      it('restyles the panel with --ck-dialog-bg and --ck-dialog-radius', async () => {
        const root = document.documentElement.style;
        root.setProperty('--ck-dialog-bg', 'rgb(10, 20, 30)');
        root.setProperty('--ck-dialog-radius', '4px');
        try {
          const style = getComputedStyle(await openDialog());
          expect(style.backgroundColor).toBe('rgb(10, 20, 30)');
          expect(style.borderTopLeftRadius).toBe('4px');
        } finally {
          root.removeProperty('--ck-dialog-bg');
          root.removeProperty('--ck-dialog-radius');
        }
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
