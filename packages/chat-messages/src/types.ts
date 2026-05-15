import type { ChatLabels, DeepPartial } from './i18n.js';

export interface BlockRenderer {
  /** Unique name for this renderer */
  name: string;
  /** Return true if this renderer handles the given fenced code block language */
  test: (lang: string) => boolean;
  /**
   * Render the code block content to an HTML string.
   * @param code - The raw text content of the fenced block.
   * @param lang - The first word of the info string (e.g. `"details"`).
   * @param info - The full info string after the opening fence markers (e.g. `"details My Title"`).
   */
  render: (code: string, lang: string, info?: string) => string;
}

/** Who sent the message (layout + default styling). Viewer-relative: `self` = current user. */
export type ChatMessageRole = 'self' | 'peer' | 'assistant' | 'system';

// ── Structured message parts ──────────────────────────────────────────────────
//
// A message body is an ordered list of typed `parts` — the single source of truth
// for rendering. This is the model used by modern AI chat protocols (Anthropic
// content blocks, Vercel AI SDK message parts): text, reasoning, tool calls,
// files, sources, and host-defined `x-*` parts all live side by side and
// stream/update independently. Plain text is just a `text` part; use the
// `textPart` / `reasoningPart` factories for the common cases.

/** Per-part lifecycle. Optional; defaults to `complete`. */
export type PartStatus = 'pending' | 'streaming' | 'complete' | 'error' | 'cancelled';

/** Fields shared by every part. `id` must be stable for keyed render + targeted updates. */
export interface PartBase {
  id: string;
  status?: PartStatus;
  /** Arbitrary host data; the library never interprets this. */
  metadata?: Record<string, unknown>;
}

/** Plain markdown text segment. */
export interface TextPart extends PartBase {
  type: 'text';
  text: string;
}

/** Model "thinking" segment, rendered as a collapsible reasoning block. */
export interface ReasoningPart extends PartBase {
  type: 'reasoning';
  text: string;
}

/**
 * Tool-call lifecycle, aligned with the Vercel AI SDK vocabulary so host adapters
 * map cleanly from OpenAI `tool_calls` / Anthropic `tool_use`.
 */
export type ToolCallState =
  | 'input-streaming'
  | 'input-available'
  | 'executing'
  | 'output-available'
  | 'output-error';

/** A single tool/function invocation and its result. Addressed by part `id`. */
export interface ToolCallPart extends PartBase {
  type: 'tool-call';
  /** Protocol id (OpenAI `tool_call.id` / Anthropic `tool_use.id`). */
  toolCallId: string;
  toolName: string;
  /** Optional display title; defaults to `toolName`. */
  title?: string;
  /** Parsed arguments (may be partial while `input-streaming`). */
  args?: unknown;
  state: ToolCallState;
  /** Simple result payload (string / JSON-serialisable). */
  result?: unknown;
  /** Rich result rendered as nested parts (text + file + custom …). */
  resultParts?: MessagePart[];
  error?: string;
  /** Human-in-the-loop gate for high-impact tools. */
  approval?: 'required' | 'approved' | 'rejected';
  durationMs?: number;
}

/** Binary/attachment part (image, pdf, audio …). */
export interface FilePart extends PartBase {
  type: 'file';
  mediaType: string;
  /** Remote URL or a `data:` URL. */
  url?: string;
  /** Raw base64 (no prefix) when not using `url`. */
  data?: string;
  name?: string;
  size?: number;
}

/** Citation / source reference (e.g. RAG). */
export interface SourcePart extends PartBase {
  type: 'source';
  url: string;
  title?: string;
  snippet?: string;
}

/**
 * Host-defined extension part. `type` must start with `x-` and is routed to a
 * registered part renderer; falls back to a readable dump when unregistered.
 */
export interface CustomPart extends PartBase {
  type: `x-${string}`;
  data: unknown;
}

/** Discriminated union of all body parts. */
export type MessagePart =
  | TextPart
  | ReasoningPart
  | ToolCallPart
  | FilePart
  | SourcePart
  | CustomPart;

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  /**
   * Ordered, typed body parts — the single source of truth for rendering. Use
   * the {@link textPart} / {@link reasoningPart} factories for the common cases,
   * or push `tool-call` / `file` / `source` / `x-*` parts directly. An empty
   * array is valid (e.g. an error-only or streaming-placeholder message).
   */
  parts: MessagePart[];
  timestamp?: number;
  streaming?: boolean;
  /**
   * Optional avatar for this message only. When set (non-empty after trim), it replaces
   * the default avatar from `config` and overrides `self-avatar` / `peer-avatar` /
   * `assistant-avatar` slot templates for this row.
   *
   * Supported forms:
   * - Image URL (`https://…`) or path ending in a known image extension
   * - Data URL (`data:image/…;base64,…`)
   * - Raw base64 (no prefix): interpreted as PNG (`data:image/png;base64,…`); use a full data URL for JPEG/WebP
   * - Inline SVG (`<svg…>`…)
   * - Plain text or emoji (shown in the avatar circle)
   *
   * Inline SVG is rendered like slot avatars; treat values as trusted app content.
   */
  avatar?: string;
  /** When set, the message is rendered as an error with this text as the description. */
  error?: string;
  /** Set to true when the stream was aborted before completion. */
  cancelled?: boolean;
  /** Response duration in milliseconds. Auto-tracked by the component when streaming completes; can also be set explicitly. */
  duration?: number;
  /**
   * Id of the message this one replies to. When set, the message is treated as a
   * reply and rendered in the compact "quote" style (avatar + content only, no
   * footer / reasoning / actions). Lets the host and the component both tell
   * whether a message is a reply.
   */
  parentId?: string;
}

