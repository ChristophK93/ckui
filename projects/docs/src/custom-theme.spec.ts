import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CK_BADGE_IMPORTS } from '@ckui/core/badge';
import { CkButton } from '@ckui/core/button';
import { CK_CHECKBOX_IMPORTS } from '@ckui/core/checkbox';
import { CK_CHIP_IMPORTS } from '@ckui/core/chip';
import { CK_DIALOG_IMPORTS, CkDialog } from '@ckui/core/dialog';
import { CK_DRAWER_IMPORTS, CkDrawer } from '@ckui/core/drawer';
import { CK_FIELD_IMPORTS } from '@ckui/core/field';
import { CK_MENU_IMPORTS } from '@ckui/core/menu';
import { CkProgress } from '@ckui/core/progress';
import { CK_SEGMENTED_IMPORTS } from '@ckui/core/segmented';
import { CK_SELECT_IMPORTS } from '@ckui/core/select';
import { CkSlider } from '@ckui/core/slider';
import { CkStepper } from '@ckui/core/stepper';
import { CK_SWITCH_IMPORTS } from '@ckui/core/switch';
import { CK_TABS_IMPORTS } from '@ckui/core/tabs';
import { CkToast } from '@ckui/core/toast';
import { cdp, userEvent } from 'vitest/browser';
import { contrastRatio, resolveToken } from '../../core/testing/contrast';
import { CUSTOM_THEME_CSS } from './app/pages/theming/theming-samples';
import { resetTestTheme, setTestTheme, settleAnimations } from './app/testing/theme-env';

const FOCUS_YELLOW = 'rgb(255, 204, 0)';
const DANGER = 'rgb(255, 90, 78)';
const FIELD_FILL = 'rgb(22, 22, 24)';

