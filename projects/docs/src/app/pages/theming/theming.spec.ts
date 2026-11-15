import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CK_CONFIG, CK_DEFAULT_LABELS } from '@ckui/core';
import { expectNoAxeViolations } from '../../../../../core/testing/axe';
import { resetTestTheme, setTestTheme } from '../../testing/theme-env';
import { SAMPLES } from './theming-samples';
import { Theming } from './theming';

describe('Theming', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [Theming],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Theming);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    document.body.replaceChildren();
    resetTestTheme();
  });

  it('has one heading level one and no skipped heading levels', async () => {
    const element = await render();
    expect(element.querySelectorAll('h1')).toHaveLength(1);
    let previous = 1;
    for (const heading of Array.from(element.querySelectorAll('h1, h2, h3'))) {
      const level = Number(heading.tagName.slice(1));
      expect(level - previous).toBeLessThanOrEqual(1);
      previous = level;
    }
  });

  it('renders every code sample as plain text in a pre block', async () => {
    const element = await render();
    const blocks = Array.from(element.querySelectorAll('pre > code'), (code) => code.textContent);
    expect(blocks).toEqual(Object.values(SAMPLES));
    expect(element.querySelectorAll('pre code *')).toHaveLength(0);
  });

  it('lists the real default labels from the library', async () => {
    const element = await render();
    const rows = Array.from(element.querySelectorAll('.label-row'), (row) => [
      row.querySelector('dt')!.textContent!.trim(),
      row.querySelector('dd')!.textContent!.trim(),
    ]);
    expect(rows).toEqual(Object.entries(CK_DEFAULT_LABELS));
  });

  it('documents the real defaults of the library', async () => {
    const element = await render();
    const defaults = TestBed.inject(CK_CONFIG);
    expect(defaults).toEqual({ size: 'md', sheetBreakpoint: 640 });
    expect(element.textContent).toContain("Default 'md'");
    expect(element.textContent).toContain('Default 640');
  });

  it('links to the token reference', async () => {
    const element = await render();
    const link = element.querySelector<HTMLAnchorElement>('a[href="/tokens"]');
    expect(link).not.toBeNull();
  });

  it.each(['light', 'dark'] as const)('has no axe violations in the %s theme', async (theme) => {
    setTestTheme(theme);
    await expectNoAxeViolations(await render());
  });
});
