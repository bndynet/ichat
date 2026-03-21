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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string;
  timestamp?: number;
  streaming?: boolean;
  /** Per-message avatar: text (e.g. emoji/initials), image URL, or HTML string */
  avatar?: string;
  /** When set, the message is rendered as an error with this text as the description. */
  error?: string;
  /** Set to true when the stream was aborted before completion. */
  cancelled?: boolean;
  /** Response duration in milliseconds. Auto-tracked by the component when streaming completes; can also be set explicitly. */
  duration?: number;
}

export interface ChatConfig {
  /** Characters revealed per animation frame (default: 3) */
  streamingSpeed?: number;
  /** Default avatar for user messages (text, emoji, or image URL) */
  userAvatar?: string;
  /** Default avatar for assistant messages (text, emoji, or image URL) */
  assistantAvatar?: string;
}

export const DEFAULT_CONFIG: Required<ChatConfig> = {
  streamingSpeed: 3,
  userAvatar: '',
  assistantAvatar: '',
};
