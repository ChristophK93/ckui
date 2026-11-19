import { TestBed } from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { provideCkui } from '@ckui/core';
import { userEvent } from 'vitest/browser';
import { FieldHost, allRules, mount, query, settle } from '../testing/field-host';

const REACTIVE = `
  <form [formGroup]="form" (ngSubmit)="submits.update((count) => count + 1)">
    <ck-field [labelFloat]="floatMode()" [invalid]="forced()">
      <label>Email</label>
      <input ckInput formControlName="email" [attr.placeholder]="placeholder()" [attr.type]="type()" />
      <ck-hint>We never share it.</ck-hint>
      @if (form.controls.email.errors) {
        <ck-error>Enter a valid email.</ck-error>
      }
    </ck-field>
    <button type="submit">Send</button>
  </form>
`;

const NG_MODEL = `
  <form #ngForm="ngForm" (ngSubmit)="submits.update((count) => count + 1)">
    <ck-field [invalid]="forced()">
      <label>Email</label>
      <input ckInput name="email" type="email" [ngModel]="modelEmail()" (ngModelChange)="modelEmail.set($event)" required #email="ngModel" />
      <ck-hint>We never share it.</ck-hint>
      @if (email.errors) {
        <ck-error>Enter a valid email.</ck-error>
      }
    </ck-field>
    <button type="submit">Send</button>
  </form>
`;

const SIGNAL_FORMS = `
  <ck-field [invalid]="forced()">
    <label>Email</label>
    <input ckInput [formField]="signalForm.email" />
    <ck-hint>We never share it.</ck-hint>
    @if (signalForm.email().invalid()) {
      <ck-error>Enter a valid email.</ck-error>
    }
  </ck-field>
`;

const PLAIN = `
  <ck-field [labelFloat]="floatMode()" [invalid]="forced()">
    <label>Name</label>
    <input
      ckInput
      [value]="text()"
      [attr.placeholder]="placeholder()"
      [attr.type]="type()"
      [attr.aria-describedby]="describedBy()"
      [attr.id]="inputId()"
      [attr.aria-invalid]="ariaInvalid()"
    />
    <ck-hint>Your full name.</ck-hint>
    <ck-error>Name is wrong.</ck-error>
  </ck-field>
`;

