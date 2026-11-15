import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { THEME_ATTRIBUTE, THEME_STORAGE_KEY, ThemeChoice } from './theme';

/** Keeps `data-ck-theme` on `<html>` and the stored choice in sync. Storage may be unavailable. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly choice = signal<ThemeChoice>(this.readAttribute());

  readonly theme = this.choice.asReadonly();

  select(theme: ThemeChoice): void {
    const root = this.document.documentElement;
    if (theme === 'system') {
      root.removeAttribute(THEME_ATTRIBUTE);
    } else {
      root.setAttribute(THEME_ATTRIBUTE, theme);
    }
    this.store(theme);
    this.choice.set(theme);
  }

  private readAttribute(): ThemeChoice {
    const value = this.document.documentElement.getAttribute(THEME_ATTRIBUTE);
    return value === 'light' || value === 'dark' ? value : 'system';
  }

  private store(theme: ThemeChoice): void {
    try {
      const storage = this.document.defaultView?.localStorage;
      if (!storage) {
        return;
      }
      if (theme === 'system') {
        storage.removeItem(THEME_STORAGE_KEY);
      } else {
        storage.setItem(THEME_STORAGE_KEY, theme);
      }
    } catch {
      // Storage is blocked or full; the choice still applies for this visit.
    }
  }
}
