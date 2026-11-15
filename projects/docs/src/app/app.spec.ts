import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { expectNoAxeViolations } from '../../../core/testing/axe';
import { App } from './app';
import { routes } from './app.routes';
import { resetTestTheme, setTestTheme } from './testing/theme-env';

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

  it('has a main navigation with Home, Theming and Tokens and the theme switcher', async () => {
    const element = await render();
    const labels = Array.from(element.querySelectorAll('nav[aria-label="Main"] a'), (link) =>
      link.textContent!.trim(),
    );
    expect(labels).toEqual(['Home', 'Theming', 'Tokens']);
    expect(element.querySelector('header fieldset legend')?.textContent?.trim()).toBe('Theme');
  });

  it.each([
    ['/', 'Home'],
    ['/theming', 'Theming'],
    ['/tokens', 'Tokens'],
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
  });

  it.each([
    ['/', 'light'],
    ['/', 'dark'],
    ['/theming', 'light'],
    ['/theming', 'dark'],
    ['/tokens', 'light'],
    ['/tokens', 'dark'],
  ] as const)('has no axe violations on %s in the %s theme', async (url, theme) => {
    setTestTheme(theme);
    await expectNoAxeViolations(await render(url));
  });
});
