/**
 * Shared Lit CSSResult for chat-details collapsible styles.
 *
 * By exporting as a module-level constant, Lit's adoptStyles cache ensures the
 * underlying CSSStyleSheet is created ONCE and adopted (shared) by every shadow
 * root that includes it in static styles — CSS text is parsed only once regardless
 * of how many components use it.
 *
 * Usage:
 *   import { chatDetailsStyles } from '../styles/chat-details-result.js';
 *   static styles = [unsafeCSS(ownStyles), chatDetailsStyles];
 */
import { unsafeCSS } from 'lit';
import styles from './chat-details-standalone.scss';

export const chatDetailsStyles = unsafeCSS(styles);
