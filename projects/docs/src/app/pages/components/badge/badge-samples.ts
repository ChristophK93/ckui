const CHECK = `<svg ckBadgeIcon viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 8.5l3.2 3L13 4.5" />
</svg>`;

/** A complete component around a template, so every sample compiles as copied. */
function component(
  className: string,
  selector: string,
  template: string,
  options: { signals?: boolean; body?: string } = {},
): string {
  const core = options.signals ? 'Component, signal' : 'Component';
  const indented = template
    .split('\n')
    .map((line) => (line === '' ? '' : `    ${line}`))
    .join('\n');
  return `import { ${core} } from '@angular/core';
import { CK_BADGE_IMPORTS } from '@ckui/core/badge';

@Component({
  selector: '${selector}',
  imports: [CK_BADGE_IMPORTS],
  template: \`
${indented}
  \`,
})
export class ${className} {${options.body ? `\n${options.body}\n` : ''}}`;
}

/** Code shown on the badge page. Plain text, rendered through interpolation so no escaping is needed. */
export const SAMPLES = {
  tones: component(
    'DeviceStatus',
    'app-device-status',
    `<ck-badge>Kuipers S3</ck-badge>
<ck-badge tone="success">Connected</ck-badge>
<ck-badge tone="warning">Low battery</ck-badge>
<ck-badge tone="danger">Upload failed</ck-badge>`,
  ),
  dot: component(
    'DeviceDots',
    'app-device-dots',
    `<ck-badge dot>Kuipers S3 · ERG</ck-badge>
<ck-badge tone="success" dot>Connected</ck-badge>
<ck-badge tone="warning" dot>Searching</ck-badge>
<ck-badge tone="danger" dot>Disconnected</ck-badge>`,
  ),
  dotColor: component(
    'DeviceChip',
    'app-device-chip',
    `<!-- a coloured dot is decoration: the text still states the status -->
<ck-badge dot style="--ck-badge-dot: var(--ck-color-success)">Kuipers S3 · ERG, connected</ck-badge>`,
  ),
  icon: component(
    'UploadStatus',
    'app-upload-status',
    `<!-- ckBadgeIcon marks the svg as decorative (aria-hidden); the text says the status -->
<ck-badge tone="success">
  ${CHECK.split('\n').join('\n  ')}
  Strava
</ck-badge>`,
  ),
  sizes: component(
    'BadgeSizes',
    'app-badge-sizes',
    `<ck-badge tone="success" dot>Medium, 1.5rem</ck-badge>
<ck-badge tone="success" dot size="sm">Small, 1.25rem</ck-badge>`,
  ),
  truncation: component(
    'LongBadge',
    'app-long-badge',
    `<!-- the badge never grows past its container; the full text stays readable by screen readers -->
<div style="inline-size: 10rem">
  <ck-badge dot>Heart rate strap connected</ck-badge>
</div>`,
  ),
  announce: component(
    'ConnectionStatus',
    'app-connection-status',
    `<ck-badge [tone]="connected() ? 'success' : 'danger'" dot>
  {{ connected() ? 'Connected' : 'Disconnected' }}
</ck-badge>
<!-- a badge is not a live region: say the change where it should be heard -->
<p role="status">{{ announcement() }}</p>
<button type="button" (click)="toggle()">Toggle</button>`,
    {
      signals: true,
      body: `  protected readonly connected = signal(true);
  protected readonly announcement = signal('');

  protected toggle(): void {
    this.connected.update((connected) => !connected);
    this.announcement.set(this.connected() ? 'Trainer connected' : 'Trainer disconnected');
  }`,
    },
  ),
  reset: `/* Rules like these beat the layered badge: the text no longer truncates, the icon fills the badge */
span {
  overflow: visible;
}

svg {
  inline-size: 100%;
}

/* Scope them away from the badge: */
span:not([class^='ck-badge']) {
  overflow: visible;
}

svg:not(.ck-badge__icon) {
  inline-size: 100%;
}

/* Or declare resets in a layer before ckui, so the badge's layered rules win over them: */
@layer reset, ckui;

@layer reset {
  span {
    overflow: visible;
  }
}`,
  tokens: `/* in your app: one badge, a whole list or the root; the tokens apply to every tone */
.device-list ck-badge {
  --ck-badge-radius: var(--ck-radius-sm);
}

/* tone-specific colours: scope the tokens by the tone class */
ck-badge.ck-badge--success {
  --ck-badge-bg: var(--ck-color-success-subtle);
}`,
};
