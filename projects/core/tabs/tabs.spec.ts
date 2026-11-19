import { ApplicationRef, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideCkui } from '@ckui/core';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import { GROUP, PER_TAB, WITH_DISABLED } from '../testing/tabs-env';
import {
  DARK_TOKENS,
  TABS,
  TabsHost,
  mount,
  panelsOf,
  probes,
  query,
  selectedLabels,
  settle,
  shownPanels,
  tabsOf,
} from '../testing/tabs-host';

const tabIndexes = (root: HTMLElement) => tabsOf(root).map((tab) => tab.getAttribute('tabindex'));

describe('CkTabs', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
    TestBed.resetTestingModule();
    probes.created = 0;
    probes.destroyed = 0;
  });

  describe('structure', () => {
    it('is a tablist of tabs and a tabpanel, named by the consumer', async () => {
      const { fixture, root } = mount(GROUP());
      await settle(fixture);
      expect(query(root, 'ck-tab-list').getAttribute('role')).toBe('tablist');
      expect(query(root, 'ck-tab-list').getAttribute('aria-label')).toBe('Source');
      expect(tabsOf(root).map((tab) => tab.getAttribute('role'))).toEqual(['tab', 'tab', 'tab']);
      expect(query(root, 'ck-tab-panel').getAttribute('role')).toBe('tabpanel');
      expect(query(root, 'ck-tab-panel').getAttribute('tabindex')).toBe('0');
    });

    it('wires every tab to the shared panel, and the panel to the selected tab', async () => {
      const { fixture, host, root } = mount(GROUP());
      host.value.set('b');
      await settle(fixture);
      const panel = query(root, 'ck-tab-panel');
      expect(tabsOf(root).map((tab) => tab.getAttribute('aria-controls'))).toEqual([
        panel.id,
        panel.id,
        panel.id,
      ]);
      expect(panel.getAttribute('aria-labelledby')).toBe(tabsOf(root)[1].id);
      host.value.set('c');
      await settle(fixture);
      expect(panel.getAttribute('aria-labelledby')).toBe(tabsOf(root)[2].id);
      expect(panel.textContent).toBe('Shared');
    });

    it('wires each tab to its own panel and each panel back to its tab', async () => {
      const { fixture, root } = mount(PER_TAB());
      await settle(fixture);
      const panels = panelsOf(root);
      tabsOf(root).forEach((tab, index) => {
        expect(tab.getAttribute('aria-controls')).toBe(panels[index].id);
        expect(panels[index].getAttribute('aria-labelledby')).toBe(tab.id);
      });
    });

    it('gives every tab and panel its own id', async () => {
      const { fixture, root } = mount(PER_TAB());
      await settle(fixture);
      const ids = [...tabsOf(root), ...panelsOf(root)].map((element) => element.id);
      expect(ids.every((id) => id !== '')).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('marks exactly one tab selected, with one tab stop on it', async () => {
      const { fixture, host, root } = mount(GROUP());
      host.value.set('b');
      await settle(fixture);
      expect(tabsOf(root).map((tab) => tab.getAttribute('aria-selected'))).toEqual([
        'false',
        'true',
        'false',
      ]);
      expect(tabIndexes(root)).toEqual(['-1', '0', '-1']);
      expect(tabsOf(root).map((tab) => tab.classList.contains('ck-tab--selected'))).toEqual([
        false,
        true,
        false,
      ]);
    });

    it('is not a form control: no value accessor, no form attributes', async () => {
      const { fixture, root } = mount(GROUP());
      await settle(fixture);
      expect(query(root, 'ck-tabs').hasAttribute('aria-disabled')).toBe(false);
      expect(root.querySelectorAll('input, button')).toHaveLength(0);
    });

    it('keeps attributes the consumer sets on a tab and on a panel', async () => {
      const { fixture, root } = mount(
        `<ck-tabs><ck-tab-list aria-label="Source">
           <ck-tab value="a" lang="de" title="Hinweis" class="mine">Alpha</ck-tab>
         </ck-tab-list>
         <ck-tab-panel tabindex="-1" class="body">Text</ck-tab-panel></ck-tabs>`,
      );
      await settle(fixture);
      const tab = query(root, 'ck-tab');
      expect(tab.getAttribute('lang')).toBe('de');
      expect(tab.getAttribute('title')).toBe('Hinweis');
      expect(tab.classList.contains('mine')).toBe(true);
      expect(tab.classList.contains('ck-tab')).toBe(true);
      expect(query(root, 'ck-tab-panel').getAttribute('tabindex')).toBe('-1');
      expect(query(root, 'ck-tab-panel').classList.contains('body')).toBe(true);
    });
  });

  describe('selection', () => {
    it('shows the first tab for a null value without writing it back', async () => {
      const { fixture, host, root } = mount(GROUP());
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Alpha']);
      expect(tabIndexes(root)).toEqual(['0', '-1', '-1']);
      expect(host.value()).toBeNull();
      expect(host.emitted).toEqual([]);
    });

    it('selects the tab the value names, and follows a programmatic change without emitting', async () => {
      const { fixture, host, root } = mount(GROUP());
      host.value.set('c');
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Gamma']);
      host.value.set('b');
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Beta']);
      host.value.set(null);
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Alpha']);
      expect(host.emitted).toEqual([]);
    });

    it('selects on a click and reports the change once', async () => {
      const { fixture, host, root } = mount(GROUP());
      await settle(fixture);
      await userEvent.click(tabsOf(root)[2]);
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Gamma']);
      expect(host.value()).toBe('c');
      expect(host.emitted).toEqual(['c']);
      await userEvent.click(tabsOf(root)[2]);
      await settle(fixture);
      expect(host.emitted).toEqual(['c']);
    });

    it('writes the value when the user picks the tab that is only implicitly selected', async () => {
      const { fixture, host, root } = mount(GROUP());
      await settle(fixture);
      await userEvent.click(tabsOf(root)[0]);
      await settle(fixture);
      expect(host.emitted).toEqual(['a']);
    });

    it('works two-way with [(value)]', async () => {
      const { fixture, host, root } = mount(
        `<ck-tabs [(value)]="value"><ck-tab-list aria-label="Source">
           <ck-tab value="a">Alpha</ck-tab><ck-tab value="b">Beta</ck-tab></ck-tab-list></ck-tabs>`,
      );
      await settle(fixture);
      await userEvent.click(tabsOf(root)[1]);
      await settle(fixture);
      expect(host.value()).toBe('b');
      host.value.set('a');
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Alpha']);
    });

    it('ignores a click on a disabled tab', async () => {
      const { fixture, host, root } = mount(WITH_DISABLED());
      host.value.set('a');
      await settle(fixture);
      tabsOf(root)[1].click();
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Alpha']);
      expect(host.emitted).toEqual([]);
    });

    it('shows the first enabled tab when the value names a disabled tab', async () => {
      const { fixture, host, root } = mount(WITH_DISABLED());
      host.value.set('b');
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Alpha']);
      expect(tabIndexes(root)).toEqual(['0', '-1', '-1', '-1']);
      expect(host.emitted).toEqual([]);
    });

    it('shows the first enabled tab when the value names no tab at all', async () => {
      const { fixture, host, root } = mount(GROUP());
      host.value.set('missing');
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Alpha']);
      expect(shownPanels(root)).toEqual(['Shared']);
    });

    it('moves to the first enabled tab when the first tab is disabled', async () => {
      const { fixture, root } = mount(
        `<ck-tabs><ck-tab-list aria-label="Source">
           <ck-tab value="a" disabled>Alpha</ck-tab><ck-tab value="b">Beta</ck-tab>
         </ck-tab-list><ck-tab-panel>Shared</ck-tab-panel></ck-tabs>`,
      );
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Beta']);
    });

    it('falls to the next enabled tab when the selected tab becomes disabled, and back when enabled', async () => {
      const { fixture, host, root } = mount(
        `<ck-tabs [value]="value()"><ck-tab-list aria-label="Source">
           <ck-tab value="a">Alpha</ck-tab>
           <ck-tab value="b" [disabled]="locked().includes('b')">Beta</ck-tab>
         </ck-tab-list></ck-tabs>`,
      );
      host.value.set('b');
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Beta']);
      host.locked.set(['b']);
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Alpha']);
      host.locked.set([]);
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Beta']);
    });

    it('has no selected tab and no tab stop when every tab is disabled', async () => {
      const { fixture, root } = mount(
        `<ck-tabs><ck-tab-list aria-label="Source">
           <ck-tab value="a" disabled>Alpha</ck-tab><ck-tab value="b" disabled>Beta</ck-tab>
         </ck-tab-list><ck-tab-panel>Shared</ck-tab-panel></ck-tabs>`,
      );
      await settle(fixture);
      expect(selectedLabels(root)).toEqual([]);
      expect(tabIndexes(root)).toEqual(['-1', '-1']);
      expect(tabsOf(root).map((tab) => tab.getAttribute('aria-disabled'))).toEqual([
        'true',
        'true',
      ]);
      expect(shownPanels(root)).toEqual([]);
      expect(query(root, 'ck-tab-panel').hasAttribute('aria-labelledby')).toBe(false);
    });

    it('has nothing selected and no panel wired without tabs', async () => {
      const { fixture, root } = mount(
        `<ck-tabs><ck-tab-list aria-label="Empty"></ck-tab-list><ck-tab-panel>Shared</ck-tab-panel></ck-tabs>`,
      );
      await settle(fixture);
      expect(shownPanels(root)).toEqual([]);
      expect(query(root, 'ck-tab-panel').hidden).toBe(true);
    });

    it('compares object values by identity', async () => {
      const { fixture, host, root } = mount(
        `<ck-tabs [value]="objectValue()"><ck-tab-list aria-label="Source">
           <ck-tab [value]="one">One</ck-tab><ck-tab [value]="two">Two</ck-tab>
         </ck-tab-list></ck-tabs>`,
        (prepared) => Object.assign(prepared, { one: { id: 1 }, two: { id: 1 } }),
      );
      const typed = host as unknown as { one: object; two: object };
      host.objectValue.set(typed.two);
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Two']);
      host.objectValue.set({ id: 1 });
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['One']);
    });

    it('shows the first enabled tab for an unset tab value without throwing', async () => {
      const { fixture, root } = mount(
        `<ck-tabs><ck-tab-list aria-label="Source"><ck-tab value="a">Alpha</ck-tab></ck-tab-list></ck-tabs>`,
      );
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Alpha']);
    });
  });

  describe('tabs that come and go', () => {
    const DYNAMIC = `<ck-tabs [value]="value()" (valueChange)="value.set($event); emitted.push($event)">
        <ck-tab-list aria-label="Source">
          @for (item of items(); track item) {<ck-tab [value]="item">{{ item }}</ck-tab>}
        </ck-tab-list>
        <ck-tab-panel>Shared</ck-tab-panel>
      </ck-tabs>`;

    it('adds a tab at the end, in the middle and at the start', async () => {
      const { fixture, host, root } = mount(DYNAMIC);
      host.value.set('b');
      await settle(fixture);
      host.items.set(['a', 'b', 'c', 'd']);
      await settle(fixture);
      expect(tabsOf(root).map((tab) => tab.textContent!.trim())).toEqual(['a', 'b', 'c', 'd']);
      expect(selectedLabels(root)).toEqual(['b']);
      host.items.set(['z', 'a', 'b', 'c', 'd']);
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['b']);
      expect(tabIndexes(root)).toEqual(['-1', '-1', '0', '-1', '-1']);
    });

    it('moves to the first tab when the selected tab is removed, without writing the value', async () => {
      const { fixture, host, root } = mount(DYNAMIC);
      host.value.set('b');
      await settle(fixture);
      host.items.set(['a', 'c']);
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['a']);
      expect(host.value()).toBe('b');
      expect(host.emitted).toEqual([]);
      host.items.set(['a', 'b', 'c']);
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['b']);
    });

    it('survives removing every tab and adding them back', async () => {
      const { fixture, host, root } = mount(DYNAMIC);
      host.value.set('c');
      await settle(fixture);
      host.items.set([]);
      await settle(fixture);
      expect(tabsOf(root)).toHaveLength(0);
      expect(shownPanels(root)).toEqual([]);
      host.items.set(['a', 'b', 'c']);
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['c']);
      expect(shownPanels(root)).toEqual(['Shared']);
    });

    it('keeps the wiring when panels are added and removed', async () => {
      const { fixture, host, root } = mount(
        `<ck-tabs [value]="value()"><ck-tab-list aria-label="Source">
           <ck-tab value="a">A</ck-tab><ck-tab value="b">B</ck-tab>
         </ck-tab-list>
         @for (item of items(); track item) {<ck-tab-panel [value]="item">{{ item }}</ck-tab-panel>}
         </ck-tabs>`,
      );
      host.items.set(['a']);
      await settle(fixture);
      expect(tabsOf(root)[1].hasAttribute('aria-controls')).toBe(false);
      host.items.set(['a', 'b']);
      await settle(fixture);
      expect(tabsOf(root)[1].getAttribute('aria-controls')).toBe(panelsOf(root)[1].id);
    });

    it('keeps the focused tab focused while another tab is added', async () => {
      const { fixture, host, root } = mount(DYNAMIC);
      await settle(fixture);
      tabsOf(root)[0].focus();
      host.items.set(['a', 'b', 'c', 'd']);
      await settle(fixture);
      expect(document.activeElement).toBe(tabsOf(root)[0]);
    });
  });

  describe('panels', () => {
    it('shows only the panel of the selected tab', async () => {
      const { fixture, host, root } = mount(PER_TAB());
      await settle(fixture);
      expect(shownPanels(root)).toEqual(['Panel A']);
      host.value.set('c');
      await settle(fixture);
      expect(shownPanels(root)).toEqual(['Panel C']);
      expect(panelsOf(root).map((panel) => panel.hidden)).toEqual([true, true, false]);
    });

    it('never shows a panel whose value matches no tab, and warns once in development', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, root } = mount(
        `<ck-tabs><ck-tab-list aria-label="Source"><ck-tab value="a">A</ck-tab></ck-tab-list>
         <ck-tab-panel value="a">One</ck-tab-panel><ck-tab-panel value="nope">Two</ck-tab-panel></ck-tabs>`,
      );
      await settle(fixture);
      expect(shownPanels(root)).toEqual(['One']);
      expect(panelsOf(root)[1].hasAttribute('aria-labelledby')).toBe(false);
      const messages = warn.mock.calls.filter((call) => String(call[0]).includes('matches no'));
      expect(messages).toHaveLength(1);
      expect(messages[0][1]).toBe('nope');
    });

    it('does not warn for panels whose tabs exist', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture } = mount(PER_TAB());
      await settle(fixture);
      expect(warn).not.toHaveBeenCalled();
    });

    it('lets a shared panel and tab panels sit in one group', async () => {
      const { fixture, host, root } = mount(
        `<ck-tabs [value]="value()"><ck-tab-list aria-label="Source">
           <ck-tab value="a">A</ck-tab><ck-tab value="b">B</ck-tab></ck-tab-list>
         <ck-tab-panel value="a">Own A</ck-tab-panel><ck-tab-panel>Shared</ck-tab-panel></ck-tabs>`,
      );
      host.value.set('b');
      await settle(fixture);
      const [own, shared] = panelsOf(root);
      expect(tabsOf(root)[0].getAttribute('aria-controls')).toBe(own.id);
      expect(tabsOf(root)[1].getAttribute('aria-controls')).toBe(shared.id);
      expect(shownPanels(root)).toEqual(['Shared']);
    });
  });

  describe('lazy content', () => {
    it('creates the content only while its panel is shown and destroys it when hidden', async () => {
      const { fixture, host, root } = mount(PER_TAB());
      await settle(fixture);
      expect(root.querySelectorAll('[ckprobe]')).toHaveLength(1);
      expect(root.querySelector('[ckprobe]')!.textContent).toBe('Panel A');
      expect(probes).toEqual({ created: 1, destroyed: 0 });
      host.value.set('b');
      await settle(fixture);
      expect(root.querySelectorAll('[ckprobe]')).toHaveLength(1);
      expect(root.querySelector('[ckprobe]')!.textContent).toBe('Panel B');
      expect(probes).toEqual({ created: 2, destroyed: 1 });
      host.value.set('c');
      await settle(fixture);
      expect(root.querySelectorAll('[ckprobe]')).toHaveLength(0);
      expect(probes).toEqual({ created: 2, destroyed: 2 });
    });

    it('creates the content again, fresh, when the tab is selected again', async () => {
      const { fixture, host, root } = mount(PER_TAB());
      await settle(fixture);
      const first = root.querySelector('[ckprobe]')!;
      host.value.set('b');
      await settle(fixture);
      host.value.set('a');
      await settle(fixture);
      expect(root.querySelector('[ckprobe]')).not.toBe(first);
      expect(probes.created).toBe(3);
    });

    it('works in the shared panel: the content is created once and lives on across tab switches', async () => {
      const { fixture, host, root } = mount(
        GROUP(
          '',
          '<ck-tab-panel><ng-template ckTabContent><i ckProbe>Body</i></ng-template></ck-tab-panel>',
        ),
      );
      await settle(fixture);
      expect(probes).toEqual({ created: 1, destroyed: 0 });
      host.value.set('b');
      await settle(fixture);
      expect(root.querySelectorAll('[ckprobe]')).toHaveLength(1);
      expect(probes.created).toBe(1);
      expect(probes.destroyed).toBe(0);
    });

    it('creates nothing when no tab can be selected', async () => {
      const { fixture } = mount(
        `<ck-tabs><ck-tab-list aria-label="Source"><ck-tab value="a" disabled>A</ck-tab></ck-tab-list>
         <ck-tab-panel value="a"><ng-template ckTabContent><i ckProbe>Body</i></ng-template></ck-tab-panel></ck-tabs>`,
      );
      await settle(fixture);
      expect(probes.created).toBe(0);
    });

    it('destroys the content with the group', async () => {
      const { fixture } = mount(PER_TAB());
      await settle(fixture);
      fixture.destroy();
      expect(probes).toEqual({ created: 1, destroyed: 1 });
    });

    it('keeps plain panel content alive while hidden', async () => {
      const { fixture, host, root } = mount(
        `<ck-tabs [value]="value()"><ck-tab-list aria-label="Source">
           <ck-tab value="a">A</ck-tab><ck-tab value="b">B</ck-tab></ck-tab-list>
         <ck-tab-panel value="a"><input aria-label="Note" /></ck-tab-panel>
         <ck-tab-panel value="b">Other</ck-tab-panel></ck-tabs>`,
      );
      await settle(fixture);
      query<HTMLInputElement>(root, 'input').value = 'typed';
      host.value.set('b');
      await settle(fixture);
      host.value.set('a');
      await settle(fixture);
      expect(query<HTMLInputElement>(root, 'input').value).toBe('typed');
    });
  });

  describe('ids', () => {
    const IDS = `<ck-tabs [value]="value()"><ck-tab-list aria-label="Source">
        <ck-tab value="a" [id]="ids().tab">A</ck-tab><ck-tab value="b">B</ck-tab></ck-tab-list>
      <ck-tab-panel value="a" [id]="ids().panel">Own</ck-tab-panel></ck-tabs>`;

    it('keeps a static id and wires to it', async () => {
      const { fixture, root } = mount(
        `<ck-tabs><ck-tab-list aria-label="Source"><ck-tab value="a" id="my-tab">A</ck-tab></ck-tab-list>
         <ck-tab-panel value="a" id="my-panel">Own</ck-tab-panel></ck-tabs>`,
      );
      await settle(fixture);
      expect(tabsOf(root)[0].id).toBe('my-tab');
      expect(panelsOf(root)[0].id).toBe('my-panel');
      expect(tabsOf(root)[0].getAttribute('aria-controls')).toBe('my-panel');
      expect(panelsOf(root)[0].getAttribute('aria-labelledby')).toBe('my-tab');
    });

    it('follows a bound id, and a changing one, in both directions', async () => {
      const { fixture, host, root } = mount(IDS);
      await settle(fixture);
      expect(tabsOf(root)[0].id).toBe('tab-one');
      expect(tabsOf(root)[0].getAttribute('aria-controls')).toBe('panel-one');
      expect(panelsOf(root)[0].getAttribute('aria-labelledby')).toBe('tab-one');
      host.ids.set({ tab: 'tab-two', panel: 'panel-two' });
      await settle(fixture);
      expect(tabsOf(root)[0].id).toBe('tab-two');
      expect(tabsOf(root)[0].getAttribute('aria-controls')).toBe('panel-two');
      expect(panelsOf(root)[0].getAttribute('aria-labelledby')).toBe('tab-two');
    });

    it('keeps generated ids unique across groups', async () => {
      const { fixture, root } = mount(`${TABS()}${TABS()}`);
      await settle(fixture);
      const ids = [...tabsOf(root), ...panelsOf(root)].map((element) => element.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('nested groups', () => {
    it('keeps the tabs and panels of an inner group to the inner group', async () => {
      const { fixture, root } = mount(
        `<ck-tabs id="outer"><ck-tab-list aria-label="Outer">
           <ck-tab value="x">X</ck-tab><ck-tab value="y">Y</ck-tab></ck-tab-list>
         <ck-tab-panel>
           <ck-tabs id="inner"><ck-tab-list aria-label="Inner">
             <ck-tab value="x">Inner X</ck-tab><ck-tab value="z">Inner Z</ck-tab></ck-tab-list>
             <ck-tab-panel value="z">Inner panel Z</ck-tab-panel>
           </ck-tabs>
         </ck-tab-panel></ck-tabs>`,
      );
      await settle(fixture);
      const outerPanel = query(root, '#outer > ck-tab-panel');
      const innerPanel = query(root, '#inner > ck-tab-panel');
      const [outerX, outerY, innerX, innerZ] = tabsOf(root);
      expect(outerX.getAttribute('aria-controls')).toBe(outerPanel.id);
      expect(outerY.getAttribute('aria-controls')).toBe(outerPanel.id);
      expect(innerX.hasAttribute('aria-controls')).toBe(false);
      expect(innerZ.getAttribute('aria-controls')).toBe(innerPanel.id);
      expect(outerPanel.getAttribute('aria-labelledby')).toBe(outerX.id);
      innerZ.click();
      await settle(fixture);
      expect(outerX.getAttribute('aria-selected')).toBe('true');
      expect(innerZ.getAttribute('aria-selected')).toBe('true');
      expect(innerPanel.hidden).toBe(false);
    });
  });

  describe('development warnings', () => {
    const warnings = () => vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    it('warns once when the tab list has no name', async () => {
      const spy = warnings();
      const { fixture } = mount(
        `<ck-tabs><ck-tab-list><ck-tab value="a">A</ck-tab></ck-tab-list></ck-tabs>`,
      );
      await settle(fixture);
      const messages = spy.mock.calls.filter((call) => String(call[0]).includes('ck-tab-list'));
      expect(messages).toHaveLength(1);
      expect(String(messages[0][0])).toContain('no accessible name');
    });

    it.each([
      ['aria-label', 'aria-label="Source"'],
      ['aria-labelledby', 'aria-labelledby="heading"'],
    ])('accepts a name from %s', async (_name, attribute) => {
      const spy = warnings();
      const { fixture } = mount(
        `<h2 id="heading">Source</h2><ck-tabs><ck-tab-list ${attribute}><ck-tab value="a">A</ck-tab></ck-tab-list></ck-tabs>`,
      );
      await settle(fixture);
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not warn when destroyed before the first render finishes', () => {
      const spy = warnings();
      TestBed.overrideComponent(TabsHost, {
        set: {
          template:
            '<ck-tabs><ck-tab-list><ck-tab value="a">A</ck-tab></ck-tab-list><ck-tab-panel value="x">X</ck-tab-panel></ck-tabs>',
        },
      });
      TestBed.createComponent(TabsHost).destroy();
      TestBed.inject(ApplicationRef).tick();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('size and configuration', () => {
    it.each(['sm', 'md', 'lg', 'xl'] as const)('puts the %s class on the group', async (size) => {
      const { fixture, root } = mount(GROUP(`size="${size}"`));
      await settle(fixture);
      expect(query(root, 'ck-tabs').classList.contains(`ck-tabs--${size}`)).toBe(true);
    });

    it('uses the size from provideCkui when none is set, and switches when the input changes', async () => {
      TestBed.configureTestingModule({ providers: [provideCkui({ size: 'lg' })] });
      const { fixture, host, root } = mount(GROUP('[size]="size()"'));
      await settle(fixture);
      expect(query(root, 'ck-tabs').classList.contains('ck-tabs--lg')).toBe(true);
      host.size.set('sm');
      await settle(fixture);
      expect(query(root, 'ck-tabs').classList.contains('ck-tabs--sm')).toBe(true);
      expect(query(root, 'ck-tabs').classList.contains('ck-tabs--lg')).toBe(false);
    });

    it('marks a full width group', async () => {
      const { fixture, root } = mount(GROUP('fullWidth'));
      await settle(fixture);
      expect(query(root, 'ck-tabs').classList.contains('ck-tabs--full-width')).toBe(true);
    });
  });

  describe('server rendering and hydration', () => {
    it('renders the state into the markup and stays silent', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, root } = mount(PER_TAB(), (host) => host.value.set('b'));
      TestBed.inject(ApplicationRef).tick();
      expect(selectedLabels(root)).toEqual(['Beta']);
      expect(tabsOf(root)[1].getAttribute('aria-controls')).toBe(panelsOf(root)[1].id);
      expect(panelsOf(root)[1].getAttribute('aria-labelledby')).toBe(tabsOf(root)[1].id);
      expect(panelsOf(root).map((panel) => panel.hidden)).toEqual([true, false, true]);
      expect(warn).not.toHaveBeenCalled();
      fixture.destroy();
    });

    it('takes over pre-rendered markup: stale ids, wiring and hidden state are corrected on the first render', async () => {
      const { fixture, root } = mount(
        PER_TAB(),
        (host) => host.value.set('b'),
        undefined,
        (rendered) => {
          for (const [index, tab] of tabsOf(rendered).entries()) {
            tab.id = `server-tab-${index}`;
            tab.setAttribute('aria-controls', `server-panel-${index}`);
            tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
            tab.setAttribute('tabindex', index === 0 ? '0' : '-1');
          }
          for (const [index, panel] of panelsOf(rendered).entries()) {
            panel.id = `server-panel-${index}`;
            panel.setAttribute('aria-labelledby', `server-tab-${index}`);
            panel.hidden = index !== 0;
          }
        },
      );
      await settle(fixture);
      const tabs = tabsOf(root);
      const panels = panelsOf(root);
      tabs.forEach((tab, index) => {
        expect(tab.id).not.toMatch(/^server-/);
        expect(tab.getAttribute('aria-controls')).toBe(panels[index].id);
        expect(panels[index].getAttribute('aria-labelledby')).toBe(tab.id);
        expect(document.getElementById(tab.id)).toBe(tab);
        expect(document.getElementById(panels[index].id)).toBe(panels[index]);
      });
      expect(selectedLabels(root)).toEqual(['Beta']);
      expect(tabIndexes(root)).toEqual(['-1', '0', '-1']);
      expect(panels.map((panel) => panel.hidden)).toEqual([true, false, true]);
    });

    it('also stays silent on the server for a list without a name and a stray panel', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture } = mount(
        `<ck-tabs><ck-tab-list><ck-tab value="a">A</ck-tab></ck-tab-list><ck-tab-panel value="x">X</ck-tab-panel></ck-tabs>`,
      );
      TestBed.inject(ApplicationRef).tick();
      expect(warn).not.toHaveBeenCalled();
      fixture.destroy();
    });
  });

  describe('accessibility', () => {
    it.each([
      ['light', undefined],
      ['dark', DARK_TOKENS],
    ] as const)(
      'has no axe violations in the %s theme: shared panel, tab panels, a disabled tab, no tabs',
      async (_theme, tokens) => {
        const { fixture, host, root } = mount(
          `${GROUP()}${PER_TAB()}${WITH_DISABLED()}
           <ck-tabs><ck-tab-list aria-label="Empty"></ck-tab-list></ck-tabs>`,
          undefined,
          tokens,
        );
        await settle(fixture);
        await expectNoAxeViolations(root);
        host.value.set('b');
        await settle(fixture);
        await expectNoAxeViolations(root);
      },
    );
  });
});
