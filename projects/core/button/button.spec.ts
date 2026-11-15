import { ApplicationRef, Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, RouterLink } from '@angular/router';
import { CK_SIZES, CkSize, provideCkui } from '@ckui/core';
import { CkAnnouncer, CkIcon } from '@ckui/core/internal';
import { page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import { CkButton, CkButtonVariant } from './button';

const VARIANTS: CkButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];
const SIZES: readonly CkSize[] = CK_SIZES;

@Component({
  imports: [CkButton],
  template: `
    <button
      ckButton
      [variant]="variant()"
      [size]="size()"
      [iconOnly]="iconOnly()"
      [loading]="loading()"
      [disabled]="disabled()"
      (click)="clicks.update((count) => count + 1)"
    >
      {{ label() }}
    </button>
  `,
})
class ButtonHost {
  readonly variant = signal<CkButtonVariant>('secondary');
  readonly size = signal<CkSize | undefined>(undefined);
  readonly iconOnly = signal(false);
  readonly loading = signal(false);
  readonly disabled = signal(false);
  readonly label = signal('Save');
  readonly clicks = signal(0);
}

@Component({
  imports: [CkButton, RouterLink],
  template: `
    <a
      ckButton
      routerLink="/target"
      [loading]="loading()"
      [disabled]="disabled()"
      (click)="clicks.update((count) => count + 1)"
      >Open</a
    >
  `,
})
class LinkHost {
  readonly loading = signal(false);
  readonly disabled = signal(false);
  readonly clicks = signal(0);
}

@Component({
  imports: [CkButton],
  template: `
    <form (submit)="$event.preventDefault(); submits.update((count) => count + 1)">
      <input id="field" aria-label="Name" />
      <button
        ckButton
        id="dynamic-type"
        [type]="submitType() ? 'submit' : 'button'"
        [loading]="loading()"
      >
        Go
      </button>
      <button
        ckButton
        id="static-tab"
        tabindex="-1"
        aria-disabled="false"
        [disabled]="disabled()"
        [loading]="loading()"
      >
        Static
      </button>
      <button
        ckButton
        id="dynamic-tab"
        [tabindex]="tab()"
        [disabled]="disabled()"
        [loading]="loading()"
      >
        Dynamic
      </button>
      <button ckButton id="attr-disabled" [attr.disabled]="''" [loading]="loading()">Native</button>
      <button ckButton id="bare" [disabled]="disabled()" [loading]="loading()">Bare</button>
      <a ckButton id="link-static" href="#x" tabindex="3" [disabled]="disabled()">Link</a>
      <a ckButton id="link-dynamic" href="#y" [tabindex]="tab()" [disabled]="disabled()">Link</a>
    </form>
  `,
})
class AttributeHost {
  readonly submitType = signal(true);
  readonly tab = signal(5);
  readonly disabled = signal(false);
  readonly loading = signal(false);
  readonly submits = signal(0);
}

@Component({ template: 'target' })
class TargetPage {}

@Component({
  imports: [CkButton],
  template: `
    <form (submit)="$event.preventDefault(); submits.update((count) => count + 1)">
      <button ckButton type="submit" [loading]="loading()">Send</button>
      <button ckButton id="plain">Plain</button>
      <a ckButton id="anchor" href="#top">Anchor</a>
    </form>
  `,
})
class TypeHost {
  readonly loading = signal(false);
  readonly submits = signal(0);
}

@Component({
  imports: [CkButton, CkIcon],
  template: `
    <div
      style="--ck-control-height-md: 40px; --ck-control-height-sm: 32px; --ck-control-height-xl: 60px"
    >
      <button ckButton iconOnly [attr.aria-label]="name()">
        <ck-icon name="close" />
      </button>
    </div>
  `,
})
class IconOnlyHost {
  readonly name = signal<string | null>('Close');
}

@Component({
  imports: [CkButton],
  template: `
    <div style="inline-size: 120px">
      <button ckButton>{{ label }}</button>
    </div>
  `,
})
class LongLabelHost {
  readonly label = 'A label with many ordinary words that has to wrap onto several lines. '.repeat(
    3,
  );
}

