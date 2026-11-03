import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CK_SIZES } from '@ckui/core';

@Component({
  selector: 'docs-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly sizes = CK_SIZES;
}
