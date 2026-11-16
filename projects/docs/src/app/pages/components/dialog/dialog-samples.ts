/** Code shown on the dialog page. Plain text, rendered through interpolation so no escaping is needed. */
export const SAMPLES = {
  service: `import { Component, inject, signal } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_DIALOG_DATA, CK_DIALOG_IMPORTS, CkDialog, CkDialogRef } from '@ckui/core/dialog';

@Component({
  selector: 'app-rename-workout',
  imports: [CK_DIALOG_IMPORTS, CkButton],
  template: \`
    <h2 ckDialogTitle>Rename workout</h2>
    <p ckDialogDescription>Pick a name you will recognise.</p>
    <ck-dialog-body>
      <input aria-label="Name" [value]="data.name" #name />
    </ck-dialog-body>
    <ck-dialog-actions>
      <button ckButton ckDialogClose>Cancel</button>
      <button ckButton variant="primary" (click)="ref.close(name.value)">Save</button>
    </ck-dialog-actions>
  \`,
})
export class RenameWorkout {
  protected readonly data = inject<{ name: string }>(CK_DIALOG_DATA);
  protected readonly ref = inject<CkDialogRef<string>>(CkDialogRef);
}

@Component({
  selector: 'app-workout',
  imports: [CkButton],
  template: \`<button ckButton (click)="rename()">Rename</button> {{ name() }}\`,
})
export class Workout {
  private readonly dialog = inject(CkDialog);
  protected readonly name = signal('Leg day');

  protected async rename(): Promise<void> {
    const ref = this.dialog.open<RenameWorkout, { name: string }, string>(RenameWorkout, {
      data: { name: this.name() },
    });
    // undefined when the dialog was dismissed (Escape, backdrop, swipe, close button)
    const result = await ref.closed;
    if (result !== undefined) {
      this.name.set(result);
    }
  }
}`,
  template: `import { Component, signal } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_DIALOG_IMPORTS } from '@ckui/core/dialog';

@Component({
  selector: 'app-settings',
  imports: [CK_DIALOG_IMPORTS, CkButton],
  template: \`
    <button ckButton (click)="open.set(true)">Settings</button>

    <ck-dialog [(open)]="open" width="sm" (closed)="saved.set($event === 'save')">
      <ng-template>
        <h2 ckDialogTitle>Settings</h2>
        <ck-dialog-body>Content exists only while the dialog is open.</ck-dialog-body>
        <ck-dialog-actions>
          <button ckButton ckDialogClose>Cancel</button>
          <button ckButton variant="primary" ckDialogClose="save">Save</button>
        </ck-dialog-actions>
      </ng-template>
    </ck-dialog>
  \`,
})
export class Settings {
  protected readonly open = signal(false);
  protected readonly saved = signal(false);
}`,
  alert: `import { Component, inject } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_DIALOG_IMPORTS, CkDialog } from '@ckui/core/dialog';

@Component({
  selector: 'app-delete-workout',
  imports: [CK_DIALOG_IMPORTS, CkButton],
  template: \`
    <h2 ckDialogTitle>Delete this workout?</h2>
    <p ckDialogDescription>All sets are removed. This cannot be undone.</p>
    <ck-dialog-actions>
      <!-- the least destructive action takes focus, so Enter never deletes by accident -->
      <button ckButton ckDialogInitialFocus ckDialogClose="keep">Keep it</button>
      <button ckButton variant="danger" ckDialogClose="delete">Delete</button>
    </ck-dialog-actions>
  \`,
})
export class DeleteWorkout {}

@Component({
  selector: 'app-workout-menu',
  imports: [CkButton],
  template: \`<button ckButton variant="danger" (click)="remove()">Delete</button>\`,
})
export class WorkoutMenu {
  private readonly dialog = inject(CkDialog);

  protected async remove(): Promise<void> {
    const ref = this.dialog.open<DeleteWorkout, void, 'keep' | 'delete'>(DeleteWorkout, {
      role: 'alertdialog',
      closeButton: false,
    });
    if ((await ref.closed) === 'delete') {
      // delete it
    }
  }
}`,
  scrolling: `import { Component, inject } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_DIALOG_IMPORTS, CkDialog } from '@ckui/core/dialog';

@Component({
  selector: 'app-terms',
  imports: [CK_DIALOG_IMPORTS, CkButton],
  template: \`
    <h2 ckDialogTitle>Terms of use</h2>
    <!-- only the body scrolls; the title and the actions stay in view -->
    <ck-dialog-body>
      @for (paragraph of paragraphs; track $index) {
        <p>{{ paragraph }}</p>
      }
    </ck-dialog-body>
    <ck-dialog-actions>
      <button ckButton variant="primary" ckDialogClose="accepted">Accept</button>
    </ck-dialog-actions>
  \`,
})
export class Terms {
  protected readonly paragraphs = Array.from({ length: 12 }, (_, index) => \`Clause \${index + 1}\`);
}

@Component({
  selector: 'app-signup',
  imports: [CkButton],
  template: \`<button ckButton (click)="read()">Read the terms</button>\`,
})
export class Signup {
  private readonly dialog = inject(CkDialog);

  protected read(): void {
    this.dialog.open(Terms, { width: 'lg' });
  }
}`,
  fullHeight: `import { Component, inject } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_DIALOG_IMPORTS, CkDialog } from '@ckui/core/dialog';

@Component({
  selector: 'app-exercise-picker',
  imports: [CK_DIALOG_IMPORTS, CkButton],
  template: \`
    <h2 ckDialogTitle>Pick an exercise</h2>
    <ck-dialog-body>The list goes here.</ck-dialog-body>
    <ck-dialog-actions>
      <button ckButton ckDialogClose>Cancel</button>
    </ck-dialog-actions>
  \`,
})
export class ExercisePicker {}

@Component({
  selector: 'app-add-exercise',
  imports: [CkButton],
  template: \`<button ckButton (click)="pick()">Add exercise</button>\`,
})
export class AddExercise {
  private readonly dialog = inject(CkDialog);

  protected pick(): void {
    // On a phone this sheet is as tall as the screen allows, not as tall as its content.
    this.dialog.open(ExercisePicker, { fullHeight: true });
  }
}`,
  modes: `import { Component, inject } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_DIALOG_IMPORTS, CkDialog } from '@ckui/core/dialog';

@Component({
  selector: 'app-note',
  imports: [CK_DIALOG_IMPORTS],
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
    <button ckButton (click)="open('modal')">Modal</button>
    <button ckButton (click)="open('sheet')">Sheet</button>
  \`,
})
export class Modes {
  private readonly dialog = inject(CkDialog);

  protected open(mode: 'modal' | 'sheet'): void {
    // 'auto' (the default) picks the sheet on a narrow screen with a coarse pointer
    this.dialog.open(Note, { mode, width: 'sm' });
  }
}`,
  injector: `import { Component, Injectable, Injector, inject, signal } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_DIALOG_IMPORTS, CkDialog } from '@ckui/core/dialog';

// provided on a route (providers: [WorkoutStore]), not on the app root
@Injectable()
export class WorkoutStore {
  readonly count = signal(3);
}

@Component({
  selector: 'app-store-dialog',
  imports: [CK_DIALOG_IMPORTS],
  template: \`
    <h2 ckDialogTitle>Workouts</h2>
    <ck-dialog-body>{{ store.count() }} workouts</ck-dialog-body>
  \`,
})
export class StoreDialog {
  protected readonly store = inject(WorkoutStore);
}

@Component({
  selector: 'app-workout-list',
  imports: [CkButton],
  template: \`<button ckButton (click)="show()">Show</button>\`,
})
export class WorkoutList {
  private readonly dialog = inject(CkDialog);
  private readonly injector = inject(Injector);

  protected show(): void {
    // The dialog now sees what this component sees.
    this.dialog.open(StoreDialog, { injector: this.injector });
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
  --ck-dialog-bg: #1b1b22;
  --ck-dialog-radius: 1.25rem;
  --ck-dialog-padding: 2rem;
  --ck-dialog-max-width: 40rem;
  --ck-dialog-shadow: 0 24px 48px -12px rgb(0 0 0 / 0.5);
}`,
};
