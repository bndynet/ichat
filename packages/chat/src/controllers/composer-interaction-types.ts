/** Internal interaction kinds supported by the shared composer queue. */
export type InternalComposerInteractionKind = "confirmation" | `x-${string}`;

/**
 * Data-only request stored by the internal composer interaction controller.
 * UI templates, HTML, and DOM nodes stay outside the queue contract.
 */
export interface InternalComposerInteractionRequest {
  id: string;
  kind: InternalComposerInteractionKind;
  payload?: unknown;
  ariaLabel?: string;
}
