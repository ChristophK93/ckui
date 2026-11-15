import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CK_DEFAULT_LABELS } from '@ckui/core';
import { SAMPLES } from './theming-samples';

@Component({
  selector: 'docs-theming',
  imports: [RouterLink],
  styleUrl: './theming.css',
  templateUrl: './theming.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Theming {
  protected readonly samples = SAMPLES;
  protected readonly defaultLabels = Object.entries(CK_DEFAULT_LABELS);
}
