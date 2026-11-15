import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TokenGroup, TokenLayer } from './token-group';
import { ALL_TOKEN_NAMES, TOKEN_GROUPS } from './token-list';

/** Media features that change token values. */
const WATCHED_QUERIES = [
  '(prefers-color-scheme: dark)',
  '(prefers-reduced-motion: reduce)',
  '(pointer: coarse)',
];

interface Layer {
  readonly id: TokenLayer;
  readonly title: string;
  readonly description: string;
  readonly groups: readonly TokenGroup[];
}

@Component({
  selector: 'docs-tokens',
  imports: [RouterLink],
  styleUrl: './tokens.css',
  templateUrl: './tokens.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tokens {
  protected readonly layers: readonly Layer[] = [
    {
      id: 'primitive',
      title: 'Primitive tokens',
      description:
        'Raw scales and values on :root. They do not change with the theme. Only the durations change, to 0ms under reduced motion.',
      groups: TOKEN_GROUPS.filter((group) => group.layer === 'primitive'),
    },
    {
      id: 'semantic',
      title: 'Semantic tokens',
      description:
        'Meaning built on the primitives. Colours and shadows are declared in full for every theme, so a nested data-ck-theme section recomputes all of them.',
      groups: TOKEN_GROUPS.filter((group) => group.layer === 'semantic'),
    },
  ];
  private readonly document = inject(DOCUMENT);
  protected readonly values = signal<Readonly<Record<string, string>>>({});

  constructor() {
    const document = this.document;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const root = document.documentElement;
      const view = document.defaultView;
      if (!view) {
        return;
      }
      const read = (): void => {
        const style = view.getComputedStyle(root);
        this.values.set(
          Object.fromEntries(
            ALL_TOKEN_NAMES.map((name) => [name, style.getPropertyValue(name).trim()]),
          ),
        );
      };
      read();
      const observer = new MutationObserver(read);
      observer.observe(root, { attributes: true, attributeFilter: ['data-ck-theme'] });
      const queries = WATCHED_QUERIES.map((query) => view.matchMedia(query));
      queries.forEach((query) => query.addEventListener('change', read));
      destroyRef.onDestroy(() => {
        observer.disconnect();
        queries.forEach((query) => query.removeEventListener('change', read));
      });
    });
  }

  /** Scrolls to the heading on every click (also a repeat one) and moves focus there. */
  protected jump(event: Event, id: string): void {
    event.preventDefault();
    const target = this.document.getElementById(id);
    target?.scrollIntoView({ block: 'start' });
    target?.focus({ preventScroll: true });
  }
}
