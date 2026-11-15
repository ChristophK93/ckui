import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EnvironmentInjector,
  ViewEncapsulation,
  createComponent,
  inject,
} from '@angular/core';

/** The one place field.css is compiled in; every field and standalone input instantiates it. */
@Component({
  selector: 'ck-field-styles',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './field.css',
})
class CkFieldStyles {}

/** Loads the field stylesheet for as long as the calling directive or component lives. */
export function loadFieldStyles(): void {
  const styles = createComponent(CkFieldStyles, {
    environmentInjector: inject(EnvironmentInjector),
  });
  inject(DestroyRef).onDestroy(() => styles.destroy());
}
