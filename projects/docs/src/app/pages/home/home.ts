import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CK_SIZES } from '@ckui/core';

@Component({
  selector: 'docs-home',
  imports: [RouterLink],
  styleUrl: './home.css',
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly sizes = CK_SIZES;
}
