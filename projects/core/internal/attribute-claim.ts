import { Renderer2 } from '@angular/core';

/**
 * Holds an attribute the component overrides, and gives the consumer's own value back afterwards.
 * The consumer's value is also kept in a `data-ck-claim-*` attribute, so markup that was rendered
 * earlier (server render) is recognised: a value the library wrote is never mistaken for the
 * consumer's.
 */
export class AttributeClaim {
  private claimed = false;
  private ours: string | null = null;
  private theirs: string | null = null;
  private readonly marker: string;

  constructor(
    private readonly element: HTMLElement,
    private readonly name: string,
    private readonly renderer: Renderer2,
  ) {
    this.marker = `data-ck-claim-${name}`;
  }

  /** `desired` of `null` releases the attribute. A consumer rewriting it in between is noticed. */
  apply(desired: string | null): void {
    const current = this.element.getAttribute(this.name);
    if (!this.claimed) {
      const recorded = this.element.getAttribute(this.marker);
      if (recorded !== null) {
        this.claimed = true;
        this.ours = current;
        this.theirs = recorded === 'none' ? null : recorded.slice('value:'.length);
      } else {
        this.theirs = current;
      }
    } else if (current !== this.ours) {
      this.theirs = current;
    }
    if (desired !== null) {
      this.claimed = true;
      this.ours = desired;
      this.renderer.setAttribute(
        this.element,
        this.marker,
        this.theirs === null ? 'none' : `value:${this.theirs}`,
      );
      if (current !== desired) {
        this.renderer.setAttribute(this.element, this.name, desired);
      }
    } else if (this.claimed) {
      this.claimed = false;
      this.ours = null;
      this.renderer.removeAttribute(this.element, this.marker);
      if (this.theirs === null) {
        this.renderer.removeAttribute(this.element, this.name);
      } else if (current !== this.theirs) {
        this.renderer.setAttribute(this.element, this.name, this.theirs);
      }
    }
  }
}
