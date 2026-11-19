import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../testing/axe';
import { CkIcon, CkIconName } from './icon';

@Component({
  imports: [CkIcon],
  template: `<ck-icon [name]="name()" />`,
})
class Host {
  readonly name = signal<CkIconName>('check');
}

const NAMES: CkIconName[] = [
  'alert-octagon',
  'alert-triangle',
  'check',
  'chevron-down',
  'chevron-end',
  'close',
  'info',
  'minus',
  'plus',
];

describe('CkIcon', () => {
  function render() {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('ck-icon') as HTMLElement;
    return { fixture, icon };
  }

  afterEach(() => {
    document.body.removeAttribute('dir');
    document.body.replaceChildren();
  });

  it.each(NAMES)('renders %s as an aria-hidden svg with a path', (name) => {
    const { fixture, icon } = render();
    fixture.componentInstance.name.set(name);
    fixture.detectChanges();
    expect(icon.classList.contains('ck-icon')).toBe(true);
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.querySelector('svg path')?.getAttribute('d')).toMatch(/^M/);
  });

  it('draws a different shape for every name', () => {
    const { fixture, icon } = render();
    const shapes = new Set<string | null | undefined>();
    for (const name of NAMES) {
      fixture.componentInstance.name.set(name);
      fixture.detectChanges();
      shapes.add(icon.querySelector('path')?.getAttribute('d'));
    }
    expect(shapes.size).toBe(NAMES.length);
  });

  it('renders nothing for a name that does not exist', () => {
    const { fixture, icon } = render();
    fixture.componentInstance.name.set('nope' as CkIconName);
    fixture.detectChanges();
    expect(icon.querySelector('path')?.getAttribute('d')).toBe('');
  });

  it('sizes itself to 1em and falls back when --ck-icon-size is unset', () => {
    const { fixture, icon } = render();
    icon.style.fontSize = '20px';
    fixture.detectChanges();
    expect(getComputedStyle(icon).inlineSize).toBe('20px');
    icon.style.setProperty('--ck-icon-size', '32px');
    expect(getComputedStyle(icon).inlineSize).toBe('32px');
  });

  it('mirrors only chevron-end, and only under dir="rtl"', () => {
    const { fixture, icon } = render();
    fixture.componentInstance.name.set('chevron-end');
    fixture.detectChanges();
    expect(getComputedStyle(icon).transform).toBe('none');
    document.body.dir = 'rtl';
    expect(getComputedStyle(icon).transform).not.toBe('none');
    fixture.componentInstance.name.set('chevron-down');
    fixture.detectChanges();
    expect(getComputedStyle(icon).transform).toBe('none');
  });

  it('has no axe violations', async () => {
    const { fixture } = render();
    for (const name of NAMES) {
      fixture.componentInstance.name.set(name);
      fixture.detectChanges();
      await expectNoAxeViolations(fixture.nativeElement);
    }
  });
});
