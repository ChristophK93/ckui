import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CK_SIZES } from '@ckui/core';
import { expectNoAxeViolations } from '../../../../../core/testing/axe';
import { resetTestTheme, setTestTheme } from '../../testing/theme-env';
import { Home } from './home';

describe('Home', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Home);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    document.body.replaceChildren();
    resetTestTheme();
  });

  it('shows one heading level one and every size from the library', async () => {
    const element = await render();
    expect(element.querySelectorAll('h1')).toHaveLength(1);
    const items = Array.from(element.querySelectorAll('.sizes li'), (item) => item.textContent);
    expect(items).toEqual([...CK_SIZES]);
  });

  it('links to the theming guide and the token reference', async () => {
    const element = await render();
    const hrefs = Array.from(element.querySelectorAll('a'), (link) => link.getAttribute('href'));
    expect(hrefs).toEqual(['/theming', '/tokens']);
  });

  it.each(['light', 'dark'] as const)('has no axe violations in the %s theme', async (theme) => {
    setTestTheme(theme);
    await expectNoAxeViolations(await render());
  });
});
