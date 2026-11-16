import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/** Never made inert: they render nothing, or must keep announcing while an overlay is open. */
const SKIPPED =
  'script, style, link, template, noscript, [data-ck-inert-exempt], .cdk-live-announcer-element';

interface Hold {
  count: number;
  /** The `inert` attribute value the element had before the first hold; `null` if it had none. */
  original: string | null;
}

/** Reference-counted `inert`: an element stays inert until every hold on it is released. */
@Injectable({ providedIn: 'root' })
export class CkInert {
  private readonly document = inject(DOCUMENT);
  private readonly holds = new Map<Element, Hold>();

  /**
   * Makes the elements inert and returns the release function (safe to call more than once).
   * An element that was already inert keeps its own attribute value when the last hold ends.
   */
  hold(elements: Iterable<Element>): () => void {
    const held = new Set(elements);
    for (const element of held) {
      const entry = this.holds.get(element);
      if (entry) {
        entry.count++;
        continue;
      }
      const original = element.getAttribute('inert');
      this.holds.set(element, { count: 1, original });
      if (original === null) {
        element.setAttribute('inert', '');
      }
    }
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      for (const element of held) {
        const entry = this.holds.get(element);
        if (!entry || --entry.count > 0) {
          continue;
        }
        this.holds.delete(element);
        if (entry.original === null) {
          element.removeAttribute('inert');
        }
      }
    };
  }

  /** Body children that an overlay hides from the user: all but `keep`, exempt elements and non-rendered tags. */
  backgroundElements(keep: Element): Element[] {
    return Array.from(this.document.body.children).filter(
      (element) => element !== keep && !element.matches(SKIPPED),
    );
  }
}
