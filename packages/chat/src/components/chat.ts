import { LitElement, html, unsafeCSS, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { setVersionAttribute } from '../version.js';
import type {
  ChatPartActionDetail,
  ChatLinkClickDetail,
  ChatMessage,
  ChatConfig,
  BlockRenderer,
  ExtendedMessagePart,
  MessagesChangeDetail,
  MessagePartUpdateResult,
  ToolCallUpdateResult,
  TodoItemUpdateResult,
  MessagePartUpdateEventResult,
  TodoItemUpdateEventResult,
} from '@bndynet/ichat-messages';
import {
  ChatMessages,
  buildMessagesChangeDetail,
  resolveLabels,
  removeMessageById,
  clearMessages,
} from '@bndynet/ichat-messages';
import { ChatInput } from '@bndynet/ichat-input';
import { ChatRunController } from '../controllers/chat-run-controller.js';
import type { ChatRunOptions } from '../controllers/chat-run-controller.js';
import { CommandQueue } from '../controllers/command-queue.js';
import { ConfirmationController } from '../controllers/confirmation-controller.js';
import { SlotForwardingController } from '../controllers/slot-forwarding-controller.js';
import {
  ChatMessageStore,
  type ChatMessageStoreChange,
} from '../state/chat-message-store.js';
import './chat-confirmation.js';
import {
  createMiddlewareChain,
  type ChatMiddleware,
  type MiddlewareChain,
} from '../middleware/chat-middleware.js';
import type { ChatPlugin } from '../middleware/chat-plugin.js';

import styles from '../styles/chat.scss';

void ChatMessages;
void ChatInput;

export type {
  ChatMessage,
  ChatConfig,
  BlockRenderer,
  ChatPartActionDetail,
  ChatLinkClickDetail,
};

export type ChatConfirmationVariant = 'default' | 'danger';

export type ChatMessageMode = 'uncontrolled' | 'controlled';

export interface ChatConfirmationRequest {
  id?: string;
  title: string;
  description?: string;
  details?: unknown;
  requiredLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ChatConfirmationVariant;
  payload?: unknown;
}

export type ChatConfirmationResolvedRequest = ChatConfirmationRequest & { id: string };
export type ChatConfirmationAction = 'confirm' | 'cancel';

export interface ChatConfirmationResult {
  id: string;
  action: ChatConfirmationAction;
  confirmed: boolean;
  request: ChatConfirmationResolvedRequest;
}

export interface ChatConfirmationChangeDetail {
  active: ChatConfirmationResolvedRequest | null;
  queue: ChatConfirmationResolvedRequest[];
  queueLength: number;
}

/**
 * `<i-chat>` — A complete, drop-in chat Web Component.
 *
 * @typeParam TExtraParts — Optional mapping of custom `x-*` part types to their
 *   data shapes.  When provided, `chat.messages` carries fully typed custom parts,
 *   enabling autocomplete and type-checking for host-defined extensions.
 *
 * @example
 * ```ts
 * type MyParts = { 'x-weather': { temp: number; humidity: number } };
 * const chat = document.querySelector('i-chat') as Chat<MyParts>;
 * chat.messages[0].parts.forEach(p => {
 *   if (p.type === 'x-weather') p.data.temp; // typed as number
 * });
 * ```
 *
 * Bundles `<i-chat-messages>` and `<i-chat-input>`. Optional fenced-block
 * renderers (e.g. from `@bndynet/ichat-renderers`) should be registered with
 * `registerCodeRenderer` from `@bndynet/ichat` before messages use those blocks.
 *
 * ## Slots
 *
 * | Slot                 | Description                                        |
 * |----------------------|----------------------------------------------------|
 * | `self-avatar`        | Custom avatar for `role: self` messages            |
 * | `peer-avatar`        | Custom avatar for `role: peer` messages            |
 * | `assistant-avatar`   | Custom avatar for assistant/system messages        |
 * | `message-actions`    | Action buttons shown on each message                |
 * | `reasoning-header`   | Custom header for reasoning/thinking blocks         |
 * | `empty`              | Content shown when there are no messages            |
 * | `actions`            | Toolbar row **inside** the default `<i-chat-input>` (left side) |
 * | `input`              | Replace the default `<i-chat-input>` entirely           |
 *
 * Voice-related props `showVoiceInput`, `voiceLang`, and `voiceListeningLabel` are forwarded to
 * the default `<i-chat-input>` (same behavior as using that element directly).
 *
 * @fires send - `{ detail: { content: string } }` when user submits a message
 * @fires cancel - Fired when user clicks cancel during streaming
 * @fires messages-change - `{ detail: MessagesChangeDetail }` after an uncontrolled mutation commits
 *   or a controlled mutation is proposed. Controlled events are cancelable; call `preventDefault()`
 *   to reject a proposal. Direct external `messages = […]` assignments do **not** emit this event.
 * @fires streaming-change - `{ detail: { streaming: boolean } }` when streaming state changes
 * @fires busy-change - `{ detail: { busy: boolean } }` when send preprocessing or streaming starts/stops
 * @fires message-action - `{ detail: { action: string, message: ChatMessage } }` from message action buttons
 * @fires part-action - `{ detail: ChatPartActionDetail }` unified action from rendered message parts
 * @fires link-click - `{ detail: ChatLinkClickDetail }` when a rendered message link is clicked; cancelable with `preventDefault()`
 * @fires confirmation-change - `{ detail: { active, queue, queueLength } }` when the active confirmation or queue changes
 * @fires confirmation-decision - `{ detail: ChatConfirmationResult }` when the user confirms or cancels the active confirmation
 *
 * @example
 * ```html
 * <i-chat></i-chat>
 * ```
 *
 * @example Custom input slot
 * ```html
 * <i-chat>
 *   <div slot="input">
 *     <my-custom-input></my-custom-input>
 *   </div>
 * </i-chat>
 * ```
 *
 * @example Default composer toolbar (`i-chat-input` actions)
 * ```html
 * <i-chat>
 *   <div slot="actions" style="display:flex;gap:8px;align-items:center">
 *     <button type="button">+</button>
 *     <span>Tools</span>
 *   </div>
 * </i-chat>
 * ```
 */
@customElement('i-chat')
export class Chat<TExtraParts extends Record<`x-${string}`, unknown> = {}> extends LitElement {
  static styles = unsafeCSS(styles);

  /**
   * Ordered list of chat messages.  When `TExtraParts` is provided, the
   * `parts` array carries fully typed custom parts so host-defined `x-*`
   * extensions enjoy autocomplete and type-checking.
   */
  @property({ type: Array }) messages: Array<ChatMessage & { parts: ExtendedMessagePart<TExtraParts>[] }> = [];

  @property({ type: Object }) config: ChatConfig = {};
  @property() emptyText = '';
  /**
   * Composer placeholder. When empty (default), the localized placeholder from
   * `config.locale` / `config.labels.composer` is used; set it to override.
   */
  @property() placeholder = '';
  /** Disable the input area. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /**
   * When true (default), the default `<i-chat-input>` shows a voice button if the browser
   * supports speech recognition. When false, the voice button is never shown.
   */
  @property({ type: Boolean, reflect: true, attribute: 'show-voice-input' }) showVoiceInput = true;

  /** Passed to the default `<i-chat-input>` for speech recognition language (BCP 47). */
  @property({ attribute: 'voice-lang' }) voiceLang = '';

  /**
   * Passed to the default `<i-chat-input>` — label on the listening overlay.
   * When empty (default), the localized string from `config.locale` /
   * `config.labels.composer` is used.
   */
  @property({ attribute: 'voice-listening-label' }) voiceListeningLabel = '';

  /** Passed to the default `<i-chat-input>` — enables `console.debug` speech logs. */
  @property({ type: Boolean, reflect: true, attribute: 'voice-diagnostics' }) voiceDiagnostics = false;

  /**
   * Message ownership mode.
   *
   * - `uncontrolled` (default): `<i-chat>` owns `messages` — imperative
   *   methods update `chat.messages` directly.  `messages-change` fires
   *   with `committed: true`.
   * - `controlled`: the host owns `messages`.  Imperative methods compute
   *   the next state but do **not** assign `chat.messages`.  They emit
   *   a cancelable `messages-change` with `committed: false`. The host may
   *   write `event.detail.messages` back synchronously or asynchronously.
   *   Until write-back, subsequent mutations build on the latest proposal.
   *   Call `event.preventDefault()` to reject a proposal.
   *
   * Changing the mode after messages exist is safe — the next mutation
   * uses the new mode.  Switching from `controlled` back to `uncontrolled`
   * before the next mutation is also safe.
   */
  @property({ attribute: 'message-mode' }) messageMode: ChatMessageMode = 'uncontrolled';

  @query('i-chat-messages') private _messages!: ChatMessages;
  @query('i-chat-input') private _input!: ChatInput;

  /**
   * True while a user submission is being preprocessed or an assistant message
   * is streaming. This is derived state: consumers should observe it rather
   * than assign it.
   */
  get busy(): boolean {
    return this._submitting || this._streaming;
  }

  @state() private _submitting = false;
  @state() private _streaming = false;

  private _slotCtrl = new SlotForwardingController(this);

  // ── Controllers ──────────────────────────────────────────────────

  private _confirmCtrl = new ConfirmationController(this);

  private _store = new ChatMessageStore({
    getMessages: () => this.messages as unknown as ChatMessage[],
    getMode: () => this.messageMode,
    commit: (change) => this._commitStoreChange(change),
  });

  /** @internal Plain `ChatMessage[]` view for interop with pure helpers and child component. */
  private get _msgs(): ChatMessage[] {
    return this.messages as unknown as ChatMessage[];
  }

  /** Apply a Store proposal according to the host's current ownership mode. */
  private _commitStoreChange(change: ChatMessageStoreChange): boolean {
    const { messages, previousMessages, controlled, ...context } = change;

    if (!controlled) {
      this.messages = messages as unknown as typeof this.messages;
      this._setStreamingState(messages.some((message) => message.streaming && !message.error));
    }

    const accepted = this.dispatchEvent(
      new CustomEvent<MessagesChangeDetail>('messages-change', {
        detail: {
          ...buildMessagesChangeDetail(messages, previousMessages, {
            ...context,
            source: 'i-chat',
          }),
          controlled,
          committed: !controlled,
        },
        bubbles: true,
        composed: true,
        cancelable: controlled,
      }),
    );

    if (controlled) {
      const derivedMessages = accepted ? messages : previousMessages;
      this._setStreamingState(
        derivedMessages.some((message) => message.streaming && !message.error),
      );
    } else if (this._msgs !== messages) {
      this._setStreamingState(this._msgs.some((message) => message.streaming && !message.error));
    }

    return accepted;
  }

  // ── Ready contract (CHG-06) ───────────────────────────────────────

  /** Resolved after the first render when child queries are available. */
  private _readyResolver!: () => void;
  private readonly _readyPromise: Promise<void>;

  /** Presentation commands queued before the first render. */
  private _pendingCommands = new CommandQueue();

  /**
   * Promise that resolves once the component is fully rendered and child
   * elements (`i-chat-messages`, `i-chat-input`) are queryable.
   *
   * Data methods (addMessage, updateMessage, cancel, …) are safe to call
   * before `ready` — only presentation methods that touch the DOM may
   * need to `await chat.ready`.
   */
  get ready(): Promise<void> {
    return this._readyPromise;
  }

  // ── Middleware & Plugin lifecycle ─────────────────────────────────

  private readonly _middlewareChain: MiddlewareChain = createMiddlewareChain();
  private readonly _pluginDisposers = new Map<string, () => void>();

  /**
   * Register a middleware or plugin.
   *
   * - `ChatMiddleware`: Returns a disposal function to unregister. Duplicate
   *   middleware names are allowed (each runs independently in FIFO order).
   * - `ChatPlugin`: Calls `plugin.install(chat)` and returns its disposal
   *   function. Duplicate plugin names are rejected — only the first
   *   registration is kept and a warning is emitted.
   *
   * All plugins are automatically disposed on component disconnect.
   *
   * @example
   * ```ts
   * // Middleware
   * const dispose = chat.use({
   *   name: 'logger',
   *   beforeSend: (content) => {
   *     console.log('Sending:', content);
   *     return content;
   *   },
   * });
   *
   * // Plugin
   * chat.use({
   *   name: 'my-plugin',
   *   install(chat) { ... },
   * });
   * ```
   */
  use(middlewareOrPlugin: ChatMiddleware | ChatPlugin): () => void {
    // Plugin
    if ('install' in middlewareOrPlugin) {
      const plugin = middlewareOrPlugin as ChatPlugin;
      if (this._pluginDisposers.has(plugin.name)) {
        console.warn(
          `[i-chat] Plugin "${plugin.name}" is already installed. Keeping the first installation.`,
        );
        return () => {}; // no-op disposer for the rejected duplicate
      }
      const teardown = plugin.install(this);
      const dispose = () => {
        try { teardown?.(); } catch { /* teardown must not throw */ }
        this._pluginDisposers.delete(plugin.name);
      };
      this._pluginDisposers.set(plugin.name, dispose);
      return dispose;
    }
    // Middleware
    return this._middlewareChain.use(middlewareOrPlugin as ChatMiddleware);
  }

  /**
   * Remove a plugin by name and run its teardown.
   *
   * @returns `true` if a plugin with that name was installed and removed,
   *   `false` if no such plugin was found.
   */
  removePlugin(name: string): boolean {
    const dispose = this._pluginDisposers.get(name);
    if (dispose) {
      dispose();
      return true;
    }
    return false;
  }

  constructor() {
    super();
    this._readyPromise = new Promise((resolve) => {
      this._readyResolver = resolve;
    });
  }

  // ── Message-state delegation ─────────────────────────────────────
  //
  // All pure data mutations are delegated to ChatMessageStore.
  // Only DOM-touching methods (cancel, removeMessage, clear) and
  // presentation proxy methods stay in this component.

  addMessage(message: ChatMessage): void {
    const processed = this._middlewareChain.executeAfterMessageAdded(message);
    if (processed == null) return; // dropped by middleware
    this._store.addMessage(processed);
  }

  updateMessage(id: string, partial: Partial<ChatMessage>): void {
    this._store.updateMessage(id, partial);
  }

  appendPart(messageId: string, part: Parameters<ChatMessages['appendPart']>[1]): void {
    const processed = this._middlewareChain.executeBeforeAppendPart(messageId, part);
    if (processed == null) return; // dropped by middleware
    this._store.appendPart(messageId, processed);
  }

  updatePart(
    messageId: string,
    partId: string,
    patch: Parameters<ChatMessages['updatePart']>[2],
  ): void {
    this._store.updatePart(messageId, partId, patch);
  }

  removeMessage(id: string): void {
    this._store.commitMessages(removeMessageById(this._store.messages, id), {
      reason: 'message:remove',
      messageId: id,
    });
    if (this._messages) this._messages.clearReplyMessage(id);
  }

  clear(): void {
    this._store.commitMessages(clearMessages(), { reason: 'message:clear' });
    this._pendingCommands.clear();
    if (this._messages) {
      this._messages._clearPresentation();
    }
  }

  addErrorMessage(error: string, text = ''): void {
    this._middlewareChain.executeOnError(error);
    const msg: ChatMessage = {
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'assistant',
      parts: text ? [{ type: 'text', id: `err-text-${Date.now()}`, text }] : [],
      error,
      timestamp: Date.now(),
    };
    const processed = this._middlewareChain.executeAfterMessageAdded(msg);
    if (processed == null) return; // dropped by middleware
    this._store.addMessage(processed);
  }

  // ── Diagnostic / tool / todo / SSE (CHG-04) ──────────────────────

  tryUpdatePart(
    messageId: string,
    partId: string,
    patch: Parameters<ChatMessages['tryUpdatePart']>[2],
  ): MessagePartUpdateResult {
    return this._store.tryUpdatePart(messageId, partId, patch);
  }

  tryUpdateToolCall(
    messageId: string,
    partId: string,
    patch: Parameters<ChatMessages['tryUpdateToolCall']>[2],
  ): ToolCallUpdateResult {
    return this._store.tryUpdateToolCall(messageId, partId, patch);
  }

  tryUpdateTodoItem(
    messageId: string,
    partId: string,
    itemId: string,
    patch: Parameters<ChatMessages['tryUpdateTodoItem']>[3],
    revision?: number,
  ): TodoItemUpdateResult {
    return this._store.tryUpdateTodoItem(messageId, partId, itemId, patch, revision);
  }

  tryApplyTodoItemUpdateEvent(
    event: Parameters<ChatMessages['tryApplyTodoItemUpdateEvent']>[0],
  ): TodoItemUpdateEventResult {
    return this._store.tryApplyTodoItemUpdateEvent(event);
  }

  tryApplyMessagePartUpdateEvent(
    event: Parameters<ChatMessages['tryApplyMessagePartUpdateEvent']>[0],
  ): MessagePartUpdateEventResult {
    return this._store.tryApplyMessagePartUpdateEvent(event);
  }

  // ── Cancellation (CHG-05) ────────────────────────────────────────

  cancelMessage(id: string, hint?: string): void {
    if (this._messages) {
      this._messages.freezeMessageAnimation(id);
    }
    this._store.cancelMessage(id, hint);
  }

  cancel(hint?: string): void {
    const streamingMsg = this._store.messages.find((m) => m.streaming && !m.error);
    if (streamingMsg) this.cancelMessage(streamingMsg.id, hint);
  }

  // ── Presentation proxy methods (CHG-06) ───────────────────────────
  //
  // Before the first render these methods queue lightweight commands
  // that replay once child elements are available.  After readiness
  // they delegate directly to the child.

  private _isChildReady(): boolean {
    return !!this._messages;
  }

  showError(text: string, options?: { duration?: number }): void {
    this._middlewareChain.executeOnError(text);
    if (!this._isChildReady()) {
      // Replace any previous pending error with the newest.
    this._pendingCommands.clear();
    this._pendingCommands.removeByKind('show-error', 'dismiss-error');
    this._pendingCommands.enqueue({ kind: 'show-error', text, options });
      return;
    }
    this._messages.showError(text, options);
  }

  dismissError(): void {
    if (!this._isChildReady()) {
      this._pendingCommands.removeByKind('show-error', 'dismiss-error');
      this._pendingCommands.enqueue({ kind: 'dismiss-error' });
      return;
    }
    this._messages.dismissError();
  }

  updateProgressStep(messageId: string, step: number, status: string, bid?: string): boolean {
    if (!this._isChildReady()) return false;
    return this._messages.updateProgressStep(messageId, step, status as Parameters<ChatMessages['updateProgressStep']>[2], bid);
  }

  /**
   * Scroll a message into view by its ID.
   *
   * Proxies to `<i-chat-messages>.scrollToMessage()`.  Returns `false`
   * when the child element is not yet rendered.
   */
  scrollToMessage(id: string): boolean {
    if (!this._isChildReady()) return false;
    return this._messages.scrollToMessage(id);
  }

  /**
   * Scroll a message part into view by its part ID.
   *
   * Proxies to `<i-chat-messages>.scrollToPart()`.  Returns `false`
   * when the child element is not yet rendered.
   */
  scrollToPart(partId: string): boolean {
    if (!this._isChildReady()) return false;
    return this._messages.scrollToPart(partId);
  }

  /**
   * Create a `ChatRunController` that orchestrates one AI response run
   * through the top-level message store.  The controller manages the
   * full lifecycle: create the placeholder message, append parts, stream
   * text deltas, and transition to complete / cancel / error.
   */
  createRunController(options?: ChatRunOptions): ChatRunController {
    return new ChatRunController(this._store, options);
  }

  /** Focus the input textarea. Safe to call before first render (no-op). */
  focusInput(): void {
    if (this._confirmCtrl.active) return;
    this._input?.focus();
  }

  /**
   * Request a user decision before continuing a host-defined action. While a
   * confirmation is active, the composer area is replaced by the confirmation
   * panel. Requests are shown FIFO, one at a time.
   */
  requestConfirmation(request: ChatConfirmationRequest): Promise<ChatConfirmationResult> {
    return this._confirmCtrl.request(request);
  }

  clearConfirmations(): void {
    this._confirmCtrl.cancelAll();
  }

  /**
   * Add a reply block beneath the message with the given `id`.
   *
   * The composer/input is external — this only displays the reply block(s)
   * under their message(s). Each call **adds** a block, so one message can
   * stack multiple blocks and different messages can each have their own. Pass
   * the message you are replying to (or just the fields you want shown).
   * Mirrors `updateMessage(id, partial)`.
   *
   * @param id    The id of the message the reply block is attached under.
   * @param info  Optional display fields (`parts`, `avatar`, `role`, …).
   * @returns A unique key for the created block.  Before first render a
   *          placeholder key is returned; the real key is assigned on replay.
   */
  replyMessage(id: string, info?: Partial<ChatMessage>): string {
    if (!this._isChildReady()) {
      const key = `pending-reply-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      this._pendingCommands.enqueue({ kind: 'reply-message', id, info });
      return key;
    }
    return this._messages.replyMessage(id, info);
  }

  /**
   * Remove reply block(s).
   * @param idOrKey  A message `id` removes all blocks under that message; a
   *                 block `key` (returned by `replyMessage`) removes just that
   *                 block. When omitted, clears all reply blocks.
   */
  clearReplyMessage(idOrKey?: string): void {
    if (!this._isChildReady()) {
      this._pendingCommands.enqueue({ kind: 'clear-reply-message', idOrKey });
      return;
    }
    this._messages.clearReplyMessage(idOrKey);
  }

  // ── Pending command replay (CHG-06) ───────────────────────────────

  private _replayPendingCommands(): void {
    if (this._pendingCommands.length === 0) return;
    const commands = this._pendingCommands.drain();
    for (const cmd of commands) {
      switch (cmd.kind) {
        case 'show-error':
          this._messages.showError(cmd.text, cmd.options);
          break;
        case 'dismiss-error':
          this._messages.dismissError();
          break;
        case 'reply-message':
          this._messages.replyMessage(cmd.id, cmd.info);
          break;
        case 'clear-reply-message':
          this._messages.clearReplyMessage(cmd.idOrKey);
          break;
      }
    }
  }

  // ── Message-state compatibility guard (CHG-01, retained in CHG-07) ─
  //
  // After CHG-03 through CHG-05, all normal data mutations write directly
  // to `this.messages` via `_commitMessages`.  The child receives the array
  // through one-way `.messages` template binding and does NOT emit
  // `messages-change` for property-driven updates.
  //
  // This handler remains as a compatibility guard for:
  //   - Standalone `<i-chat-messages>` usage (child owns its own state)
  //   - Any unexpected child-originated mutation in composed mode
  //
  // Stale mutations (where the child's base array doesn't match the
  // current `this.messages`) are rejected and the authoritative array is
  // pushed back down.

  /**
   * Adopt child-originated `messages-change`, synchronise the top-level
   * property, and re-emit from `<i-chat>`.
   *
   * Stale child mutations (where `detail.previousMessages` does not match the
   * current `this.messages`) are rejected and the parent's authoritative array
   * is pushed back down.
   */
  private _handleMessagesChange(e: CustomEvent<MessagesChangeDetail>): void {
    e.stopPropagation();
    const detail = e.detail;

    // Reject stale child mutations: if the child's base array doesn't match
    // our current messages, it was operating on stale data.
    if (detail.previousMessages !== this._msgs) {
      if (this._messages) {
        this._messages.messages = this._msgs;
      }
      return;
    }

    // Adopt the child's state as our own.
    this.messages = detail.messages as unknown as typeof this.messages;

    // Re-emit from <i-chat> as the authoritative source.
    this.dispatchEvent(
      new CustomEvent<MessagesChangeDetail>('messages-change', {
        detail: {
          ...detail,
          source: 'i-chat',
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // ── Slot forwarding ────────────────────────────────────────────────
  //
  // Declarative `<slot name="x" slot="x">` under `<i-chat-messages>` / `<i-chat-input>`
  // so consumer nodes stay light-DOM children of `<i-chat>` (page / Vue CSS applies).
  // `<i-chat-messages>` reads template HTML from shadow `assignedElements()`, not clones.

  override connectedCallback(): void {
    super.connectedCallback();
    setVersionAttribute(this);
    this._reflectBusyState();
  }

  override disconnectedCallback(): void {
    this._confirmCtrl.cancelAll();
    this._pendingCommands.clear();
    // Dispose all plugins. Errors in individual teardowns are caught so
    // one broken plugin cannot prevent the rest from cleaning up.
    for (const [, dispose] of this._pluginDisposers) {
      try { dispose(); } catch { /* teardown must not prevent disconnect */ }
    }
    this._pluginDisposers.clear();
    super.disconnectedCallback();
  }

  override firstUpdated(_changed: PropertyValues): void {
    super.firstUpdated(_changed);
    // Properties are bound in the template — no manual push needed.
    this._readyResolver();
    this._replayPendingCommands();
  }

  // ── Lifecycle ──────────────────────────────────────────────────────

  private _handleConfirmationSettle(e: CustomEvent<{ action: 'confirm' | 'cancel' }>): void {
    e.stopPropagation();
    this._confirmCtrl.settle(e.detail.action);
  }

  // ── Events ────────────────────────────────────────────────────────

  private get _sendBlocked(): boolean {
    return this.disabled || this.busy || !!this._confirmCtrl.active;
  }

  private async _handleSend(e: CustomEvent<{ content: string }>): Promise<void> {
    e.stopPropagation();
    if (this._sendBlocked) return;

    this._setSubmittingState(true);
    try {
      // Run through beforeSend middleware chain. `_submitting` closes the
      // duplicate-send window while an async middleware is pending.
      const processed = await this._middlewareChain.executeBeforeSend(e.detail.content);
      if (processed == null) return; // Dropped by middleware

      // State may have changed while middleware was awaiting. Ignore this
      // submission if the chat became unavailable for any other reason.
      if (this.disabled || this._streaming || this._confirmCtrl.active) return;

      this.dispatchEvent(
        new CustomEvent('send', {
          detail: { content: processed },
          bubbles: true,
          composed: true,
        })
      );
    } finally {
      this._setSubmittingState(false);
    }
  }

  private _handleCancel(e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('cancel', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _setStreamingState(streaming: boolean): void {
    const wasBusy = this.busy;
    this._streaming = streaming;
    if (this._input) {
      this._input.streaming = streaming;
    }
    this._syncBusyState(wasBusy);
  }

  private _setSubmittingState(submitting: boolean): void {
    if (submitting === this._submitting) return;
    const wasBusy = this.busy;
    this._submitting = submitting;
    this._syncBusyState(wasBusy);
  }

  private _reflectBusyState(): void {
    this.toggleAttribute('busy', this.busy);
    this.setAttribute('aria-busy', String(this.busy));
  }

  private _syncBusyState(wasBusy: boolean): void {
    this._reflectBusyState();
    if (this.busy === wasBusy) return;
    this.dispatchEvent(
      new CustomEvent('busy-change', {
        detail: { busy: this.busy },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleStreamingChange(e: CustomEvent<{ streaming: boolean }>): void {
    e.stopPropagation();
    this._setStreamingState(e.detail.streaming);
    this.dispatchEvent(
      new CustomEvent('streaming-change', {
        detail: e.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleMessageAction(e: CustomEvent): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('message-action', {
        detail: e.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handlePartAction(e: CustomEvent<ChatPartActionDetail>): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent<ChatPartActionDetail>('part-action', {
        detail: e.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleInputSlotChange(e: Event): void {
    const slot = e.target as HTMLSlotElement;
    this._slotCtrl.hasCustomInput = slot.assignedElements({ flatten: true }).length > 0;
    this.requestUpdate();
  }

  // ── Render ────────────────────────────────────────────────────────
  //
  // `.messages` is bound one-way; <i-chat> is the sole owner.
  // `.config` and `.emptyText` are also bound here so `firstUpdated` /
  // `updated` no longer need to push them manually.

  render() {
    const confirmation = this._confirmCtrl.activeRequest;

    return html`
      <div class="chat-body">
        <i-chat-messages
          .messages=${this.messages}
          .config=${this.config}
          .emptyText=${this.emptyText}
          @messages-change=${this._handleMessagesChange}
          @streaming-change=${this._handleStreamingChange}
          @message-action=${this._handleMessageAction}
          @part-action=${this._handlePartAction}
        >
          <slot name="empty" slot="empty"></slot>
          <slot name="self-avatar" slot="self-avatar"></slot>
          <slot name="peer-avatar" slot="peer-avatar"></slot>
          <slot name="assistant-avatar" slot="assistant-avatar"></slot>
          <slot name="message-actions" slot="message-actions"></slot>
          <slot name="reasoning-header" slot="reasoning-header"></slot>
        </i-chat-messages>
      </div>
      <div class="chat-footer">
        ${confirmation
          ? html`<i-chat-confirmation .request=${confirmation} .labels=${resolveLabels({ locale: this.config.locale, labels: this.config.labels }).confirmation} @confirmation-settle=${this._handleConfirmationSettle}></i-chat-confirmation>`
          : html`
              <slot
                name="input"
                @slotchange=${this._handleInputSlotChange}
                @send=${this._handleSend}
                @cancel=${this._handleCancel}
              ></slot>
              ${this._slotCtrl.hasCustomInput
                ? nothing
                : html`
                    <i-chat-input
                      .placeholder=${this.placeholder}
                      .locale=${this.config.locale ?? ''}
                      .labels=${this.config.labels?.composer}
                      .busy=${this.busy}
                      .streaming=${this._streaming}
                      .showVoiceInput=${this.showVoiceInput}
                      .voiceLang=${this.voiceLang}
                      .voiceListeningLabel=${this.voiceListeningLabel}
                      .voiceDiagnostics=${this.voiceDiagnostics}
                      ?disabled=${this.disabled}
                      @send=${this._handleSend}
                      @cancel=${this._handleCancel}
                    >
                      <slot name="actions" slot="actions"></slot>
                    </i-chat-input>
                  `}
            `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'i-chat': Chat;
  }
}
