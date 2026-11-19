import { TestBed } from '@angular/core/testing';
import { provideCkui } from '@ckui/core';
import { userEvent } from 'vitest/browser';
import { FieldHost, allRules, mount, query, settle } from '../testing/field-host';

const LINE = 24;
const PADDING = 14;

const heightOf = (element: HTMLElement): number => element.getBoundingClientRect().height;

function writeLines(textarea: HTMLTextAreaElement, count: number): void {
  textarea.value = Array.from({ length: count }, (_, index) => `line ${index + 1}`).join('\n');
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('CkInput', () => {
  afterEach(() => {
    document.body.removeAttribute('dir');
    document.body.replaceChildren();
    TestBed.resetTestingModule();
  });

  describe('standalone', () => {
    const standalone = '<input ckInput aria-label="Name" />';

    it('draws its own box at the control height with the standalone classes', async () => {
      const { fixture, root } = mount(standalone);
      await settle(fixture);
      const input = query<HTMLInputElement>(root, 'input');
      expect(input.classList.contains('ck-input')).toBe(true);
      expect(input.classList.contains('ck-input--standalone')).toBe(true);
      expect(input.classList.contains('ck-input--md')).toBe(true);
      expect(heightOf(input)).toBe(40);
      const style = getComputedStyle(input);
      expect(style.borderTopWidth).toBe('1px');
      expect(style.borderTopColor).toBe('rgb(120, 120, 130)');
      expect(style.borderTopLeftRadius).toBe('8px');
      expect(style.fontSize).toBe('16px');
    });

    it.each([
      ['sm', 32, '14px'],
      ['md', 40, '16px'],
      ['lg', 48, '18px'],
      ['xl', 60, '20px'],
    ])('takes the size input %s', async (size, height, fontSize) => {
      const { fixture, root } = mount(`<input ckInput size="${size}" aria-label="Name" />`);
      await settle(fixture);
      const input = query<HTMLInputElement>(root, 'input');
      expect(input.classList.contains(`ck-input--${size}`)).toBe(true);
      expect(heightOf(input)).toBe(height);
      expect(getComputedStyle(input).fontSize).toBe(fontSize);
    });

    it('uses the size from provideCkui when it has none of its own', async () => {
      TestBed.configureTestingModule({ providers: [provideCkui({ size: 'lg' })] });
      const { fixture, root } = mount(standalone);
      await settle(fixture);
      expect(query(root, 'input').classList.contains('ck-input--lg')).toBe(true);
    });

    it('takes its font size from the control token, which is what makes it 16px on touch', async () => {
      const { fixture, root } = mount(standalone);
      root.style.setProperty('--ck-control-font-size-md', '20px');
      await settle(fixture);
      expect(getComputedStyle(query(root, 'input')).fontSize).toBe('20px');
    });

    it('is not a field: no field classes, no wrapper', async () => {
      const { fixture, root } = mount(standalone);
      await settle(fixture);
      expect(root.querySelector('ck-field, .ck-field__box')).toBeNull();
      expect(query(root, 'input').parentElement).toBe(root);
    });

    it('marks an aria-invalid control with the danger border', async () => {
      const { fixture, root } = mount('<input ckInput aria-label="Name" aria-invalid="true" />');
      await settle(fixture);
      expect(getComputedStyle(query(root, 'input')).borderTopColor).toBe('rgb(200, 30, 30)');
    });

    it('shows the placeholder in the muted colour', async () => {
      const { fixture, root } = mount('<input ckInput aria-label="Name" placeholder="Jane" />');
      await settle(fixture);
      expect(getComputedStyle(query(root, 'input'), '::placeholder').color).toBe('rgb(80, 80, 90)');
    });

    it('looks disabled and shows a not-allowed cursor', async () => {
      const { fixture, root } = mount('<input ckInput aria-label="Name" disabled />');
      root.style.setProperty('--ck-color-fg-disabled', 'rgb(1, 2, 3)');
      await settle(fixture);
      const style = getComputedStyle(query(root, 'input'));
      expect(style.color).toBe('rgb(1, 2, 3)');
      expect(style.cursor).toBe('not-allowed');
    });

    it('shows the focus ring after keyboard focus', async () => {
      const { fixture, root } = mount(standalone);
      root.style.setProperty('--ck-focus-ring', '2px solid rgb(0, 0, 255)');
      root.style.setProperty('--ck-focus-ring-offset', '2px');
      await settle(fixture);
      await userEvent.tab();
      const style = getComputedStyle(query(root, 'input'));
      expect(style.outlineColor).toBe('rgb(0, 0, 255)');
      expect(style.outlineStyle).toBe('solid');
    });

    it('hides the native search decorations', () => {
      mount('<input ckInput type="search" aria-label="Find" />');
      const rule = allRules().find((candidate) =>
        candidate.selectorText.includes('::-webkit-search-cancel-button'),
      );
      expect(rule?.style.display).toBe('none');
    });

    it('is a textarea box with the control height for one row', async () => {
      const { fixture, root } = mount('<textarea ckInput rows="1" aria-label="Note"></textarea>');
      await settle(fixture);
      const textarea = query(root, 'textarea');
      expect(textarea.classList.contains('ck-input--textarea')).toBe(true);
      expect(heightOf(textarea)).toBe(40);
    });
  });

  describe('native attributes', () => {
    it('keeps type, inputmode, enterkeyhint, autocomplete and the rest on first render', async () => {
      const { fixture, root } = mount(`
        <ck-field>
          <label>Code</label>
          <input
            ckInput
            type="tel"
            inputmode="numeric"
            enterkeyhint="send"
            autocomplete="one-time-code"
            name="code"
            maxlength="6"
            pattern="[0-9]*"
          />
        </ck-field>
      `);
      const input = query<HTMLInputElement>(root, 'input');
      const before = Array.from(
        input.attributes,
        (attribute) => `${attribute.name}=${attribute.value}`,
      );
      await settle(fixture);
      for (const pair of [
        'type=tel',
        'inputmode=numeric',
        'enterkeyhint=send',
        'autocomplete=one-time-code',
        'name=code',
        'maxlength=6',
        'pattern=[0-9]*',
      ]) {
        expect(before).toContain(pair);
        expect(input.getAttribute(pair.split('=')[0])).toBe(pair.split('=')[1]);
      }
    });

    it('follows a dynamic type and keeps the typed text', async () => {
      const { fixture, host, root } = mount(`
        <ck-field>
          <label>Password</label>
          <input ckInput [attr.type]="type()" />
        </ck-field>
      `);
      host.type.set('password');
      await settle(fixture);
      const input = query<HTMLInputElement>(root, 'input');
      await userEvent.type(input, 'secret');
      host.type.set('text');
      await settle(fixture);
      expect(input.type).toBe('text');
      expect(input.value).toBe('secret');
      expect(query(root, 'ck-field').classList.contains('ck-field--floated')).toBe(true);
    });

    it('lets the consumer listen for input and keep their own classes', async () => {
      const { fixture, host, root } = mount(`
        <ck-field>
          <label>Name</label>
          <input ckInput class="mine" (input)="submits.update((count) => count + 1)" />
        </ck-field>
      `);
      await settle(fixture);
      const input = query<HTMLInputElement>(root, 'input');
      await userEvent.type(input, 'abc');
      expect(host.submits()).toBe(3);
      expect(input.classList.contains('mine')).toBe(true);
      expect(input.classList.contains('ck-input')).toBe(true);
    });

    it('gives an input without an id a unique one and keeps a given one', async () => {
      const { fixture, root } = mount(`
        <input ckInput aria-label="A" />
        <input ckInput aria-label="B" />
        <input ckInput aria-label="C" id="given" />
      `);
      await settle(fixture);
      const ids = Array.from(root.querySelectorAll('input'), (input) => input.id);
      expect(ids[2]).toBe('given');
      expect(ids[0]).not.toBe('');
      expect(ids[0]).not.toBe(ids[1]);
    });

    it('resolves a template reference to the native element, not to a class instance', async () => {
      const { fixture, host, root } = mount(`
        <ck-field>
          <label>Name</label>
          <input ckInput #name (input)="submits.set(name.value.length)" />
        </ck-field>
      `);
      await settle(fixture);
      await userEvent.type(query(root, 'input'), 'abcd');
      expect(host.submits()).toBe(4);
    });

    it('has no borders of its own inside a field', async () => {
      const { fixture, root } = mount(`
        <ck-field><label>Name</label><input ckInput /></ck-field>
      `);
      await settle(fixture);
      const style = getComputedStyle(query(root, 'input'));
      expect(style.borderTopWidth).toBe('0px');
      expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(style.fontSize).toBe('16px');
    });
  });

  describe('dev warning for a missing name', () => {
    const warnings = () => vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    it.each([
      ['aria-label', '<input ckInput aria-label="Name" />'],
      ['title', '<input ckInput title="Name" />'],
      ['a label for it', '<label for="x">Name</label><input ckInput id="x" />'],
      ['a wrapping label', '<label>Name <input ckInput /></label>'],
      [
        'aria-labelledby',
        '<span id="source">Name</span><input ckInput aria-labelledby="source" />',
      ],
    ])('does not warn when named through %s', async (_name, template) => {
      const warn = warnings();
      const { fixture } = mount(template);
      await settle(fixture);
      expect(warn).not.toHaveBeenCalled();
    });

    it.each([
      ['no name at all', '<input ckInput />'],
      ['an empty aria-label', '<input ckInput aria-label=" " />'],
      ['a label with no text', '<label for="x"></label><input ckInput id="x" />'],
      ['an unknown aria-labelledby', '<input ckInput aria-labelledby="missing" />'],
    ])('warns once for %s and names the element', async (_name, template) => {
      const warn = warnings();
      const { fixture, root } = mount(template);
      await settle(fixture);
      await settle(fixture);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('ckInput');
      expect(warn.mock.calls[0][1]).toBe(root.querySelector('input'));
    });

    it('does not warn for an input in a field, which warns about its label instead', async () => {
      const warn = warnings();
      const { fixture } = mount('<ck-field><label>Name</label><input ckInput /></ck-field>');
      await settle(fixture);
      expect(warn).not.toHaveBeenCalled();
    });

    it('does not warn when destroyed before the first render finished', async () => {
      const warn = warnings();
      TestBed.overrideComponent(FieldHost, { set: { template: '<input ckInput />' } });
      const fixture = TestBed.createComponent(FieldHost);
      fixture.destroy();
      await fixture.whenStable();
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe.each([
    ['field-sizing: content', false],
    ['the script fallback', true],
  ])('textarea autosize with %s', (_name, forceScript) => {
    beforeEach(() => {
      if (forceScript) {
        const original = CSS.supports.bind(CSS);
        vi.spyOn(CSS, 'supports').mockImplementation((...args: [string, string?]) =>
          args[0] === 'field-sizing' ? false : original(...(args as [string])),
        );
      }
    });

    const area = (attributes: string, field = true) =>
      field
        ? `<ck-field><label>Note</label><textarea ckInput autosize ${attributes}></textarea></ck-field>`
        : `<textarea ckInput autosize aria-label="Note" ${attributes}></textarea>`;

    async function textareaFor(template: string) {
      const mounted = mount(template);
      await settle(mounted.fixture);
      await settle(mounted.fixture);
      return { ...mounted, textarea: query<HTMLTextAreaElement>(mounted.root, 'textarea') };
    }

    it('uses the expected sizing path', async () => {
      const { textarea } = await textareaFor(area(''));
      expect(textarea.classList.contains('ck-input--autosize')).toBe(true);
      expect(textarea.classList.contains('ck-input--autosize-js')).toBe(forceScript);
      expect(getComputedStyle(textarea).resize).toBe('none');
    });

    it('starts at two rows and grows with the content', async () => {
      const { fixture, textarea } = await textareaFor(area(''));
      expect(heightOf(textarea)).toBe(2 * LINE + PADDING);
      writeLines(textarea, 3);
      await settle(fixture);
      expect(heightOf(textarea)).toBe(3 * LINE + PADDING);
      writeLines(textarea, 5);
      await settle(fixture);
      expect(heightOf(textarea)).toBe(5 * LINE + PADDING);
      writeLines(textarea, 1);
      await settle(fixture);
      expect(heightOf(textarea)).toBe(2 * LINE + PADDING);
    });

    it('starts at the rows attribute and lets minRows win over it', async () => {
      const withRows = await textareaFor(area('rows="3"'));
      expect(heightOf(withRows.textarea)).toBe(3 * LINE + PADDING);
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      const withMin = await textareaFor(area('rows="3" minRows="4"'));
      expect(heightOf(withMin.textarea)).toBe(4 * LINE + PADDING);
    });

    it('stops growing at maxRows and scrolls past it', async () => {
      const { fixture, textarea } = await textareaFor(area('minRows="2" maxRows="4"'));
      writeLines(textarea, 10);
      await settle(fixture);
      expect(heightOf(textarea)).toBe(4 * LINE + PADDING);
      expect(textarea.scrollHeight).toBeGreaterThan(textarea.clientHeight);
      expect(getComputedStyle(textarea).overflowY).toBe('auto');
      writeLines(textarea, 3);
      await settle(fixture);
      expect(heightOf(textarea)).toBe(3 * LINE + PADDING);
    });

    it('lets maxRows follow a binding', async () => {
      const { fixture, host, textarea } = await textareaFor(`
        <ck-field>
          <label>Note</label>
          <textarea ckInput autosize [minRows]="2" [maxRows]="rows()"></textarea>
        </ck-field>
      `);
      host.rows.set(3);
      await settle(fixture);
      writeLines(textarea, 8);
      await settle(fixture);
      expect(heightOf(textarea)).toBe(3 * LINE + PADDING);
      host.rows.set(6);
      await settle(fixture);
      expect(heightOf(textarea)).toBe(6 * LINE + PADDING);
      host.rows.set(undefined);
      await settle(fixture);
      expect(heightOf(textarea)).toBe(8 * LINE + PADDING);
    });

    it.each([
      ['0', 2],
      ['-3', 2],
      ['abc', 2],
      ['', 2],
      ['2.9', 2],
    ])('falls back to the default for minRows="%s"', async (value, rows) => {
      const { textarea } = await textareaFor(area(`minRows="${value}"`));
      expect(heightOf(textarea)).toBe(rows * LINE + PADDING);
    });

    it('ignores a maxRows that is not a positive number, and lifts one below minRows to it', async () => {
      const invalid = await textareaFor(area('maxRows="abc"'));
      writeLines(invalid.textarea, 6);
      await settle(invalid.fixture);
      expect(heightOf(invalid.textarea)).toBe(6 * LINE + PADDING);
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      const below = await textareaFor(area('minRows="4" maxRows="2"'));
      writeLines(below.textarea, 9);
      await settle(below.fixture);
      expect(heightOf(below.textarea)).toBe(4 * LINE + PADDING);
    });

    it('follows a programmatic write from Reactive Forms and a [value] binding', async () => {
      const reactive = await textareaFor(`
        <form [formGroup]="form">
          <ck-field>
            <label>Note</label>
            <textarea ckInput autosize formControlName="note"></textarea>
          </ck-field>
        </form>
      `);
      reactive.host.form.controls.note.setValue('1\n2\n3\n4\n5');
      await settle(reactive.fixture);
      await settle(reactive.fixture);
      expect(heightOf(reactive.textarea)).toBe(5 * LINE + PADDING);
      reactive.host.form.reset();
      await settle(reactive.fixture);
      await settle(reactive.fixture);
      expect(heightOf(reactive.textarea)).toBe(2 * LINE + PADDING);
      document.body.replaceChildren();
      TestBed.resetTestingModule();

      const bound = await textareaFor(`
        <ck-field>
          <label>Note</label>
          <textarea ckInput autosize [value]="text()"></textarea>
        </ck-field>
      `);
      bound.host.text.set('1\n2\n3\n4');
      await settle(bound.fixture);
      await settle(bound.fixture);
      expect(heightOf(bound.textarea)).toBe(4 * LINE + PADDING);
    });

    it('adds the border to the height of a standalone textarea', async () => {
      const { fixture, textarea } = await textareaFor(area('minRows="2" maxRows="3"', false));
      expect(heightOf(textarea)).toBe(2 * LINE + PADDING + 2);
      writeLines(textarea, 9);
      await settle(fixture);
      expect(heightOf(textarea)).toBe(3 * LINE + PADDING + 2);
    });

    it('can be switched off and on again', async () => {
      const { fixture, host, textarea } = await textareaFor(`
        <ck-field>
          <label>Note</label>
          <textarea ckInput [autosize]="on()" rows="2"></textarea>
        </ck-field>
      `);
      host.on.set(false);
      await settle(fixture);
      writeLines(textarea, 6);
      await settle(fixture);
      expect(textarea.classList.contains('ck-input--autosize')).toBe(false);
      expect(heightOf(textarea)).toBe(2 * LINE + PADDING);
      host.on.set(true);
      await settle(fixture);
      expect(heightOf(textarea)).toBe(6 * LINE + PADDING);
    });

    it('gives the height back to the rows attribute when autosize is turned off after growth', async () => {
      const { fixture, host, textarea } = await textareaFor(`
        <ck-field>
          <label>Note</label>
          <textarea ckInput [autosize]="on()" rows="2"></textarea>
        </ck-field>
      `);
      writeLines(textarea, 7);
      await settle(fixture);
      expect(heightOf(textarea)).toBe(7 * LINE + PADDING);
      host.on.set(false);
      await settle(fixture);
      expect(textarea.style.blockSize).toBe('');
      expect(heightOf(textarea)).toBe(2 * LINE + PADDING);
    });

    it('does nothing for an input element', async () => {
      const { root } = await textareaFor(
        '<ck-field><label>Name</label><input ckInput autosize minRows="5" /></ck-field>',
      );
      const input = query<HTMLInputElement>(root, 'input');
      expect(input.classList.contains('ck-input--autosize')).toBe(false);
      expect(heightOf(input)).toBe(38);
    });

    it('survives being destroyed with a pending write', async () => {
      const { fixture, host } = await textareaFor(`
        <ck-field>
          <label>Note</label>
          <textarea ckInput autosize [value]="text()"></textarea>
        </ck-field>
      `);
      host.text.set('1\n2\n3');
      fixture.destroy();
      await fixture.whenStable();
    });
  });

  describe('script sizing', () => {
    it('re-measures when the width changes the wrapping', async () => {
      const original = CSS.supports.bind(CSS);
      vi.spyOn(CSS, 'supports').mockImplementation((...args: [string, string?]) =>
        args[0] === 'field-sizing' ? false : original(...(args as [string])),
      );
      const { fixture, root } = mount(`
        <div id="wrap" style="inline-size: 400px">
          <ck-field><label>Note</label><textarea ckInput autosize></textarea></ck-field>
        </div>
      `);
      await settle(fixture);
      const textarea = query<HTMLTextAreaElement>(root, 'textarea');
      textarea.value = 'word '.repeat(40);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await settle(fixture);
      const wide = heightOf(textarea);
      query(root, '#wrap').style.inlineSize = '120px';
      await vi.waitFor(() => expect(heightOf(textarea)).toBeGreaterThan(wide));
    });
  });
});
