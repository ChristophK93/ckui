import { InjectionToken, Signal, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideCkui } from './config';
import { CK_DEFAULT_LABELS, CK_LABELS, CkLabels } from './labels';

function labelsWith(options: Parameters<typeof provideCkui>[0]): Signal<CkLabels> {
  TestBed.configureTestingModule({ providers: [provideCkui(options)] });
  return TestBed.inject(CK_LABELS);
}

describe('CK_LABELS', () => {
  it('defaults to the English labels without provideCkui', () => {
    expect(TestBed.inject(CK_LABELS)()).toEqual({
      close: 'Close',
      decrement: 'Decrease',
      dismiss: 'Dismiss',
      increment: 'Increase',
      loading: 'Loading',
      noResults: 'No results',
      notifications: 'Notifications',
    });
    expect(TestBed.inject(CK_LABELS)()).toEqual(CK_DEFAULT_LABELS);
  });

  it('keeps the defaults frozen', () => {
    expect(Object.isFrozen(CK_DEFAULT_LABELS)).toBe(true);
  });

  it('merges a partial object onto the defaults', () => {
    const labels = labelsWith({ labels: { close: 'Schließen' } });
    expect(labels()).toEqual({ ...CK_DEFAULT_LABELS, close: 'Schließen' });
  });

  it('falls back to the default for blank and non-string values', () => {
    const labels = labelsWith({
      labels: {
        close: '',
        loading: '   ',
        noResults: 5 as unknown as string,
        dismiss: ' ',
        notifications: '',
      },
    });
    expect(labels()).toEqual(CK_DEFAULT_LABELS);
    TestBed.resetTestingModule();
    const nulls = labelsWith({
      labels: { close: null as unknown as string, loading: undefined, noResults: {} as string },
    });
    expect(nulls()).toEqual(CK_DEFAULT_LABELS);
  });

  it('ignores unknown keys and inherited properties', () => {
    const inherited = Object.create({ close: 'Inherited' }) as Record<string, string>;
    inherited['unknown'] = 'x';
    const labels = labelsWith({ labels: inherited });
    expect(labels()).toEqual(CK_DEFAULT_LABELS);
    expect('unknown' in labels()).toBe(false);
  });

  it('does not let later changes to the passed object leak in', () => {
    const source = { close: 'Zu' };
    const labels = labelsWith({ labels: source });
    source.close = 'Changed';
    expect(labels().close).toBe('Zu');
  });

  it('propagates live changes of a factory signal and keeps defaults for bad values', () => {
    const source = signal<Partial<CkLabels>>({ close: 'Fermer' });
    const labels = labelsWith({ labels: () => source });
    expect(labels().close).toBe('Fermer');
    source.set({ close: 'Chiudi', noResults: 'Niente' });
    expect(labels()).toEqual({ ...CK_DEFAULT_LABELS, close: 'Chiudi', noResults: 'Niente' });
    source.set({ close: '' });
    expect(labels()).toEqual(CK_DEFAULT_LABELS);
  });

  it('runs the factory in injection context', () => {
    const language = new InjectionToken<string>('language');
    TestBed.configureTestingModule({
      providers: [
        { provide: language, useValue: 'Fermer' },
        provideCkui({ labels: () => signal({ close: inject(language) }) }),
      ],
    });
    expect(TestBed.inject(CK_LABELS)().close).toBe('Fermer');
  });

  it('throws a TypeError when the factory does not return a signal', () => {
    TestBed.configureTestingModule({
      providers: [provideCkui({ labels: (() => ({ close: 'x' })) as never })],
    });
    expect(() => TestBed.inject(CK_LABELS)).toThrow(TypeError);
  });

  it('throws a TypeError for labels that are neither an object nor a factory', () => {
    for (const bad of [null, 'close', 5, true]) {
      expect(() => provideCkui({ labels: bad as never })).toThrow(TypeError);
    }
  });
});