@Component({
  imports: [CkButton, CkIcon],
  template: `
    <button ckButton [loading]="true"><ck-icon name="check" />Done</button>
    <button ckButton variant="primary"><ck-icon name="check" /><span id="text">Done</span></button>
  `,
})
class ContentHost {}

@Component({
  imports: [CkButton, CkIcon],
  template: '<button ckButton>Default</button><ck-icon name="check" />',
})
class TemplateHost {}

describe('CkButton', () => {
  function renderTemplate(template: string): HTMLElement {
    TestBed.overrideComponent(TemplateHost, { set: { template } });
    const fixture = create(TemplateHost);
    return fixture.nativeElement as HTMLElement;
  }

  function mount<T>(component: new () => T): {
    fixture: ReturnType<typeof create<T>>;
    root: HTMLElement;
  } {
    const fixture = create(component);
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  function create<T>(component: new () => T) {
    const fixture = TestBed.createComponent(component);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    return fixture;
  }

  function renderButton() {
    const { fixture, root } = mount(ButtonHost);
    return { fixture, host: fixture.componentInstance, button: root.querySelector('button')! };
  }

  function renderLink() {
    const { fixture, root } = mount(LinkHost);
    return { fixture, host: fixture.componentInstance, link: root.querySelector('a')! };
  }

  afterEach(() => {
    document.body.dir = '';
    document.body.replaceChildren();
    TestBed.inject(CkAnnouncer).clear();
    TestBed.resetTestingModule();
  });

  describe('looks', () => {
    const combinations = VARIANTS.flatMap((variant) =>
      SIZES.map((size) => [variant, size] as const),
    );

    it.each(combinations)(
      'renders variant %s at size %s with matching classes',
      (variant, size) => {
        const { fixture, host, button } = renderButton();
        host.variant.set(variant);
        host.size.set(size);
        fixture.detectChanges();
        expect(button.classList.contains('ck-button')).toBe(true);
        expect(button.classList.contains(`ck-button--${variant}`)).toBe(true);
        expect(button.classList.contains(`ck-button--${size}`)).toBe(true);
        expect(
          VARIANTS.filter((other) => button.classList.contains(`ck-button--${other}`)),
        ).toEqual([variant]);
        expect(SIZES.filter((other) => button.classList.contains(`ck-button--${other}`))).toEqual([
          size,
        ]);
      },
    );

    it('defaults to the secondary variant and the configured size', () => {
      const { button } = renderButton();
      expect(button.classList.contains('ck-button--secondary')).toBe(true);
      expect(button.classList.contains('ck-button--md')).toBe(true);
    });

    it('takes its default size from provideCkui and lets the size input override it', () => {
      TestBed.configureTestingModule({ providers: [provideCkui({ size: 'lg' })] });
      const { fixture, host, button } = renderButton();
      expect(button.classList.contains('ck-button--lg')).toBe(true);
      host.size.set('sm');
      fixture.detectChanges();
      expect(button.classList.contains('ck-button--sm')).toBe(true);
      expect(button.classList.contains('ck-button--lg')).toBe(false);
      host.size.set(undefined);
      fixture.detectChanges();
      expect(button.classList.contains('ck-button--lg')).toBe(true);
    });

    it('keeps classes the consumer put on the element', () => {
      const root = renderTemplate('<button ckButton class="mine" [class.extra]="true">x</button>');
      const button = root.querySelector('button')!;
      expect(button.classList.contains('mine')).toBe(true);
      expect(button.classList.contains('extra')).toBe(true);
      expect(button.classList.contains('ck-button--secondary')).toBe(true);
    });

    it('exposes the radius component token with a fallback and never declares it', () => {
      const { button } = renderButton();
      button.style.setProperty('--ck-control-radius', '3px');
      expect(getComputedStyle(button).borderTopLeftRadius).toBe('3px');
      button.style.setProperty('--ck-button-radius', '9px');
      expect(getComputedStyle(button).borderTopLeftRadius).toBe('9px');
    });

    it('has a transparent border on the primary variant', () => {
      const { fixture, host, button } = renderButton();
      host.variant.set('primary');
      fixture.detectChanges();
      expect(getComputedStyle(button).borderTopWidth).toBe('1px');
      expect(getComputedStyle(button).borderTopColor).toBe('rgba(0, 0, 0, 0)');
    });
  });

  describe('type', () => {
    it('defaults a button to type="button"', () => {
      const { root } = mount(TypeHost);
      expect(root.querySelector('#plain')!.getAttribute('type')).toBe('button');
    });

    it('keeps a static type="submit" and does submit the form', () => {
      const { fixture, root } = mount(TypeHost);
      const submitButton = root.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      expect(submitButton.getAttribute('type')).toBe('submit');
      submitButton.click();
      expect(fixture.componentInstance.submits()).toBe(1);
    });

    it('does not submit a form from the default-type button', () => {
      const { fixture, root } = mount(TypeHost);
      root.querySelector<HTMLButtonElement>('#plain')!.click();
      expect(fixture.componentInstance.submits()).toBe(0);
    });

    it('gives anchors no type', () => {
      const { root } = mount(TypeHost);
      expect(root.querySelector('#anchor')!.hasAttribute('type')).toBe(false);
    });

    it('does not submit the form while a submit button is loading', () => {
      const { fixture, root } = mount(TypeHost);
      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();
      root.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
      expect(fixture.componentInstance.submits()).toBe(0);
      fixture.componentInstance.loading.set(false);
      fixture.detectChanges();
      root.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
      expect(fixture.componentInstance.submits()).toBe(1);
    });
  });

  describe('keyboard and click', () => {
    it('activates on click, Enter and Space', async () => {
      const { host, button } = renderButton();
      button.focus();
      await userEvent.keyboard('{Enter}');
      expect(host.clicks()).toBe(1);
      await userEvent.keyboard(' ');
      expect(host.clicks()).toBe(2);
      button.click();
      expect(host.clicks()).toBe(3);
    });

    it('activates a link button with Enter only', async () => {
      TestBed.configureTestingModule({
        providers: [provideRouter([{ path: 'target', component: TargetPage }])],
      });
      const { fixture, host, link } = renderLink();
      link.focus();
      await userEvent.keyboard(' ');
      expect(host.clicks()).toBe(0);
      await userEvent.keyboard('{Enter}');
      await fixture.whenStable();
      expect(host.clicks()).toBe(1);
      expect(TestBed.inject(Router).url).toBe('/target');
    });

    describe('disabled button', () => {
      it('sets the native disabled attribute and is skipped by Tab', async () => {
        const { fixture, host, button } = renderButton();
        host.disabled.set(true);
        fixture.detectChanges();
        expect(button.disabled).toBe(true);
        expect(button.classList.contains('ck-button--disabled')).toBe(true);
        await userEvent.tab();
        expect(document.activeElement).not.toBe(button);
      });

      it('does not activate on click or keys, and activates again once enabled', async () => {
        const { fixture, host, button } = renderButton();
        host.disabled.set(true);
        fixture.detectChanges();
        button.focus();
        button.click();
        await userEvent.keyboard('{Enter}');
        await userEvent.keyboard(' ');
        expect(host.clicks()).toBe(0);
        host.disabled.set(false);
        fixture.detectChanges();
        expect(button.hasAttribute('disabled')).toBe(false);
        button.click();
        expect(host.clicks()).toBe(1);
      });

      it('blocks a click dispatched on a child element', () => {
        const { fixture, host, button } = renderButton();
        host.disabled.set(true);
        fixture.detectChanges();
        button
          .querySelector('.ck-button__content')!
          .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        expect(host.clicks()).toBe(0);
      });
    });

    describe('disabled link', () => {
      beforeEach(() => {
        TestBed.configureTestingModule({
          providers: [provideRouter([{ path: 'target', component: TargetPage }])],
        });
      });

      it('gets aria-disabled and tabindex -1, drops out of Tab and blocks click and Enter', async () => {
        const { fixture, host, link } = renderLink();
        host.disabled.set(true);
        fixture.detectChanges();
        expect(link.getAttribute('aria-disabled')).toBe('true');
        expect(link.getAttribute('tabindex')).toBe('-1');
        expect(link.hasAttribute('disabled')).toBe(false);
        await userEvent.tab();
        expect(document.activeElement).not.toBe(link);
        link.focus();
        link.click();
        await userEvent.keyboard('{Enter}');
        await fixture.whenStable();
        expect(host.clicks()).toBe(0);
        expect(TestBed.inject(Router).url).toBe('/');
      });

      it('restores navigation and removes the attributes once enabled', async () => {
        const { fixture, host, link } = renderLink();
        host.disabled.set(true);
        fixture.detectChanges();
        host.disabled.set(false);
        fixture.detectChanges();
        expect(link.hasAttribute('aria-disabled')).toBe(false);
        expect(link.hasAttribute('tabindex')).toBe(false);
        link.click();
        await fixture.whenStable();
        expect(TestBed.inject(Router).url).toBe('/target');
      });
    });
  });

  describe('loading', () => {
    it('keeps the button focusable, sets aria-disabled and blocks clicks and keys', async () => {
      const { fixture, host, button } = renderButton();
      button.focus();
      host.loading.set(true);
      fixture.detectChanges();
      expect(document.activeElement).toBe(button);
      expect(button.disabled).toBe(false);
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.classList.contains('ck-button--loading')).toBe(true);
      button.click();
      await userEvent.keyboard('{Enter}');
      await userEvent.keyboard(' ');
      expect(host.clicks()).toBe(0);
      host.loading.set(false);
      fixture.detectChanges();
      expect(button.hasAttribute('aria-disabled')).toBe(false);
      expect(document.activeElement).toBe(button);
      button.click();
      expect(host.clicks()).toBe(1);
    });

    it('is reachable with Tab while loading', async () => {
      const { fixture, host, button } = renderButton();
      host.loading.set(true);
      fixture.detectChanges();
      await userEvent.tab();
      expect(document.activeElement).toBe(button);
    });

    it('never fires routerLink or a consumer click on a link while loading', async () => {
      TestBed.configureTestingModule({
        providers: [provideRouter([{ path: 'target', component: TargetPage }])],
      });
      const { fixture, host, link } = renderLink();
      host.loading.set(true);
      fixture.detectChanges();
      expect(link.getAttribute('aria-disabled')).toBe('true');
      link.click();
      link.focus();
      await userEvent.keyboard('{Enter}');
      await fixture.whenStable();
      expect(host.clicks()).toBe(0);
      expect(TestBed.inject(Router).url).toBe('/');
      host.loading.set(false);
      fixture.detectChanges();
      link.click();
      await fixture.whenStable();
      expect(host.clicks()).toBe(1);
      expect(TestBed.inject(Router).url).toBe('/target');
    });

    it('hides the content with opacity but keeps the accessible name', () => {
      const { fixture, host, button } = renderButton();
      host.loading.set(true);
      fixture.detectChanges();
      const content = button.querySelector<HTMLElement>('.ck-button__content')!;
      expect(getComputedStyle(content).opacity).toBe('0');
      expect(getComputedStyle(content).visibility).toBe('visible');
      expect(page.getByRole('button', { name: 'Save' }).element()).toBe(button);
    });

    it('shows a decorative spinner only while loading', () => {
      const { fixture, host, button } = renderButton();
      const spinner = button.querySelector<HTMLElement>('.ck-button__spinner')!;
      expect(spinner.getAttribute('aria-hidden')).toBe('true');
      expect(getComputedStyle(spinner).display).toBe('none');
      host.loading.set(true);
      fixture.detectChanges();
      expect(getComputedStyle(spinner).display).toBe('block');
    });

    it('keeps its width while loading', () => {
      const { fixture, host, button } = renderButton();
      const before = button.getBoundingClientRect().width;
      host.loading.set(true);
      fixture.detectChanges();
      expect(button.getBoundingClientRect().width).toBe(before);
    });

    it('centres the spinner in LTR and RTL', () => {
      const { fixture, root } = mount(ContentHost);
      void fixture;
      const button = root.querySelector('button')!;
      for (const direction of ['ltr', 'rtl']) {
        document.body.dir = direction;
        const box = button.getBoundingClientRect();
        const spinner = button.querySelector('.ck-button__spinner')!.getBoundingClientRect();
        expect(
          Math.abs(spinner.left + spinner.width / 2 - (box.left + box.width / 2)),
        ).toBeLessThan(1);
      }
    });

    describe('announcement', () => {
      function spyOnAnnounce() {
        return vi.spyOn(TestBed.inject(CkAnnouncer), 'announce').mockResolvedValue();
      }

      it('announces the loading label once when loading starts, and nothing when it stops', () => {
        const announce = spyOnAnnounce();
        const { fixture, host } = renderButton();
        expect(announce).not.toHaveBeenCalled();
        host.loading.set(true);
        fixture.detectChanges();
        expect(announce).toHaveBeenCalledTimes(1);
        expect(announce).toHaveBeenCalledWith('Loading');
        fixture.detectChanges();
        expect(announce).toHaveBeenCalledTimes(1);
        host.loading.set(false);
        fixture.detectChanges();
        expect(announce).toHaveBeenCalledTimes(1);
      });

      it('does not announce when the button first renders already loading', () => {
        const announce = spyOnAnnounce();
        const fixture = TestBed.createComponent(ButtonHost);
        document.body.appendChild(fixture.nativeElement);
        fixture.componentInstance.loading.set(true);
        fixture.detectChanges();
        expect(announce).not.toHaveBeenCalled();
        fixture.componentInstance.loading.set(false);
        fixture.detectChanges();
        fixture.componentInstance.loading.set(true);
        fixture.detectChanges();
        expect(announce).toHaveBeenCalledTimes(1);
      });

      it('does not announce on the server', () => {
        TestBed.configureTestingModule({
          providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
        });
        const announce = spyOnAnnounce();
        const { fixture, host } = renderButton();
        host.loading.set(true);
        fixture.detectChanges();
        expect(announce).not.toHaveBeenCalled();
      });

      it('announces once per start across rapid toggles', () => {
        const announce = spyOnAnnounce();
        const { fixture, host } = renderButton();
        for (let round = 0; round < 3; round += 1) {
          host.loading.set(true);
          fixture.detectChanges();
          host.loading.set(false);
          fixture.detectChanges();
        }
        expect(announce).toHaveBeenCalledTimes(3);
      });

      it('announces nothing for a start and stop inside one change detection pass', () => {
        const announce = spyOnAnnounce();
        const { fixture, host } = renderButton();
        host.loading.set(true);
        host.loading.set(false);
        fixture.detectChanges();
        expect(announce).not.toHaveBeenCalled();
      });

      it('is not announced when the button is disabled and never loaded', () => {
        const announce = spyOnAnnounce();
        const { fixture, host } = renderButton();
        host.disabled.set(true);
        fixture.detectChanges();
        expect(announce).not.toHaveBeenCalled();
      });

      it('writes the message into the polite live region', async () => {
        const { fixture, host } = renderButton();
        host.loading.set(true);
        fixture.detectChanges();
        await fixture.whenStable();
        await vi.waitFor(() => {
          const region = document.body.querySelector('.cdk-live-announcer-element');
          expect(region?.textContent).toBe('Loading');
          expect(region?.getAttribute('aria-live')).toBe('polite');
        });
      });
    });
  });

  describe('icon-only', () => {
    function warnings() {
      return vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    }

    it('is a square at the control height for each size', () => {
      const { fixture, root } = mount(IconOnlyHost);
      void fixture;
      const button = root.querySelector('button')!;
      expect(button.classList.contains('ck-button--icon-only')).toBe(true);
      let box = button.getBoundingClientRect();
      expect([box.width, box.height]).toEqual([40, 40]);
      button.classList.replace('ck-button--md', 'ck-button--sm');
      box = button.getBoundingClientRect();
      expect([box.width, box.height]).toEqual([32, 32]);
      button.classList.replace('ck-button--sm', 'ck-button--xl');
      box = button.getBoundingClientRect();
      expect([box.width, box.height]).toEqual([60, 60]);
    });

    it('does not warn when it has an aria-label', async () => {
      const warn = warnings();
      const { fixture } = mount(IconOnlyHost);
      await fixture.whenStable();
      expect(warn).not.toHaveBeenCalled();
    });

    it.each([
      ['title', '<button ckButton iconOnly title="Close"><ck-icon name="close" /></button>'],
      [
        'aria-labelledby',
        '<span id="label-source">Close</span><button ckButton iconOnly aria-labelledby="label-source"><ck-icon name="close" /></button>',
      ],
      ['text', '<button ckButton iconOnly><ck-icon name="close" />Close</button>'],
    ])('does not warn when named through %s', async (_name, template) => {
      const warn = warnings();
      renderTemplate(template);
      await TestBed.inject(ApplicationRef).whenStable();
      expect(warn).not.toHaveBeenCalled();
    });

    it.each([
      ['no attributes', '<button ckButton iconOnly><ck-icon name="close" /></button>'],
      [
        'an empty aria-label',
        '<button ckButton iconOnly aria-label=" "><ck-icon name="close" /></button>',
      ],
      ['an anchor', '<a ckButton iconOnly href="#x"><ck-icon name="close" /></a>'],
      [
        'aria-hidden text only',
        '<button ckButton iconOnly><span aria-hidden="true">x</span></button>',
      ],
      ['hidden text only', '<button ckButton iconOnly><span hidden>close</span></button>'],
      [
        'an aria-labelledby id that does not exist',
        '<button ckButton iconOnly aria-labelledby="nope"></button>',
      ],
      [
        'an aria-labelledby id pointing at an empty element',
        '<span id="empty-label"></span><button ckButton iconOnly aria-labelledby="empty-label"></button>',
      ],
    ])('warns once and names the element for %s', async (_name, template) => {
      const warn = warnings();
      renderTemplate(template);
      await TestBed.inject(ApplicationRef).whenStable();
      TestBed.inject(ApplicationRef).tick();
      expect(warn).toHaveBeenCalledTimes(1);
      const [message, element] = warn.mock.calls[0];
      expect(message).toContain('ckButton');
      expect(element).toBeInstanceOf(HTMLElement);
      expect((element as HTMLElement).classList.contains('ck-button--icon-only')).toBe(true);
    });

    it('does not warn for a button that is not icon-only and has no text', async () => {
      const warn = warnings();
      const { fixture, host } = renderButton();
      host.label.set('');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(warn).not.toHaveBeenCalled();
    });

    it('does not warn when destroyed before the first render finishes', async () => {
      const warn = warnings();
      TestBed.overrideComponent(TemplateHost, {
        set: { template: '<button ckButton iconOnly></button>' },
      });
      const fixture = TestBed.createComponent(TemplateHost);
      fixture.destroy();
      TestBed.inject(ApplicationRef).tick();
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('consumer attributes', () => {
    function attributes() {
      const { fixture, root } = mount(AttributeHost);
      const byId = (id: string) => root.querySelector<HTMLElement>(`#${id}`)!;
      return { fixture, host: fixture.componentInstance, byId };
    }

    it('keeps static, dynamic and native attributes on first render', () => {
      const { byId } = attributes();
      expect(byId('static-tab').getAttribute('tabindex')).toBe('-1');
      expect(byId('static-tab').getAttribute('aria-disabled')).toBe('false');
      expect(byId('dynamic-tab').getAttribute('tabindex')).toBe('5');
      expect(byId('attr-disabled').hasAttribute('disabled')).toBe(true);
      expect(byId('dynamic-type').getAttribute('type')).toBe('submit');
      expect(byId('link-static').getAttribute('tabindex')).toBe('3');
      expect(byId('link-dynamic').getAttribute('tabindex')).toBe('5');
      expect(byId('bare').getAttribute('type')).toBe('button');
      expect(byId('bare').hasAttribute('tabindex')).toBe(false);
      expect(byId('bare').hasAttribute('aria-disabled')).toBe(false);
    });

    it('lets a dynamic [type] switch between submit and button', () => {
      const { fixture, host, byId } = attributes();
      host.submitType.set(false);
      fixture.detectChanges();
      expect(byId('dynamic-type').getAttribute('type')).toBe('button');
      host.submitType.set(true);
      fixture.detectChanges();
      expect(byId('dynamic-type').getAttribute('type')).toBe('submit');
    });

    it('submits the form from a button whose type is bound to submit', () => {
      const { host, byId } = attributes();
      byId('dynamic-type').click();
      expect(host.submits()).toBe(1);
    });

    it.each(['disabled', 'loading'] as const)(
      'gives every consumer attribute back after a %s round trip',
      (state) => {
        const { fixture, host, byId } = attributes();
        host[state].set(true);
        fixture.detectChanges();
        host[state].set(false);
        fixture.detectChanges();
        expect(byId('static-tab').getAttribute('tabindex')).toBe('-1');
        expect(byId('static-tab').getAttribute('aria-disabled')).toBe('false');
        expect(byId('dynamic-tab').getAttribute('tabindex')).toBe('5');
        expect(byId('attr-disabled').hasAttribute('disabled')).toBe(true);
        expect(byId('link-static').getAttribute('tabindex')).toBe('3');
        expect(byId('link-dynamic').getAttribute('tabindex')).toBe('5');
        expect(byId('bare').hasAttribute('aria-disabled')).toBe(false);
        expect(byId('bare').hasAttribute('disabled')).toBe(false);
        expect(byId('link-static').hasAttribute('aria-disabled')).toBe(false);
      },
    );

    it('overrides them only while the state applies', () => {
      const { fixture, host, byId } = attributes();
      host.disabled.set(true);
      host.loading.set(true);
      fixture.detectChanges();
      expect(byId('link-static').getAttribute('tabindex')).toBe('-1');
      expect(byId('link-dynamic').getAttribute('aria-disabled')).toBe('true');
      expect(byId('static-tab').getAttribute('aria-disabled')).toBe('true');
      expect(byId('bare').hasAttribute('disabled')).toBe(true);
      expect(byId('bare').getAttribute('aria-disabled')).toBe('true');
    });

    it('does not submit through implicit submission while the submit button is loading', async () => {
      const { fixture, host, byId } = attributes();
      host.loading.set(true);
      fixture.detectChanges();
      byId('field').focus();
      await userEvent.keyboard('{Enter}');
      expect(host.submits()).toBe(0);
      host.loading.set(false);
      fixture.detectChanges();
      await userEvent.keyboard('{Enter}');
      expect(host.submits()).toBe(1);
    });
  });

  describe('disabled and loading together', () => {
    it('stays disabled and blocked, and stays disabled when loading ends', () => {
      const { fixture, host, button } = renderButton();
      host.disabled.set(true);
      host.loading.set(true);
      fixture.detectChanges();
      expect(button.disabled).toBe(true);
      expect(button.getAttribute('aria-disabled')).toBe('true');
      button.click();
      expect(host.clicks()).toBe(0);
      host.loading.set(false);
      fixture.detectChanges();
      expect(button.disabled).toBe(true);
      expect(button.hasAttribute('aria-disabled')).toBe(false);
      host.disabled.set(false);
      fixture.detectChanges();
      expect(button.disabled).toBe(false);
      button.click();
      expect(host.clicks()).toBe(1);
    });
  });

  describe('middle click', () => {
    it.each(['disabled', 'loading'] as const)(
      'is blocked while %s and passes otherwise',
      (state) => {
        const { fixture, host, button } = renderButton();
        const listener = vi.fn();
        button.addEventListener('auxclick', listener);
        const middleClick = () => {
          const event = new MouseEvent('auxclick', { button: 1, bubbles: true, cancelable: true });
          button.dispatchEvent(event);
          return event.defaultPrevented;
        };
        expect(middleClick()).toBe(false);
        expect(listener).toHaveBeenCalledTimes(1);
        host[state].set(true);
        fixture.detectChanges();
        expect(middleClick()).toBe(true);
        expect(listener).toHaveBeenCalledTimes(1);
      },
    );
  });

  describe('inside a disabled fieldset', () => {
    it('looks disabled like the disabled input does', () => {
      const root = renderTemplate(
        '<fieldset disabled><button ckButton id="inside">Inside</button></fieldset><button ckButton id="outside">Outside</button>',
      );
      expect(getComputedStyle(root.querySelector('#inside')!).cursor).toBe('not-allowed');
      expect(getComputedStyle(root.querySelector('#outside')!).cursor).toBe('pointer');
    });
  });

  describe('large icon-only', () => {
    it('is a square at the large control height', () => {
      const root = renderTemplate(
        '<div style="--ck-control-height-lg: 48px"><button ckButton iconOnly size="lg" aria-label="Close"><ck-icon name="close" /></button></div>',
      );
      const box = root.querySelector('button')!.getBoundingClientRect();
      expect([box.width, box.height]).toEqual([48, 48]);
    });
  });

  describe('content', () => {
    it('keeps a projected icon at 1em and separates it from the text by the space-2 gap', () => {
      const { root } = mount(ContentHost);
      const button = root.querySelectorAll('button')[1]!;
      button.style.fontSize = '20px';
      button.style.setProperty('--ck-space-2', '6px');
      const icon = button.querySelector<HTMLElement>('.ck-icon')!;
      expect(getComputedStyle(icon).inlineSize).toBe('20px');
      expect(getComputedStyle(button.querySelector('.ck-button__content')!).columnGap).toBe('6px');
    });

    it('wraps a very long label inside its container instead of overflowing', () => {
      const { root } = mount(LongLabelHost);
      const button = root.querySelector('button')!;
      expect(button.getBoundingClientRect().width).toBeLessThanOrEqual(120);
      expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth);
      expect(button.getBoundingClientRect().height).toBeGreaterThan(30);
    });

    it('survives an empty label', () => {
      const { fixture, host, button } = renderButton();
      host.label.set('');
      fixture.detectChanges();
      expect(button.querySelector('.ck-button__content')).not.toBeNull();
    });
  });

  describe('RTL', () => {
    it('puts a leading icon on the right of the text and keeps the label readable', () => {
      const { root } = mount(ContentHost);
      const button = root.querySelectorAll('button')[1]!;
      const icon = button.querySelector('.ck-icon')!;
      const text = button.querySelector('#text')!;
      expect(icon.getBoundingClientRect().left).toBeLessThan(text.getBoundingClientRect().left);
      document.body.dir = 'rtl';
      expect(icon.getBoundingClientRect().left).toBeGreaterThan(text.getBoundingClientRect().left);
    });
  });

  describe('accessibility', () => {
    it.each(VARIANTS)('has no axe violations for %s in every state', async (variant) => {
      const { fixture, host } = renderButton();
      host.variant.set(variant);
      for (const state of ['idle', 'disabled', 'loading', 'iconOnly'] as const) {
        host.disabled.set(state === 'disabled');
        host.loading.set(state === 'loading');
        host.iconOnly.set(state === 'iconOnly');
        fixture.detectChanges();
        await expectNoAxeViolations(fixture.nativeElement);
      }
    });

    it('has no axe violations for a link button in every state', async () => {
      TestBed.configureTestingModule({ providers: [provideRouter([])] });
      const { fixture, host } = renderLink();
      for (const state of ['idle', 'disabled', 'loading'] as const) {
        host.disabled.set(state === 'disabled');
        host.loading.set(state === 'loading');
        fixture.detectChanges();
        await expectNoAxeViolations(fixture.nativeElement);
      }
    });
  });
});
