import { TestBed } from '@angular/core/testing';
import { userEvent } from 'vitest/browser';
import { GROUP, WITH_DISABLED } from '../testing/tabs-env';
import { mount, query, selectedLabels, settle, shownPanels, tabsOf } from '../testing/tabs-host';

const BEFORE = '<button id="before">Before</button>';
const AFTER = '<button id="after">After</button>';

const focusedLabel = () => document.activeElement?.textContent?.trim();

describe('CkTabs keyboard', () => {
  afterEach(() => {
    document.body.replaceChildren();
    document.body.removeAttribute('dir');
    TestBed.resetTestingModule();
  });

  describe('tab stops', () => {
    it('enters on the selected tab, then goes to the panel, then leaves', async () => {
      const { fixture, host, root } = mount(`${BEFORE}${GROUP()}${AFTER}`);
      host.value.set('b');
      await settle(fixture);
      query(root, '#before').focus();
      await userEvent.tab();
      expect(focusedLabel()).toBe('Beta');
      await userEvent.tab();
      expect(document.activeElement).toBe(query(root, 'ck-tab-panel'));
      await userEvent.tab();
      expect(document.activeElement).toBe(query(root, '#after'));
    });

    it('enters on the first enabled tab when nothing is selected, and skips a disabled first tab', async () => {
      const { fixture, root } = mount(
        `${BEFORE}<ck-tabs><ck-tab-list aria-label="Source">
           <ck-tab value="a" disabled>Alpha</ck-tab><ck-tab value="b">Beta</ck-tab>
         </ck-tab-list></ck-tabs>`,
      );
      await settle(fixture);
      query(root, '#before').focus();
      await userEvent.tab();
      expect(focusedLabel()).toBe('Beta');
    });

    it('leaves Shift+Tab going back to the selected tab from the panel', async () => {
      const { fixture, host, root } = mount(GROUP());
      host.value.set('c');
      await settle(fixture);
      query(root, 'ck-tab-panel').focus();
      await userEvent.tab({ shift: true });
      expect(focusedLabel()).toBe('Gamma');
    });

    it('never makes a disabled tab the tab stop', async () => {
      const { fixture, root } = mount(WITH_DISABLED());
      await settle(fixture);
      expect(tabsOf(root).map((tab) => tab.getAttribute('tabindex'))).toEqual([
        '0',
        '-1',
        '-1',
        '-1',
      ]);
      expect(tabsOf(root)[1].getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('panel tab stop', () => {
    const LIST = '<button id="first">One</button><button id="second">Two</button>';

    it('goes from the selected tab to the first button when the panel is no tab stop', async () => {
      const { fixture, host, root } = mount(
        `${BEFORE}${GROUP('', `<ck-tab-panel [tabStop]="false">${LIST}</ck-tab-panel>`)}${AFTER}`,
      );
      host.value.set('b');
      await settle(fixture);
      query(root, '#before').focus();
      await userEvent.tab();
      expect(focusedLabel()).toBe('Beta');
      await userEvent.tab();
      expect(document.activeElement).toBe(query(root, '#first'));
      await userEvent.tab({ shift: true });
      expect(focusedLabel()).toBe('Beta');
    });

    it('goes from the selected tab to the panel by default, then to the first button', async () => {
      const { fixture, root } = mount(
        `${BEFORE}${GROUP('', `<ck-tab-panel>${LIST}</ck-tab-panel>`)}${AFTER}`,
      );
      await settle(fixture);
      query(root, '#before').focus();
      await userEvent.tab();
      await userEvent.tab();
      expect(document.activeElement).toBe(query(root, 'ck-tab-panel'));
      await userEvent.tab();
      expect(document.activeElement).toBe(query(root, '#first'));
    });

    it('skips the panels of a per-value group, the hidden one anyway', async () => {
      const { fixture, host, root } = mount(
        `${BEFORE}<ck-tabs [value]="value()"><ck-tab-list aria-label="Source">
           <ck-tab value="a">Alpha</ck-tab><ck-tab value="b">Beta</ck-tab>
         </ck-tab-list>
         <ck-tab-panel value="a" [tabStop]="false"><button id="in-a">A</button></ck-tab-panel>
         <ck-tab-panel value="b" [tabStop]="false"><button id="in-b">B</button></ck-tab-panel>
         </ck-tabs>${AFTER}`,
      );
      host.value.set('b');
      await settle(fixture);
      query(root, '#before').focus();
      await userEvent.tab();
      await userEvent.tab();
      expect(document.activeElement).toBe(query(root, '#in-b'));
      await userEvent.tab();
      expect(document.activeElement).toBe(query(root, '#after'));
    });

    it('follows the input when it changes', async () => {
      const { fixture, host, root } = mount(
        `${BEFORE}${GROUP('', `<ck-tab-panel [tabStop]="tabStop()">${LIST}</ck-tab-panel>`)}`,
      );
      host.tabStop.set(false);
      await settle(fixture);
      query(root, '#before').focus();
      await userEvent.tab();
      await userEvent.tab();
      expect(document.activeElement).toBe(query(root, '#first'));
      host.tabStop.set(true);
      await settle(fixture);
      query(root, '#before').focus();
      await userEvent.tab();
      await userEvent.tab();
      expect(document.activeElement).toBe(query(root, 'ck-tab-panel'));
    });
  });

  describe('automatic activation', () => {
    it('moves focus and selection with the arrow keys, wrapping at both ends', async () => {
      const { fixture, host, root } = mount(GROUP());
      await settle(fixture);
      tabsOf(root)[0].focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(focusedLabel()).toBe('Beta');
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Beta']);
      await userEvent.keyboard('{ArrowRight}{ArrowRight}');
      await settle(fixture);
      expect(focusedLabel()).toBe('Alpha');
      expect(selectedLabels(root)).toEqual(['Alpha']);
      await userEvent.keyboard('{ArrowLeft}');
      await settle(fixture);
      expect(focusedLabel()).toBe('Gamma');
      expect(selectedLabels(root)).toEqual(['Gamma']);
      expect(host.emitted).toEqual(['b', 'c', 'a', 'c']);
    });

    it('jumps with Home and End', async () => {
      const { fixture, host, root } = mount(GROUP());
      host.value.set('b');
      await settle(fixture);
      tabsOf(root)[1].focus();
      await userEvent.keyboard('{End}');
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Gamma']);
      await userEvent.keyboard('{Home}');
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Alpha']);
      expect(focusedLabel()).toBe('Alpha');
    });

    it('skips disabled tabs, also with Home and End', async () => {
      const { fixture, host, root } = mount(
        `<ck-tabs [value]="value()" (valueChange)="value.set($event); emitted.push($event)">
           <ck-tab-list aria-label="Source">
             <ck-tab value="a" disabled>Alpha</ck-tab><ck-tab value="b">Beta</ck-tab>
             <ck-tab value="c" disabled>Gamma</ck-tab><ck-tab value="d">Delta</ck-tab>
             <ck-tab value="e" disabled>Epsilon</ck-tab>
           </ck-tab-list></ck-tabs>`,
      );
      await settle(fixture);
      tabsOf(root)[1].focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(focusedLabel()).toBe('Delta');
      await userEvent.keyboard('{ArrowRight}');
      expect(focusedLabel()).toBe('Beta');
      await userEvent.keyboard('{ArrowLeft}');
      expect(focusedLabel()).toBe('Delta');
      await userEvent.keyboard('{Home}');
      expect(focusedLabel()).toBe('Beta');
      await userEvent.keyboard('{End}');
      expect(focusedLabel()).toBe('Delta');
      await settle(fixture);
      expect(host.emitted.at(-1)).toBe('d');
    });

    it('stays on a lone enabled tab', async () => {
      const { fixture, root } = mount(
        `<ck-tabs><ck-tab-list aria-label="Source">
           <ck-tab value="a">Alpha</ck-tab><ck-tab value="b" disabled>Beta</ck-tab>
         </ck-tab-list></ck-tabs>`,
      );
      await settle(fixture);
      tabsOf(root)[0].focus();
      await userEvent.keyboard('{ArrowRight}{ArrowLeft}{End}{Home}');
      expect(focusedLabel()).toBe('Alpha');
      expect(selectedLabels(root)).toEqual(['Alpha']);
    });

    it('selects the focused tab on Enter and Space too', async () => {
      const { fixture, root } = mount(GROUP());
      await settle(fixture);
      tabsOf(root)[2].focus();
      await userEvent.keyboard('{Enter}');
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Gamma']);
      tabsOf(root)[1].focus();
      await userEvent.keyboard(' ');
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Beta']);
    });

    it('keeps up with rapid repeated keys', async () => {
      const { fixture, host, root } = mount(GROUP());
      await settle(fixture);
      tabsOf(root)[0].focus();
      await userEvent.keyboard('{ArrowRight}'.repeat(8));
      await settle(fixture);
      expect(focusedLabel()).toBe('Gamma');
      expect(selectedLabels(root)).toEqual(['Gamma']);
      expect(host.emitted).toHaveLength(8);
    });

    it('leaves the vertical arrows, modified keys and other keys alone', async () => {
      const { fixture, host, root } = mount(GROUP());
      await settle(fixture);
      tabsOf(root)[0].focus();
      const prevented: boolean[] = [];
      const listener = new AbortController();
      document.addEventListener('keydown', (event) => prevented.push(event.defaultPrevented), {
        signal: listener.signal,
      });
      await userEvent.keyboard(
        '{ArrowDown}{ArrowUp}{Control>}{ArrowRight}{/Control}{Alt>}{End}{/Alt}a{PageDown}',
      );
      listener.abort();
      expect(prevented.length).toBeGreaterThan(5);
      expect(prevented.every((value) => !value)).toBe(true);
      expect(focusedLabel()).toBe('Alpha');
      expect(host.emitted).toEqual([]);
    });

    it('prevents the page from scrolling on Space and the arrow keys', async () => {
      const { fixture, root } = mount(GROUP());
      await settle(fixture);
      tabsOf(root)[0].focus();
      const prevented: string[] = [];
      const listener = new AbortController();
      document.addEventListener(
        'keydown',
        (event) => {
          if (event.defaultPrevented) {
            prevented.push(event.key);
          }
        },
        { signal: listener.signal },
      );
      await userEvent.keyboard('{ArrowRight} {Home}{End}{Enter}');
      listener.abort();
      expect(prevented).toEqual(['ArrowRight', ' ', 'Home', 'End', 'Enter']);
    });

    it('does nothing with keys when every tab is disabled', async () => {
      const { fixture, root } = mount(
        `<ck-tabs><ck-tab-list aria-label="Source"><ck-tab value="a" disabled>Alpha</ck-tab></ck-tab-list></ck-tabs>`,
      );
      await settle(fixture);
      tabsOf(root)[0].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      await settle(fixture);
      expect(selectedLabels(root)).toEqual([]);
    });

    it('keeps focus on a focused tab that has just become disabled, and moves on from it with the keys', async () => {
      const { fixture, host, root } = mount(
        `<ck-tabs [value]="value()"><ck-tab-list aria-label="Source">
           <ck-tab value="a">Alpha</ck-tab>
           <ck-tab value="b" [disabled]="locked().includes('b')">Beta</ck-tab>
           <ck-tab value="c">Gamma</ck-tab>
         </ck-tab-list></ck-tabs>`,
      );
      host.value.set('b');
      await settle(fixture);
      tabsOf(root)[1].focus();
      host.locked.set(['b']);
      await settle(fixture);
      expect(tabsOf(root)[1].getAttribute('tabindex')).toBe('-1');
      expect(document.activeElement).toBe(tabsOf(root)[1]);
      await userEvent.keyboard('{ArrowRight}');
      await settle(fixture);
      expect(focusedLabel()).toBe('Alpha');
    });

    it('moves focus to the selected tab when the focused tab is removed, and the keys keep working', async () => {
      const { fixture, host, root } = mount(
        `<ck-tabs [value]="value()" (valueChange)="value.set($event)"><ck-tab-list aria-label="Source">
           @for (item of items(); track item) {<ck-tab [value]="item">{{ item }}</ck-tab>}
         </ck-tab-list></ck-tabs>`,
      );
      host.value.set('a');
      await settle(fixture);
      tabsOf(root)[0].focus();
      await userEvent.keyboard('{ArrowRight}');
      await settle(fixture);
      expect(document.activeElement).toBe(tabsOf(root)[1]);
      host.items.set(['a', 'c']);
      await settle(fixture);
      expect(document.activeElement).not.toBe(document.body);
      expect(focusedLabel()).toBe('a');
      await userEvent.keyboard('{ArrowRight}');
      await settle(fixture);
      expect(focusedLabel()).toBe('c');
      expect(selectedLabels(root)).toEqual(['c']);
    });

    it('leaves focus alone when focus has moved elsewhere before a tab is removed', async () => {
      const { fixture, host, root } = mount(
        `<ck-tabs [value]="value()"><ck-tab-list aria-label="Source">
           @for (item of items(); track item) {<ck-tab [value]="item">{{ item }}</ck-tab>}
         </ck-tab-list></ck-tabs><button id="outside">Outside</button>`,
      );
      await settle(fixture);
      tabsOf(root)[2].focus();
      query(root, '#outside').focus();
      host.items.set(['a', 'b']);
      await settle(fixture);
      expect(document.activeElement).toBe(query(root, '#outside'));
    });
  });

  describe('manual activation', () => {
    it('moves focus without selecting, and selects on Enter or Space', async () => {
      const { fixture, host, root } = mount(GROUP('activation="manual"'));
      host.value.set('a');
      await settle(fixture);
      tabsOf(root)[0].focus();
      await userEvent.keyboard('{ArrowRight}');
      await settle(fixture);
      expect(focusedLabel()).toBe('Beta');
      expect(selectedLabels(root)).toEqual(['Alpha']);
      expect(shownPanels(root)).toEqual(['Shared']);
      expect(host.emitted).toEqual([]);
      await userEvent.keyboard('{Enter}');
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Beta']);
      await userEvent.keyboard('{ArrowRight}');
      await userEvent.keyboard(' ');
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Gamma']);
      expect(host.emitted).toEqual(['b', 'c']);
    });

    it('wraps, jumps with Home and End and skips disabled tabs without selecting', async () => {
      const { fixture, host, root } = mount(WITH_DISABLED('activation="manual"'));
      host.value.set('a');
      await settle(fixture);
      tabsOf(root)[0].focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(focusedLabel()).toBe('Gamma');
      await userEvent.keyboard('{End}');
      expect(focusedLabel()).toBe('Delta');
      await userEvent.keyboard('{ArrowRight}');
      expect(focusedLabel()).toBe('Alpha');
      await userEvent.keyboard('{ArrowLeft}{Home}');
      expect(focusedLabel()).toBe('Alpha');
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      expect(selectedLabels(root)).toEqual(['Alpha']);
    });

    it('keeps the one tab stop on the selected tab while focus has moved on', async () => {
      const { fixture, host, root } = mount(`${BEFORE}${GROUP('activation="manual"')}${AFTER}`);
      host.value.set('a');
      await settle(fixture);
      tabsOf(root)[0].focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(tabsOf(root).map((tab) => tab.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
      query(root, '#after').focus();
      await userEvent.tab({ shift: true });
      expect(document.activeElement).toBe(query(root, 'ck-tab-panel'));
      await userEvent.tab({ shift: true });
      expect(focusedLabel()).toBe('Alpha');
    });

    it('selects on a click, as it does in automatic mode', async () => {
      const { fixture, root } = mount(GROUP('activation="manual"'));
      await settle(fixture);
      await userEvent.click(tabsOf(root)[2]);
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Gamma']);
    });

    it('switches behaviour when the input changes', async () => {
      const { fixture, root } = mount(
        `<ck-tabs [activation]="manual ? 'manual' : 'auto'"><ck-tab-list aria-label="Source">
           <ck-tab value="a">Alpha</ck-tab><ck-tab value="b">Beta</ck-tab></ck-tab-list></ck-tabs>`,
        (host) => Object.assign(host, { manual: true }),
      );
      await settle(fixture);
      tabsOf(root)[0].focus();
      await userEvent.keyboard('{ArrowRight}');
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Alpha']);
      (fixture.componentInstance as unknown as { manual: boolean }).manual = false;
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      await settle(fixture);
      await userEvent.keyboard('{ArrowLeft}');
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Alpha']);
      await userEvent.keyboard('{ArrowRight}');
      await settle(fixture);
      expect(selectedLabels(root)).toEqual(['Beta']);
    });
  });

  describe('right-to-left text', () => {
    it('swaps ArrowLeft and ArrowRight and keeps Home and End', async () => {
      document.body.dir = 'rtl';
      const { fixture, root } = mount(GROUP());
      await settle(fixture);
      tabsOf(root)[0].focus();
      await userEvent.keyboard('{ArrowLeft}');
      expect(focusedLabel()).toBe('Beta');
      await userEvent.keyboard('{ArrowRight}{ArrowRight}');
      expect(focusedLabel()).toBe('Gamma');
      await userEvent.keyboard('{Home}');
      expect(focusedLabel()).toBe('Alpha');
      await userEvent.keyboard('{End}');
      expect(focusedLabel()).toBe('Gamma');
    });

    it('lays the tabs out right to left', async () => {
      document.body.dir = 'rtl';
      const { fixture, root } = mount(GROUP());
      await settle(fixture);
      const [first, , last] = tabsOf(root).map((tab) => tab.getBoundingClientRect());
      expect(first.left).toBeGreaterThan(last.left);
    });
  });
});
