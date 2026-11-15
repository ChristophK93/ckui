import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
} from '@angular/core';

export type CkIconName = 'check' | 'chevron-down' | 'chevron-end' | 'close' | 'minus';

const ICON_PATHS: Readonly<Record<CkIconName, string>> = {
  check: 'M3 8.5l3.5 3.5L13 4.5',
  'chevron-down': 'M4 6l4 4 4-4',
  'chevron-end': 'M6 4l4 4-4 4',
  close: 'M4 4l8 8M12 4l-8 8',
  minus: 'M3.5 8h9',
};

/** Decorative icon at the surrounding font size and colour. The control carries its own accessible name. */
@Component({
  selector: 'ck-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ck-icon',
    'aria-hidden': 'true',
    '[class.ck-icon--mirror]': 'name() === "chevron-end"',
  },
  template: `
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
    >
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: `
    @layer ckui {
      .ck-icon {
        display: inline-block;
        flex: none;
        inline-size: var(--ck-icon-size, 1em);
        block-size: var(--ck-icon-size, 1em);
        color: currentColor;
        vertical-align: -0.125em;
      }

      .ck-icon > svg {
        display: block;
        inline-size: 100%;
        block-size: 100%;
      }

      .ck-icon--mirror:dir(rtl) {
        transform: scaleX(-1);
      }
    }
  `,
})
export class CkIcon {
  readonly name = input.required<CkIconName>();
  protected readonly path = computed(() => ICON_PATHS[this.name()] ?? '');
}
