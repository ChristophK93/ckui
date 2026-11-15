import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { THEME_CHOICES, THEME_LABELS, ThemeChoice } from './theme';
import { ThemeService } from './theme.service';

@Component({
  selector: 'docs-theme-switcher',
  styleUrl: './theme-switcher.css',
  templateUrl: './theme-switcher.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeSwitcher {
  protected readonly themeService = inject(ThemeService);
  protected readonly choices = THEME_CHOICES;
  protected readonly labels = THEME_LABELS;

  protected select(theme: ThemeChoice): void {
    this.themeService.select(theme);
  }
}
