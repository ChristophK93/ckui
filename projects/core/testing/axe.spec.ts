import { expectNoAxeViolations } from './axe';

describe('expectNoAxeViolations', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => host.remove());

  it('passes a clean element', async () => {
    host.innerHTML = '<button type="button">Save</button>';
    await expectNoAxeViolations(host);
  });

  it('fails with the rule id and target for an image without alt text', async () => {
    host.innerHTML = '<img id="broken" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />';
    await expect(expectNoAxeViolations(host)).rejects.toThrow(/image-alt[\s\S]*#broken/);
  });

  it('fails for a button without an accessible name', async () => {
    host.innerHTML = '<button type="button"></button>';
    await expect(expectNoAxeViolations(host)).rejects.toThrow(/button-name/);
  });
});
