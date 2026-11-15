export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

export const THEME_STORAGE_KEY = 'ckui-docs-theme';

export const THEME_ATTRIBUTE = 'data-ck-theme';

export const THEME_LABELS: Readonly<Record<ThemeChoice, string>> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};
