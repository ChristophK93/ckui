import { hasAccessibleName } from './accessible-name';

function make(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.querySelector('[data-target]')!;
}

describe('hasAccessibleName', () => {
  afterEach(() => document.body.replaceChildren());
  const all = { title: true, text: true, labels: true };

  it.each([
    ['aria-label', '<div data-target aria-label="x"></div>'],
    ['title', '<div data-target title="x"></div>'],
    ['text', '<div data-target>x</div>'],
    ['nested text', '<div data-target><b>x</b></div>'],
    ['aria-labelledby', '<i id="n">x</i><div data-target aria-labelledby="n"></div>'],
    ['a label', '<label for="f">x</label><input id="f" data-target />'],
  ])('accepts %s', (_name, html) => {
    expect(hasAccessibleName(make(html), all)).toBe(true);
  });

  it.each([
    ['nothing', '<div data-target></div>'],
    ['a blank aria-label', '<div data-target aria-label=" "></div>'],
    ['aria-hidden text', '<div data-target><span aria-hidden="true">x</span></div>'],
    ['hidden text', '<div data-target><span hidden>x</span></div>'],
    ['a missing labelledby id', '<div data-target aria-labelledby="nope"></div>'],
    ['an empty labelledby target', '<i id="e"></i><div data-target aria-labelledby="e"></div>'],
    ['an empty label', '<label for="f"></label><input id="f" data-target />'],
  ])('rejects %s', (_name, html) => {
    expect(hasAccessibleName(make(html), all)).toBe(false);
  });

  it('ignores the sources that are switched off', () => {
    expect(
      hasAccessibleName(make('<div data-target title="x"></div>'), { title: false, text: true }),
    ).toBe(false);
    expect(hasAccessibleName(make('<div data-target>x</div>'), { title: true, text: false })).toBe(
      false,
    );
    expect(
      hasAccessibleName(make('<label for="f">x</label><input id="f" data-target />'), {
        title: true,
        text: false,
      }),
    ).toBe(false);
  });
});