describe('CkField', () => {
  afterEach(() => {
    document.body.removeAttribute('dir');
    document.body.replaceChildren();
    TestBed.resetTestingModule();
  });

  const fieldOf = (root: HTMLElement) => query(root, 'ck-field');
  const inputOf = (root: HTMLElement) => query<HTMLInputElement>(root, 'input');
  const floated = (root: HTMLElement) => fieldOf(root).classList.contains('ck-field--floated');

  describe('float rules', () => {
    it('rests with an empty, unfocused control', async () => {
      const { fixture, root } = mount(REACTIVE);
      await settle(fixture);
      expect(floated(root)).toBe(false);
      expect(fieldOf(root).classList.contains('ck-field--md')).toBe(true);
    });

    it('floats on focus and rests again on blur', async () => {
      const { fixture, root } = mount(REACTIVE);
      await settle(fixture);
      await userEvent.click(inputOf(root));
      await settle(fixture);
      expect(floated(root)).toBe(true);
      await userEvent.tab();
      await settle(fixture);
      expect(floated(root)).toBe(false);
    });

    it('floats while text is typed and rests again when it is deleted', async () => {
      const { fixture, root } = mount(REACTIVE);
      await settle(fixture);
      await userEvent.type(inputOf(root), 'a@b.de');
      await userEvent.tab();
      await settle(fixture);
      expect(floated(root)).toBe(true);
      await userEvent.clear(inputOf(root));
      await userEvent.tab();
      await settle(fixture);
      expect(floated(root)).toBe(false);
    });

    it('floats for a value that is only whitespace, and for a zero', async () => {
      const { fixture, host, root } = mount(PLAIN);
      host.text.set('   ');
      await settle(fixture);
      expect(floated(root)).toBe(true);
      host.type.set('number');
      host.text.set('0');
      await settle(fixture);
      expect(floated(root)).toBe(true);
    });

    describe.each([
      [
        'a Reactive Forms setValue',
        REACTIVE,
        (host: FieldHost, value: string) => host.form.controls.email.setValue(value),
      ],
      [
        'a Reactive Forms patchValue',
        REACTIVE,
        (host: FieldHost, value: string) => host.form.patchValue({ email: value }),
      ],
      [
        'an ngModel write',
        NG_MODEL,
        (host: FieldHost, value: string) => host.modelEmail.set(value),
      ],
      [
        'a Signal Forms write',
        SIGNAL_FORMS,
        (host: FieldHost, value: string) => host.signalForm.email().value.set(value),
      ],
      [
        'a Signal Forms model write',
        SIGNAL_FORMS,
        (host: FieldHost, value: string) => host.signalModel.set({ email: value, note: '' }),
      ],
      ['a plain [value] binding', PLAIN, (host: FieldHost, value: string) => host.text.set(value)],
    ])('on %s', (_name, template, write) => {
      it('floats for a programmatic value and rests when it is cleared', async () => {
        const { fixture, host, root } = mount(template);
        await settle(fixture);
        expect(floated(root)).toBe(false);
        write(host, 'a@b.de');
        await settle(fixture);
        await settle(fixture);
        expect(inputOf(root).value).toBe('a@b.de');
        expect(floated(root)).toBe(true);
        write(host, '');
        await settle(fixture);
        await settle(fixture);
        expect(floated(root)).toBe(false);
      });

      it('floats on first render when the value is already there', async () => {
        const { fixture, root } = mount(template, (host) => write(host, 'start@b.de'));
        await settle(fixture);
        await settle(fixture);
        expect(floated(root)).toBe(true);
      });
    });

    it('rests again after a Reactive Forms reset', async () => {
      const { fixture, host, root } = mount(REACTIVE);
      host.form.controls.email.setValue('a@b.de');
      await settle(fixture);
      expect(floated(root)).toBe(true);
      host.form.reset();
      await settle(fixture);
      expect(floated(root)).toBe(false);
    });

    it('floats for a placeholder, and rests when the placeholder goes away', async () => {
      const { fixture, host, root } = mount(PLAIN);
      await settle(fixture);
      expect(floated(root)).toBe(false);
      host.placeholder.set('Jane Doe');
      await settle(fixture);
      expect(floated(root)).toBe(true);
      host.placeholder.set('   ');
      await settle(fixture);
      expect(floated(root)).toBe(false);
      host.placeholder.set(null);
      await settle(fixture);
      expect(floated(root)).toBe(false);
    });

    it.each(['date', 'time', 'datetime-local', 'month', 'week'])(
      'floats for a native %s control',
      async (type) => {
        const { fixture, host, root } = mount(PLAIN);
        host.type.set(type);
        await settle(fixture);
        expect(floated(root)).toBe(true);
      },
    );

    it.each(['text', 'email', 'password', 'number', 'search', 'tel', 'url'])(
      'does not float an empty %s control',
      async (type) => {
        const { fixture, host, root } = mount(PLAIN);
        host.type.set(type);
        await settle(fixture);
        expect(floated(root)).toBe(false);
      },
    );

    it('floats for a prefix, even when the control is empty', async () => {
      const { fixture, root } = mount(`
        <ck-field>
          <label>Amount</label>
          <span ckPrefix>€</span>
          <input ckInput />
        </ck-field>
      `);
      await settle(fixture);
      expect(floated(root)).toBe(true);
    });

    it('floats for a prefix that appears later and rests when it goes', async () => {
      const { fixture, host, root } = mount(`
        <ck-field>
          <label>Amount</label>
          @if (showPrefix()) {
            <span ckPrefix>€</span>
          }
          <input ckInput />
        </ck-field>
      `);
      await settle(fixture);
      expect(floated(root)).toBe(true);
      host.showPrefix.set(false);
      await settle(fixture);
      expect(floated(root)).toBe(false);
    });

    it('keeps the label floated with labelFloat="always" and follows the input when it changes', async () => {
      const { fixture, host, root } = mount(REACTIVE);
      host.floatMode.set('always');
      await settle(fixture);
      expect(floated(root)).toBe(true);
      await userEvent.click(inputOf(root));
      await userEvent.tab();
      await settle(fixture);
      expect(floated(root)).toBe(true);
      host.floatMode.set('auto');
      await settle(fixture);
      expect(floated(root)).toBe(false);
    });

    it('declares the autofill float in CSS, with the same styles as the floated state', () => {
      mount(REACTIVE);
      const autofill = allRules().filter(
        (rule) =>
          rule.selectorText.includes(':autofill') && rule.selectorText.includes('ck-field__label'),
      );
      expect(autofill.length).toBeGreaterThan(0);
      const floating = autofill.filter((rule) => rule.style.insetBlockStart !== '');
      expect(floating.length).toBeGreaterThan(0);
      for (const rule of floating) {
        expect(rule.selectorText).toContain('ck-field--floated');
        expect(rule.style.insetBlockStart).toBe('-1px');
        expect(rule.style.fontSize).toBe('var(--ck-font-size-xs)');
      }
    });
  });

  describe('wiring', () => {
    it('links the label to the control through for and id', async () => {
      const { fixture, root } = mount(REACTIVE);
      await settle(fixture);
      const input = inputOf(root);
      expect(input.id).toMatch(/^ck-input-\d+$/);
      expect(query<HTMLLabelElement>(root, 'label').htmlFor).toBe(input.id);
      expect(input.labels?.[0]).toBe(query(root, 'label'));
    });

    it('keeps an id the consumer set, static or dynamic, and follows a dynamic change', async () => {
      const staticRoot = mount(`
        <ck-field><label>Name</label><input ckInput id="mine" /></ck-field>
      `);
      await settle(staticRoot.fixture);
      expect(inputOf(staticRoot.root).id).toBe('mine');
      expect(query<HTMLLabelElement>(staticRoot.root, 'label').htmlFor).toBe('mine');
      document.body.replaceChildren();
      TestBed.resetTestingModule();

      const { fixture, host, root } = mount(PLAIN);
      host.inputId.set('first');
      await settle(fixture);
      expect(inputOf(root).id).toBe('first');
      expect(query<HTMLLabelElement>(root, 'label').htmlFor).toBe('first');
      host.inputId.set('second');
      await settle(fixture);
      expect(query<HTMLLabelElement>(root, 'label').htmlFor).toBe('second');
      host.inputId.set(null);
      await settle(fixture);
      expect(inputOf(root).id).not.toBe('');
      expect(query<HTMLLabelElement>(root, 'label').htmlFor).toBe(inputOf(root).id);
    });

    it('leaves a label that already points somewhere alone', async () => {
      const { fixture, root } = mount(`
        <ck-field><label for="elsewhere">Name</label><input ckInput /></ck-field>
      `);
      await settle(fixture);
      expect(query<HTMLLabelElement>(root, 'label').htmlFor).toBe('elsewhere');
    });

    it('gives every field in a page its own ids', async () => {
      const { fixture, root } = mount(`
        <ck-field><label>One</label><input ckInput /><ck-hint>a</ck-hint></ck-field>
        <ck-field><label>Two</label><input ckInput /><ck-hint>b</ck-hint></ck-field>
      `);
      await settle(fixture);
      const ids = Array.from(root.querySelectorAll('[id]'), (element) => element.id);
      expect(new Set(ids).size).toBe(ids.length);
      const inputs = Array.from(root.querySelectorAll('input'));
      expect(inputs[0].getAttribute('aria-describedby')).not.toBe(
        inputs[1].getAttribute('aria-describedby'),
      );
    });

    describe('aria-describedby', () => {
      it('lists the hint and adds the error only while it shows', async () => {
        const { fixture, host, root } = mount(REACTIVE);
        await settle(fixture);
        const input = inputOf(root);
        const hint = query(root, 'ck-hint').id;
        const error = query(root, 'ck-error').id;
        expect(hint).toMatch(/^ck-hint-\d+$/);
        expect(error).toMatch(/^ck-error-\d+$/);
        expect(input.getAttribute('aria-describedby')).toBe(hint);
        host.form.controls.email.markAsTouched();
        await settle(fixture);
        expect(input.getAttribute('aria-describedby')).toBe(`${hint} ${error}`);
        host.form.controls.email.setValue('ok@b.de');
        await settle(fixture);
        expect(input.getAttribute('aria-describedby')).toBe(hint);
      });

      it('keeps tokens the consumer wrote, static', async () => {
        const { fixture, host, root } = mount(`
          <ck-field [invalid]="forced()">
            <label>Name</label>
            <input ckInput aria-describedby="mine other" />
            <ck-hint>Help</ck-hint>
            <ck-error>Wrong</ck-error>
          </ck-field>
        `);
        await settle(fixture);
        const input = inputOf(root);
        const hint = query(root, 'ck-hint').id;
        const error = query(root, 'ck-error').id;
        expect(input.getAttribute('aria-describedby')).toBe(`mine other ${hint}`);
        host.forced.set(true);
        await settle(fixture);
        expect(input.getAttribute('aria-describedby')).toBe(`mine other ${hint} ${error}`);
        host.forced.set(undefined);
        await settle(fixture);
        expect(input.getAttribute('aria-describedby')).toBe(`mine other ${hint}`);
      });

      it('keeps tokens the consumer binds, and follows them when they change', async () => {
        const { fixture, host, root } = mount(PLAIN);
        host.describedBy.set('first');
        await settle(fixture);
        const input = inputOf(root);
        const hint = query(root, 'ck-hint').id;
        expect(input.getAttribute('aria-describedby')).toBe(`first ${hint}`);
        host.describedBy.set('second third');
        await settle(fixture);
        expect(input.getAttribute('aria-describedby')).toBe(`second third ${hint}`);
        host.describedBy.set(null);
        await settle(fixture);
        expect(input.getAttribute('aria-describedby')).toBe(hint);
      });

      it('does not list a token twice when the consumer already points at the hint', async () => {
        const { fixture, root } = mount(`
          <ck-field>
            <label>Name</label>
            <input ckInput aria-describedby="the-hint" />
            <ck-hint id="the-hint">Help</ck-hint>
          </ck-field>
        `);
        await settle(fixture);
        expect(inputOf(root).getAttribute('aria-describedby')).toBe('the-hint');
      });

      it('removes the attribute when nothing describes the control', async () => {
        const { fixture, root } = mount(`
          <ck-field><label>Name</label><input ckInput /></ck-field>
        `);
        await settle(fixture);
        expect(inputOf(root).hasAttribute('aria-describedby')).toBe(false);
      });

      it('lists a static hint id', async () => {
        const { fixture, root } = mount(`
          <ck-field><label>Name</label><input ckInput /><ck-hint id="static-hint">Help</ck-hint></ck-field>
        `);
        await settle(fixture);
        expect(inputOf(root).getAttribute('aria-describedby')).toBe('static-hint');
      });

      it('lists a bound hint id and follows a change of it', async () => {
        const { fixture, host, root } = mount(`
          <ck-field>
            <label>Name</label>
            <input ckInput />
            <ck-hint [id]="hintId()">Help</ck-hint>
          </ck-field>
        `);
        await settle(fixture);
        expect(inputOf(root).getAttribute('aria-describedby')).toBe('hint-a');
        host.hintId.set('hint-b');
        await settle(fixture);
        expect(query(root, 'ck-hint').id).toBe('hint-b');
        expect(inputOf(root).getAttribute('aria-describedby')).toBe('hint-b');
      });

      it('follows a changed error id while the error shows, and drops the old one', async () => {
        const { fixture, host, root } = mount(`
          <ck-field [invalid]="forced()">
            <label>Name</label>
            <input ckInput />
            <ck-hint>Help</ck-hint>
            <ck-error [id]="errorId()">Wrong</ck-error>
          </ck-field>
        `);
        host.forced.set(true);
        await settle(fixture);
        const hint = query(root, 'ck-hint').id;
        expect(inputOf(root).getAttribute('aria-describedby')).toBe(`${hint} error-a`);
        host.errorId.set('error-b');
        await settle(fixture);
        expect(inputOf(root).getAttribute('aria-describedby')).toBe(`${hint} error-b`);
        host.forced.set(false);
        await settle(fixture);
        expect(inputOf(root).getAttribute('aria-describedby')).toBe(hint);
      });

      it('lists several hints in order and drops one that is removed', async () => {
        const { fixture, host, root } = mount(`
          <ck-field>
            <label>Name</label>
            <input ckInput />
            <ck-hint>One</ck-hint>
            @if (showPrefix()) {
              <ck-hint>Two</ck-hint>
            }
          </ck-field>
        `);
        await settle(fixture);
        const ids = Array.from(root.querySelectorAll('ck-hint'), (hint) => hint.id);
        expect(inputOf(root).getAttribute('aria-describedby')).toBe(ids.join(' '));
        host.showPrefix.set(false);
        await settle(fixture);
        expect(inputOf(root).getAttribute('aria-describedby')).toBe(ids[0]);
      });
    });

    describe('aria-invalid', () => {
      it('is set while errors show and removed afterwards', async () => {
        const { fixture, host, root } = mount(REACTIVE);
        await settle(fixture);
        const input = inputOf(root);
        expect(input.hasAttribute('aria-invalid')).toBe(false);
        host.form.controls.email.markAsTouched();
        await settle(fixture);
        expect(input.getAttribute('aria-invalid')).toBe('true');
        host.form.controls.email.setValue('ok@b.de');
        await settle(fixture);
        expect(input.hasAttribute('aria-invalid')).toBe(false);
      });

      it('gives a static consumer value back, and follows a dynamic one', async () => {
        const staticMount = mount(`
          <ck-field [invalid]="forced()">
            <label>Name</label>
            <input ckInput aria-invalid="false" />
          </ck-field>
        `);
        await settle(staticMount.fixture);
        const staticInput = inputOf(staticMount.root);
        expect(staticInput.getAttribute('aria-invalid')).toBe('false');
        staticMount.host.forced.set(true);
        await settle(staticMount.fixture);
        expect(staticInput.getAttribute('aria-invalid')).toBe('true');
        staticMount.host.forced.set(undefined);
        await settle(staticMount.fixture);
        expect(staticInput.getAttribute('aria-invalid')).toBe('false');
        document.body.replaceChildren();
        TestBed.resetTestingModule();

        const { fixture, host, root } = mount(PLAIN);
        host.ariaInvalid.set('grammar');
        await settle(fixture);
        const input = inputOf(root);
        expect(input.getAttribute('aria-invalid')).toBe('grammar');
        host.forced.set(true);
        await settle(fixture);
        expect(input.getAttribute('aria-invalid')).toBe('true');
        host.ariaInvalid.set('spelling');
        await settle(fixture);
        expect(input.getAttribute('aria-invalid')).toBe('true');
        host.forced.set(undefined);
        await settle(fixture);
        expect(input.getAttribute('aria-invalid')).toBe('spelling');
        host.ariaInvalid.set(null);
        host.forced.set(true);
        await settle(fixture);
        host.forced.set(false);
        await settle(fixture);
        expect(input.hasAttribute('aria-invalid')).toBe(false);
      });
    });

    describe('required', () => {
      const MARKER = 'label > .ck-field__required';

      it('marks a natively required control through the label, without a redundant aria-required', async () => {
        const { fixture, root } = mount(`
          <ck-field><label>Name</label><input ckInput required /></ck-field>
        `);
        await settle(fixture);
        const marker = query(root, MARKER);
        expect(marker.getAttribute('aria-hidden')).toBe('true');
        expect(marker.textContent).toBe(' *');
        expect(inputOf(root).hasAttribute('aria-required')).toBe(false);
        expect(query(root, 'label').textContent).toBe('Name *');
      });

      it('keeps the accessible name free of the marker', async () => {
        const { fixture, root } = mount(`
          <ck-field><label>Name</label><input ckInput required /></ck-field>
        `);
        await settle(fixture);
        const accessibleName = Array.from(query(root, 'label').childNodes, (node) =>
          node instanceof Element && node.getAttribute('aria-hidden') === 'true'
            ? ''
            : node.textContent,
        ).join('');
        expect(accessibleName.trim()).toBe('Name');
      });

      it('reads Validators.required from Reactive Forms', async () => {
        const { fixture, root } = mount(REACTIVE);
        await settle(fixture);
        expect(root.querySelector(MARKER)).not.toBeNull();
        expect(inputOf(root).getAttribute('aria-required')).toBe('true');
        expect(root.querySelectorAll(MARKER)).toHaveLength(1);
      });

      it('does not mark a Reactive control that has no required validator', async () => {
        const { fixture, root } = mount(`
          <form [formGroup]="form">
            <ck-field><label>Note</label><input ckInput formControlName="note" /></ck-field>
          </form>
        `);
        await settle(fixture);
        expect(root.querySelector(MARKER)).toBeNull();
        expect(inputOf(root).hasAttribute('aria-required')).toBe(false);
      });

      it('drops the marker and aria-required when the validator is removed', async () => {
        const { fixture, host, root } = mount(REACTIVE);
        await settle(fixture);
        host.form.controls.email.setValidators([Validators.email]);
        host.form.controls.email.updateValueAndValidity();
        await settle(fixture);
        expect(root.querySelector(MARKER)).toBeNull();
        expect(inputOf(root).hasAttribute('aria-required')).toBe(false);
        host.form.controls.email.setValidators([Validators.required]);
        host.form.controls.email.updateValueAndValidity();
        await settle(fixture);
        expect(root.querySelector(MARKER)).not.toBeNull();
        expect(inputOf(root).getAttribute('aria-required')).toBe('true');
      });

      it('reads required from an ngModel control', async () => {
        const { fixture, root } = mount(NG_MODEL);
        await settle(fixture);
        await settle(fixture);
        expect(root.querySelector(MARKER)).not.toBeNull();
      });

      it('reads required from Signal Forms state', async () => {
        const { fixture, root } = mount(SIGNAL_FORMS);
        await settle(fixture);
        await settle(fixture);
        expect(root.querySelector(MARKER)).not.toBeNull();
        const input = inputOf(root);
        expect(input.required || input.getAttribute('aria-required') === 'true').toBe(true);
      });

      it('keeps one marker across many renders and re-adds it after the label is swapped', async () => {
        const { fixture, host, root } = mount(`
          <ck-field>
            @if (showPrefix()) {
              <label>Name</label>
            } @else {
              <label>Other</label>
            }
            <input ckInput required [value]="text()" />
          </ck-field>
        `);
        await settle(fixture);
        host.text.set('x');
        await settle(fixture);
        expect(root.querySelectorAll(MARKER)).toHaveLength(1);
        host.showPrefix.set(false);
        await settle(fixture);
        expect(query(root, 'label').textContent).toBe('Other *');
        expect(root.querySelectorAll(MARKER)).toHaveLength(1);
        expect(query<HTMLLabelElement>(root, 'label').htmlFor).toBe(inputOf(root).id);
      });

      it('reuses a marker that is already in the label, and does not double it', async () => {
        const { fixture, root } = mount(`
          <ck-field>
            <label>Email<span class="ck-field__required" aria-hidden="true"> *</span></label>
            <input ckInput required />
          </ck-field>
        `);
        await settle(fixture);
        await settle(fixture);
        expect(root.querySelectorAll(MARKER)).toHaveLength(1);
        expect(query(root, 'label').textContent).toBe('Email *');
      });

      it('removes pre-rendered markers when the control is not required, and any extra copy', async () => {
        const { fixture, root } = mount(`
          <ck-field>
            <label>Email<span class="ck-field__required"> *</span></label>
            <input ckInput />
          </ck-field>
          <ck-field>
            <label>Name<span class="ck-field__required"> *</span><span class="ck-field__required"> *</span></label>
            <input ckInput required />
          </ck-field>
        `);
        await settle(fixture);
        const labels = Array.from(root.querySelectorAll('label'));
        expect(labels[0].querySelectorAll('.ck-field__required')).toHaveLength(0);
        expect(labels[1].querySelectorAll('.ck-field__required')).toHaveLength(1);
      });

      it('keeps the marker outside the clipped text, so a long label never loses it', async () => {
        const { fixture, root } = mount(`
          <div style="inline-size: 160px">
            <ck-field>
              <label>A very long label that does not fit into this narrow field</label>
              <input ckInput required />
            </ck-field>
          </div>
        `);
        await settle(fixture);
        const label = query(root, 'label').getBoundingClientRect();
        const marker = query(root, MARKER).getBoundingClientRect();
        expect(getComputedStyle(query(root, MARKER)).position).toBe('absolute');
        expect(marker.width).toBeGreaterThan(0);
        expect(marker.right).toBeLessThanOrEqual(label.right + 0.5);
        expect(marker.left).toBeGreaterThanOrEqual(label.left);
        expect(query(root, 'label').scrollWidth).toBeGreaterThan(
          query(root, 'label').clientWidth - 1,
        );
      });
    });
  });

  describe('error visibility', () => {
    const errorOf = (root: HTMLElement) => query(root, 'ck-error');
    const shown = (root: HTMLElement) => !errorOf(root).hidden;

    describe('Reactive Forms', () => {
      it('hides a pristine invalid control, and the error stays in the DOM, hidden', async () => {
        const { fixture, root } = mount(REACTIVE);
        await settle(fixture);
        expect(errorOf(root).hasAttribute('hidden')).toBe(true);
        expect(fieldOf(root).classList.contains('ck-field--invalid')).toBe(false);
      });

      it('shows after the control is touched, by blur', async () => {
        const { fixture, root } = mount(REACTIVE);
        await settle(fixture);
        await userEvent.click(inputOf(root));
        await settle(fixture);
        expect(shown(root)).toBe(false);
        await userEvent.tab();
        await settle(fixture);
        expect(shown(root)).toBe(true);
        expect(fieldOf(root).classList.contains('ck-field--invalid')).toBe(true);
      });

      it('hides again when the value becomes valid, and when the control is reset', async () => {
        const { fixture, host, root } = mount(REACTIVE);
        host.form.controls.email.markAsTouched();
        await settle(fixture);
        expect(shown(root)).toBe(true);
        host.form.controls.email.setValue('ok@b.de');
        await settle(fixture);
        expect(root.querySelector('ck-error')).toBeNull();
        host.form.reset();
        await settle(fixture);
        expect(shown(root)).toBe(false);
      });

      it('shows on submit without the control ever being touched', async () => {
        const { fixture, host, root } = mount(REACTIVE);
        await settle(fixture);
        expect(shown(root)).toBe(false);
        query<HTMLButtonElement>(root, 'button').click();
        await settle(fixture);
        expect(host.submits()).toBe(1);
        expect(shown(root)).toBe(true);
      });

      it('is forced on by invalid=true and off by invalid=false', async () => {
        const { fixture, host, root } = mount(REACTIVE);
        await settle(fixture);
        host.form.controls.email.setValue('ok@b.de');
        host.forced.set(true);
        await settle(fixture);
        expect(fieldOf(root).classList.contains('ck-field--invalid')).toBe(true);
        expect(inputOf(root).getAttribute('aria-invalid')).toBe('true');
        host.form.controls.email.setValue('');
        host.form.controls.email.markAsTouched();
        host.forced.set(false);
        await settle(fixture);
        expect(shown(root)).toBe(false);
        expect(fieldOf(root).classList.contains('ck-field--invalid')).toBe(false);
        expect(inputOf(root).hasAttribute('aria-invalid')).toBe(false);
      });

      it('keeps a ck-error that the consumer renders hidden until errors show', async () => {
        const { fixture, host, root } = mount(`
          <ck-field [invalid]="forced()">
            <label>Name</label>
            <input ckInput />
            <ck-error [hidden]="false">Wrong</ck-error>
          </ck-field>
        `);
        await settle(fixture);
        expect(query(root, 'ck-error').hidden).toBe(true);
        host.forced.set(true);
        await settle(fixture);
        expect(query(root, 'ck-error').hidden).toBe(false);
      });
    });

    describe('ngModel', () => {
      it('hides a pristine invalid control, shows it after blur', async () => {
        const { fixture, root } = mount(NG_MODEL);
        await settle(fixture);
        await settle(fixture);
        expect(errorOf(root).hasAttribute('hidden')).toBe(true);
        await userEvent.click(inputOf(root));
        await userEvent.tab();
        await settle(fixture);
        expect(shown(root)).toBe(true);
        await userEvent.type(inputOf(root), 'a@b.de');
        await settle(fixture);
        expect(root.querySelector('ck-error')).toBeNull();
      });

      it('shows on submit without a touch', async () => {
        const { fixture, host, root } = mount(NG_MODEL);
        await settle(fixture);
        await settle(fixture);
        expect(shown(root)).toBe(false);
        query<HTMLButtonElement>(root, 'button').click();
        await settle(fixture);
        expect(host.submits()).toBe(1);
        expect(shown(root)).toBe(true);
      });

      it('is forced by invalid', async () => {
        const { fixture, host, root } = mount(NG_MODEL);
        host.forced.set(true);
        await settle(fixture);
        await settle(fixture);
        expect(shown(root)).toBe(true);
      });
    });

    describe('Signal Forms', () => {
      it('hides a pristine invalid control, shows it after blur', async () => {
        const { fixture, root } = mount(SIGNAL_FORMS);
        await settle(fixture);
        expect(errorOf(root).hasAttribute('hidden')).toBe(true);
        await userEvent.click(inputOf(root));
        await userEvent.tab();
        await settle(fixture);
        expect(shown(root)).toBe(true);
        expect(inputOf(root).getAttribute('aria-invalid')).toBe('true');
      });

      it('shows after submit() marks every field touched', async () => {
        const { fixture, host, root } = mount(SIGNAL_FORMS);
        await settle(fixture);
        expect(shown(root)).toBe(false);
        host.submitSignalForm();
        await settle(fixture);
        await settle(fixture);
        expect(shown(root)).toBe(true);
      });

      it('hides again once the value is valid', async () => {
        const { fixture, host, root } = mount(SIGNAL_FORMS);
        host.signalForm.email().markAsTouched();
        await settle(fixture);
        expect(shown(root)).toBe(true);
        host.signalForm.email().value.set('ok@b.de');
        await settle(fixture);
        await settle(fixture);
        expect(root.querySelector('ck-error')).toBeNull();
        expect(inputOf(root).hasAttribute('aria-invalid')).toBe(false);
      });

      it('is forced by invalid', async () => {
        const { fixture, host, root } = mount(SIGNAL_FORMS);
        host.forced.set(true);
        await settle(fixture);
        expect(shown(root)).toBe(true);
      });
    });

    it('keeps a hint visible next to an error', async () => {
      const { fixture, host, root } = mount(REACTIVE);
      host.form.controls.email.markAsTouched();
      await settle(fixture);
      expect(shown(root)).toBe(true);
      const hint = query(root, 'ck-hint');
      expect(hint.hidden).toBe(false);
      expect(hint.getBoundingClientRect().height).toBeGreaterThan(0);
      expect(inputOf(root).getAttribute('aria-describedby')).toContain(hint.id);
    });

    describe('live region', () => {
      it('wraps the errors in one polite region that is the same node before and after', async () => {
        const { fixture, host, root } = mount(REACTIVE);
        await settle(fixture);
        const region = query(root, '.ck-field__errors');
        expect(region.getAttribute('aria-live')).toBe('polite');
        expect(region.contains(errorOf(root))).toBe(true);
        host.form.controls.email.markAsTouched();
        await settle(fixture);
        expect(query(root, '.ck-field__errors')).toBe(region);
        expect(region.contains(errorOf(root))).toBe(true);
        expect(region.hasAttribute('hidden')).toBe(false);
      });

      it('is not inside another live region and keeps hints out of it', async () => {
        const { fixture, root } = mount(REACTIVE);
        await settle(fixture);
        const region = query(root, '.ck-field__errors');
        expect(region.closest('[aria-live]')).toBe(region);
        expect(region.contains(query(root, 'ck-hint'))).toBe(false);
      });
    });
  });

  describe('disabled and readonly', () => {
    it('shows the disabled state for a disabled Reactive control, and back', async () => {
      const { fixture, host, root } = mount(REACTIVE);
      await settle(fixture);
      host.form.controls.email.disable();
      await settle(fixture);
      expect(inputOf(root).disabled).toBe(true);
      expect(fieldOf(root).classList.contains('ck-field--disabled')).toBe(true);
      host.form.controls.email.enable();
      await settle(fixture);
      expect(fieldOf(root).classList.contains('ck-field--disabled')).toBe(false);
    });

    it('shows the disabled state for a disabled attribute and inside a disabled fieldset', async () => {
      const { fixture, root } = mount(`
        <ck-field><label>A</label><input ckInput disabled /></ck-field>
        <fieldset disabled><ck-field><label>B</label><input ckInput /></ck-field></fieldset>
        <ck-field><label>C</label><input ckInput /></ck-field>
      `);
      await settle(fixture);
      const states = Array.from(root.querySelectorAll('ck-field'), (field) =>
        field.classList.contains('ck-field--disabled'),
      );
      expect(states).toEqual([true, true, false]);
    });

    it('gives a disabled control the disabled colour and cursor', async () => {
      const { fixture, root } = mount(`
        <ck-field><label>A</label><input ckInput disabled value="x" /></ck-field>
      `);
      root.style.setProperty('--ck-color-fg-disabled', 'rgb(1, 2, 3)');
      await settle(fixture);
      expect(getComputedStyle(inputOf(root)).color).toBe('rgb(1, 2, 3)');
      expect(getComputedStyle(inputOf(root)).cursor).toBe('not-allowed');
    });

    it('treats a readonly control like a normal one: focusable, floats on focus, keeps its value', async () => {
      const { fixture, root } = mount(`
        <ck-field><label>A</label><input ckInput readonly value="locked" /></ck-field>
        <ck-field><label>B</label><input ckInput readonly /></ck-field>
      `);
      await settle(fixture);
      const [first, second] = Array.from(root.querySelectorAll('ck-field'));
      expect(first.classList.contains('ck-field--disabled')).toBe(false);
      expect(first.classList.contains('ck-field--floated')).toBe(true);
      expect(getComputedStyle(first.querySelector('.ck-field__box')!).backgroundImage).toBe('none');
      await userEvent.type(first.querySelector('input')!, 'zzz');
      expect(first.querySelector('input')!.value).toBe('locked');
      second.querySelector('input')!.focus();
      await settle(fixture);
      expect(second.classList.contains('ck-field--floated')).toBe(true);
    });
  });

  describe('size', () => {
    it('follows provideCkui and the size input', async () => {
      TestBed.configureTestingModule({ providers: [provideCkui({ size: 'lg' })] });
      const { fixture, root } = mount(`
        <ck-field><label>A</label><input ckInput /></ck-field>
        <ck-field size="sm"><label>B</label><input ckInput /></ck-field>
      `);
      await settle(fixture);
      const [first, second] = Array.from(root.querySelectorAll('ck-field'));
      expect(first.classList.contains('ck-field--lg')).toBe(true);
      expect(second.classList.contains('ck-field--sm')).toBe(true);
      expect(second.classList.contains('ck-field--lg')).toBe(false);
    });

    it('has the control height of each size', async () => {
      const { fixture, root } = mount(`
        <ck-field size="sm"><label>A</label><input ckInput /></ck-field>
        <ck-field size="md"><label>B</label><input ckInput /></ck-field>
        <ck-field size="lg"><label>C</label><input ckInput /></ck-field>
        <ck-field size="xl"><label>D</label><input ckInput /></ck-field>
      `);
      await settle(fixture);
      const heights = Array.from(
        root.querySelectorAll('.ck-field__box'),
        (box) => box.getBoundingClientRect().height,
      );
      expect(heights).toEqual([32, 40, 48, 60]);
    });

    it('ignores the size input of a ckInput inside a field', async () => {
      const { fixture, root } = mount(`
        <ck-field size="sm"><label>A</label><input ckInput size="lg" /></ck-field>
      `);
      await settle(fixture);
      expect(inputOf(root).classList.contains('ck-input--standalone')).toBe(false);
      expect(inputOf(root).classList.contains('ck-input--lg')).toBe(false);
      expect(query(root, '.ck-field__box').getBoundingClientRect().height).toBe(32);
    });
  });

  describe('component tokens', () => {
    it('reads radius, background and border colour with fallbacks and never declares them', async () => {
      const { fixture, root } = mount(`
        <ck-field><label>A</label><input ckInput /></ck-field>
      `);
      await settle(fixture);
      const box = query(root, '.ck-field__box');
      expect(getComputedStyle(box).borderTopLeftRadius).toBe('8px');
      expect(getComputedStyle(box).backgroundColor).toBe('rgb(255, 255, 255)');
      expect(getComputedStyle(box).borderTopColor).toBe('rgb(120, 120, 130)');
      root.style.setProperty('--ck-field-radius', '2px');
      root.style.setProperty('--ck-field-bg', 'rgb(1, 2, 3)');
      root.style.setProperty('--ck-field-border-color', 'rgb(4, 5, 6)');
      expect(getComputedStyle(box).borderTopLeftRadius).toBe('2px');
      expect(getComputedStyle(box).backgroundColor).toBe('rgb(1, 2, 3)');
      expect(getComputedStyle(box).borderTopColor).toBe('rgb(4, 5, 6)');
    });
  });

  describe('dev warnings', () => {
    const warnings = () => vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    it('does not warn for a well-formed field', async () => {
      const warn = warnings();
      const { fixture } = mount(REACTIVE);
      await settle(fixture);
      expect(warn).not.toHaveBeenCalled();
    });

    it('warns once for a field without a label', async () => {
      const warn = warnings();
      const { fixture } = mount('<ck-field><input ckInput aria-label="Name" /></ck-field>');
      await settle(fixture);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('no <label>');
    });

    it('warns for a field without a ckInput', async () => {
      const warn = warnings();
      const { fixture } = mount('<ck-field><label>Name</label></ck-field>');
      await settle(fixture);
      expect(warn.mock.calls.map((call) => String(call[0])).join('\n')).toContain(
        'exactly one control (ckInput or ck-stepper), found 0',
      );
    });

    it('warns for a field with two ckInputs', async () => {
      const warn = warnings();
      const { fixture } = mount(
        '<ck-field><label>Name</label><input ckInput /><input ckInput /></ck-field>',
      );
      await settle(fixture);
      expect(warn.mock.calls.map((call) => String(call[0])).join('\n')).toContain(
        'exactly one control (ckInput or ck-stepper), found 2',
      );
    });

    it('warns for a ck-error outside a field, with the element', async () => {
      const warn = warnings();
      const { fixture, root } = mount('<ck-error>Oops</ck-error>');
      await settle(fixture);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('outside a ck-field');
      expect(warn.mock.calls[0][1]).toBe(root.querySelector('ck-error'));
      expect(query(root, 'ck-error').hidden).toBe(false);
    });

    it('does not warn when the field is destroyed before it rendered', async () => {
      const warn = warnings();
      TestBed.overrideComponent(FieldHost, {
        set: { template: '<ck-field><input ckInput /></ck-field>' },
      });
      const fixture = TestBed.createComponent(FieldHost);
      fixture.destroy();
      await fixture.whenStable();
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('content', () => {
    it('keeps working after the control and its label are swapped out and back', async () => {
      const { fixture, host, root } = mount(`
        <ck-field>
          @if (showPrefix()) {
            <label>First</label>
          }
          @if (showPrefix()) {
            <input ckInput />
          }
        </ck-field>
      `);
      await settle(fixture);
      host.showPrefix.set(false);
      await settle(fixture);
      expect(floated(root)).toBe(false);
      host.showPrefix.set(true);
      await settle(fixture);
      expect(query<HTMLLabelElement>(root, 'label').htmlFor).toBe(inputOf(root).id);
    });

    it('does nothing to the DOM after it is destroyed', async () => {
      const { fixture, host, root } = mount(REACTIVE);
      await settle(fixture);
      const input = inputOf(root);
      fixture.destroy();
      const setAttribute = vi.spyOn(Element.prototype, 'setAttribute');
      const removeAttribute = vi.spyOn(Element.prototype, 'removeAttribute');
      host.form.controls.email.setValue('late');
      host.form.controls.email.markAsTouched();
      host.form.reset();
      for (const type of ['focus', 'input', 'change', 'blur']) {
        input.dispatchEvent(new Event(type));
      }
      await new Promise((resolve) => setTimeout(resolve));
      expect(setAttribute).not.toHaveBeenCalled();
      expect(removeAttribute).not.toHaveBeenCalled();
    });
  });

  describe('required probing', () => {
    it('asks a composed validator about an empty value only once, however often it refreshes', async () => {
      const { fixture, host, root } = mount(`
        <form [formGroup]="form">
          <ck-field><label>Note</label><input ckInput formControlName="note" /></ck-field>
        </form>
      `);
      const note = host.form.controls.note;
      const validator = vi.fn((control: { value: unknown }) =>
        control.value === '' ? { required: true } : null,
      );
      note.setValidators(validator as never);
      note.updateValueAndValidity();
      await settle(fixture);
      for (const text of ['a', 'ab', 'abc']) {
        await userEvent.type(inputOf(root), text);
        await settle(fixture);
      }
      const probes = validator.mock.calls.filter(([control]) => (control as unknown) !== note);
      expect(probes).toHaveLength(1);
      expect(root.querySelector('.ck-field__required')).not.toBeNull();
    });
  });

  describe('pre-rendered markup', () => {
    it('does not keep library ids in aria-describedby that were written earlier', async () => {
      const { fixture, root } = mount(`
        <ck-field>
          <label>Name</label>
          <input ckInput aria-describedby="mine pre-hint pre-error" />
          <ck-hint id="pre-hint">Help</ck-hint>
          <ck-error id="pre-error">Wrong</ck-error>
        </ck-field>
      `);
      await settle(fixture);
      expect(inputOf(root).getAttribute('aria-describedby')).toBe('mine pre-hint');
    });

    it('removes a library aria-invalid that was written earlier, and gives the consumer value back', async () => {
      const { fixture, root } = mount(`
        <ck-field>
          <label>A</label>
          <input ckInput aria-invalid="true" data-ck-claim-aria-invalid="none" />
        </ck-field>
        <ck-field>
          <label>B</label>
          <input ckInput aria-invalid="true" data-ck-claim-aria-invalid="value:false" />
        </ck-field>
        <ck-field>
          <label>C</label>
          <input ckInput aria-invalid="true" />
        </ck-field>
      `);
      await settle(fixture);
      const [first, second, third] = Array.from(root.querySelectorAll('input'));
      expect(first.hasAttribute('aria-invalid')).toBe(false);
      expect(first.hasAttribute('data-ck-claim-aria-invalid')).toBe(false);
      expect(second.getAttribute('aria-invalid')).toBe('false');
      expect(third.getAttribute('aria-invalid')).toBe('true');
    });

    it('does not mistake a pre-rendered aria-required for the consumer own', async () => {
      const { fixture, root } = mount(`
        <ck-field>
          <label>A</label>
          <input ckInput aria-required="true" data-ck-claim-aria-required="none" />
        </ck-field>
      `);
      await settle(fixture);
      expect(inputOf(root).hasAttribute('aria-required')).toBe(false);
    });
  });

  describe('number input with bad input', () => {
    it.each(['-', '1e'])('floats for %s, which reports an empty value', async (text) => {
      const { fixture, root } = mount(
        '<ck-field><label>Amount</label><input ckInput type="number" /></ck-field>',
      );
      await settle(fixture);
      const input = inputOf(root);
      input.focus();
      await userEvent.type(input, text);
      expect(input.value).toBe('');
      input.blur();
      await settle(fixture);
      expect(input.validity.badInput).toBe(true);
      expect(floated(root)).toBe(true);
    });
  });
});
