import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { expectNoAxeViolations } from '../../../../../core/testing/axe';
import { resetTestTheme, setTestTheme } from '../../testing/theme-env';
import { ALL_TOKEN_NAMES } from './token-list';
import { Tokens } from './tokens';

describe('Tokens', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [Tokens],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Tokens);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const valueOf = (element: HTMLElement, token: string): string =>
    element.querySelector(`tr[data-token="${token}"] .token-value`)!.textContent!.trim();

  afterEach(() => {
    document.body.replaceChildren();
    resetTestTheme();
  });

  it('shows one heading level one and a row for every token', async () => {
    const element = await render();
    expect(element.querySelectorAll('h1')).toHaveLength(1);
    expect(element.querySelectorAll('tr[data-token]')).toHaveLength(ALL_TOKEN_NAMES.length);
  });

  it('shows the resolved value of each token, never an empty cell', async () => {
    setTestTheme('light');
    const element = await render();
    expect(valueOf(element, '--ck-space-4')).toBe('1rem');
    expect(valueOf(element, '--ck-color-scheme')).toBe('light');
    const empty = Array.from(element.querySelectorAll('.token-value')).filter(
      (cell) => cell.textContent!.trim() === '',
    );
    expect(empty).toHaveLength(0);
  });

  it('updates the values when the theme changes', async () => {
    setTestTheme('light');
    const element = await render();
    const lightBackground = valueOf(element, '--ck-color-bg');
    setTestTheme('dark');
    await vi.waitFor(() => expect(valueOf(element, '--ck-color-scheme')).toBe('dark'));
    expect(valueOf(element, '--ck-color-bg')).not.toBe(lightBackground);
    setTestTheme(null);
    await vi.waitFor(() => expect(valueOf(element, '--ck-color-bg')).toBe(lightBackground));
  });

  it('follows rapid theme switching to the last theme', async () => {
    const element = await render();
    for (let round = 0; round < 20; round++) {
      setTestTheme('dark');
      setTestTheme('light');
    }
    setTestTheme('dark');
    await vi.waitFor(() => expect(valueOf(element, '--ck-color-scheme')).toBe('dark'));
  });

  it('marks colour and shadow swatches as decorative', async () => {
    const element = await render();
    const chips = Array.from(element.querySelectorAll('.chip'));
    expect(chips.length).toBeGreaterThan(50);
    expect(chips.every((chip) => chip.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(chips.every((chip) => chip.textContent === '')).toBe(true);
  });

  it('disconnects the observer and removes the media listeners when destroyed', async () => {
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const removed = vi.spyOn(MediaQueryList.prototype, 'removeEventListener');
    await TestBed.configureTestingModule({
      imports: [Tokens],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Tokens);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    expect(disconnect).not.toHaveBeenCalled();
    fixture.destroy();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(removed.mock.calls.filter(([type]) => type === 'change')).toHaveLength(3);
  });

  it('scrolls to a group on every click of its contents link and focuses the heading', async () => {
    const element = await render();
    const link = element.querySelector<HTMLAnchorElement>('nav a[href="#shadow"]')!;
    const heading = element.querySelector<HTMLElement>('#shadow')!;
    const scrollTo = vi.spyOn(heading, 'scrollIntoView');
    link.click();
    expect(document.activeElement).toBe(heading);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    (document.activeElement as HTMLElement).blur();
    link.click();
    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(document.activeElement).toBe(heading);
  });

  it('names each table, not each section', async () => {
    const element = await render();
    expect(element.querySelectorAll('section[aria-labelledby]')).toHaveLength(0);
    const tables = Array.from(element.querySelectorAll('table'));
    expect(tables.every((table) => table.getAttribute('aria-labelledby'))).toBe(true);
  });

  it.each(['light', 'dark'] as const)('has no axe violations in the %s theme', async (theme) => {
    setTestTheme(theme);
    await expectNoAxeViolations(await render());
  });
});
