/** Text as the filter and the typeahead compare it: no accents, no case. */
export function normalizeText(text: string, locale: string): string {
  const plain = text.normalize('NFD').replace(/\p{M}/gu, '');
  try {
    return plain.toLocaleLowerCase(locale);
  } catch {
    return plain.toLowerCase();
  }
}

/** Visible text of an element's content with its whitespace collapsed. */
export function collapseText(text: string | null): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * The text of a node for people: elements are separated by a space, so `<b>A</b><i>B</i>` reads
 * "A B", and `aria-hidden` subtrees (icons, decoration) are left out.
 */
export function readableText(node: Node | null): string {
  if (node === null) {
    return '';
  }
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (node instanceof Element && node.getAttribute('aria-hidden') === 'true') {
    return '';
  }
  const inner = Array.from(node.childNodes, readableText).join('');
  return node.nodeType === Node.ELEMENT_NODE ? ` ${inner} ` : inner;
}

/** Characters typed within this many milliseconds of each other make one search. */
export const TYPEAHEAD_WINDOW = 500;

/**
 * The state of a typeahead search over a list. Characters typed within `TYPEAHEAD_WINDOW` ms of
 * the last one add up to a prefix; the same letter typed again and again cycles through the
 * entries that start with it.
 */
export class Typeahead {
  private buffer = '';
  private last = 0;

  /** Whether a search is running, so a space belongs to it. */
  active(now: number = Date.now()): boolean {
    return this.buffer !== '' && now - this.last <= TYPEAHEAD_WINDOW;
  }

  reset(): void {
    this.buffer = '';
  }

  /**
   * Adds the character and returns the index of the entry to move to, or -1. `texts` holds the
   * normalised text of each entry; `current` is the entry the search starts from (-1 for none).
   */
  match(character: string, texts: readonly string[], current: number, now = Date.now()): number {
    this.buffer = (this.active(now) ? this.buffer : '') + character;
    this.last = now;
    const first = this.buffer[0];
    const cycling = this.buffer.length > 1 && [...this.buffer].every((letter) => letter === first);
    const query = cycling ? first : this.buffer;
    // One letter, or the same one again, moves on; a longer prefix may stay where it is.
    const start = this.buffer.length === 1 || cycling ? current + 1 : Math.max(current, 0);
    for (let offset = 0; offset < texts.length; offset++) {
      const index = (start + offset) % texts.length;
      if (texts[index].startsWith(query)) {
        return index;
      }
    }
    return -1;
  }
}
