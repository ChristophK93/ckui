import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CK_CONFIG, provideCkui } from './config';
import { CK_DEFAULT_LABELS, CK_LABELS } from './labels';

function configWith(options?: Parameters<typeof provideCkui>[0]) {
  TestBed.configureTestingModule({ providers: [provideCkui(options)] });
  return TestBed.inject(CK_CONFIG);
}

describe('CK_CONFIG', () => {
  it('defaults to size md and a 640 px sheet breakpoint without provideCkui', () => {
    expect(TestBed.inject(CK_CONFIG)).toEqual({ size: 'md', sheetBreakpoint: 640 });
  });

  it('keeps the defaults for provideCkui() and provideCkui({})', () => {
    expect(configWith()).toEqual({ size: 'md', sheetBreakpoint: 640 });
    TestBed.resetTestingModule();
    expect(configWith({})).toEqual({ size: 'md', sheetBreakpoint: 640 });
  });

  it('applies size and sheetBreakpoint independently', () => {
    expect(configWith({ size: 'lg' })).toEqual({ size: 'lg', sheetBreakpoint: 640 });
    TestBed.resetTestingModule();
    expect(configWith({ sheetBreakpoint: 480.5 })).toEqual({ size: 'md', sheetBreakpoint: 480.5 });
  });

  it('accepts every size including xl', () => {
    for (const size of ['sm', 'md', 'lg', 'xl'] as const) {
      TestBed.resetTestingModule();
      expect(configWith({ size }).size).toBe(size);
    }
  });

  it('throws a TypeError for an unknown size', () => {
    for (const bad of ['2xl', '', 'MD', null, 5]) {
      expect(() => provideCkui({ size: bad as never })).toThrow(TypeError);
    }
    expect(() => provideCkui({ size: '2xl' as never })).toThrow(/sm, md, lg, xl/);
  });

  it('throws a TypeError for a breakpoint that is 0, negative, NaN or infinite', () => {
    for (const bad of [0, -1, -640, NaN, Infinity, -Infinity]) {
      expect(() => provideCkui({ sheetBreakpoint: bad })).toThrow(TypeError);
    }
  });

  it('throws a TypeError for a breakpoint that is not a number', () => {
    for (const bad of ['640', null, {}, true]) {
      expect(() => provideCkui({ sheetBreakpoint: bad as never })).toThrow(TypeError);
    }
  });

  it('accepts a signal of labels directly and follows it live', () => {
    const source = signal({ close: 'Zu' });
    TestBed.configureTestingModule({ providers: [provideCkui({ labels: source })] });
    const labels = TestBed.inject(CK_LABELS);
    expect(labels()).toEqual({ ...CK_DEFAULT_LABELS, close: 'Zu' });
    source.set({ close: '  ' });
    expect(labels()).toEqual(CK_DEFAULT_LABELS);
  });

  it('accepts a very small positive breakpoint', () => {
    expect(configWith({ sheetBreakpoint: 1 }).sheetBreakpoint).toBe(1);
  });
});
