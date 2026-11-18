import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CK_SIZES, CkSize } from '@ckui/core';
import { mount, query, segmentsOf, settle } from '../testing/segmented-host';

const GAP = 4;
const rect = (element: Element) => element.getBoundingClientRect();

const group = (attributes: string, labels: readonly string[]) =>
  `<ck-segmented aria-label="Unit" ${attributes}>${labels
    .map((label, index) => `<ck-segment value="${index}">${label}</ck-segment>`)
    .join('')}</ck-segmented>`;

const inBox = (width: number, content: string, direction = 'ltr') =>
  `<div id="box" dir="${direction}" style="inline-size: ${width}px">${content}</div>`;

const ICON = '<svg aria-hidden="true" viewBox="0 0 16 16"><path d="M0 0h16v16H0z" /></svg>';

const labelsOf = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('.ck-segment__label'));
const isCompact = (root: HTMLElement) =>
  query(root, 'ck-segmented').classList.contains('ck-segmented--compact');
const truncated = (root: HTMLElement) =>
  labelsOf(root).filter((label) => label.scrollWidth > label.clientWidth);
const widthsOf = (root: HTMLElement) => segmentsOf(root).map((segment) => rect(segment).width);
const resize = (root: HTMLElement, width: number) =>
  (query(root, '#box').style.inlineSize = `${width}px`);

