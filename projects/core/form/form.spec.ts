import { ApplicationRef, Component, PLATFORM_ID, Provider, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CK_MESSAGES_CONTEXT } from '@ckui/core/internal';
import { vi } from 'vitest';
import { CK_FORM_MESSAGE_IMPORTS } from './index';

@Component({
  imports: [CK_FORM_MESSAGE_IMPORTS],
  template: '<ck-hint>Unused</ck-hint><ck-error>Unused</ck-error>',
})
class FormHost {
  readonly messageId = signal('message-a');
  readonly shown = signal(true);
}

function mount(
  template: string,
  providers: Provider[] = [],
): { fixture: ComponentFixture<FormHost>; host: FormHost; root: HTMLElement } {
  TestBed.configureTestingModule({ providers });
  TestBed.overrideComponent(FormHost, { set: { template } });
  const fixture = TestBed.createComponent(FormHost);
  const root = fixture.nativeElement as HTMLElement;
  document.body.appendChild(root);
  fixture.detectChanges();
  return { fixture, host: fixture.componentInstance, root };
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
  TestBed.inject(ApplicationRef).tick();
}

describe.each([
  ['ck-hint', 'ck-hint'],
  ['ck-error', 'ck-error'],
])('%s id', (selector, prefix) => {
  beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => undefined));
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
    TestBed.resetTestingModule();
  });

  it('gets a generated id and two elements get different ones', async () => {
    const { fixture, root } = mount(`<${selector}>a</${selector}><${selector}>b</${selector}>`);
    await settle(fixture);
    const [first, second] = Array.from(root.querySelectorAll(selector));
    expect(first.id).toMatch(new RegExp(`^${prefix}-[0-9]+$`));
    expect(second.id).toMatch(new RegExp(`^${prefix}-[0-9]+$`));
    expect(first.id).not.toBe(second.id);
  });

  it('keeps a static id', async () => {
    const { fixture, root } = mount(`<${selector} id="fixed">a</${selector}>`);
    await settle(fixture);
    expect(root.querySelector(selector)!.id).toBe('fixed');
  });

  it('follows a bound id and a change of it, and does not write it on its own', async () => {
    const { fixture, host, root } = mount(`<${selector} [id]="messageId()">a</${selector}>`);
    await settle(fixture);
    const element = root.querySelector(selector)!;
    expect(element.id).toBe('message-a');
    host.messageId.set('message-b');
    await settle(fixture);
    expect(element.id).toBe('message-b');
    expect(root.querySelectorAll('#message-a')).toHaveLength(0);
  });

  it('keeps the id of server-rendered markup and renders it once on the server', () => {
    const { root } = mount(`<${selector} id="pre">a</${selector}>`, [
      { provide: PLATFORM_ID, useValue: 'server' },
    ]);
    expect(root.querySelectorAll(selector)).toHaveLength(1);
    expect(root.querySelector(selector)!.id).toBe('pre');
  });

  it('renders a generated id on the server too, through the host binding', () => {
    const { root } = mount(`<${selector}>a</${selector}>`, [
      { provide: PLATFORM_ID, useValue: 'server' },
    ]);
    expect(root.querySelector(selector)!.id).toMatch(new RegExp(`^${prefix}-[0-9]+$`));
  });
});

describe('ck-hint', () => {
  afterEach(() => {
    document.body.replaceChildren();
    TestBed.resetTestingModule();
  });

  it('has its host class and stays visible without any context', async () => {
    const { fixture, root } = mount('<ck-hint>Help</ck-hint>');
    await settle(fixture);
    const hint = root.querySelector<HTMLElement>('ck-hint')!;
    expect(hint.classList.contains('ck-hint')).toBe(true);
    expect(hint.hidden).toBe(false);
  });
});

describe('ck-error', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
    TestBed.resetTestingModule();
  });

  it('follows the errors-visible signal of the context it sits in', async () => {
    const visible = signal(false);
    const { fixture, root } = mount('<ck-error>Wrong</ck-error>', [
      { provide: CK_MESSAGES_CONTEXT, useValue: { errorsVisible: visible } },
    ]);
    await settle(fixture);
    const error = root.querySelector<HTMLElement>('ck-error')!;
    expect(error.hidden).toBe(true);
    visible.set(true);
    await settle(fixture);
    expect(error.hidden).toBe(false);
    visible.set(false);
    await settle(fixture);
    expect(error.hidden).toBe(true);
  });

  it('does not warn inside a context', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { fixture } = mount('<ck-error>Wrong</ck-error>', [
      { provide: CK_MESSAGES_CONTEXT, useValue: { errorsVisible: signal(true) } },
    ]);
    await settle(fixture);
    expect(warn).not.toHaveBeenCalled();
  });

  it('is always visible outside any context, and warns once in development', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { fixture, root } = mount('<ck-error>Wrong</ck-error>');
    await settle(fixture);
    expect(root.querySelector<HTMLElement>('ck-error')!.hidden).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('outside a ck-field');
  });

  it('stays visible next to a hint that is shown while the error is hidden', async () => {
    const { fixture, root } = mount('<ck-hint>Help</ck-hint><ck-error>Wrong</ck-error>', [
      { provide: CK_MESSAGES_CONTEXT, useValue: { errorsVisible: signal(false) } },
    ]);
    await settle(fixture);
    expect(root.querySelector<HTMLElement>('ck-hint')!.hidden).toBe(false);
    expect(root.querySelector<HTMLElement>('ck-error')!.hidden).toBe(true);
  });
});
