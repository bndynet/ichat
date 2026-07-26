/**
 * SlotForwardingController — observes light-DOM children so slots
 * added after first render (e.g. Vue `onMounted`) trigger a re-render
 * and the host can detect whether a custom input slot is in use.
 */

import type { ReactiveController, ReactiveControllerHost } from 'lit';

export class SlotForwardingController implements ReactiveController {
  private _host: ReactiveControllerHost & HTMLElement;
  private _observer?: MutationObserver;

  /** True when a `<* slot="input">` element exists in the light DOM. */
  hasCustomInput = false;

  constructor(host: SlotForwardingController['_host']) {
    this._host = host;
    host.addController(this);
  }

  hostConnected(): void {
    this._sync();
    this._observer = new MutationObserver(() => {
      this._sync();
      this._host.requestUpdate();
    });
    this._observer.observe(this._host, { childList: true, subtree: false });
  }

  hostDisconnected(): void {
    this._observer?.disconnect();
    this._observer = undefined;
  }

  private _sync(): void {
    this.hasCustomInput = !!this._host.querySelector('[slot="input"]');
  }
}
