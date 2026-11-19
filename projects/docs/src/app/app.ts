import { ChangeDetectionStrategy, Component, ElementRef, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeSwitcher } from './theme-switcher/theme-switcher';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ThemeSwitcher],
  selector: 'docs-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  protected readonly links = [
    { path: '/', label: 'Home', exact: true },
    { path: '/theming', label: 'Theming', exact: false },
    { path: '/tokens', label: 'Tokens', exact: false },
  ] as const;

  protected readonly componentLinks = [
    { path: '/components/badge', label: 'Badge' },
    { path: '/components/button', label: 'Button' },
    { path: '/components/checkbox', label: 'Checkbox' },
    { path: '/components/chip', label: 'Chip' },
    { path: '/components/dialog', label: 'Dialog' },
    { path: '/components/drawer', label: 'Drawer' },
    { path: '/components/field', label: 'Field' },
    { path: '/components/progress', label: 'Progress' },
    { path: '/components/segmented', label: 'Segmented' },
    { path: '/components/slider', label: 'Slider' },
    { path: '/components/stepper', label: 'Stepper' },
    { path: '/components/switch', label: 'Switch' },
    { path: '/components/tabs', label: 'Tabs' },
    { path: '/components/toast', label: 'Toast' },
  ] as const;

  /** A plain `#main` link would resolve against the base href and leave the current route. */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }
}
