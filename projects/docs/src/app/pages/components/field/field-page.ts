import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'docs-field-page',
  template: `
    <h1>Field</h1>
    <p>Documentation follows.</p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldPage {}
