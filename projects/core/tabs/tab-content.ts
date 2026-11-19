import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Marks the `<ng-template>` of a `ck-tab-panel` whose content is created only while the panel is
 * shown and destroyed again when it is hidden.
 */
@Directive({ selector: 'ng-template[ckTabContent]' })
export class CkTabContent {
  /** @internal Used by `ck-tab-panel`. */
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}
