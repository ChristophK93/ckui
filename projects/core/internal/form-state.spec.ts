import {
  ApplicationRef,
  Component,
  Directive,
  Injector,
  PLATFORM_ID,
  afterEveryRender,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ControlContainer,
  FormControl,
  FormGroup,
  FormGroupDirective,
  FormsModule,
  NgControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FormField, form, required } from '@angular/forms/signals';
import { CkFormState, lazyNgControl } from './form-state';

@Directive({ selector: '[ckProbe]', exportAs: 'ckProbe' })
class Probe {
  private readonly lookup = lazyNgControl(inject(Injector));
  private readonly container = inject(ControlContainer, { optional: true });
  readonly state = new CkFormState({ control: this.lookup, container: () => this.container });
  readonly found = () => this.lookup();

  constructor() {
    effect(() => this.state.refresh());
    afterEveryRender(() => this.state.refresh());
  }
}

@Component({
  imports: [Probe, ReactiveFormsModule, FormsModule, FormField],
  template: `
    <input ckProbe [formControl]="control" />
    <input ckProbe [ngModel]="model()" required />
    <input ckProbe [formField]="signalForm.name" />
    <input ckProbe />
  `,
})
class Host {
  readonly control = new FormControl('', Validators.required);
  readonly model = signal('');
  readonly signalModel = signal({ name: '' });
  readonly signalForm = form(this.signalModel, (path) => required(path.name));
  readonly group = new FormGroup({ name: new FormControl('', Validators.required) });
}

function mount(template?: string): { fixture: ComponentFixture<Host>; root: HTMLElement } {
  if (template) {
    TestBed.overrideComponent(Host, { set: { template } });
  }
  const fixture = TestBed.createComponent(Host);
  const root = fixture.nativeElement as HTMLElement;
  document.body.appendChild(root);
  fixture.detectChanges();
  return { fixture, root };
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
  TestBed.inject(ApplicationRef).tick();
}

const probes = (fixture: ComponentFixture<unknown>): Probe[] =>
  fixture.debugElement
    .queryAll((node) => !!node.injector.get(Probe, null))
    .map((node) => node.injector.get(Probe));

describe('CkFormState', () => {
  afterEach(() => {
    document.body.replaceChildren();
    TestBed.resetTestingModule();
  });

  it('reads invalid, touched and disabled from Reactive Forms as they change', async () => {
    const { fixture } = mount();
    await settle(fixture);
    const [reactive] = probes(fixture);
    const control = fixture.componentInstance.control;
    expect(reactive.state.invalid()).toBe(true);
    expect(reactive.state.touched()).toBe(false);
    control.markAsTouched();
    expect(reactive.state.touched()).toBe(true);
    control.setValue('x');
    expect(reactive.state.invalid()).toBe(false);
    control.disable();
    expect(reactive.state.disabled()).toBe(true);
    control.enable();
    control.markAsUntouched();
    expect(reactive.state.touched()).toBe(false);
  });

  it('reads the state of ngModel, including its required attribute', async () => {
    const { fixture, root } = mount();
    await settle(fixture);
    const model = probes(fixture)[1];
    expect(model.state.invalid()).toBe(true);
    root.querySelectorAll('input')[1].dispatchEvent(new Event('blur'));
    await settle(fixture);
    fixture.componentInstance.model.set('typed');
    await settle(fixture);
    expect(model.state.invalid()).toBe(false);
  });

  it('reads the state of Signal Forms through signals', async () => {
    const { fixture } = mount();
    await settle(fixture);
    const signalProbe = probes(fixture)[2];
    const field = fixture.componentInstance.signalForm.name;
    expect(signalProbe.state.invalid()).toBe(true);
    expect(signalProbe.state.touched()).toBe(false);
    field().markAsTouched();
    await settle(fixture);
    expect(signalProbe.state.touched()).toBe(true);
    fixture.componentInstance.signalModel.set({ name: 'filled' });
    await settle(fixture);
    expect(signalProbe.state.invalid()).toBe(false);
  });

  it('is all false without a forms API, and finds no control', async () => {
    const { fixture } = mount();
    await settle(fixture);
    const plain = probes(fixture)[3];
    expect(plain.found()).toBeNull();
    expect([
      plain.state.invalid(),
      plain.state.touched(),
      plain.state.submitted(),
      plain.state.disabled(),
    ]).toEqual([false, false, false, false]);
  });

  it('knows when the surrounding form was submitted', async () => {
    const { fixture, root } = mount(
      '<form [formGroup]="group"><input ckProbe formControlName="name" /></form>',
    );
    await settle(fixture);
    const probe = probes(fixture)[0];
    expect(probe.state.submitted()).toBe(false);
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect(probe.state.submitted()).toBe(true);
    fixture.debugElement
      .query((node) => node.name === 'form')
      .injector.get(FormGroupDirective)
      .resetForm();
    await settle(fixture);
    expect(probe.state.submitted()).toBe(false);
  });

  it('follows a control that is swapped for another one', async () => {
    const { fixture } = mount('<input ckProbe [formControl]="control" />');
    await settle(fixture);
    const probe = probes(fixture)[0];
    expect(probe.state.invalid()).toBe(true);
    const replacement = new FormControl('ok', Validators.required);
    replacement.markAsTouched();
    (probe.found() as NgControl & { form: FormControl }).form = replacement;
    probe.state.refresh();
    expect(probe.state.invalid()).toBe(false);
    expect(probe.state.touched()).toBe(true);
    // The old control no longer drives the state.
    fixture.componentInstance.control.markAsUntouched();
    fixture.componentInstance.control.setValue('');
    expect(probe.state.invalid()).toBe(false);
    replacement.setValue('');
    expect(probe.state.invalid()).toBe(true);
  });

  it('stops listening after release', async () => {
    const { fixture } = mount('<input ckProbe [formControl]="control" />');
    await settle(fixture);
    const probe = probes(fixture)[0];
    probe.state.release();
    fixture.componentInstance.control.setValue('changed');
    expect(probe.state.invalid()).toBe(true);
  });

  it('resolves the control once, also when there is none', async () => {
    const { fixture } = mount('<input ckProbe />');
    await settle(fixture);
    const probe = probes(fixture)[0];
    expect(probe.found()).toBeNull();
    expect(probe.found()).toBeNull();
  });

  it('does not touch the control on the server before refresh is called', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const fixture = TestBed.createComponent(Host);
    expect(() => fixture.detectChanges()).not.toThrow();
  });
});