/** Lets the resize observer and the effects it triggers run. */
async function frames(count = 3): Promise<void> {
  for (let frame = 0; frame < count; frame += 1) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

function expectIndicatorOn(root: HTMLElement, index: number, rtl = false, gap = GAP): void {
  const indicator = rect(query(root, '.ck-segmented__indicator'));
  const segment = rect(segmentsOf(root)[index]);
  const track = rect(query(root, 'ck-segmented'));
  expect(indicator.width, `width on ${index}`).toBeCloseTo(segment.width - 2 * gap, 0);
  expect(indicator.height).toBeCloseTo(track.height - 2 * gap, 0);
  expect(indicator.top).toBeCloseTo(track.top + gap, 0);
  if (rtl) {
    expect(indicator.right, `right on ${index}`).toBeCloseTo(segment.right - gap, 0);
  } else {
    expect(indicator.left, `left on ${index}`).toBeCloseTo(segment.left + gap, 0);
  }
}

const SETS = [
  ['ERG', 'Widerstand', 'Frei'],
  ['ERG', 'Resistance', 'Free'],
  ['Vordefiniert', 'Meine', 'Geteilt'],
] as const;

describe('CkSegmented widths', () => {
  afterEach(() => {
    document.body.replaceChildren();
    TestBed.resetTestingModule();
  });

  describe('labels at phone width', () => {
    it.each(SETS)('shows %s, %s and %s in full at 328px, fullWidth, md', async (...labels) => {
      const { fixture, root } = mount(inBox(328, group('fullWidth value="0"', labels)));
      await settle(fixture);
      await frames();
      expect(truncated(root).map((label) => label.textContent)).toEqual([]);
      expect(isCompact(root)).toBe(false);
      const track = query(root, 'ck-segmented');
      expect(rect(track).width).toBe(328);
      expect(track.scrollWidth).toBeLessThanOrEqual(track.clientWidth);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
      expect(widthsOf(root).reduce((sum, width) => sum + width, 0)).toBeCloseTo(328, 0);
      for (const [index, segment] of segmentsOf(root).entries()) {
        expect(rect(labelsOf(root)[index]).left).toBeGreaterThanOrEqual(rect(segment).left);
        expect(rect(labelsOf(root)[index]).right).toBeLessThanOrEqual(rect(segment).right);
      }
    });

    it('grows the column of a label that exceeds its share and shrinks the others', async () => {
      const labels = ['Vordefinierte Programme', 'Meine', 'Geteilt'];
      const { fixture, root } = mount(inBox(328, group('fullWidth value="0"', labels)));
      await settle(fixture);
      await frames();
      expect(isCompact(root)).toBe(false);
      expect(truncated(root)).toEqual([]);
      const [long, ...others] = widthsOf(root);
      expect(long).toBeGreaterThan(328 / 3 + 1);
      for (const width of others) {
        expect(width).toBeLessThan(328 / 3);
      }
    });

    it('also works for the inline control inside a narrow container', async () => {
      const { fixture, root } = mount(inBox(328, group('value="1"', SETS[0])));
      await settle(fixture);
      await frames();
      expect(truncated(root)).toEqual([]);
      expect(rect(query(root, 'ck-segmented')).width).toBeLessThanOrEqual(328);
    });

    it('is as wide as the widest label times the count for the inline control when there is room', async () => {
      const { fixture, root } = mount(inBox(600, group('value="1"', SETS[0])));
      await settle(fixture);
      const widths = widthsOf(root);
      expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(0.5);
      expect(truncated(root)).toEqual([]);
    });

    it('takes a tighter padding token on the group or an ancestor', async () => {
      const { fixture, root } = mount(inBox(600, group('value="0"', SETS[2])));
      await settle(fixture);
      const before = rect(query(root, 'ck-segmented')).width;
      root.style.setProperty('--ck-segmented-padding-inline', '4px');
      await settle(fixture);
      expect(getComputedStyle(segmentsOf(root)[0]).paddingInlineStart).toBe('4px');
      expect(rect(query(root, 'ck-segmented')).width).toBeCloseTo(before - 3 * 2 * 8, 0);
    });

    it('falls back to the size padding without the token and never declares it', async () => {
      const { fixture, root } = mount(group('value="0" size="lg"', ['A', 'B']));
      await settle(fixture);
      expect(getComputedStyle(segmentsOf(root)[0]).paddingInlineStart).toBe('16px');
      expect(
        getComputedStyle(query(root, 'ck-segmented')).getPropertyValue(
          '--ck-segmented-padding-inline',
        ),
      ).toBe('');
    });
  });

  describe('equal widths', () => {
    it('keeps the columns equal while every label fits', async () => {
      const { fixture, root } = mount(
        inBox(420, group('fullWidth value="0"', ['Day', 'Week', 'Month'])),
      );
      await settle(fixture);
      await frames();
      expect(widthsOf(root)).toEqual([140, 140, 140]);
    });

    it('keeps them equal with one longer label that still fits its share', async () => {
      const { fixture, root } = mount(
        inBox(600, group('fullWidth value="0"', ['Day', 'A rather longer label', 'Mid'])),
      );
      await settle(fixture);
      expect(widthsOf(root)).toEqual([200, 200, 200]);
    });
  });

  describe('indicator placement', () => {
    const cases: [string, string, string, boolean][] = [
      ['fullWidth', 'fullWidth', 'ltr', false],
      ['inline', '', 'ltr', false],
      ['fullWidth in RTL', 'fullWidth', 'rtl', true],
      ['inline in RTL', '', 'rtl', true],
    ];

    describe.each(cases)('%s', (_name, attributes, direction, rtl) => {
      it.each(CK_SIZES)('sits on every segment with unequal widths at %s', async (size: CkSize) => {
        const { fixture, host, root } = mount(
          inBox(
            328,
            group(`${attributes} size="${size}" [value]="objectValue()"`, SETS[2]),
            direction,
          ),
        );
        for (const index of [0, 1, 2, 1, 0]) {
          host.objectValue.set(String(index));
          await settle(fixture);
          expectIndicatorOn(root, index, rtl);
        }
      });
    });

    it('is on its segment from the first render, without script', () => {
      const { root } = mount(inBox(328, group('fullWidth value="2"', SETS[2])));
      expectIndicatorOn(root, 2);
    });

    it('follows the segments when the container is resized, compact or not', async () => {
      const { fixture, root } = mount(inBox(500, group('fullWidth value="1"', SETS[0])));
      await settle(fixture);
      for (const width of [500, 330, 260, 180, 120, 420, 700]) {
        resize(root, width);
        await frames();
        await settle(fixture);
        expectIndicatorOn(root, 1);
      }
    });

    it('follows a change of the padding token used for the inset', async () => {
      const { fixture, root } = mount(inBox(328, group('fullWidth value="2"', SETS[2])));
      root.style.setProperty('--ck-segmented-padding', '2px');
      await settle(fixture);
      expectIndicatorOn(root, 2, false, 2);
    });

    it('stays on the checked segment when a segment is inserted before it', async () => {
      const { fixture, host, root } = mount(
        inBox(
          328,
          `<ck-segmented aria-label="Unit" fullWidth value="b">@for (item of items(); track item) {<ck-segment [value]="item">{{ item }}</ck-segment>}</ck-segmented>`,
        ),
      );
      await settle(fixture);
      host.items.set(['x', 'a', 'b', 'c']);
      await settle(fixture);
      expectIndicatorOn(root, 2);
    });
  });

  describe('compact fallback', () => {
    const LONG = [
      'A label with many ordinary words',
      'Another label that is just as long',
      'Third',
    ];

    it('switches to equal columns with an ellipsis when the labels cannot fit at all', async () => {
      const { fixture, root } = mount(inBox(200, group('fullWidth value="0"', LONG)));
      await settle(fixture);
      await expect.poll(() => isCompact(root)).toBe(true);
      const track = query(root, 'ck-segmented');
      expect(rect(track).width).toBe(200);
      expect(track.scrollWidth).toBeLessThanOrEqual(track.clientWidth);
      const widths = widthsOf(root);
      expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
      expect(truncated(root).length).toBeGreaterThan(0);
      expect(getComputedStyle(labelsOf(root)[0]).textOverflow).toBe('ellipsis');
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
      expectIndicatorOn(root, 0);
    });

    it('stays inside the container for the inline control too', async () => {
      const { fixture, root } = mount(inBox(120, group('value="1"', LONG)));
      await settle(fixture);
      await expect.poll(() => isCompact(root)).toBe(true);
      const track = query(root, 'ck-segmented');
      expect(rect(track).width).toBeLessThanOrEqual(120);
      expect(track.scrollWidth).toBeLessThanOrEqual(track.clientWidth);
      expect(rect(track).height).toBe(40);
    });

    it('restores the content widths when the container widens, and back again', async () => {
      const { fixture, root } = mount(inBox(200, group('fullWidth value="0"', LONG)));
      await settle(fixture);
      await expect.poll(() => isCompact(root)).toBe(true);
      resize(root, 900);
      await expect.poll(() => isCompact(root)).toBe(false);
      expect(truncated(root)).toEqual([]);
      resize(root, 200);
      await expect.poll(() => isCompact(root)).toBe(true);
      resize(root, 900);
      await expect.poll(() => isCompact(root)).toBe(false);
    });

    it('switches exactly where the natural widths stop fitting', async () => {
      const { fixture, root } = mount(inBox(2000, group('fullWidth value="0"', SETS[2])));
      await settle(fixture);
      await frames();
      let fits = 2000;
      let needs = 100;
      while (fits - needs > 1) {
        const middle = Math.round((fits + needs) / 2);
        resize(root, middle);
        await frames();
        if (isCompact(root)) {
          needs = middle;
        } else {
          fits = middle;
        }
      }
      expect(fits).toBeGreaterThan(150);
      expect(fits).toBeLessThan(330);
      resize(root, fits);
      await frames();
      expect(isCompact(root)).toBe(false);
      expect(truncated(root)).toEqual([]);
      resize(root, fits - 3);
      await frames();
      expect(isCompact(root)).toBe(true);
    });

    it('counts an icon and its gap in the natural width', async () => {
      const { fixture, root } = mount(
        inBox(
          200,
          `<ck-segmented aria-label="Unit" fullWidth value="a"><ck-segment value="a">${ICON}Widerstand</ck-segment><ck-segment value="b">${ICON}Frei</ck-segment><ck-segment value="c">${ICON}Meine</ck-segment></ck-segmented>`,
        ),
      );
      await settle(fixture);
      await expect.poll(() => isCompact(root)).toBe(true);
      resize(root, 420);
      await expect.poll(() => isCompact(root)).toBe(false);
      expect(truncated(root)).toEqual([]);
    });

    it('never goes compact while the control is not rendered, and measures once it is', async () => {
      const { fixture, root } = mount(
        `<div id="box" style="display: none; inline-size: 100px">${group('fullWidth value="0"', LONG)}</div>`,
      );
      await settle(fixture);
      await frames();
      expect(isCompact(root)).toBe(false);
      query(root, '#box').style.display = 'block';
      await expect.poll(() => isCompact(root)).toBe(true);
    });

    it('takes up new labels when segments are added', async () => {
      const { fixture, host, root } = mount(
        inBox(
          240,
          `<ck-segmented aria-label="Unit" fullWidth value="a">@for (item of items(); track item) {<ck-segment [value]="item">{{ item }}</ck-segment>}</ck-segmented>`,
        ),
      );
      await settle(fixture);
      await frames();
      expect(isCompact(root)).toBe(false);
      host.items.set(['a', 'a very long label indeed', 'another long label here']);
      await settle(fixture);
      await expect.poll(() => isCompact(root)).toBe(true);
    });

    it('leaves compact when a label gets shorter while the boxes stay the same size', async () => {
      const { fixture, root } = mount(inBox(260, group('fullWidth value="0"', LONG)));
      await settle(fixture);
      await expect.poll(() => isCompact(root)).toBe(true);
      const before = widthsOf(root);
      for (const [index, label] of labelsOf(root).entries()) {
        label.textContent = ['One', 'Two', 'Three'][index];
      }
      await expect.poll(() => isCompact(root)).toBe(false);
      expect(widthsOf(root)).toEqual(before);
      labelsOf(root)[0].textContent = LONG[0];
      await expect.poll(() => isCompact(root)).toBe(true);
    });

    it('leaves compact when a font swap makes the text narrower without moving a box', async () => {
      const { fixture, root } = mount(inBox(328, group('fullWidth value="0"', SETS[2])));
      root.style.setProperty('--ck-control-font-size-md', '34px');
      await settle(fixture);
      await expect.poll(() => isCompact(root)).toBe(true);
      const before = widthsOf(root);
      root.style.setProperty('--ck-control-font-size-md', '16px');
      document.fonts.dispatchEvent(new Event('loadingdone'));
      await expect.poll(() => isCompact(root)).toBe(false);
      expect(truncated(root)).toEqual([]);
      expect(before).toHaveLength(3);
      root.style.setProperty('--ck-control-font-size-md', '34px');
      document.fonts.dispatchEvent(new Event('loadingdone'));
      await expect.poll(() => isCompact(root)).toBe(true);
    });

    it('follows a change of the size input, which changes the font', async () => {
      const { fixture, host, root } = mount(
        inBox(328, group('fullWidth value="0" [size]="size()"', SETS[2])),
        (prepared) => prepared.size.set('xl'),
      );
      root.style.setProperty('--ck-control-font-size-xl', '34px');
      await settle(fixture);
      await expect.poll(() => isCompact(root)).toBe(true);
      host.size.set('md');
      await settle(fixture);
      await expect.poll(() => isCompact(root)).toBe(false);
    });

    it('stops listening for content changes after destroy', async () => {
      const { fixture, root } = mount(inBox(260, group('fullWidth value="0"', LONG)));
      await settle(fixture);
      await expect.poll(() => isCompact(root)).toBe(true);
      const track = query(root, 'ck-segmented');
      const measure = vi.spyOn(track, 'getBoundingClientRect');
      fixture.destroy();
      measure.mockClear();
      document.fonts.dispatchEvent(new Event('loadingdone'));
      labelsOf(root)[0].textContent = 'Changed';
      await frames();
      expect(measure).not.toHaveBeenCalled();
    });

    it('makes the same decision inside a scaled ancestor as outside', async () => {
      const { fixture, root } = mount(
        `<div id="plain" style="inline-size: 300px">${group('fullWidth value="0"', SETS[2])}</div>
         <div id="scaled" style="inline-size: 300px; transform: scale(0.96); transform-origin: top left">${group('fullWidth value="0"', SETS[2])}</div>`,
      );
      await settle(fixture);
      const state = (id: string) =>
        query(root, `#${id} ck-segmented`).classList.contains('ck-segmented--compact');
      let flips = 0;
      for (let width = 340; width >= 150; width -= 3) {
        query(root, '#plain').style.inlineSize = `${width}px`;
        query(root, '#scaled').style.inlineSize = `${width}px`;
        await frames(2);
        expect(state('scaled'), `at ${width}px`).toBe(state('plain'));
        flips += state('plain') ? 1 : 0;
      }
      expect(flips).toBeGreaterThan(5);
      expect(flips).toBeLessThan(60);
    });

    describe('observer', () => {
      const original = window.ResizeObserver;
      let created: { disconnect: number; observed: number; fire: () => void }[] = [];

      beforeEach(() => {
        created = [];
        window.ResizeObserver = class {
          private readonly record = { disconnect: 0, observed: 0, fire: (): void => undefined };
          constructor(callback: ResizeObserverCallback) {
            this.record.fire = () => callback([], this as unknown as ResizeObserver);
            created.push(this.record);
          }
          observe(): void {
            this.record.observed += 1;
          }
          unobserve(): void {
            return undefined;
          }
          disconnect(): void {
            this.record.disconnect += 1;
          }
        } as unknown as typeof ResizeObserver;
      });

      afterEach(() => {
        window.ResizeObserver = original;
      });

      it('is created once, observes the group and every segment, and is disconnected on destroy', async () => {
        const { fixture } = mount(inBox(328, group('fullWidth value="0"', SETS[0])));
        await settle(fixture);
        expect(created).toHaveLength(1);
        expect(created[0].observed).toBeGreaterThanOrEqual(4);
        const before = created[0].disconnect;
        fixture.destroy();
        expect(created[0].disconnect).toBeGreaterThan(before);
      });

      it('does nothing when a stale callback fires after destroy', async () => {
        const { fixture, root } = mount(inBox(100, group('fullWidth value="0"', SETS[2])));
        await settle(fixture);
        const track = query(root, 'ck-segmented');
        track.classList.remove('ck-segmented--compact');
        const measure = vi.spyOn(track, 'getBoundingClientRect');
        fixture.destroy();
        measure.mockClear();
        created[0].fire();
        expect(measure).not.toHaveBeenCalled();
      });

      it('does not create an observer on the server', async () => {
        TestBed.configureTestingModule({
          providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
        });
        const { fixture, root } = mount(group('value="1"', SETS[0]));
        await settle(fixture);
        expect(created).toHaveLength(0);
        expect(isCompact(root)).toBe(false);
        fixture.destroy();
      });
    });
  });

  describe('server rendering', () => {
    it('renders markup whose indicator CSS places without script, with no errors', async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { fixture, root } = mount(inBox(328, group('fullWidth value="1"', SETS[2])));
      await settle(fixture);
      const track = query(root, 'ck-segmented');
      expect(track.style.getPropertyValue('--_ck-segmented-column')).toBe('2');
      expect(isCompact(root)).toBe(false);
      expectIndicatorOn(root, 1);
      expect(errors).not.toHaveBeenCalled();
      errors.mockRestore();
      fixture.destroy();
    });

    it('keeps its placement in markup that was rendered earlier, with no component behind it', async () => {
      const first = mount(inBox(328, group('fullWidth value="2"', SETS[2])));
      await settle(first.fixture);
      const markup = first.root.innerHTML;
      const style = first.root.getAttribute('style') ?? '';
      // The first group stays alive: it keeps the component stylesheet in the document.
      const holder = document.createElement('div');
      holder.setAttribute('style', style);
      holder.innerHTML = markup;
      document.body.appendChild(holder);
      expectIndicatorOn(holder, 2);
    });
  });
});
