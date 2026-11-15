import { TestBed } from '@angular/core/testing';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import { allRules, mount, query, settle } from '../testing/field-host';

const center = (box: DOMRect): number => box.top + box.height / 2;

describe('CkField layout', () => {
  afterEach(() => {
    document.body.dir = '';
    document.body.replaceChildren();
    TestBed.resetTestingModule();
  });

  const parts = (root: HTMLElement) => ({
    box: query(root, '.ck-field__box').getBoundingClientRect(),
    main: query(root, '.ck-field__main').getBoundingClientRect(),
    label: query(root, 'label').getBoundingClientRect(),
    input: query(root, 'input, textarea').getBoundingClientRect(),
  });

  describe('label', () => {
    it('rests centred on the control, aligned with the text', async () => {
      const { fixture, root } = mount('<ck-field><label>Name</label><input ckInput /></ck-field>');
      await settle(fixture);
      const { box, label, input } = parts(root);
      expect(center(label)).toBeCloseTo(center(box), 0);
      // The label's own inline padding is cancelled by its negative offset.
      expect(label.left + 4).toBeCloseTo(input.left, 0);
      expect(getComputedStyle(query(root, 'label')).fontSize).toBe('16px');
    });

    it('floats onto the top border, centred on it, in the small label size', async () => {
      const { fixture, root } = mount(
        '<ck-field labelFloat="always"><label>Name</label><input ckInput /></ck-field>',
      );
      await settle(fixture);
      const { box, label } = parts(root);
      expect(center(label)).toBeCloseTo(box.top, 0);
      expect(getComputedStyle(query(root, 'label')).fontSize).toBe('12px');
    });

    it('moves between the two places', async () => {
      const { fixture, root } = mount('<ck-field><label>Name</label><input ckInput /></ck-field>');
      await settle(fixture);
      const resting = parts(root).label.top;
      await userEvent.click(query(root, 'input'));
      await settle(fixture);
      expect(parts(root).label.top).toBeLessThan(resting - 5);
      await userEvent.tab();
      await settle(fixture);
      expect(parts(root).label.top).toBeCloseTo(resting, 0);
    });

    it('paints the notch with a hard-stop gradient: clear above the border, field colour below', async () => {
      const { fixture, root } = mount(
        '<ck-field labelFloat="always"><label>Name</label><input ckInput /></ck-field>',
      );
      await settle(fixture);
      const label = query(root, 'label');
      expect(getComputedStyle(label).backgroundImage).toBe(
        'linear-gradient(rgba(0, 0, 0, 0) 50%, rgb(255, 255, 255) 50%)',
      );
      root.style.setProperty('--ck-field-bg', 'rgb(1, 2, 3)');
      expect(getComputedStyle(label).backgroundImage).toBe(
        'linear-gradient(rgba(0, 0, 0, 0) 50%, rgb(1, 2, 3) 50%)',
      );
      expect(getComputedStyle(query(root, '.ck-field__box')).backgroundColor).toBe('rgb(1, 2, 3)');
    });

    it('has no notch fill while resting', async () => {
      const { fixture, root } = mount('<ck-field><label>Name</label><input ckInput /></ck-field>');
      await settle(fixture);
      expect(getComputedStyle(query(root, 'label')).backgroundImage).toBe('none');
    });

    it('lines up with the first text line of a textarea, resting and floated', async () => {
      const { fixture, root } = mount(
        '<ck-field><label>Note</label><textarea ckInput rows="3"></textarea></ck-field>',
      );
      await settle(fixture);
      const { input, label } = parts(root);
      // The first line: 7px of padding, then a 24px line.
      expect(center(label)).toBeCloseTo(input.top + 7 + 12, 0);
      await userEvent.click(query(root, 'textarea'));
      await settle(fixture);
      expect(center(parts(root).label)).toBeCloseTo(parts(root).box.top, 0);
    });

    it('turns danger-coloured while errors show', async () => {
      const { fixture, root } = mount(
        '<ck-field [invalid]="true"><label>Name</label><input ckInput /></ck-field>',
      );
      root.style.setProperty('--ck-color-danger-fg', 'rgb(150, 0, 0)');
      await settle(fixture);
      expect(getComputedStyle(query(root, 'label')).color).toBe('rgb(150, 0, 0)');
      expect(getComputedStyle(query(root, '.ck-field__box')).borderTopColor).toBe(
        'rgb(200, 30, 30)',
      );
    });

    it('animates with the fast duration token', async () => {
      const { fixture, root } = mount('<ck-field><label>Name</label><input ckInput /></ck-field>');
      await settle(fixture);
      expect(getComputedStyle(query(root, 'label')).transitionDuration).toMatch(/^0s/);
      root.style.setProperty('--ck-duration-fast', '200ms');
      expect(getComputedStyle(query(root, 'label')).transitionDuration).toMatch(/^0\.2s/);
    });

    it('cuts a long label with an ellipsis, resting and floated, and keeps the full text', async () => {
      const text = 'A very long label that does not fit into this narrow field at all, honestly';
      const { fixture, root } = mount(`
        <div style="inline-size: 160px">
          <ck-field><label>${text}</label><input ckInput /></ck-field>
        </div>
      `);
      await settle(fixture);
      const label = query(root, 'label');
      const style = getComputedStyle(label);
      expect(style.textOverflow).toBe('ellipsis');
      expect(style.whiteSpace).toBe('nowrap');
      expect(label.textContent).toBe(text);
      expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
      expect(parts(root).label.width).toBeLessThanOrEqual(parts(root).main.width + 4);
      await userEvent.click(query(root, 'input'));
      await settle(fixture);
      expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
      expect(parts(root).label.width).toBeLessThanOrEqual(parts(root).main.width + 4);
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    });

    it('does not let a long label run under a suffix button', async () => {
      const { fixture, root } = mount(`
        <div style="inline-size: 200px">
          <ck-field>
            <label>A very long label that does not fit into this narrow field</label>
            <input ckInput />
            <button ckButton ckSuffix variant="ghost" iconOnly size="sm" aria-label="Show">x</button>
          </ck-field>
        </div>
      `);
      await settle(fixture);
      const suffix = query(root, '.ck-suffix').getBoundingClientRect();
      expect(parts(root).label.right).toBeLessThanOrEqual(suffix.left + 0.5);
    });

    it('survives an empty label and a very long unbroken word', async () => {
      const { fixture, root } = mount(`
        <div style="inline-size: 160px">
          <ck-field><label></label><input ckInput /></ck-field>
          <ck-field><label>${'x'.repeat(200)}</label><input ckInput /></ck-field>
        </div>
      `);
      await settle(fixture);
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    });
  });

  describe('prefix and suffix', () => {
    const template = `
      <ck-field>
        <label>Amount</label>
        <span ckPrefix>€</span>
        <input ckInput />
        <button ckButton ckSuffix variant="ghost" iconOnly size="sm" aria-label="Clear">x</button>
      </ck-field>
    `;

    it('sits in one row: prefix, control, suffix', async () => {
      const { fixture, root } = mount(template);
      await settle(fixture);
      const prefix = query(root, '.ck-prefix').getBoundingClientRect();
      const suffix = query(root, '.ck-suffix').getBoundingClientRect();
      const { input } = parts(root);
      expect(prefix.right).toBeLessThanOrEqual(input.left);
      expect(input.right).toBeLessThanOrEqual(suffix.left);
      expect(center(prefix)).toBeCloseTo(center(input), 0);
      expect(center(suffix)).toBeCloseTo(center(input), 0);
    });

    it('keeps the control height with a button in the suffix', async () => {
      const { fixture, root } = mount(template);
      await settle(fixture);
      expect(parts(root).box.height).toBe(40);
    });

    it('stays in one row mirrored in RTL', async () => {
      document.body.dir = 'rtl';
      const { fixture, root } = mount(template);
      await settle(fixture);
      const prefix = query(root, '.ck-prefix').getBoundingClientRect();
      const suffix = query(root, '.ck-suffix').getBoundingClientRect();
      const { input, label, main } = parts(root);
      expect(prefix.left).toBeGreaterThanOrEqual(input.right);
      expect(suffix.right).toBeLessThanOrEqual(input.left);
      expect(label.right - 4).toBeCloseTo(main.right, 0);
    });

    it('aligns an RTL label with the right edge of the control, resting', async () => {
      document.body.dir = 'rtl';
      const { fixture, root } = mount('<ck-field><label>Name</label><input ckInput /></ck-field>');
      await settle(fixture);
      const { label, input } = parts(root);
      expect(label.right - 4).toBeCloseTo(input.right, 0);
    });

    it('keeps the suffix button in the tab order after the control', async () => {
      const { fixture, root } = mount(template);
      await settle(fixture);
      await userEvent.tab();
      expect(document.activeElement).toBe(query(root, 'input'));
      await userEvent.tab();
      expect(document.activeElement).toBe(query(root, 'button'));
      await userEvent.tab({ shift: true });
      expect(document.activeElement).toBe(query(root, 'input'));
    });

    it('does not add prefix or suffix text to the accessible name of the control', async () => {
      const { fixture, root } = mount(template);
      await settle(fixture);
      const input = query<HTMLInputElement>(root, 'input');
      const name = Array.from(input.labels ?? [], (label) => label.textContent).join(' ');
      expect(name).toBe('Amount');
      expect(input.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('lets a click on the suffix button reach the button and not move focus into the field', async () => {
      const { fixture, root } = mount(template);
      await settle(fixture);
      const button = query<HTMLButtonElement>(root, 'button');
      let clicks = 0;
      button.addEventListener('click', () => clicks++);
      await userEvent.click(button);
      expect(clicks).toBe(1);
      expect(document.activeElement).toBe(button);
    });
  });

  describe('focus', () => {
    it('turns the border itself into the ring, inside the box, with no outline outside it', async () => {
      const { fixture, root } = mount('<ck-field><label>Name</label><input ckInput /></ck-field>');
      await settle(fixture);
      const box = query(root, '.ck-field__box');
      const before = box.getBoundingClientRect();
      await userEvent.tab();
      const style = getComputedStyle(box);
      expect(style.borderTopColor).toBe('rgb(0, 0, 255)');
      expect(style.boxShadow).toBe('rgb(0, 0, 255) 0px 0px 0px 1px inset');
      expect(style.outlineStyle).toBe('none');
      expect(getComputedStyle(query(root, 'input')).outlineStyle).toBe('none');
      const after = box.getBoundingClientRect();
      expect([after.width, after.height, after.top]).toEqual([
        before.width,
        before.height,
        before.top,
      ]);
    });

    it('never lets the ring cross the label: nothing is drawn above the box and the notch covers the ring under it', async () => {
      const { fixture, root } = mount('<ck-field><label>Name</label><input ckInput /></ck-field>');
      await settle(fixture);
      await userEvent.tab();
      const box = query(root, '.ck-field__box');
      const label = query(root, 'label').getBoundingClientRect();
      const boxRect = box.getBoundingClientRect();
      const ringWidth = 2;
      expect(getComputedStyle(box).outlineStyle).toBe('none');
      // The label's opaque lower half starts at the top edge of the box and reaches past the ring.
      expect(label.top + label.height / 2).toBeCloseTo(boxRect.top, 0);
      expect(label.bottom - boxRect.top).toBeGreaterThan(ringWidth);
      expect(getComputedStyle(query(root, 'label')).backgroundImage).toContain(
        'rgb(255, 255, 255) 50%',
      );
    });

    it('keeps the danger colour on an invalid field that has focus', async () => {
      const { fixture, root } = mount(
        '<ck-field [invalid]="true"><label>Name</label><input ckInput /></ck-field>',
      );
      await settle(fixture);
      await userEvent.tab();
      const style = getComputedStyle(query(root, '.ck-field__box'));
      expect(style.borderTopColor).toBe('rgb(200, 30, 30)');
      expect(style.boxShadow).toContain('rgb(200, 30, 30)');
    });

    it('declares a forced-colors ring that does not depend on the box shadow', () => {
      mount('<ck-field><label>Name</label><input ckInput /></ck-field>');
      const rule = allRules().find(
        (candidate) =>
          candidate.parentRule instanceof CSSMediaRule &&
          candidate.parentRule.conditionText.includes('forced-colors') &&
          candidate.selectorText.includes('focus-visible') &&
          candidate.selectorText.includes('ck-field__box'),
      );
      expect(rule?.style.borderColor.toLowerCase()).toBe('highlight');
      expect(rule?.style.outline).toContain('solid Highlight');
    });

    it('paints the disabled overlay into the notch, so no patch shows', async () => {
      const { fixture, root } = mount(
        '<ck-field><label>Name</label><input ckInput disabled value="x" /></ck-field>',
      );
      await settle(fixture);
      const image = getComputedStyle(query(root, 'label')).backgroundImage;
      expect(image.match(/linear-gradient/g)).toHaveLength(2);
      expect(image).toContain('rgba(0, 0, 0, 0.06) 50%');
      expect(image).toContain('rgb(255, 255, 255) 50%');
    });

    it('shows no ring on the box when only the suffix button is focused by keyboard', async () => {
      const { fixture, root } = mount(`
        <ck-field>
          <label>Name</label>
          <input ckInput />
          <button ckButton ckSuffix variant="ghost" iconOnly size="sm" aria-label="Clear">x</button>
        </ck-field>
      `);
      root.style.setProperty('--ck-focus-ring', '2px solid rgb(0, 0, 255)');
      await settle(fixture);
      await userEvent.tab();
      await userEvent.tab();
      expect(getComputedStyle(query(root, '.ck-field__box')).boxShadow).toBe('none');
    });
  });

  describe('accessibility', () => {
    it('has no axe violations in any state', async () => {
      const { fixture, host, root } = mount(`
        <form [formGroup]="form">
          <ck-field [invalid]="forced()">
            <label>Email</label>
            <span ckPrefix>@</span>
            <input ckInput formControlName="email" />
            <button ckButton ckSuffix variant="ghost" iconOnly size="sm" aria-label="Clear">x</button>
            <ck-hint>We never share it.</ck-hint>
            <ck-error>Enter a valid email.</ck-error>
          </ck-field>
          <ck-field>
            <label>Note</label>
            <textarea ckInput autosize formControlName="note"></textarea>
          </ck-field>
          <ck-field>
            <label for="plain">Disabled</label>
            <input ckInput id="plain" disabled />
          </ck-field>
          <ck-field labelFloat="always">
            <label>Read only</label>
            <input ckInput readonly value="fixed" />
          </ck-field>
        </form>
        <input ckInput aria-label="Standalone" />
      `);
      await settle(fixture);
      await expectNoAxeViolations(root);
      host.forced.set(true);
      host.form.controls.email.setValue('x');
      await settle(fixture);
      await expectNoAxeViolations(root);
      host.form.controls.email.setValue('a@b.de');
      host.form.controls.email.markAsTouched();
      await settle(fixture);
      await expectNoAxeViolations(root);
    });
  });
});
