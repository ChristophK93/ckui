/** Code shown on the drawer page. Plain text, rendered through interpolation so no escaping is needed. */
export const SAMPLES = {
  service: `import { Component, inject, signal } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_DRAWER_DATA, CK_DRAWER_IMPORTS, CkDrawer, CkDrawerRef } from '@ckui/core/drawer';

@Component({
  selector: 'app-device-sheet',
  imports: [CK_DRAWER_IMPORTS, CkButton],
  template: \`
    <h2 ckDialogTitle>Devices</h2>
    <p ckDialogDescription>Pick the trainer this ride uses.</p>
    <ck-dialog-body>
      @for (device of data.devices; track device) {
        <button ckButton (click)="ref.close(device)">{{ device }}</button>
      }
    </ck-dialog-body>
    <ck-dialog-actions>
      <button ckButton ckDialogClose>Cancel</button>
    </ck-dialog-actions>
  \`,
})
export class DeviceSheet {
  protected readonly data = inject<{ devices: readonly string[] }>(CK_DRAWER_DATA);
  protected readonly ref = inject<CkDrawerRef<string>>(CkDrawerRef);
}

@Component({
  selector: 'app-connect',
  imports: [CkButton],
  template: \`<button ckButton (click)="pick()">Devices</button> {{ device() }}\`,
})
export class Connect {
  private readonly drawer = inject(CkDrawer);
  protected readonly device = signal('none');

  protected async pick(): Promise<void> {
    const ref = this.drawer.open<DeviceSheet, { devices: string[] }, string>(DeviceSheet, {
      side: 'end',
      data: { devices: ['Bike', 'Treadmill'] },
    });
    // undefined when the drawer was dismissed (Escape, backdrop, swipe, close button)
    const result = await ref.closed;
    if (result !== undefined) {
      this.device.set(result);
    }
  }
}`,
  template: `import { Component, signal } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_DRAWER_IMPORTS } from '@ckui/core/drawer';

@Component({
  selector: 'app-settings',
  imports: [CK_DRAWER_IMPORTS, CkButton],
  template: \`
    <button ckButton (click)="open.set(true)">Settings</button>

    <ck-drawer [(open)]="open" side="end" (closed)="saved.set($event === 'save')">
      <ng-template>
        <h2 ckDialogTitle>Settings</h2>
        <ck-dialog-body>Content exists only while the drawer is open.</ck-dialog-body>
        <ck-dialog-actions>
          <button ckButton ckDialogClose>Cancel</button>
          <button ckButton variant="primary" ckDialogClose="save">Save</button>
        </ck-dialog-actions>
      </ng-template>
    </ck-drawer>
  \`,
})
export class Settings {
  protected readonly open = signal(false);
  protected readonly saved = signal(false);
}`,
  sides: `import { Component, inject } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_DRAWER_IMPORTS, CkDrawer } from '@ckui/core/drawer';

@Component({
  selector: 'app-calibration',
  imports: [CK_DRAWER_IMPORTS],
  template: \`
    <h2 ckDialogTitle>Calibration</h2>
    <!-- only the body scrolls; the title and the actions stay in view -->
    <ck-dialog-body>Steps go here.</ck-dialog-body>
    <ck-dialog-actions>
      <button ckDialogClose>Close</button>
    </ck-dialog-actions>
  \`,
})
export class Calibration {}

@Component({
  selector: 'app-sides',
  imports: [CkButton],
  template: \`
    <button ckButton (click)="openAt('start')">From the start</button>
    <button ckButton (click)="openAt('end')">From the end</button>
  \`,
})
export class Sides {
  private readonly drawer = inject(CkDrawer);

  protected openAt(side: 'start' | 'end'): void {
    // 'end' is the right edge in a left-to-right page and the left edge in a right-to-left one
    this.drawer.open(Calibration, { side, width: 'sm' });
  }
}`,
  modes: `import { Component, inject } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_DRAWER_IMPORTS, CkDrawer } from '@ckui/core/drawer';

@Component({
  selector: 'app-note',
  imports: [CK_DRAWER_IMPORTS],
  template: \`
    <h2 ckDialogTitle>A note</h2>
    <ck-dialog-body>The same content in either shape.</ck-dialog-body>
  \`,
})
export class Note {}

@Component({
  selector: 'app-modes',
  imports: [CkButton],
  template: \`
    <button ckButton (click)="open('side')">Side panel</button>
    <button ckButton (click)="open('sheet')">Sheet</button>
    <button ckButton (click)="openFull()">Full-height sheet</button>
  \`,
})
export class Modes {
  private readonly drawer = inject(CkDrawer);

  protected open(mode: 'side' | 'sheet'): void {
    // 'auto' (the default) picks the sheet on a narrow screen with a coarse pointer
    this.drawer.open(Note, { mode });
  }

  protected openFull(): void {
    this.drawer.open(Note, { mode: 'sheet', fullHeight: true });
  }
}`,
  injector: `import { Component, Injectable, Injector, inject, signal } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_DRAWER_IMPORTS, CkDrawer } from '@ckui/core/drawer';

// provided on a route (providers: [DeviceStore]), not on the app root
@Injectable()
export class DeviceStore {
  readonly count = signal(2);
}

@Component({
  selector: 'app-store-drawer',
  imports: [CK_DRAWER_IMPORTS],
  template: \`
    <h2 ckDialogTitle>Devices</h2>
    <ck-dialog-body>{{ store.count() }} paired</ck-dialog-body>
  \`,
})
export class StoreDrawer {
  protected readonly store = inject(DeviceStore);
}

@Component({
  selector: 'app-device-list',
  imports: [CkButton],
  template: \`<button ckButton (click)="show()">Show</button>\`,
})
export class DeviceList {
  private readonly drawer = inject(CkDrawer);
  private readonly injector = inject(Injector);

  protected show(): void {
    // The drawer now sees what this component sees.
    this.drawer.open(StoreDrawer, { injector: this.injector });
  }
}`,
  reset: `/* A global rule such as this beats the layered title, description and close button... */
h2 {
  margin-block: 1.5rem;
}
p {
  margin-block: 1rem;
}
button:focus-visible {
  outline: 2px solid red;
}

/* ...so scope it. */
h2:not(.ck-dialog__title) {
  margin-block: 1.5rem;
}
p:not(.ck-dialog__description) {
  margin-block: 1rem;
}
button:not(.ck-button):focus-visible {
  outline: 2px solid red;
}

/* Or declare your resets in a layer that comes before ckui. */
@layer reset, ckui;
@layer reset {
  h2 {
    margin-block: 1.5rem;
  }
}`,
  tokens: `:root {
  --ck-drawer-bg: #1b1b22;
  --ck-drawer-width: 28rem;
  --ck-drawer-padding: 2rem;
  --ck-drawer-shadow: 0 0 48px rgb(0 0 0 / 0.5);
}`,
};
