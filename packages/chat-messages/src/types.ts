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

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  reasoning?: string;
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
}

/** Start/end pair for `date-range` fields in embedded fenced `form` blocks. */
export interface ChatFormDateRangeValue {
  start: string;
  end: string;
}

/** Field values from `i-chat-form` (aligned with `@bndynet/chat-renderers` `FormSubmitDetail.values`). */
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
   * BCP 47 locale for built-in UI: date-separator labels, per-message timestamps, and assistant
   * **duration** (`Intl.NumberFormat` / `Intl.DurationFormat` where available).
   * Built-ins: `en` (default), `zh` / `zh-CN` (Chinese). Unknown separator strings fall back to English;
   * timestamp and duration still use this tag with the runtime `Intl` implementation.
   */
  locale?: string;
  /** Partial overrides merged on top of the strings chosen via `locale`. */
  dateSeparatorLabels?: Partial<DateSeparatorLabels>;
}

export const DEFAULT_CONFIG: Required<ChatConfig> = {
  streamingSpeed: 3,
  selfAvatar: '',
  peerAvatar: '',
  assistantAvatar: '',
  locale: 'en',
  dateSeparatorLabels: {},
};
