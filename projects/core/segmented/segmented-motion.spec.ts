import { TestBed } from '@angular/core/testing';
import { CkMedia } from '@ckui/core/internal';
import { cdp, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import { mount, query, segmentsOf, settle } from '../testing/segmented-host';

const GAP = 4;
const rect = (element: Element) => element.getBoundingClientRect();

const group = (attributes: string, labels: readonly string[] = ['ERG', 'Widerstand', 'Frei']) =>
  `<ck-segmented aria-label="Unit" ${attributes}>${labels
    .map((label, index) => `<ck-segment value="${index}">${label}</ck-segment>`)
    .join('')}</ck-segmented>`;

const inBox = (content: string, direction = 'ltr', width = 328) =>
  `<div id="box" dir="${direction}" style="inline-size: ${width}px">${content}</div>`;

const indicatorOf = (root: HTMLElement) => query(root, '.ck-segmented__indicator');
const animationsOf = (root: HTMLElement) => indicatorOf(root).getAnimations();

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

async function emulate(features: { name: string; value: string }[]): Promise<void> {
  await (cdp() as unknown as Session).send('Emulation.setEmulatedMedia', { features });
}

/** Where the indicator is expected to be on segment `index`: the segment's box inset by the gap. */
function expectedBox(root: HTMLElement, index: number) {
  const segment = rect(segmentsOf(root)[index]);
  return { left: segment.left + GAP, right: segment.right - GAP, width: segment.width - 2 * GAP };
}

async function finish(root: HTMLElement): Promise<void> {
  await Promise.all(animationsOf(root).map((animation) => animation.finished));
}

/** Freezes the running animation at its start and reports where the indicator is drawn. */
function startBox(root: HTMLElement) {
  const [animation] = animationsOf(root);
  animation.pause();
  animation.currentTime = 0;
  return rect(indicatorOf(root));
}

describe('CkSegmented indicator motion', () => {
  afterEach(async () => {
    document.body.replaceChildren();
    TestBed.resetTestingModule();
    await emulate([]);
  });

  async function setup(
    attributes = '[value]="objectValue()"',
    direction = 'ltr',
    duration = '300ms',
  ) {
    const mounted = mount(inBox(group(attributes), direction), (host) => host.objectValue.set('0'));
    mounted.root.style.setProperty('--ck-duration-normal', duration);
    await settle(mounted.fixture);
    return mounted;
  }

  it('slides on a click, over the duration token and the easing token', async () => {
    const { fixture, root } = await setup();
    expect(animationsOf(root)).toHaveLength(0);
    root.style.setProperty('--ck-ease-standard', 'cubic-bezier(0.4, 0, 0.2, 1)');
    await userEvent.click(segmentsOf(root)[2]);
    await settle(fixture);
    const animations = animationsOf(root);
    expect(animations).toHaveLength(1);
    const timing = animations[0].effect!.getTiming();
    expect(timing.duration).toBe(300);
    expect(timing.easing).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
    await finish(root);
    expect(animationsOf(root)).toHaveLength(0);
  });

  it('starts on the old segment and ends on the new one, with unequal widths', async () => {
    const { fixture, host, root } = await setup();
    host.objectValue.set('0');
    await settle(fixture);
    await finish(root);
    host.objectValue.set('1');
    await settle(fixture);
    const start = startBox(root);
    const old = expectedBox(root, 0);
    expect(start.left).toBeCloseTo(old.left, 0);
    expect(start.width).toBeCloseTo(old.width, 0);
    animationsOf(root)[0].finish();
    const end = expectedBox(root, 1);
    expect(rect(indicatorOf(root)).left).toBeCloseTo(end.left, 0);
    expect(rect(indicatorOf(root)).width).toBeCloseTo(end.width, 0);
  });

  it('starts on the old segment in right-to-left text too', async () => {
    const { fixture, host, root } = await setup('[value]="objectValue()"', 'rtl');
    host.objectValue.set('0');
    await settle(fixture);
    await finish(root);
    host.objectValue.set('2');
    await settle(fixture);
    const start = startBox(root);
    const old = expectedBox(root, 0);
    expect(start.right).toBeCloseTo(old.right, 0);
    expect(start.width).toBeCloseTo(old.width, 0);
    animationsOf(root)[0].finish();
    const end = expectedBox(root, 2);
    expect(rect(indicatorOf(root)).right).toBeCloseTo(end.right, 0);
    expect(rect(indicatorOf(root)).width).toBeCloseTo(end.width, 0);
  });

  it('slides for a programmatic change as well', async () => {
    const { fixture, host, root } = await setup();
    host.objectValue.set('0');
    await settle(fixture);
    host.objectValue.set('2');
    await settle(fixture);
    expect(animationsOf(root)).toHaveLength(1);
  });

  it('does not slide on the first render', async () => {
    const { fixture, root } = mount(inBox(group('value="2"')));
    root.style.setProperty('--ck-duration-normal', '300ms');
    expect(animationsOf(root)).toHaveLength(0);
    await settle(fixture);
    expect(animationsOf(root)).toHaveLength(0);
  });

  it('does not slide in from the start when the value was null', async () => {
    const { fixture, host, root } = await setup();
    host.objectValue.set('0');
    await settle(fixture);
    await finish(root);
    host.objectValue.set(null);
    await settle(fixture);
    host.objectValue.set('2');
    await settle(fixture);
    expect(animationsOf(root)).toHaveLength(0);
    const end = expectedBox(root, 2);
    expect(rect(indicatorOf(root)).left).toBeCloseTo(end.left, 0);
  });

  it('does not slide when the value is first set after a null first render', async () => {
    const { fixture, host, root } = mount(inBox(group('[value]="objectValue()"')));
    root.style.setProperty('--ck-duration-normal', '300ms');
    await settle(fixture);
    host.objectValue.set('1');
    await settle(fixture);
    expect(animationsOf(root)).toHaveLength(0);
  });

  it('does not slide under reduced motion, and leaves the indicator on the new segment', async () => {
    const { fixture, host, root } = await setup();
    host.objectValue.set('0');
    await settle(fixture);
    await finish(root);
    await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await expect.poll(() => TestBed.inject(CkMedia).reducedMotion()).toBe(true);
    await settle(fixture);
    host.objectValue.set('2');
    await settle(fixture);
    expect(animationsOf(root)).toHaveLength(0);
    expect(rect(indicatorOf(root)).left).toBeCloseTo(expectedBox(root, 2).left, 0);
  });

  it('slides again once reduced motion is switched off', async () => {
    const { fixture, host, root } = await setup();
    host.objectValue.set('0');
    await settle(fixture);
    await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await expect.poll(() => TestBed.inject(CkMedia).reducedMotion()).toBe(true);
    await emulate([]);
    await expect.poll(() => TestBed.inject(CkMedia).reducedMotion()).toBe(false);
    await settle(fixture);
    host.objectValue.set('1');
    await settle(fixture);
    expect(animationsOf(root)).toHaveLength(1);
  });

  it('does not slide with a duration of zero', async () => {
    const { fixture, host, root } = await setup('[value]="objectValue()"', 'ltr', '0ms');
    host.objectValue.set('0');
    await settle(fixture);
    host.objectValue.set('2');
    await settle(fixture);
    expect(animationsOf(root)).toHaveLength(0);
    expect(rect(indicatorOf(root)).left).toBeCloseTo(expectedBox(root, 2).left, 0);
  });

  it('falls back to a sensible duration for a token it cannot read', async () => {
    const { fixture, host, root } = await setup('[value]="objectValue()"', 'ltr', 'soon');
    host.objectValue.set('0');
    await settle(fixture);
    host.objectValue.set('1');
    await settle(fixture);
    expect(animationsOf(root)[0].effect!.getTiming().duration).toBe(200);
  });

  it('reads seconds from the token', async () => {
    const { fixture, host, root } = await setup('[value]="objectValue()"', 'ltr', '0.25s');
    host.objectValue.set('0');
    await settle(fixture);
    host.objectValue.set('1');
    await settle(fixture);
    expect(animationsOf(root)[0].effect!.getTiming().duration).toBe(250);
  });

  it('ends on the last selection after rapid repeated selection, with one animation at a time', async () => {
    const { fixture, root } = await setup();
    const segments = segmentsOf(root);
    for (const index of [0, 1, 2, 0, 2, 1, 0, 2]) {
      await userEvent.click(segments[index]);
      await settle(fixture);
      expect(animationsOf(root).length).toBeLessThanOrEqual(1);
    }
    await finish(root);
    const end = expectedBox(root, 2);
    expect(rect(indicatorOf(root)).left).toBeCloseTo(end.left, 0);
    expect(rect(indicatorOf(root)).width).toBeCloseTo(end.width, 0);
    expect(animationsOf(root)).toHaveLength(0);
  });

  it('continues from where it is drawn when the selection changes mid-slide', async () => {
    const { fixture, host, root } = await setup('[value]="objectValue()"', 'ltr', '600ms');
    host.objectValue.set('0');
    await settle(fixture);
    host.objectValue.set('2');
    await settle(fixture);
    const [first] = animationsOf(root);
    first.pause();
    first.currentTime = 300;
    const drawn = rect(indicatorOf(root));
    host.objectValue.set('1');
    await settle(fixture);
    const start = startBox(root);
    expect(start.left).toBeCloseTo(drawn.left, 0);
    expect(start.width).toBeCloseTo(drawn.width, 0);
  });

  it('does not slide when only the position of the checked segment changed', async () => {
    const { fixture, host, root } = mount(
      inBox(
        `<ck-segmented aria-label="Unit" fullWidth value="b">@for (item of items(); track item) {<ck-segment [value]="item">{{ item }}</ck-segment>}</ck-segmented>`,
      ),
    );
    root.style.setProperty('--ck-duration-normal', '300ms');
    await settle(fixture);
    host.items.set(['x', 'a', 'b', 'c']);
    await settle(fixture);
    expect(animationsOf(root)).toHaveLength(0);
  });

  it('does not slide from a segment that was removed, and does not fail', async () => {
    const { fixture, host, root } = mount(
      inBox(
        `<ck-segmented aria-label="Unit" fullWidth [value]="value()">@for (item of items(); track item) {<ck-segment [value]="item">{{ item }}</ck-segment>}</ck-segmented>`,
      ),
    );
    root.style.setProperty('--ck-duration-normal', '300ms');
    host.value.set('a');
    await settle(fixture);
    host.items.set(['b', 'c']);
    host.value.set('c');
    await settle(fixture);
    expect(animationsOf(root)).toHaveLength(0);
    expect(rect(indicatorOf(root)).left).toBeCloseTo(expectedBox(root, 1).left, 0);
  });

  it('drops a running slide on destroy and does nothing afterwards', async () => {
    const { fixture, host, root } = await setup();
    host.objectValue.set('0');
    await settle(fixture);
    host.objectValue.set('2');
    await settle(fixture);
    const indicator = indicatorOf(root);
    expect(indicator.getAnimations()).toHaveLength(1);
    fixture.destroy();
    expect(indicator.getAnimations()).toHaveLength(0);
  });

  describe.each([
    ['light', ''],
    [
      'dark',
      '--ck-color-scheme:dark;--ck-color-control:rgb(36, 36, 44);--ck-color-control-border:rgb(150, 150, 165);--ck-color-surface-raised:rgb(60, 60, 72);--ck-color-fg:rgb(240, 240, 246);--ck-color-fg-muted:rgb(190, 190, 202);--ck-color-fg-disabled:rgb(135, 135, 148)',
    ],
  ])('accessibility in the %s theme', (_name, tokens) => {
    it('has no axe violations with unequal widths, truncated labels, and while sliding', async () => {
      const { fixture, host, root } = mount(
        `<div style="background: ${tokens ? 'rgb(18, 18, 24)' : 'rgb(255, 255, 255)'}; color: var(--ck-color-fg)">
          <div style="inline-size: 328px">${group('fullWidth [value]="objectValue()"', ['Vordefiniert', 'Meine', 'Geteilt'])}</div>
          <div style="inline-size: 160px">${group('fullWidth value="0"', ['A long label that is cut by an ellipsis', 'Another long label here', 'And a third one'])}</div>
        </div>`,
      );
      root.style.cssText += `;${tokens};--ck-duration-normal:300ms`;
      host.objectValue.set('0');
      await settle(fixture);
      await expectNoAxeViolations(root);
      host.objectValue.set('2');
      await settle(fixture);
      await expectNoAxeViolations(root);
      host.objectValue.set(null);
      await settle(fixture);
      await expectNoAxeViolations(root);
    });
  });
});
