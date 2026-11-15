import { contrastRatio, resolveToken } from '../../core/testing/contrast';

/** Every token the theme blocks must declare in full, so nested themes recompute all of them. */
const THEME_TOKENS = [
  '--ck-color-scheme',
  '--ck-color-bg',
  '--ck-color-surface',
  '--ck-color-surface-raised',
  '--ck-color-fg',
  '--ck-color-fg-muted',
  '--ck-color-fg-disabled',
  '--ck-color-border',
  '--ck-color-border-subtle',
  '--ck-color-primary',
  '--ck-color-primary-hover',
  '--ck-color-primary-active',
  '--ck-color-on-primary',
  '--ck-color-primary-subtle',
  '--ck-color-primary-fg',
  '--ck-color-danger',
  '--ck-color-danger-hover',
  '--ck-color-danger-active',
  '--ck-color-on-danger',
  '--ck-color-danger-subtle',
  '--ck-color-danger-fg',
  '--ck-color-success',
  '--ck-color-on-success',
  '--ck-color-success-subtle',
  '--ck-color-success-fg',
  '--ck-color-warning',
  '--ck-color-on-warning',
  '--ck-color-warning-subtle',
  '--ck-color-warning-fg',
  '--ck-color-focus-ring',
  '--ck-focus-ring',
  '--ck-color-backdrop',
  '--ck-shadow-sm',
  '--ck-shadow-md',
  '--ck-shadow-lg',
];

interface Target {
  foreground: string;
  background: string;
  minimum: number;
}

function buildTargets(): Target[] {
  const targets: Target[] = [];
  const add = (foregrounds: string[], backgrounds: string[], minimum: number): void => {
    for (const foreground of foregrounds) {
      for (const background of backgrounds) {
        targets.push({
          foreground: `--ck-color-${foreground}`,
          background: `--ck-color-${background}`,
          minimum,
        });
      }
    }
  };
  const surfaces = ['bg', 'surface', 'surface-raised'];
  add(['fg', 'fg-muted'], surfaces, 4.5);
  for (const role of ['primary', 'danger']) {
    add([`on-${role}`], [role, `${role}-hover`, `${role}-active`], 4.5);
  }
  add(['on-success'], ['success'], 4.5);
  add(['on-warning'], ['warning'], 4.5);
  for (const role of ['primary', 'danger', 'success', 'warning']) {
    add([`${role}-fg`], ['bg', 'surface', `${role}-subtle`], 4.5);
  }
  add(['border', 'focus-ring', 'primary', 'danger'], ['bg', 'surface'], 3);
  return targets;
}

type Declarations = Map<string, string>;

function collectRules(
  rules: CSSRuleList,
  conditions: string[],
  found: { selector: string; conditions: string[]; style: CSSStyleDeclaration }[],
): void {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      found.push({ selector: rule.selectorText, conditions, style: rule.style });
      if (rule.cssRules?.length) {
        collectRules(rule.cssRules, conditions, found);
      }
    } else if (rule instanceof CSSMediaRule) {
      collectRules(rule.cssRules, [...conditions, rule.conditionText], found);
    } else if ('cssRules' in rule) {
      collectRules((rule as CSSGroupingRule).cssRules, conditions, found);
    }
  }
}

function allStyleRules() {
  const found: { selector: string; conditions: string[]; style: CSSStyleDeclaration }[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      collectRules(sheet.cssRules, [], found);
    } catch {
      // A cross-origin sheet cannot be read; the library CSS is same-origin.
    }
  }
  return found;
}

function customProperties(style: CSSStyleDeclaration): Declarations {
  const declarations: Declarations = new Map();
  for (const name of Array.from(style)) {
    if (name.startsWith('--')) {
      declarations.set(name, style.getPropertyValue(name).trim());
    }
  }
  return declarations;
}

/** The declarations of the theme block whose selector and media conditions match. */
function themeBlock(match: (selector: string, conditions: string[]) => boolean): Declarations {
  const merged: Declarations = new Map();
  for (const rule of allStyleRules()) {
    if (match(rule.selector, rule.conditions)) {
      for (const [name, value] of customProperties(rule.style)) {
        merged.set(name, value);
      }
    }
  }
  return merged;
}

const isDarkMedia = (conditions: string[]) =>
  conditions.some((condition) => /prefers-color-scheme:\s*dark/.test(condition));

