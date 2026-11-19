import { TestBed } from '@angular/core/testing';
import { userEvent } from 'vitest/browser';
import { vi } from 'vitest';
import { mount, pointer, query, railOf, settle, thumbOf, trackOf } from '../testing/slider-host';

const SLIDER = (attributes = '') =>
  `<ck-slider aria-label="Grade" ${attributes} [value]="value()" (valueChange)="emitted.push($event)" (valueCommit)="commits.push($event)" />`;

const LIVE = (attributes = '') =>
  `<ck-slider aria-label="Grade" ${attributes} [(value)]="value" (valueChange)="emitted.push($event)" (valueCommit)="commits.push($event)" />`;

function hideDocument(): () => void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  return () => Reflect.deleteProperty(document, 'visibilityState');
}

describe('CkSlider pointer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
    document.body.removeAttribute('dir');
    TestBed.resetTestingModule();
  });

  describe('moving the value', () => {
    it('moves to the pointer on a press on the track, focuses the thumb and captures the pointer', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      const capture = vi.spyOn(trackOf(root), 'setPointerCapture');
      const event = pointer(trackOf(root), 'pointerdown', { at: 0.25 });
      await settle(fixture);
      expect(host.emitted).toEqual([25]);
      expect(document.activeElement).toBe(thumbOf(root));
      expect(capture).toHaveBeenCalledWith(1);
      expect(event.defaultPrevented).toBe(true);
      expect(query(root, 'ck-slider').classList.contains('ck-slider--pressing')).toBe(true);
    });

    it('moves to the pointer on a press on the thumb or the rail as well', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      pointer(thumbOf(root), 'pointerdown', { at: 0.75 });
      pointer(thumbOf(root), 'pointerup', { at: 0.75 });
      pointer(railOf(root), 'pointerdown', { at: 0.1 });
      await settle(fixture);
      expect(host.emitted).toEqual([75, 10]);
    });

    it('follows the pointer while it is down, and lets go when it is up', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.1 });
      pointer(trackOf(root), 'pointermove', { at: 0.5 });
      pointer(trackOf(root), 'pointermove', { at: 0.9 });
      pointer(trackOf(root), 'pointerup', { at: 0.9 });
      pointer(trackOf(root), 'pointermove', { at: 0.2 });
      await settle(fixture);
      expect(host.emitted).toEqual([10, 50, 90]);
      expect(query(root, 'ck-slider').classList.contains('ck-slider--pressing')).toBe(false);
    });

    it('ignores a move with no press, and a move of another pointer', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      pointer(trackOf(root), 'pointermove', { at: 0.9 });
      pointer(trackOf(root), 'pointerdown', { at: 0.2 });
      pointer(trackOf(root), 'pointermove', { at: 0.9, pointerId: 2, isPrimary: false });
      pointer(trackOf(root), 'pointerup', { at: 0.9, pointerId: 2, isPrimary: false });
      await settle(fixture);
      expect(host.emitted).toEqual([20]);
      expect(query(root, 'ck-slider').classList.contains('ck-slider--pressing')).toBe(true);
      pointer(trackOf(root), 'pointerup', { at: 0.2 });
      expect(host.commits).toEqual([20]);
    });

    it('clamps a pointer beyond either end and snaps to the step', async () => {
      const { fixture, host, root } = mount(SLIDER('[step]="5" [min]="10" [max]="60"'));
      await settle(fixture);
      const rect = railOf(root).getBoundingClientRect();
      pointer(trackOf(root), 'pointerdown', { clientX: rect.left - 300 });
      pointer(trackOf(root), 'pointermove', { clientX: rect.right + 300 });
      pointer(trackOf(root), 'pointermove', { at: 0.27 });
      await settle(fixture);
      expect(host.emitted).toEqual([10, 60, 25]);
    });

    it('lands on a decimal step exactly', async () => {
      const { fixture, host, root } = mount(SLIDER('[min]="0" [max]="1" [step]="0.1"'));
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.3 });
      await settle(fixture);
      expect(host.emitted).toEqual([0.3]);
    });

    it('measures from the inner edge of the rail, with a sub-pixel box', async () => {
      const { fixture, host, root } = mount(
        `<div style="padding-inline-start: 0.4px">${SLIDER('[min]="0" [max]="1000"')}</div>`,
      );
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.5 });
      await settle(fixture);
      expect(Math.abs((host.emitted[0] ?? 0) - 500)).toBeLessThanOrEqual(2);
    });

    it('starts from no value: a press writes the value under the pointer', async () => {
      const { fixture, host, root } = mount(SLIDER('[min]="-10" [max]="10"'), (testHost) =>
        testHost.value.set(null),
      );
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.5 });
      pointer(trackOf(root), 'pointerup', { at: 0.5 });
      await settle(fixture);
      expect(host.emitted).toEqual([0]);
      expect(host.commits).toEqual([0]);
    });

    it('does not move when min is above max', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, host, root } = mount(SLIDER('[min]="5" [max]="1"'), (testHost) =>
        testHost.value.set(5),
      );
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.9 });
      pointer(trackOf(root), 'pointerup', { at: 0.9 });
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      expect(host.commits).toEqual([]);
    });

    it('runs from the right in right-to-left text', async () => {
      const { fixture, host, root } = mount(`<div dir="rtl">${SLIDER()}</div>`);
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.25 });
      pointer(trackOf(root), 'pointermove', { at: 0.9 });
      await settle(fixture);
      expect(host.emitted).toEqual([75, 10]);
    });
  });

  describe('presses it must ignore', () => {
    it.each([
      ['a secondary pointer', { isPrimary: false }],
      ['the middle button', { button: 1 }],
      ['the right button', { button: 2 }],
    ])('ignores %s', async (_name, init) => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      const capture = vi.spyOn(trackOf(root), 'setPointerCapture');
      const event = pointer(trackOf(root), 'pointerdown', { at: 0.25, ...init });
      pointer(trackOf(root), 'pointermove', { at: 0.5 });
      pointer(trackOf(root), 'pointerup', { at: 0.5 });
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      expect(host.commits).toEqual([]);
      expect(capture).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).not.toBe(thumbOf(root));
    });

    it('does nothing while disabled by the input, the form, or a fieldset around it', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" disabled [value]="50" (valueChange)="emitted.push($event)" (valueCommit)="commits.push($event)" />
         <ck-slider aria-label="B" [formControl]="control" (valueChange)="emitted.push($event)" (valueCommit)="commits.push($event)" />
         <fieldset [disabled]="locked()"><ck-slider aria-label="C" [value]="50" (valueChange)="emitted.push($event)" (valueCommit)="commits.push($event)" /></fieldset>`,
        (testHost) => {
          testHost.control.disable();
          testHost.locked.set(true);
        },
      );
      await settle(fixture);
      // The form writes its own value into the slider, which reports it as a valueChange.
      host.emitted.length = 0;
      for (const index of [0, 1, 2]) {
        const capture = vi.spyOn(trackOf(root, index), 'setPointerCapture');
        const event = pointer(trackOf(root, index), 'pointerdown', { at: 0.25 });
        pointer(trackOf(root, index), 'pointermove', { at: 0.5 });
        pointer(trackOf(root, index), 'pointerup', { at: 0.5 });
        expect(capture).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(false);
      }
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      expect(host.commits).toEqual([]);
      expect(root.querySelectorAll('ck-slider')[2].closest('fieldset')!.matches(':disabled')).toBe(
        true,
      );
      host.locked.set(false);
      await settle(fixture);
      pointer(trackOf(root, 2), 'pointerdown', { at: 0.25 });
      expect(host.emitted).toEqual([25]);
    });

    it('is greyed out inside a disabled fieldset', async () => {
      const { fixture, root } = mount(
        `<fieldset disabled>${SLIDER()}</fieldset>${SLIDER()}`,
        undefined,
        undefined,
        '--ck-color-fg-disabled:rgb(150, 150, 160);--ck-color-fg:rgb(20, 20, 30)',
      );
      await settle(fixture);
      const fills = root.querySelectorAll<HTMLElement>('.ck-slider__fill');
      expect(getComputedStyle(fills[0]).backgroundColor).toBe('rgb(150, 150, 160)');
      expect(getComputedStyle(trackOf(root, 0)).cursor).toBe('not-allowed');
      expect(getComputedStyle(trackOf(root, 1)).cursor).toBe('pointer');
    });
  });

  describe('touch', () => {
    it('lets a vertical swipe scroll: a press alone moves nothing, a cancel reports nothing', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.25, pointerType: 'touch' });
      expect(host.emitted).toEqual([]);
      pointer(trackOf(root), 'pointercancel', { at: 0.25, pointerType: 'touch' });
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      expect(host.commits).toEqual([]);
      expect(query(root, 'ck-slider').classList.contains('ck-slider--pressing')).toBe(false);
    });

    it('moves on the first move, follows the finger and commits on lift', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.1, pointerType: 'touch' });
      pointer(trackOf(root), 'pointermove', { at: 0.3, pointerType: 'touch' });
      pointer(trackOf(root), 'pointermove', { at: 0.6, pointerType: 'touch' });
      pointer(trackOf(root), 'pointerup', { at: 0.6, pointerType: 'touch' });
      await settle(fixture);
      expect(host.emitted).toEqual([30, 60]);
      expect(host.commits).toEqual([60]);
    });

    it('moves to the tap on lift, and commits once', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.8, pointerType: 'touch' });
      pointer(trackOf(root), 'pointerup', { at: 0.8, pointerType: 'touch' });
      await settle(fixture);
      expect(host.emitted).toEqual([80]);
      expect(host.commits).toEqual([80]);
    });

    it('puts a value back when the browser takes the gesture after the finger moved it', async () => {
      const { fixture, host, root } = mount(LIVE());
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.1, pointerType: 'touch' });
      pointer(trackOf(root), 'pointermove', { at: 0.3, pointerType: 'touch' });
      pointer(trackOf(root), 'pointercancel', { at: 0.3, pointerType: 'touch' });
      await settle(fixture);
      expect(host.value()).toBe(50);
      expect(host.emitted).toEqual([30, 50]);
      expect(host.commits).toEqual([]);
    });

    it('takes touch-action pan-y so a vertical swipe on the track scrolls the page', async () => {
      const { fixture, root } = mount(SLIDER());
      await settle(fixture);
      expect(getComputedStyle(trackOf(root)).touchAction).toBe('pan-y');
    });
  });

  describe('valueCommit from the pointer', () => {
    it('fires once, with the final value, on release after a drag', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.1 });
      pointer(trackOf(root), 'pointermove', { at: 0.4 });
      pointer(trackOf(root), 'pointermove', { at: 0.7 });
      expect(host.commits).toEqual([]);
      pointer(trackOf(root), 'pointerup', { at: 0.7 });
      await settle(fixture);
      expect(host.commits).toEqual([70]);
      expect(host.emitted).toEqual([10, 40, 70]);
    });

    it('fires once for a tap on the track', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.2 });
      pointer(trackOf(root), 'pointerup', { at: 0.2 });
      pointer(trackOf(root), 'lostpointercapture', { at: 0.2 });
      await settle(fixture);
      expect(host.commits).toEqual([20]);
    });

    it('fires on lostpointercapture alone', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.2 });
      pointer(trackOf(root), 'pointermove', { at: 0.6 });
      pointer(trackOf(root), 'lostpointercapture', { at: 0.6 });
      pointer(trackOf(root), 'pointerup', { at: 0.6 });
      await settle(fixture);
      expect(host.commits).toEqual([60]);
    });

    it('does not fire for a press that changes nothing', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.5 });
      pointer(trackOf(root), 'pointerup', { at: 0.5 });
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      expect(host.commits).toEqual([]);
    });

    it('does not fire when the drag ends where it started', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.5 });
      pointer(trackOf(root), 'pointermove', { at: 0.9 });
      pointer(trackOf(root), 'pointermove', { at: 0.5 });
      pointer(trackOf(root), 'pointerup', { at: 0.5 });
      await settle(fixture);
      expect(host.emitted).toEqual([90, 50]);
      expect(host.commits).toEqual([]);
    });

    it('puts a mouse gesture that the browser cancels back, and fires nothing', async () => {
      const { fixture, host, root } = mount(LIVE());
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.2 });
      pointer(trackOf(root), 'pointermove', { at: 0.8 });
      pointer(trackOf(root), 'pointercancel', { at: 0.8 });
      pointer(trackOf(root), 'lostpointercapture', { at: 0.8 });
      await settle(fixture);
      expect(host.value()).toBe(50);
      expect(host.commits).toEqual([]);
    });

    it('fires when focus leaves during a drag, and not again on release', async () => {
      const { fixture, host, root } = mount(`${SLIDER()}<button id="after">After</button>`);
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.3 });
      query(root, '#after').focus();
      expect(host.commits).toEqual([30]);
      pointer(trackOf(root), 'pointerup', { at: 0.3 });
      expect(host.commits).toEqual([30]);
    });

    it('fires when the document turns hidden during a drag', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.3 });
      const restore = hideDocument();
      document.dispatchEvent(new Event('visibilitychange'));
      restore();
      expect(host.commits).toEqual([30]);
      pointer(trackOf(root), 'pointermove', { at: 0.9 });
      expect(host.emitted).toEqual([30]);
    });

    it('ends the drag when the slider gets disabled, once', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [disabled]="locked()" [(value)]="value" (valueCommit)="commits.push($event)" />`,
      );
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.3 });
      host.locked.set(true);
      await settle(fixture);
      expect(host.commits).toEqual([30]);
      pointer(trackOf(root), 'pointermove', { at: 0.9 });
      pointer(trackOf(root), 'pointerup', { at: 0.9 });
      expect(host.value()).toBe(30);
      expect(host.commits).toEqual([30]);
    });

    it('does not fire, and listens to nothing, after it is destroyed mid-drag', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      const track = trackOf(root);
      pointer(track, 'pointerdown', { at: 0.3 });
      fixture.destroy();
      const restore = hideDocument();
      document.dispatchEvent(new Event('visibilitychange'));
      restore();
      pointer(track, 'pointerup', { at: 0.3 });
      expect(host.commits).toEqual([]);
    });

    it('starts a new change with each press', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.2 });
      pointer(trackOf(root), 'pointerup', { at: 0.2 });
      pointer(trackOf(root), 'pointerdown', { at: 0.2 });
      pointer(trackOf(root), 'pointerup', { at: 0.2 });
      pointer(trackOf(root), 'pointerdown', { at: 0.6 });
      pointer(trackOf(root), 'pointerup', { at: 0.6 });
      expect(host.commits).toEqual([20, 60]);
    });

    it('ends a press that never got its release when the next press starts', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.2 });
      pointer(trackOf(root), 'pointerdown', { at: 0.6 });
      expect(host.commits).toEqual([20]);
      pointer(trackOf(root), 'pointerup', { at: 0.6 });
      expect(host.commits).toEqual([20, 60]);
    });

    it('ends a keyboard change that is still down when a press starts', async () => {
      const { fixture, host, root } = mount(LIVE());
      await settle(fixture);
      thumbOf(root).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      pointer(trackOf(root), 'pointerdown', { at: 0.8 });
      expect(host.commits).toEqual([51]);
      pointer(trackOf(root), 'pointerup', { at: 0.8 });
      expect(host.commits).toEqual([51, 80]);
    });

    it('never fires for a value the form writes while a drag is on', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [formControl]="control" (valueCommit)="commits.push($event)" />`,
      );
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.3 });
      pointer(trackOf(root), 'pointerup', { at: 0.3 });
      expect(host.commits).toEqual([30]);
      host.control.setValue(90);
      await settle(fixture);
      expect(host.commits).toEqual([30]);
    });
  });

  describe('with a real mouse', () => {
    it('focuses the thumb and keeps the value for a click on the thumb', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      await userEvent.click(thumbOf(root));
      await settle(fixture);
      expect(document.activeElement).toBe(thumbOf(root));
      expect(host.commits).toEqual([]);
    });

    it('marks the control touched when focus leaves after a click', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [formControl]="control" /><button id="after">After</button>`,
      );
      await settle(fixture);
      await userEvent.click(thumbOf(root));
      expect(host.control.touched).toBe(false);
      query(root, '#after').focus();
      expect(host.control.touched).toBe(true);
    });
  });

  describe('context menu', () => {
    it('is suppressed during a press and left alone otherwise', async () => {
      const { fixture, root } = mount(SLIDER());
      await settle(fixture);
      const menu = () => new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      const before = menu();
      trackOf(root).dispatchEvent(before);
      expect(before.defaultPrevented).toBe(false);
      pointer(trackOf(root), 'pointerdown', { at: 0.3 });
      const during = menu();
      trackOf(root).dispatchEvent(during);
      expect(during.defaultPrevented).toBe(true);
      pointer(trackOf(root), 'pointerup', { at: 0.3 });
    });
  });
});
