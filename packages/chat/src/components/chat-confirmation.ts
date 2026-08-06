import { LitElement, html, unsafeCSS, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { setVersionAttribute } from "../version.js";
import type { ChatConfirmationResolvedRequest } from "./chat.js";
import type { ConfirmationLabels } from "@bndynet/ichat-messages";
import styles from "../styles/chat-confirmation.scss";

/**
 * `<i-chat-confirmation>` — A modal confirmation dialog that replaces the
 * composer area while a confirmation is active.
 *
 * @fires confirmation-settle — `{ detail: { action: 'confirm' | 'cancel' } }`
 */
@customElement("i-chat-confirmation")
export class ChatConfirmation extends LitElement {
  static styles = unsafeCSS(styles);

  /** The active confirmation request to display. */
  @property({ attribute: false }) request!: ChatConfirmationResolvedRequest;

  /** Localized UI strings; falls back to English when omitted. */
  @property({ attribute: false }) labels?: ConfirmationLabels;

  override connectedCallback(): void {
    super.connectedCallback();
    setVersionAttribute(this);
  }

  protected firstUpdated(): void {
    // Auto-focus the confirm button when the dialog appears
    requestAnimationFrame(() => {
      this.renderRoot
        .querySelector<HTMLElement>(".chat-confirmation__btn--confirm")
        ?.focus();
    });
  }

  private _handleKeydown(e: KeyboardEvent): void {
    const section = e.currentTarget as HTMLElement;

    if (e.key === "Escape") {
      e.preventDefault();
      this._settle("cancel");
      return;
    }

    // Focus trap: wrap Tab / Shift+Tab within the dialog
    if (e.key === "Tab") {
      const focusable = section.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  private _settle(action: "confirm" | "cancel"): void {
    this.dispatchEvent(
      new CustomEvent("confirmation-settle", {
        detail: { action },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _formatDetails(details: unknown): string {
    if (details == null) return "";
    if (typeof details === "string") return details;
    try {
      return JSON.stringify(details, null, 2);
    } catch {
      return String(details);
    }
  }

  private _renderDetails(request: ChatConfirmationResolvedRequest) {
    const details = this._formatDetails(request.details);
    if (!details) return nothing;
    const labels = this.labels;

    if (typeof request.details === "string") {
      return html`<div class="chat-confirmation__details-text">
        ${details}
      </div>`;
    }

    return html`
      <details class="chat-confirmation__details">
        <summary>${labels?.details ?? "Details"}</summary>
        <pre>${details}</pre>
      </details>
    `;
  }

  render() {
    const request = this.request;
    const labels = this.labels;
    const variant = request.variant ?? "default";
    const requiredLabel = (
      request.requiredLabel ??
      labels?.required ??
      ""
    ).trim();

    return html`
      <section
        class="chat-confirmation chat-confirmation--${variant}"
        role="alertdialog"
        aria-modal="true"
        aria-label=${request.title}
        @keydown=${this._handleKeydown}
      >
        <div class="chat-confirmation__body">
          ${
            requiredLabel
              ? html`<div class="chat-confirmation__eyebrow">
                  ${requiredLabel}
                </div>`
              : nothing
          }
          <div class="chat-confirmation__title">${request.title}</div>
          ${
            request.description
              ? html`<div class="chat-confirmation__description">
                  ${request.description}
                </div>`
              : nothing
          }
          ${this._renderDetails(request)}
        </div>
        <div class="chat-confirmation__actions">
          <button
            type="button"
            class="chat-confirmation__btn chat-confirmation__btn--cancel"
            @click=${() => this._settle("cancel")}
          >
            ${request.cancelLabel || labels?.cancel || "Cancel"}
          </button>
          <button
            type="button"
            class="chat-confirmation__btn chat-confirmation__btn--confirm"
            @click=${() => this._settle("confirm")}
          >
            ${request.confirmLabel || labels?.confirm || "Confirm"}
          </button>
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "i-chat-confirmation": ChatConfirmation;
  }
}
