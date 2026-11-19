import { TABS } from './tabs-host';

/** The group the specs start from: `value` bound both ways, every change recorded. */
export const GROUP = (attributes = '', panel?: string) =>
  TABS(
    `[value]="value()" (valueChange)="value.set($event); emitted.push($event)" ${attributes}`,
    panel,
  );

/** Three tabs, the second one disabled, and a fourth. */
export const WITH_DISABLED = (attributes = '') =>
  `<ck-tabs [value]="value()" (valueChange)="value.set($event); emitted.push($event)" ${attributes}>
     <ck-tab-list aria-label="Source">
       <ck-tab value="a">Alpha</ck-tab>
       <ck-tab value="b" disabled>Beta</ck-tab>
       <ck-tab value="c">Gamma</ck-tab>
       <ck-tab value="d">Delta</ck-tab>
     </ck-tab-list>
     <ck-tab-panel>Shared</ck-tab-panel>
   </ck-tabs>`;

/** One panel per tab, each with lazy content that carries a probe. */
export const PER_TAB = (attributes = '') =>
  `<ck-tabs [value]="value()" (valueChange)="value.set($event); emitted.push($event)" ${attributes}>
     <ck-tab-list aria-label="Source">
       <ck-tab value="a">Alpha</ck-tab>
       <ck-tab value="b">Beta</ck-tab>
       <ck-tab value="c">Gamma</ck-tab>
     </ck-tab-list>
     <ck-tab-panel value="a"><ng-template ckTabContent><i ckProbe>Panel A</i></ng-template></ck-tab-panel>
     <ck-tab-panel value="b"><ng-template ckTabContent><i ckProbe>Panel B</i></ng-template></ck-tab-panel>
     <ck-tab-panel value="c">Panel C</ck-tab-panel>
   </ck-tabs>`;
