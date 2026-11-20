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
  /** The last token `applyToken` claimed, so a release strips it from what other writers left. */
  private token: string | null = null;

  constructor(
    private readonly element: HTMLElement,
    private readonly name: string,
    private readonly renderer: Renderer2,
  ) {
    this.marker = `data-ck-claim-${name}`;
  }

  /** `desired` of `null` releases the attribute. A consumer rewriting it in between is noticed. */
  apply(desired: string | null): void {
    this.write(desired === null ? null : () => desired);
  }

  /**
   * For a list attribute (`aria-describedby`): the consumer's own tokens plus `token`, or just the
   * consumer's value back when `token` is `null`. A consumer rewriting the attribute in between is
   * noticed, and their new tokens are kept. Other writers that append to the list (a field's error
   * id, the CDK `AriaDescriber`) are fine: the claimed token is never taken for the consumer's.
   */
  applyToken(token: string | null): void {
    const strip = (value: string | null): string | null => {
      if (value === null) {
        return null;
      }
      const entries = value.split(/\s+/);
      const kept = entries.filter((entry) => entry !== this.token && entry !== token);
      if (kept.length === entries.length) {
        return value;
      }
      const text = kept.join(' ').trim();
      return text === '' ? null : text;
    };
    this.write(
      token === null
        ? null
        : (theirs) => [...new Set([...(theirs ?? '').split(/\s+/), token])].join(' ').trim(),
      strip,
    );
    this.token = token;
  }

  private write(
    desired: ((theirs: string | null) => string) | null,
    strip: (value: string | null) => string | null = (value) => value,
  ): void {
    const current = this.element.getAttribute(this.name);
    if (!this.claimed) {
      const recorded = this.element.getAttribute(this.marker);
      if (recorded !== null) {
        this.claimed = true;
        this.ours = current;
        this.theirs = recorded === 'none' ? null : recorded.slice('value:'.length);
      } else {
        this.theirs = strip(current);
      }
    } else if (current !== this.ours) {
      this.theirs = strip(current);
    }
    if (desired !== null) {
      const value = desired(this.theirs);
      this.claimed = true;
      this.ours = value;
      this.renderer.setAttribute(
        this.element,
        this.marker,
        this.theirs === null ? 'none' : `value:${this.theirs}`,
      );
      if (current !== value) {
        this.renderer.setAttribute(this.element, this.name, value);
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
