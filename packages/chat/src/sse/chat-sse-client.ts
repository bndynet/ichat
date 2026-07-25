import type { ChatMessage, MessagePart, TodoItemPatch } from '@bndynet/ichat-messages';

// ── SSE event types ─────────────────────────────────────────────────────────

export interface SSEClientOptions {
  /**
   * Called when the SSE stream emits a `message.part.updated` event.
   * Return `false` to prevent the default handler from applying the update.
   */
  onPartUpdate?: (messageId: string, partId: string, patch: Partial<MessagePart>) => boolean | void;

  /**
   * Called when the SSE stream emits a `todo.item.updated` event.
   * Return `false` to prevent the default handler from applying the update.
   */
  onTodoUpdate?: (messageId: string, partId: string, itemId: string, patch: TodoItemPatch, revision?: number) => boolean | void;

  /**
   * Called when the SSE stream emits a `message.completed` event.
   */
  onCompleted?: (messageId: string, patch?: Partial<ChatMessage>) => void;

  /**
   * Called when the SSE stream emits an `error` event.
   */
  onError?: (error: string) => void;

  /**
   * Reconnection strategy.
   * - `true` (default): exponential backoff (1s, 2s, 4s, 8s, max 30s)
   * - `false`: no reconnection
   * - `number`: fixed delay in ms
   * - function: custom delay
   */
  reconnect?: boolean | number | ((attempt: number) => number);

  /**
   * Custom fetch implementation (e.g. for Node.js environments without native fetch).
   */
  fetch?: typeof fetch;

  /**
   * Additional headers to include in the SSE request.
   */
  headers?: Record<string, string>;

  /**
   * Request body for POST-based SSE endpoints.
   */
  body?: string | FormData;
}

export interface ChatStorePort {
  readonly messages: ChatMessage[];
  tryApplyMessagePartUpdateEvent(event: unknown): { ok: boolean };
  tryApplyTodoItemUpdateEvent(event: unknown): { ok: boolean };
  updateMessage(id: string, partial: Partial<ChatMessage>): void;
  cancelMessage(id: string, hint?: string): void;
  addErrorMessage(error: string, text?: string): void;
}

export interface SSEClient {
  /** Current connection status. */
  readonly status: 'connecting' | 'connected' | 'disconnected' | 'error';
  /** The message id of the current run. */
  readonly messageId: string | undefined;
  /** Abort the current connection and stop reconnection. */
  abort(): void;
  /** Start the SSE connection for a new assistant run. Returns the run's message id. */
  start(messageId?: string): string;
}

// ── helpers ─────────────────────────────────────────────────────────────────

function isSSEEvent(input: unknown): input is { type?: string; data?: unknown } {
  return input !== null && typeof input === 'object';
}

