import { TYPEAHEAD_WINDOW, Typeahead, collapseText, normalizeText, readableText } from './text';

const LIST = ['apple', 'apricot', 'banana', 'avocado', 'blueberry'];

describe('text helpers', () => {
  describe('normalizeText', () => {
    it('removes accents and case, also from decomposed text', () => {
      expect(normalizeText('Türkiye', 'en')).toBe('turkiye');
      expect(normalizeText('Rénée', 'en')).toBe('renee');
      expect(normalizeText('ÅNGSTRÖM', 'en')).toBe('angstrom');
    });

    it('lowercases for the given locale', () => {
      expect(normalizeText('I', 'tr')).toBe('ı');
      expect(normalizeText('I', 'en')).toBe('i');
    });

    it('survives a locale the browser rejects, and empty text', () => {
      expect(normalizeText('ABC', 'not a locale!!')).toBe('abc');
      expect(normalizeText('', 'en')).toBe('');
    });
  });

  describe('collapseText', () => {
    it('trims and collapses whitespace and tolerates null', () => {
      expect(collapseText('  a \n\t b  ')).toBe('a b');
      expect(collapseText(null)).toBe('');
    });
  });

  describe('readableText', () => {
    const parse = (html: string) => {
      const host = document.createElement('div');
      host.innerHTML = html;
      return collapseText(readableText(host));
    };

    it('puts a space between neighbouring elements', () => {
      expect(parse('<b>Sweet Spot</b><small>60 min</small>')).toBe('Sweet Spot 60 min');
    });

    it('leaves aria-hidden parts out', () => {
      expect(
        parse(
          'Run <svg aria-hidden="true"><title>icon</title></svg><span aria-hidden="true">★</span>fast',
        ),
      ).toBe('Run fast');
    });

    it('reads null as empty', () => {
      expect(readableText(null)).toBe('');
    });
  });

  describe('Typeahead', () => {
    it('finds the next entry with the letter after the current one and wraps around', () => {
      const search = new Typeahead();
      expect(search.match('a', LIST, -1, 0)).toBe(0);
      expect(search.match('a', LIST, 0, 1000)).toBe(1);
      expect(search.match('a', LIST, 3, 2000)).toBe(0);
    });

    it('cycles through entries of one letter while it repeats', () => {
      const search = new Typeahead();
      const picks: number[] = [];
      let current = -1;
      for (let step = 0; step < 5; step++) {
        current = search.match('a', LIST, current, step * 100);
        picks.push(current);
      }
      expect(picks).toEqual([0, 1, 3, 0, 1]);
    });

    it('narrows with a longer prefix and may stay on the current entry', () => {
      const search = new Typeahead();
      let current = search.match('a', LIST, -1, 0);
      current = search.match('p', LIST, current, 100);
      expect(current).toBe(0);
      current = search.match('r', LIST, current, 200);
      expect(current).toBe(1);
    });

    it('starts over after the pause and reports it as running only inside the window', () => {
      const search = new Typeahead();
      search.match('b', LIST, -1, 0);
      expect(search.active(TYPEAHEAD_WINDOW)).toBe(true);
      expect(search.active(TYPEAHEAD_WINDOW + 1)).toBe(false);
      expect(search.match('a', LIST, 2, TYPEAHEAD_WINDOW + 10)).toBe(3);
    });

    it('returns -1 for no match, for an empty list and after a reset', () => {
      const search = new Typeahead();
      expect(search.match('z', LIST, 0, 0)).toBe(-1);
      expect(search.match('a', [], -1, 10)).toBe(-1);
      search.match('b', LIST, -1, 20);
      search.reset();
      expect(search.active(21)).toBe(false);
    });
  });
});
