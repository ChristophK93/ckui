import { ApplicationRef, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideCkui } from '@ckui/core';
import { cdp, page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import { DARK_TOKENS, SwitchHost, inputOf, mount, query, settle } from '../testing/switch-host';

const SWITCH = (attributes = '', content = 'Auto-upload') =>
  `<ck-switch ${attributes} [value]="value()" (valueChange)="emitted.push($event)">${content}</ck-switch>`;

const HINT = '<ck-switch-hint>Uploads every finished ride to Strava.</ck-switch-hint>';

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

describe('CkSwitch', () => {
  afterEach(async () => {
    await emulate([]);
    vi.restoreAllMocks();
    document.body.replaceChildren();
    document.body.removeAttribute('dir');
    TestBed.resetTestingModule();
  });

  describe('structure', () => {
    it('is a label row around one native checkbox with the switch role, named by its text', async () => {
      const { fixture, root } = mount(SWITCH());
      await settle(fixture);
      const input = inputOf(root);
      expect(query(root, 'label.ck-switch').contains(input)).toBe(true);
      expect(input.type).toBe('checkbox');
      expect(input.getAttribute('role')).toBe('switch');
      expect(input.checked).toBe(false);
      const text = query(root, '.ck-switch__text');
      expect(input.getAttribute('aria-labelledby')).toBe(text.id);
      expect(text.textContent).toBe('Auto-upload');
    });

    it('reflects the value in the checked state', async () => {
      const { fixture, host, root } = mount(SWITCH());
      host.value.set(true);
      await settle(fixture);
      expect(inputOf(root).checked).toBe(true);
      host.value.set(false);
      await settle(fixture);
      expect(inputOf(root).checked).toBe(false);
    });

    it('moves aria-label off the host onto the input and drops the text name', async () => {
      const { fixture, root } = mount(SWITCH('aria-label="Audio cues"', ''));
      await settle(fixture);
      expect(query(root, 'ck-switch').hasAttribute('aria-label')).toBe(false);
      expect(inputOf(root).getAttribute('aria-label')).toBe('Audio cues');
      expect(inputOf(root).hasAttribute('aria-labelledby')).toBe(false);
    });

    it('lets the consumer aria-labelledby win over the text', async () => {
      const { fixture, root } = mount(
        `<span id="outside">Outside name</span>${SWITCH('aria-labelledby="outside"')}`,
      );
      await settle(fixture);
      expect(query(root, 'ck-switch').hasAttribute('aria-labelledby')).toBe(false);
      expect(inputOf(root).getAttribute('aria-labelledby')).toBe('outside');
    });

    it('keeps inline markup in the label and its spaces', async () => {
      const { fixture, root } = mount(
        SWITCH('', 'Upload <strong>every</strong>&ngsp;<em>ride</em>'),
      );
      await settle(fixture);
      expect(query(root, '.ck-switch__text').textContent).toBe('Upload every ride');
      expect(query(root, '.ck-switch__text strong')).not.toBeNull();
    });

    it('does not put flex or grid on the elements that hold the text', async () => {
      const { fixture, root } = mount(SWITCH());
      await settle(fixture);
      for (const selector of ['.ck-switch__text', '.ck-switch__body']) {
        expect(getComputedStyle(query(root, selector)).display).toBe('block');
      }
    });
  });

  describe('interaction', () => {
    it('toggles on a click on the label text and on the switch, once each', async () => {
      const { fixture, host, root } = mount(SWITCH());
      await settle(fixture);
      await userEvent.click(query(root, '.ck-switch__text'));
      expect(host.emitted).toEqual([true]);
      expect(inputOf(root).checked).toBe(true);
      await userEvent.click(inputOf(root));
      expect(host.emitted).toEqual([true, false]);
      expect(inputOf(root).checked).toBe(false);
    });

    it('toggles on a click on the hint', async () => {
      const { fixture, host, root } = mount(SWITCH('', `Auto-upload ${HINT}`));
      await settle(fixture);
      await userEvent.click(query(root, 'ck-switch-hint'));
      expect(host.emitted).toEqual([true]);
    });

    it('toggles on Space and does not move on Enter', async () => {
      const { fixture, host, root } = mount(SWITCH());
      await settle(fixture);
      inputOf(root).focus();
      await userEvent.keyboard(' ');
      expect(host.emitted).toEqual([true]);
      await userEvent.keyboard('{Enter}');
      expect(host.emitted).toEqual([true]);
      await userEvent.keyboard(' ');
      expect(host.emitted).toEqual([true, false]);
    });

    it('reports every change of a burst of fast toggles, in order', async () => {
      const { fixture, host, root } = mount(SWITCH());
      await settle(fixture);
      for (let count = 0; count < 25; count++) {
        inputOf(root).click();
      }
      await settle(fixture);
      expect(host.emitted).toHaveLength(25);
      expect(host.emitted.every((value, index) => value === (index % 2 === 0))).toBe(true);
      expect(inputOf(root).checked).toBe(true);
    });

    it('does not report a programmatic write', async () => {
      const { fixture, host } = mount(SWITCH());
      host.value.set(true);
      await settle(fixture);
      host.value.set(false);
      await settle(fixture);
      expect(host.emitted).toEqual([]);
    });
  });

  describe('disabled', () => {
    it('blocks clicks and the label, and says so in the markup and the style', async () => {
      const { fixture, host, root } = mount(SWITCH('disabled'));
      await settle(fixture);
      expect(inputOf(root).disabled).toBe(true);
      expect(query(root, '.ck-switch').classList.contains('ck-switch--disabled')).toBe(true);
      query(root, '.ck-switch__text').click();
      inputOf(root).click();
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      expect(inputOf(root).checked).toBe(false);
      expect(getComputedStyle(query(root, '.ck-switch')).color).toBe('rgb(150, 150, 160)');
      expect(getComputedStyle(query(root, '.ck-switch')).cursor).toBe('not-allowed');
    });

    it('is blocked and styled inside a disabled fieldset', async () => {
      const { fixture, host, root } = mount(
        `<fieldset disabled>${SWITCH('', `Audio ${HINT}`)}</fieldset>`,
      );
      await settle(fixture);
      expect(inputOf(root).matches(':disabled')).toBe(true);
      query(root, '.ck-switch__text').click();
      query(root, 'ck-switch-hint').click();
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      expect(getComputedStyle(query(root, '.ck-switch')).color).toBe('rgb(150, 150, 160)');
      expect(getComputedStyle(query(root, 'ck-switch-hint')).color).toBe('rgb(150, 150, 160)');
    });

    it('takes a change of the disabled input back and forth', async () => {
      const { fixture, host, root } = mount(SWITCH('[disabled]="locked()"'));
      host.locked.set(true);
      await settle(fixture);
      inputOf(root).click();
      expect(host.emitted).toEqual([]);
      host.locked.set(false);
      await settle(fixture);
      inputOf(root).click();
      expect(host.emitted).toEqual([true]);
    });
  });

  describe('hint', () => {
    it('describes the input and keeps the name free of the hint text', async () => {
      const { fixture, root } = mount(SWITCH('', `Auto-upload ${HINT}`));
      await settle(fixture);
      const hint = query(root, 'ck-switch-hint');
      expect(hint.id).toMatch(/^ck-switch-hint-\d+$/);
      expect(inputOf(root).getAttribute('aria-describedby')).toBe(hint.id);
      expect(query(root, '.ck-switch__text').textContent).toBe('Auto-upload ');
      expect(hint.parentElement).toBe(query(root, '.ck-switch__body'));
    });

    it('follows a hint that appears, disappears and changes its id', async () => {
      const { fixture, host, root } = mount(
        SWITCH(
          '',
          `Auto-upload @if (hint()) {<ck-switch-hint [id]="hintId()">{{ hint() }}</ck-switch-hint>}`,
        ),
      );
      await settle(fixture);
      expect(inputOf(root).getAttribute('aria-describedby')).toBe('hint-a');
      host.hintId.set('hint-b');
      await settle(fixture);
      expect(query(root, 'ck-switch-hint').id).toBe('hint-b');
      expect(inputOf(root).getAttribute('aria-describedby')).toBe('hint-b');
      host.hint.set('Other text.');
      await settle(fixture);
      expect(query(root, 'ck-switch-hint').textContent).toBe('Other text.');
      host.hint.set(null);
      await settle(fixture);
      expect(inputOf(root).hasAttribute('aria-describedby')).toBe(false);
      host.hint.set('Back');
      await settle(fixture);
      expect(inputOf(root).getAttribute('aria-describedby')).toBe('hint-b');
    });

    it('keeps a static id and adds the consumer aria-describedby after the hint', async () => {
      const { fixture, root } = mount(
        SWITCH(
          'aria-describedby="mine"',
          `Auto-upload <ck-switch-hint id="fixed">Help</ck-switch-hint>`,
        ),
      );
      await settle(fixture);
      expect(query(root, 'ck-switch-hint').id).toBe('fixed');
      expect(inputOf(root).getAttribute('aria-describedby')).toBe('fixed mine');
      expect(query(root, 'ck-switch').hasAttribute('aria-describedby')).toBe(false);
    });

    it('gives two switches two different hint ids', async () => {
      const { fixture, root } = mount(SWITCH('', `A ${HINT}`) + SWITCH('', `B ${HINT}`));
      await settle(fixture);
      const [first, second] = Array.from(root.querySelectorAll('ck-switch-hint'));
      expect(first.id).not.toBe(second.id);
    });
  });

  describe('forms', () => {
    it('works with Reactive Forms: null is off, user changes emit, writes do not', async () => {
      const { fixture, host, root } = mount('<ck-switch [formControl]="control">Audio</ck-switch>');
      const changes: (boolean | null)[] = [];
      host.control.valueChanges.subscribe((value) => changes.push(value));
      await settle(fixture);
      expect(inputOf(root).checked).toBe(true);
      host.control.setValue(null);
      await settle(fixture);
      expect(inputOf(root).checked).toBe(false);
      host.control.reset();
      await settle(fixture);
      expect(inputOf(root).checked).toBe(false);
      changes.length = 0;
      inputOf(root).click();
      await settle(fixture);
      expect(host.control.value).toBe(true);
      expect(host.control.dirty).toBe(true);
      expect(changes).toEqual([true]);
      host.control.disable();
      await settle(fixture);
      expect(inputOf(root).disabled).toBe(true);
      inputOf(root).click();
      expect(host.control.value).toBe(true);
    });

    it('does not dirty a control for a programmatic write', async () => {
      const { fixture, host } = mount('<ck-switch [formControl]="control">Audio</ck-switch>');
      host.control.setValue(false);
      await settle(fixture);
      expect(host.control.dirty).toBe(false);
    });

    it('marks the control touched on blur, and not before', async () => {
      const { fixture, host, root } = mount(
        '<ck-switch [formControl]="control">Audio</ck-switch><button id="after">After</button>',
      );
      await settle(fixture);
      inputOf(root).focus();
      expect(host.control.touched).toBe(false);
      query(root, '#after').focus();
      expect(host.control.touched).toBe(true);
    });

    it('works with ngModel', async () => {
      const { fixture, host, root } = mount(
        '<ck-switch [ngModel]="model()" (ngModelChange)="model.set($event)">Audio</ck-switch>',
      );
      await settle(fixture);
      expect(inputOf(root).checked).toBe(true);
      inputOf(root).click();
      await settle(fixture);
      expect(host.model()).toBe(false);
      host.model.set(null);
      await settle(fixture);
      expect(inputOf(root).checked).toBe(false);
    });

    it('works with Signal Forms, including a disabled field', async () => {
      const { fixture, host, root } = mount(
        '<ck-switch [formField]="signalForm.enabled">Audio</ck-switch>',
      );
      await settle(fixture);
      expect(inputOf(root).checked).toBe(true);
      inputOf(root).click();
      await settle(fixture);
      expect(host.signalModel().enabled).toBe(false);
      expect(host.signalForm.enabled().dirty()).toBe(true);
      host.signalModel.set({ enabled: true });
      await settle(fixture);
      expect(inputOf(root).checked).toBe(true);
      host.locked.set(true);
      await settle(fixture);
      expect(inputOf(root).disabled).toBe(true);
      inputOf(root).click();
      expect(host.signalModel().enabled).toBe(true);
    });

    it('works two-way with [(value)] and is off by default', async () => {
      const { fixture, host, root } = mount(
        '<ck-switch [(value)]="value">Audio</ck-switch><output>{{ value() }}</output>',
      );
      await settle(fixture);
      expect(inputOf(root).checked).toBe(false);
      inputOf(root).click();
      await settle(fixture);
      expect(host.value()).toBe(true);
      expect(query(root, 'output').textContent).toBe('true');
    });

    it('is off without any value', async () => {
      const { fixture, root } = mount('<ck-switch>Audio</ck-switch>');
      await settle(fixture);
      expect(inputOf(root).checked).toBe(false);
    });
  });

  describe('dev warnings', () => {
    const warn = () => vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    it('warns once when there is no text and no name', async () => {
      const spy = warn();
      const { fixture } = mount('<ck-switch></ck-switch>');
      await settle(fixture);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(String(spy.mock.calls[0][0])).toContain('ck-switch has no accessible name');
    });

    it.each([
      ['text', SWITCH()],
      ['aria-label', SWITCH('aria-label="Audio"', '')],
      ['aria-labelledby', `<b id="n">Name</b>${SWITCH('aria-labelledby="n"', '')}`],
    ])('does not warn when named by %s', async (_name, template) => {
      const spy = warn();
      const { fixture } = mount(template);
      await settle(fixture);
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not warn when destroyed before the first render finishes', () => {
      const spy = warn();
      TestBed.overrideComponent(SwitchHost, { set: { template: '<ck-switch></ck-switch>' } });
      TestBed.createComponent(SwitchHost).destroy();
      TestBed.inject(ApplicationRef).tick();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('server rendering and hydration', () => {
    it('renders the state into the markup and stays silent', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, root } = mount('<ck-switch [value]="true">Audio</ck-switch>');
      TestBed.inject(ApplicationRef).tick();
      expect(inputOf(root).checked).toBe(true);
      expect(query(root, '.ck-switch').classList.contains('ck-switch--md')).toBe(true);
      expect(warn).not.toHaveBeenCalled();
      fixture.destroy();
    });

    it('takes over pre-rendered markup: a stale checked state is corrected without a change', async () => {
      const { fixture, host, root } = mount(SWITCH(), undefined, (rendered) => {
        inputOf(rendered).checked = true;
      });
      await settle(fixture);
      expect(inputOf(root).checked).toBe(false);
      expect(host.emitted).toEqual([]);
    });

    it('uses the size from provideCkui when none is set', async () => {
      TestBed.configureTestingModule({ providers: [provideCkui({ size: 'xl' })] });
      const { fixture, root } = mount(SWITCH());
      await settle(fixture);
      expect(query(root, '.ck-switch').classList.contains('ck-switch--xl')).toBe(true);
    });
  });

  describe('layout', () => {
    const rect = (root: HTMLElement, selector: string) =>
      query(root, selector).getBoundingClientRect();

    it.each([
      ['sm', 36, 20, 32],
      ['md', 44, 24, 40],
      ['lg', 52, 28, 48],
      ['xl', 64, 36, 60],
    ] as const)(
      'sizes the %s track and keeps the row at the control height',
      async (size, width, height, row) => {
        const { fixture, root } = mount(SWITCH(`size="${size}"`));
        await settle(fixture);
        expect(rect(root, '.ck-switch__track').width).toBe(width);
        expect(rect(root, '.ck-switch__track').height).toBe(height);
        expect(rect(root, '.ck-switch').height).toBeGreaterThanOrEqual(row);
      },
    );

    it('keeps the row at 44px on a coarse pointer and 60px at xl', async () => {
      const coarse = DARK_TOKENS.replace(
        '--ck-control-height-md:40px',
        '--ck-control-height-md:44px',
      );
      const { fixture, root } = mount(SWITCH(), undefined, undefined, coarse);
      await settle(fixture);
      expect(rect(root, '.ck-switch').height).toBeGreaterThanOrEqual(44);
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      const extra = mount(SWITCH('size="xl"'), undefined, undefined, coarse);
      await settle(extra.fixture);
      expect(rect(extra.root, '.ck-switch').height).toBeGreaterThanOrEqual(60);
    });

    it('puts the text first and the switch at the end of the row by default', async () => {
      const { fixture, root } = mount(`<div style="inline-size:300px">${SWITCH()}</div>`);
      await settle(fixture);
      expect(rect(root, '.ck-switch__text').left).toBeLessThan(
        rect(root, '.ck-switch__track').left,
      );
      expect(rect(root, '.ck-switch__track').right).toBeCloseTo(rect(root, '.ck-switch').right, 0);
    });

    it('puts the switch first with labelPosition end', async () => {
      const { fixture, root } = mount(
        `<div style="inline-size:300px">${SWITCH('labelPosition="end"')}</div>`,
      );
      await settle(fixture);
      expect(rect(root, '.ck-switch__track').left).toBeLessThan(
        rect(root, '.ck-switch__text').left,
      );
      expect(rect(root, '.ck-switch__track').left).toBeCloseTo(rect(root, '.ck-switch').left, 0);
    });

    it('moves the thumb to the end of the track when on, and to the other side in RTL', async () => {
      const { fixture, host, root } = mount(SWITCH());
      await settle(fixture);
      const gap = () => {
        const track = rect(root, '.ck-switch__track');
        const thumb = rect(root, '.ck-switch__thumb');
        return { start: thumb.left - track.left, end: track.right - thumb.right };
      };
      expect(gap().start).toBeLessThan(gap().end);
      host.value.set(true);
      await settle(fixture);
      expect(gap().start).toBeGreaterThan(gap().end);
      document.body.dir = 'rtl';
      await settle(fixture);
      expect(gap().start).toBeLessThan(gap().end);
      host.value.set(false);
      await settle(fixture);
      expect(gap().start).toBeGreaterThan(gap().end);
    });

    it.each(['sm', 'md', 'lg', 'xl'])(
      'keeps the thumb inside the track at size %s',
      async (size) => {
        const { fixture, root } = mount(SWITCH(`size="${size}" [value]="true"`));
        await settle(fixture);
        const track = rect(root, '.ck-switch__track');
        const thumb = rect(root, '.ck-switch__thumb');
        expect(thumb.left).toBeGreaterThanOrEqual(track.left);
        expect(thumb.right).toBeLessThanOrEqual(track.right);
        expect(thumb.top).toBeGreaterThanOrEqual(track.top);
        expect(thumb.bottom).toBeLessThanOrEqual(track.bottom);
      },
    );

    it('wraps a very long label inside the row without pushing the switch out', async () => {
      const long = 'Upload every finished ride automatically, '.repeat(12);
      const { fixture, root } = mount(`<div style="inline-size:240px">${SWITCH('', long)}</div>`);
      await settle(fixture);
      const row = rect(root, '.ck-switch');
      expect(query(root, '.ck-switch').scrollWidth).toBeLessThanOrEqual(Math.ceil(row.width));
      expect(rect(root, '.ck-switch__track').right).toBeLessThanOrEqual(row.right + 0.5);
      expect(rect(root, '.ck-switch__track').width).toBe(44);
    });

    it('breaks an unbreakable long word instead of overflowing', async () => {
      const { fixture, root } = mount(
        `<div style="inline-size:200px">${SWITCH('', 'x'.repeat(200))}</div>`,
      );
      await settle(fixture);
      expect(query(root, '.ck-switch').scrollWidth).toBeLessThanOrEqual(200);
    });

    it('shows a focus ring on the track for the keyboard only', async () => {
      const { fixture, root } = mount(`<button id="before">Before</button>${SWITCH()}`);
      await settle(fixture);
      await userEvent.click(query(root, '.ck-switch__text'));
      expect(getComputedStyle(query(root, '.ck-switch__track')).outlineStyle).toBe('none');
      query(root, '#before').focus();
      await userEvent.tab();
      expect(document.activeElement).toBe(inputOf(root));
      expect(getComputedStyle(query(root, '.ck-switch__track')).outlineStyle).toBe('solid');
    });

    it('fits a phone viewport', async () => {
      await page.viewport(390, 844);
      try {
        const { fixture, root } = mount(SWITCH('', `Auto-upload ${HINT}`));
        await settle(fixture);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
        expect(rect(root, '.ck-switch').right).toBeLessThanOrEqual(390);
      } finally {
        await page.viewport(800, 600);
      }
    });
  });

  describe('textless switch', () => {
    it('is only as wide as the switch, in a block container', async () => {
      const { fixture, root } = mount(
        `<div style="inline-size:300px">${SWITCH('aria-label="Audio cues"', '')}</div>`,
      );
      await settle(fixture);
      const row = query(root, '.ck-switch').getBoundingClientRect();
      const track = query(root, '.ck-switch__track').getBoundingClientRect();
      expect(track.left).toBeCloseTo(row.left, 0);
      expect(row.width).toBeLessThanOrEqual(track.width + 1);
      const hit = document.elementFromPoint(row.left + 250, row.top + row.height / 2);
      expect(hit?.closest('.ck-switch')).toBeNull();
    });
  });

  describe('forced colors', () => {
    const forced = async (template: string) => {
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      const mounted = mount(template);
      await settle(mounted.fixture);
      return mounted;
    };
    const style = (root: HTMLElement, selector: string) => getComputedStyle(query(root, selector));

    it('draws the off switch with a CanvasText border and thumb on a Canvas track', async () => {
      const { root } = await forced(SWITCH());
      expect(style(root, '.ck-switch__track').borderTopColor).toBe(
        resolveColor(root, 'CanvasText'),
      );
      expect(style(root, '.ck-switch__track').backgroundColor).toBe(resolveColor(root, 'Canvas'));
      expect(style(root, '.ck-switch__thumb').backgroundColor).toBe(
        resolveColor(root, 'CanvasText'),
      );
    });

    it('draws the on switch with a Highlight track and a HighlightText thumb', async () => {
      const { root } = await forced('<ck-switch [value]="true">Audio</ck-switch>');
      expect(style(root, '.ck-switch__track').backgroundColor).toBe(
        resolveColor(root, 'Highlight'),
      );
      expect(style(root, '.ck-switch__track').borderTopColor).toBe(resolveColor(root, 'Highlight'));
      expect(style(root, '.ck-switch__thumb').backgroundColor).toBe(
        resolveColor(root, 'HighlightText'),
      );
    });

    it('draws a disabled and a fieldset-disabled switch in GrayText, and an enabled hint not', async () => {
      const { root } = await forced(
        `<fieldset disabled>${SWITCH('', `Locked ${HINT}`)}</fieldset>
         ${SWITCH('disabled', `Off ${HINT}`)}
         ${SWITCH('', `Live ${HINT}`)}`,
      );
      const gray = resolveColor(root, 'GrayText');
      const [fieldset, disabled, live] = Array.from(root.querySelectorAll('ck-switch'));
      const of = (host: Element, selector: string) =>
        getComputedStyle(host.querySelector(selector)!);
      for (const host of [fieldset, disabled]) {
        expect(of(host, '.ck-switch').color).toBe(gray);
        expect(of(host, 'ck-switch-hint').color).toBe(gray);
        expect(of(host, '.ck-switch__track').borderTopColor).toBe(gray);
        expect(of(host, '.ck-switch__thumb').backgroundColor).toBe(gray);
      }
      expect(of(live, 'ck-switch-hint').color).not.toBe(gray);
      expect(of(live, '.ck-switch').color).not.toBe(gray);
    });

    it('draws the keyboard focus ring in Highlight at the token width', async () => {
      const { root } = await forced(`<button id="before">Before</button>${SWITCH()}`);
      query(root, '#before').focus();
      await userEvent.tab();
      const track = style(root, '.ck-switch__track');
      expect(track.outlineColor).toBe(resolveColor(root, 'Highlight'));
      expect(track.outlineStyle).toBe('solid');
      expect(track.outlineWidth).toBe('2px');
      expect(track.outlineOffset).toBe('2px');
    });
  });

  describe('reduced motion', () => {
    const MOTION = DARK_TOKENS.replace('--ck-duration-normal:0ms', '--ck-duration-normal:200ms');

    it('moves with a transition normally and with none under reduced motion', async () => {
      const normal = mount(SWITCH(), undefined, undefined, MOTION);
      await settle(normal.fixture);
      expect(
        getComputedStyle(query(normal.root, '.ck-switch__thumb')).transitionDuration,
      ).toContain('0.2s');
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      const reduced = mount(SWITCH(), undefined, undefined, MOTION);
      await settle(reduced.fixture);
      for (const selector of ['.ck-switch__track', '.ck-switch__thumb']) {
        expect(getComputedStyle(query(reduced.root, selector)).transitionDuration).toBe('0s');
      }
    });
  });

  describe('accessibility', () => {
    it.each([['on'], ['off']])('has no axe violations in the %s state (light)', async (state) => {
      const { fixture, root } = mount(
        `<ck-switch [value]="${state === 'on'}">Auto-upload ${HINT}</ck-switch>
         <ck-switch disabled>Disabled</ck-switch>`,
      );
      await settle(fixture);
      await expectNoAxeViolations(root);
    });

    it.each([['on'], ['off']])('has no axe violations in the %s state (dark)', async (state) => {
      const { fixture, root } = mount(
        `<ck-switch [value]="${state === 'on'}">Auto-upload ${HINT}</ck-switch>
         <ck-switch disabled>Disabled</ck-switch>`,
        undefined,
        undefined,
        DARK_TOKENS,
      );
      await settle(fixture);
      await expectNoAxeViolations(root);
    });

    it('has no axe violations for a switch named only by aria-label', async () => {
      const { fixture, root } = mount('<ck-switch aria-label="Audio cues"></ck-switch>');
      await settle(fixture);
      await expectNoAxeViolations(root);
    });
  });
});
