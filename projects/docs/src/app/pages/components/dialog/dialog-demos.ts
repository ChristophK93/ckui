import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_DIALOG_DATA, CK_DIALOG_IMPORTS, CkDialogRef } from '@ckui/core/dialog';

/** Dialog contents the page opens through `CkDialog`. They are demo code, not part of the library. */

@Component({
  selector: 'docs-rename-dialog',
  imports: [CK_DIALOG_IMPORTS, CkButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 ckDialogTitle>Rename workout</h2>
    <p ckDialogDescription>Pick a name you will recognise.</p>
    <ck-dialog-body>
      <input class="rename-input" aria-label="Name" [value]="data.name" #name />
    </ck-dialog-body>
    <ck-dialog-actions>
      <button ckButton type="button" ckDialogClose>Cancel</button>
      <button ckButton type="button" variant="primary" (click)="ref.close(name.value)">Save</button>
    </ck-dialog-actions>
  `,
  styles: `
    .rename-input {
      box-sizing: border-box;
      inline-size: 100%;
      min-block-size: var(--ck-control-height-md);
      padding-inline: var(--ck-space-3);
      border: 1px solid var(--ck-color-control-border);
      border-radius: var(--ck-control-radius);
      background: var(--ck-color-control);
      color: inherit;
      font: inherit;
    }
  `,
})
export class RenameDemo {
  protected readonly data = inject<{ name: string }>(CK_DIALOG_DATA);
  protected readonly ref = inject<CkDialogRef<string>>(CkDialogRef);
}

@Component({
  selector: 'docs-delete-dialog',
  imports: [CK_DIALOG_IMPORTS, CkButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 ckDialogTitle>Delete this workout?</h2>
    <p ckDialogDescription>All sets are removed. This cannot be undone.</p>
    <ck-dialog-actions>
      <button ckButton type="button" ckDialogInitialFocus ckDialogClose="keep">Keep it</button>
      <button ckButton type="button" variant="danger" ckDialogClose="delete">Delete</button>
    </ck-dialog-actions>
  `,
})
export class DeleteDemo {}

@Component({
  selector: 'docs-terms-dialog',
  imports: [CK_DIALOG_IMPORTS, CkButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 ckDialogTitle>Terms of use</h2>
    <ck-dialog-body>
      @for (paragraph of paragraphs; track $index) {
        <p class="clause">{{ paragraph }}</p>
      }
    </ck-dialog-body>
    <ck-dialog-actions>
      <button ckButton type="button" variant="primary" ckDialogClose="accepted">Accept</button>
    </ck-dialog-actions>
  `,
  styles: `
    .clause {
      margin-block: 0 var(--ck-space-3);
    }
  `,
})
export class TermsDemo {
  protected readonly paragraphs = Array.from(
    { length: 14 },
    (_, index) =>
      `Clause ${index + 1}. The quick brown fox jumps over the lazy dog, and then does it again so the text runs over several lines on a phone.`,
  );
}

@Component({
  selector: 'docs-note-dialog',
  imports: [CK_DIALOG_IMPORTS, CkButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 ckDialogTitle>A note</h2>
    <ck-dialog-body>
      <svg
        class="note-icon"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
      The same content in either shape.
    </ck-dialog-body>
    <ck-dialog-actions>
      <button ckButton type="button" ckDialogClose>Close</button>
    </ck-dialog-actions>
  `,
  styles: `
    .note-icon {
      vertical-align: middle;
      margin-inline-end: var(--ck-space-2);
    }
  `,
})
export class NoteDemo {}
