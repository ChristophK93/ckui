import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule, NgModel, Validators } from '@angular/forms';
import { FormField, disabled, form } from '@angular/forms/signals';
import { CkValueControl, provideCkValueAccessor } from './value-control';

type Value = string | null;

/** Records every call the forms API makes, so double writes and echoes show up. */
@Component({
  selector: 'ck-test-control',
  providers: [provideCkValueAccessor(TestControl)],
  host: { '(blur)': 'markTouched()' },
  template: `<button type="button" (click)="choose('a')">a</button>
    <button type="button" (click)="choose('b')">b</button>
    <span class="disabled">{{ isDisabled() }}</span>`,
})
class TestControl extends CkValueControl<Value> {
  readonly changes: Value[] = [];
  readonly writes: Value[] = [];
  readonly touches: number[] = [];

  choose(next: Value): void {
    this.commit(next);
  }

  touch(): void {
    this.markTouched();
  }

  readonly disabledNow = () => this.isDisabled();

  override writeValue(value: Value): void {
    this.writes.push(value);
    super.writeValue(value);
  }

  override registerOnChange(onChange: (value: Value) => void): void {
    super.registerOnChange((value) => {
      this.changes.push(value);
      onChange(value);
    });
  }

  override registerOnTouched(onTouched: () => void): void {
    super.registerOnTouched(() => {
      this.touches.push(1);
      onTouched();
    });
  }
}

@Component({
  imports: [TestControl, ReactiveFormsModule],
  template: `<ck-test-control [formControl]="control" />`,
})
class ReactiveHost {
  readonly control = new FormControl<Value>('a');
  readonly target = viewChild.required(TestControl);
}

@Component({
  imports: [TestControl, FormsModule],
  template: `<ck-test-control
    [disabled]="locked()"
    [ngModel]="model()"
    (ngModelChange)="model.set($event)"
    #binding="ngModel"
  />`,
})
class NgModelHost {
  readonly model = signal<Value>('a');
  readonly locked = signal(false);
  readonly target = viewChild.required(TestControl);
  readonly binding = viewChild.required<NgModel>('binding');
}

@Component({
  imports: [TestControl, FormField],
  template: `<ck-test-control [formField]="tree" />`,
})
class SignalHost {
  readonly model = signal<{ choice: Value }>({ choice: 'a' });
  readonly locked = signal(false);
  readonly tree = form(this.model, (path) => {
    disabled(path.choice, () => this.locked());
  }).choice;
  readonly target = viewChild.required(TestControl);
}

@Component({
  imports: [TestControl],
  template: `<ck-test-control [(value)]="value" [disabled]="disabled()" />`,
})
class StandaloneHost {
  readonly value = signal<Value>('a');
  readonly disabled = signal(false);
  readonly target = viewChild.required(TestControl);
}

async function mount<T extends { target: () => TestControl }>(
  host: new () => T,
): Promise<{ fixture: ComponentFixture<T>; control: TestControl; element: HTMLElement }> {
  const fixture = TestBed.createComponent(host);
  document.body.appendChild(fixture.nativeElement);
  await fixture.whenStable();
  const control = fixture.componentInstance.target();
  return { fixture, control, element: fixture.nativeElement as HTMLElement };
}

function click(element: HTMLElement, label: string): void {
  Array.from(element.querySelectorAll('button'))
    .find((button) => button.textContent === label)!
    .click();
}

