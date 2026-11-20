import { TestBed } from '@angular/core/testing';
import { userEvent } from 'vitest/browser';
import { inputOf, inputs, mount, query, settle } from '../testing/radio-host';

const IN_GROUP = (content: string, attributes = '') =>
  `<ck-radio-group aria-label="Unit" ${attributes} [value]="unit()" (valueChange)="emitted.push($event)">${content}</ck-radio-group>`;

describe('CkRadio', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
    document.body.removeAttribute('dir');
    TestBed.resetTestingModule();
  });

  describe('structure', () => {
    it('is a label row around one native radio, named by its text', async () => {
      const { fixture, root } = mount(IN_GROUP('<ck-radio option="kg">Kilograms</ck-radio>'));
      await settle(fixture);
      const input = inputOf(root);
      expect(input.type).toBe('radio');
      expect(input.closest('label')?.classList.contains('ck-radio')).toBe(true);
      expect(input.getAttribute('aria-labelledby')).toBe(query(root, '.ck-radio__label').id);
      expect(query(root, '.ck-radio__label').id).toMatch(/^ck-radio-text-\d+$/);
      expect(query(root, '.ck-radio__label').textContent).toBe('Kilograms');
      expect(input.getAttribute('value')).toBe('kg');
    });

    it('gives two radios two different text ids', async () => {
      const { fixture, root } = mount(
        IN_GROUP('<ck-radio option="a">A</ck-radio><ck-radio option="b">B</ck-radio>'),
      );
      await settle(fixture);
      const [first, second] = Array.from(root.querySelectorAll('.ck-radio__label'));
      expect(first.id).not.toBe(second.id);
    });

    it('moves aria-label off the host onto the input and drops the text name', async () => {
      const { fixture, root } = mount(
        IN_GROUP('<ck-radio option="a" aria-label="Option A"></ck-radio>'),
      );
      await settle(fixture);
      expect(inputOf(root).getAttribute('aria-label')).toBe('Option A');
      expect(inputOf(root).hasAttribute('aria-labelledby')).toBe(false);
      expect(query(root, 'ck-radio').hasAttribute('aria-label')).toBe(false);
    });

    it('lets the consumer aria-labelledby win over the text, and removes it from the host', async () => {
      const { fixture, root } = mount(
        `<b id="outside">Outside</b>${IN_GROUP('<ck-radio option="a" aria-labelledby="outside">Inner</ck-radio>')}`,
      );
      await settle(fixture);
      expect(inputOf(root).getAttribute('aria-labelledby')).toBe('outside');
      expect(query(root, 'ck-radio').hasAttribute('aria-labelledby')).toBe(false);
    });

    it('keeps inline markup in the label and its spaces, and holds no flex or grid on the text', async () => {
      const { fixture, root } = mount(
        IN_GROUP('<ck-radio option="a">Use <b>metric</b> units</ck-radio>'),
      );
      await settle(fixture);
      expect(query(root, '.ck-radio__label').textContent).toBe('Use metric units');
      for (const selector of ['.ck-radio__label', '.ck-radio__body']) {
        expect(getComputedStyle(query(root, selector)).display).toBe('block');
      }
    });

    it('sends no value for an option that is not a string, number or boolean', async () => {
      const { fixture, root } = mount(
        IN_GROUP(
          `<ck-radio [option]="{ id: 1 }">Object</ck-radio><ck-radio [option]="3">Number</ck-radio>`,
        ),
      );
      await settle(fixture);
      expect(inputOf(root, 0).hasAttribute('value')).toBe(false);
      expect(inputOf(root, 1).getAttribute('value')).toBe('3');
    });

    it('throws a clear error outside a ck-radio-group', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      expect(() => mount('<ck-radio option="a">Loose</ck-radio>')).toThrow(
        /ck-radio has to be inside a ck-radio-group/,
      );
    });
  });

  describe('interaction', () => {
    it('checks on a click on the text, once', async () => {
      const { fixture, host, root } = mount(
        IN_GROUP('<ck-radio option="a">A</ck-radio><ck-radio option="b">B</ck-radio>'),
      );
      await settle(fixture);
      await userEvent.click(query(root, 'ck-radio:nth-of-type(2) .ck-radio__label'));
      await settle(fixture);
      expect(host.emitted).toEqual(['b']);
      expect(inputs(root).map((input) => input.checked)).toEqual([false, true]);
    });

    it('checks on Space and does not move on Enter', async () => {
      const { fixture, host, root } = mount(IN_GROUP('<ck-radio option="a">A</ck-radio>'));
      await settle(fixture);
      inputOf(root).focus();
      await userEvent.keyboard('{Enter}');
      expect(host.emitted).toEqual([]);
      await userEvent.keyboard(' ');
      expect(host.emitted).toEqual(['a']);
    });

    it('ignores a click on a disabled radio and on its label', async () => {
      const { fixture, host, root } = mount(
        IN_GROUP('<ck-radio option="a" disabled>A <ck-hint>Help</ck-hint></ck-radio>'),
      );
      await settle(fixture);
      expect(inputOf(root).disabled).toBe(true);
      expect(query(root, '.ck-radio').classList.contains('ck-radio--disabled')).toBe(true);
      inputOf(root).click();
      query(root, '.ck-radio__label').click();
      query(root, 'ck-hint').click();
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      expect(inputOf(root).checked).toBe(false);
    });
  });

  describe('hint', () => {
    it('describes the input and keeps the name free of the hint text', async () => {
      const { fixture, root } = mount(
        IN_GROUP('<ck-radio option="a">Save <ck-hint>Shows up under "Mine".</ck-hint></ck-radio>'),
      );
      await settle(fixture);
      const hint = query(root, 'ck-radio ck-hint');
      expect(hint.id).toMatch(/^ck-hint-\d+$/);
      expect(inputOf(root).getAttribute('aria-describedby')).toBe(hint.id);
      expect(query(root, '.ck-radio__label').textContent).toBe('Save ');
      expect(hint.parentElement).toBe(query(root, '.ck-radio__body'));
    });

    it('gives two radios two different hint ids', async () => {
      const { fixture, root } = mount(
        IN_GROUP(
          '<ck-radio option="a">A <ck-hint>One</ck-hint></ck-radio><ck-radio option="b">B <ck-hint>Two</ck-hint></ck-radio>',
        ),
      );
      await settle(fixture);
      const [first, second] = Array.from(root.querySelectorAll('ck-hint'));
      expect(first.id).not.toBe(second.id);
    });

    it('still checks on a click on the hint after its id changed', async () => {
      const { fixture, host, root } = mount(
        IN_GROUP('<ck-radio option="a">A <ck-hint [id]="hintId()">Help</ck-hint></ck-radio>'),
      );
      await settle(fixture);
      host.hintId.set('hint-c');
      await settle(fixture);
      await userEvent.click(query(root, 'ck-hint'));
      await settle(fixture);
      expect(host.emitted).toEqual(['a']);
      expect(inputOf(root).getAttribute('aria-describedby')).toBe('hint-c');
    });
  });
});
