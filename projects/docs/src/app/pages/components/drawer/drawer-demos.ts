import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_DRAWER_DATA, CK_DRAWER_IMPORTS, CkDrawerRef } from '@ckui/core/drawer';

/** Drawer contents the page opens through `CkDrawer`. They are demo code, not part of the library. */

@Component({
  selector: 'docs-device-drawer',
  imports: [CK_DRAWER_IMPORTS, CkButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 ckDialogTitle>Devices</h2>
    <p ckDialogDescription>Pick the trainer this ride uses.</p>
    <ck-dialog-body>
      <ul class="devices">
        @for (device of data.devices; track device) {
          <li>
            <button ckButton type="button" (click)="ref.close(device)">{{ device }}</button>
          </li>
        }
      </ul>
    </ck-dialog-body>
    <ck-dialog-actions>
      <button ckButton type="button" ckDialogInitialFocus ckDialogClose>Cancel</button>
    </ck-dialog-actions>
  `,
  styles: `
    .devices {
      display: grid;
      gap: var(--ck-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
  `,
})
export class DeviceDemo {
  protected readonly data = inject<{ devices: readonly string[] }>(CK_DRAWER_DATA);
  protected readonly ref = inject<CkDrawerRef<string>>(CkDrawerRef);
}

@Component({
  selector: 'docs-calibration-drawer',
  imports: [CK_DRAWER_IMPORTS, CkButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 ckDialogTitle>Calibration</h2>
    <ck-dialog-body>
      @for (step of steps; track $index) {
        <p class="step">{{ step }}</p>
      }
    </ck-dialog-body>
    <ck-dialog-actions>
      <button ckButton type="button" ckDialogClose>Close</button>
      <button ckButton type="button" variant="primary" ckDialogClose="done">Done</button>
    </ck-dialog-actions>
  `,
  styles: `
    .step {
      margin-block: 0 var(--ck-space-3);
    }
  `,
})
export class CalibrationDemo {
  protected readonly steps = Array.from(
    { length: 16 },
    (_, index) =>
      `Step ${index + 1}. Spin the pedals at an easy cadence and hold it steady until the reading settles.`,
  );
}
