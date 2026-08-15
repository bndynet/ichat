/**
 * ConfirmationController — compatibility adapter over the shared composer
 * interaction queue.
 *
 * It preserves the public confirmation Promise and event contracts while the
 * underlying controller owns FIFO ordering, cancellation, and settlement.
 */

import type { ReactiveController, ReactiveControllerHost } from "lit";
import type {
  ChatConfirmationRequest,
  ChatConfirmationResolvedRequest,
  ChatConfirmationAction,
  ChatConfirmationResult,
  ChatConfirmationChangeDetail,
} from "../components/chat.js";
import { ComposerInteractionController } from "./composer-interaction-controller.js";
import type {
  InternalComposerInteractionChangeDetail,
  InternalComposerInteractionRequest,
  InternalComposerInteractionResult,
} from "./composer-interaction-types.js";

const USER_CANCEL_REASON = "confirmation-user-cancel";
const CLEAR_CANCEL_REASON = "confirmation-cleared";

export type PendingConfirmation = {
  request: ChatConfirmationResolvedRequest;
};

export class ConfirmationController implements ReactiveController {
  private readonly _host: ReactiveControllerHost & {
    dispatchEvent(event: Event): boolean;
    requestUpdate(): void;
  };
  private readonly _composer: ComposerInteractionController;
  private readonly _mappedResults = new WeakMap<
    InternalComposerInteractionResult,
    ChatConfirmationResult
  >();
  private _idSeq = 0;

  constructor(
    host: ConfirmationController["_host"],
    composer = new ComposerInteractionController(host),
  ) {
    this._host = host;
    this._composer = composer;
    this._composer.addEventListener("result", this._handleComposerResult);
    this._composer.addEventListener("change", this._handleComposerChange);
    host.addController(this);
  }

  hostConnected(): void {
    /* no-op */
  }

  hostDisconnected(): void {
    // The shared ComposerInteractionController owns disconnect cancellation.
  }

  /** The currently active confirmation wrapper, or null. */
  get active(): PendingConfirmation | null {
    const request = this.activeRequest;
    return request ? { request } : null;
  }

  /** The active confirmation request (or null), for template binding. */
  get activeRequest(): ChatConfirmationResolvedRequest | null {
    return this._confirmationRequest(this._composer.active);
  }

  /** Number of queued confirmations, excluding the active item. */
  get queueLength(): number {
    return this._confirmationQueue(this._composer.queue).length;
  }

  // ── Public API ─────────────────────────────────

  /**
   * Enqueue a confirmation through the shared composer interaction FIFO.
   */
  request(req: ChatConfirmationRequest): Promise<ChatConfirmationResult> {
    const normalized: ChatConfirmationResolvedRequest = {
      ...req,
      id: req.id?.trim() || this._nextId(),
      variant: req.variant ?? "default",
    };

    return this._composer
      .request({
        id: normalized.id,
        kind: "confirmation",
        payload: normalized,
        ariaLabel: normalized.title,
      })
      .then(
        (result) => this._mappedResults.get(result) ?? this._resultFor(result),
      );
  }

  /** Resolve the active confirmation and advance the shared queue. */
  settle(action: ChatConfirmationAction): void {
    const request = this.activeRequest;
    if (!request) return;

    if (action === "confirm") {
      this._composer.completeActive(request.id, action);
    } else {
      this._composer.cancel(request.id, USER_CANCEL_REASON);
    }
  }

  /** Cancel active and queued confirmations without touching custom items. */
  cancelAll(): void {
    this._composer.cancelWhere(
      (request) => request.kind === "confirmation",
      CLEAR_CANCEL_REASON,
    );
  }

  // ── Internals ─────────────────────────────────────

  private readonly _handleComposerResult = (event: Event): void => {
    const internal = (event as CustomEvent<InternalComposerInteractionResult>)
      .detail;
    if (internal.request.kind !== "confirmation") return;

    const result = this._resultFor(internal);
    this._mappedResults.set(internal, result);

    const userDecision =
      internal.status === "completed" ||
      (internal.status === "cancelled" &&
        internal.reason === USER_CANCEL_REASON);
    if (!userDecision) return;

    this._host.dispatchEvent(
      new CustomEvent<ChatConfirmationResult>("confirmation-decision", {
        detail: result,
        bubbles: true,
        composed: true,
      }),
    );
  };

  private readonly _handleComposerChange = (event: Event): void => {
    const internal = (
      event as CustomEvent<InternalComposerInteractionChangeDetail>
    ).detail;
    const queue = this._confirmationQueue(internal.queue);

    this._host.dispatchEvent(
      new CustomEvent<ChatConfirmationChangeDetail>("confirmation-change", {
        detail: {
          active: this._confirmationRequest(internal.active),
          queue,
          queueLength: queue.length,
        },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private _confirmationQueue(
    requests: InternalComposerInteractionRequest[],
  ): ChatConfirmationResolvedRequest[] {
    return requests.flatMap((request) => {
      const confirmation = this._confirmationRequest(request);
      return confirmation ? [confirmation] : [];
    });
  }

  private _confirmationRequest(
    request: InternalComposerInteractionRequest | null,
  ): ChatConfirmationResolvedRequest | null {
    if (!request || request.kind !== "confirmation") return null;
    return request.payload as ChatConfirmationResolvedRequest;
  }

  private _resultFor(
    result: InternalComposerInteractionResult,
  ): ChatConfirmationResult {
    const request = this._confirmationRequest(result.request);
    if (!request) {
      throw new Error("Expected a confirmation interaction result.");
    }

    const action: ChatConfirmationAction =
      result.status === "completed" && result.value === "confirm"
        ? "confirm"
        : "cancel";
    return {
      id: request.id,
      action,
      confirmed: action === "confirm",
      request,
    };
  }

  private _nextId(): string {
    this._idSeq += 1;
    return `confirm-${Date.now().toString(36)}-${this._idSeq.toString(36)}`;
  }
}
