import { PLATFORM_ID } from '@angular/core';
import { Validators } from '@angular/forms';
import { vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { TestBed } from '@angular/core/testing';
import { CkSize } from '@ckui/core';
import { expectNoAxeViolations } from '../testing/axe';
import {
  KINDS,
  SELECT_DARK,
  cleanUp,
  mount,
  optionsOf,
  popup,
  press,
  settle,
  shownValue,
  triggerOf,
} from '../testing/select-host';

const FIELD = (extra = '', select = '') => `
  <ck-field ${extra}>
    <label>Target</label>
    <ck-select ${select} [formControl]="group.controls.kind" placeholder="Pick one">${KINDS}</ck-select>
    <ck-hint>How the interval is measured.</ck-hint>
    <ck-error>Choose a target.</ck-error>
  </ck-field>`;

const FORM = `<form [formGroup]="group" (ngSubmit)="submits.update((count) => count + 1)">
  ${FIELD()}
  <button type="submit" id="send">Send</button>
</form>`;

const PLAIN = `<ck-field [size]="size()" [invalid]="forced()">
  <label>Target</label>
  <ck-select [value]="value()" [size]="selectSize()" aria-describedby="mine other">${KINDS}</ck-select>
  <ck-hint>Hint.</ck-hint>
  <ck-error>Error.</ck-error>
</ck-field>`;

const rect = (element: Element) => element.getBoundingClientRect();
const query = <T extends HTMLElement>(root: ParentNode, selector: string): T =>
  root.querySelector<T>(selector)!;

describe('ck-select in a ck-field', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    cleanUp();
    await page.viewport(800, 600);
  });

  const fieldOf = (root: HTMLElement) => query(root, 'ck-field');
  const boxOf = (root: HTMLElement) => query(root, '.ck-field__box');
  const labelOf = (root: HTMLElement) => query<HTMLLabelElement>(root, 'label');
  const errorOf = (root: HTMLElement) => query(root, 'ck-error');
  const describedBy = (root: HTMLElement) => triggerOf(root).getAttribute('aria-describedby');

  async function mountField(
    template: string,
    prepare?: Parameters<typeof mount>[1],
    tokens?: Parameters<typeof mount>[3],
  ) {
    const mounted = mount(template, prepare, undefined, tokens);
    await settle(mounted.fixture);
    return mounted;
  }

  describe('label and description', () => {
    it('points the label at the trigger, which it names, and a click on the floated label opens the list', async () => {
      const { fixture, root } = await mountField(FIELD(), (host) =>
        host.group.controls.kind.setValue('watt'),
      );
      const label = labelOf(root);
      const trigger = triggerOf(root);
      expect(trigger.id).not.toBe('');
      expect(label.getAttribute('for')).toBe(trigger.id);
      expect(trigger.labels?.[0]).toBe(label);
      label.click();
      await settle(fixture);
      expect(popup()).not.toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it('names the sheet and the list after the label, without the required marker', async () => {
      const { fixture, root } = await mountField(FORM);
      triggerOf(root).click();
      await settle(fixture);
      expect(query(document.body, '.ck-select-listbox').getAttribute('aria-label')).toBe('Target');
    });

    it('does not warn about a missing name when the field has a label', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      await mountField(FIELD());
      expect(warn).not.toHaveBeenCalled();
    });

    it('describes the trigger by the hint and a consumer id, and keeps the error out while hidden', async () => {
      const { fixture, host, root } = await mountField(PLAIN);
      const hint = query(root, 'ck-hint').id;
      expect(describedBy(root)).toBe(`mine other ${hint}`);
      host.size.set('lg');
      await settle(fixture);
      expect(describedBy(root)).toBe(`mine other ${hint}`);
      expect(errorOf(root).hidden).toBe(true);
    });

    it('adds the error id and aria-invalid while the field shows errors and takes them away again', async () => {
      const { fixture, host, root } = await mountField(PLAIN);
      const hint = query(root, 'ck-hint').id;
      host.forced.set(true);
      await settle(fixture);
      expect(describedBy(root)).toBe(`mine other ${hint} ${errorOf(root).id}`);
      expect(triggerOf(root).getAttribute('aria-invalid')).toBe('true');
      expect(fieldOf(root).classList.contains('ck-field--invalid')).toBe(true);
      host.forced.set(undefined);
      await settle(fixture);
      expect(describedBy(root)).toBe(`mine other ${hint}`);
      expect(triggerOf(root).hasAttribute('aria-invalid')).toBe(false);
    });

    it('leaves a select outside a field with exactly its own aria-describedby and no state attributes', async () => {
      const { root } = await mountField(
        `<ck-select aria-label="Target" aria-describedby="mine" [value]="value()">${KINDS}</ck-select>`,
      );
      expect(describedBy(root)).toBe('mine');
      expect(triggerOf(root).hasAttribute('aria-invalid')).toBe(false);
      expect(triggerOf(root).hasAttribute('aria-required')).toBe(false);
    });

    it('does not warn twice when two controls are in one field', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      await mountField(
        `<ck-field><label>A</label><ck-select aria-label="A">${KINDS}</ck-select><ck-select aria-label="B">${KINDS}</ck-select></ck-field>`,
      );
      const messages = warn.mock.calls.map((call) => String(call[0])).join('\n');
      expect(messages).toContain('found 2');
      expect(messages).toContain('ck-select');
    });
  });

  describe('the floating label', () => {
    it('rests on the empty control and floats with a value, with focus and with a placeholder', async () => {
      const { fixture, host, root } = await mountField(
        `<ck-field><label>Target</label><ck-select [value]="value()">${KINDS}</ck-select></ck-field>`,
      );
      const floated = () => fieldOf(root).classList.contains('ck-field--floated');
      expect(floated()).toBe(false);
      triggerOf(root).focus();
      await settle(fixture);
      expect(floated()).toBe(true);
      triggerOf(root).blur();
      await settle(fixture);
      expect(floated()).toBe(false);
      host.value.set('watt');
      await settle(fixture);
      expect(floated()).toBe(true);
      host.value.set(null);
      await settle(fixture);
      expect(floated()).toBe(false);
    });

    it('floats for a placeholder, which would otherwise sit under the label', async () => {
      const { root } = await mountField(FIELD());
      expect(fieldOf(root).classList.contains('ck-field--floated')).toBe(true);
    });

    it('floats for a selected option whose value is null', async () => {
      const { root } = await mountField(
        `<ck-field><label>Target</label><ck-select [value]="value()"><ck-option [value]="null">Any</ck-option></ck-select></ck-field>`,
      );
      expect(fieldOf(root).classList.contains('ck-field--floated')).toBe(true);
      expect(shownValue(root)).toBe('Any');
    });

    it('stays floated while the list is open and rests again when it closes empty', async () => {
      const { fixture, root } = await mountField(
        `<ck-field><label>Target</label><ck-select [value]="value()">${KINDS}</ck-select></ck-field>`,
      );
      triggerOf(root).focus();
      press(triggerOf(root), 'ArrowDown');
      await settle(fixture);
      expect(fieldOf(root).classList.contains('ck-field--floated')).toBe(true);
      press(triggerOf(root), 'Escape');
      await settle(fixture);
      triggerOf(root).blur();
      await settle(fixture);
      expect(fieldOf(root).classList.contains('ck-field--floated')).toBe(false);
    });
  });

  describe('Reactive Forms', () => {
    it('marks the trigger and the label required from the validators', async () => {
      const { fixture, host, root } = await mountField(FORM);
      expect(triggerOf(root).getAttribute('aria-required')).toBe('true');
      expect(labelOf(root).classList.contains('ck-field__label--required')).toBe(true);
      host.group.controls.kind.removeValidators(Validators.required);
      host.group.controls.kind.updateValueAndValidity();
      await settle(fixture);
      expect(triggerOf(root).hasAttribute('aria-required')).toBe(false);
      expect(labelOf(root).classList.contains('ck-field__label--required')).toBe(false);
    });

    it('shows no error before the first touch, then after the focus left the select', async () => {
      const { fixture, root } = await mountField(FORM);
      triggerOf(root).focus();
      press(triggerOf(root), 'ArrowDown');
      press(triggerOf(root), 'Escape');
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(true);
      query(root, '#send').focus();
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(false);
      expect(fieldOf(root).classList.contains('ck-field--invalid')).toBe(true);
      expect(triggerOf(root).getAttribute('aria-invalid')).toBe('true');
      expect(describedBy(root)).toContain(errorOf(root).id);
    });

    it('does not show the error while focus only moves into the list, and drops it after a pick', async () => {
      const { fixture, root } = await mountField(
        `<form [formGroup]="group">${FIELD('', 'filter')}<button id="send">x</button></form>`,
      );
      triggerOf(root).focus();
      triggerOf(root).click();
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(true);
      await userEvent.keyboard('{Enter}');
      await settle(fixture);
      query(root, '#send').focus();
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(true);
      expect(triggerOf(root).hasAttribute('aria-invalid')).toBe(false);
    });

    it('shows the error on submit without a touch', async () => {
      const { fixture, host, root } = await mountField(FORM);
      query<HTMLButtonElement>(root, '#send').click();
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(false);
      expect(triggerOf(root).getAttribute('aria-invalid')).toBe('true');
      expect(host.submits()).toBe(1);
    });

    it('marks the field disabled with the control', async () => {
      const { fixture, host, root } = await mountField(FORM);
      host.group.controls.kind.disable();
      await settle(fixture);
      expect(fieldOf(root).classList.contains('ck-field--disabled')).toBe(true);
      expect(triggerOf(root).disabled).toBe(true);
      host.group.controls.kind.enable();
      await settle(fixture);
      expect(fieldOf(root).classList.contains('ck-field--disabled')).toBe(false);
    });
  });

  describe('Signal Forms', () => {
    it('shows the error after the select was touched, and the value after a pick', async () => {
      const { fixture, host, root } = await mountField(
        `<ck-field><label>Target</label><ck-select [formField]="signalForm.kind" placeholder="Pick one">${KINDS}</ck-select>
         <ck-error>Choose a target.</ck-error></ck-field><button id="send">x</button>`,
      );
      expect(triggerOf(root).getAttribute('aria-required')).toBe('true');
      triggerOf(root).focus();
      query(root, '#send').focus();
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(false);
      triggerOf(root).click();
      await settle(fixture);
      optionsOf()[1].click();
      await settle(fixture);
      expect(host.signalModel().kind).toBe('watt');
      expect(errorOf(root).hidden).toBe(true);
    });
  });

  describe('ngModel', () => {
    it('is required by the attribute', async () => {
      const { root } = await mountField(
        `<form><ck-field><label>Target</label><ck-select name="kind" [(ngModel)]="model" required>${KINDS}</ck-select></ck-field></form>`,
      );
      expect(triggerOf(root).getAttribute('aria-required')).toBe('true');
    });
  });

  describe('layout', () => {
    const HEIGHTS: Record<CkSize, number> = { sm: 32, md: 40, lg: 48, xl: 60 };

    it.each(['sm', 'md', 'lg', 'xl'] as const)(
      'is as tall as the box at %s and the trigger covers the whole box',
      async (size) => {
        const { fixture, root } = await mountField(
          `<ck-field size="${size}"><label>Target</label><ck-select placeholder="Pick one" [value]="value()">${KINDS}</ck-select></ck-field>`,
        );
        await settle(fixture);
        const box = rect(boxOf(root));
        const trigger = rect(triggerOf(root));
        expect(box.height).toBe(HEIGHTS[size]);
        expect(trigger.height).toBe(HEIGHTS[size]);
        expect(trigger.left).toBeCloseTo(box.left, 0);
        expect(trigger.right).toBeCloseTo(box.right, 0);
        for (const [x, y] of [
          [box.left + 3, box.top + 3],
          [box.right - 3, box.bottom - 3],
          [box.left + box.width / 2, box.top + box.height / 2],
        ]) {
          expect(document.elementFromPoint(x, y)?.closest('.ck-select__trigger')).toBe(
            triggerOf(root),
          );
        }
      },
    );

    it('takes the size of the field unless it has its own', async () => {
      const { fixture, host, root } = await mountField(PLAIN, (state) => {
        state.size.set('lg');
      });
      expect(rect(boxOf(root)).height).toBe(48);
      expect(query(root, 'ck-select').classList.contains('ck-select--lg')).toBe(true);
      host.selectSize.set('sm');
      await settle(fixture);
      expect(query(root, 'ck-select').classList.contains('ck-select--sm')).toBe(true);
      expect(rect(boxOf(root)).height).toBe(48);
    });

    it('draws no border or fill of its own inside the field', async () => {
      const { root } = await mountField(FIELD());
      const style = getComputedStyle(triggerOf(root));
      expect(style.borderTopWidth).toBe('0px');
      expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(style.outlineStyle).toBe('none');
    });

    it('puts the value text where the label rests, and the chevron at the inline end', async () => {
      const { root } = await mountField(FIELD(), (host) =>
        host.group.controls.kind.setValue('ftp'),
      );
      const text = rect(query(root, '.ck-select__text'));
      const label = rect(labelOf(root));
      const box = rect(boxOf(root));
      expect(text.left).toBeGreaterThanOrEqual(label.left);
      expect(text.left - box.left).toBeLessThan(20);
      expect(box.right - rect(query(root, '.ck-select__chevron')).right).toBeLessThan(20);
    });

    it('rings the box, not the trigger, on keyboard focus', async () => {
      const { fixture, root } = await mountField(
        `<button type="button" id="before">Before</button>${FIELD()}`,
      );
      query<HTMLElement>(root, '#before').focus();
      await userEvent.tab();
      await settle(fixture);
      expect(document.activeElement).toBe(triggerOf(root));
      expect(getComputedStyle(boxOf(root)).borderTopColor).toBe('rgb(0, 0, 255)');
      expect(getComputedStyle(triggerOf(root)).outlineStyle).toBe('none');
    });

    it('opens the list right under the box and as wide as it', async () => {
      const { fixture, root } = await mountField(
        `<div style="inline-size: 400px">${FIELD()}</div>`,
      );
      triggerOf(root).click();
      await settle(fixture);
      const box = rect(boxOf(root));
      const list = rect(popup()!);
      expect(list.top).toBeGreaterThanOrEqual(box.bottom - 1);
      expect(list.width).toBeGreaterThanOrEqual(box.width - 2);
    });

    it('keeps a long value inside the box with an ellipsis', async () => {
      const long = 'An option text so long that it cannot fit into the narrow field at all';
      const { root } = await mountField(
        `<div style="inline-size: 180px"><ck-field><label>Target</label><ck-select [value]="value()"><ck-option value="x">${long}</ck-option></ck-select></ck-field></div>`,
        (host) => host.value.set('x'),
      );
      expect(rect(boxOf(root)).width).toBe(180);
      const value = query(root, '.ck-select__value');
      expect(value.scrollWidth).toBeGreaterThan(value.clientWidth);
      expect(rect(query(root, '.ck-select__chevron')).right).toBeLessThanOrEqual(
        rect(boxOf(root)).right,
      );
    });

    it('mirrors in right-to-left', async () => {
      const { root } = await mountField(`<div dir="rtl">${FIELD()}</div>`, (host) =>
        host.group.controls.kind.setValue('ftp'),
      );
      const box = rect(boxOf(root));
      expect(rect(query(root, '.ck-select__text')).right).toBeGreaterThan(box.right - 24);
      expect(rect(query(root, '.ck-select__chevron')).left - box.left).toBeLessThan(24);
    });
  });

  describe('server', () => {
    it('renders the field with the label bound to the trigger', async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const { root } = await mountField(FIELD(), (host) =>
        host.group.controls.kind.setValue('watt'),
      );
      expect(shownValue(root)).toBe('Watts');
      expect(triggerOf(root).id).not.toBe('');
      expect(popup()).toBeNull();
    });
  });

  describe('accessibility', () => {
    it.each([
      ['light', undefined],
      ['dark', SELECT_DARK],
    ] as const)('has no axe violations in %s, closed and open', async (_name, tokens) => {
      const { fixture, root } = await mountField(
        `<div style="background: ${tokens ? 'rgb(30, 30, 36)' : 'white'}">${FIELD()}</div>`,
        (host) => host.group.controls.kind.setValue('watt'),
        tokens,
      );
      await expectNoAxeViolations(root);
      triggerOf(root).click();
      await settle(fixture);
      await expectNoAxeViolations(document.querySelector('.cdk-overlay-container')!);
    });
  });
});
