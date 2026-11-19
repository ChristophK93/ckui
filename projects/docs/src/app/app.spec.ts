import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { page } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../core/testing/axe';
import { App } from './app';
import { routes } from './app.routes';
import { resetTestTheme, setTestTheme, settleAnimations } from './testing/theme-env';

describe('App', () => {
  async function render(url = '/'): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    document.body.appendChild(fixture.nativeElement);
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const currentLinks = (element: HTMLElement): string[] =>
    Array.from(element.querySelectorAll('nav[aria-label="Main"] a[aria-current="page"]'), (link) =>
      link.textContent!.trim(),
    );

  afterEach(() => {
    document.body.replaceChildren();
    resetTestTheme();
  });

  it('renders a skip link that targets the main landmark', async () => {
    const element = await render();
    const skipLink = element.querySelector<HTMLAnchorElement>('.skip-link');
    expect(skipLink?.getAttribute('href')).toBe('#main');
    expect(element.querySelector('main#main')).not.toBeNull();
  });

  it('moves focus to main without leaving the route when the skip link is used', async () => {
    const element = await render('/theming');
    const skipLink = element.querySelector<HTMLAnchorElement>('.skip-link')!;
    const location = window.location.href;
    skipLink.click();
    expect(document.activeElement).toBe(element.querySelector('main'));
    expect(window.location.href).toBe(location);
  });

  it('renders the brand header and the home page inside main', async () => {
    const element = await render();
    expect(element.querySelector('header')?.textContent).toContain('ckui');
    expect(element.querySelector('main h1')?.textContent).toBe('ckui');
  });

  it('has a main navigation with Home, Theming, Tokens and a Components group, and the theme switcher', async () => {
    const element = await render();
    const labels = Array.from(element.querySelectorAll('nav[aria-label="Main"] a'), (link) =>
      link.textContent!.trim(),
    );
    expect(labels).toEqual([
      'Home',
      'Theming',
      'Tokens',
      'Badge',
      'Button',
      'Chip',
      'Dialog',
      'Drawer',
      'Field',
      'Progress',
      'Segmented',
      'Stepper',
      'Switch',
      'Tabs',
      'Toast',
    ]);
    const group = element.querySelector(
      'nav[aria-label="Main"] ul[aria-labelledby="nav-components"]',
    )!;
    expect(element.querySelector('#nav-components')?.textContent?.trim()).toBe('Components');
    expect(Array.from(group.querySelectorAll('a'), (link) => link.getAttribute('href'))).toEqual([
      '/components/badge',
      '/components/button',
      '/components/chip',
      '/components/dialog',
      '/components/drawer',
      '/components/field',
      '/components/progress',
      '/components/segmented',
      '/components/stepper',
      '/components/switch',
      '/components/tabs',
      '/components/toast',
    ]);
    expect(element.querySelector('header fieldset legend')?.textContent?.trim()).toBe('Theme');
  });

  it.each([
    ['/', 'Home'],
    ['/theming', 'Theming'],
    ['/tokens', 'Tokens'],
    ['/components/button', 'Button'],
    ['/components/field', 'Field'],
    ['/components/segmented', 'Segmented'],
    ['/components/toast', 'Toast'],
    ['/components/dialog', 'Dialog'],
    ['/components/badge', 'Badge'],
    ['/components/progress', 'Progress'],
    ['/components/stepper', 'Stepper'],
    ['/components/switch', 'Switch'],
    ['/components/chip', 'Chip'],
    ['/components/tabs', 'Tabs'],
    ['/components/drawer', 'Drawer'],
  ])('marks only the active link as the current page on %s', async (url, label) => {
    const element = await render(url);
    expect(currentLinks(element)).toEqual([label]);
  });

  it('moves aria-current when the route changes', async () => {
    const element = await render('/theming');
    await TestBed.inject(Router).navigateByUrl('/tokens');
    expect(currentLinks(element)).toEqual(['Tokens']);
    await TestBed.inject(Router).navigateByUrl('/');
    expect(currentLinks(element)).toEqual(['Home']);
  });

  it('sets the page titles', async () => {
    await render('/theming');
    expect(document.title).toBe('Theming · ckui');
    await TestBed.inject(Router).navigateByUrl('/tokens');
    expect(document.title).toBe('Tokens · ckui');
    await TestBed.inject(Router).navigateByUrl('/components/button');
    expect(document.title).toBe('Button · ckui');
    await TestBed.inject(Router).navigateByUrl('/components/field');
    expect(document.title).toBe('Field · ckui');
    for (const name of [
      'Segmented',
      'Toast',
      'Dialog',
      'Badge',
      'Progress',
      'Stepper',
      'Switch',
      'Chip',
      'Tabs',
      'Drawer',
    ]) {
      await TestBed.inject(Router).navigateByUrl(`/components/${name.toLowerCase()}`);
      expect(document.title).toBe(`${name} · ckui`);
    }
  });

  it.each(['Badge', 'Progress', 'Stepper', 'Switch', 'Chip', 'Tabs', 'Drawer'])(
    'shows the %s page',
    async (name) => {
      const element = await render(`/components/${name.toLowerCase()}`);
      expect(element.querySelector('main h1')?.textContent).toBe(name);
    },
  );

  it('shows the Field page', async () => {
    const element = await render('/components/field');
    expect(element.querySelector('main h1')?.textContent).toBe('Field');
    expect(element.querySelectorAll('main h2')).toHaveLength(5);
  });

  it('keeps every nav target at least the minimum size and does not overflow at 390px', async () => {
    const original = { width: window.innerWidth, height: window.innerHeight };
    try {
      await page.viewport(390, 800);
      const element = await render('/components/button');
      for (const link of Array.from(element.querySelectorAll('nav a'))) {
        expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
      }
      expect(window.innerWidth).toBe(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      expect(element.querySelector('header')!.getBoundingClientRect().right).toBeLessThanOrEqual(
        390,
      );
    } finally {
      await page.viewport(original.width, original.height);
    }
  });

  it.each([
    ['/', 'light'],
    ['/', 'dark'],
    ['/theming', 'light'],
    ['/theming', 'dark'],
    ['/tokens', 'light'],
    ['/tokens', 'dark'],
    ['/components/button', 'light'],
    ['/components/button', 'dark'],
    ['/components/field', 'light'],
    ['/components/field', 'dark'],
    ['/components/segmented', 'light'],
    ['/components/segmented', 'dark'],
    ['/components/toast', 'light'],
    ['/components/toast', 'dark'],
    ['/components/dialog', 'light'],
    ['/components/dialog', 'dark'],
  ] as const)('has no axe violations on %s in the %s theme', async (url, theme) => {
    setTestTheme(theme);
    const element = await render(url);
    await settleAnimations();
    await expectNoAxeViolations(element);
  });
});
