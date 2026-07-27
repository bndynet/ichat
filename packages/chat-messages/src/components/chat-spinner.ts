import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from '../styles/chat-spinner.scss';

/**
 * CSS border spinner. Used by the pending indicator and other loading states.
 *
 * @cssprop --chat-spinner-size   - Diameter (default: 16px)
 * @cssprop --chat-spinner-width  - Border width (default: 2px)
 * @cssprop --chat-spinner-track  - Track color (default: currentColor at 20% opacity)
 * @cssprop --chat-spinner-color  - Spinning segment color (default: currentColor)
 * @cssprop --chat-spinner-speed  - Animation duration (default: 0.6s)
 */
@customElement('i-chat-spinner')
export class ChatSpinner extends LitElement {
  static styles = unsafeCSS(styles);

  /** Accessible label. */
  @property() label = '';

  render() {
    return html`<span class="spinner" role="status" aria-label=${this.label || nothing}></span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'i-chat-spinner': ChatSpinner;
  }
}
