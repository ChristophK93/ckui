import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CkMedia } from '@ckui/core/internal';
import { vi } from 'vitest';
import { inputOf, minusOf, mount, plusOf, pointer } from '../testing/stepper-host';

const STEPPER = (attributes = '') =>
  `<ck-stepper aria-label="FTP" ${attributes} [value]="value()" (valueChange)="value.set($event); emitted.push($event)" />`;

function mountHeld(attributes = '', value: number | null = 0, fieldset = false) {
  const template = fieldset
    ? `<fieldset [disabled]="locked()">${STEPPER(attributes)}</fieldset>`
    : STEPPER(attributes);
  const mounted = mount(template, (host) => host.value.set(value));
  const touched = vi.fn();
  const stepper = mounted.fixture.debugElement.query((debug) => debug.name === 'ck-stepper')
    .componentInstance as { registerOnTouched(callback: () => void): void };
  stepper.registerOnTouched(touched);
  const advance = (milliseconds: number): void => {
    vi.advanceTimersByTime(milliseconds);
    mounted.fixture.detectChanges();
  };
  // Angular's own zoneless scheduler also uses timers; flush those so only the stepper's are left.
  const timers = (): number => {
    advance(0);
    return vi.getTimerCount();
  };
  return { ...mounted, touched, advance, timers };
}

/** A phone: the media service reports a coarse pointer, so the input is not focused by a press. */
function useCoarsePointer(): void {
  TestBed.configureTestingModule({
    providers: [{ provide: CkMedia, useValue: { coarsePointer: signal(true) } }],
  });
}

