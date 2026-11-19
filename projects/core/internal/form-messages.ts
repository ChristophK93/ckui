import { InjectionToken, Signal } from '@angular/core';

/** What `ck-error` asks of the control or field around it. Internal. */
export interface CkMessagesContext {
  readonly errorsVisible: Signal<boolean>;
}

export const CK_MESSAGES_CONTEXT = new InjectionToken<CkMessagesContext>('CK_MESSAGES_CONTEXT');
