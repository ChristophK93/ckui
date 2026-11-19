import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CkButton } from '@ckui/core/button';
import { CK_FIELD_IMPORTS } from '@ckui/core/field';
import { CkToast } from '@ckui/core/toast';

/** Uses button, field and toast in the initial bundle; the dialog and the drawer live behind lazy routes. */
@Component({
  selector: 'probe-root',
  imports: [CkButton, CK_FIELD_IMPORTS, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ck-field>
      <label for="probe-name">Name</label>
      <input ckInput id="probe-name" />
    </ck-field>
    <button ckButton type="button" (click)="notify()">Notify</button>
    <router-outlet />
  `,
})
export class App {
  private readonly toast = inject(CkToast);

  protected notify(): void {
    this.toast.show({ message: 'Hello' });
  }
}