describe('CkStepper long press', () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
    TestBed.resetTestingModule();
  });

  it('steps once on press, repeats after 400 ms, then every 80 ms', () => {
    const { host, root, advance } = mountHeld();
    pointer(plusOf(root), 'pointerdown');
    expect(host.emitted).toEqual([1]);
    advance(399);
    expect(host.emitted).toEqual([1]);
    advance(1);
    expect(host.emitted).toEqual([1, 2]);
    advance(79);
    expect(host.emitted).toEqual([1, 2]);
    advance(1);
    expect(host.emitted).toEqual([1, 2, 3]);
    advance(240);
    expect(host.emitted.length).toBe(6);
    expect(inputOf(root).value).toBe('6');
  });

  it('speeds up to five steps once the press has lasted two seconds', () => {
    const { host, root, advance } = mountHeld();
    pointer(plusOf(root), 'pointerdown');
    advance(1999);
    expect(host.emitted.at(-1)).toBe(21);
    advance(1);
    expect(host.emitted.at(-1)).toBe(26);
    advance(80);
    expect(host.emitted.at(-1)).toBe(31);
  });

  it('counts down from the minus button, with the same timing', () => {
    const { host, root, advance } = mountHeld('', 100);
    pointer(minusOf(root), 'pointerdown');
    advance(480);
    expect(host.emitted).toEqual([99, 98, 97]);
  });

  it('stops on release and marks the control touched once', () => {
    const { host, root, advance, touched, timers } = mountHeld();
    pointer(plusOf(root), 'pointerdown');
    advance(500);
    expect(touched).not.toHaveBeenCalled();
    pointer(plusOf(root), 'pointerup');
    expect(touched).toHaveBeenCalledTimes(1);
    const count = host.emitted.length;
    advance(5000);
    expect(host.emitted.length).toBe(count);
    expect(timers()).toBe(0);
    pointer(plusOf(root), 'pointerup');
    expect(touched).toHaveBeenCalledTimes(1);
  });

  it.each(['pointercancel', 'pointerleave'] as const)('stops on %s', (type) => {
    const { host, root, advance, touched } = mountHeld();
    pointer(plusOf(root), 'pointerdown');
    advance(500);
    pointer(plusOf(root), type);
    const count = host.emitted.length;
    advance(3000);
    expect(host.emitted.length).toBe(count);
    expect(touched).toHaveBeenCalledTimes(1);
  });

  it('stops when the pointer moves off the button, but not while it moves on it', () => {
    const { host, root, advance } = mountHeld();
    const button = plusOf(root);
    pointer(button, 'pointerdown');
    pointer(button, 'pointermove');
    advance(480);
    expect(host.emitted.length).toBe(3);
    const rect = button.getBoundingClientRect();
    pointer(button, 'pointermove', { clientX: rect.right + 40, clientY: rect.top + 4 });
    advance(3000);
    expect(host.emitted.length).toBe(3);
  });

  it('does not repeat after the input loses focus', () => {
    const { host, root, advance } = mountHeld();
    inputOf(root).focus();
    pointer(plusOf(root), 'pointerdown');
    advance(480);
    inputOf(root).blur();
    const count = host.emitted.length;
    advance(3000);
    expect(host.emitted.length).toBe(count);
  });

  it('stops at the maximum, disables the button and ends the press', () => {
    const { fixture, host, root, advance, touched, timers } = mountHeld('[max]="3"');
    pointer(plusOf(root), 'pointerdown');
    advance(5000);
    fixture.detectChanges();
    expect(host.emitted).toEqual([1, 2, 3]);
    expect(plusOf(root).disabled).toBe(true);
    expect(timers()).toBe(0);
    expect(touched).toHaveBeenCalledTimes(1);
    pointer(plusOf(root), 'pointerup');
    expect(touched).toHaveBeenCalledTimes(1);
  });

  it('does not overshoot a limit with the five-step repeat', () => {
    const { host, root, advance } = mountHeld('[max]="43"', 0);
    pointer(plusOf(root), 'pointerdown');
    advance(10000);
    expect(host.emitted.at(-1)).toBe(43);
    expect(host.emitted.every((value) => value !== null && value <= 43)).toBe(true);
  });

  it('does nothing when the value is already at the bound', () => {
    const { fixture, host, root, touched, timers } = mountHeld('[max]="5"', 5);
    expect(plusOf(root).disabled).toBe(true);
    pointer(plusOf(root), 'pointerdown');
    fixture.detectChanges();
    expect(host.emitted).toEqual([]);
    expect(timers()).toBe(0);
    expect(touched).not.toHaveBeenCalled();
  });

  it('stops when the control is disabled mid-repeat, without another change', () => {
    const { fixture, host, root, advance, timers } = mountHeld('[disabled]="locked()"');
    pointer(plusOf(root), 'pointerdown');
    advance(500);
    const count = host.emitted.length;
    host.locked.set(true);
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();
    advance(5000);
    expect(host.emitted.length).toBe(count);
    expect(timers()).toBe(0);
  });

  it('stops when the control becomes read-only mid-repeat', () => {
    const { fixture, host, root, advance } = mountHeld('[readonly]="readonly()"');
    pointer(plusOf(root), 'pointerdown');
    advance(500);
    const count = host.emitted.length;
    host.readonly.set(true);
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();
    advance(5000);
    expect(host.emitted.length).toBe(count);
  });

  it('clears its timer when destroyed mid-repeat', () => {
    const { fixture, host, root, advance, timers } = mountHeld();
    pointer(plusOf(root), 'pointerdown');
    advance(500);
    const count = host.emitted.length;
    fixture.destroy();
    expect(timers()).toBe(0);
    advance(5000);
    expect(host.emitted.length).toBe(count);
  });

  it('ignores presses that are not the primary button of the primary pointer', () => {
    const { host, root, advance, timers } = mountHeld();
    pointer(plusOf(root), 'pointerdown', { button: 2 });
    pointer(plusOf(root), 'pointerdown', { isPrimary: false, pointerId: 2 });
    advance(2000);
    expect(host.emitted).toEqual([]);
    expect(timers()).toBe(0);
  });

  it('starts over when pressed again, with one timer at a time', () => {
    const { host, root, advance, timers } = mountHeld();
    pointer(plusOf(root), 'pointerdown');
    pointer(minusOf(root), 'pointerdown');
    expect(timers()).toBe(1);
    advance(400);
    expect(host.emitted).toEqual([1, 0, -1]);
  });

  it('counts the click after a pointer press as the same press, whatever its detail', () => {
    for (const detail of [0, 1, 2]) {
      const { host, root } = mountHeld();
      const button = plusOf(root);
      pointer(button, 'pointerdown');
      pointer(button, 'pointerup');
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail }));
      expect(host.emitted, `detail ${detail}`).toEqual([1]);
      document.body.replaceChildren();
      TestBed.resetTestingModule();
    }
  });

  it('steps once for a click that no pointerdown came before, even with a detail of 1', () => {
    const { host, root, touched, timers } = mountHeld();
    // A synthetic mouse click from a tool or a script reports detail 1 without any pointer.
    plusOf(root).dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(host.emitted).toEqual([1]);
    plusOf(root).click();
    expect(host.emitted).toEqual([1, 2]);
    expect(touched).toHaveBeenCalledTimes(2);
    expect(timers()).toBe(0);
  });

  it('uses the pointer flag once: the press, its click, then a keyboard click each step once', () => {
    const { host, root } = mountHeld();
    const button = plusOf(root);
    pointer(button, 'pointerdown');
    pointer(button, 'pointerup');
    button.click();
    expect(host.emitted).toEqual([1]);
    button.click();
    expect(host.emitted).toEqual([1, 2]);
    button.click();
    expect(host.emitted).toEqual([1, 2, 3]);
  });

  it.each(['pointercancel', 'moved off'])(
    'does not swallow a later click after a press that ended with %s',
    (ending) => {
      const { host, root } = mountHeld();
      const button = plusOf(root);
      pointer(button, 'pointerdown');
      if (ending === 'pointercancel') {
        pointer(button, 'pointercancel');
      } else {
        const box = button.getBoundingClientRect();
        pointer(button, 'pointermove', { clientX: box.right + 40, clientY: box.top + 4 });
      }
      expect(host.emitted).toEqual([1]);
      button.click();
      expect(host.emitted).toEqual([1, 2]);
    },
  );

  it('does not let a press on a disabled button swallow the next click', () => {
    const { host, root, fixture } = mountHeld('[max]="1"', 1);
    pointer(plusOf(root), 'pointerdown');
    expect(host.emitted).toEqual([]);
    fixture.detectChanges();
    minusOf(root).click();
    expect(host.emitted).toEqual([0]);
  });

  it('suppresses the context menu and auxiliary clicks on both buttons', () => {
    const { root } = mountHeld();
    for (const button of [minusOf(root), plusOf(root)]) {
      for (const type of ['contextmenu', 'auxclick']) {
        const event = new MouseEvent(type, { bubbles: true, cancelable: true });
        button.dispatchEvent(event);
        expect(event.defaultPrevented, type).toBe(true);
      }
    }
  });

  it('keeps the browser from taking focus on pointerdown, so a held press cannot blur the input', () => {
    const { root } = mountHeld();
    expect(pointer(plusOf(root), 'pointerdown').defaultPrevented).toBe(true);
  });

  it('repeats from a value typed but not committed', () => {
    const { host, root, advance } = mountHeld();
    inputOf(root).value = '50';
    inputOf(root).dispatchEvent(new Event('input', { bubbles: true }));
    pointer(plusOf(root), 'pointerdown');
    advance(400);
    expect(host.emitted).toEqual([51, 52]);
  });

  describe('ending a hold', () => {
    it('stops when the browser takes the pointer capture away', () => {
      const { host, root, advance, touched, timers } = mountHeld();
      pointer(plusOf(root), 'pointerdown');
      advance(500);
      pointer(plusOf(root), 'lostpointercapture');
      const count = host.emitted.length;
      advance(3000);
      expect(host.emitted.length).toBe(count);
      expect(touched).toHaveBeenCalledTimes(1);
      expect(timers()).toBe(0);
    });

    describe('with a coarse pointer, where the input is not focused during a press', () => {
      beforeEach(() => useCoarsePointer());

      it('leaves focus where it was, and does not focus the input', () => {
        const { root } = mountHeld();
        const outside = document.createElement('button');
        document.body.appendChild(outside);
        outside.focus();
        pointer(plusOf(root), 'pointerdown');
        expect(document.activeElement).toBe(outside);
        expect(document.activeElement).not.toBe(inputOf(root));
        outside.remove();
      });

      it('stops when the window loses focus', () => {
        const { host, root, advance, touched, timers } = mountHeld();
        pointer(plusOf(root), 'pointerdown');
        advance(500);
        const count = host.emitted.length;
        expect(count).toBeGreaterThan(1);
        window.dispatchEvent(new Event('blur'));
        advance(3000);
        expect(host.emitted.length).toBe(count);
        expect(touched).toHaveBeenCalledTimes(1);
        expect(timers()).toBe(0);
      });

      it('stops when the document turns hidden, and not for visibilitychange while visible', () => {
        const { host, root, advance, touched, timers } = mountHeld();
        const state = vi.spyOn(document, 'visibilityState', 'get');
        pointer(plusOf(root), 'pointerdown');
        advance(500);
        state.mockReturnValue('visible');
        document.dispatchEvent(new Event('visibilitychange'));
        advance(80);
        expect(host.emitted.length).toBeGreaterThan(2);
        expect(touched).not.toHaveBeenCalled();
        state.mockReturnValue('hidden');
        document.dispatchEvent(new Event('visibilitychange'));
        const count = host.emitted.length;
        advance(3000);
        expect(host.emitted.length).toBe(count);
        expect(touched).toHaveBeenCalledTimes(1);
        expect(timers()).toBe(0);
        state.mockRestore();
      });

      it('listens only while a press is held, and removes everything on release and on destroy', () => {
        const { fixture, host, root, advance, touched } = mountHeld();
        const added = vi.spyOn(document, 'addEventListener');
        const removed = vi.spyOn(document, 'removeEventListener');
        const windowRemoved = vi.spyOn(window, 'removeEventListener');
        pointer(plusOf(root), 'pointerdown');
        expect(added.mock.calls.filter(([type]) => type === 'visibilitychange')).toHaveLength(1);
        pointer(plusOf(root), 'pointerup');
        expect(removed.mock.calls.filter(([type]) => type === 'visibilitychange')).toHaveLength(1);
        expect(windowRemoved.mock.calls.filter(([type]) => type === 'blur')).toHaveLength(1);
        expect(touched).toHaveBeenCalledTimes(1);
        window.dispatchEvent(new Event('blur'));
        expect(touched).toHaveBeenCalledTimes(1);
        // A second press, then destroy mid-hold.
        pointer(plusOf(root), 'pointerdown');
        advance(500);
        fixture.destroy();
        expect(removed.mock.calls.filter(([type]) => type === 'visibilitychange')).toHaveLength(2);
        expect(windowRemoved.mock.calls.filter(([type]) => type === 'blur')).toHaveLength(2);
        const count = host.emitted.length;
        window.dispatchEvent(new Event('blur'));
        advance(3000);
        expect(host.emitted.length).toBe(count);
      });
    });

    it('stops when focus leaves the input mid-hold, and counts it as one end', () => {
      const { host, root, advance, touched, timers } = mountHeld();
      inputOf(root).focus();
      pointer(plusOf(root), 'pointerdown');
      advance(500);
      inputOf(root).blur();
      expect(touched).toHaveBeenCalledTimes(1);
      const count = host.emitted.length;
      advance(3000);
      expect(host.emitted.length).toBe(count);
      expect(timers()).toBe(0);
    });
  });

  describe('inside a disabled fieldset', () => {
    it('does not step, repeat or arm a timer for a press, which the browser still delivers', () => {
      const { fixture, host, root, advance, touched, timers } = mountHeld('', 0, true);
      host.locked.set(true);
      fixture.detectChanges();
      expect(plusOf(root).matches(':disabled')).toBe(true);
      expect(inputOf(root).matches(':disabled')).toBe(true);
      pointer(plusOf(root), 'pointerdown');
      pointer(minusOf(root), 'pointerdown');
      advance(5000);
      expect(host.emitted).toEqual([]);
      expect(inputOf(root).value).toBe('0');
      expect(touched).not.toHaveBeenCalled();
      expect(timers()).toBe(0);
    });

    it('stops a repeat when the fieldset becomes disabled mid-hold, without another step', () => {
      const { fixture, host, root, advance, timers } = mountHeld('', 0, true);
      pointer(plusOf(root), 'pointerdown');
      advance(500);
      const count = host.emitted.length;
      expect(count).toBeGreaterThan(1);
      host.locked.set(true);
      fixture.detectChanges();
      advance(5000);
      expect(host.emitted.length).toBe(count);
      expect(timers()).toBe(0);
    });

    it('works again once the fieldset is enabled', () => {
      const { fixture, host, root } = mountHeld('', 0, true);
      host.locked.set(true);
      fixture.detectChanges();
      pointer(plusOf(root), 'pointerdown');
      expect(host.emitted).toEqual([]);
      host.locked.set(false);
      fixture.detectChanges();
      pointer(plusOf(root), 'pointerdown');
      expect(host.emitted).toEqual([1]);
    });
  });
});
