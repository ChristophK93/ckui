import { Component, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideCkui } from '@ckui/core';
import { DARK_TOKENS, LIGHT_TOKENS, flush, resetEnvironment, setTokens, settle } from './toast-env';

export { flush, resetEnvironment, settle };

/** The tokens the shipped stylesheet declares, as far as dialogs need them (light). */
export const DIALOG_LIGHT: Record<string, string> = {
  ...LIGHT_TOKENS,
  '--ck-space-5': '20px',
  '--ck-space-6': '24px',
  '--ck-space-10': '40px',
  '--ck-radius-md': '8px',
  '--ck-radius-xl': '16px',
  '--ck-target-min': '24px',
  '--ck-font-sans': 'sans-serif',
  '--ck-color-backdrop': 'rgba(0, 0, 0, 0.5)',
  '--ck-color-border': 'rgb(150, 150, 160)',
  '--ck-color-primary': 'rgb(60, 50, 180)',
  '--ck-color-on-primary': 'rgb(255, 255, 255)',
  '--ck-color-primary-hover': 'rgb(50, 40, 160)',
  '--ck-color-primary-active': 'rgb(40, 30, 140)',
  '--ck-color-control': 'rgb(240, 240, 244)',
};

export const DIALOG_DARK: Record<string, string> = {
  ...DIALOG_LIGHT,
  ...DARK_TOKENS,
  '--ck-color-border': 'rgb(100, 100, 110)',
  '--ck-color-primary': 'rgb(170, 170, 255)',
  '--ck-color-on-primary': 'rgb(10, 10, 15)',
};

export function setup(tokens: Record<string, string> = DIALOG_LIGHT): void {
  setTokens(tokens);
  TestBed.configureTestingModule({ providers: [provideCkui()] });
}

/** A component that owns one template, to open through `CkDialog` or to declare a `ck-dialog` in. */
@Component({ template: '' })
export class TemplateOwner {
  readonly template = viewChild.required<TemplateRef<unknown>>('template');
}

export const panel = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('.ck-dialog-panel');

export const panels = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.ck-dialog-panel'));

export const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
