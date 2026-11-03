import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { expectNoAxeViolations } from '../../../core/testing/axe';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    document.body.appendChild(fixture.nativeElement);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => document.body.replaceChildren());

  it('renders a skip link that targets the main landmark', async () => {
    const element = await render();
    const skipLink = element.querySelector<HTMLAnchorElement>('.skip-link');
    expect(skipLink?.getAttribute('href')).toBe('#main');
    expect(element.querySelector('main#main')).not.toBeNull();
  });

  it('renders the brand header and the home page inside main', async () => {
    const element = await render();
    expect(element.querySelector('header')?.textContent).toContain('ckui');
    expect(element.querySelector('main h1')?.textContent).toBe('ckui');
  });

  it('has no axe violations on the rendered home page', async () => {
    await expectNoAxeViolations(await render());
  });
});
