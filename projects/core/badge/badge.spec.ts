import { ApplicationRef, Component, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { cdp, page } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import { CK_BADGE_IMPORTS, CkBadgeSize, CkBadgeTone } from './index';

const LIGHT_TOKENS: Record<string, string> = {
  '--ck-color-scheme': 'light',
  '--ck-color-bg': 'rgb(255, 255, 255)',
  '--ck-color-control': 'rgb(240, 240, 244)',
  '--ck-color-fg': 'rgb(20, 20, 30)',
  '--ck-color-success-fg': 'rgb(10, 90, 40)',
  '--ck-color-warning-fg': 'rgb(110, 60, 0)',
  '--ck-color-danger': 'rgb(200, 30, 30)',
  '--ck-color-on-danger': 'rgb(255, 255, 255)',
};

const DARK_TOKENS: Record<string, string> = {
  '--ck-color-scheme': 'dark',
  '--ck-color-bg': 'rgb(20, 20, 24)',
  '--ck-color-control': 'rgb(50, 50, 60)',
  '--ck-color-fg': 'rgb(245, 245, 250)',
  '--ck-color-success-fg': 'rgb(120, 230, 150)',
  '--ck-color-warning-fg': 'rgb(250, 210, 120)',
  '--ck-color-danger': 'rgb(255, 110, 100)',
  '--ck-color-on-danger': 'rgb(20, 20, 24)',
};

const SHARED_TOKENS: Record<string, string> = {
  '--ck-space-1': '4px',
  '--ck-space-2': '8px',
  '--ck-radius-full': '9999px',
  '--ck-font-size-xs': '12px',
  '--ck-font-size-sm': '14px',
  '--ck-font-weight-semibold': '600',
  '--ck-font-variant-numeric': 'tabular-nums',
  '--ck-line-height-tight': '1.25',
};

const ICON = '<svg ckBadgeIcon viewBox="0 0 16 16"><path d="M0 0h16v16H0z" /></svg>';

@Component({
  imports: [CK_BADGE_IMPORTS],
  template: `<ck-badge>Unused</ck-badge>`,
})
class BadgeHost {
  readonly tone = signal<CkBadgeTone>('neutral');
  readonly size = signal<CkBadgeSize>('md');
  readonly dot = signal(false);
  readonly label = signal('Connected');
}

function mount(
  template: string,
  tokens: Record<string, string> = LIGHT_TOKENS,
): { fixture: ComponentFixture<BadgeHost>; host: BadgeHost; root: HTMLElement } {
  TestBed.overrideComponent(BadgeHost, { set: { template } });
  const fixture = TestBed.createComponent(BadgeHost);
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
}

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

async function emulate(features: { name: string; value: string }[]): Promise<void> {
  await (cdp() as unknown as Session).send('Emulation.setEmulatedMedia', { features });
}

const badgeOf = (root: HTMLElement): HTMLElement => root.querySelector<HTMLElement>('ck-badge')!;
const textOf = (root: HTMLElement): HTMLElement =>
  root.querySelector<HTMLElement>('.ck-badge__text')!;

describe('CkBadge', () => {
  afterEach(async () => {
    document.body.replaceChildren();
    document.body.removeAttribute('dir');
    TestBed.resetTestingModule();
    await emulate([]);
    await page.viewport(800, 600);
  });

  describe('structure', () => {
    it('is a plain inline element without a role, with its text in its own element', () => {
      const { root } = mount('<ck-badge>Connected</ck-badge>');
      const badge = badgeOf(root);
      expect(badge.hasAttribute('role')).toBe(false);
      expect(badge.classList.contains('ck-badge')).toBe(true);
      expect(textOf(root).textContent).toBe('Connected');
      expect(getComputedStyle(badge).display).toBe('inline-flex');
    });

    it('defaults to the neutral tone and the md size', () => {
      const { root } = mount('<ck-badge>Connected</ck-badge>');
      expect(badgeOf(root).classList.contains('ck-badge--neutral')).toBe(true);
      expect(badgeOf(root).classList.contains('ck-badge--md')).toBe(true);
    });

    it.each<CkBadgeTone>(['neutral', 'success', 'warning', 'danger'])(
      'sets the class of the %s tone',
      (tone) => {
        const { root } = mount(`<ck-badge tone="${tone}">Text</ck-badge>`);
        expect(badgeOf(root).classList.contains(`ck-badge--${tone}`)).toBe(true);
      },
    );

    it('falls back to neutral and md for values it does not know', () => {
      const { root } = mount('<ck-badge tone="bogus" size="huge">Text</ck-badge>');
      const badge = badgeOf(root);
      expect(badge.className).toContain('ck-badge--neutral');
      expect(badge.className).toContain('ck-badge--md');
      expect(badge.className).not.toContain('bogus');
      expect(badge.getBoundingClientRect().height).toBe(24);
    });

    it('follows tone, size and dot when they change', async () => {
      const { fixture, host, root } = mount(
        '<ck-badge [tone]="tone()" [size]="size()" [dot]="dot()">Text</ck-badge>',
      );
      expect(root.querySelector('.ck-badge__dot')).toBeNull();
      host.tone.set('danger');
      host.size.set('sm');
      host.dot.set(true);
      await settle(fixture);
      expect(badgeOf(root).classList.contains('ck-badge--danger')).toBe(true);
      expect(badgeOf(root).classList.contains('ck-badge--neutral')).toBe(false);
      expect(badgeOf(root).classList.contains('ck-badge--sm')).toBe(true);
      expect(root.querySelector('.ck-badge__dot')).not.toBeNull();
      host.dot.set(false);
      await settle(fixture);
      expect(root.querySelector('.ck-badge__dot')).toBeNull();
    });

    it('draws the dot only with dot, as a decorative element before the text', () => {
      const { root } = mount('<ck-badge dot>Connected</ck-badge>');
      const dot = root.querySelector('.ck-badge__dot')!;
      expect(dot.getAttribute('aria-hidden')).toBe('true');
      expect(dot.nextElementSibling).toBe(textOf(root));
    });

    it('draws no dot without dot, and adds and removes it when the input changes', async () => {
      const { fixture, host, root } = mount('<ck-badge [dot]="dot()">Connected</ck-badge>');
      expect(root.querySelector('.ck-badge__dot')).toBeNull();
      host.dot.set(true);
      await settle(fixture);
      expect(root.querySelectorAll('.ck-badge__dot')).toHaveLength(1);
      host.dot.set(false);
      await settle(fixture);
      expect(root.querySelector('.ck-badge__dot')).toBeNull();
    });

    it('marks the projected icon as decorative and draws it before the text', () => {
      const { root } = mount(`<ck-badge>${ICON}Strava</ck-badge>`);
      const icon = root.querySelector('svg')!;
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(icon.classList.contains('ck-badge__icon')).toBe(true);
      expect(icon.nextElementSibling).toBe(textOf(root));
      expect(textOf(root).textContent).toBe('Strava');
    });

    it('keeps an icon that is written after the text in front of it', () => {
      const { root } = mount(`<ck-badge>Strava${ICON}</ck-badge>`);
      expect(badgeOf(root).firstElementChild).toBe(root.querySelector('svg'));
    });

    it('keeps the consumer attributes and classes on the host', () => {
      // No aria-label: a role-less element can not be named, the text is the name.
      const { root } = mount('<ck-badge id="mine" class="mine" data-state="ok">Text</ck-badge>');
      const badge = badgeOf(root);
      expect(badge.id).toBe('mine');
      expect(badge.classList.contains('mine')).toBe(true);
      expect(badge.classList.contains('ck-badge')).toBe(true);
      expect(badge.getAttribute('data-state')).toBe('ok');
    });

    it('is not a live region and says nothing when its text changes', async () => {
      const { fixture, host, root } = mount('<ck-badge>{{ label() }}</ck-badge>');
      const badge = badgeOf(root);
      host.label.set('Disconnected');
      await settle(fixture);
      expect(textOf(root).textContent).toBe('Disconnected');
      for (const name of ['aria-live', 'role', 'aria-atomic']) {
        expect(badge.hasAttribute(name)).toBe(false);
      }
    });
  });

  describe('look', () => {
    it('paints the neutral badge on the control fill with the foreground colour', () => {
      const { root } = mount('<ck-badge>Text</ck-badge>');
      const style = getComputedStyle(badgeOf(root));
      expect(style.backgroundColor).toBe('rgb(240, 240, 244)');
      expect(style.color).toBe('rgb(20, 20, 30)');
      expect(style.fontWeight).toBe('600');
      expect(style.whiteSpace).toBe('nowrap');
    });

    it.each([
      ['success', 'rgb(10, 90, 40)'],
      ['warning', 'rgb(110, 60, 0)'],
    ])('colours the %s text and keeps the control fill', (tone, color) => {
      const { root } = mount(`<ck-badge tone="${tone}" dot>Text</ck-badge>`);
      const style = getComputedStyle(badgeOf(root));
      expect(style.color).toBe(color);
      expect(style.backgroundColor).toBe('rgb(240, 240, 244)');
      expect(getComputedStyle(root.querySelector('.ck-badge__dot')!).backgroundColor).toBe(color);
    });

    it('fills the danger badge and draws its dot in the text colour', () => {
      const { root } = mount('<ck-badge tone="danger" dot>Failed</ck-badge>');
      const style = getComputedStyle(badgeOf(root));
      expect(style.backgroundColor).toBe('rgb(200, 30, 30)');
      expect(style.color).toBe('rgb(255, 255, 255)');
      expect(getComputedStyle(root.querySelector('.ck-badge__dot')!).backgroundColor).toBe(
        'rgb(255, 255, 255)',
      );
    });

    it('takes the component tokens, for every tone', () => {
      const { root } = mount(
        '<div style="--ck-badge-bg: rgb(1, 2, 3); --ck-badge-fg: rgb(250, 251, 252); --ck-badge-radius: 3px"><ck-badge tone="danger">Text</ck-badge></div>',
      );
      const style = getComputedStyle(badgeOf(root));
      expect(style.backgroundColor).toBe('rgb(1, 2, 3)');
      expect(style.color).toBe('rgb(250, 251, 252)');
      expect(style.borderTopLeftRadius).toBe('3px');
    });

    it('is a full pill by default', () => {
      const { root } = mount('<ck-badge>Text</ck-badge>');
      expect(getComputedStyle(badgeOf(root)).borderTopLeftRadius).toBe('9999px');
    });

    it('takes its colours from the dark token set', () => {
      const { root } = mount('<ck-badge tone="success">Text</ck-badge>', DARK_TOKENS);
      const style = getComputedStyle(badgeOf(root));
      expect(style.backgroundColor).toBe('rgb(50, 50, 60)');
      expect(style.color).toBe('rgb(120, 230, 150)');
    });
  });

  describe('layout', () => {
    it('is 24px high at md and 20px at sm, with a readable font at both', () => {
      const { root } = mount('<ck-badge>Text</ck-badge><ck-badge size="sm">Text</ck-badge>');
      const [medium, small] = Array.from(root.querySelectorAll<HTMLElement>('ck-badge'));
      expect(medium.getBoundingClientRect().height).toBe(24);
      expect(small.getBoundingClientRect().height).toBe(20);
      expect(getComputedStyle(medium).fontSize).toBe('14px');
      expect(getComputedStyle(small).fontSize).toBe('12px');
    });

    it('does not grow with the touch target tokens: a badge is not a target', () => {
      const { root } = mount('<ck-badge>Text</ck-badge>', {
        ...LIGHT_TOKENS,
        '--ck-target-min': '44px',
        '--ck-control-height-md': '44px',
      });
      expect(badgeOf(root).getBoundingClientRect().height).toBe(24);
    });

    it('aligns dot, icon and text on one line', () => {
      const { root } = mount(`<ck-badge dot>One</ck-badge><ck-badge>${ICON}Two</ck-badge>`);
      for (const badge of Array.from(root.querySelectorAll<HTMLElement>('ck-badge'))) {
        const box = badge.getBoundingClientRect();
        const middle = box.top + box.height / 2;
        for (const part of Array.from(badge.children)) {
          const rect = part.getBoundingClientRect();
          expect(Math.abs(rect.top + rect.height / 2 - middle)).toBeLessThanOrEqual(1);
        }
      }
    });

    it('keeps the spaces around inline markup in the text', () => {
      const { root } = mount(
        '<ck-badge>Not <b>so</b> good</ck-badge><br /><ck-badge>Not<b>so</b>good</ck-badge>',
      );
      const [spaced, tight] = Array.from(root.querySelectorAll<HTMLElement>('ck-badge'));
      expect(textOf(spaced).textContent).toBe('Not so good');
      expect(spaced.getBoundingClientRect().width).toBeGreaterThan(
        tight.getBoundingClientRect().width,
      );
      const bold = spaced.querySelector('b')!.getBoundingClientRect();
      const text = textOf(spaced).getBoundingClientRect();
      expect(bold.left).toBeGreaterThan(text.left + 10);
      expect(bold.right).toBeLessThan(text.right - 10);
    });

    it('puts the dot at the start in left-to-right and at the right edge in right-to-left', () => {
      const { root } = mount('<ck-badge dot>Connected</ck-badge>');
      const dot = root.querySelector('.ck-badge__dot')!;
      expect(dot.getBoundingClientRect().left).toBeLessThan(
        textOf(root).getBoundingClientRect().left,
      );
      document.body.setAttribute('dir', 'rtl');
      expect(dot.getBoundingClientRect().left).toBeGreaterThan(
        textOf(root).getBoundingClientRect().left,
      );
    });

    it('is as wide as its content when there is room', () => {
      const { root } = mount('<div style="inline-size: 600px"><ck-badge>OK</ck-badge></div>');
      expect(badgeOf(root).getBoundingClientRect().width).toBeLessThan(80);
    });

    it('cuts a long text with an ellipsis inside a narrow container at 390px', async () => {
      await page.viewport(390, 844);
      const { root } = mount(
        `<div id="box" style="inline-size: 120px"><ck-badge dot>A very long status text that never fits</ck-badge></div>
         <div id="box2" style="inline-size: 120px"><ck-badge>${ICON}Another very long status text</ck-badge></div>`,
      );
      expect(window.innerWidth).toBe(390);
      for (const selector of ['#box', '#box2']) {
        const box = root.querySelector<HTMLElement>(selector)!;
        const badge = box.querySelector<HTMLElement>('ck-badge')!;
        const text = textOf(box);
        expect(badge.getBoundingClientRect().width).toBeLessThanOrEqual(120);
        expect(badge.getBoundingClientRect().height).toBe(24);
        expect(getComputedStyle(text).textOverflow).toBe('ellipsis');
        expect(getComputedStyle(text).whiteSpace).toBe('nowrap');
        expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
        for (const part of Array.from(badge.querySelectorAll('.ck-badge__dot, svg'))) {
          const rect = part.getBoundingClientRect();
          expect(rect.width).toBeGreaterThanOrEqual(7);
          expect(rect.right).toBeLessThanOrEqual(box.getBoundingClientRect().right);
        }
      }
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    });

    it('does not wrap a long text into two lines', () => {
      const { root } = mount(
        '<div style="inline-size: 90px"><ck-badge>one two three four five six</ck-badge></div>',
      );
      expect(badgeOf(root).getBoundingClientRect().height).toBe(24);
    });

    it('draws a visible edge in forced colors without changing its size', async () => {
      const { root } = mount('<ck-badge tone="danger" dot>Failed</ck-badge>');
      const before = badgeOf(root).getBoundingClientRect();
      expect(getComputedStyle(badgeOf(root)).borderTopWidth).toBe('0px');
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      expect(getComputedStyle(badgeOf(root)).borderTopWidth).toBe('1px');
      const after = badgeOf(root).getBoundingClientRect();
      expect(after.height).toBe(before.height);
      const dot = root.querySelector('.ck-badge__dot')!;
      expect(getComputedStyle(dot).forcedColorAdjust).toBe('none');
      expect(dot.getBoundingClientRect().width).toBeGreaterThan(0);
    });
  });

  describe('the dot colour', () => {
    const CUSTOM = '<ck-badge dot style="--ck-badge-dot: rgb(255, 0, 0)">Failed</ck-badge>';

    it('follows the text colour, and --ck-badge-dot when set', () => {
      const { root } = mount(`<ck-badge tone="success" dot>Connected</ck-badge>${CUSTOM}`);
      const [plain, custom] = Array.from(root.querySelectorAll('.ck-badge__dot'));
      expect(getComputedStyle(plain).backgroundColor).toBe('rgb(10, 90, 40)');
      expect(getComputedStyle(custom).backgroundColor).toBe('rgb(255, 0, 0)');
    });

    it('becomes CanvasText in forced colors, whatever --ck-badge-dot says', async () => {
      const { root } = mount(CUSTOM);
      const dot = root.querySelector('.ck-badge__dot')!;
      expect(getComputedStyle(dot).backgroundColor).toBe('rgb(255, 0, 0)');
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      const canvasText = getComputedStyle(badgeOf(root)).borderTopColor;
      expect(getComputedStyle(dot).backgroundColor).toBe(canvasText);
      expect(getComputedStyle(dot).backgroundColor).not.toBe('rgb(255, 0, 0)');
    });
  });

  describe('dev warnings', () => {
    const warn = () => vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const run = async (template: string) => {
      const mounted = mount(template);
      await TestBed.inject(ApplicationRef).whenStable();
      TestBed.inject(ApplicationRef).tick();
      return mounted;
    };

    it.each([
      ['no content', '<ck-badge></ck-badge>'],
      ['only spaces', '<ck-badge>   </ck-badge>'],
      ['a dot only', '<ck-badge dot></ck-badge>'],
      ['an icon only', `<ck-badge>${ICON}</ck-badge>`],
    ])('warns once for a badge with %s', async (_name, template) => {
      const spy = warn();
      const { fixture } = await run(template);
      await settle(fixture);
      expect(spy).toHaveBeenCalledTimes(1);
      const [message, element] = spy.mock.calls[0];
      expect(message).toContain('ck-badge');
      expect((element as HTMLElement).tagName).toBe('CK-BADGE');
    });

    it('warns once per badge, not once per change detection', async () => {
      const spy = warn();
      const { fixture } = await run('<ck-badge></ck-badge><ck-badge>Fine</ck-badge>');
      await settle(fixture);
      await settle(fixture);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['text', '<ck-badge>Connected</ck-badge>'],
      ['text next to a dot', '<ck-badge dot>Connected</ck-badge>'],
      ['text next to an icon', `<ck-badge>${ICON}Strava</ck-badge>`],
      ['bound text', '<ck-badge>{{ label() }}</ck-badge>'],
    ])('does not warn for %s', async (_name, template) => {
      const spy = warn();
      await run(template);
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not warn when destroyed before the first render finishes', () => {
      const spy = warn();
      TestBed.overrideComponent(BadgeHost, { set: { template: '<ck-badge></ck-badge>' } });
      TestBed.createComponent(BadgeHost).destroy();
      TestBed.inject(ApplicationRef).tick();
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not warn on the server', async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const spy = warn();
      await run('<ck-badge></ck-badge>');
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('server rendering', () => {
    it('renders the same markup on the server, with the dot and the text', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const { root } = mount('<ck-badge tone="success" size="sm" dot>Connected</ck-badge>');
      const badge = badgeOf(root);
      expect(badge.className).toContain('ck-badge--success');
      expect(badge.className).toContain('ck-badge--sm');
      expect(root.querySelector('.ck-badge__dot')).not.toBeNull();
      expect(textOf(root).textContent).toBe('Connected');
    });
  });

  describe.each([
    ['light', LIGHT_TOKENS],
    ['dark', DARK_TOKENS],
  ])('accessibility in the %s theme', (_name, tokens) => {
    it('has no axe violations for every tone, size, dot and icon', async () => {
      const { root } = mount(
        `<div style="background: var(--ck-color-bg); color: var(--ck-color-fg)">
          <ck-badge>Neutral</ck-badge>
          <ck-badge tone="success" dot>Connected</ck-badge>
          <ck-badge tone="warning" size="sm">Low battery</ck-badge>
          <ck-badge tone="danger" dot>Failed</ck-badge>
          <ck-badge tone="success">${ICON}Strava</ck-badge>
        </div>`,
        tokens,
      );
      await expectNoAxeViolations(root);
    });
  });
});
