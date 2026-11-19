const HEART = `<svg ckChipIcon viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M8 13.5L3.4 8.9a3 3 0 014.6-3.8 3 3 0 014.6 3.8L8 13.5z" />
</svg>`;

/** A complete component around a template, so every sample compiles as copied. */
function component(
  className: string,
  selector: string,
  template: string,
  options: { body?: string } = {},
): string {
  const indented = template
    .split('\n')
    .map((line) => (line === '' ? '' : `    ${line}`))
    .join('\n');
  const core = options.body?.includes('signal(') ? 'Component, signal' : 'Component';
  return `import { ${core} } from '@angular/core';
import { CK_CHIP_IMPORTS } from '@ckui/core/chip';

@Component({
  selector: '${selector}',
  imports: [CK_CHIP_IMPORTS],
  template: \`
${indented}
  \`,
})
export class ${className} {${options.body ? `\n${options.body}\n` : ''}}`;
}

/** Code shown on the chip page. Plain text, rendered through interpolation so no escaping is needed. */
export const SAMPLES = {
  filter: component(
    'CategoryFilter',
    'app-category-filter',
    `<ck-chip-group aria-label="Category">
  <button ckChip [(selected)]="endurance">Endurance</button>
  <button ckChip [(selected)]="vo2">VO2max</button>
  <button ckChip [(selected)]="threshold">Threshold</button>
</ck-chip-group>
<p>Showing: {{ endurance() ? 'endurance ' : '' }}{{ vo2() ? 'VO2max ' : '' }}{{ threshold() ? 'threshold' : '' }}</p>`,
    {
      body: `  protected readonly endurance = signal(true);
  protected readonly vo2 = signal(false);
  protected readonly threshold = signal(false);`,
    },
  ),
  icon: component(
    'IconChips',
    'app-icon-chips',
    `<!-- ckChipIcon marks the svg as decorative; a selected chip shows a check in its place -->
<ck-chip-group aria-label="Quick filters">
  <button ckChip [(selected)]="favourites">
    ${HEART.split('\n').join('\n    ')}
    Favourites
  </button>
</ck-chip-group>`,
    { body: `  protected readonly favourites = signal(false);` },
  ),
  sizes: component(
    'ChipSizes',
    'app-chip-sizes',
    `<ck-chip-group aria-label="Sizes">
  <button ckChip size="sm">Small</button>
  <button ckChip size="md">Medium</button>
  <button ckChip size="lg">Large</button>
  <button ckChip size="xl">Extra large</button>
</ck-chip-group>`,
  ),
  wrapping: component(
    'WrappingChips',
    'app-wrapping-chips',
    `<!-- the group is a flex row that wraps; --ck-chip-group-gap sets the space between chips -->
<div style="inline-size: 16rem">
  <ck-chip-group aria-label="Category" style="--ck-chip-group-gap: var(--ck-space-3)">
    <button ckChip>Endurance</button>
    <button ckChip>VO2max</button>
    <button ckChip>Threshold</button>
    <button ckChip>Sprint</button>
    <button ckChip>Recovery</button>
    <button ckChip>Cadence</button>
  </ck-chip-group>
</div>`,
  ),
  disabled: component(
    'DisabledChips',
    'app-disabled-chips',
    `<ck-chip-group aria-label="Disabled">
  <button ckChip disabled>Endurance</button>
  <button ckChip disabled [selected]="true">VO2max</button>
</ck-chip-group>

<!-- a disabled fieldset disables every chip inside it -->
<fieldset disabled>
  <ck-chip-group aria-label="In a disabled fieldset">
    <button ckChip>Threshold</button>
  </ck-chip-group>
</fieldset>`,
  ),
  truncation: component(
    'LongChip',
    'app-long-chip',
    `<!-- the chip never grows past its container; the full text stays readable by screen readers -->
<div style="inline-size: 10rem">
  <ck-chip-group aria-label="Category">
    <button ckChip>Long endurance intervals with short recovery</button>
  </ck-chip-group>
</div>`,
  ),
  programmatic: component(
    'ResetFilters',
    'app-reset-filters',
    `<ck-chip-group aria-label="Category">
  <button ckChip [(selected)]="endurance">Endurance</button>
  <button ckChip [(selected)]="vo2">VO2max</button>
</ck-chip-group>
<!-- setting the signals in code only redraws the chips; no change is emitted -->
<button type="button" (click)="clear()">Clear</button>`,
    {
      body: `  protected readonly endurance = signal(true);
  protected readonly vo2 = signal(true);

  protected clear(): void {
    this.endurance.set(false);
    this.vo2.set(false);
  }`,
    },
  ),
  reset: `/* Rules like these beat the layered chip: it loses its fill, its border and its padding */
button {
  padding: 0;
  border: 0;
  background: none;
}

svg {
  inline-size: 100%;
}

/* Scope them away from the chip: */
button:not(.ck-chip) {
  padding: 0;
  border: 0;
  background: none;
}

svg:not(.ck-chip__icon) {
  inline-size: 100%;
}

/* Or declare resets in a layer before ckui, so the chip's layered rules win over them: */
@layer reset, ckui;

@layer reset {
  button {
    padding: 0;
    border: 0;
    background: none;
  }
}`,
  tokens: `/* in your app: one chip, a whole row or the root */
.filters {
  --ck-chip-group-gap: var(--ck-space-3);
  --ck-chip-radius: var(--ck-radius-md);
}

/* the selected look has its own pair; keep the text at 4.5:1 and the fill 3:1 from the unselected one */
.filters {
  --ck-chip-selected-bg: var(--ck-color-success);
  --ck-chip-selected-fg: var(--ck-color-on-success);
}`,
};
