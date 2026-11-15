import { TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../../core/testing/axe';
import { breakStorage, resetTestTheme, setTestTheme } from '../testing/theme-env';
import { THEME_ATTRIBUTE, THEME_STORAGE_KEY } from './theme';
import { ThemeSwitcher } from './theme-switcher';

describe('ThemeSwitcher', () => {
  const root = document.documentElement;

  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({ imports: [ThemeSwitcher] }).compileComponents();
    const fixture = TestBed.createComponent(ThemeSwitcher);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  function radio(element: HTMLElement, label: string): HTMLInputElement {
    const match = Array.from(element.querySelectorAll('label')).find(
      (candidate) => candidate.textContent?.trim() === label,
    );
    return match!.querySelector('input')!;
  }

  function checkedLabels(element: HTMLElement): string[] {
    return Array.from(element.querySelectorAll<HTMLInputElement>('input:checked'), (input) =>
      input.closest('label')!.textContent!.trim(),
    );
  }

  afterEach(() => {
    document.body.replaceChildren();
    resetTestTheme();
  });

  it('is a fieldset with a Theme legend and three native radios in one group', async () => {
    const element = await render();
    expect(element.querySelector('fieldset > legend')?.textContent?.trim()).toBe('Theme');
    const radios = Array.from(element.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
    expect(radios).toHaveLength(3);
    expect(new Set(radios.map((input) => input.name)).size).toBe(1);
    expect(radios.map((input) => input.closest('label')!.textContent!.trim())).toEqual([
      'System',
      'Light',
      'Dark',
    ]);
  });

  it('checks System when the root has no theme attribute', async () => {
    expect(checkedLabels(await render())).toEqual(['System']);
  });

  it.each([
    ['light', 'Light'],
    ['dark', 'Dark'],
  ] as const)('checks %s when the attribute is already set', async (theme, label) => {
    setTestTheme(theme);
    expect(checkedLabels(await render())).toEqual([label]);
  });

  it('sets the attribute and the key for Dark and Light', async () => {
    const element = await render();
    radio(element, 'Dark').click();
    expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    radio(element, 'Light').click();
    expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('removes the attribute and the key for System', async () => {
    const element = await render();
    radio(element, 'Dark').click();
    radio(element, 'System').click();
    expect(root.hasAttribute(THEME_ATTRIBUTE)).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('keeps exactly one radio checked through rapid switching', async () => {
    const element = await render();
    for (const label of ['Dark', 'System', 'Light', 'Dark', 'Light', 'System', 'Dark']) {
      radio(element, label).click();
    }
    expect(checkedLabels(element)).toEqual(['Dark']);
    expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('dark');
  });

  it('works when localStorage throws', async () => {
    breakStorage();
    const element = await render();
    radio(element, 'Dark').click();
    expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('dark');
    expect(checkedLabels(element)).toEqual(['Dark']);
    radio(element, 'System').click();
    expect(root.hasAttribute(THEME_ATTRIBUTE)).toBe(false);
  });

  it.each([null, 'light', 'dark'] as const)('has no axe violations (theme %s)', async (theme) => {
    setTestTheme(theme);
    await expectNoAxeViolations(await render());
  });
});
