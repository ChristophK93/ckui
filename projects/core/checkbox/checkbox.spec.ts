import { ApplicationRef, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideCkui } from '@ckui/core';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import { CheckboxHost, DARK_TOKENS, inputOf, mount, query, settle } from '../testing/checkbox-host';

const CHECKBOX = (attributes = '', content = 'Save as template') =>
  `<ck-checkbox ${attributes} [value]="value()" (valueChange)="emitted.push($event)">${content}</ck-checkbox>`;

const HINT = '<ck-hint>Shows up under "Mine".</ck-hint>';

const TERMS = `<ck-checkbox [formControl]="terms">I accept the terms
  <ck-hint>Required to continue.</ck-hint>
  <ck-error>You have to accept the terms.</ck-error>
</ck-checkbox><button id="after">After</button>`;

describe('CkCheckbox', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
    document.body.removeAttribute('dir');
    TestBed.resetTestingModule();
  });

  describe('structure', () => {
    it('is a label row around one native checkbox, named by its text', async () => {
      const { fixture, root } = mount(CHECKBOX());
      await settle(fixture);
      const input = inputOf(root);
      expect(query(root, 'label.ck-checkbox').contains(input)).toBe(true);
      expect(input.type).toBe('checkbox');
      expect(input.hasAttribute('role')).toBe(false);
      expect(input.checked).toBe(false);
      const text = query(root, '.ck-checkbox__text');
      expect(input.getAttribute('aria-labelledby')).toBe(text.id);
      expect(text.textContent).toBe('Save as template');
    });

    it('reflects the value in the checked state', async () => {
      const { fixture, host, root } = mount(CHECKBOX());
      host.value.set(true);
      await settle(fixture);
      expect(inputOf(root).checked).toBe(true);
      host.value.set(false);
      await settle(fixture);
      expect(inputOf(root).checked).toBe(false);
    });

    it('draws both marks, so the shape tells the states apart', async () => {
      const { fixture, root } = mount(CHECKBOX());
      await settle(fixture);
      expect(root.querySelectorAll('.ck-checkbox__box ck-icon')).toHaveLength(2);
      expect(root.querySelector('.ck-checkbox__box')!.getAttribute('aria-hidden')).toBe('true');
    });

    it('moves aria-label off the host onto the input and drops the text name', async () => {
      const { fixture, root } = mount(CHECKBOX('aria-label="Select row"', ''));
      await settle(fixture);
      expect(query(root, 'ck-checkbox').hasAttribute('aria-label')).toBe(false);
      expect(inputOf(root).getAttribute('aria-label')).toBe('Select row');
      expect(inputOf(root).hasAttribute('aria-labelledby')).toBe(false);
    });

    it('lets the consumer aria-labelledby win over the text', async () => {
      const { fixture, root } = mount(
        `<span id="outside">Outside name</span>${CHECKBOX('aria-labelledby="outside"')}`,
      );
      await settle(fixture);
      expect(query(root, 'ck-checkbox').hasAttribute('aria-labelledby')).toBe(false);
      expect(inputOf(root).getAttribute('aria-labelledby')).toBe('outside');
    });

    it('keeps inline markup in the label and its spaces', async () => {
      const { fixture, root } = mount(
        CHECKBOX('', 'Save <strong>as</strong>&ngsp;<em>template</em>'),
      );
      await settle(fixture);
      expect(query(root, '.ck-checkbox__text').textContent).toBe('Save as template');
      expect(query(root, '.ck-checkbox__text strong')).not.toBeNull();
    });

    it('does not put flex or grid on the elements that hold the text', async () => {
      const { fixture, root } = mount(CHECKBOX());
      await settle(fixture);
      for (const selector of ['.ck-checkbox__text', '.ck-checkbox__body']) {
        expect(getComputedStyle(query(root, selector)).display).toBe('block');
      }
    });
  });

  describe('interaction', () => {
    it('toggles on a click on the label text and on the box, once each', async () => {
      const { fixture, host, root } = mount(CHECKBOX());
      await settle(fixture);
      await userEvent.click(query(root, '.ck-checkbox__text'));
      expect(host.emitted).toEqual([true]);
      expect(inputOf(root).checked).toBe(true);
      await userEvent.click(inputOf(root));
      expect(host.emitted).toEqual([true, false]);
      expect(inputOf(root).checked).toBe(false);
    });

    it('toggles on a click on the hint', async () => {
      const { fixture, host, root } = mount(CHECKBOX('', `Save ${HINT}`));
      await settle(fixture);
      await userEvent.click(query(root, 'ck-hint'));
      expect(host.emitted).toEqual([true]);
    });

    it('toggles on Space and does not move on Enter', async () => {
      const { fixture, host, root } = mount(CHECKBOX());
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
      const { fixture, host, root } = mount(CHECKBOX());
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
      const { fixture, host } = mount(CHECKBOX());
      host.value.set(true);
      await settle(fixture);
      host.value.set(false);
      await settle(fixture);
      expect(host.emitted).toEqual([]);
    });
  });

  describe('indeterminate', () => {
    const MIXED =
      '<ck-checkbox [(indeterminate)]="indeterminate" [(value)]="value">All</ck-checkbox>';

    it('sets the native indeterminate property and the mixed look', async () => {
      const { fixture, host, root } = mount(MIXED);
      host.indeterminate.set(true);
      await settle(fixture);
      expect(inputOf(root).indeterminate).toBe(true);
      expect(inputOf(root).matches(':indeterminate')).toBe(true);
      expect(getComputedStyle(query(root, '.ck-checkbox__mark--minus')).display).toBe('block');
      expect(getComputedStyle(query(root, '.ck-checkbox__mark--check')).display).toBe('none');
    });

    it('is cleared by a click, which checks the box', async () => {
      const { fixture, host, root } = mount(MIXED);
      host.indeterminate.set(true);
      await settle(fixture);
      await userEvent.click(query(root, '.ck-checkbox__text'));
      await settle(fixture);
      expect(host.indeterminate()).toBe(false);
      expect(host.value()).toBe(true);
      expect(inputOf(root).indeterminate).toBe(false);
      expect(inputOf(root).checked).toBe(true);
      expect(getComputedStyle(query(root, '.ck-checkbox__mark--check')).display).toBe('block');
    });

    it('is cleared by Space as well', async () => {
      const { fixture, host, root } = mount(MIXED);
      host.indeterminate.set(true);
      await settle(fixture);
      inputOf(root).focus();
      await userEvent.keyboard(' ');
      expect(host.indeterminate()).toBe(false);
      expect(host.value()).toBe(true);
    });

    it('comes back through the model after it was cleared', async () => {
      const { fixture, host, root } = mount(MIXED);
      host.indeterminate.set(true);
      await settle(fixture);
      inputOf(root).click();
      await settle(fixture);
      expect(inputOf(root).indeterminate).toBe(false);
      host.indeterminate.set(true);
      await settle(fixture);
      expect(inputOf(root).indeterminate).toBe(true);
      host.indeterminate.set(false);
      await settle(fixture);
      expect(inputOf(root).indeterminate).toBe(false);
    });

    it('checks the box even when the value was already true', async () => {
      const { fixture, host, root } = mount(MIXED);
      host.value.set(true);
      host.indeterminate.set(true);
      await settle(fixture);
      inputOf(root).click();
      await settle(fixture);
      expect(host.value()).toBe(true);
      expect(inputOf(root).checked).toBe(true);
      expect(host.indeterminate()).toBe(false);
    });

    it('stays mixed when disabled and clicked', async () => {
      const { fixture, host, root } = mount(
        '<ck-checkbox disabled [(indeterminate)]="indeterminate" [(value)]="value">All</ck-checkbox>',
      );
      host.indeterminate.set(true);
      await settle(fixture);
      inputOf(root).click();
      query(root, '.ck-checkbox__text').click();
      await settle(fixture);
      expect(host.indeterminate()).toBe(true);
      expect(host.value()).toBe(false);
      expect(inputOf(root).indeterminate).toBe(true);
    });

    it('works one-way: the box takes the click even if the parent keeps its own state', async () => {
      const { fixture, host, root } = mount(
        '<ck-checkbox [indeterminate]="indeterminate()" [(value)]="value">All</ck-checkbox>',
      );
      host.indeterminate.set(true);
      await settle(fixture);
      inputOf(root).click();
      await settle(fixture);
      expect(host.value()).toBe(true);
      expect(inputOf(root).indeterminate).toBe(false);
    });
  });

  describe('disabled', () => {
    it('blocks clicks and the label, and says so in the markup and the style', async () => {
      const { fixture, host, root } = mount(CHECKBOX('disabled'));
      await settle(fixture);
      expect(inputOf(root).disabled).toBe(true);
      expect(query(root, '.ck-checkbox').classList.contains('ck-checkbox--disabled')).toBe(true);
      query(root, '.ck-checkbox__text').click();
      inputOf(root).click();
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      expect(inputOf(root).checked).toBe(false);
      expect(getComputedStyle(query(root, '.ck-checkbox')).color).toBe('rgb(150, 150, 160)');
      expect(getComputedStyle(query(root, '.ck-checkbox')).cursor).toBe('not-allowed');
    });

    it('is blocked and styled inside a disabled fieldset', async () => {
      const { fixture, host, root } = mount(
        `<fieldset disabled>${CHECKBOX('', `Save ${HINT}`)}</fieldset>`,
      );
      await settle(fixture);
      expect(inputOf(root).matches(':disabled')).toBe(true);
      query(root, '.ck-checkbox__text').click();
      query(root, 'ck-hint').click();
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      expect(getComputedStyle(query(root, '.ck-checkbox')).color).toBe('rgb(150, 150, 160)');
      expect(getComputedStyle(query(root, 'ck-hint')).color).toBe('rgb(150, 150, 160)');
    });

    it('takes a change of the disabled input back and forth', async () => {
      const { fixture, host, root } = mount(CHECKBOX('[disabled]="locked()"'));
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
      const { fixture, root } = mount(CHECKBOX('', `Save ${HINT}`));
      await settle(fixture);
      const hint = query(root, 'ck-hint');
      expect(hint.id).toMatch(/^ck-hint-\d+$/);
      expect(inputOf(root).getAttribute('aria-describedby')).toBe(hint.id);
      expect(query(root, '.ck-checkbox__text').textContent).toBe('Save ');
      expect(hint.parentElement).toBe(query(root, '.ck-checkbox__body'));
    });

    it('follows a hint that appears, disappears and changes its id', async () => {
      const { fixture, host, root } = mount(
        CHECKBOX('', `Save @if (hint()) {<ck-hint [id]="hintId()">{{ hint() }}</ck-hint>}`),
      );
      await settle(fixture);
      expect(inputOf(root).getAttribute('aria-describedby')).toBe('hint-a');
      host.hintId.set('hint-b');
      await settle(fixture);
      expect(query(root, 'ck-hint').id).toBe('hint-b');
      expect(inputOf(root).getAttribute('aria-describedby')).toBe('hint-b');
      host.hint.set(null);
      await settle(fixture);
      expect(inputOf(root).hasAttribute('aria-describedby')).toBe(false);
      host.hint.set('Back');
      await settle(fixture);
      expect(inputOf(root).getAttribute('aria-describedby')).toBe('hint-b');
    });

    it('still toggles on a click on the hint after its id changed', async () => {
      const { fixture, host, root } = mount(
        CHECKBOX('', `Save <ck-hint [id]="hintId()">Help</ck-hint>`),
      );
      await settle(fixture);
      host.hintId.set('hint-c');
      await settle(fixture);
      await userEvent.click(query(root, 'ck-hint'));
      await settle(fixture);
      expect(host.emitted).toEqual([true]);
      expect(inputOf(root).getAttribute('aria-describedby')).toBe('hint-c');
    });

    it('keeps a static id and adds the consumer aria-describedby after the hint', async () => {
      const { fixture, root } = mount(
        CHECKBOX('aria-describedby="mine"', `Save <ck-hint id="fixed">Help</ck-hint>`),
      );
      await settle(fixture);
      expect(query(root, 'ck-hint').id).toBe('fixed');
      expect(inputOf(root).getAttribute('aria-describedby')).toBe('fixed mine');
      expect(query(root, 'ck-checkbox').hasAttribute('aria-describedby')).toBe(false);
    });

    it('gives two checkboxes two different hint ids', async () => {
      const { fixture, root } = mount(CHECKBOX('', `A ${HINT}`) + CHECKBOX('', `B ${HINT}`));
      await settle(fixture);
      const [first, second] = Array.from(root.querySelectorAll('ck-hint'));
      expect(first.id).not.toBe(second.id);
    });
  });

  describe('forms', () => {
    it('works with Reactive Forms: null is unchecked, user changes emit, writes do not', async () => {
      const { fixture, host, root } = mount(
        '<ck-checkbox [formControl]="control">Save</ck-checkbox>',
      );
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

    it('works with formControlName inside a form group', async () => {
      const { fixture, host, root } = mount(
        '<form [formGroup]="formGroup"><ck-checkbox formControlName="terms">Terms</ck-checkbox></form>',
      );
      await settle(fixture);
      inputOf(root).click();
      await settle(fixture);
      expect(host.terms.value).toBe(true);
    });

    it('marks the control touched on blur, and not before', async () => {
      const { fixture, host, root } = mount(
        '<ck-checkbox [formControl]="control">Save</ck-checkbox><button id="after">After</button>',
      );
      await settle(fixture);
      inputOf(root).focus();
      expect(host.control.touched).toBe(false);
      query(root, '#after').focus();
      expect(host.control.touched).toBe(true);
    });

    it('works with ngModel', async () => {
      const { fixture, host, root } = mount(
        '<ck-checkbox [ngModel]="model()" (ngModelChange)="model.set($event)">Save</ck-checkbox>',
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
        '<ck-checkbox [formField]="signalForm.accepted">Save</ck-checkbox>',
      );
      await settle(fixture);
      expect(inputOf(root).checked).toBe(true);
      inputOf(root).click();
      await settle(fixture);
      expect(host.signalModel().accepted).toBe(false);
      expect(host.signalForm.accepted().dirty()).toBe(true);
      host.signalModel.set({ accepted: true, zones: [] });
      await settle(fixture);
      expect(inputOf(root).checked).toBe(true);
      host.locked.set(true);
      await settle(fixture);
      expect(inputOf(root).disabled).toBe(true);
      inputOf(root).click();
      expect(host.signalModel().accepted).toBe(true);
    });

    it('works two-way with [(value)] and is unchecked by default', async () => {
      const { fixture, host, root } = mount(
        '<ck-checkbox [(value)]="value">Save</ck-checkbox><output>{{ value() }}</output>',
      );
      await settle(fixture);
      expect(inputOf(root).checked).toBe(false);
      inputOf(root).click();
      await settle(fixture);
      expect(host.value()).toBe(true);
      expect(query(root, 'output').textContent).toBe('true');
    });

    it('is unchecked without any value', async () => {
      const { fixture, root } = mount('<ck-checkbox>Save</ck-checkbox>');
      await settle(fixture);
      expect(inputOf(root).checked).toBe(false);
    });
  });

  describe('own error', () => {
    const error = (root: HTMLElement) => query(root, 'ck-error');

    it('stays hidden while the control is untouched, even though it is invalid', async () => {
      const { fixture, host, root } = mount(TERMS);
      await settle(fixture);
      expect(host.terms.invalid).toBe(true);
      expect(error(root).hidden).toBe(true);
      expect(inputOf(root).hasAttribute('aria-invalid')).toBe(false);
      expect(inputOf(root).getAttribute('aria-describedby')).toBe(query(root, 'ck-hint').id);
    });

    it('shows after the checkbox was touched, with aria-invalid and the error in aria-describedby', async () => {
      const { fixture, root } = mount(TERMS);
      await settle(fixture);
      inputOf(root).focus();
      query(root, '#after').focus();
      await settle(fixture);
      expect(error(root).hidden).toBe(false);
      expect(inputOf(root).getAttribute('aria-invalid')).toBe('true');
      expect(inputOf(root).getAttribute('aria-describedby')).toBe(
        `${query(root, 'ck-hint').id} ${error(root).id}`,
      );
      expect(getComputedStyle(error(root)).display).toBe('block');
    });

    it('hides again once the box is checked', async () => {
      const { fixture, root } = mount(TERMS);
      await settle(fixture);
      inputOf(root).focus();
      await userEvent.keyboard(' ');
      query(root, '#after').focus();
      await settle(fixture);
      expect(error(root).hidden).toBe(true);
      expect(inputOf(root).hasAttribute('aria-invalid')).toBe(false);
      expect(inputOf(root).getAttribute('aria-describedby')).toBe(query(root, 'ck-hint').id);
    });

    it('shows on submit without any touch', async () => {
      const { fixture, host, root } = mount(
        `<form [formGroup]="formGroup"><ck-checkbox formControlName="terms">Terms
           <ck-error>Accept.</ck-error></ck-checkbox></form>`,
      );
      await settle(fixture);
      expect(error(root).hidden).toBe(true);
      query(root, 'form').dispatchEvent(new Event('submit'));
      await settle(fixture);
      expect(host.terms.touched).toBe(false);
      expect(error(root).hidden).toBe(false);
      expect(inputOf(root).getAttribute('aria-invalid')).toBe('true');
    });

    it('shows with Signal Forms once the field is touched and invalid', async () => {
      const { fixture, host, root } = mount(
        `<ck-checkbox [formField]="signalForm.accepted">Terms
           <ck-error>Accept.</ck-error></ck-checkbox><button id="after">After</button>`,
        (instance) => instance.signalModel.set({ accepted: false, zones: [] }),
      );
      await settle(fixture);
      expect(error(root).hidden).toBe(true);
      inputOf(root).focus();
      query(root, '#after').focus();
      await settle(fixture);
      expect(host.signalForm.accepted().invalid()).toBe(true);
      expect(error(root).hidden).toBe(false);
      expect(inputOf(root).getAttribute('aria-invalid')).toBe('true');
    });

    it('keeps a static error id, follows a bound one and a changing one', async () => {
      const { fixture, host, root } = mount(
        `<ck-checkbox [formControl]="terms">Terms
           <ck-error [id]="errorId()">Accept.</ck-error></ck-checkbox><button id="after">After</button>`,
      );
      await settle(fixture);
      inputOf(root).focus();
      query(root, '#after').focus();
      await settle(fixture);
      expect(inputOf(root).getAttribute('aria-describedby')).toBe('error-a');
      host.errorId.set('error-b');
      await settle(fixture);
      expect(inputOf(root).getAttribute('aria-describedby')).toBe('error-b');
    });

    it('keeps a consumer aria-describedby after the hint and error', async () => {
      const { fixture, root } = mount(
        `<ck-checkbox [formControl]="terms" aria-describedby="mine">Terms
           <ck-hint id="h">Hint</ck-hint><ck-error id="e">Accept.</ck-error></ck-checkbox>
         <button id="after">After</button>`,
      );
      await settle(fixture);
      inputOf(root).focus();
      query(root, '#after').focus();
      await settle(fixture);
      expect(inputOf(root).getAttribute('aria-describedby')).toBe('h e mine');
    });

    it('does not warn about an error outside a context', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture } = mount(TERMS);
      await settle(fixture);
      expect(warn).not.toHaveBeenCalled();
    });

    it('is never invalid without a form control', async () => {
      const { fixture, root } = mount(CHECKBOX('', 'Save <ck-error>Never</ck-error>'));
      await settle(fixture);
      inputOf(root).focus();
      inputOf(root).blur();
      await settle(fixture);
      expect(error(root).hidden).toBe(true);
    });
  });

  describe('dev warnings', () => {
    const warn = () => vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    it('warns once when there is no text and no name', async () => {
      const spy = warn();
      const { fixture } = mount('<ck-checkbox></ck-checkbox>');
      await settle(fixture);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(String(spy.mock.calls[0][0])).toContain('ck-checkbox has no accessible name');
    });

    it.each([
      ['text', CHECKBOX()],
      ['aria-label', CHECKBOX('aria-label="Select"', '')],
      ['aria-labelledby', `<b id="n">Name</b>${CHECKBOX('aria-labelledby="n"', '')}`],
    ])('does not warn when named by %s', async (_name, template) => {
      const spy = warn();
      const { fixture } = mount(template);
      await settle(fixture);
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not warn when destroyed before the first render finishes', () => {
      const spy = warn();
      TestBed.overrideComponent(CheckboxHost, { set: { template: '<ck-checkbox></ck-checkbox>' } });
      TestBed.createComponent(CheckboxHost).destroy();
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
      const { fixture, root } = mount(
        '<ck-checkbox [value]="true" [indeterminate]="false">Save <ck-error>E</ck-error></ck-checkbox>',
      );
      TestBed.inject(ApplicationRef).tick();
      expect(inputOf(root).checked).toBe(true);
      expect(query(root, '.ck-checkbox').classList.contains('ck-checkbox--md')).toBe(true);
      expect(warn).not.toHaveBeenCalled();
      fixture.destroy();
    });

    it('renders a form-bound checkbox on the server without touching the control', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const { fixture, root } = mount(TERMS);
      TestBed.inject(ApplicationRef).tick();
      expect(query(root, 'ck-error').hidden).toBe(true);
      fixture.destroy();
    });

    it('takes over pre-rendered markup: a stale checked state is corrected without a change', async () => {
      const { fixture, host, root } = mount(CHECKBOX(), undefined, (rendered) => {
        inputOf(rendered).checked = true;
      });
      await settle(fixture);
      expect(inputOf(root).checked).toBe(false);
      expect(host.emitted).toEqual([]);
    });

    it('reuses a pre-rendered hint: one element, and aria-describedby follows its final id', async () => {
      const { fixture, root } = mount(CHECKBOX('', `Save ${HINT}`), undefined, (rendered) => {
        query(rendered, 'ck-hint').id = 'server-id';
      });
      await settle(fixture);
      expect(root.querySelectorAll('ck-hint')).toHaveLength(1);
      expect(inputOf(root).getAttribute('aria-describedby')).toBe(query(root, 'ck-hint').id);
    });

    it('uses the size from provideCkui when none is set', async () => {
      TestBed.configureTestingModule({ providers: [provideCkui({ size: 'xl' })] });
      const { fixture, root } = mount(CHECKBOX());
      await settle(fixture);
      expect(query(root, '.ck-checkbox').classList.contains('ck-checkbox--xl')).toBe(true);
    });
  });

  describe('accessibility', () => {
    const MARKUP = `<ck-checkbox [value]="true">Checked ${HINT}</ck-checkbox>
         <ck-checkbox>Unchecked</ck-checkbox>
         <ck-checkbox [indeterminate]="true">Mixed</ck-checkbox>
         <ck-checkbox disabled>Disabled</ck-checkbox>
         <ck-checkbox aria-label="Select row"></ck-checkbox>`;

    it('has no axe violations (light)', async () => {
      const { fixture, root } = mount(MARKUP);
      await settle(fixture);
      await expectNoAxeViolations(root);
    });

    it('has no axe violations (dark)', async () => {
      const { fixture, root } = mount(MARKUP, undefined, undefined, DARK_TOKENS);
      await settle(fixture);
      await expectNoAxeViolations(root);
    });

    it('has no axe violations with its error showing', async () => {
      const { fixture, root } = mount(TERMS);
      await settle(fixture);
      inputOf(root).focus();
      query(root, '#after').focus();
      await settle(fixture);
      expect(query(root, 'ck-error').hidden).toBe(false);
      await expectNoAxeViolations(root);
    });
  });
});