function parseSSEData(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function defaultReconnectDelay(attempt: number): number {
  const base = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  // Add jitter: ±20%
  const jitter = base * 0.2 * (Math.random() * 2 - 1);
  return Math.round(base + jitter);
}

function resolveReconnectDelay(
  reconnect: SSEClientOptions['reconnect'],
  attempt: number,
): number | false {
  if (reconnect === false) return false;
  if (typeof reconnect === 'number') return reconnect;
  if (typeof reconnect === 'function') return reconnect(attempt);
  return defaultReconnectDelay(attempt);
}

// ── SSE client ──────────────────────────────────────────────────────────────

/**
 * Create an SSE client that connects to a backend streaming endpoint and
 * automatically routes events to a chat store.
 *
 * @example
 * ```ts
 * const sse = createChatSSEClient('/api/chat/stream', chat);
 * chat.addEventListener('send', (e) => {
 *   sse.start();
 * });
 * ```
 */
export function createChatSSEClient(
  url: string,
  store: ChatStorePort,
  options: SSEClientOptions = {},
): SSEClient {
  const _fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  let _status: SSEClient['status'] = 'disconnected';
  let _messageId: string | undefined;
  let _abortController: AbortController | undefined;
  let _reconnectAttempt = 0;
  let _reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  function setStatus(s: SSEClient['status']): void {
    _status = s;
  }

  function generateMessageId(): string {
    return `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async function connect(signal: AbortSignal): Promise<void> {
    setStatus('connecting');

    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
      ...options.headers,
    };

    const init: RequestInit = {
      method: options.body ? 'POST' : 'GET',
      headers,
      signal,
    };

    if (options.body) {
      if (typeof options.body === 'string') {
        headers['Content-Type'] = 'application/json';
      }
      init.body = options.body;
    }

    let response: Response;
    try {
      response = await _fetch(url, init);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setStatus('disconnected');
        return;
      }
      setStatus('error');
      options.onError?.(`Connection failed: ${(err as Error).message}`);
      scheduleReconnect();
      return;
    }

    if (!response.ok) {
      setStatus('error');
      const errorText = await response.text().catch(() => '');
      options.onError?.(`HTTP ${response.status}: ${errorText || response.statusText}`);
      scheduleReconnect();
      return;
    }

    if (!response.body) {
      setStatus('error');
      options.onError?.('Response has no body');
      scheduleReconnect();
      return;
    }

    setStatus('connected');
    _reconnectAttempt = 0;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let eventType = '';
    let dataLines: string[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
          } else if (line === '') {
            // Empty line → dispatch event
            if (dataLines.length > 0) {
              dispatchEvent(eventType, dataLines.join('\n'));
            }
            eventType = '';
            dataLines = [];
          }
        }
      }

      // Flush remaining data
      if (dataLines.length > 0) {
        dispatchEvent(eventType, dataLines.join('\n'));
      }

      // Stream ended normally
      setStatus('disconnected');
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setStatus('disconnected');
        return;
      }
      setStatus('error');
      options.onError?.(`Stream error: ${(err as Error).message}`);
      scheduleReconnect();
    }
  }

  function dispatchEvent(eventType: string, data: string): void {
    const parsed = parseSSEData(data);

    if (eventType === 'error' || (isSSEEvent(parsed) && parsed.type === 'error')) {
      const msg = typeof parsed === 'object' && parsed && 'message' in parsed
        ? String((parsed as { message: string }).message)
        : 'An error occurred';
      options.onError?.(msg);
      return;
    }

    switch (eventType) {
      case 'message.part.updated':
      case 'message': {
        // 'message' is the default SSE event — check if data contains a typed event
        if (eventType === 'message' || !eventType) {
          // Try to route by data.type
          if (isSSEEvent(parsed) && typeof parsed.type === 'string') {
            if (parsed.type === 'message.part.updated') {
              handlePartUpdate(parsed);
              return;
            }
            if (parsed.type === 'todo.item.updated') {
              handleTodoUpdate(parsed);
              return;
            }
            if (parsed.type === 'message.completed') {
              handleCompleted(parsed);
              return;
            }
            if (parsed.type === 'error') {
              const msg = 'message' in parsed ? String((parsed as { message: string }).message) : 'Unknown error';
              options.onError?.(msg);
              return;
            }
          }
          // Fallback: try as part update
          handlePartUpdate(parsed);
          return;
        }
        handlePartUpdate(parsed);
        return;
      }
      case 'todo.item.updated':
        handleTodoUpdate(parsed);
        break;
      case 'message.completed':
        handleCompleted(parsed);
        break;
      default:
        // Unknown event — try to route by parsed type
        if (isSSEEvent(parsed)) {
          if (parsed.type === 'message.part.updated') {
            handlePartUpdate(parsed);
          } else if (parsed.type === 'todo.item.updated') {
            handleTodoUpdate(parsed);
          } else if (parsed.type === 'message.completed') {
            handleCompleted(parsed);
          }
        }
    }
  }

  function handlePartUpdate(parsed: unknown): void {
    store.tryApplyMessagePartUpdateEvent(parsed);
  }

  function handleTodoUpdate(parsed: unknown): void {
    store.tryApplyTodoItemUpdateEvent(parsed);
  }

  function handleCompleted(parsed: unknown): void {
    if (_messageId && isSSEEvent(parsed)) {
      const { type: _t, messageId: _m, ...rest } = parsed as Record<string, unknown>;
      if (Object.keys(rest).length > 0) {
        store.updateMessage(_messageId, rest as Partial<ChatMessage>);
      }
      options.onCompleted?.(_messageId, rest as Partial<ChatMessage>);
    }
    abort();
  }

  function scheduleReconnect(): void {
    if (_abortController) return; // Already aborted

    const delay = resolveReconnectDelay(options.reconnect, ++_reconnectAttempt);
    if (delay === false) return;

    _reconnectTimer = setTimeout(() => {
      if (_abortController) return;
      const controller = new AbortController();
      _abortController = controller;
      connect(controller.signal);
    }, delay);
  }

  function abort(): void {
    if (_reconnectTimer) {
      clearTimeout(_reconnectTimer);
      _reconnectTimer = undefined;
    }
    if (_abortController) {
      _abortController.abort();
      _abortController = undefined;
    }
    _messageId = undefined;
    setStatus('disconnected');
  }

  return {
    get status() { return _status; },
    get messageId() { return _messageId; },

    start(messageId?: string): string {
      abort(); // Cancel any existing connection
      _messageId = messageId ?? generateMessageId();
      _reconnectAttempt = 0;
      const controller = new AbortController();
      _abortController = controller;
      connect(controller.signal);
      return _messageId;
    },

    abort,
  };
}
