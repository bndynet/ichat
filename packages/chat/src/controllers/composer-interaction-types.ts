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

/** Request accepted by the controller before ID normalization. */
export type InternalComposerInteractionRequestInput = Omit<
  InternalComposerInteractionRequest,
  "id"
> & {
  id?: string;
  signal?: AbortSignal;
};

/** Internal cancellation reason; the public API can narrow this later. */
export type InternalComposerInteractionCancelReason = string;

/** Deterministic result produced for every accepted request. */
export type InternalComposerInteractionResult =
  | {
      id: string;
      status: "completed";
      value: unknown;
      request: InternalComposerInteractionRequest;
    }
  | {
      id: string;
      status: "cancelled";
      reason: InternalComposerInteractionCancelReason;
      request: InternalComposerInteractionRequest;
    };

/** Snapshot emitted whenever the active item or queue changes. */
export interface InternalComposerInteractionChangeDetail {
  active: InternalComposerInteractionRequest | null;
  queue: InternalComposerInteractionRequest[];
  queueLength: number;
}
