import { ApplicationRef, reflectComponentType } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CkField, CkInput } from '@ckui/core/field';
import { page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../../../../core/testing/axe';
import { contrastRatio } from '../../../../../../core/testing/contrast';
import { compositeOver } from '../../../testing/composite';
import { resetTestTheme, setTestTheme, settleAnimations } from '../../../testing/theme-env';
import { FieldPage } from './field-page';
import { SAMPLES } from './field-samples';

const FORMS = ['reactive', 'ngModel', 'signal'] as const;

describe('FieldPage', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [FieldPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(FieldPage);
    document.body.appendChild(fixture.nativeElement);
    await settle();
    await settleAnimations();
    return fixture.nativeElement as HTMLElement;
  }

  async function settle(): Promise<void> {
    await TestBed.inject(ApplicationRef).whenStable();
    TestBed.inject(ApplicationRef).tick();
    await TestBed.inject(ApplicationRef).whenStable();
  }

  const formAt = (element: HTMLElement, index: number): HTMLFormElement =>
    element.querySelectorAll<HTMLFormElement>('form.form')[index];
  const send = (form: HTMLFormElement): HTMLButtonElement =>
    form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const inputOf = (form: HTMLFormElement, label: string): HTMLInputElement =>
    Array.from(form.querySelectorAll('ck-field'))
      .find((field) => field.querySelector('label')?.textContent?.trim().startsWith(label))!
      .querySelector('input, textarea')!;

  afterEach(() => {
    document.body.replaceChildren();
    resetTestTheme();
  });

  it('has the five sections in order, with one h1 and no skipped heading levels', async () => {
    const element = await render();
    expect(element.querySelectorAll('h1')).toHaveLength(1);
    expect(Array.from(element.querySelectorAll('h2'), (heading) => heading.textContent)).toEqual([
      'Examples',
      'API',
      'Keyboard',
      'Accessibility',
      'Tokens',
    ]);
    let previous = 1;
    for (const heading of Array.from(element.querySelectorAll('h1, h2, h3, h4'))) {
      const level = Number(heading.tagName.slice(1));
      expect(level - previous).toBeLessThanOrEqual(1);
      previous = level;
    }
  });

  it('renders every code sample as plain text in a pre block', async () => {
    const element = await render();
    const blocks = Array.from(element.querySelectorAll('pre > code'), (code) => code.textContent);
    expect(blocks).toEqual(Object.values(SAMPLES));
    expect(element.querySelectorAll('pre code *')).toHaveLength(0);
  });

  it('documents every input of the field and the input', async () => {
    const element = await render();
    const rows = Array.from(element.querySelectorAll('#api + .table-scroll tbody tr'), (row) => [
      row.querySelector('th')!.textContent!.trim(),
      row.querySelectorAll('td')[0].textContent!.trim(),
    ]);
    const documented = (on: string) =>
      rows.filter(([, owner]) => owner === on || owner === `textarea[${on}]`).map(([name]) => name);
    expect(documented('ck-field').sort()).toEqual(
      reflectComponentType(CkField)!
        .inputs.map((input) => input.templateName)
        .sort(),
    );
    const inputDirective = (CkInput as unknown as { ɵdir: { inputs: Record<string, unknown> } })
      .ɵdir;
    expect(documented('ckInput').sort()).toEqual(Object.keys(inputDirective.inputs).sort());
  });

  it('labels every table with a caption and column headers', async () => {
    const element = await render();
    for (const table of Array.from(element.querySelectorAll('table'))) {
      expect(table.querySelector('caption')?.textContent?.trim()).toBeTruthy();
      expect(table.querySelectorAll('thead th[scope="col"]').length).toBeGreaterThan(0);
    }
  });

  describe('the three forms', () => {
    it('shows the same form three times, each with a ghost icon-only button in a suffix', async () => {
      const element = await render();
      const forms = Array.from(element.querySelectorAll<HTMLFormElement>('form.form'));
      expect(forms).toHaveLength(3);
      const shapes = forms.map((form) =>
        Array.from(form.querySelectorAll('ck-field'), (field) =>
          field.querySelector('label')!.textContent!.replace('*', '').trim(),
        ),
      );
      expect(shapes).toEqual(FORMS.map(() => ['Email', 'Password', 'Message']));
      for (const form of forms) {
        const toggle = form.querySelector<HTMLElement>('.ck-field__suffix > button')!;
        expect(toggle.classList.contains('ck-button--ghost')).toBe(true);
        expect(toggle.classList.contains('ck-button--icon-only')).toBe(true);
        expect(toggle.getAttribute('aria-label')).toBe('Show password');
        expect(toggle.getAttribute('aria-pressed')).toBe('false');
      }
    });

    it.each(FORMS.map((name, index) => [name, index] as const))(
      'hides the errors of the %s form until it is submitted, then shows them',
      async (_name, index) => {
        const element = await render();
        const form = formAt(element, index);
        const errors = () => Array.from(form.querySelectorAll<HTMLElement>('ck-error'));
        expect(errors().every((error) => error.hidden)).toBe(true);
        expect(form.querySelector('[aria-invalid="true"]')).toBeNull();
        await userEvent.click(send(form));
        await settle();
        await settle();
        const visible = errors().filter((error) => !error.hidden);
        expect(visible).toHaveLength(2);
        expect(visible.map((error) => error.textContent!.trim())).toEqual([
          'Enter your email.',
          'Use at least 8 characters.',
        ]);
        expect(form.querySelectorAll('[aria-invalid="true"]')).toHaveLength(2);
        expect(form.querySelector('.status')!.textContent).toContain('Not sent');
      },
    );

    it.each(FORMS.map((name, index) => [name, index] as const))(
      'sends the %s form once it is valid, and the errors go away',
      async (_name, index) => {
        const element = await render();
        const form = formAt(element, index);
        await userEvent.click(send(form));
        await settle();
        await userEvent.type(inputOf(form, 'Email'), 'jane@example.com');
        await userEvent.type(inputOf(form, 'Password'), 'long enough');
        await userEvent.type(inputOf(form, 'Message'), 'one\ntwo');
        await settle();
        expect(
          Array.from(form.querySelectorAll<HTMLElement>('ck-error')).filter(
            (error) => !error.hidden,
          ),
        ).toHaveLength(0);
        await userEvent.click(send(form));
        await settle();
        await settle();
        expect(form.querySelector('.status')!.textContent).toContain('Sent');
        for (const field of Array.from(form.querySelectorAll('ck-field'))) {
          expect(field.classList.contains('ck-field--floated')).toBe(true);
        }
      },
    );

    it.each(FORMS.map((name, index) => [name, index] as const))(
      'shows the email error as soon as the %s field is left empty, with a described, invalid control',
      async (_name, index) => {
        const element = await render();
        const form = formAt(element, index);
        const email = inputOf(form, 'Email');
        await userEvent.click(email);
        await userEvent.tab();
        await settle();
        await settle();
        const error = form.querySelector<HTMLElement>('ck-error')!;
        expect(error.hidden).toBe(false);
        expect(email.getAttribute('aria-invalid')).toBe('true');
        expect(email.getAttribute('aria-describedby')!.split(' ')).toContain(error.id);
        expect(email.getAttribute('aria-describedby')!.split(' ')).toContain(
          form.querySelector('ck-hint')!.id,
        );
      },
    );

    it.each(FORMS.map((name, index) => [name, index] as const))(
      'toggles the password of the %s form and keeps the focus on the button',
      async (_name, index) => {
        const element = await render();
        const form = formAt(element, index);
        const password = inputOf(form, 'Password');
        const toggle = form.querySelector<HTMLButtonElement>('.ck-field__suffix > button')!;
        expect(password.type).toBe('password');
        await userEvent.click(toggle);
        await settle();
        expect(password.type).toBe('text');
        expect(toggle.getAttribute('aria-pressed')).toBe('true');
        expect(document.activeElement).toBe(toggle);
        await userEvent.click(toggle);
        await settle();
        expect(password.type).toBe('password');
        expect(toggle.getAttribute('aria-pressed')).toBe('false');
      },
    );

    it('keeps the control height with the suffix button, and the text at 16px or more', async () => {
      const element = await render();
      for (const form of Array.from(element.querySelectorAll<HTMLFormElement>('form.form'))) {
        const field = form.querySelectorAll('ck-field')[1];
        expect(field.querySelector('.ck-field__box')!.getBoundingClientRect().height).toBe(40);
        expect(
          parseFloat(getComputedStyle(field.querySelector('input')!).fontSize),
        ).toBeGreaterThanOrEqual(16);
      }
    });

    it('grows the message with its text up to the maximum rows', async () => {
      const element = await render();
      const message = inputOf(formAt(element, 0), 'Message');
      const before = message.getBoundingClientRect().height;
      await userEvent.type(message, '1\n2\n3\n4\n5\n6\n7\n8');
      await settle();
      const after = message.getBoundingClientRect().height;
      expect(after).toBeGreaterThan(before);
      expect(message.scrollHeight).toBeGreaterThan(message.clientHeight);
    });
  });

  it('forces the error of the demo by hand', async () => {
    const element = await render();
    const toggle = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.trim() === 'Force the error',
    )!;
    const field = toggle.parentElement!.querySelector('ck-field')!;
    expect(field.querySelector<HTMLElement>('ck-error')!.hidden).toBe(true);
    await userEvent.click(toggle);
    await settle();
    expect(field.querySelector<HTMLElement>('ck-error')!.hidden).toBe(false);
    expect(field.classList.contains('ck-field--invalid')).toBe(true);
  });

  describe('table layout', () => {
    afterEach(async () => {
      await page.viewport(800, 600);
    });

    it('keeps every row header on one line at 1280px', async () => {
      await page.viewport(1280, 800);
      const element = await render();
      const headers = Array.from(element.querySelectorAll('table tbody th[scope="row"]'));
      expect(headers.length).toBeGreaterThan(5);
      for (const header of headers) {
        for (const item of Array.from(header.querySelectorAll('code, kbd'))) {
          expect(item.getClientRects().length, header.textContent!).toBe(1);
        }
      }
    });

    it('does not overflow the page at 390px', async () => {
      await page.viewport(390, 844);
      await render();
      expect(window.innerWidth).toBe(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    });
  });

  describe.each(['light', 'dark'] as const)('in the %s theme', (theme) => {
    it('has no axe violations, idle and with every error showing', async () => {
      setTestTheme(theme);
      const element = await render();
      await expectNoAxeViolations(element);
      for (const index of [0, 1, 2]) {
        await userEvent.click(send(formAt(element, index)));
      }
      await settle();
      await settle();
      await settleAnimations();
      expect(element.querySelectorAll('ck-error:not([hidden])').length).toBeGreaterThan(3);
      await expectNoAxeViolations(element);
    });

    it('meets text contrast for label, floated label, hint, error and placeholder', async () => {
      setTestTheme(theme);
      const element = await render();
      const failures: string[] = [];
      const check = (name: string, foreground: string, background: string, minimum = 4.5) => {
        const ratio = contrastRatio(foreground, background);
        if (ratio < minimum) {
          failures.push(`${name}: ${ratio.toFixed(2)}`);
        }
      };
      const surface = getComputedStyle(element.querySelector('.ck-field__box')!).backgroundColor;
      const pageBackground = getComputedStyle(element.querySelector('.demo')!).backgroundColor;
      const resting = element.querySelector<HTMLElement>('ck-field label')!;
      check('resting label', getComputedStyle(resting).color, surface);
      const floating = element.querySelector<HTMLElement>('ck-field[labelfloat="always"] label')!;
      check('floated label on the field', getComputedStyle(floating).color, surface);
      check('floated label on the page', getComputedStyle(floating).color, pageBackground);
      check('hint', getComputedStyle(element.querySelector('ck-hint')!).color, pageBackground);
      const placeholderField = element.querySelector<HTMLInputElement>('input[placeholder]')!;
      check('placeholder', getComputedStyle(placeholderField, '::placeholder').color, surface);
      const forced = Array.from(element.querySelectorAll('ck-error')).at(-1)!;
      check('error', getComputedStyle(forced).color, pageBackground);
      expect(failures).toEqual([]);
    });

    it('draws the box border at 3:1 against the page and against the field fill', async () => {
      setTestTheme(theme);
      const element = await render();
      const box = getComputedStyle(element.querySelector('.ck-field__box')!);
      const pageBackground = getComputedStyle(element.querySelector('.demo')!).backgroundColor;
      expect(contrastRatio(box.borderTopColor, box.backgroundColor)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(box.borderTopColor, pageBackground)).toBeGreaterThanOrEqual(3);
    });

    it('fills the lower half of the notch with the field colour and leaves the upper half clear', async () => {
      setTestTheme(theme);
      const element = await render();
      const label = element.querySelector<HTMLElement>('ck-field[labelfloat="always"] label')!;
      const box = label.closest('ck-field')!.querySelector('.ck-field__box')!;
      const fill = getComputedStyle(box).backgroundColor;
      const gradient = getComputedStyle(label).backgroundImage;
      expect(gradient).toContain('rgba(0, 0, 0, 0) 50%');
      expect(gradient).toContain(`${fill} 50%`);
      const labelBox = label.getBoundingClientRect();
      const boxRect = box.getBoundingClientRect();
      expect(labelBox.top + labelBox.height / 2).toBeCloseTo(boxRect.top, 0);
    });

    it('lets a tinted field colour reach the notch through the field token', async () => {
      setTestTheme(theme);
      const element = await render();
      const tinted = element.querySelector<HTMLElement>('ck-field.tinted')!;
      const label = tinted.querySelector('label')!;
      await userEvent.click(tinted.querySelector('input')!);
      await settle();
      const fill = getComputedStyle(tinted.querySelector('.ck-field__box')!).backgroundColor;
      expect(fill).not.toBe(
        getComputedStyle(element.querySelector('ck-field:not(.tinted) .ck-field__box')!)
          .backgroundColor,
      );
      expect(getComputedStyle(label).backgroundImage).toContain(`${fill} 50%`);
    });

    it('composites the hover overlay of a suffix button above 4.5:1', async () => {
      setTestTheme(theme);
      const element = await render();
      const toggle = element.querySelector<HTMLElement>('.ck-field__suffix > button')!;
      const field = getComputedStyle(toggle.closest('.ck-field__box')!).backgroundColor;
      const overlay = getComputedStyle(toggle).getPropertyValue('--ck-color-surface-hover').trim();
      const hovered = compositeOver(overlay, field);
      expect(contrastRatio(getComputedStyle(toggle).color, hovered)).toBeGreaterThanOrEqual(4.5);
    });
  });
});
