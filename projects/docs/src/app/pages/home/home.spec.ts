import { TestBed } from '@angular/core/testing';
import { CK_SIZES } from '@ckui/core';
import { expectNoAxeViolations } from '../../../../../core/testing/axe';
import { Home } from './home';

describe('Home', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({ imports: [Home] }).compileComponents();
    const fixture = TestBed.createComponent(Home);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => document.body.replaceChildren());

  it('shows one heading level one and every size from the library', async () => {
    const element = await render();
    expect(element.querySelectorAll('h1')).toHaveLength(1);
    const items = Array.from(element.querySelectorAll('.sizes li'), (item) => item.textContent);
    expect(items).toEqual([...CK_SIZES]);
  });

  it('has no axe violations', async () => {
    await expectNoAxeViolations(await render());
  });
});