const blocks = {
  light: () =>
    themeBlock(
      (selector, conditions) =>
        conditions.length === 0 &&
        selector.includes(':root') &&
        /data-ck-theme=["']light["']/.test(selector),
    ),
  osDark: () =>
    themeBlock(
      (selector, conditions) => isDarkMedia(conditions) && selector.includes(':root:not('),
    ),
  dark: () =>
    themeBlock(
      (selector, conditions) =>
        conditions.length === 0 && /^\[data-ck-theme=["']dark["']\]$/.test(selector),
    ),
};

describe('theme stylesheet', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
    delete document.documentElement.dataset['ckTheme'];
  });

  function themed(markup: string): Element {
    host.innerHTML = markup;
    return host.querySelector('[data-target]')!;
  }

  function tokenValues(element: Element): Record<string, string> {
    return Object.fromEntries(THEME_TOKENS.map((token) => [token, resolveToken(element, token)]));
  }

  function standaloneValues(theme: 'light' | 'dark'): Record<string, string> {
    const standalone = document.createElement('div');
    standalone.dataset['ckTheme'] = theme;
    host.appendChild(standalone);
    const values = tokenValues(standalone);
    standalone.remove();
    return values;
  }

  function failures(element: Element): string[] {
    const problems: string[] = [];
    for (const { foreground, background, minimum } of buildTargets()) {
      const foregroundValue = resolveToken(element, foreground);
      const backgroundValue = resolveToken(element, background);
      if (!foregroundValue || !backgroundValue) {
        problems.push(`${foreground} on ${background}: token is not declared`);
        continue;
      }
      const ratio = contrastRatio(foregroundValue, backgroundValue);
      if (ratio < minimum) {
        problems.push(`${foreground} on ${background}: ${ratio.toFixed(2)} < ${minimum}`);
      }
    }
    return problems;
  }

  it('lists every contrast target from the contract', () => {
    // 6 + 6 + 1 + 1 + 12 text pairs, 8 non-text pairs
    expect(buildTargets().length).toBe(34);
  });

  describe('contrast', () => {
    it('passes in the light theme', () => {
      expect(failures(themed('<div data-ck-theme="light" data-target></div>'))).toEqual([]);
    });

    it('passes in the dark theme', () => {
      expect(failures(themed('<div data-ck-theme="dark" data-target></div>'))).toEqual([]);
    });

    it('passes for a light section nested in a dark one', () => {
      const element = themed(
        '<div data-ck-theme="dark"><section data-ck-theme="light" data-target></section></div>',
      );
      expect(failures(element)).toEqual([]);
      expect(resolveToken(element, '--ck-color-scheme')).toBe('light');
      expect(tokenValues(element)).toEqual(standaloneValues('light'));
    });

    it('passes for a dark section nested in a light one', () => {
      const element = themed(
        '<div data-ck-theme="light"><section data-ck-theme="dark" data-target></section></div>',
      );
      expect(failures(element)).toEqual([]);
      expect(resolveToken(element, '--ck-color-scheme')).toBe('dark');
      expect(tokenValues(element)).toEqual(standaloneValues('dark'));
    });

    it.each(['dark', 'light'] as const)(
      'passes and matches a standalone section when the root element is %s',
      (theme) => {
        document.documentElement.dataset['ckTheme'] = theme;
        expect(failures(document.documentElement)).toEqual([]);
        expect(tokenValues(document.documentElement)).toEqual(standaloneValues(theme));
        expect(resolveToken(document.documentElement, '--ck-color-bg')).toBe(
          resolveToken(themed(`<div data-ck-theme="${theme}" data-target></div>`), '--ck-color-bg'),
        );
      },
    );

    it('resolves different colours for the two themes', () => {
      const light = themed('<div data-ck-theme="light" data-target></div>');
      const lightBackground = resolveToken(light, '--ck-color-bg');
      const dark = themed('<div data-ck-theme="dark" data-target></div>');
      expect(resolveToken(dark, '--ck-color-bg')).not.toBe(lightBackground);
    });

    it('sets color-scheme on themed elements and not on the document root', () => {
      const element = themed('<div data-ck-theme="dark" data-target></div>');
      expect(getComputedStyle(element).colorScheme).toBe('dark');
      expect(getComputedStyle(document.documentElement).colorScheme).toBe('normal');
    });
  });

  describe('theme blocks', () => {
    it('finds all three blocks in the loaded stylesheet', () => {
      expect(blocks.light().size).toBeGreaterThan(0);
      expect(blocks.osDark().size).toBeGreaterThan(0);
      expect(blocks.dark().size).toBeGreaterThan(0);
    });

    it.each(['light', 'osDark', 'dark'] as const)(
      '%s declares every theme-dependent token',
      (name) => {
        const declared = blocks[name]();
        const missing = THEME_TOKENS.filter((token) => !declared.has(token));
        expect(missing).toEqual([]);
        for (const token of THEME_TOKENS) {
          expect(declared.get(token), token).not.toBe('');
        }
      },
    );

    it.each(['light', 'osDark', 'dark'] as const)(
      '%s declares nothing beyond the theme-dependent set',
      (name) => {
        const extra = [...blocks[name]().keys()].filter((token) => !THEME_TOKENS.includes(token));
        expect(extra).toEqual([]);
      },
    );

    it('declares the same properties with equal values in the OS-dark and data-attribute dark blocks', () => {
      const osDark = blocks.osDark();
      const dark = blocks.dark();
      expect([...osDark.keys()].sort()).toEqual([...dark.keys()].sort());
      expect(Object.fromEntries(osDark)).toEqual(Object.fromEntries(dark));
    });

    it('declares the same properties in the light and dark blocks', () => {
      expect([...blocks.light().keys()].sort()).toEqual([...blocks.dark().keys()].sort());
    });

    it('declares no colour-scheme on the bare root outside the theme selectors', () => {
      const offenders = allStyleRules().filter(
        (rule) => rule.selector === ':root' && rule.style.getPropertyValue('color-scheme') !== '',
      );
      expect(offenders).toEqual([]);
    });
  });
});
