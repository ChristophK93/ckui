import { TokenGroup } from './token-group';

const SCALE = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

function names(prefix: string, suffixes: readonly string[]): string[] {
  return suffixes.map((suffix) => `--ck-${prefix}-${suffix}`);
}

function palette(name: string, description: string): TokenGroup {
  return {
    id: `palette-${name}`,
    layer: 'primitive',
    title: `Palette: ${name}`,
    description,
    preview: 'color',
    tokens: names(name, SCALE),
  };
}

const ROLE_SUFFIXES: Record<string, readonly string[]> = {
  primary: ['', '-hover', '-active', '-subtle', '-fg'],
  danger: ['', '-hover', '-active', '-subtle', '-fg'],
  success: ['', '-subtle', '-fg'],
  warning: ['', '-subtle', '-fg'],
};

function role(name: string, description: string): TokenGroup {
  return {
    id: `color-${name}`,
    layer: 'semantic',
    title: `Colour: ${name}`,
    description,
    preview: 'color',
    tokens: [
      ...ROLE_SUFFIXES[name].map((suffix) => `--ck-color-${name}${suffix}`),
      `--ck-color-on-${name}`,
    ],
  };
}

export const TOKEN_GROUPS: readonly TokenGroup[] = [
  {
    id: 'palette-base',
    layer: 'primitive',
    title: 'Palette: white and black',
    description: 'The two fixed ends of every palette. Semantic tokens reference these.',
    preview: 'color',
    tokens: ['--ck-white', '--ck-black'],
  },
  palette('gray', 'Cool neutral, used for surfaces, text and borders.'),
  palette('indigo', 'The primary hue.'),
  palette('red', 'Danger.'),
  palette('green', 'Success.'),
  palette('amber', 'Warning.'),
  {
    id: 'space',
    layer: 'primitive',
    title: 'Space',
    description: 'A 0.25rem step scale for gaps, padding and margins.',
    preview: 'none',
    tokens: names('space', ['1', '2', '3', '4', '5', '6', '8', '10', '12', '16']),
  },
  {
    id: 'radius',
    layer: 'primitive',
    title: 'Radius',
    description: 'Corner radii. Use full for pills and circles.',
    preview: 'none',
    tokens: names('radius', ['sm', 'md', 'lg', 'xl', 'full']),
  },
  {
    id: 'font',
    layer: 'primitive',
    title: 'Font',
    description: 'Families, sizes, weights and line heights.',
    preview: 'none',
    tokens: [
      '--ck-font-sans',
      '--ck-font-mono',
      ...names('font-size', ['xs', 'sm', 'md', 'lg', 'xl', '2xl']),
      ...names('font-weight', ['regular', 'medium', 'semibold', 'bold']),
      ...names('line-height', ['tight', 'normal']),
    ],
  },
  {
    id: 'motion',
    layer: 'primitive',
    title: 'Motion',
    description: 'Durations are 0ms under prefers-reduced-motion: reduce.',
    preview: 'none',
    tokens: [
      ...names('duration', ['fast', 'normal', 'slow']),
      ...names('ease', ['standard', 'emphasized']),
    ],
  },
  {
    id: 'controls',
    layer: 'semantic',
    title: 'Controls, targets and focus',
    description:
      'Control sizes and the minimum target size. Under a coarse pointer the heights, font sizes and target minimum grow to touch size.',
    preview: 'none',
    tokens: [
      ...names('control-height', ['sm', 'md', 'lg']),
      ...names('control-padding-inline', ['sm', 'md', 'lg']),
      ...names('control-font-size', ['sm', 'md', 'lg']),
      '--ck-control-radius',
      '--ck-target-min',
      '--ck-focus-ring-width',
      '--ck-focus-ring-offset',
    ],
  },
  {
    id: 'color-surface',
    layer: 'semantic',
    title: 'Colour: surfaces, text and borders',
    description: 'Page background, raised surfaces, text and borders. They change with the theme.',
    preview: 'color',
    tokens: names('color', [
      'bg',
      'surface',
      'surface-raised',
      'surface-hover',
      'surface-active',
      'fg',
      'fg-muted',
      'fg-disabled',
      'border',
      'border-subtle',
    ]),
  },
  role('primary', 'Brand actions and selection. Use on-primary for text on the solid colour.'),
  role('danger', 'Destructive actions and errors.'),
  role('success', 'Positive status.'),
  role('warning', 'Caution status.'),
  {
    id: 'color-overlay',
    layer: 'semantic',
    title: 'Colour: focus ring and backdrop',
    description: 'The focus ring colour and the scrim behind dialogs and sheets.',
    preview: 'color',
    tokens: ['--ck-color-focus-ring', '--ck-color-backdrop'],
  },
  {
    id: 'mode',
    layer: 'semantic',
    title: 'Colour scheme and focus ring',
    description:
      'The scheme the theme resolves to, and the ready-made focus ring shorthand (width, style and colour).',
    preview: 'none',
    tokens: ['--ck-color-scheme', '--ck-focus-ring'],
  },
  {
    id: 'shadow',
    layer: 'semantic',
    title: 'Shadows',
    description: 'Elevation shadows, tuned per theme.',
    preview: 'shadow',
    tokens: names('shadow', ['sm', 'md', 'lg']),
  },
];

export const ALL_TOKEN_NAMES: readonly string[] = TOKEN_GROUPS.flatMap((group) => group.tokens);
