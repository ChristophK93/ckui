import { TestBed } from '@angular/core/testing';
import { CkInert } from './inert';

describe('CkInert', () => {
  let app: HTMLElement;
  let sidebar: HTMLElement;
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="app"></div>
      <aside id="sidebar"></aside>
      <div id="container" class="cdk-overlay-container"></div>
    `;
    app = document.querySelector<HTMLElement>('#app')!;
    sidebar = document.querySelector<HTMLElement>('#sidebar')!;
    container = document.querySelector<HTMLElement>('#container')!;
  });

  afterEach(() => document.body.replaceChildren());

  const service = () => TestBed.inject(CkInert);

  it('makes elements inert and restores them on release', () => {
    const release = service().hold([app, sidebar]);
    expect(app.inert).toBe(true);
    expect(sidebar.inert).toBe(true);
    release();
    expect(app.hasAttribute('inert')).toBe(false);
    expect(sidebar.hasAttribute('inert')).toBe(false);
  });

  it('keeps an element inert until every hold on it is released', () => {
    const first = service().hold([app]);
    const second = service().hold([app, sidebar]);
    first();
    expect(app.inert).toBe(true);
    second();
    expect(app.inert).toBe(false);
    expect(sidebar.inert).toBe(false);
  });

  it('counts an element passed twice in one hold once', () => {
    const release = service().hold([app, app]);
    release();
    expect(app.inert).toBe(false);
  });

  it('releases only once however often the release is called', () => {
    const first = service().hold([app]);
    const second = service().hold([app]);
    first();
    first();
    first();
    expect(app.inert).toBe(true);
    second();
    expect(app.inert).toBe(false);
  });

  it('gives an element the app made inert back unchanged', () => {
    app.setAttribute('inert', '');
    const release = service().hold([app]);
    expect(app.inert).toBe(true);
    release();
    expect(app.hasAttribute('inert')).toBe(true);
    expect(app.inert).toBe(true);
  });

  it('keeps the value of an attribute the app set', () => {
    app.setAttribute('inert', 'until-found');
    const first = service().hold([app]);
    const second = service().hold([app]);
    first();
    second();
    expect(app.getAttribute('inert')).toBe('until-found');
  });

  it('survives an element that left the document while held', () => {
    const release = service().hold([app]);
    app.remove();
    expect(() => release()).not.toThrow();
    expect(app.hasAttribute('inert')).toBe(false);
  });

  it('lists the body children except the kept one, exempt elements and non-rendered tags', () => {
    const exempt = document.createElement('section');
    exempt.setAttribute('data-ck-inert-exempt', '');
    const announcer = document.createElement('div');
    announcer.className = 'cdk-live-announcer-element';
    const script = document.createElement('script');
    const style = document.createElement('style');
    document.body.append(exempt, announcer, script, style);
    expect(service().backgroundElements(container)).toEqual([app, sidebar]);
  });

  it('returns an empty list for a body with only the kept element', () => {
    app.remove();
    sidebar.remove();
    expect(service().backgroundElements(container)).toEqual([]);
  });
});