@Component({
  imports: [
    CkButton,
    CK_FIELD_IMPORTS,
    CK_SEGMENTED_IMPORTS,
    CK_BADGE_IMPORTS,
    CkProgress,
    CkSlider,
    CkStepper,
    CK_SWITCH_IMPORTS,
    CK_CHECKBOX_IMPORTS,
    CK_CHIP_IMPORTS,
    CK_TABS_IMPORTS,
    CK_SELECT_IMPORTS,
    CK_MENU_IMPORTS,
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
      <ck-field id="stepper-field" [invalid]="true">
        <label>Power</label>
        <ck-stepper id="stepper-in-field" [value]="250" />
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
      <ck-slider
        id="slider"
        aria-label="Grade"
        unit="%"
        showValue
        [min]="-10"
        [max]="20"
        [value]="5"
      />
      <ck-stepper id="stepper" aria-label="FTP" unit="W" [min]="50" [max]="600" [value]="250" />
      <ck-switch id="switch-on" [value]="true">
        Auto-upload
        <ck-hint>Uploads every finished ride.</ck-hint>
      </ck-switch>
      <ck-switch id="switch-off">Audio cues</ck-switch>
      <ck-checkbox id="checkbox-on" [value]="true">
        Save as template
        <ck-hint>Shows up under "Mine".</ck-hint>
      </ck-checkbox>
      <ck-checkbox id="checkbox-off">Audio cues</ck-checkbox>
      <ck-checkbox id="checkbox-mixed" [indeterminate]="true">All rides</ck-checkbox>
      <ck-checkbox-group id="checkbox-group" aria-label="Zones">
        <ck-checkbox option="endurance">Endurance</ck-checkbox>
        <ck-checkbox option="vo2">VO2max</ck-checkbox>
      </ck-checkbox-group>
      <ck-chip-group id="chips" aria-label="Category">
        <button ckChip id="chip-off">Threshold</button>
        <button ckChip id="chip-on" [selected]="true">Endurance</button>
      </ck-chip-group>
      <ck-select id="select" aria-label="Target" placeholder="Pick one" value="watt">
        <ck-option value="ftp">% FTP</ck-option>
        <ck-option value="watt">Watts</ck-option>
        <ck-option value="level" disabled>Level</ck-option>
      </ck-select>
      <ck-select id="select-empty" aria-label="Empty target" placeholder="Pick one">
        <ck-option value="ftp">% FTP</ck-option>
      </ck-select>
      <ck-field id="select-field">
        <label>Kind</label>
        <ck-select id="select-in-field" value="ftp">
          <ck-option value="ftp">% FTP</ck-option>
        </ck-select>
      </ck-field>
      <button id="menu-trigger" type="button" ckButton [ckMenuTrigger]="actions">Actions</button>
      <ng-template #actions>
        <ck-menu>
          <button ckMenuItem id="menu-start">Start</button>
          <button ckMenuItem id="menu-copy" disabled>Copy</button>
          <ck-menu-divider />
          <button ckMenuItem id="menu-delete" tone="danger">Delete</button>
        </ck-menu>
      </ng-template>
      <ck-tabs id="tabs" value="mine">
        <ck-tab-list aria-label="Source">
          <ck-tab id="tab-off" value="predefined">Predefined</ck-tab>
          <ck-tab id="tab-on" value="mine">Mine</ck-tab>
        </ck-tab-list>
      </ck-tabs>
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

@Component({
  imports: [CK_DRAWER_IMPORTS],
  template: `
    <h2 ckDialogTitle>Devices</h2>
    <p ckDialogDescription>Bike and treadmill.</p>
    <ck-dialog-actions>
      <button type="button" ckDialogClose ckDialogInitialFocus>Done</button>
    </ck-dialog-actions>
  `,
})
class ThemedDrawerContent {}

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
  for (let step = 0; step < 30 && document.activeElement !== element; step++) {
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

    describe('switch', () => {
      const track = (id: string) => getComputedStyle(query(`#${id} .ck-switch__track`));
      const thumb = (id: string) => getComputedStyle(query(`#${id} .ck-switch__thumb`));

      it('paints the off track with the control colour and the on track with the white primary', () => {
        expect(track('switch-off').backgroundColor).toBe('rgb(36, 36, 39)');
        expect(track('switch-on').backgroundColor).toBe('rgb(255, 255, 255)');
      });

      it('keeps the off border transparent, hides the on border in the fill and rounds fully', () => {
        expect(track('switch-off').borderTopColor).toBe('rgba(0, 0, 0, 0)');
        expect(track('switch-on').borderTopColor).toBe('rgb(255, 255, 255)');
        for (const id of ['switch-off', 'switch-on']) {
          expect(track(id).borderTopLeftRadius).toBe('9999px');
        }
      });

      it('keeps the on track 3:1 from the off track, and each thumb 3:1 from its own track', () => {
        expect(
          contrastRatio(track('switch-on').backgroundColor, track('switch-off').backgroundColor),
        ).toBeGreaterThanOrEqual(3);
        expect(
          contrastRatio(thumb('switch-off').backgroundColor, track('switch-off').backgroundColor),
        ).toBeGreaterThanOrEqual(3);
        expect(
          contrastRatio(thumb('switch-on').backgroundColor, track('switch-on').backgroundColor),
        ).toBeGreaterThanOrEqual(3);
      });

      it('shows the state with the thumb position as well as the colour', () => {
        const offTrack = query('#switch-off .ck-switch__track').getBoundingClientRect();
        const offThumb = query('#switch-off .ck-switch__thumb').getBoundingClientRect();
        const onTrack = query('#switch-on .ck-switch__track').getBoundingClientRect();
        const onThumb = query('#switch-on .ck-switch__thumb').getBoundingClientRect();
        expect(offThumb.left - offTrack.left).toBeLessThan(offTrack.right - offThumb.right);
        expect(onThumb.left - onTrack.left).toBeGreaterThan(onTrack.right - onThumb.right);
      });

      it('writes the label white, the hint muted at 4.5:1, in the custom font', () => {
        const label = getComputedStyle(query('#switch-on .ck-switch'));
        const hint = getComputedStyle(query('#switch-on ck-hint'));
        expect(label.color).toBe('rgb(255, 255, 255)');
        expect(label.fontFamily).toMatch(/^"Fira Sans"/);
        expect(hint.color).toBe('rgb(185, 185, 190)');
        expect(contrastRatio(hint.color, 'rgb(11, 11, 12)')).toBeGreaterThanOrEqual(4.5);
      });

      it('draws the 3px yellow ring around the track on keyboard focus', async () => {
        await keyboardFocus(query<HTMLInputElement>('#switch-off .ck-switch__input'));
        const ring = track('switch-off');
        expect(ring.outlineColor).toBe(FOCUS_YELLOW);
        expect(ring.outlineWidth).toBe('3px');
        expect(ring.outlineOffset).toBe('3px');
      });

      it('is 60px high at size xl', () => {
        query('#switch-off .ck-switch').classList.replace('ck-switch--md', 'ck-switch--xl');
        expect(
          query('#switch-off .ck-switch').getBoundingClientRect().height,
        ).toBeGreaterThanOrEqual(60);
      });

      it('restyles with its own tokens, over the theme', async () => {
        const element = query('#switch-on');
        element.style.setProperty('--ck-switch-track-on', 'rgb(1, 2, 3)');
        element.style.setProperty('--ck-switch-thumb-on', 'rgb(4, 5, 6)');
        await settleAnimations();
        expect(track('switch-on').backgroundColor).toBe('rgb(1, 2, 3)');
        expect(thumb('switch-on').backgroundColor).toBe('rgb(4, 5, 6)');
      });
    });

    describe('checkbox', () => {
      const box = (id: string) => getComputedStyle(query(`#${id} .ck-checkbox__box`));
      const mark = (id: string, kind: string) =>
        getComputedStyle(query(`#${id} .ck-checkbox__mark--${kind} svg`));
      const SURFACE = 'rgb(11, 11, 12)';

      it('paints the unchecked box with the control colour and the checked and mixed box with the white primary', () => {
        expect(box('checkbox-off').backgroundColor).toBe('rgb(36, 36, 39)');
        expect(box('checkbox-on').backgroundColor).toBe('rgb(255, 255, 255)');
        expect(box('checkbox-mixed').backgroundColor).toBe('rgb(255, 255, 255)');
        expect(box('checkbox-on').borderTopColor).toBe('rgb(255, 255, 255)');
      });

      it('keeps the unchecked border 3:1 from the page, because the sample line colour is too quiet for it', () => {
        expect(box('checkbox-off').borderTopColor).toBe('rgb(138, 138, 146)');
        expect(contrastRatio(box('checkbox-off').borderTopColor, SURFACE)).toBeGreaterThanOrEqual(
          3,
        );
      });

      it('keeps the checked fill 3:1 from the unchecked fill and border, and the mark 3:1 from the fill', () => {
        const fill = box('checkbox-on').backgroundColor;
        expect(contrastRatio(fill, box('checkbox-off').backgroundColor)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(fill, box('checkbox-off').borderTopColor)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(fill, SURFACE)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(box('checkbox-on').color, fill)).toBeGreaterThanOrEqual(3);
        expect(mark('checkbox-on', 'check').stroke).toBe('rgb(11, 11, 12)');
        expect(mark('checkbox-mixed', 'minus').stroke).toBe('rgb(11, 11, 12)');
      });

      it('shows the state with a tick or a dash as well as the colour', () => {
        const display = (id: string, kind: string) =>
          getComputedStyle(query(`#${id} .ck-checkbox__mark--${kind}`)).display;
        expect([display('checkbox-on', 'check'), display('checkbox-on', 'minus')]).toEqual([
          'block',
          'none',
        ]);
        expect([display('checkbox-mixed', 'check'), display('checkbox-mixed', 'minus')]).toEqual([
          'none',
          'block',
        ]);
        expect([display('checkbox-off', 'check'), display('checkbox-off', 'minus')]).toEqual([
          'none',
          'none',
        ]);
      });

      it('uses the sample radius, 18px boxes and a 2px border', () => {
        expect(box('checkbox-off').borderTopLeftRadius).toBe('4px');
        expect(box('checkbox-off').borderTopWidth).toBe('2px');
        expect(query('#checkbox-off .ck-checkbox__box').getBoundingClientRect().width).toBe(18);
      });

      it('writes the label white, the hint muted at 4.5:1, in the custom font', () => {
        const label = getComputedStyle(query('#checkbox-on .ck-checkbox'));
        const hint = getComputedStyle(query('#checkbox-on ck-hint'));
        expect(label.color).toBe('rgb(255, 255, 255)');
        expect(label.fontFamily).toMatch(/^"Fira Sans"/);
        expect(hint.color).toBe('rgb(185, 185, 190)');
        expect(contrastRatio(hint.color, SURFACE)).toBeGreaterThanOrEqual(4.5);
      });

      it('draws the 3px yellow ring around the box on keyboard focus', async () => {
        await keyboardFocus(query<HTMLInputElement>('#checkbox-off .ck-checkbox__input'));
        const ring = box('checkbox-off');
        expect(ring.outlineColor).toBe(FOCUS_YELLOW);
        expect(ring.outlineWidth).toBe('3px');
        expect(ring.outlineOffset).toBe('3px');
      });

      it('is 60px high at size xl', () => {
        query('#checkbox-off .ck-checkbox').classList.replace('ck-checkbox--md', 'ck-checkbox--xl');
        expect(
          query('#checkbox-off .ck-checkbox').getBoundingClientRect().height,
        ).toBeGreaterThanOrEqual(60);
      });

      it('restyles with its own tokens, over the theme', async () => {
        const element = query('#checkbox-on');
        element.style.setProperty('--ck-checkbox-checked-bg', 'rgb(1, 2, 3)');
        element.style.setProperty('--ck-checkbox-checked-fg', 'rgb(4, 5, 6)');
        element.style.setProperty('--ck-checkbox-radius', '9px');
        await settleAnimations();
        expect(box('checkbox-on').backgroundColor).toBe('rgb(1, 2, 3)');
        expect(box('checkbox-on').color).toBe('rgb(4, 5, 6)');
        expect(box('checkbox-on').borderTopLeftRadius).toBe('9px');
      });
    });

    describe('tabs', () => {
      const tab = (id: string) => getComputedStyle(query(`#${id}`));
      const underline = (id: string) => getComputedStyle(query(`#${id}`), '::after');
      const ring = (id: string) => getComputedStyle(query(`#${id}`), '::before');
      const areaBackground = () => getComputedStyle(query('.area')).backgroundColor;

      it('uses the custom font and tabular numerals', () => {
        expect(tab('tab-on').fontFamily).toMatch(/^"Fira Sans"/);
        expect(tab('tab-on').fontVariantNumeric).toBe('tabular-nums');
        expect(getComputedStyle(query('#tabs ck-tab-list')).fontVariantNumeric).toBe(
          'tabular-nums',
        );
      });

      it('colours the selected text white and the others with the muted text colour', () => {
        expect(tab('tab-on').color).toBe('rgb(255, 255, 255)');
        expect(tab('tab-off').color).toBe('rgb(185, 185, 190)');
      });

      it('draws the underline in the white primary, 3:1 from the page, and the line under the row', () => {
        expect(underline('tab-on').backgroundColor).toBe('rgb(255, 255, 255)');
        expect(underline('tab-on').scale).toBe('1');
        expect(underline('tab-off').scale).not.toBe('1');
        expect(
          contrastRatio(underline('tab-on').backgroundColor, areaBackground()),
        ).toBeGreaterThanOrEqual(3);
        expect(getComputedStyle(query('#tabs ck-tab-list')).borderBottomColor).toBe(
          'rgb(47, 47, 51)',
        );
      });

      it('keeps both texts at 4.5:1 on the page', () => {
        expect(contrastRatio(tab('tab-on').color, areaBackground())).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(tab('tab-off').color, areaBackground())).toBeGreaterThanOrEqual(4.5);
      });

      it('takes a yellow wayfinding underline of its own at 4px, 3:1 from the page', () => {
        const element = query('#tabs');
        element.style.setProperty('--ck-tabs-indicator', FOCUS_YELLOW);
        element.style.setProperty('--ck-tabs-indicator-thickness', '4px');
        expect(underline('tab-on').backgroundColor).toBe(FOCUS_YELLOW);
        expect(parseFloat(underline('tab-on').blockSize)).toBe(4);
        expect(
          contrastRatio(underline('tab-on').backgroundColor, areaBackground()),
        ).toBeGreaterThanOrEqual(3);
      });

      it('is 60px high at size xl and draws the 3px yellow ring inside the tab on keyboard focus only', async () => {
        query('#tabs').classList.replace('ck-tabs--md', 'ck-tabs--xl');
        expect(query('#tab-on').getBoundingClientRect().height).toBe(60);
        const element = query<HTMLElement>('#tab-on');
        await userEvent.click(element);
        expect(ring('tab-on').outlineStyle).toBe('none');
        await keyboardFocus(element);
        expect(ring('tab-on').outlineColor).toBe(FOCUS_YELLOW);
        expect(ring('tab-on').outlineWidth).toBe('3px');
        expect(ring('tab-on').outlineOffset).toBe('-3px');
      });
    });

    describe('chip', () => {
      const chip = (id: string) => getComputedStyle(query(`#${id}`));

      it('fills the unselected chip with the control colour, without a visible border', () => {
        expect(chip('chip-off').backgroundColor).toBe('rgb(36, 36, 39)');
        expect(chip('chip-off').borderTopColor).toBe('rgba(0, 0, 0, 0)');
        expect(chip('chip-off').color).toBe('rgb(255, 255, 255)');
      });

      it('fills the selected chip white with near-black text and its check', () => {
        expect(chip('chip-on').backgroundColor).toBe('rgb(255, 255, 255)');
        expect(chip('chip-on').color).toBe('rgb(11, 11, 12)');
        expect(chip('chip-on').borderTopColor).toBe('rgb(255, 255, 255)');
        expect(query('#chip-on .ck-chip__check')).not.toBeNull();
        expect(query('#chip-off .ck-chip__check')).toBeNull();
      });

      it('keeps the selected chip 3:1 from the unselected one and each text at 4.5:1', () => {
        expect(
          contrastRatio(chip('chip-on').backgroundColor, chip('chip-off').backgroundColor),
        ).toBeGreaterThanOrEqual(3);
        expect(
          contrastRatio(chip('chip-on').color, chip('chip-on').backgroundColor),
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(chip('chip-off').color, chip('chip-off').backgroundColor),
        ).toBeGreaterThanOrEqual(4.5);
      });

      it('uses the custom font, tabular numerals and the full radius', () => {
        expect(chip('chip-off').fontFamily).toMatch(/^"Fira Sans"/);
        expect(chip('chip-off').fontVariantNumeric).toBe('tabular-nums');
        expect(chip('chip-off').borderTopLeftRadius).toBe('9999px');
      });

      it('is 60px high at size xl', () => {
        query('#chip-off').classList.replace('ck-chip--sm', 'ck-chip--xl');
        expect(query('#chip-off').getBoundingClientRect().height).toBeGreaterThanOrEqual(60);
      });

      it('draws the 3px yellow ring on keyboard focus', async () => {
        const sentinel = document.createElement('button');
        query('#chips').before(sentinel);
        sentinel.focus();
        await userEvent.tab();
        expect(document.activeElement).toBe(query('#chip-off'));
        await settleAnimations();
        expect(chip('chip-off').outlineColor).toBe(FOCUS_YELLOW);
        expect(chip('chip-off').outlineWidth).toBe('3px');
        expect(chip('chip-off').outlineOffset).toBe('3px');
      });

      it('restyles with its own tokens, over the theme', async () => {
        const group = query('#chips');
        group.style.setProperty('--ck-chip-selected-bg', 'rgb(1, 2, 3)');
        group.style.setProperty('--ck-chip-bg', 'rgb(4, 5, 6)');
        group.style.setProperty('--ck-chip-group-gap', '20px');
        await settleAnimations();
        expect(chip('chip-on').backgroundColor).toBe('rgb(1, 2, 3)');
        expect(chip('chip-off').backgroundColor).toBe('rgb(4, 5, 6)');
        expect(
          query('#chip-on').getBoundingClientRect().left -
            query('#chip-off').getBoundingClientRect().right,
        ).toBe(20);
      });
    });

    describe('slider', () => {
      const rail = () => getComputedStyle(query('#slider .ck-slider__rail'));
      const fill = () => getComputedStyle(query('#slider .ck-slider__fill'));
      const thumb = () => getComputedStyle(query('#slider .ck-slider__thumb'));

      it('paints the rail with the control colour, the fill white and the thumb white', () => {
        expect(rail().backgroundColor).toBe('rgb(36, 36, 39)');
        expect(fill().backgroundColor).toBe('rgb(255, 255, 255)');
        expect(thumb().backgroundColor).toBe('rgb(255, 255, 255)');
      });

      it('keeps the transparent rail border and rounds the rail fully', () => {
        expect(rail().borderTopColor).toBe('rgba(0, 0, 0, 0)');
        expect(rail().borderTopLeftRadius).toBe('9999px');
        expect(thumb().borderTopLeftRadius).toBe('9999px');
      });

      it('keeps the fill and the thumb 3:1 from the rail, and the ring 3:1 from the thumb and the fill', () => {
        expect(
          contrastRatio(fill().backgroundColor, rail().backgroundColor),
        ).toBeGreaterThanOrEqual(3);
        expect(
          contrastRatio(thumb().backgroundColor, rail().backgroundColor),
        ).toBeGreaterThanOrEqual(3);
        // The thumb and the fill are both white here, so the ring is what sets them apart.
        expect(thumb().borderTopColor).toBe('rgb(11, 11, 12)');
        expect(thumb().borderTopWidth).toBe('2px');
        expect(
          contrastRatio(thumb().borderTopColor, thumb().backgroundColor),
        ).toBeGreaterThanOrEqual(3);
        expect(
          contrastRatio(thumb().borderTopColor, fill().backgroundColor),
        ).toBeGreaterThanOrEqual(3);
      });

      it('writes the shown value white and bold in the custom font, at 4.5:1 on the page', () => {
        const value = getComputedStyle(query('#slider .ck-slider__value'));
        expect(value.color).toBe('rgb(255, 255, 255)');
        expect(value.fontWeight).toBe('700');
        expect(value.fontFamily).toMatch(/^"Fira Sans"/);
        expect(value.fontVariantNumeric).toBe('tabular-nums');
        expect(
          contrastRatio(value.color, resolveToken(query('.area'), '--ck-color-bg')),
        ).toBeGreaterThanOrEqual(4.5);
      });

      it('is 60px high with a 1.75rem thumb at size xl', () => {
        query('#slider').classList.replace('ck-slider--md', 'ck-slider--xl');
        expect(query('#slider').getBoundingClientRect().height).toBe(60);
        expect(query('#slider .ck-slider__thumb').getBoundingClientRect().width).toBe(28);
      });

      it('draws the 3px yellow ring around the thumb on keyboard focus', async () => {
        const element = query('#slider .ck-slider__thumb');
        expect(thumb().outlineStyle).toBe('none');
        await keyboardFocus(element);
        expect(thumb().outlineColor).toBe(FOCUS_YELLOW);
        expect(thumb().outlineWidth).toBe('3px');
        expect(thumb().outlineOffset).toBe('3px');
        expect(
          contrastRatio(thumb().outlineColor, resolveToken(query('.area'), '--ck-color-bg')),
        ).toBeGreaterThanOrEqual(3);
      });

      it('restyles with its own tokens, over the theme', () => {
        const element = query('#slider');
        element.style.setProperty('--ck-slider-track', 'rgb(1, 2, 3)');
        element.style.setProperty('--ck-slider-fill', 'rgb(4, 5, 6)');
        element.style.setProperty('--ck-slider-thumb-bg', 'rgb(7, 8, 9)');
        element.style.setProperty('--ck-slider-thumb-border', 'rgb(10, 11, 12)');
        element.style.setProperty('--ck-slider-thickness', '14px');
        expect(rail().backgroundColor).toBe('rgb(1, 2, 3)');
        expect(fill().backgroundColor).toBe('rgb(4, 5, 6)');
        expect(thumb().backgroundColor).toBe('rgb(7, 8, 9)');
        expect(thumb().borderTopColor).toBe('rgb(10, 11, 12)');
        expect(rail().height).toBe('14px');
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

      it('inside a field draws no ring of its own: the field box takes the yellow ring and the danger border', async () => {
        const field = query<HTMLInputElement>('#stepper-in-field .ck-stepper__input');
        const inner = getComputedStyle(query('#stepper-in-field'));
        const box = () => getComputedStyle(query('#stepper-field .ck-field__box'));
        expect(inner.backgroundColor).toBe('rgba(0, 0, 0, 0)');
        expect(inner.boxShadow).toBe('none');
        expect(box().borderTopColor).toBe(DANGER);
        await keyboardFocus(field);
        expect(getComputedStyle(query('#stepper-in-field')).outlineStyle).toBe('none');
        expect(box().boxShadow).toContain('2px');
        expect(box().boxShadow).toContain(DANGER);
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

    describe('drawer', () => {
      async function openDrawer(mode: 'side' | 'sheet' = 'side'): Promise<HTMLElement> {
        TestBed.inject(CkDrawer).open(ThemedDrawerContent, { mode });
        const appRef = TestBed.inject(ApplicationRef);
        await appRef.whenStable();
        appRef.tick();
        await appRef.whenStable();
        await settleAnimations();
        return document.querySelector<HTMLElement>('.ck-drawer-panel')!;
      }

      it('fills the panel with the raised colour, white text and the sample shadow, square on the edge', async () => {
        const style = getComputedStyle(await openDrawer());
        expect(style.backgroundColor).toBe('rgb(22, 22, 24)');
        expect(style.color).toBe('rgb(255, 255, 255)');
        expect(style.boxShadow).toContain('rgba(0, 0, 0, 0.65)');
        expect(style.borderTopLeftRadius).toBe('0px');
        expect(style.colorScheme).toBe('dark');
      });

      it('uses the custom font, keeps the text 4.5:1 on the panel and dims the page with the backdrop token', async () => {
        const panel = await openDrawer();
        const surface = getComputedStyle(panel).backgroundColor;
        expect(getComputedStyle(panel).fontFamily).toMatch(/^"Fira Sans"/);
        for (const selector of ['h2', '.ck-dialog__description']) {
          expect(
            contrastRatio(getComputedStyle(panel.querySelector(selector)!).color, surface),
          ).toBeGreaterThanOrEqual(4.5);
        }
        expect(
          getComputedStyle(document.querySelector('.ck-overlay-backdrop')!).backgroundColor,
        ).toBe('rgba(0, 0, 0, 0.7)');
      });

      it('shows the 3px yellow ring on the close button after keyboard focus, 3:1 on the panel', async () => {
        const panel = await openDrawer();
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

      it('restyles side panel and sheet with the drawer tokens, and ignores the dialog ones', async () => {
        const root = document.documentElement.style;
        root.setProperty('--ck-drawer-bg', 'rgb(10, 20, 30)');
        root.setProperty('--ck-drawer-padding', '10px');
        root.setProperty('--ck-dialog-bg', 'rgb(200, 0, 0)');
        try {
          for (const mode of ['side', 'sheet'] as const) {
            const panel = await openDrawer(mode);
            expect(getComputedStyle(panel).backgroundColor, mode).toBe('rgb(10, 20, 30)');
            expect(getComputedStyle(panel.querySelector('.ck-dialog')!).paddingLeft, mode).toBe(
              '10px',
            );
            TestBed.inject(CkDrawer).closeAll();
            await settleAnimations();
          }
        } finally {
          root.removeProperty('--ck-drawer-bg');
          root.removeProperty('--ck-drawer-padding');
          root.removeProperty('--ck-dialog-bg');
        }
      });
    });

    describe('select', () => {
      const trigger = () => getComputedStyle(query('#select .ck-select__trigger'));
      const area = () => query('.area');

      async function openSelect(selector = '#select'): Promise<HTMLElement> {
        const button = query<HTMLButtonElement>(`${selector} .ck-select__trigger`);
        button.focus();
        button.click();
        const appRef = TestBed.inject(ApplicationRef);
        await appRef.whenStable();
        appRef.tick();
        await appRef.whenStable();
        await settleAnimations();
        return document.querySelector<HTMLElement>('.ck-select-popup')!;
      }

      afterEach(() => {
        document.documentElement.removeAttribute('style');
      });

      it('keeps the border of a standalone select 3:1 from the page, because the sample sets it', () => {
        expect(trigger().borderTopColor).toBe('rgb(138, 138, 146)');
        expect(trigger().borderTopWidth).toBe('1px');
        for (const surface of ['bg', 'surface']) {
          expect(
            contrastRatio(trigger().borderTopColor, resolveToken(area(), `--ck-color-${surface}`)),
          ).toBeGreaterThanOrEqual(3);
        }
      });

      it('fills it with the control colour, rounds it to 10px and writes the value in the custom font', () => {
        expect(trigger().backgroundColor).toBe('rgb(36, 36, 39)');
        expect(trigger().borderTopLeftRadius).toBe('10px');
        expect(trigger().fontFamily).toMatch(/^"Fira Sans"/);
        expect(trigger().fontVariantNumeric).toBe('tabular-nums');
        expect(trigger().color).toBe('rgb(255, 255, 255)');
        expect(contrastRatio(trigger().color, trigger().backgroundColor)).toBeGreaterThanOrEqual(
          4.5,
        );
      });

      it('keeps the placeholder 4.5:1 on the fill', () => {
        const placeholder = getComputedStyle(query('#select-empty .ck-select__placeholder'));
        expect(placeholder.color).toBe('rgb(185, 185, 190)');
        expect(
          contrastRatio(
            placeholder.color,
            getComputedStyle(query('#select-empty .ck-select__trigger')).backgroundColor,
          ),
        ).toBeGreaterThanOrEqual(4.5);
      });

      it('draws the 3px yellow ring around a standalone select on keyboard focus, 3:1 from the page', async () => {
        const element = query('#select .ck-select__trigger');
        expect(trigger().outlineStyle).toBe('none');
        await keyboardFocus(element);
        expect(trigger().outlineColor).toBe(FOCUS_YELLOW);
        expect(trigger().outlineWidth).toBe('3px');
        expect(trigger().outlineOffset).toBe('3px');
        expect(
          contrastRatio(trigger().outlineColor, resolveToken(area(), '--ck-color-bg')),
        ).toBeGreaterThanOrEqual(3);
      });

      it('draws no border or fill of its own in a field, whose box turns into the yellow ring', async () => {
        const inner = getComputedStyle(query('#select-in-field .ck-select__trigger'));
        expect(inner.borderTopWidth).toBe('0px');
        expect(inner.backgroundColor).toBe('rgba(0, 0, 0, 0)');
        const box = getComputedStyle(query('#select-field .ck-field__box'));
        expect(box.backgroundColor).toBe('rgb(22, 22, 24)');
        expect(box.borderTopLeftRadius).toBe('10px');
        await keyboardFocus(query('#select-in-field .ck-select__trigger'));
        expect(getComputedStyle(query('#select-field .ck-field__box')).borderTopColor).toBe(
          FOCUS_YELLOW,
        );
        expect(getComputedStyle(query('#select-in-field .ck-select__trigger')).outlineStyle).toBe(
          'none',
        );
      });

      it('is 60px high at size xl', () => {
        query('#select').classList.replace('ck-select--md', 'ck-select--xl');
        expect(query('#select .ck-select__trigger').getBoundingClientRect().height).toBe(60);
      });

      it('fills the list with the raised colour, white text, the sample shadow, 10px corners and the custom font', async () => {
        const popup = getComputedStyle(await openSelect());
        expect(popup.backgroundColor).toBe('rgb(22, 22, 24)');
        expect(popup.color).toBe('rgb(255, 255, 255)');
        expect(popup.boxShadow).toContain('rgba(0, 0, 0, 0.6)');
        expect(popup.borderTopLeftRadius).toBe('10px');
        expect(popup.fontFamily).toMatch(/^"Fira Sans"/);
        expect(contrastRatio(popup.color, popup.backgroundColor)).toBeGreaterThanOrEqual(4.5);
      });

      it('shows the selected option with a check, white text 4.5:1 on its fill and the check 3:1 from the unselected rows', async () => {
        const popup = await openSelect();
        const rows = Array.from(popup.querySelectorAll<HTMLElement>('ck-option'));
        const selected = getComputedStyle(rows[1]);
        const unselected = getComputedStyle(rows[0]);
        const check = getComputedStyle(rows[1].querySelector('.ck-option__check')!);
        expect(selected.backgroundColor).toBe('rgb(36, 36, 39)');
        expect(selected.color).toBe('rgb(255, 255, 255)');
        expect(selected.fontWeight).toBe('600');
        expect(contrastRatio(selected.color, selected.backgroundColor)).toBeGreaterThanOrEqual(4.5);
        // The sample's selected fill is close to the list: the check mark is what must stand out.
        expect(contrastRatio(check.color, selected.backgroundColor)).toBeGreaterThanOrEqual(3);
        expect(
          contrastRatio(check.color, getComputedStyle(popup).backgroundColor),
        ).toBeGreaterThanOrEqual(3);
        expect(rows[0].querySelector('.ck-option__check')).toBeNull();
        expect(unselected.fontWeight).not.toBe('600');
      });

      it('marks the highlighted option with a yellow bar 3:1 from the list and keeps its text 4.5:1', async () => {
        const popup = await openSelect();
        query<HTMLButtonElement>('#select .ck-select__trigger').dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
        );
        const appRef = TestBed.inject(ApplicationRef);
        await appRef.whenStable();
        appRef.tick();
        const active = popup.querySelector<HTMLElement>('ck-option.ck-option--active')!;
        expect(active.textContent!.trim()).toBe('% FTP');
        const bar = getComputedStyle(active, '::before');
        expect(bar.backgroundColor).toBe(FOCUS_YELLOW);
        const surface = getComputedStyle(popup).backgroundColor;
        expect(contrastRatio(bar.backgroundColor, surface)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(getComputedStyle(active).color, surface)).toBeGreaterThanOrEqual(4.5);
      });

      it('greys out a disabled option, which is the intentionally quiet text of the theme', async () => {
        await openSelect();
        const disabled = getComputedStyle(
          document.querySelectorAll<HTMLElement>('.ck-select-listbox ck-option')[2],
        );
        expect(disabled.color).toBe('rgb(110, 110, 117)');
        expect(disabled.cursor).toBe('not-allowed');
      });

      it('restyles the trigger and the list with its own tokens, over the theme', async () => {
        const element = query('#select');
        element.style.setProperty('--ck-select-bg', 'rgb(1, 2, 3)');
        element.style.setProperty('--ck-select-border-color', 'rgb(4, 5, 6)');
        element.style.setProperty('--ck-select-radius', '3px');
        expect(trigger().backgroundColor).toBe('rgb(1, 2, 3)');
        expect(trigger().borderTopColor).toBe('rgb(4, 5, 6)');
        expect(trigger().borderTopLeftRadius).toBe('3px');
        const root = document.documentElement.style;
        root.setProperty('--ck-listbox-bg', 'rgb(10, 20, 30)');
        root.setProperty('--ck-listbox-radius', '2px');
        root.setProperty('--ck-listbox-max-height', '5rem');
        root.setProperty('--ck-option-bg-selected', 'rgb(40, 50, 60)');
        root.setProperty('--ck-option-fg-selected', 'rgb(70, 80, 90)');
        const popup = await openSelect();
        expect(getComputedStyle(popup).backgroundColor).toBe('rgb(10, 20, 30)');
        expect(getComputedStyle(popup).borderTopLeftRadius).toBe('2px');
        expect(getComputedStyle(popup.querySelector('.ck-select-listbox')!).maxHeight).toBe('80px');
        const selected = getComputedStyle(popup.querySelectorAll('ck-option')[1]);
        expect(selected.backgroundColor).toBe('rgb(40, 50, 60)');
        expect(selected.color).toBe('rgb(70, 80, 90)');
      });
    });

    describe('menu', () => {
      const inMenu = (selector: string) => document.querySelector<HTMLElement>(selector)!;

      async function openMenu(): Promise<HTMLElement> {
        await keyboardFocus(query('#menu-trigger'));
        await userEvent.keyboard('{Enter}');
        const appRef = TestBed.inject(ApplicationRef);
        await appRef.whenStable();
        appRef.tick();
        await appRef.whenStable();
        await settleAnimations();
        return document.querySelector<HTMLElement>('.ck-menu-panel')!;
      }

      afterEach(async () => {
        await userEvent.keyboard('{Escape}');
        document.documentElement.removeAttribute('style');
      });

      it('fills the popover with the raised colour, white text, the sample shadow, 10px corners and the custom font', async () => {
        const popover = getComputedStyle(await openMenu());
        expect(popover.backgroundColor).toBe('rgb(22, 22, 24)');
        expect(popover.color).toBe('rgb(255, 255, 255)');
        expect(popover.boxShadow).toContain('rgba(0, 0, 0, 0.6)');
        expect(popover.borderTopLeftRadius).toBe('10px');
        expect(popover.fontFamily).toMatch(/^"Fira Sans"/);
        expect(contrastRatio(popover.color, popover.backgroundColor)).toBeGreaterThanOrEqual(4.5);
      });

      it('draws danger text 4.5:1 on the menu and the item the user can read as dimmed', async () => {
        const popover = await openMenu();
        const surface = getComputedStyle(popover).backgroundColor;
        const danger = getComputedStyle(inMenu('#menu-delete'));
        expect(danger.color).toBe('rgb(255, 106, 95)');
        expect(contrastRatio(danger.color, surface)).toBeGreaterThanOrEqual(4.5);
        const disabled = getComputedStyle(inMenu('#menu-copy'));
        expect(disabled.color).toBe('rgb(110, 110, 117)');
        expect(disabled.cursor).toBe('not-allowed');
        expect(inMenu('#menu-copy').getAttribute('aria-disabled')).toBe('true');
      });

      it('marks the focused item with a yellow bar 3:1 from the menu and keeps its text 4.5:1', async () => {
        const popover = await openMenu();
        const surface = getComputedStyle(popover).backgroundColor;
        const focused = inMenu('#menu-start');
        expect(document.activeElement).toBe(focused);
        const bar = getComputedStyle(focused, '::before');
        expect(bar.backgroundColor).toBe(FOCUS_YELLOW);
        expect(contrastRatio(bar.backgroundColor, surface)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(getComputedStyle(focused).color, surface)).toBeGreaterThanOrEqual(4.5);
        expect(getComputedStyle(focused).backgroundImage).toContain('linear-gradient');
        await userEvent.keyboard('{ArrowDown}');
        expect(document.activeElement).toBe(inMenu('#menu-copy'));
        expect(getComputedStyle(inMenu('#menu-start'), '::before').content).toBe('none');
      });

      it('draws the divider in the subtle border colour of the theme', async () => {
        await openMenu();
        const divider = getComputedStyle(inMenu('ck-menu-divider'));
        expect(divider.borderTopWidth).toBe('1px');
        expect(divider.borderTopColor).toBe('rgb(47, 47, 51)');
      });

      it('restyles the menu with its own tokens, over the theme', async () => {
        const root = document.documentElement.style;
        root.setProperty('--ck-menu-bg', 'rgb(10, 20, 30)');
        root.setProperty('--ck-menu-radius', '2px');
        root.setProperty('--ck-menu-min-width', '320px');
        root.setProperty('--ck-menu-item-fg-danger', 'rgb(70, 80, 90)');
        root.setProperty('--ck-menu-item-bg-active', 'rgb(40, 50, 60)');
        const popover = await openMenu();
        expect(getComputedStyle(popover).backgroundColor).toBe('rgb(10, 20, 30)');
        expect(getComputedStyle(popover).borderTopLeftRadius).toBe('2px');
        expect(popover.getBoundingClientRect().width).toBeGreaterThanOrEqual(320);
        expect(getComputedStyle(inMenu('#menu-delete')).color).toBe('rgb(70, 80, 90)');
        expect(getComputedStyle(inMenu('#menu-start')).backgroundImage).toContain(
          'rgb(40, 50, 60)',
        );
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
