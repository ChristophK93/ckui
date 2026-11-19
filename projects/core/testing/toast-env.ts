import { ApplicationRef, EnvironmentProviders, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CkAnnouncer } from '@ckui/core/internal';
import { vi } from 'vitest';

/** The tokens the shipped stylesheet declares, as far as toasts and their buttons need them (light). */
export const LIGHT_TOKENS: Record<string, string> = {
  '--ck-color-scheme': 'light',
  '--ck-space-1': '4px',
  '--ck-space-2': '8px',
  '--ck-space-3': '12px',
  '--ck-space-4': '16px',
  '--ck-radius-lg': '12px',
  '--ck-radius-full': '9999px',
  '--ck-control-height-sm': '32px',
  '--ck-control-height-md': '40px',
  '--ck-control-height-lg': '48px',
  '--ck-control-height-xl': '60px',
  '--ck-control-padding-inline-sm': '8px',
  '--ck-control-padding-inline-md': '12px',
  '--ck-control-padding-inline-lg': '16px',
  '--ck-control-padding-inline-xl': '20px',
  '--ck-control-font-size-sm': '14px',
  '--ck-control-font-size-md': '16px',
  '--ck-control-font-size-lg': '18px',
  '--ck-control-font-size-xl': '20px',
  '--ck-control-radius': '8px',
  '--ck-font-size-md': '16px',
  '--ck-font-size-xl': '20px',
  '--ck-font-weight-medium': '500',
  '--ck-font-weight-semibold': '600',
  '--ck-font-variant-numeric': 'tabular-nums',
  '--ck-line-height-tight': '1.25',
  '--ck-line-height-normal': '1.5',
  '--ck-duration-fast': '0ms',
  '--ck-duration-normal': '0ms',
  '--ck-duration-slow': '0ms',
  '--ck-ease-standard': 'ease',
  '--ck-ease-emphasized': 'ease',
  '--ck-z-overlay': '1000',
  '--ck-z-toast': '1100',
  '--ck-focus-ring-width': '2px',
  '--ck-focus-ring-offset': '2px',
  '--ck-focus-ring': '2px solid rgb(0, 0, 255)',
  '--ck-color-surface-raised': 'rgb(255, 255, 255)',
  '--ck-color-surface-hover': 'rgba(0, 0, 0, 0.06)',
  '--ck-color-surface-active': 'rgba(0, 0, 0, 0.1)',
  '--ck-color-fg': 'rgb(20, 20, 30)',
  '--ck-color-fg-muted': 'rgb(80, 80, 90)',
  '--ck-color-fg-disabled': 'rgb(150, 150, 160)',
  '--ck-color-border-subtle': 'rgb(200, 200, 208)',
  '--ck-color-primary-fg': 'rgb(60, 50, 180)',
  '--ck-color-success': 'rgb(20, 110, 50)',
  '--ck-color-warning-fg': 'rgb(120, 60, 10)',
  '--ck-color-danger': 'rgb(200, 30, 30)',
  '--ck-color-danger-hover': 'rgb(160, 20, 20)',
  '--ck-color-danger-active': 'rgb(130, 15, 15)',
  '--ck-color-on-danger': 'rgb(255, 255, 255)',
  '--ck-shadow-lg': '0 12px 24px -4px rgba(0, 0, 0, 0.16)',
};

export const DARK_TOKENS: Record<string, string> = {
  ...LIGHT_TOKENS,
  '--ck-color-scheme': 'dark',
  '--ck-color-surface-raised': 'rgb(40, 40, 48)',
  '--ck-color-surface-hover': 'rgba(255, 255, 255, 0.06)',
  '--ck-color-surface-active': 'rgba(255, 255, 255, 0.1)',
  '--ck-color-fg': 'rgb(245, 245, 250)',
  '--ck-color-fg-muted': 'rgb(200, 200, 210)',
  '--ck-color-border-subtle': 'rgb(70, 70, 80)',
  '--ck-color-primary-fg': 'rgb(170, 170, 255)',
  '--ck-color-success': 'rgb(80, 210, 120)',
  '--ck-color-warning-fg': 'rgb(250, 200, 90)',
  '--ck-color-danger': 'rgb(255, 110, 100)',
  '--ck-color-danger-hover': 'rgb(255, 150, 140)',
  '--ck-color-danger-active': 'rgb(255, 180, 175)',
  '--ck-color-on-danger': 'rgb(10, 10, 15)',
};

/** Declares the tokens on `<html>`, where the toast host (a child of `body`) inherits them. */
export function setTokens(tokens: Record<string, string> = LIGHT_TOKENS): void {
  const style = document.documentElement.style;
  style.cssText = '';
  for (const [name, value] of Object.entries(tokens)) {
    style.setProperty(name, value);
  }
}

/** Puts the document back the way a spec found it. */
export function resetEnvironment(): void {
  document.documentElement.style.cssText = '';
  document.documentElement.removeAttribute('dir');
  // Never `body.dir = ''`: an empty dir attribute leaves the body ltr and hides <html dir>.
  document.body.removeAttribute('dir');
  document.body.replaceChildren();
  delete (document as { visibilityState?: unknown }).visibilityState;
}

/** Runs change detection and the render hooks, twice so a removal that follows a leave settles. */
export function flush(): void {
  const appRef = TestBed.inject(ApplicationRef);
  appRef.tick();
  appRef.tick();
}

export async function settle(): Promise<void> {
  const appRef = TestBed.inject(ApplicationRef);
  await appRef.whenStable();
  flush();
  await appRef.whenStable();
}

export function spyOnAnnouncements(): ReturnType<typeof vi.fn> {
  const spy = vi.fn(() => Promise.resolve());
  vi.spyOn(TestBed.inject(CkAnnouncer), 'announce').mockImplementation(spy);
  return spy;
}

export const toastHost = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('section.ck-toast-host');

export const toastItems = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('ck-toast-item'));

export const textOf = (item: HTMLElement): string =>
  Array.from(item.querySelector('.ck-toast__text')!.children, (line) =>
    line.textContent!.replace(/\s+/g, ' ').trim(),
  ).join(' ');

export const actionOf = (item: HTMLElement): HTMLButtonElement =>
  item.querySelector<HTMLButtonElement>('.ck-toast__action')!;

export const dismissOf = (item: HTMLElement): HTMLButtonElement =>
  item.querySelector<HTMLButtonElement>('.ck-toast__dismiss')!;

export function configure(...providers: (Provider | EnvironmentProviders)[]): void {
  TestBed.configureTestingModule({ providers });
}

/** Sets `document.visibilityState` and fires the event the browser would. */
export function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}
