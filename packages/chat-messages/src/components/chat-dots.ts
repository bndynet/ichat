import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from '../styles/chat-dots.scss';

/**
 * Animated bouncing dots. Used by reasoning ("Thinking…") and the pending
 * indicator before the first response part arrives.
 *
 * @cssprop --chat-dots-color - Dot color (default: currentColor)
 * @cssprop --chat-dots-size  - Dot diameter (default: 4px)
 * @cssprop --chat-dots-gap   - Gap between dots (default: 3px)
 */
@customElement('i-chat-dots')
export class ChatDots extends LitElement {
  static styles = unsafeCSS(styles);

  /** Accessible label for the animation. */
  @property() label = '';

  render() {
    return html`
      <span class="dots" role="status" aria-label=${this.label || nothing}>
        <span class="dots__dot"></span>
        <span class="dots__dot"></span>
        <span class="dots__dot"></span>
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'i-chat-dots': ChatDots;
  }
}
