export type TokenLayer = 'primitive' | 'semantic';

/** How a row previews its token: a colour chip, a shadow box, or text only. */
export type TokenPreview = 'color' | 'shadow' | 'none';

export interface TokenGroup {
  readonly id: string;
  readonly layer: TokenLayer;
  readonly title: string;
  readonly description: string;
  readonly preview: TokenPreview;
  readonly tokens: readonly string[];
}
