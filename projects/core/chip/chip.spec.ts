import { ApplicationRef, Component, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import { contrastRatio } from '../testing/contrast';
import { CK_CHIP_IMPORTS, CkChipSize } from './index';

const SHARED_TOKENS: Record<string, string> = {
  '--ck-space-1': '4px',
  '--ck-space-2': '8px',
  '--ck-radius-full': '9999px',
  '--ck-control-height-sm': '32px',
  '--ck-control-height-md': '40px',
  '--ck-control-height-lg': '48px',
  '--ck-control-height-xl': '60px',
  '--ck-control-padding-inline-sm': '8px',
  '--ck-control-padding-inline-md': '12px',
  '--ck-control-padding-inline-lg': '16px',
  '--ck-control-padding-inline-xl': '20px',
  '--ck-control-font-size-sm': '14px',
  '--ck-control-font-size-md': '16px',
  '--ck-control-font-size-lg': '18px',
  '--ck-control-font-size-xl': '20px',
  '--ck-font-weight-medium': '500',
  '--ck-font-variant-numeric': 'tabular-nums',
  '--ck-line-height-tight': '1.25',
  '--ck-duration-fast': '150ms',
  '--ck-ease-standard': 'ease',
  '--ck-focus-ring-offset': '2px',
};

const LIGHT_TOKENS: Record<string, string> = {
  '--ck-color-scheme': 'light',
  '--ck-color-bg': 'rgb(255, 255, 255)',
  '--ck-color-control': 'rgb(240, 240, 244)',
  '--ck-color-control-border': 'rgb(110, 110, 120)',
  '--ck-color-fg': 'rgb(20, 20, 30)',
  '--ck-color-fg-disabled': 'rgb(120, 120, 130)',
  '--ck-color-primary': 'rgb(60, 60, 200)',
  '--ck-color-on-primary': 'rgb(255, 255, 255)',
  '--ck-color-surface-hover': 'rgba(20, 20, 30, 0.06)',
  '--ck-color-surface-active': 'rgba(20, 20, 30, 0.1)',
  '--ck-focus-ring': '2px solid rgb(0, 0, 255)',
};

const DARK_TOKENS: Record<string, string> = {
  '--ck-color-scheme': 'dark',
  '--ck-color-bg': 'rgb(20, 20, 24)',
  '--ck-color-control': 'rgb(36, 36, 39)',
  '--ck-color-control-border': 'rgb(150, 150, 165)',
  '--ck-color-fg': 'rgb(245, 245, 250)',
  '--ck-color-fg-disabled': 'rgb(135, 135, 150)',
  '--ck-color-primary': 'rgb(255, 255, 255)',
  '--ck-color-on-primary': 'rgb(11, 11, 12)',
  '--ck-color-surface-hover': 'rgba(245, 245, 250, 0.06)',
  '--ck-color-surface-active': 'rgba(245, 245, 250, 0.1)',
  '--ck-focus-ring': '2px solid rgb(120, 160, 255)',
};

const ICON = '<svg ckChipIcon viewBox="0 0 16 16"><path d="M0 0h16v16H0z" /></svg>';

@Component({
  imports: [CK_CHIP_IMPORTS],
  template: `<button ckChip>Unused</button>`,
})
class ChipHost {
  readonly selected = signal(false);
  readonly disabled = signal(false);
  readonly size = signal<CkChipSize>('sm');
  readonly tab = signal(5);
  readonly type = signal('submit');
  readonly label = signal<string | null>('Dynamic');
  readonly describedBy = signal<string | null>('note');
  readonly attrDisabled = signal<string | null>('');
  readonly emitted: boolean[] = [];
  readonly submits = signal(0);
}

function mount(
  template: string,
  tokens: Record<string, string> = LIGHT_TOKENS,
): { fixture: ComponentFixture<ChipHost>; host: ChipHost; root: HTMLElement } {
  TestBed.overrideComponent(ChipHost, { set: { template } });
  const fixture = TestBed.createComponent(ChipHost);
  const root = fixture.nativeElement as HTMLElement;
  for (const [name, value] of Object.entries({ ...SHARED_TOKENS, ...tokens })) {
    root.style.setProperty(name, value);
  }
  document.body.appendChild(root);
  fixture.detectChanges();
  return { fixture, host: fixture.componentInstance, root };
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
  TestBed.inject(ApplicationRef).tick();
  const root = fixture.nativeElement as HTMLElement;
  await Promise.all(root.getAnimations({ subtree: true }).map((animation) => animation.finished));
}

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

async function emulate(features: { name: string; value: string }[]): Promise<void> {
  await (cdp() as unknown as Session).send('Emulation.setEmulatedMedia', { features });
}

const chipOf = (root: HTMLElement, selector = 'button'): HTMLButtonElement =>
  root.querySelector<HTMLButtonElement>(selector)!;

const CHIP = (attributes = '', content = 'Endurance') =>
  `<button ckChip ${attributes} [(selected)]="selected" (selectedChange)="emitted.push($event)">${content}</button>`;

describe('CkChip', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
    document.body.removeAttribute('dir');
    TestBed.resetTestingModule();
    await emulate([]);
    await page.viewport(800, 600);
  });

  describe('structure', () => {
    it('is a native button with aria-pressed, type button, the sm size and a label element', () => {
      const { root } = mount(CHIP());
      const chip = chipOf(root);
      expect(chip.tagName).toBe('BUTTON');
      expect(chip.getAttribute('type')).toBe('button');
      expect(chip.getAttribute('aria-pressed')).toBe('false');
      expect(chip.classList.contains('ck-chip')).toBe(true);
      expect(chip.classList.contains('ck-chip--sm')).toBe(true);
      expect(chip.querySelector('.ck-chip__label')!.textContent).toBe('Endurance');
      expect(chip.querySelector('.ck-chip__check')).toBeNull();
    });

    it.each(['sm', 'md', 'lg', 'xl'] as const)('renders size %s with one size class', (size) => {
      const { root } = mount(CHIP(`size="${size}"`));
      const classes = Array.from(chipOf(root).classList).filter((name) =>
        /^ck-chip--(sm|md|lg|xl)$/.test(name),
      );
      expect(classes).toEqual([`ck-chip--${size}`]);
    });

    it('falls back to sm for an unknown size and follows a changing size', async () => {
      const { fixture, host, root } = mount(CHIP('[size]="size()"'));
      host.size.set('nope' as CkChipSize);
      await settle(fixture);
      expect(chipOf(root).classList.contains('ck-chip--sm')).toBe(true);
      host.size.set('xl');
      await settle(fixture);
      expect(chipOf(root).classList.contains('ck-chip--xl')).toBe(true);
      expect(chipOf(root).classList.contains('ck-chip--sm')).toBe(false);
    });

    it('keeps the classes the consumer put on the button', () => {
      const { root } = mount(CHIP('class="mine" [class.extra]="true"'));
      expect(chipOf(root).classList.contains('mine')).toBe(true);
      expect(chipOf(root).classList.contains('extra')).toBe(true);
      expect(chipOf(root).classList.contains('ck-chip--sm')).toBe(true);
    });

    it('shows the check before the label while selected, and drops it afterwards', async () => {
      const { fixture, host, root } = mount(CHIP());
      host.selected.set(true);
      await settle(fixture);
      const chip = chipOf(root);
      const check = chip.querySelector('.ck-chip__check')!;
      expect(chip.getAttribute('aria-pressed')).toBe('true');
      expect(chip.classList.contains('ck-chip--selected')).toBe(true);
      expect(check.getAttribute('aria-hidden')).toBe('true');
      expect(
        check.compareDocumentPosition(chip.querySelector('.ck-chip__label')!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      host.selected.set(false);
      await settle(fixture);
      expect(chip.querySelector('.ck-chip__check')).toBeNull();
      expect(chip.getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('icon', () => {
    it('marks the projected icon decorative and draws it before the label', () => {
      const { root } = mount(CHIP('', `${ICON}Endurance`));
      const icon = chipOf(root).querySelector('svg')!;
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(icon.classList.contains('ck-chip__icon')).toBe(true);
      expect(getComputedStyle(icon).display).not.toBe('none');
      expect(
        icon.compareDocumentPosition(chipOf(root).querySelector('.ck-chip__label')!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('hides the projected icon while selected, so the check replaces it', async () => {
      const { fixture, host, root } = mount(CHIP('', `${ICON}Endurance`));
      host.selected.set(true);
      await settle(fixture);
      expect(getComputedStyle(chipOf(root).querySelector('svg.ck-chip__icon')!).display).toBe(
        'none',
      );
      expect(chipOf(root).querySelectorAll('.ck-chip__check')).toHaveLength(1);
      host.selected.set(false);
      await settle(fixture);
      expect(getComputedStyle(chipOf(root).querySelector('svg.ck-chip__icon')!).display).not.toBe(
        'none',
      );
    });

    it('finds the icon wherever it sits in the content', () => {
      const { root } = mount(CHIP('', `Endurance ${ICON}`));
      const chip = chipOf(root);
      expect(
        chip.querySelector('svg')!.compareDocumentPosition(chip.querySelector('.ck-chip__label')!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  describe('toggling', () => {
    it('toggles on a click and writes the two-way binding', async () => {
      const { fixture, host, root } = mount(CHIP());
      chipOf(root).click();
      await settle(fixture);
      expect(host.selected()).toBe(true);
      expect(chipOf(root).getAttribute('aria-pressed')).toBe('true');
      chipOf(root).click();
      await settle(fixture);
      expect(host.selected()).toBe(false);
      expect(host.emitted).toEqual([true, false]);
    });

    it('toggles with Space and with Enter, once per key', async () => {
      const { fixture, host, root } = mount(CHIP());
      chipOf(root).focus();
      await userEvent.keyboard(' ');
      await settle(fixture);
      expect(host.selected()).toBe(true);
      await userEvent.keyboard('{Enter}');
      await settle(fixture);
      expect(host.selected()).toBe(false);
      expect(host.emitted).toEqual([true, false]);
    });

    it('never emits for a programmatic change', async () => {
      const { fixture, host } = mount(CHIP());
      host.selected.set(true);
      await settle(fixture);
      host.selected.set(false);
      await settle(fixture);
      host.selected.set(true);
      await settle(fixture);
      expect(host.emitted).toEqual([]);
    });

    it('never emits for a chip that starts selected', async () => {
      const { fixture, host, root } = mount(
        '<button ckChip [selected]="true" (selectedChange)="emitted.push($event)">Alone</button>',
      );
      await settle(fixture);
      expect(chipOf(root).getAttribute('aria-pressed')).toBe('true');
      expect(host.emitted).toEqual([]);
    });

    it('ends in the right state after rapid repeated clicks', async () => {
      const { fixture, host, root } = mount(CHIP());
      for (let count = 0; count < 7; count++) {
        chipOf(root).click();
      }
      await settle(fixture);
      expect(host.selected()).toBe(true);
      expect(host.emitted).toHaveLength(7);
    });

    it('takes a one-way selected without a binding back, and toggles inside', async () => {
      const { fixture, root } = mount('<button ckChip [selected]="true">Alone</button>');
      chipOf(root).click();
      await settle(fixture);
      expect(chipOf(root).getAttribute('aria-pressed')).toBe('false');
    });

    it('toggles independent chips on their own', async () => {
      const { fixture, host, root } = mount(
        `<button ckChip id="a" [(selected)]="selected">A</button><button ckChip id="b">B</button>`,
      );
      chipOf(root, '#b').click();
      await settle(fixture);
      expect(chipOf(root, '#b').getAttribute('aria-pressed')).toBe('true');
      expect(chipOf(root, '#a').getAttribute('aria-pressed')).toBe('false');
      expect(host.selected()).toBe(false);
    });

    it('does not submit a form from a chip with the default type', async () => {
      const { fixture, host, root } = mount(
        `<form (submit)="$event.preventDefault(); submits.set(submits() + 1)">${CHIP()}</form>`,
      );
      chipOf(root).click();
      await settle(fixture);
      expect(host.submits()).toBe(0);
    });
  });

  describe('native attributes', () => {
    it('keeps a static type and submits the form with it', async () => {
      const { fixture, host, root } = mount(
        `<form (submit)="$event.preventDefault(); submits.set(submits() + 1)">${CHIP('type="submit"')}</form>`,
      );
      expect(chipOf(root).getAttribute('type')).toBe('submit');
      chipOf(root).click();
      await settle(fixture);
      expect(host.submits()).toBe(1);
    });

    it('keeps a bound type through a state round-trip', async () => {
      const { fixture, host, root } = mount(CHIP('[type]="type()"'));
      expect(chipOf(root).getAttribute('type')).toBe('submit');
      chipOf(root).click();
      host.type.set('reset');
      await settle(fixture);
      expect(chipOf(root).getAttribute('type')).toBe('reset');
      chipOf(root).click();
      await settle(fixture);
      expect(chipOf(root).getAttribute('type')).toBe('reset');
    });

    it('keeps a static and a bound tabindex on first render and through toggling and disabling', async () => {
      const { fixture, host, root } = mount(
        `<button ckChip id="static" tabindex="-1" [disabled]="disabled()">S</button>
         <button ckChip id="bound" [tabindex]="tab()" [disabled]="disabled()">B</button>`,
      );
      expect(chipOf(root, '#static').getAttribute('tabindex')).toBe('-1');
      expect(chipOf(root, '#bound').getAttribute('tabindex')).toBe('5');
      host.disabled.set(true);
      await settle(fixture);
      host.disabled.set(false);
      host.tab.set(7);
      chipOf(root, '#bound').click();
      await settle(fixture);
      expect(chipOf(root, '#static').getAttribute('tabindex')).toBe('-1');
      expect(chipOf(root, '#bound').getAttribute('tabindex')).toBe('7');
    });

    it('keeps static and bound aria attributes, and writes only aria-pressed itself', async () => {
      const { fixture, host, root } = mount(
        `<button ckChip id="second" aria-label="Fixed" [attr.aria-controls]="describedBy()">y</button>`,
      );
      expect(chipOf(root, '#second').getAttribute('aria-label')).toBe('Fixed');
      expect(chipOf(root, '#second').getAttribute('aria-controls')).toBe('note');
      host.describedBy.set(null);
      chipOf(root, '#second').click();
      await settle(fixture);
      expect(chipOf(root, '#second').getAttribute('aria-label')).toBe('Fixed');
      expect(chipOf(root, '#second').hasAttribute('aria-controls')).toBe(false);
      expect(chipOf(root, '#second').getAttribute('aria-pressed')).toBe('true');
    });

    it("gives the consumer's own bound disabled attribute back when the input turns off", async () => {
      const { fixture, host, root } = mount(
        '<button ckChip [attr.disabled]="attrDisabled()" [disabled]="disabled()">x</button>',
      );
      expect(chipOf(root).disabled).toBe(true);
      host.disabled.set(true);
      await settle(fixture);
      expect(chipOf(root).disabled).toBe(true);
      host.disabled.set(false);
      await settle(fixture);
      expect(chipOf(root).disabled).toBe(true);
      host.attrDisabled.set(null);
      await settle(fixture);
      expect(chipOf(root).disabled).toBe(false);
    });

    it('writes and removes the native disabled attribute with the input', async () => {
      const { fixture, host, root } = mount(CHIP('[disabled]="disabled()"'));
      expect(chipOf(root).hasAttribute('disabled')).toBe(false);
      host.disabled.set(true);
      await settle(fixture);
      expect(chipOf(root).hasAttribute('disabled')).toBe(true);
      host.disabled.set(false);
      await settle(fixture);
      expect(chipOf(root).hasAttribute('disabled')).toBe(false);
      expect(chipOf(root).hasAttribute('data-ck-chip-disabled')).toBe(false);
    });

    it('treats a bare disabled attribute as disabled', () => {
      const { root } = mount('<button ckChip disabled>x</button>');
      expect(chipOf(root).disabled).toBe(true);
      expect(chipOf(root).classList.contains('ck-chip--disabled')).toBe(true);
    });
  });

  describe('disabled', () => {
    it('blocks click, keys and aux clicks, and skips the tab order', async () => {
      const { fixture, host, root } = mount(CHIP('[disabled]="disabled()"'));
      host.disabled.set(true);
      await settle(fixture);
      const chip = chipOf(root);
      const auxclicks = vi.fn();
      chip.addEventListener('auxclick', auxclicks);
      chip.focus();
      chip.click();
      await userEvent.keyboard(' ');
      await userEvent.keyboard('{Enter}');
      chip.dispatchEvent(
        new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }),
      );
      await userEvent.tab();
      expect(document.activeElement).not.toBe(chip);
      await settle(fixture);
      expect(auxclicks).not.toHaveBeenCalled();
      expect(host.selected()).toBe(false);
      expect(host.emitted).toEqual([]);
      expect(chip.classList.contains('ck-chip--disabled')).toBe(true);
    });

    it('blocks a click dispatched on a child element, and works again once enabled', async () => {
      const { fixture, host, root } = mount(CHIP('[disabled]="disabled()"'));
      host.disabled.set(true);
      await settle(fixture);
      chipOf(root)
        .querySelector('.ck-chip__label')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(host.selected()).toBe(false);
      host.disabled.set(false);
      await settle(fixture);
      chipOf(root).click();
      await settle(fixture);
      expect(host.selected()).toBe(true);
    });

    it('keeps a selected disabled chip showing its check', async () => {
      const { fixture, root } = mount('<button ckChip disabled [selected]="true">Cadence</button>');
      await settle(fixture);
      expect(chipOf(root).querySelector('.ck-chip__check')).not.toBeNull();
      expect(chipOf(root).getAttribute('aria-pressed')).toBe('true');
    });

    it('is blocked and styled inside a disabled fieldset', async () => {
      const { fixture, host, root } = mount(`<fieldset disabled>${CHIP()}</fieldset>`, {
        ...LIGHT_TOKENS,
        '--ck-color-surface-hover': 'rgb(1, 2, 3)',
      });
      const chip = chipOf(root);
      expect(chip.matches(':disabled')).toBe(true);
      expect(getComputedStyle(chip).backgroundColor).toBe('rgb(1, 2, 3)');
      expect(getComputedStyle(chip).cursor).toBe('not-allowed');
      chip.click();
      chip
        .querySelector('.ck-chip__label')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await settle(fixture);
      expect(host.selected()).toBe(false);
    });

    it('is styled like the disabled button: no border colour, disabled text, no hover overlay', () => {
      const { root } = mount(CHIP('disabled'));
      const style = getComputedStyle(chipOf(root));
      expect(style.borderTopColor).toBe('rgba(0, 0, 0, 0)');
      expect(style.color).toBe('rgb(120, 120, 130)');
      expect(style.backgroundImage).toBe('none');
    });

    it('takes a server-rendered disabled attribute over and gives it back correctly', async () => {
      const { fixture, host, root } = mount(
        '<button ckChip disabled="" data-ck-chip-disabled="" [disabled]="disabled()">x</button>',
      );
      host.disabled.set(true);
      await settle(fixture);
      expect(chipOf(root).disabled).toBe(true);
      host.disabled.set(false);
      await settle(fixture);
      expect(chipOf(root).hasAttribute('disabled')).toBe(false);
    });
  });

  describe('looks', () => {
    it('fills the chip with the control colour and borders it with the control border', () => {
      const { root } = mount(CHIP());
      const style = getComputedStyle(chipOf(root));
      expect(style.backgroundColor).toBe('rgb(240, 240, 244)');
      expect(style.borderTopColor).toBe('rgb(110, 110, 120)');
      expect(style.color).toBe('rgb(20, 20, 30)');
      expect(style.borderTopLeftRadius).toBe('9999px');
    });

    it('fills a selected chip with the primary colour and its on-primary text', async () => {
      const { fixture, host, root } = mount(CHIP());
      host.selected.set(true);
      await settle(fixture);
      const style = getComputedStyle(chipOf(root));
      expect(style.backgroundColor).toBe('rgb(60, 60, 200)');
      expect(style.color).toBe('rgb(255, 255, 255)');
      expect(style.borderTopColor).toBe('rgb(60, 60, 200)');
      expect(style.borderTopWidth).toBe('1px');
    });

    it('reads every component token with a fallback and never declares one', async () => {
      const { fixture, host, root } = mount(CHIP());
      const chip = chipOf(root);
      chip.style.setProperty('--ck-chip-bg', 'rgb(1, 2, 3)');
      chip.style.setProperty('--ck-chip-fg', 'rgb(4, 5, 6)');
      chip.style.setProperty('--ck-chip-border-color', 'rgb(7, 8, 9)');
      chip.style.setProperty('--ck-chip-radius', '3px');
      const style = getComputedStyle(chip);
      expect(style.backgroundColor).toBe('rgb(1, 2, 3)');
      expect(style.color).toBe('rgb(4, 5, 6)');
      expect(style.borderTopColor).toBe('rgb(7, 8, 9)');
      expect(style.borderTopLeftRadius).toBe('3px');
      expect(getComputedStyle(root).getPropertyValue('--ck-chip-bg')).toBe('');
      host.selected.set(true);
      chip.style.setProperty('--ck-chip-selected-bg', 'rgb(10, 20, 30)');
      chip.style.setProperty('--ck-chip-selected-fg', 'rgb(40, 50, 60)');
      await settle(fixture);
      expect(getComputedStyle(chip).backgroundColor).toBe('rgb(10, 20, 30)');
      expect(getComputedStyle(chip).color).toBe('rgb(40, 50, 60)');
      expect(getComputedStyle(chip).borderTopColor).toBe('rgb(10, 20, 30)');
    });

    it('shows the focus ring on keyboard focus', async () => {
      const { root } = mount(`<button id="before">Before</button>${CHIP()}`);
      root.querySelector<HTMLElement>('#before')!.focus();
      await userEvent.tab();
      expect(getComputedStyle(chipOf(root, '.ck-chip')).outlineStyle).toBe('solid');
    });

    it('draws the hover and active overlays over the fill without replacing it', async () => {
      const { root } = mount(CHIP());
      const chip = chipOf(root);
      expect(getComputedStyle(chip).backgroundImage).toBe('none');
      await userEvent.hover(chip);
      const hovered = getComputedStyle(chip);
      expect(hovered.backgroundColor).toBe('rgb(240, 240, 244)');
      expect(hovered.backgroundImage).toContain('rgba(20, 20, 30, 0.06)');
      const rect = chip.getBoundingClientRect();
      const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const session = cdp() as unknown as Session;
      await session.send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        ...point,
        button: 'left',
        clickCount: 1,
      });
      try {
        expect(chip.matches(':active')).toBe(true);
        expect(getComputedStyle(chip).backgroundImage).toContain('rgba(20, 20, 30, 0.1)');
        expect(getComputedStyle(chip).backgroundColor).toBe('rgb(240, 240, 244)');
      } finally {
        await session.send('Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          ...point,
          button: 'left',
          clickCount: 1,
        });
      }
    });

    it('reads aria-pressed false for a selected value that arrives undefined or null', async () => {
      const { fixture, host, root } = mount(CHIP());
      for (const value of [undefined, null]) {
        host.selected.set(value as unknown as boolean);
        await settle(fixture);
        expect(chipOf(root).getAttribute('aria-pressed')).toBe('false');
        expect(chipOf(root).classList.contains('ck-chip--selected')).toBe(false);
      }
      host.selected.set(true);
      await settle(fixture);
      expect(chipOf(root).getAttribute('aria-pressed')).toBe('true');
    });

    it('uses no transition under reduced motion', async () => {
      await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      const { root } = mount(CHIP());
      expect(getComputedStyle(chipOf(root)).transitionDuration).toBe('0s');
    });

    it('keeps the contrast of the selected fill from the unselected one at 3:1 and its text at 4.5:1', async () => {
      for (const tokens of [LIGHT_TOKENS, DARK_TOKENS]) {
        const { fixture, host, root } = mount(CHIP(), tokens);
        const off = getComputedStyle(chipOf(root));
        const unselected = off.backgroundColor;
        expect(contrastRatio(off.color, unselected)).toBeGreaterThanOrEqual(4.5);
        host.selected.set(true);
        await settle(fixture);
        const on = getComputedStyle(chipOf(root));
        expect(contrastRatio(on.backgroundColor, unselected)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(on.color, on.backgroundColor)).toBeGreaterThanOrEqual(4.5);
        document.body.replaceChildren();
        TestBed.resetTestingModule();
      }
    });

    it('paints every state in system colours in forced-colors mode, without overlays', async () => {
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      const { fixture, root } = mount(
        `<button id="sentinel">Before</button>
         <button ckChip id="off">Off</button>
         <button ckChip id="on" [selected]="true">On</button>
         <button ckChip id="disabled" disabled>Disabled</button>
         <button ckChip id="disabled-on" disabled [selected]="true">Both</button>
         <span id="probe-border" style="border: 1px solid ButtonText; color: ButtonText"></span>
         <span id="probe-gray" style="border: 1px solid GrayText; color: GrayText; background: Canvas"></span>
         <span id="probe-highlight" style="border: 1px solid Highlight; background: Highlight; color: HighlightText"></span>
         <span id="probe-text" style="color: CanvasText"></span>`,
      );
      await settle(fixture);
      const style = (selector: string) => getComputedStyle(chipOf(root, selector));
      const border = style('#probe-border');
      const gray = style('#probe-gray');
      const highlight = style('#probe-highlight');
      expect(style('#off').borderTopColor).toBe(border.borderTopColor);
      expect(style('#on').backgroundColor).toBe(highlight.backgroundColor);
      expect(style('#on').color).toBe(highlight.color);
      expect(style('#on').borderTopColor).toBe(highlight.borderTopColor);
      for (const id of ['#disabled', '#disabled-on']) {
        expect(style(id).borderTopColor, id).toBe(gray.borderTopColor);
        expect(style(id).color, id).toBe(gray.color);
        expect(style(id).backgroundColor, id).toBe(gray.backgroundColor);
        expect(style(id).backgroundImage, id).toBe('none');
      }
      expect(chipOf(root, '#disabled-on').querySelector('.ck-chip__check')).not.toBeNull();
      expect(chipOf(root, '#on').querySelector('.ck-chip__check')).not.toBeNull();

      chipOf(root, '#sentinel').focus();
      await userEvent.tab();
      expect(document.activeElement).toBe(chipOf(root, '#off'));
      expect(style('#off').outlineStyle).toBe('solid');
      expect(style('#off').outlineColor).not.toBe('rgb(0, 0, 255)');
      await userEvent.tab();
      expect(document.activeElement).toBe(chipOf(root, '#on'));
      expect(style('#on').outlineStyle).toBe('solid');
      expect(style('#on').outlineColor).toBe(style('#probe-text').color);
      expect(style('#on').outlineOffset).toBe('2px');

      await userEvent.hover(chipOf(root, '#on'));
      expect(style('#on').backgroundImage).toBe('none');
    });
  });

  describe('layout', () => {
    const coarse = { '--ck-control-height-sm': '44px', '--ck-control-height-md': '44px' };

    it.each([
      ['sm', 32],
      ['md', 40],
      ['lg', 48],
      ['xl', 60],
    ] as const)('is at least the control height tall at size %s', (size, height) => {
      const { root } = mount(CHIP(`size="${size}"`));
      expect(chipOf(root).getBoundingClientRect().height).toBeGreaterThanOrEqual(height);
    });

    it('reaches 44px under the coarse control-height tokens, and 60px at xl', () => {
      const { root } = mount(`${CHIP('id="small"')}${CHIP('id="extra" size="xl"')}`, {
        ...LIGHT_TOKENS,
        ...coarse,
      });
      expect(chipOf(root, '#small').getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      expect(chipOf(root, '#extra').getBoundingClientRect().height).toBeGreaterThanOrEqual(60);
    });

    it('wraps the chips of a group onto several rows, with the gap token between them', () => {
      const labels = ['Endurance', 'VO2max', 'Threshold', 'Sprint', 'Recovery', 'Cadence'];
      const chips = labels.map((label) => `<button ckChip>${label}</button>`).join('');
      const { root } = mount(
        `<div style="inline-size: 200px"><ck-chip-group aria-label="Category" style="--ck-chip-group-gap: 10px">${chips}</ck-chip-group></div>`,
      );
      const rects = Array.from(root.querySelectorAll('button'), (chip) =>
        chip.getBoundingClientRect(),
      );
      const rows = new Set(rects.map((rect) => Math.round(rect.top)));
      expect(rows.size).toBeGreaterThan(1);
      const group = root.querySelector('ck-chip-group')!.getBoundingClientRect();
      for (const rect of rects) {
        expect(rect.right).toBeLessThanOrEqual(group.right + 0.5);
      }
      const first = rects[0];
      const second = rects[1];
      expect(Math.round(second.left - first.right)).toBe(10);
      const secondRow = rects.find((rect) => Math.round(rect.top) !== Math.round(first.top))!;
      expect(Math.round(secondRow.top - first.bottom)).toBe(10);
    });

    it('falls back to the space-2 gap in a group', () => {
      const { root } = mount(
        `<ck-chip-group aria-label="Category"><button ckChip>A</button><button ckChip>B</button></ck-chip-group>`,
      );
      const [first, second] = Array.from(root.querySelectorAll('button'), (chip) =>
        chip.getBoundingClientRect(),
      );
      expect(Math.round(second.left - first.right)).toBe(8);
    });

    it('keeps neighbouring chips at least 24px apart at their centres on one row', () => {
      const { root } = mount(
        `<ck-chip-group aria-label="Category"><button ckChip>A</button><button ckChip>B</button></ck-chip-group>`,
      );
      const [first, second] = Array.from(root.querySelectorAll('button'), (chip) =>
        chip.getBoundingClientRect(),
      );
      expect(second.left + second.width / 2 - (first.left + first.width / 2)).toBeGreaterThan(24);
    });

    it('cuts a very long label with an ellipsis inside the row and keeps the check and icon sizes', async () => {
      const { fixture, host, root } = mount(
        `<div style="inline-size: 120px"><ck-chip-group aria-label="Category"><button ckChip [(selected)]="selected">${ICON}${'A very long category name '.repeat(5)}</button></ck-chip-group></div>`,
      );
      host.selected.set(true);
      await settle(fixture);
      const chip = chipOf(root);
      const label = chip.querySelector<HTMLElement>('.ck-chip__label')!;
      expect(chip.getBoundingClientRect().width).toBeLessThanOrEqual(120.5);
      expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
      expect(getComputedStyle(label).textOverflow).toBe('ellipsis');
      expect(chip.querySelector('.ck-chip__check')!.getBoundingClientRect().width).toBeGreaterThan(
        10,
      );
      expect(chip.getBoundingClientRect().height).toBe(32);
    });

    it('puts the check before the label in right-to-left text too', async () => {
      document.body.dir = 'rtl';
      const { fixture, host, root } = mount(CHIP());
      host.selected.set(true);
      await settle(fixture);
      const check = chipOf(root).querySelector('.ck-chip__check')!.getBoundingClientRect();
      const label = chipOf(root).querySelector('.ck-chip__label')!.getBoundingClientRect();
      expect(check.left).toBeGreaterThanOrEqual(label.right - 0.5);
    });

    it('keeps spaces around inline markup in the label', () => {
      const { root } = mount(CHIP('', 'Trained <b>3</b> times'));
      expect(chipOf(root).querySelector('.ck-chip__label')!.textContent).toBe('Trained 3 times');
    });
  });

  describe('group', () => {
    it('is a group with a name and a wrapping flex row', () => {
      const { root } = mount(`<ck-chip-group aria-label="Category">${CHIP()}</ck-chip-group>`);
      const group = root.querySelector('ck-chip-group')!;
      expect(group.getAttribute('role')).toBe('group');
      expect(getComputedStyle(group).display).toBe('flex');
      expect(getComputedStyle(group).flexWrap).toBe('wrap');
    });

    it('keeps each chip toggling on its own', async () => {
      const { fixture, root } = mount(
        `<ck-chip-group aria-label="Category"><button ckChip>A</button><button ckChip>B</button><button ckChip>C</button></ck-chip-group>`,
      );
      const [first, , third] = Array.from(root.querySelectorAll('button'));
      first.click();
      third.click();
      await settle(fixture);
      expect(
        Array.from(root.querySelectorAll('button'), (chip) => chip.getAttribute('aria-pressed')),
      ).toEqual(['true', 'false', 'true']);
    });
  });

  describe('dev warnings', () => {
    const warn = () => vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    async function run(template: string): Promise<void> {
      const { fixture } = mount(template);
      await settle(fixture);
    }

    it('warns once for a chip without a name', async () => {
      const spy = warn();
      await run('<button ckChip></button>');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toContain('ckChip has no accessible name');
    });

    it('warns for a chip with only an icon', async () => {
      const spy = warn();
      await run(`<button ckChip>${ICON}</button>`);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['text', '<button ckChip>Endurance</button>'],
      ['aria-label', '<button ckChip aria-label="Endurance"></button>'],
      ['title', '<button ckChip title="Endurance"></button>'],
      [
        'aria-labelledby',
        '<span id="name">Endurance</span><button ckChip aria-labelledby="name"></button>',
      ],
    ])('does not warn for a chip named by %s', async (_name, template) => {
      const spy = warn();
      await run(template);
      expect(spy).not.toHaveBeenCalled();
    });

    it('warns once for a group without a name', async () => {
      const spy = warn();
      await run('<ck-chip-group><button ckChip>A</button></ck-chip-group>');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toContain('ck-chip-group has no accessible name');
    });

    it.each([
      [
        'aria-label',
        '<ck-chip-group aria-label="Category"><button ckChip>A</button></ck-chip-group>',
      ],
      [
        'aria-labelledby',
        '<h3 id="heading">Category</h3><ck-chip-group aria-labelledby="heading"><button ckChip>A</button></ck-chip-group>',
      ],
    ])('does not warn for a group named by %s', async (_name, template) => {
      const spy = warn();
      await run(template);
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not warn when destroyed before the first render finishes', () => {
      const spy = warn();
      TestBed.overrideComponent(ChipHost, {
        set: { template: '<ck-chip-group><button ckChip></button></ck-chip-group>' },
      });
      TestBed.createComponent(ChipHost).destroy();
      TestBed.inject(ApplicationRef).tick();
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not warn on the server', async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const spy = warn();
      await run('<ck-chip-group><button ckChip></button></ck-chip-group>');
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('server rendering', () => {
    it('renders the state, the default type and the check into the markup', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const { root } = mount(
        '<ck-chip-group aria-label="Category"><button ckChip [selected]="true" size="md">Endurance</button></ck-chip-group>',
      );
      const chip = chipOf(root);
      expect(chip.getAttribute('aria-pressed')).toBe('true');
      expect(chip.getAttribute('type')).toBe('button');
      expect(chip.classList.contains('ck-chip--md')).toBe(true);
      expect(chip.querySelector('.ck-chip__check')).not.toBeNull();
      expect(root.querySelector('ck-chip-group')!.getAttribute('role')).toBe('group');
    });
  });

  describe.each([
    ['light', LIGHT_TOKENS],
    ['dark', DARK_TOKENS],
  ])('accessibility in the %s theme', (_name, tokens) => {
    it('has no axe violations for chips of every size, selected, with icon, disabled and in a group', async () => {
      const { fixture, host, root } = mount(
        `<div style="background: var(--ck-color-bg); color: var(--ck-color-fg); padding: 8px">
          <ck-chip-group aria-label="Category">
            <button ckChip size="sm">Endurance</button>
            <button ckChip size="md" [selected]="true">${ICON}VO2max</button>
            <button ckChip size="lg">${ICON}Threshold</button>
            <button ckChip size="xl" [selected]="true">Sprint</button>
            <button ckChip disabled>Recovery</button>
            <button ckChip disabled [selected]="true">Cadence</button>
          </ck-chip-group>
        </div>`,
        tokens,
      );
      await settle(fixture);
      await expectNoAxeViolations(root);
      expect(host.emitted).toEqual([]);
    });
  });
});