describe('CkValueControl', () => {
  afterEach(() => document.body.replaceChildren());

  describe('Reactive Forms', () => {
    it('shows the initial value without calling onChange', async () => {
      const { control } = await mount(ReactiveHost);
      expect(control.value()).toBe('a');
      expect(control.changes).toEqual([]);
    });

    it('takes programmatic writes without calling onChange', async () => {
      const { fixture, control } = await mount(ReactiveHost);
      const emitted: Value[] = [];
      fixture.componentInstance.control.valueChanges.subscribe((value) => emitted.push(value));
      fixture.componentInstance.control.setValue('b');
      fixture.componentInstance.control.reset();
      fixture.componentInstance.control.patchValue('a');
      expect(control.value()).toBe('a');
      expect(control.changes).toEqual([]);
      expect(emitted).toEqual(['b', null, 'a']);
      expect(fixture.componentInstance.control.dirty).toBe(false);
    });

    it('writes a user change to the control once and does not echo it back', async () => {
      const { fixture, control, element } = await mount(ReactiveHost);
      const writesBefore = control.writes.length;
      click(element, 'b');
      expect(fixture.componentInstance.control.value).toBe('b');
      expect(fixture.componentInstance.control.dirty).toBe(true);
      expect(control.changes).toEqual(['b']);
      expect(control.writes.length).toBe(writesBefore);
    });

    it('does not call onChange when the user picks the value it already has', async () => {
      const { control, element } = await mount(ReactiveHost);
      click(element, 'a');
      expect(control.changes).toEqual([]);
    });

    it('is disabled by control.disable() and enabled again by control.enable()', async () => {
      const { fixture, control, element } = await mount(ReactiveHost);
      fixture.componentInstance.control.disable();
      expect(control.disabledNow()).toBe(true);
      click(element, 'b');
      expect(control.changes).toEqual([]);
      expect(fixture.componentInstance.control.value).toBe('a');
      fixture.componentInstance.control.enable();
      expect(control.disabledNow()).toBe(false);
      click(element, 'b');
      expect(control.changes).toEqual(['b']);
    });

    it('marks the control touched through markTouched', async () => {
      const { fixture, control } = await mount(ReactiveHost);
      expect(fixture.componentInstance.control.touched).toBe(false);
      control.touch();
      expect(fixture.componentInstance.control.touched).toBe(true);
      expect(control.touched()).toBe(true);
    });

    it('does not touch the control on programmatic writes', async () => {
      const { fixture, control } = await mount(ReactiveHost);
      fixture.componentInstance.control.setValue('b');
      expect(control.touches).toEqual([]);
      expect(fixture.componentInstance.control.touched).toBe(false);
    });

    it('accepts null and undefined writes', async () => {
      const { fixture, control } = await mount(ReactiveHost);
      fixture.componentInstance.control.setValue(null);
      expect(control.value()).toBeNull();
      fixture.componentInstance.control.setValue(undefined as unknown as Value);
      expect(control.value()).toBeUndefined();
      expect(control.changes).toEqual([]);
    });

    it('validates through the forms API (required)', async () => {
      const { fixture, element } = await mount(ReactiveHost);
      fixture.componentInstance.control.addValidators(Validators.required);
      fixture.componentInstance.control.setValue(null);
      expect(fixture.componentInstance.control.invalid).toBe(true);
      click(element, 'a');
      expect(fixture.componentInstance.control.valid).toBe(true);
    });
  });

  describe('ngModel', () => {
    it('shows the initial model value without calling onChange', async () => {
      const { fixture, control } = await mount(NgModelHost);
      await fixture.whenStable();
      expect(control.value()).toBe('a');
      expect(control.changes).toEqual([]);
    });

    it('takes model writes without calling onChange', async () => {
      const { fixture, control } = await mount(NgModelHost);
      fixture.componentInstance.model.set('b');
      await fixture.whenStable();
      expect(control.value()).toBe('b');
      expect(control.changes).toEqual([]);
    });

    it('updates the model once on a user change', async () => {
      const { fixture, control, element } = await mount(NgModelHost);
      click(element, 'b');
      expect(fixture.componentInstance.model()).toBe('b');
      expect(control.changes).toEqual(['b']);
    });

    it('follows [disabled] next to ngModel and ignores user changes while it is set', async () => {
      const { fixture, control, element } = await mount(NgModelHost);
      expect(control.disabledNow()).toBe(false);
      fixture.componentInstance.locked.set(true);
      await fixture.whenStable();
      expect(control.disabledNow()).toBe(true);
      expect(fixture.componentInstance.binding().control.disabled).toBe(true);
      click(element, 'b');
      expect(fixture.componentInstance.model()).toBe('a');
      fixture.componentInstance.locked.set(false);
      await fixture.whenStable();
      expect(control.disabledNow()).toBe(false);
      expect(fixture.componentInstance.binding().control.disabled).toBe(false);
      click(element, 'b');
      expect(fixture.componentInstance.model()).toBe('b');
    });

    it('follows control.disable() on the ngModel control', async () => {
      const { fixture, control } = await mount(NgModelHost);
      fixture.componentInstance.binding().control.disable();
      expect(control.disabledNow()).toBe(true);
      fixture.componentInstance.binding().control.enable();
      expect(control.disabledNow()).toBe(false);
    });
  });

  describe('Signal Forms', () => {
    it('shows the initial field value without calling onChange', async () => {
      const { control } = await mount(SignalHost);
      expect(control.value()).toBe('a');
      expect(control.changes).toEqual([]);
    });

    it('goes through the value accessor only, and writes each programmatic change once', async () => {
      const { fixture, control } = await mount(SignalHost);
      const writesBefore = control.writes.length;
      fixture.componentInstance.model.set({ choice: 'b' });
      await fixture.whenStable();
      expect(control.value()).toBe('b');
      expect(control.writes.length).toBe(writesBefore + 1);
      expect(control.changes).toEqual([]);
    });

    it('updates the field once on a user change and does not echo it back', async () => {
      const { fixture, control, element } = await mount(SignalHost);
      const writesBefore = control.writes.length;
      click(element, 'b');
      await fixture.whenStable();
      expect(fixture.componentInstance.model().choice).toBe('b');
      expect(control.changes).toEqual(['b']);
      expect(control.writes.length).toBe(writesBefore);
      expect(fixture.componentInstance.tree().dirty()).toBe(true);
    });

    it('marks the field touched', async () => {
      const { fixture, control } = await mount(SignalHost);
      expect(fixture.componentInstance.tree().touched()).toBe(false);
      control.touch();
      expect(fixture.componentInstance.tree().touched()).toBe(true);
    });

    it('is disabled while the field is disabled and ignores user changes then', async () => {
      const { fixture, control, element } = await mount(SignalHost);
      expect(control.disabledNow()).toBe(false);
      fixture.componentInstance.locked.set(true);
      await fixture.whenStable();
      expect(control.disabledNow()).toBe(true);
      click(element, 'b');
      expect(fixture.componentInstance.model().choice).toBe('a');
      fixture.componentInstance.locked.set(false);
      await fixture.whenStable();
      expect(control.disabledNow()).toBe(false);
      click(element, 'b');
      expect(fixture.componentInstance.model().choice).toBe('b');
    });
  });

  describe('value model and disabled input', () => {
    it('follows [(value)] and reports user changes through the model', async () => {
      const { fixture, control, element } = await mount(StandaloneHost);
      expect(control.value()).toBe('a');
      fixture.componentInstance.value.set('b');
      await fixture.whenStable();
      expect(control.value()).toBe('b');
      click(element, 'a');
      expect(fixture.componentInstance.value()).toBe('a');
    });

    it('ignores user changes while the disabled input is set', async () => {
      const { fixture, control, element } = await mount(StandaloneHost);
      fixture.componentInstance.disabled.set(true);
      await fixture.whenStable();
      expect(control.disabledNow()).toBe(true);
      click(element, 'b');
      expect(fixture.componentInstance.value()).toBe('a');
    });

    it('stays disabled while either source says so', async () => {
      const { fixture, control } = await mount(StandaloneHost);
      fixture.componentInstance.disabled.set(true);
      control.setDisabledState(true);
      await fixture.whenStable();
      control.setDisabledState(false);
      expect(control.disabledNow()).toBe(true);
      fixture.componentInstance.disabled.set(false);
      await fixture.whenStable();
      expect(control.disabledNow()).toBe(false);
      control.setDisabledState(true);
      expect(control.disabledNow()).toBe(true);
    });

    it('reads a bare disabled attribute as true', async () => {
      TestBed.overrideComponent(StandaloneHost, {
        set: { template: `<ck-test-control disabled />` },
      });
      const { control } = await mount(StandaloneHost);
      expect(control.disabledNow()).toBe(true);
    });

    it('does nothing when markTouched runs without a registered callback', async () => {
      const fixture = TestBed.createComponent(TestControl);
      expect(() => fixture.componentInstance.touch()).not.toThrow();
      expect(fixture.componentInstance.touched()).toBe(true);
      expect(() => fixture.componentInstance.choose('b')).not.toThrow();
      expect(fixture.componentInstance.value()).toBe('b');
    });
  });
});