/** Start/end pair for `date-range` fields in embedded fenced `form` blocks. */
export interface ChatFormDateRangeValue {
  start: string;
  end: string;
}

/** Field values from `i-chat-form` (aligned with `@bndynet/ichat-renderers` `FormSubmitDetail.values`). */
export type ChatFormFieldValues = Record<
  string,
  string | boolean | string[] | ChatFormDateRangeValue
>;

/**
 * `form-submit` event detail after `i-chat-message` adds the owning message.
 * Bubbles through `i-chat-messages` and `i-chat`.
 */
export interface ChatFormSubmitDetail {
  formId: string;
  title: string;
  values: ChatFormFieldValues;
  messageId: string;
  message: ChatMessage;
}

/** Strings for message list date separators (between day buckets). */
export interface DateSeparatorLabels {
  today: string;
  yesterday: string;
  /** `days` is always 2–7 (calendar days before “today”). */
  daysAgo: (days: number) => string;
  older: string;
}

export interface ChatConfig {
  /** Characters revealed per animation frame (default: 3) */
  streamingSpeed?: number;
  /** Default avatar for `role: 'self'` (text, emoji, or image URL) */
  selfAvatar?: string;
  /** Default avatar for `role: 'peer'` (text, emoji, or image URL) */
  peerAvatar?: string;
  /** Default avatar for assistant/system messages (text, emoji, or image URL) */
  assistantAvatar?: string;
  /**
   * BCP 47 locale for built-in UI: all text strings (see {@link ChatLabels}),
   * per-message timestamps, and assistant **duration**
   * (`Intl.NumberFormat` / `Intl.DurationFormat` where available).
   * Built-ins: `en` (default), `zh` / `zh-CN` (Chinese). Unknown locales fall back to English;
   * timestamp and duration still use this tag with the runtime `Intl` implementation.
   */
  locale?: string;
  /**
   * Partial overrides merged on top of the full string dictionary chosen via
   * `locale`. Provide only the sections / keys you want to change.
   */
  labels?: DeepPartial<ChatLabels>;
  /**
   * @deprecated Use `labels.dateSeparator` instead. Kept for backward
   * compatibility; merged into the resolved `labels.dateSeparator`.
   */
  dateSeparatorLabels?: Partial<DateSeparatorLabels>;
}

export const DEFAULT_CONFIG: Required<Omit<ChatConfig, 'labels' | 'dateSeparatorLabels'>> = {
  streamingSpeed: 3,
  selfAvatar: '',
  peerAvatar: '',
  assistantAvatar: '',
  locale: 'en',
};

/**
 * Plain-text view of a message for copy / search / persistence.
 * Joins the text of all `text` parts.
 */
export function getMessageText(message: ChatMessage): string {
  return (message.parts ?? [])
    .filter((p): p is TextPart => p.type === 'text')
    .map((p) => p.text)
    .join('\n\n');
}

let _partSeq = 0;
/** Monotonic, collision-resistant part id (`part-<n>`). */
export function nextPartId(prefix = 'part'): string {
  return `${prefix}-${++_partSeq}`;
}

/** Options shared by the part factories. */
export type PartFactoryOptions = Pick<PartBase, 'id' | 'status' | 'metadata'>;

/** Build a {@link TextPart}. Generates an `id` when one is not supplied. */
export function textPart(text: string, opts: Partial<PartFactoryOptions> = {}): TextPart {
  return { type: 'text', id: opts.id ?? nextPartId('text'), text, ...stripId(opts) };
}

/** Build a {@link ReasoningPart}. Generates an `id` when one is not supplied. */
export function reasoningPart(
  text: string,
  opts: Partial<PartFactoryOptions> = {},
): ReasoningPart {
  return { type: 'reasoning', id: opts.id ?? nextPartId('reasoning'), text, ...stripId(opts) };
}

function stripId(opts: Partial<PartFactoryOptions>): Omit<Partial<PartFactoryOptions>, 'id'> {
  const { id: _ignored, ...rest } = opts;
  return rest;
}
