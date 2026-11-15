import { TestBed } from '@angular/core/testing';
import { breakStorage, resetTestTheme } from '../testing/theme-env';
import { THEME_ATTRIBUTE, THEME_STORAGE_KEY } from './theme';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const root = document.documentElement;

  afterEach(() => resetTestTheme());

  function service(): ThemeService {
    return TestBed.inject(ThemeService);
  }

  it('starts on system when the root has no attribute', () => {
    expect(service().theme()).toBe('system');
  });

  it.each(['light', 'dark'] as const)('starts on %s when the attribute is already set', (theme) => {
    root.setAttribute(THEME_ATTRIBUTE, theme);
    expect(service().theme()).toBe(theme);
  });

  it('treats an unknown attribute value as system', () => {
    root.setAttribute(THEME_ATTRIBUTE, 'sepia');
    expect(service().theme()).toBe('system');
  });

  it('sets the attribute and the stored key for light and dark', () => {
    const theme = service();
    theme.select('dark');
    expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(theme.theme()).toBe('dark');
    theme.select('light');
    expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('removes the attribute and the stored key for system', () => {
    const theme = service();
    theme.select('dark');
    theme.select('system');
    expect(root.hasAttribute(THEME_ATTRIBUTE)).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(theme.theme()).toBe('system');
  });

  it('ends on the last choice after rapid repeated switching', () => {
    const theme = service();
    for (let round = 0; round < 50; round++) {
      theme.select('dark');
      theme.select('system');
      theme.select('light');
    }
    expect(theme.theme()).toBe('light');
    expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('still applies the theme when every storage call throws', () => {
    breakStorage();
    const theme = service();
    expect(() => theme.select('dark')).not.toThrow();
    expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('dark');
    expect(theme.theme()).toBe('dark');
    expect(() => theme.select('system')).not.toThrow();
    expect(root.hasAttribute(THEME_ATTRIBUTE)).toBe(false);
  });
});
