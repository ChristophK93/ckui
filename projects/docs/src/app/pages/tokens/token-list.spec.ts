import { ALL_TOKEN_NAMES, TOKEN_GROUPS } from './token-list';

function declaredTokens(rules: CSSRuleList, found: Set<string>): void {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      for (const name of Array.from(rule.style)) {
        if (name.startsWith('--ck-')) {
          found.add(name);
        }
      }
    }
    if ('cssRules' in rule) {
      declaredTokens((rule as CSSGroupingRule).cssRules, found);
    }
  }
}

function shippedTokens(): Set<string> {
  const found = new Set<string>();
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      declaredTokens(sheet.cssRules, found);
    } catch {
      // A cross-origin sheet cannot be read; the library CSS is same-origin.
    }
  }
  return found;
}

describe('token list', () => {
  it('finds the shipped tokens in the loaded stylesheets', () => {
    expect(shippedTokens().size).toBeGreaterThan(100);
  });

  it('documents every token the shipped CSS declares', () => {
    const missing = [...shippedTokens()].filter((name) => !ALL_TOKEN_NAMES.includes(name));
    expect(missing).toEqual([]);
  });

  it('lists no token the shipped CSS does not declare', () => {
    const shipped = shippedTokens();
    expect(ALL_TOKEN_NAMES.filter((name) => !shipped.has(name))).toEqual([]);
  });

  it('lists no token twice', () => {
    const duplicates = ALL_TOKEN_NAMES.filter(
      (name, index) => ALL_TOKEN_NAMES.indexOf(name) !== index,
    );
    expect(duplicates).toEqual([]);
  });

  it('uses unique group ids and gives every group tokens', () => {
    const ids = TOKEN_GROUPS.map((group) => group.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TOKEN_GROUPS.filter((group) => group.tokens.length === 0)).toEqual([]);
  });

  it('resolves a value for every listed token on the root', () => {
    const style = getComputedStyle(document.documentElement);
    const empty = ALL_TOKEN_NAMES.filter((name) => style.getPropertyValue(name).trim() === '');
    expect(empty).toEqual([]);
  });
});
